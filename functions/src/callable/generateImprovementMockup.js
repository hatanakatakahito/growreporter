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
export async function requestPatchFromGemini({ apiKey, improvement, structuralHtml }) {
  const systemInstruction =
    'あなたはWebサイト改善のエキスパートです。指定された改善案を、対象ページのDOMに対して適用するための最小限のJSONパッチを返してください。返答は必ず指定されたJSON形式のみで、説明文やマークダウンは不要です。';

  const prompt = buildPatchPrompt(improvement, structuralHtml);

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
        if (!retriable || attempt >= MAX_RETRIES) return null;
        await new Promise(r => setTimeout(r, (attempt + 1) * 1000));
        continue;
      }
      const data = await res.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const finishReason = data.candidates?.[0]?.finishReason;
      if (!rawText) {
        console.warn(`[requestPatchFromGemini] empty response (finishReason=${finishReason})`);
        if (finishReason === 'SAFETY' || finishReason === 'RECITATION') return null;
        if (attempt >= MAX_RETRIES) return null;
        await new Promise(r => setTimeout(r, (attempt + 1) * 1000));
        continue;
      }
      const parsed = parsePatchJson(rawText);
      if (!parsed) {
        console.warn(`[requestPatchFromGemini] JSON parse failed, rawText head: ${rawText.substring(0, 300)}`);
        if (attempt >= MAX_RETRIES) return null;
        await new Promise(r => setTimeout(r, (attempt + 1) * 1000));
        continue;
      }
      return parsed;
    } catch (err) {
      console.warn(`[requestPatchFromGemini] exception (attempt=${attempt}): ${err.message}`);
      if (attempt >= MAX_RETRIES) return null;
      await new Promise(r => setTimeout(r, (attempt + 1) * 1000));
    }
  }
  return null;
}

function buildPatchPrompt(improvement, structuralHtml) {
  const { title, description, expectedImpact, category } = improvement;
  return `以下の改善案を、対象ページのDOMに対して適用するための最小限のパッチをJSONで返してください。

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
      "change_label": "変更内容の短い日本語ラベル（例: CTA追加、見出し変更）"
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
6. 変更箇所は AI 側で data-changed 属性を付けなくてよい（サーバ側で自動付与する）
7. changes は 1〜5 件程度。冗長な変更は避ける`;
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

  let appliedCount = 0;
  for (const change of changes) {
    const { target_selector, action, new_html, new_attrs, change_label } = change || {};
    if (!target_selector || !action) continue;

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

    const marked = new_html ? markChangedHtml(new_html, change_label) : '';

    try {
      switch (action) {
        case 'replace':
          if (!marked) continue;
          $target.replaceWith(marked);
          break;
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
        case 'modify_attrs':
          if (!new_attrs || typeof new_attrs !== 'object') continue;
          for (const [k, v] of Object.entries(new_attrs)) {
            $target.attr(k, String(v));
          }
          $target.attr('data-changed', change_label || '属性変更');
          break;
        case 'remove':
          $target.remove();
          break;
        default:
          console.warn(`[applyPatchesToSnapshot] 未知のaction: ${action}`);
          continue;
      }
      appliedCount++;
    } catch (err) {
      console.warn(`[applyPatchesToSnapshot] 適用失敗 ${action}@${target_selector}: ${err.message}`);
    }
  }

  // data-changed 用の outline CSS を head に注入
  const outlineCss = `[data-changed]{outline:2px solid #3758F9 !important;outline-offset:2px !important;border-radius:4px !important;position:relative !important;z-index:1 !important;}[data-changed]::after{content:attr(data-changed);position:absolute;top:-10px;right:-4px;background:#3758F9;color:#fff;font-size:10px;font-weight:700;padding:1px 6px;border-radius:8px;line-height:1.4;z-index:9999;pointer-events:none;white-space:nowrap;}`;
  if ($('head').length > 0) {
    $('head').append(`<style id="__mockup-outline">${outlineCss}</style>`);
  } else {
    $.root().prepend(`<style id="__mockup-outline">${outlineCss}</style>`);
  }

  return { html: $.html(), appliedCount };
}

/**
 * 新規追加HTML要素に data-changed 属性を付与する
 * - 単一ルート要素ならその要素に付与
 * - 複数要素ならそれぞれに付与
 */
function markChangedHtml(html, label) {
  const safeLabel = String(label || '変更').replace(/"/g, '&quot;');
  try {
    const $ = cheerio.load(`<root>${html}</root>`, { decodeEntities: false, xmlMode: false });
    $('root').children().each((_, el) => {
      const $el = $(el);
      if (!$el.attr('data-changed')) {
        $el.attr('data-changed', safeLabel);
      }
    });
    return $('root').html() || html;
  } catch (_) {
    return html;
  }
}
