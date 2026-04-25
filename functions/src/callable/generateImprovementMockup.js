/**
 * 改善モックアップ生成 Callable Function（Gemini 2.5 Flash）
 *
 * 手動トリガー: ユーザーがボタンを押して個別に呼び出す。
 * pageScrapingData のリッチデータ（firstView, designTokens, sections等）と
 * pageScreenshots のスクリーンショットを使用して部分HTMLモックアップを生成。
 *
 * パラメータ:
 *   siteId: string
 *   improvementId: string
 *
 * 結果:
 *   improvement ドキュメントに mockupHtml, mockupCss, mockupGeneratedAt を追加
 */

import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import * as cheerio from 'cheerio';
import { captureFullSnapshot, readSnapshotHtml } from '../utils/captureFullSnapshot.js';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const GEMINI_MODEL = 'gemini-2.5-flash';
// 16384 まで拡張: 旧 8192 は thinkingBudget=2048 と合わせると本文枠が 6144 トークンしか無く
// 長いキー要素 HTML を含むプロンプトで MAX_TOKENS 切れによる HTML 抽出失敗が頻発していた
const MAX_OUTPUT_TOKENS = 16384;
const MAX_RETRIES = 2;
// Snapshot モード: Gemini に渡す構造 HTML の最大サイズ（超過時は旧モードにフォールバック）
const MAX_STRUCTURAL_HTML_BYTES = 400_000;

export async function generateImprovementMockupCallable(req) {
  // 認証チェック
  if (!req.auth) {
    throw new HttpsError('unauthenticated', 'ユーザー認証が必要です');
  }

  const { siteId, improvementId } = req.data;

  if (!siteId || !improvementId) {
    throw new HttpsError('invalid-argument', 'siteId と improvementId が必要です');
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new HttpsError('failed-precondition', 'GEMINI_API_KEY が設定されていません');
  }

  const db = getFirestore();
  const startTime = Date.now();

  console.log(`[generateImprovementMockup] Start: siteId=${siteId}, improvementId=${improvementId}`);

  try {
    // 改善案データ取得
    const impDoc = await db.doc(`sites/${siteId}/improvements/${improvementId}`).get();
    if (!impDoc.exists) {
      throw new HttpsError('not-found', '改善案が見つかりません');
    }

    const improvement = impDoc.data();

    // ── Step 0: 非ビジュアル改善はモックアップ生成をスキップ ──
    const NON_VISUAL_KEYWORDS = [
      '読込速度', '読み込み速度', '表示速度', 'ページ速度', 'パフォーマンス',
      'Core Web Vitals', 'LCP', 'FID', 'CLS', 'TTFB', 'INP',
      'alt属性', 'メタディスクリプション', 'meta description',
      'robots.txt', 'sitemap', 'canonical', 'hreflang',
      '構造化データ', 'schema.org', 'JSON-LD',
      'SSL', 'HTTPS', 'セキュリティ',
      'キャッシュ', 'CDN', '圧縮', 'minify', 'gzip',
      'リダイレクト', '301', '302', '404',
      'アクセシビリティ', 'WCAG',
    ];
    const titleAndDesc = `${improvement.title || ''} ${improvement.description || ''}`;
    const isNonVisual = NON_VISUAL_KEYWORDS.some(kw => titleAndDesc.toLowerCase().includes(kw.toLowerCase()));
    if (isNonVisual) {
      console.log(`[generateImprovementMockup] Skipped (non-visual): ${improvementId} — "${improvement.title}"`);
      await db.doc(`sites/${siteId}/improvements/${improvementId}`).update({
        mockupSkipped: true,
        mockupSkipReason: 'non_visual',
        mockupGeneratedAt: new Date(),
      });
      return { success: true, message: 'ビジュアル変更を伴わない改善のためモックアップ生成をスキップしました', skipped: true };
    }

    // ── 新フロー: Snapshot + 差分パッチ方式で完全再現を試みる ──
    // 失敗した場合は下の旧フロー（AI HTML 直生成）にフォールバック
    if (improvement.targetPageUrl) {
      try {
        const snapshotResult = await trySnapshotBasedMockup({
          siteId,
          improvementId,
          improvement,
          apiKey,
          db,
        });
        if (snapshotResult) {
          const duration = Date.now() - startTime;
          console.log(`[generateImprovementMockup] Done via snapshot_patch in ${duration}ms`);
          return { ...snapshotResult, duration };
        }
        console.log('[generateImprovementMockup] Snapshot flow returned null, fallback to legacy flow');
      } catch (err) {
        console.warn(`[generateImprovementMockup] Snapshot flow failed, fallback to legacy: ${err.message}`);
      }
    }

    // ── Step 1: Beforeスクリーンショットを取得（pageScrapingData → pageScreenshots → なし） ──
    let beforeScreenshotBase64 = '';
    let screenshotSource = '';

    // 1a. pageScrapingData の screenshotUrl から取得
    if (improvement.targetPageUrl) {
      try {
        // pageScrapingData から対象URLのデータを検索
        const scrapingSnap = await db.collection('sites').doc(siteId).collection('pageScrapingData')
          .where('pageUrl', '==', improvement.targetPageUrl)
          .limit(1)
          .get();
        if (!scrapingSnap.empty) {
          const scrapingData = scrapingSnap.docs[0].data();
          if (scrapingData.screenshotUrl) {
            const res = await fetch(scrapingData.screenshotUrl);
            if (res.ok) {
              const buffer = await res.arrayBuffer();
              beforeScreenshotBase64 = `data:image/jpeg;base64,${Buffer.from(buffer).toString('base64')}`;
              screenshotSource = 'pageScrapingData';
            }
          }
        }
      } catch (e) {
        console.warn(`[generateImprovementMockup] pageScrapingData screenshot lookup failed: ${e.message}`);
      }
    }

    // 1b. pageScreenshots コレクションからフォールバック
    if (!beforeScreenshotBase64 && improvement.targetPageUrl) {
      try {
        const ssSnap = await db.collection('sites').doc(siteId).collection('pageScreenshots')
          .where('url', '==', improvement.targetPageUrl)
          .limit(1)
          .get();
        if (!ssSnap.empty) {
          const ssData = ssSnap.docs[0].data();
          if (ssData.screenshotUrl) {
            const res = await fetch(ssData.screenshotUrl);
            if (res.ok) {
              const buffer = await res.arrayBuffer();
              beforeScreenshotBase64 = `data:image/jpeg;base64,${Buffer.from(buffer).toString('base64')}`;
              screenshotSource = 'pageScreenshots';
            }
          }
        }
      } catch (e) {
        console.warn(`[generateImprovementMockup] pageScreenshots lookup failed: ${e.message}`);
      }
    }

    // 1c. サイトトップのスクショをフォールバック
    if (!beforeScreenshotBase64) {
      try {
        const ssSnap = await db.collection('sites').doc(siteId).collection('pageScreenshots')
          .where('pagePath', '==', '/')
          .limit(1)
          .get();
        if (!ssSnap.empty) {
          const ssData = ssSnap.docs[0].data();
          if (ssData.screenshotUrl) {
            const res = await fetch(ssData.screenshotUrl);
            if (res.ok) {
              const buffer = await res.arrayBuffer();
              beforeScreenshotBase64 = `data:image/jpeg;base64,${Buffer.from(buffer).toString('base64')}`;
              screenshotSource = 'pageScreenshots(top)';
            }
          }
        }
      } catch (e) {
        console.warn(`[generateImprovementMockup] Top page screenshot fallback failed: ${e.message}`);
      }
    }

    // 1d. 既存スクショが無ければ PSI API でオンデマンド撮影（PC + Mobile）
    //     撮影結果は pageScreenshots に保存し、次回以降の再利用を可能にする
    if (!beforeScreenshotBase64 && improvement.targetPageUrl) {
      try {
        console.log(`[generateImprovementMockup] On-demand PSI capture: ${improvement.targetPageUrl}`);
        const { captureSingleScreenshot } = await import('../utils/captureSingleScreenshot.js');
        const { FieldValue } = await import('firebase-admin/firestore');

        // サイト所有者 uid を Storage パス用に取得
        const siteDoc = await db.collection('sites').doc(siteId).get();
        const siteOwnerId = siteDoc.data()?.userId || userId;
        const pagePath = (() => {
          try { return new URL(improvement.targetPageUrl).pathname; } catch { return '/'; }
        })();

        // PC + Mobile を並列取得
        const [pcResult, mobileResult] = await Promise.all([
          captureSingleScreenshot({
            url: improvement.targetPageUrl,
            deviceType: 'pc',
            userId: siteOwnerId,
            options: { storagePathPrefix: 'page-screenshots', siteId, pagePath },
          }),
          captureSingleScreenshot({
            url: improvement.targetPageUrl,
            deviceType: 'mobile',
            userId: siteOwnerId,
            options: { storagePathPrefix: 'page-screenshots', siteId, pagePath },
          }),
        ]);

        if (pcResult?.imageUrl || mobileResult?.imageUrl) {
          // pageScreenshots に保存（PC を screenshotUrl に、Mobile を screenshotUrlMobile に）
          await db.collection('sites').doc(siteId).collection('pageScreenshots').add({
            url: improvement.targetPageUrl,
            pagePath,
            screenshotUrl: pcResult?.imageUrl || null,
            screenshotUrlMobile: mobileResult?.imageUrl || null,
            imageSize: pcResult?.imageSize || 0,
            mobileImageSize: mobileResult?.imageSize || 0,
            screenshotType: pcResult?.screenshotType || mobileResult?.screenshotType || null,
            source: 'on-demand-psi',
            capturedAt: FieldValue.serverTimestamp(),
          });
          // _meta 更新（Improve.jsx の realtime listener を発火させる）
          await db.collection('sites').doc(siteId).collection('pageScreenshots').doc('_meta').set({
            lastCapturedAt: FieldValue.serverTimestamp(),
          }, { merge: true });

          // Gemini 入力用に PC 版を base64 化（モックアップ生成は従来通り PC ベース）
          const primaryUrl = pcResult?.imageUrl || mobileResult?.imageUrl;
          const res = await fetch(primaryUrl);
          if (res.ok) {
            const buffer = await res.arrayBuffer();
            beforeScreenshotBase64 = `data:image/jpeg;base64,${Buffer.from(buffer).toString('base64')}`;
            screenshotSource = 'on-demand-psi';
          }
        }
      } catch (e) {
        console.warn(`[generateImprovementMockup] On-demand PSI capture failed: ${e.message}`);
      }
    }

    console.log(`[generateImprovementMockup] Screenshot source: ${screenshotSource || 'none'} for ${improvementId}`);

    // ── Step 2: デザインデータを pageScrapingData から取得 ──
    let designData = null;

    if (improvement.targetPageUrl) {
      try {
        const scrapingSnap = await db.collection('sites').doc(siteId).collection('pageScrapingData')
          .where('pageUrl', '==', improvement.targetPageUrl)
          .limit(1)
          .get();
        if (!scrapingSnap.empty) {
          const data = scrapingSnap.docs[0].data();
          designData = {
            firstView: data.firstView || null,
            designTokens: data.designTokens || null,
            keyElements: data.keyElements || [],
            sections: data.sections || [],
            forms: data.forms || [],
          };
        }
      } catch (e) {
        console.warn(`[generateImprovementMockup] pageScrapingData design lookup failed: ${e.message}`);
      }
    }

    // フォールバック: トップページのデザインデータ
    if (!designData) {
      try {
        const topSnap = await db.collection('sites').doc(siteId).collection('pageScrapingData')
          .where('pageType', '==', 'home')
          .limit(1)
          .get();
        if (!topSnap.empty) {
          const data = topSnap.docs[0].data();
          designData = {
            firstView: data.firstView || null,
            designTokens: data.designTokens || null,
            keyElements: data.keyElements || [],
            sections: data.sections || [],
            forms: data.forms || [],
          };
          console.log(`[generateImprovementMockup] Using home page design data fallback`);
        }
      } catch (e) {
        console.warn(`[generateImprovementMockup] Home page design fallback failed: ${e.message}`);
      }
    }

    // スクショもデザインデータもない場合のみ失敗
    if (!designData && !beforeScreenshotBase64) {
      console.warn(`[generateImprovementMockup] No design data or screenshot for ${improvementId}`);
      return { success: false, message: 'デザインデータがありません。先にスクレイピングを実行してください。' };
    }

    // 新規ページ/コンテンツかどうかを判定
    const isNewPage = !improvement.targetPageUrl;

    // プロンプト構築
    const prompt = buildMockupPrompt(improvement, designData || {}, isNewPage);

    // ── Step 3: Gemini マルチモーダル入力構築 ──
    const systemInstruction = 'あなたはWebデザイン・フロントエンド開発の専門家です。指示された改善を適用した完全なHTML/CSSを生成してください。Beforeスクリーンショットが提供された場合、そのデザイン・レイアウト・色使い・フォントを忠実に再現した上で改善箇所のみ変更してください。';

    const parts = [];
    if (beforeScreenshotBase64) {
      const mediaTypeMatch = beforeScreenshotBase64.match(/^data:(image\/[a-z]+);base64,/);
      const mimeType = mediaTypeMatch ? mediaTypeMatch[1] : 'image/jpeg';
      const base64Data = beforeScreenshotBase64.replace(/^data:image\/[a-z]+;base64,/, '');
      parts.push({
        inline_data: { mime_type: mimeType, data: base64Data },
      });
      parts.push({
        text: `上記は改善対象ページの現在のスクリーンショット（Before）です。このデザインを基に、以下の改善案を適用したモックアップを生成してください。\n\n${prompt}`,
      });
      console.log(`[generateImprovementMockup] Using screenshot (${screenshotSource}, ${Math.round(base64Data.length / 1024)}KB) for ${improvementId}`);
    } else {
      parts.push({ text: prompt });
    }

    // Gemini API 呼び出し（リトライ付き）
    const requestBody = JSON.stringify({
      system_instruction: { parts: [{ text: systemInstruction }] },
      contents: [{ parts }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        thinkingConfig: { thinkingBudget: 2048 },
      },
    });

    let html = '';
    let css = '';
    let lastError = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(
          `${GEMINI_API_BASE}/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: requestBody,
          }
        );

        if (!response.ok) {
          const errorText = await response.text().catch(() => '');
          // 4xx はリトライしても結果は変わらない（SAFETY/認証/リクエスト不正）
          // 429（レート制限）と 5xx（サーバ側一時障害）のみリトライ
          const retriable = response.status === 429 || response.status >= 500;
          const err = new Error(`Gemini API error: ${response.status} ${errorText.substring(0, 300)}`);
          err.status = response.status;
          err.retriable = retriable;
          throw err;
        }

        const data = await response.json();
        const candidate = data.candidates?.[0];
        const rawText = candidate?.content?.parts?.[0]?.text || '';
        const finishReason = candidate?.finishReason;

        const extracted = extractHtmlCss(rawText);

        if (extracted.html) {
          html = extracted.html;
          css = extracted.css;
          break;
        }

        // HTML が抽出できなかった場合：原因調査用ログを残す
        console.warn('[generateImprovementMockup] No HTML extracted', {
          improvementId,
          attempt,
          finishReason,
          safetyRatings: candidate?.safetyRatings,
          promptFeedback: data.promptFeedback,
          rawTextLen: rawText.length,
          rawTextHead: rawText.substring(0, 300),
        });

        // SAFETY / RECITATION ブロック等はリトライしても同じ結果になる
        // MAX_TOKENS / STOP（空だった）はリトライ対象
        if (finishReason === 'SAFETY' || finishReason === 'RECITATION' || finishReason === 'PROHIBITED_CONTENT') {
          return {
            success: false,
            message: `モックアップ生成がブロックされました（${finishReason}）`,
          };
        }

        const err = new Error(`Empty or unparseable response (finishReason=${finishReason || 'unknown'})`);
        err.retriable = true;
        throw err;
      } catch (err) {
        lastError = err;
        const isRetriable = err.retriable !== false;
        console.error('[generateImprovementMockup] Gemini call failed', {
          improvementId,
          attempt,
          status: err.status,
          retriable: isRetriable,
          message: err.message,
        });
        if (!isRetriable || attempt >= MAX_RETRIES) break;
        // 指数バックオフ: 1秒 → 2秒
        await new Promise(resolve => setTimeout(resolve, (attempt + 1) * 1000));
      }
    }

    if (!html) {
      const statusHint = lastError?.status ? ` (status=${lastError.status})` : '';
      console.warn(`[generateImprovementMockup] Final failure for ${improvementId}${statusHint}: ${lastError?.message}`);
      return {
        success: false,
        message: `モックアップHTMLの生成に失敗しました${statusHint}`,
      };
    }

    // Firestoreに保存
    await db.doc(`sites/${siteId}/improvements/${improvementId}`).update({
      mockupHtml: html,
      mockupCss: css || '',
      mockupGeneratedAt: new Date(),
    });

    const duration = Date.now() - startTime;
    console.log(`[generateImprovementMockup] Done: ${improvementId} in ${duration}ms (html=${html.length}, css=${(css || '').length})`);

    return {
      success: true,
      message: 'モックアップを生成しました',
      htmlLength: html.length,
      cssLength: (css || '').length,
      duration,
    };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    console.error('[generateImprovementMockup] Error:', error);
    throw new HttpsError('internal', `モックアップ生成に失敗しました: ${error.message}`);
  }
}

/**
 * モックアップ生成用プロンプト構築
 */
function buildMockupPrompt(improvement, deepScrapeData, isNewPage = false) {
  const { title, description, expectedImpact, category } = improvement;
  const { designTokens, keyElements, firstView, sections, forms } = deepScrapeData;

  let prompt = `以下の改善案を適用したWebページのHTML/CSSモックアップを生成してください。

## 改善案
タイトル: ${title || ''}
説明: ${description || ''}
期待効果: ${expectedImpact || ''}
カテゴリ: ${category || ''}

## 現在のサイトデザイン情報
`;

  // デザイントークン
  if (designTokens) {
    prompt += `\n### デザイントークン\n`;
    if (designTokens.fonts?.length > 0) prompt += `フォント: ${designTokens.fonts.join(', ')}\n`;
    if (designTokens.bodyFontSize) prompt += `本文サイズ: ${designTokens.bodyFontSize}\n`;
    if (designTokens.bodyBgColor) prompt += `背景色: ${designTokens.bodyBgColor}\n`;
    if (designTokens.primaryColor) prompt += `プライマリカラー: ${designTokens.primaryColor}\n`;
    if (designTokens.primaryTextColor) prompt += `プライマリテキスト色: ${designTokens.primaryTextColor}\n`;
    if (designTokens.maxWidth) prompt += `コンテナ幅: ${designTokens.maxWidth}\n`;
  }

  // ファーストビュー
  if (firstView) {
    prompt += `\n### 現在のファーストビュー\n`;
    if (firstView.headline) prompt += `見出し: ${firstView.headline}\n`;
    if (firstView.subheadline) prompt += `サブ見出し: ${firstView.subheadline}\n`;
    if (firstView.cta) prompt += `CTA: 「${firstView.cta.text}」→ ${firstView.cta.href}\n`;
  }

  // キー要素のHTML
  if (keyElements?.length > 0) {
    prompt += `\n### 現在のキー要素（実HTML）\n`;
    for (const el of keyElements) {
      prompt += `\n#### ${el.type}\n`;
      if (el.styles) {
        prompt += `スタイル: ${JSON.stringify(el.styles)}\n`;
      }
      prompt += `\`\`\`html\n${el.html}\n\`\`\`\n`;
    }
  }

  // セクション構造
  if (sections?.length > 0) {
    prompt += `\n### セクション構造\n`;
    for (const sec of sections.slice(0, 10)) {
      prompt += `- ${sec.tag}: 「${sec.heading}」`;
      if (sec.imageCount) prompt += ` (画像${sec.imageCount}枚)`;
      if (sec.ctas?.length > 0) prompt += ` [CTA: ${sec.ctas.map(c => `「${c.text}」`).join(', ')}]`;
      prompt += '\n';
    }
  }

  // フォーム
  if (forms?.length > 0) {
    prompt += `\n### フォーム\n`;
    for (const form of forms) {
      prompt += `- ${form.purpose}: フィールド=[${form.fields?.join(', ')}], 送信=「${form.submitText}」\n`;
    }
  }

  if (isNewPage) {
    prompt += `
## 重要: 新規ページ/コンテンツの作成
この改善案は現在存在しないページまたはコンテンツの新規作成です。
上記の「現在のサイトデザイン情報」はサイトのトップページから取得した**サイト共通のデザイン**です。
新規ページでも**既存サイトと統一感のあるデザイン**で作成してください。
- ヘッダー、フッター、ナビゲーションの構造を踏襲
- 同じフォント、カラー、余白を使用
- 同じボタンスタイル、レイアウトパターンを使用
`;
  }

  prompt += `
## 生成ルール
1. **改善対象の該当箇所・セクションのみ**をHTML/CSSで生成すること
   - ページ全体を生成しないこと
   - 例: ヘッダーの改善ならヘッダー部分のみ、フォームの改善ならフォーム部分のみ
   - 例: 会社概要の基本情報の改善なら基本情報セクションのみ
   - ${isNewPage ? '新規コンテンツの場合は、追加する新しいセクション/コンテンツのみ' : '改善箇所に集中し、前後のセクションは含めない'}
2. サイトの既存デザイン（フォント、カラー、余白）を忠実に再現すること（Beforeスクリーンショットがある場合はそれを最も重要な参考資料として使用）
3. **<style>タグ内CSS**を使用し、外部ファイル参照は禁止
4. PC幅1280pxで適切に表示
5. 日本語テキストを使用すること
6. 画像はプレースホルダー（灰色の矩形 + altテキスト表示）で代替
7. コードのみ出力し、説明文は不要
8. **変更箇所のマーキング**: 改善で変更・追加した要素には必ず \`data-changed\` 属性を付けること
   - 属性値には変更内容の短いラベルを日本語で記載（例: data-changed="CTA追加", data-changed="見出し変更"）
   - 変更箇所が複数ある場合はそれぞれに個別のラベルを付ける
   - 既存要素をそのまま残す部分には付けない（変更・追加した要素のみ）

## 出力形式
\`\`\`html
（改善適用後のHTML — <style>タグ含む）
\`\`\`
`;

  return prompt;
}

/**
 * AIレスポンスからHTML/CSSを抽出
 */
function extractHtmlCss(rawText) {
  let html = '';
  let css = '';

  // ```html ... ``` ブロックを抽出（改行パターンの揺れに対応）
  const htmlMatch = rawText.match(/```html\s*\n?([\s\S]*?)```/);
  if (htmlMatch) {
    html = htmlMatch[1].trim();
  }

  // ```css ... ``` ブロックを抽出
  const cssMatch = rawText.match(/```css\s*\n?([\s\S]*?)```/);
  if (cssMatch) {
    css = cssMatch[1].trim();
  }

  // ```だけのコードブロック（言語指定なし）からHTML抽出
  if (!html) {
    const genericMatch = rawText.match(/```\s*\n([\s\S]*?)```/);
    if (genericMatch) {
      const content = genericMatch[1].trim();
      if (content.includes('<') && (content.includes('</') || content.includes('/>'))) {
        html = content;
      }
    }
  }

  // コードブロックがない場合、HTMLタグ部分を直接抽出
  if (!html && rawText.includes('<')) {
    const tagMatch = rawText.match(/(<(?:!DOCTYPE|html|head|body|div|section|header|nav|main|footer|style|article)[\s\S]*)/i);
    if (tagMatch) {
      html = tagMatch[1].trim();
      // 末尾の説明文を除去（最後の閉じタグ以降をカット）
      const lastCloseTag = html.lastIndexOf('</');
      if (lastCloseTag > 0) {
        const endOfTag = html.indexOf('>', lastCloseTag);
        if (endOfTag > 0) {
          html = html.substring(0, endOfTag + 1).trim();
        }
      }
    }
  }

  return { html, css };
}

// ═══════════════════════════════════════════════════════════════════════
// Snapshot + 差分パッチ方式（完全再現モード）
// ═══════════════════════════════════════════════════════════════════════

/**
 * Snapshot ベースで完全再現モックアップを生成する。失敗時は null を返す。
 */
async function trySnapshotBasedMockup({ siteId, improvementId, improvement, apiKey, db }) {
  // 1) スナップショット取得（24h キャッシュ）
  const snap = await captureFullSnapshot({ siteId, pageUrl: improvement.targetPageUrl });
  if (!snap) {
    console.log(`[snapshot_patch] snapshot capture failed for ${improvement.targetPageUrl}`);
    return null;
  }
  const snapshotHtml = await readSnapshotHtml(snap.storagePath);
  if (!snapshotHtml) {
    console.log(`[snapshot_patch] snapshot HTML read failed: ${snap.storagePath}`);
    return null;
  }

  // 2) AI 入力用の構造 HTML を作成（<style>中身除去、data URI除去）
  const structuralHtml = buildStructuralHtml(snapshotHtml);
  if (!structuralHtml || structuralHtml.length > MAX_STRUCTURAL_HTML_BYTES) {
    console.log(`[snapshot_patch] structural HTML too large or empty: ${structuralHtml?.length || 0} bytes`);
    return null;
  }

  // 3) Gemini に JSON パッチをリクエスト
  const patch = await requestPatchFromGemini({ apiKey, improvement, structuralHtml });
  if (!patch || !Array.isArray(patch.changes) || patch.changes.length === 0) {
    console.log('[snapshot_patch] empty or invalid patch from Gemini');
    return null;
  }

  // 4) cheerio で snapshot にパッチ適用
  const applied = applyPatchesToSnapshot(snapshotHtml, patch.changes);
  if (!applied || applied.appliedCount === 0) {
    console.log(`[snapshot_patch] patch application produced no changes (requested=${patch.changes.length})`);
    return null;
  }

  // 5) Storage にパッチ適用後 HTML を保存
  const bucket = getStorage().bucket();
  const mockupPath = `page-mockups/${siteId}/${improvementId}.html`;
  const mockupFile = bucket.file(mockupPath);
  await mockupFile.save(applied.html, {
    metadata: {
      contentType: 'text/html; charset=utf-8',
      cacheControl: 'public, max-age=60',
    },
    resumable: false,
  });
  await mockupFile.makePublic();
  const mockupStorageUrl = `https://storage.googleapis.com/${bucket.name}/${mockupPath}`;

  // 6) Firestore 更新
  await db.doc(`sites/${siteId}/improvements/${improvementId}`).update({
    mockupStorageUrl,
    mockupStoragePath: mockupPath,
    mockupSourceSnapshotPath: snap.storagePath,
    mockupPatchChanges: patch.changes,
    mockupPatchSummary: patch.summary || '',
    mockupMode: 'snapshot_patch',
    mockupGeneratedAt: new Date(),
    // 旧 mockupHtml は上書きしない（backward compat のため）
  });

  console.log(`[snapshot_patch] 成功: patches applied=${applied.appliedCount}/${patch.changes.length}, output=${applied.html.length} bytes`);
  return {
    success: true,
    message: 'モックアップを生成しました（完全再現モード）',
    mode: 'snapshot_patch',
    patchCount: patch.changes.length,
    appliedCount: applied.appliedCount,
    outputBytes: applied.html.length,
  };
}

/**
 * snapshot HTML から Gemini 入力用の構造 HTML を作成する
 * - <style> の中身を除去
 * - <img src="data:..."> の data URI を簡略化
 * - <svg>...</svg> の中身を省略
 * - コメント除去
 */
export function buildStructuralHtml(html) {
  try {
    const $ = cheerio.load(html, { decodeEntities: false });

    // <style> の中身を空に
    $('style').each((_, el) => {
      $(el).text('/* ... */');
    });

    // data URI 画像を省略
    $('img[src^="data:"]').each((_, el) => {
      $(el).attr('src', '[inline-image]');
    });

    // SVG 中身を省略
    $('svg').each((_, el) => {
      const $el = $(el);
      const width = $el.attr('width');
      const height = $el.attr('height');
      $el.empty();
      if (width) $el.attr('width', width);
      if (height) $el.attr('height', height);
      $el.append('<!-- svg-content -->');
    });

    // 長大なインラインCSS（style属性）を切り詰め
    $('[style]').each((_, el) => {
      const s = $(el).attr('style') || '';
      if (s.length > 200) $(el).attr('style', s.substring(0, 200) + '...');
    });

    return $.html();
  } catch (err) {
    console.warn(`[buildStructuralHtml] エラー: ${err.message}`);
    return null;
  }
}

/**
 * Gemini に JSON パッチを生成させる
 */
const CIRCLED_PATCH_MAP = { '①':1,'②':2,'③':3,'④':4,'⑤':5,'⑥':6,'⑦':7,'⑧':8,'⑨':9,'⑩':10 };

function extractItemNumbers(description) {
  const solMatch = (description || '').match(/【\s*提案内容\s*】([\s\S]*?)(?=【|$)/);
  const target = solMatch ? solMatch[1] : '';
  const nums = new Set();
  for (const ch of target) {
    if (CIRCLED_PATCH_MAP[ch]) nums.add(CIRCLED_PATCH_MAP[ch]);
  }
  return [...nums].sort((a, b) => a - b);
}

function patchesCoverageGap(changes, expectedNums) {
  if (expectedNums.length < 2) return [];
  const covered = new Set();
  for (const c of (changes || [])) {
    const first = (c.change_label || '').trim().charAt(0);
    const n = CIRCLED_PATCH_MAP[first];
    if (n) covered.add(n);
  }
  return expectedNums.filter(n => !covered.has(n));
}

export async function requestPatchFromGemini({ apiKey, improvement, structuralHtml }) {
  const systemInstruction =
    'あなたはWebサイト改善のエキスパートです。指定された改善案を、対象ページのDOMに対して適用するための最小限のJSONパッチを返してください。返答は必ず指定されたJSON形式のみで、説明文やマークダウンは不要です。';

  const basePrompt = buildPatchPrompt(improvement, structuralHtml);
  const expectedNums = extractItemNumbers(improvement?.description);

  // Coverage 不足時にフィードバック付きでリトライするループ
  // MAX_RETRIES(通常2) + カバレッジリトライ上限(3) の組み合わせ
  const MAX_COVERAGE_RETRIES = 3;
  let lastParsed = null;
  let feedbackSuffix = '';

  for (let cvAttempt = 0; cvAttempt <= MAX_COVERAGE_RETRIES; cvAttempt++) {
    const prompt = basePrompt + feedbackSuffix;
    const body = {
      system_instruction: { parts: [{ text: systemInstruction }] },
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 8192,
        thinkingConfig: { thinkingBudget: 1024 },
        responseMimeType: 'application/json',
      },
    };

    let parsed = null;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const res = await fetch(
          `${GEMINI_API_BASE}/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          }
        );
        if (!res.ok) {
          const errText = await res.text().catch(() => '');
          const retriable = res.status === 429 || res.status >= 500;
          console.warn(`[requestPatchFromGemini] HTTP ${res.status} (retriable=${retriable}): ${errText.substring(0, 200)}`);
          if (!retriable || attempt >= MAX_RETRIES) break;
          await new Promise(r => setTimeout(r, (attempt + 1) * 1000));
          continue;
        }
        const data = await res.json();
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const finishReason = data.candidates?.[0]?.finishReason;
        if (!rawText) {
          console.warn(`[requestPatchFromGemini] empty response (finishReason=${finishReason})`);
          if (finishReason === 'SAFETY' || finishReason === 'RECITATION') break;
          if (attempt >= MAX_RETRIES) break;
          await new Promise(r => setTimeout(r, (attempt + 1) * 1000));
          continue;
        }
        const p = parsePatchJson(rawText);
        if (!p) {
          console.warn(`[requestPatchFromGemini] JSON parse failed, rawText head: ${rawText.substring(0, 300)}`);
          if (attempt >= MAX_RETRIES) break;
          await new Promise(r => setTimeout(r, (attempt + 1) * 1000));
          continue;
        }
        parsed = p;
        break;
      } catch (err) {
        console.warn(`[requestPatchFromGemini] exception (attempt=${attempt}): ${err.message}`);
        if (attempt >= MAX_RETRIES) break;
        await new Promise(r => setTimeout(r, (attempt + 1) * 1000));
      }
    }

    if (!parsed) return lastParsed; // null or previous best
    lastParsed = parsed;

    // カバレッジチェック: 全項目が change_label でカバーされているか
    const missing = patchesCoverageGap(parsed.changes, expectedNums);
    if (missing.length === 0) {
      if (cvAttempt > 0) {
        console.log(`[requestPatchFromGemini] coverage achieved after ${cvAttempt} retry(ies)`);
      }
      return parsed;
    }
    if (cvAttempt >= MAX_COVERAGE_RETRIES) {
      console.warn(`[requestPatchFromGemini] coverage incomplete after ${cvAttempt} retry(ies): missing ${missing.join(',')}`);
      return parsed;
    }
    // 次の試行用のフィードバック付加
    const missingCircled = missing.map(n => Object.keys(CIRCLED_PATCH_MAP).find(k => CIRCLED_PATCH_MAP[k] === n)).join('、');
    feedbackSuffix = `\n\n## ★再試行★\n前回の応答では ${missingCircled} の項目のパッチが生成されていませんでした。今回は必ず ${missingCircled} を含む **すべての番号項目** に対応するパッチを別々に生成してください。各項目の change_label は必ず対応する丸数字で始めてください。`;
    console.warn(`[requestPatchFromGemini] coverage missing ${missing.join(',')}, retrying (${cvAttempt + 1}/${MAX_COVERAGE_RETRIES})`);
  }
  return lastParsed;
}

function buildPatchPrompt(improvement, structuralHtml) {
  const { title, description, expectedImpact, category } = improvement;
  // 説明テキストから①②③…の番号を抽出し、必須カバー項目としてプロンプト先頭で明示する
  const circledRegex = /[①②③④⑤⑥⑦⑧⑨⑩]/g;
  const foundCircled = Array.from(new Set((description || '').match(circledRegex) || []));
  const mandatoryItemsSection = foundCircled.length >= 2
    ? `\n## ★最重要★ 必須カバー項目\n改善案の「説明」には ${foundCircled.join('、')} の番号付き項目が含まれています。\n**${foundCircled.join('、')} すべてについて、それぞれ最低 1 つの patch を必ず生成してください**。\n「検討します」「〜の方が効果的」といった柔らかい表現の項目も、具体的な DOM 変更として実装化すること（視覚的でない項目は目次ジャンプ・バッジ・注意書き等に翻訳）。\n**項目数 ≤ パッチ数** を厳守。項目をまとめたり、他項目のパッチに含めたりしてはいけない。\n`
    : '';
  return `以下の改善案を、対象ページのDOMに対して適用するための最小限のパッチをJSONで返してください。
${mandatoryItemsSection}
## 改善案
タイトル: ${title || ''}
説明: ${description || ''}
期待効果: ${expectedImpact || ''}
カテゴリ: ${category || ''}

## 対象ページの HTML 構造
（<style>の中身とdata URIは省略してあります。CSSクラス名はそのまま使えます。）

\`\`\`html
${structuralHtml}
\`\`\`

## 出力形式（この形式のJSONのみ返す）

{
  "changes": [
    {
      "target_selector": "上記HTMLに実在するCSSセレクタ",
      "action": "replace | append | prepend | insert_after | insert_before | modify_attrs | remove のいずれか",
      "new_html": "新しいHTML（replace/append/prepend/insert_*時のみ）。<style>タグ含むインラインCSSも書いてよい",
      "new_attrs": { "key": "value" },
      "change_label": "変更内容を端的に表すタイトル（日本語、目安 12-25 字、省略表現「…」は不可、改行許可されるので全文で書く）",
      "description_excerpt": "改善案の『説明』テキストから、この変更が具体的に対応する文の抜粋（30〜100字程度、原文をそのままコピー）。バッジクリック時に左パネルの該当箇所をハイライトするため、必ず説明テキスト内に実在する文字列を返すこと。一致しない／要約は不可"
    }
  ],
  "summary": "この改善で何を変えたかの一行要約"
}

## ルール
1. **target_selector は必ず上記HTMLに実在するセレクタを使う**。存在しないタグ・クラス・idを指定しないこと
2. **変更は最小限**。ページ全体を作り直さず、改善に必要な要素だけを変更する
3. 新規要素追加時は、既存の色・フォント・ボタンスタイルを踏襲し違和感がないようにする
4. 既存のCSSクラス（header, btn, cta 等）は積極的に再利用する
5. new_html 内で style="..." や <style> タグを使って追加スタイルを付けてよい
5-1. **プレースホルダ禁止**: \`{{変数名}}\` \`\${変数}\` \`[TODO]\` のようなテンプレート記法は一切使わない。すべて具体的なサンプル値で埋める。例: × \`{{customer_name}}\` → ○ 「株式会社ABC様」／× \`{{case_detail_url}}\` → ○ \`/case/detail-001/\`（実在しなくても相対パス例で可）。会社名・数値・URL は現実的なダミーを入れて完成形で見せる
6. 変更箇所は AI 側で data-changed 属性を付けなくてよい（サーバ側で自動付与する）
7. changes は 1〜5 件程度。**同じ概念変更が複数要素に及ぶ場合は、複数要素にマッチするセレクタで 1 パッチにまとめる**（例: .faq-answer を個別に 3 パッチに分けず、.faq-answer 全体を 1 パッチで replace）。**改善案に①②③の番号付き項目がある場合は、項目数に応じてパッチを配分し、全項目を必ずカバーすること**（5 パッチ上限の中で項目数を優先し、1 項目 1 パッチを基本にする）。**視覚化しにくい項目（アンカーリンク・ID 設定・SEO 最適化など）も、ユーザーに見える形に翻訳してパッチ化する**（例: アンカーリンク → FAQ 冒頭に目次ジャンプリンクを追加、ID 設定 → 「このページのトップへ」ボタンを追加）
8. **change_label は省略せず端的な完全文**（「…」「など」は禁止）。目安 12-25 字で、内容が明確に伝わる日本語で書く（例: 「メインCTA文言と装飾を変更」「部署名を任意項目に変更」）。**改善案の説明に①②③の番号付き項目がある場合は、項目番号（丸数字）を先頭に付け、続くタイトルをそのまま change_label に使う（例: 説明の「①「特徴」セクションのタイトルを「導入事例」に変更」→ change_label = 「①「特徴」セクションのタイトルを「導入事例」に変更」）**
9. **description_excerpt は上記「説明」テキスト内の実在する文字列**を必ず使う（クリック時の文字列マッチに使うため）。複数の changes が同じ文に対応する場合は同じ excerpt を返してよい
10. **隠れた要素・条件付き表示エリアへのパッチ配置を避ける**: モックアップは静的に表示するため、以下のような「ユーザー操作で初めて表示される領域」をパッチ対象にしない。代わりに **常時表示されている領域** に挿入すること:
    - アコーディオン・折りたたみコンテンツの中身（クリックで開く部分）
    - タブの非アクティブパネル
    - モーダル・ポップアップ・ツールチップの中身
    - 「他の項目も追加」「詳細を表示」等のチェックボックス/トグル ON で表示される領域
    - ドロップダウンメニュー内の項目
    - フォーム送信後にのみ表示されるサンクスエリア・完了メッセージ
    - \`display: none\` / \`visibility: hidden\` / \`max-height: 0\` が CSS で初期適用されている要素
    - 上記要素にしか追加できない場合は、代わりに **そのトリガー要素の隣（外側）** に新規セクションを作って挿入する（例: アコーディオンの中ではなくアコーディオン直下）
11. **レイアウト破壊禁止**: 以下を必ず守ること
    - \`position: absolute\` / \`position: fixed\` は使用禁止（元サイトの上に被せない）
    - ヘッダー・ナビなど**横幅が詰まっている flex/grid コンテナ**には新規要素を追加しない（オーバーフローで既存メニューを押し出すため）
    - 新規追加する要素は親コンテナの幅に収まること（幅固定や min-width を無理に指定しない）
    - style 属性 / style タグを書く場合は \`max-width: 100%; box-sizing: border-box; overflow-wrap: anywhere;\` を含め、親のフローに従うこと
    - 要素の追加はページ本文の**縦フロー方向**（セクション間、フォーム下、コンテンツ末尾など空間がある場所）に限定する`;
}

function parsePatchJson(rawText) {
  // responseMimeType=application/json 指定時はそのまま JSON のはず
  try {
    return JSON.parse(rawText);
  } catch (_) {}

  // コードブロック囲まれている場合
  const m = rawText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (m) {
    try { return JSON.parse(m[1].trim()); } catch (_) {}
  }

  // 最初の { から最後の } を切り出してリトライ
  const first = rawText.indexOf('{');
  const last = rawText.lastIndexOf('}');
  if (first >= 0 && last > first) {
    try { return JSON.parse(rawText.substring(first, last + 1)); } catch (_) {}
  }
  return null;
}

/**
 * snapshot HTML に差分パッチを適用する
 * 戻り値: { html, appliedCount } or null
 */
export function applyPatchesToSnapshot(snapshotHtml, changes) {
  let $;
  try {
    $ = cheerio.load(snapshotHtml, { decodeEntities: false });
  } catch (err) {
    console.warn(`[applyPatchesToSnapshot] cheerio.load 失敗: ${err.message}`);
    return null;
  }

  // 番号割当: 同じ change_label には同じ番号を割り当てる
  // - change_label 先頭に丸数字 (①②③...) がある場合は提案項目番号を優先採用
  //   → 提案の「② メインCTA変更」と モックアップバッジ「②」が 1:1 で一致
  // - 丸数字がない場合は出現順の fallback カウンタで採番
  const CIRCLED_NUM_MAP = { '①':1,'②':2,'③':3,'④':4,'⑤':5,'⑥':6,'⑦':7,'⑧':8,'⑨':9,'⑩':10 };
  const labelToNum = new Map();
  let fallbackCounter = 0;
  for (const change of changes) {
    const label = (change?.change_label || '変更').trim();
    if (labelToNum.has(label)) continue;
    const firstChar = label.charAt(0);
    const circled = CIRCLED_NUM_MAP[firstChar];
    if (circled) {
      labelToNum.set(label, circled);
    } else {
      fallbackCounter++;
      labelToNum.set(label, fallbackCounter);
    }
  }

  let appliedCount = 0;
  for (const change of changes) {
    const { target_selector, action, new_html, new_attrs, change_label } = change || {};
    if (!target_selector || !action) continue;
    const label = (change_label || '変更').trim();
    const num = labelToNum.get(label);

    let $target;
    try {
      $target = $(target_selector);
    } catch (err) {
      console.warn(`[applyPatchesToSnapshot] 無効なセレクタ: ${target_selector}`);
      continue;
    }
    if ($target.length === 0) {
      console.warn(`[applyPatchesToSnapshot] セレクタ不一致: ${target_selector}`);
      continue;
    }

    const marked = new_html ? markChangedHtml(new_html, label, num) : '';

    try {
      switch (action) {
        case 'replace': {
          if (!marked) continue;
          // 既に data-changed が付いている (別パッチで同じ要素が先にマーク済) の場合は
          // 新 HTML を span でラップして既存ラベルを保持し、両方のバッジを表示する
          const existingLabel = $target.attr('data-changed');
          const existingNum = $target.attr('data-num');
          if (existingLabel) {
            const safeExistingLabel = String(existingLabel).replace(/"/g, '&quot;');
            const existingNumAttr = existingNum ? ` data-num="${String(existingNum).replace(/"/g, '&quot;')}"` : '';
            const wrapped =
              `<span data-changed="${safeExistingLabel}"${existingNumAttr} ` +
              `style="display:inline-block;position:relative;">${marked}</span>`;
            $target.replaceWith(wrapped);
          } else {
            $target.replaceWith(marked);
          }
          break;
        }
        case 'append':
          if (!marked) continue;
          $target.append(marked);
          break;
        case 'prepend':
          if (!marked) continue;
          $target.prepend(marked);
          break;
        case 'insert_after':
          if (!marked) continue;
          $target.after(marked);
          break;
        case 'insert_before':
          if (!marked) continue;
          $target.before(marked);
          break;
        case 'modify_attrs': {
          if (!new_attrs || typeof new_attrs !== 'object') continue;
          // 属性更新は元要素に対して行う
          for (const [k, v] of Object.entries(new_attrs)) {
            let val = String(v);
            // style 属性は badge を隠すプロパティ (overflow:hidden 等) を除去
            if (k.toLowerCase() === 'style') {
              val = sanitizeStyleForBadge(val);
            }
            $target.attr(k, val);
          }
          // 既に data-changed が付いている (= 別パッチで同じ要素が既にマーク済) の場合は
          // span でラップしてネストさせ、両方のバッジを表示する（上書きで ③ が消える問題への対処）
          const existingLabel = $target.attr('data-changed');
          if (existingLabel) {
            const safeLabelAttr = label.replace(/"/g, '&quot;');
            $target.wrap(
              `<span data-changed="${safeLabelAttr}" data-num="${num}" ` +
              `style="display:inline-block;position:relative;"></span>`
            );
          } else {
            // data-changed / data-num は疑似要素描画のため、void 要素なら span ラッパーに付与
            const $marker = wrapVoidElementIfNeeded($, $target);
            $marker.attr('data-changed', label);
            $marker.attr('data-num', String(num));
          }
          break;
        }
        case 'remove': {
          // 削除位置にマーカー要素を挿入してバッジ表示を維持
          // （action=remove は元要素を消すため、data-changed を付ける先が無く見えなくなる問題への対処）
          const safeLabelAttr = label.replace(/"/g, '&quot;');
          const removeMarker =
            `<span data-changed="${safeLabelAttr}" data-num="${num}" ` +
            `style="display:inline-block;padding:3px 10px;margin:4px 0;` +
            `font-size:11px;font-weight:600;color:#b91c1c;` +
            `background:rgba(239,68,68,0.08);border:1px dashed #ef4444;` +
            `border-radius:4px;">× 削除</span>`;
          $target.before(removeMarker);
          $target.remove();
          break;
        }
        default:
          console.warn(`[applyPatchesToSnapshot] 未知のaction: ${action}`);
          continue;
      }
      appliedCount++;
    } catch (err) {
      console.warn(`[applyPatchesToSnapshot] 適用失敗 ${action}@${target_selector}: ${err.message}`);
    }
  }

  // 入れ子 data-changed の重複排除は行わない（両方を表示するが、CSS で内側は薄く表示）
  // → 必要ならここで $('[data-changed] [data-changed]') を処理

  // data-changed 用 CSS を head に注入（インラインラベル方式）
  // - アウトライン + 番号バッジ + 横に並ぶラベルピル（常時表示）
  // - ラベルは要素の「外側の上」に配置 → コンテンツを覆わない
  // - クリック: 親フレームの左パネル description を黄色ハイライト
  // - body 全体 pointer-events: none、[data-changed] のみ受ける（リンク誤クリック防止）
  // - 子要素も pointer-events: none
  const outlineCss = [
    // body 全体は不可、変更要素だけ受ける
    `body{pointer-events:none !important;}`,
    // 変更箇所のアウトライン（クリック可）
    // overflow:visible を強制 → ::before バッジが bottom:100% で外側に出ても親の overflow:hidden で消えないように
    `[data-changed]{outline:3px solid #3758F9 !important;outline-offset:3px !important;border-radius:6px !important;position:relative !important;overflow:visible !important;z-index:1 !important;pointer-events:auto !important;cursor:pointer !important;transition:outline-width 0.15s, box-shadow 0.15s !important;}`,
    `[data-changed]:hover{outline-width:4px !important;}`,
    `[data-changed].__mockup-active{outline-width:5px !important;box-shadow:0 0 0 8px rgba(55,88,249,0.15) !important;}`,
    // 番号バッジ（常時表示）
    // pointer-events: auto 明示 → バッジ上のホバー/クリックが親 data-changed のイベントとして発火
    `[data-changed][data-num]::before{content:attr(data-num);position:absolute;bottom:100%;left:0;margin-bottom:6px;width:28px;height:28px;background:#3758F9;color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;box-shadow:0 2px 6px rgba(55,88,249,0.4);border:2px solid white;z-index:10001;pointer-events:auto;cursor:pointer;transition:transform 0.15s;}`,
    `[data-changed]:hover::before{transform:scale(1.1);}`,
    `[data-changed].__mockup-active::before{transform:scale(1.2);background:#1e3a8a;}`,
    // ラベルピルは廃止（チップバーとホバー時の左パネルハイライトで十分、重なり問題も回避）
    // 入れ子 data-changed: 内側のバッジは外側の右横に並列配置（重ならない）
    `[data-changed] [data-changed]{outline-color:rgba(55,88,249,0.55) !important;outline-width:2px !important;}`,
    `[data-changed] [data-changed]::before{width:24px;height:24px;font-size:12px;margin-bottom:8px;left:34px;background:#6366f1;}`,
    // 3 段ネスト対応
    `[data-changed] [data-changed] [data-changed]::before{left:64px;background:#818cf8;}`,
    // data-num が無い旧データは番号バッジを非表示
    `[data-changed]:not([data-num])::before{content:none !important;}`,
    // 変更要素の配下: クリック無効化（誤クリック防止）+ レイアウトは触らない
    // ただしネストした data-changed はクリック可能にする（:not([data-changed])）
    `[data-changed] *:not([data-changed]):not(script):not(style):not(meta):not(link):not(noscript):not(template){pointer-events:none !important;}`,
  ].join('');
  if ($('head').length > 0) {
    $('head').append(`<style id="__mockup-outline">${outlineCss}</style>`);
  } else {
    $.root().prepend(`<style id="__mockup-outline">${outlineCss}</style>`);
  }

  // 親フレームに iframe 高さと変更箇所位置を通知 + バッジクリックを通知するヘルパー script を注入
  // （iframe は cross-origin で contentDocument にアクセスできないため postMessage で連携）
  // unhideHidden: [data-changed] 配下で実際に display:none / visibility:hidden の要素のみ強制表示
  // （CSS で blanket display:revert すると flex/grid が壊れるため、JS で個別対応）
  const helperScript = `(function(){function postSize(){try{parent.postMessage({type:'__mockup_size',height:document.documentElement.scrollHeight,width:document.documentElement.scrollWidth},'*');}catch(_){}}function postChangedPositions(){var els=document.querySelectorAll('[data-changed]');if(els.length===0)return;var positions=[];for(var i=0;i<els.length;i++){var el=els[i];var rect=el.getBoundingClientRect();positions.push({top:rect.top+window.pageYOffset,left:rect.left+window.pageXOffset,height:el.offsetHeight,width:el.offsetWidth,label:el.getAttribute('data-changed')||'',num:el.getAttribute('data-num')||''});}try{parent.postMessage({type:'__mockup_changed_positions',positions:positions},'*');}catch(_){}}function unhideHiddenInChanged(){var changedEls=document.querySelectorAll('[data-changed]');for(var i=0;i<changedEls.length;i++){var ce=changedEls[i];try{var ccs=getComputedStyle(ce);if(ccs.display==='none'){ce.style.setProperty('display','revert','important');}if(ccs.visibility==='hidden'){ce.style.setProperty('visibility','visible','important');}if(parseFloat(ccs.maxHeight)===0){ce.style.setProperty('max-height','none','important');}}catch(_){}var anc=ce.parentElement;while(anc&&anc!==document.body&&anc!==document.documentElement){try{var as=getComputedStyle(anc);if(as.display==='none'){anc.style.setProperty('display','revert','important');}if(as.visibility==='hidden'){anc.style.setProperty('visibility','visible','important');}if(parseFloat(as.maxHeight)===0){anc.style.setProperty('max-height','none','important');}if(parseFloat(as.height)===0&&as.overflow==='hidden'){anc.style.setProperty('height','auto','important');}}catch(_){}anc=anc.parentElement;}var children=ce.querySelectorAll('*');for(var j=0;j<children.length;j++){var child=children[j];try{var cs=getComputedStyle(child);if(cs.display==='none'){child.style.setProperty('display','revert','important');}if(cs.visibility==='hidden'){child.style.setProperty('visibility','visible','important');}if(parseFloat(cs.maxHeight)===0){child.style.setProperty('max-height','none','important');}}catch(_){}}}}function waitImagesThenPositions(){var imgs=Array.prototype.slice.call(document.images);var pending=0;for(var i=0;i<imgs.length;i++){if(!imgs[i].complete)pending++;}var done=false;var finish=function(){if(done)return;done=true;postSize();postChangedPositions();};if(pending===0){finish();return;}imgs.forEach(function(img){if(img.complete)return;var on=function(){if(--pending===0)finish();};img.addEventListener('load',on);img.addEventListener('error',on);});setTimeout(finish,4000);}function setActive(el){var prev=document.querySelector('[data-changed].__mockup-active');if(prev&&prev!==el)prev.classList.remove('__mockup-active');if(el)el.classList.toggle('__mockup-active');}function attachClickHandlers(){var els=document.querySelectorAll('[data-changed]');for(var i=0;i<els.length;i++){var el=els[i];if(el.__mockupClickBound)continue;el.__mockupClickBound=true;el.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();var t=e.currentTarget;setActive(t);var rect=t.getBoundingClientRect();try{parent.postMessage({type:'__mockup_changed_clicked',num:t.getAttribute('data-num')||'',label:t.getAttribute('data-changed')||'',rect:{top:rect.top,left:rect.left,right:rect.right,bottom:rect.bottom,width:rect.width,height:rect.height},active:t.classList.contains('__mockup-active')},'*');}catch(_){}});el.addEventListener('mouseenter',function(e){var t=e.currentTarget;try{parent.postMessage({type:'__mockup_changed_hovered',num:t.getAttribute('data-num')||'',label:t.getAttribute('data-changed')||''},'*');}catch(_){}});}document.addEventListener('click',function(e){if(!e.target.closest('[data-changed]')){setActive(null);try{parent.postMessage({type:'__mockup_changed_deselected'},'*');}catch(_){}}});}function init(){postSize();attachClickHandlers();unhideHiddenInChanged();postChangedPositions();setTimeout(function(){postSize();postChangedPositions();unhideHiddenInChanged();},300);setTimeout(function(){postSize();attachClickHandlers();postChangedPositions();unhideHiddenInChanged();},1200);setTimeout(function(){postChangedPositions();},3000);waitImagesThenPositions();}if(document.readyState==='complete')init();else window.addEventListener('load',init);})();`;
  if ($('body').length > 0) {
    $('body').append(`<script id="__mockup-helper">${helperScript}</script>`);
  } else {
    $.root().append(`<script id="__mockup-helper">${helperScript}</script>`);
  }

  return { html: $.html(), appliedCount };
}

/**
 * style 文字列から badge を隠すプロパティ (overflow / clip / clip-path) を除去する
 * - [data-changed]::before は bottom:100% で要素外側に配置されるため、
 *   overflow:hidden を親に付けると完全に見えなくなる
 * - sanitizeGeneratedHtml は new_html のインライン style が対象だが、
 *   modify_attrs の new_attrs.style も同じ問題が起きるため別関数で対応
 */
function sanitizeStyleForBadge(style) {
  if (!style || typeof style !== 'string') return style;
  return style
    .replace(/overflow(-x|-y)?\s*:\s*(hidden|clip|scroll|auto)\s*(!important)?\s*;?/gi, '')
    .replace(/clip(-path)?\s*:\s*[^;]+;?/gi, '')
    .replace(/;;+/g, ';')
    .replace(/^;|;$/g, '')
    .trim();
}

/**
 * void / replaced 要素のタグ名（::before / ::after が描画されない要素）
 * これらに data-changed を直接付けると番号バッジが出ないため、span でラップする
 */
const VOID_OR_REPLACED_TAGS = new Set([
  'input', 'img', 'textarea', 'select', 'br', 'hr',
  'source', 'video', 'audio', 'iframe', 'embed', 'object',
  'canvas', 'progress', 'meter',
]);

/**
 * void / replaced 要素なら span でラップし、ラッパー側を返す。それ以外はそのまま返す。
 * @returns {cheerio.Cheerio} data-changed を付与すべき対象
 */
function wrapVoidElementIfNeeded($, $target) {
  const el = $target[0];
  if (!el || !el.tagName) return $target;
  const tag = el.tagName.toLowerCase();
  if (!VOID_OR_REPLACED_TAGS.has(tag)) return $target;
  // 既に span ラッパーで囲まれていたら使い回す
  const $parent = $target.parent();
  if ($parent[0]?.tagName?.toLowerCase() === 'span' && $parent.hasClass('__mockup-void-wrap')) {
    return $parent;
  }
  $target.wrap('<span class="__mockup-void-wrap" style="display:inline-block;position:relative;"></span>');
  return $target.parent();
}

/**
 * Gemini が生成した new_html からレイアウト破壊系の CSS を除去し、安全な属性を付与する
 * - position: absolute / fixed を削除（要素外に飛び出して元レイアウトを壊すため）
 * - transform: translate/fixed-position 系を削除
 * - 極端に大きい固定 width (>800px) を削除
 * - max-width: 100%; box-sizing: border-box; overflow-wrap: anywhere; を追加
 * - <style> タグ内からも同様にフィルタ
 */
/**
 * プレースホルダ（{{var}} / ${var} / [TODO]）をサンプル値に置換する
 * AI がテンプレート変数を残してしまった場合の安全網
 */
function replacePlaceholders(html) {
  if (!html) return html;
  const PLACEHOLDER_SAMPLES = {
    customer_name: '株式会社サンプル様',
    company_name: '株式会社サンプル',
    customer: '株式会社サンプル様',
    user_name: '田中様',
    name: 'サンプル太郎',
    service_name: 'サンプルサービス',
    product_name: 'サンプル商品',
    impact_value: '30%',
    value: '100',
    amount: '100,000円',
    price: '10,000円',
    percentage: '25%',
    percent: '25%',
    count: '100',
    number: '100',
    date: '2025年1月1日',
    year: '2025',
    url: '/sample/',
    link: '/sample/',
    case_detail_url: '/case/sample/',
    detail_url: '/detail/sample/',
    href: '/sample/',
    title: 'サンプルタイトル',
    description: 'サンプル説明',
    text: 'サンプルテキスト',
    image_url: '/images/sample.jpg',
    image: '/images/sample.jpg',
    icon: '★',
    email: 'sample@example.com',
    phone: '03-0000-0000',
    address: '東京都サンプル区1-1-1',
  };
  const getSample = (varName) => {
    const key = varName.toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (PLACEHOLDER_SAMPLES[key]) return PLACEHOLDER_SAMPLES[key];
    // キーワードマッチ
    for (const [k, v] of Object.entries(PLACEHOLDER_SAMPLES)) {
      if (key.includes(k)) return v;
    }
    return 'サンプル';
  };
  return html
    // {{var_name}} → サンプル値
    .replace(/\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g, (_, v) => getSample(v))
    // ${var_name} → サンプル値
    .replace(/\$\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}/g, (_, v) => getSample(v))
    // [TODO] / [TODO: xxx] → サンプル
    .replace(/\[TODO(?::\s*[^\]]+)?\]/gi, 'サンプル');
}

export function sanitizeGeneratedHtml(html) {
  if (!html || typeof html !== 'string') return html;
  // プレースホルダを置換（安全網）: AI が {{var}} / ${var} / [TODO] を残した場合、
  // 変数名から推定したサンプル値に置換する
  html = replacePlaceholders(html);
  try {
    const $ = cheerio.load(`<root>${html}</root>`, { decodeEntities: false, xmlMode: false });

    // インライン style 属性のサニタイズ
    $('root *[style]').each((_, el) => {
      const $el = $(el);
      let style = $el.attr('style') || '';
      // 危険な宣言を除去
      style = style
        .replace(/position\s*:\s*(absolute|fixed|sticky)\s*(!important)?\s*;?/gi, '')
        .replace(/transform\s*:\s*[^;]+;?/gi, '')
        // overflow:hidden は [data-changed]::before バッジをクリップするため除去
        .replace(/overflow(-x|-y)?\s*:\s*(hidden|clip)\s*(!important)?\s*;?/gi, '')
        .replace(/clip(-path)?\s*:\s*[^;]+;?/gi, '')
        // 800px 超の固定 width/min-width を削除（単位 px のみ）
        .replace(/(?:^|;)\s*(?:min-)?width\s*:\s*(\d+)\s*px\s*(!important)?\s*;?/gi,
          (m, n) => (Number(n) > 800 ? '' : m));
      // 安全プロパティを末尾に付与（重複は気にしない、後勝ちで効く）
      if (!/max-width\s*:/i.test(style)) style += ';max-width:100%';
      if (!/box-sizing\s*:/i.test(style)) style += ';box-sizing:border-box';
      if (!/overflow-wrap\s*:/i.test(style)) style += ';overflow-wrap:anywhere';
      $el.attr('style', style.replace(/;;+/g, ';').replace(/^;|;$/g, ''));
    });

    // <style> タグ内の危険ルールを軽くフィルタ（完全ではないが position:absolute/fixed は削る）
    $('root style').each((_, el) => {
      const $el = $(el);
      let css = $el.html() || '';
      css = css.replace(/position\s*:\s*(absolute|fixed|sticky)\s*(!important)?\s*;?/gi, '');
      $el.text(css);
    });

    return $('root').html() || html;
  } catch (err) {
    console.warn(`[sanitizeGeneratedHtml] エラー: ${err.message}`);
    return html;
  }
}

/**
 * 新規追加HTML要素に data-changed / data-num 属性を付与する
 * - 単一ルート要素ならその要素に付与
 * - 複数要素ならそれぞれに付与
 * - void/replaced 要素 (input/select/img 等) は span でラップしてから付与
 *   （疑似要素 ::before / ::after が描画されないため）
 */
function markChangedHtml(html, label, num) {
  const safeLabel = String(label || '変更').replace(/"/g, '&quot;');
  const safeNum = num != null ? String(num) : '';
  // サニタイズを先にかけてから data-changed を付与
  let sanitized = sanitizeGeneratedHtml(html);
  // テキストのみ（タグなし）の new_html は span でラップして data-changed を付けられるようにする
  // 例: Gemini が「新しい文言」だけを返した場合、そのままだと DOM 要素がなく属性が付与できない
  if (!/<[a-zA-Z!/]/.test(sanitized)) {
    sanitized = `<span>${sanitized}</span>`;
  }
  try {
    const $ = cheerio.load(`<root>${sanitized}</root>`, { decodeEntities: false, xmlMode: false });
    $('root').children().each((_, el) => {
      let $el = $(el);
      $el = wrapVoidElementIfNeeded($, $el);
      if (!$el.attr('data-changed')) $el.attr('data-changed', safeLabel);
      if (safeNum && !$el.attr('data-num')) $el.attr('data-num', safeNum);
    });
    return $('root').html() || sanitized;
  } catch (_) {
    return sanitized;
  }
}
