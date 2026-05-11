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
import { captureBrowserRendering, readBrowserRenderedHtml } from '../utils/captureBrowserRendering.js';
import { captureBrowserScreenshot } from '../utils/captureBrowserScreenshot.js';
import { enforceRateLimit, DEFAULT_RATE_LIMITS } from '../utils/rateLimiter.js';
import { requireDocId } from '../utils/validators.js';

/**
 * Cloudflare Browser Rendering 経路を使うか判定。
 * 環境変数 USE_BROWSER_RENDERING=true で有効化（未設定なら旧 PSI/CF Worker snapshot 経路）。
 */
function isBrowserRenderingEnabled() {
  return process.env.USE_BROWSER_RENDERING === 'true';
}

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

  // Phase 4-A-2: レート制限（AI + 外部 fetch 課金枯渇防止）
  await enforceRateLimit({ uid: req.auth.uid, ...DEFAULT_RATE_LIMITS.generateImprovementMockup });

  // 入力検証 (Phase 4-B-7)
  const siteId = requireDocId(req.data?.siteId, 'siteId');
  const improvementId = requireDocId(req.data?.improvementId, 'improvementId');

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

    // ── targetPageUrl 正規化 ──
    // AI が改善案生成時に「複数ページ対象」を 1 文字列にカンマ連結することがある
    //   例: "https://grow-group.jp/archives/2502/, /archives/7361/, /archives/2191/"
    //   例: "https://grow-group.jp/company/, /company/profile/, /company/staff/"
    //   例: "https://grow-group.jp/archives/2502/等"
    // captureBrowserRendering は単一 URL しか扱えないため、
    // 最初の有効な URL を抽出して使用する。残りは無視（モックアップは "代表 1 ページ" を表示）。
    if (improvement.targetPageUrl && typeof improvement.targetPageUrl === 'string') {
      const original = improvement.targetPageUrl;
      // 最初の http(s):// から始まる絶対 URL を採取 (区切り文字: 空白, カンマ, 全角カンマ, セミコロン)
      const firstUrlMatch = original.match(/https?:\/\/[^\s,、，;；]+/);
      if (firstUrlMatch) {
        let cleaned = firstUrlMatch[0]
          // 末尾の日本語接続辞「等」「など」「他」「と」を剥がす
          .replace(/(?:等|など|他|と)$/u, '')
          // 末尾の句読点・括弧類を剥がす
          .replace(/[、,，;；。.)）」』】>＞]+$/u, '');
        if (cleaned !== original) {
          console.log(`[generateImprovementMockup] targetPageUrl 正規化: "${original}" → "${cleaned}"`);
          improvement.targetPageUrl = cleaned;
        }
      }
    }

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
    // 判定対象テキストから URL を除去（URL 内の "https"/"404" 等が誤マッチするため）
    const titleAndDescRaw = `${improvement.title || ''} ${improvement.description || ''}`;
    const titleAndDesc = titleAndDescRaw.replace(/https?:\/\/[^\s）)」』】＞>"']+/gi, '');
    // ASCII の短縮キーワードは単語境界マッチ（"INP" が "input" にマッチする等の誤判定回避）
    // 日本語キーワードは includes でそのまま判定
    const titleAndDescLower = titleAndDesc.toLowerCase();
    const isNonVisual = NON_VISUAL_KEYWORDS.some(kw => {
      const lower = kw.toLowerCase();
      // 半角英数字・記号のみで構成されるキーワードは単語境界で判定
      if (/^[\x20-\x7E]+$/.test(kw)) {
        const escaped = lower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const re = new RegExp(`(?:^|[^a-z0-9])${escaped}(?![a-z0-9])`, 'i');
        return re.test(titleAndDescLower);
      }
      return titleAndDescLower.includes(lower);
    });
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

    // 1d. 既存スクショが無ければオンデマンド撮影
    //     CF Worker Browser Rendering で PC のみ撮影 (PSI 経路は廃止)
    //     Workers Free は 20s 1 ブラウザ制限があるため PC + Mobile 並列は避ける
    //     撮影結果は pageScreenshots に保存し、次回以降の再利用を可能にする
    if (!beforeScreenshotBase64 && improvement.targetPageUrl) {
      try {
        console.log(`[generateImprovementMockup] On-demand Browser Rendering capture: ${improvement.targetPageUrl}`);
        const { FieldValue } = await import('firebase-admin/firestore');

        const siteDoc = await db.collection('sites').doc(siteId).get();
        const siteOwnerId = siteDoc.data()?.userId;
        const pagePath = (() => {
          try { return new URL(improvement.targetPageUrl).pathname; } catch { return '/'; }
        })();

        if (siteOwnerId) {
          const pcResult = await captureBrowserScreenshot({
            url: improvement.targetPageUrl,
            deviceType: 'pc',
            userId: siteOwnerId,
            options: { storagePathPrefix: 'page-screenshots', siteId, pagePath },
          });

          if (pcResult?.imageUrl) {
            await db.collection('sites').doc(siteId).collection('pageScreenshots').add({
              url: improvement.targetPageUrl,
              pagePath,
              screenshotUrl: pcResult.imageUrl,
              screenshotUrlMobile: null,
              imageSize: pcResult?.imageSize || 0,
              mobileImageSize: 0,
              screenshotType: pcResult?.screenshotType || null,
              source: 'on-demand-browser-rendering',
              capturedAt: FieldValue.serverTimestamp(),
            });
            // _meta 更新（Improve.jsx の realtime listener を発火させる）
            await db.collection('sites').doc(siteId).collection('pageScreenshots').doc('_meta').set({
              lastCapturedAt: FieldValue.serverTimestamp(),
            }, { merge: true });

            // Gemini 入力用に PC 版を base64 化（モックアップ生成は従来通り PC ベース）
            const res = await fetch(pcResult.imageUrl);
            if (res.ok) {
              const buffer = await res.arrayBuffer();
              beforeScreenshotBase64 = `data:image/jpeg;base64,${Buffer.from(buffer).toString('base64')}`;
              screenshotSource = 'on-demand-browser-rendering';
            }
          }
        }
      } catch (e) {
        console.warn(`[generateImprovementMockup] On-demand capture failed: ${e.message}`);
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
 *
 * USE_BROWSER_RENDERING=true なら Cloudflare Browser Rendering 経路（JS 実行後の DOM）を使用。
 * 未設定なら従来の CF Worker snapshot 経路（素 HTML + CSS インライン化 + enhance 補正）。
 */
async function trySnapshotBasedMockup({ siteId, improvementId, improvement, apiKey, db }) {
  // 1) ベース HTML を取得（24h キャッシュ）
  let snapshotHtml = null;
  let sourcePath = null;
  let sourceMode = 'snapshot';

  if (isBrowserRenderingEnabled()) {
    sourceMode = 'browser-rendering';
    const rendering = await captureBrowserRendering({
      siteId,
      pageUrl: improvement.targetPageUrl,
      viewport: 'pc',
    });
    if (!rendering) {
      console.log(`[snapshot_patch] browser-rendering capture failed for ${improvement.targetPageUrl}`);
      return null;
    }
    snapshotHtml = await readBrowserRenderedHtml(rendering.storagePath);
    sourcePath = rendering.storagePath;
  } else {
    const snap = await captureFullSnapshot({ siteId, pageUrl: improvement.targetPageUrl });
    if (!snap) {
      console.log(`[snapshot_patch] snapshot capture failed for ${improvement.targetPageUrl}`);
      return null;
    }
    snapshotHtml = await readSnapshotHtml(snap.storagePath);
    sourcePath = snap.storagePath;
  }

  if (!snapshotHtml) {
    console.log(`[snapshot_patch] HTML read failed (${sourceMode}): ${sourcePath}`);
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
    mockupSourceSnapshotPath: sourcePath,
    mockupSourceMode: sourceMode,
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

    // 1) セレクタ一意マッチ検証: AI の target_selector が構造 HTML 内で「正確に 1 件」マッチするかを cheerio で検証
    //    - 0 件: AI のハルシネーション (例: 実在しない `.l-recruit-form__resume` 等の BEM 命名)
    //    - 2 件以上: generic 過ぎる selector で意図しない要素にもバッジ・DOM 変更が出る不具合
    //    両方を失敗扱いにして Gemini に再生成させる
    let failedSelectors = [];
    try {
      const $struct = cheerio.load(structuralHtml, { decodeEntities: false });
      for (const change of parsed.changes || []) {
        const sel = change?.target_selector;
        if (!sel || typeof sel !== 'string') continue;
        try {
          const matchCount = $struct(sel).length;
          if (matchCount !== 1) {
            failedSelectors.push({
              selector: sel,
              label: change.change_label || '(no label)',
              matchCount,
            });
          }
        } catch (e) {
          failedSelectors.push({ selector: sel, label: change.change_label || '(no label)', matchCount: -1, error: e.message });
        }
      }
    } catch (e) {
      console.warn(`[requestPatchFromGemini] selector validation failed: ${e.message}`);
    }

    // 2) カバレッジチェック: 全項目が change_label でカバーされているか
    const missing = patchesCoverageGap(parsed.changes, expectedNums);

    // 両方クリアなら完了
    if (failedSelectors.length === 0 && missing.length === 0) {
      if (cvAttempt > 0) {
        console.log(`[requestPatchFromGemini] all checks passed after ${cvAttempt} retry(ies)`);
      }
      return parsed;
    }
    if (cvAttempt >= MAX_COVERAGE_RETRIES) {
      if (failedSelectors.length > 0) console.warn(`[requestPatchFromGemini] selector uniqueness incomplete: ${failedSelectors.length} failed (${failedSelectors.map(f => `${f.selector}=${f.matchCount}件`).join(', ')})`);
      if (missing.length > 0) console.warn(`[requestPatchFromGemini] coverage incomplete: missing ${missing.join(',')}`);
      return parsed;
    }

    // 次の試行用のフィードバック付加
    let parts = [];
    if (failedSelectors.length > 0) {
      parts.push(
        `### ★selector 一意マッチ違反★\n以下の target_selector は **正確に 1 件マッチ** する必要があるが違反しています。Rule 16 を必ず守って再生成してください:\n` +
        failedSelectors.map(f => {
          if (f.error) return `- "${f.selector}" (label: ${f.label}) — エラー: ${f.error}`;
          if (f.matchCount === 0) return `- "${f.selector}" (label: ${f.label}) → **0 件** (構造 HTML に存在しない、BEM 創作命名の可能性。実在クラスを grep して確認)`;
          return `- "${f.selector}" (label: ${f.label}) → **${f.matchCount} 件マッチ** (generic 過ぎる。バッジが意図しない場所に並ぶ。親階層 / nth-of-type / 属性で 1 件に絞り込み必須)`;
        }).join('\n') +
        `\n\n★絶対ルール★\n- target_selector は **\`$(sel).length === 1\` になる specific セレクタ限定**\n- 0 件 → 実在クラス・ID・タグに置き換える（BEM 創作禁止）\n- 2 件以上 → **\`#id\` \`[data-*]\` \`[aria-*]\` を最優先**。次点で **親階層 + クラス**（例: \`.l-fv .btn\`）、最終手段で **:first-of-type / :nth-of-type(N)**\n- 「全要素に同じ変更」は親 1 件を replace で実現するか、代表 1 要素のみ修正すること（複数バッジ並びは禁止）`
      );
      console.warn(`[requestPatchFromGemini] ${failedSelectors.length} selector uniqueness violations (${failedSelectors.map(f => `${f.matchCount}件`).join(',')}), retrying (${cvAttempt + 1}/${MAX_COVERAGE_RETRIES})`);
    }
    if (missing.length > 0) {
      const missingCircled = missing.map(n => Object.keys(CIRCLED_PATCH_MAP).find(k => CIRCLED_PATCH_MAP[k] === n)).join('、');
      parts.push(
        `### ★番号項目カバレッジ不足★\n前回の応答では ${missingCircled} の項目のパッチが生成されていませんでした。今回は必ず ${missingCircled} を含む **すべての番号項目** に対応するパッチを別々に生成してください。各項目の change_label は必ず対応する丸数字で始めてください。`
      );
      console.warn(`[requestPatchFromGemini] coverage missing ${missing.join(',')}, retrying (${cvAttempt + 1}/${MAX_COVERAGE_RETRIES})`);
    }
    feedbackSuffix = `\n\n## ★再試行フィードバック★\n${parts.join('\n\n')}`;
  }
  return lastParsed;
}

function buildPatchPrompt(improvement, structuralHtml) {
  const { title, description, expectedImpact, category } = improvement;
  // 説明テキストから①②③…の番号を抽出し、必須カバー項目としてプロンプト先頭で明示する
  const circledRegex = /[①②③④⑤⑥⑦⑧⑨⑩]/g;
  const foundCircled = Array.from(new Set((description || '').match(circledRegex) || []));
  const mandatoryItemsSection = foundCircled.length >= 2
    ? `\n## ★最重要★ 必須カバー項目\n改善案の「説明」には ${foundCircled.join('、')} の番号付き項目が含まれています。\n**${foundCircled.join('、')} すべてについて、それぞれ厳密に 1 つの patch を生成してください**（1 項目 = 1 patch = 1 要素を厳守）。\n「検討します」「〜の方が効果的」といった柔らかい表現の項目も、具体的な DOM 変更として実装化すること（視覚的でない項目は目次ジャンプ・バッジ・注意書き等に翻訳）。\n**項目数 = パッチ数** を厳守。項目をまとめたり、他項目のパッチに含めたり、1 項目を複数 patch に分割したりしてはいけない。\n`
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
7. changes は 1〜5 件程度。**1 項目 = 厳密に 1 patch = 厳密に 1 要素** を必ず守る。同じ概念変更が複数要素に及ぶ場合でも、**代表となる 1 要素**を選んで 1 patch にすること（× .faq-answer を 1 パッチで全件まとめて replace、○ .faq-list 親要素 1 件を replace で全体を書き直す or 代表 .faq-answer:first-of-type 1 件のみ修正）。**改善案に①②③の番号付き項目がある場合は、項目数 = パッチ数 を厳守し、全項目を必ずカバーすること**（5 パッチ上限の中で項目数を優先）。**視覚化しにくい項目（アンカーリンク・ID 設定・SEO 最適化など）も、ユーザーに見える形に翻訳してパッチ化する**（例: アンカーリンク → FAQ 冒頭に目次ジャンプリンクを追加、ID 設定 → 「このページのトップへ」ボタンを追加）
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
    - 要素の追加はページ本文の**縦フロー方向**（セクション間、フォーム下、コンテンツ末尾など空間がある場所）に限定する
    - **\`overflow: hidden\` + 固定 height (px / vw / vh / rem) の親要素の中に新規要素を追加しない** — そのまま追加すると見えなくなる（カード型コンポーネント \`.c-card\` \`.card\` \`.tile\` \`.box\` \`[class*="card"]\` \`[class*="block"]\` 等は典型例）。代わりに **そのカードの直下（カード外）** に新規セクションを作って挿入する
12. **絵文字禁止 / アイコンは inline SVG**: 装飾アイコンを使う場合、**絵文字（📈 ✨ 🎯 💼 ⭐ 等）は使用禁止**。チープでビジネスサイトに合わない。代わりに **inline SVG** を直接 HTML に書く。例:
    - ○ \`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 17l6-6 4 4 8-8"/></svg>\` (グラフアイコン)
    - ○ \`<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg>\`
    - × \`📈\` \`✨\` \`🎯\` 等の絵文字
    - SVG が思いつかない場合は、CSS の border / background-color で図形を作る（円・四角・三角）か、シンプルな数字（①②③）で代替
    - Heroicons / Lucide / Feather 等のオープンソース SVG パスを inline で使うのが理想
13. **文字色は親の背景に合わせる**: \`color: #fff\` / \`color: white\` を盲目的に使うと、親が白背景・透明背景の場合に文字が消える。
    - 親要素の class やインライン style に \`is-color-white\` \`bg-dark\` \`is-dark\` \`overlay\` 等が含まれる、または親が画像背景上で white text を使っているのが明らかな場合のみ \`color: #fff\` を使う
    - そうでない場合は \`color: #333\` \`color: inherit\` \`color: currentColor\` のように親に従う
    - 視認性が不安な場合は \`text-shadow: 0 1px 2px rgba(0,0,0,0.5)\` のような contrast 補強を加える
14. **繰り返し要素には個別の内容を提案**: AI が「サービス一覧」「カード型実績」「FAQ 一覧」など複数の sibling 要素 (\`<a class="c-card__block">\` × 4 個 等) に対して同一テキストを繰り返し挿入するのは禁止。
    - 同じ内容を 4 個に同じテキストで挿入 → 全カードに同じ説明文 → ユーザビリティ低下
    - 各要素について **個別の文脈に合った内容** を生成すること（例: \`Webサイト制作\` カードには制作向け説明、\`Web支援\` カードには支援向け説明）
    - 個別化が困難な場合は、**親コンテナ自体に 1 つの説明** を追加する形にする（カード単位ではなくセクション単位）
15. **空要素・無意味要素禁止**: \`new_html\` の中身が**実質的に空**の patch は禁止。
    - × \`<span><br></span>\` （改行のみ、視覚的に空）
    - × \`<div></div>\` （完全に空）
    - × \`<p>&nbsp;</p>\` （nbsp のみ）
    - × \`<span> </span>\` （空白のみ）
    - **必ず意味のあるテキスト・画像・SVG・input 等のコンテンツを含むこと**
    - text content が 1 文字以上 OR \`<img>/<svg>/<iframe>/<video>/<input>/<button>\` 等の意味のある media/control 要素を含むこと
    - 視覚的に何も追加しない patch を出すぐらいなら、その項目は **patch を出さない**（changes 配列に含めない）方がよい
16. **target_selector は構造 HTML 内で「正確に 1 件」マッチすること（厳守）**:
    - cheerio で \`$(target_selector).length === 1\` になるよう必ず specific に書く
    - **0 件マッチ** → セレクタが存在しない（パッチ適用不能、自動リトライ対象）
    - **2 件以上マッチ** → 意図しない場所も変更されバッジが誤った位置に出る（**最近の不具合の主因**）。これも自動リトライ対象
    - **selector 選びの優先順位**:
      1. ID (\`#hero\` \`#contact-form\` 等) — 通常 1 件
      2. data-* 属性 (\`[data-section="fv"]\` \`[data-id="..."]\`)
      3. aria-* 属性 (\`[aria-label="..."]\`)
      4. 親階層 + クラス組合せ (\`.l-fv .c-btn\` \`header .gnav\`)
      5. nth-of-type / first-of-type で絞り込み (\`.card:first-of-type\` \`.section:nth-of-type(2)\`)
    - **避けるべき selector**:
      - × \`.btn\` （多くのページで複数マッチ）
      - × \`h2\` （複数の section に存在）
      - × \`.c-section__title\` （汎用 BEM クラスは複数存在しがち）
    - **書き方の実例**:
      - × \`h1\` (0 件 → 追加したい場合は親要素を replace か prepend)
      - × \`.section__title\` (5 件マッチ) → ○ \`.l-fv .section__title\` (1 件)
      - × \`.btn-cta\` (3 件マッチ) → ○ \`.l-fv .btn-cta\` (1 件) または \`.btn-cta:first-of-type\` (1 件)
    - **「全要素に同じ変更を当てたい」場合の取り扱い**:
      - 親コンテナ 1 つ (\`.faq-list\` 等) を 1 パッチで replace して中身を書き直す
      - もしくは、代表 1 要素 (\`.faq-item:first-of-type\` 等) のみ修正してモックとして表現する
      - **複数要素にバッジを並べる方式は禁止**（バッジは 1 項目につき 1 か所に固定）`;
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
 * AI が返した new_html が「実質的に空」かを判定する。
 * - <br> / <wbr> / &nbsp; / 空白 のみ → 空とみなす
 * - <img> / <svg> / <iframe> / <video> / <audio> / <input> / <button> 等の media/control 要素を
 *   含む場合は空でないと判定 (visual content がある)
 *
 * 用途: AI が `<span><br></span>` のような無意味要素で改善 patch を埋めてくる事象への対策。
 * このような patch は HTML 上は存在するが visual には何も追加されず、badge も出せない (rect 0)。
 *
 * @param {string} html
 * @returns {boolean} 意味があれば true、空であれば false
 */
function isPatchContentMeaningful(html) {
  if (!html || typeof html !== 'string') return false;
  // media / interactive 要素があれば即 OK
  if (/<(?:img|svg|iframe|video|audio|input|button|select|textarea|canvas|picture|source|track|map|object|embed|portal)\b/i.test(html)) {
    return true;
  }
  // タグ・空白系エンティティ・スペースを全部剥いだ後、1 文字以上残るか
  const text = html
    .replace(/<br\s*\/?>/gi, '')
    .replace(/<wbr\s*\/?>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&(?:nbsp|zwj|zwnj|ensp|emsp|thinsp|hairsp|#x?[0-9a-f]+);/gi, '')
    .replace(/\s+/g, '')
    .trim();
  return text.length > 0;
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

  // 番号割当: 提案項目（左パネル ①②③）と mockup バッジを 1:1 対応させる
  // - change_label 先頭の丸数字 (①②③...) があれば提案項目番号として採用
  //   → 複数パッチが同じ提案項目に属する場合は同じ番号を共有 (例: ① h2 タグ →
  //     会社概要・名古屋・東京の 3 箇所すべてバッジ ①)
  // - フロント側は num で dedupe して左パネルと同じ件数のチップを表示
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
    // 複数マッチ時のセーフティネット: Rule 16 (target_selector は 1 件マッチ必須) を
    // 検証で取りこぼした場合の保険として、ここで先頭 1 件のみに変更を当てる。
    // これにより「全カードに同じバッジ ②②②②」のような誤適用を最終ラインで防ぐ。
    if ($target.length > 1) {
      console.warn(`[applyPatchesToSnapshot] セレクタが ${$target.length} 件マッチ、先頭のみに適用: ${target_selector}`);
      $target = $target.first();
    }

    // new_html が必要な action で、内容が実質的に空 (<br> のみ等) なら patch を skip。
    // AI が無意味な空要素で改善を埋めてくる事象 (rect 0 で badge 出ない) への対策。
    const needsHtml = action === 'replace' || action === 'append' || action === 'prepend'
      || action === 'insert_after' || action === 'insert_before';
    if (needsHtml && !isPatchContentMeaningful(new_html)) {
      console.warn(`[applyPatchesToSnapshot] 空 new_html により skip: action=${action}, label=${label}, html_preview=${(new_html || '').substring(0, 100)}`);
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

  // ========================================================
  // フッター余白の根本対処: <footer> 以降の兄弟要素を物理削除
  // ========================================================
  // 多くのコーポレートサイトは body 末尾に以下を持つ:
  //   - back-to-top FAB / page-top ボタン (`<a class="back-to-top">` 等)
  //   - tracking pixel iframe / ポップアップ用空 div / モーダルコンテナ
  //   - 100vh の min-height を持つ装飾要素
  // これらを CSS で隠しても div 自体の height は残るため、iframe srcDoc で
  // 巨大な空白として描画される。HTML から物理的に削除すれば確実に余白が消える。
  //
  // 戦略:
  //   1. <footer> 要素を見つける (body 直下で最後の <footer>、または class に footer を含む要素)
  //   2. その要素より後ろにある全兄弟要素を削除
  //   3. 念のため class/id に back-to-top / pagetop / totop を含む要素も全削除
  try {
    // 1) body 直下の <footer> またはそれ相当を検出
    const $footers = $('body > footer, body > [class*="footer"]:not([class*="footer-"]), body > [id*="footer"]:not([id*="footer-"])');
    if ($footers.length > 0) {
      // 最後の footer を採用 (複数ある場合)
      const $lastFooter = $footers.last();
      // その後ろの兄弟をすべて削除
      $lastFooter.nextAll().remove();
    }
    // 2) どこにあろうと back-to-top 系・pagetop 系・totop 系は削除
    //    (page-top__inner 等のサブ要素を誤爆しないため :not で完全一致系を弾く)
    $(
      '[class*="back-to-top"],[id*="back-to-top"],' +
      '[class*="pagetop"],[id*="pagetop"],' +
      '[class*="totop"],[id*="totop"]'
    ).remove();
  } catch (err) {
    console.warn(`[applyPatchesToSnapshot] footer 末尾要素削除に失敗: ${err.message}`);
  }

  // data-changed 用 CSS を head に注入（overlay-layer 方式 / 2026-05-08 更新）
  // - 元 DOM (data-changed が付いた要素) には CSS を当てない (DOM 不可侵)
  // - body 直下の <div id="__mockup-overlay-layer"> に rect 実測した overlay を絶対配置
  // - 同 data-num のグループでは最初の 1 個だけ badge を出す (重複バッジ排除)
  // - tiny / large / fixed-ancestor は overlay class で振り分け、要素自身には触れない
  // - 旧設計 (::after inset 10px / ::before 内側 14px / body pointer-events:none / pickDisplay
  //   による display 強制 / 祖先 unhide) はすべて削除。layout 破壊のリスクをゼロにした。
  // 注: overlay marker UI (overlay-layer / overlay / badge の CSS と helper script) は
  //     クライアント側 (src/utils/mockupOverlay.js / Improve.jsx) に移動。
  //     サーバ側に残るのは hero 補正など「render 品質」関連の CSS のみ。
  //     責務分離により、UI iteration が HTML 再生成不要で可能に。
  const outlineCss = [
    // ========================================================
    // iframe 表示用 hero 補正
    // 1) visibility:visible 強制 (全 hero 系)
    //    - 実サイトの CSS で hero に `visibility:hidden` が当てられているケース対策
    //    - 例: `.c-main-visual-recruit { visibility: hidden }` を JS で visible 切替
    //    - iframe srcDoc では外部 JS の CORS 制約等で切替が走らず hidden のまま残る
    //    - サイズには影響しないので全要素対象 (__inner / __text なども含む)
    // 2) hero 高さ固定 (親コンテナと __image のみに限定)
    //    - 100vh hero が iframe 内で巨大化する問題への対処
    //    - Browser Rendering 撮影時 viewport (900px) と同値に固定
    //    - selector を __ (BEM modifier) なしの親 + __image のみに絞る
    //      理由: __inner / __text は position:absolute + top:50% でキャッチコピーを配置
    //            しているため、height 強制すると配置が崩れる
    //
    // selector の方針:
    //   固有性の高い複合語 (main-visual / key-visual / mainvisual / keyvisual) のみ対象
    //   略語マッチ (hero, kv-, -kv, mv-, -mv) は誤爆リスクが高いため使わない
    // ========================================================
    // visibility/opacity 強制 (全 hero 系、サイズに影響しない)
    `[class*="main-visual"],[class*="mainvisual"],[class*="key-visual"],[class*="keyvisual"]{` +
    `visibility:visible !important;opacity:1 !important;}`,
    // 親コンテナ (BEM modifier `__` を含まない hero ルート要素) に aspect-ratio を強制
    // __inner / __text / __scroll などはキャッチコピー配置のため触らない
    //
    // 経緯:
    //   - 当初: 高さを 900px (Browser Rendering 撮影 viewport) で固定していたが、
    //     iframe 表示幅 (modal 内で ~870px 等) が 1400 より狭いケースで
    //     hero が縦長 (≒1:1) になり、内側 video/image が object-fit:cover で
    //     縦方向に異常拡大される事象が発生 (2026-05 grow-group.jp で確認)。
    //   - 修正: aspect-ratio: 14/9 (BR 撮影 viewport 1400:900 と一致) で
    //     比例スケール化。max-height 900px で従来の上限は維持。
    //     iframe 幅 870px → hero 559px、iframe 幅 1400px → hero 900px (従来同等)。
    //
    // position:relative を強制する理由:
    //   下の `__video` / `__image` を position:absolute に上書きするため、
    //   親が position:relative で containing block になる必要がある。
    //   元サイトが既に relative にしているケースが大半だが、!important で確実化。
    `[class*="main-visual"]:not([class*="__"]),` +
    `[class*="mainvisual"]:not([class*="__"]),` +
    `[class*="key-visual"]:not([class*="__"]),` +
    `[class*="keyvisual"]:not([class*="__"]){` +
    `aspect-ratio:14/9 !important;height:auto !important;` +
    `min-height:0 !important;max-height:900px !important;` +
    `position:relative !important;}`,
    // 内側 media コンテナ (`__image` / `__video` / `__bg`) を親の box に scope
    //
    // 重要: grow-group.jp の `.c-main-visual__video` は `position:fixed` で組まれており、
    //   iframe srcDoc では fixed の参照原点が親 (c-main-visual) ではなく iframe viewport になる。
    //   その結果 `height:100%` が iframe content 全体 (数千 px) を意味してしまい、動画が異常拡大される。
    //   → position:absolute に強制上書きし、親 (aspect-ratio:14/9 の box) に scope させて
    //     親の比例縮小に追従させる。
    //
    // selector 設計:
    //   2 属性セレクタ ([class*="main-visual"][class*="video"]) で BEM 修飾子間に -recruit 等の
    //   挟まり込みがあっても確実にマッチさせる (例: c-main-visual-recruit__video)。
    //   image / video / bg をカバー (大半の hero 系コンテナ命名を網羅)。
    `[class*="main-visual"][class*="image"],` +
    `[class*="main-visual"][class*="video"],` +
    `[class*="main-visual"][class*="bg"],` +
    `[class*="mainvisual"][class*="image"],` +
    `[class*="mainvisual"][class*="video"],` +
    `[class*="mainvisual"][class*="bg"],` +
    `[class*="key-visual"][class*="image"],` +
    `[class*="key-visual"][class*="video"],` +
    `[class*="key-visual"][class*="bg"],` +
    `[class*="keyvisual"][class*="image"],` +
    `[class*="keyvisual"][class*="video"],` +
    `[class*="keyvisual"][class*="bg"]{` +
    `position:absolute !important;top:0 !important;left:0 !important;` +
    `width:100% !important;height:100% !important;` +
    `min-height:0 !important;max-height:900px !important;}`,
    // html/body は 100vh が effective にならないように auto に
    // 加えて html に overflow:hidden を付け、iframe 内側の scrollbar を抑止する。
    // 親側で iframe.style.height = min(scrollHeight, body.bottom) で clamp しているため、
    // 本来の content 外に飛び出る phantom 領域があっても visual には影響しない。
    `html,body{height:auto !important;min-height:0 !important;}`,
    `html{overflow:hidden !important;}`,
    // ========================================================
    // 100vh / 100dvh 暴走対策 (2026-05 grow-group.jp で顕在化)
    // ========================================================
    // 元サイトの CSS で aspect ratio reservation 用に
    // `[__image]:before { padding-top: 100vh }` のようなパターンが使われていると、
    // iframe srcDoc では Initial Containing Block (ICB) が iframe element の高さ
    // = ページ全体の content height (4800px 等) になるため、`100vh` が巨大化して
    // bg-img プレースホルダが画面右側に巨大な縦帯として現れる事象が発生。
    //
    // 対策: __image / __figure / __hero / __thumbnail 等の "画像枠" 系
    // 疑似要素 (:before) が padding-top:100vh を使っているケースを 16:9 アスペクト
    // (max 900px) で上書きする。
    //
    // selector の安全性: `[class*="__"]` で BEM modifier 要素のみに限定。
    // 元 CSS のアスペクト比指定 (75% / 65% 等) より大きいケースは縮むだけなので破壊的でない。
    `[class*="__image"]:before,` +
    `[class*="__figure"]:before,` +
    `[class*="__hero"]:before,` +
    `[class*="__thumbnail"]:before,` +
    `[class*="__visual"]:before{` +
    `padding-top:min(56.25%,900px) !important;}`,
    // 同様に container 自体に height:100vh が当たるケースも cap (rare)
    // c-main-visual 系は既に上で aspect-ratio:14/9 で処理済みなので除外
    `[class*="__image"]:not([class*="main-visual"]),` +
    `[class*="__figure"]:not([class*="main-visual"]),` +
    `[class*="__hero"]:not([class*="main-visual"]){` +
    `max-height:900px !important;}`,
    // ========================================================
    // ScrollReveal / AOS / GSAP 等のアニメ系を iframe 内で無効化
    // - iframe sandbox=allow-scripts では外部 JS が実行されて sr クラスや data-sr-id が
    //   再追加され、worker.js での解除が無効化される
    // - CSS で要素自体を強制可視化 (アニメは見せないが、表示確実性を優先)
    // ========================================================
    `[data-sr-id],[data-sr],[data-aos],[data-aos-delay],` +
    `html.sr [data-sr-id],html.sr-init [data-sr-id],` +
    `.sr [data-sr-id],.sr-init [data-sr-id]{` +
    `visibility:visible !important;opacity:1 !important;` +
    `transform:none !important;}`,
  ].join('');
  if ($('head').length > 0) {
    $('head').append(`<style id="__mockup-hero-corrections">${outlineCss}</style>`);
  } else {
    $.root().prepend(`<style id="__mockup-hero-corrections">${outlineCss}</style>`);
  }

  // marker UI (overlay layer + badge) はクライアント側 (src/utils/mockupOverlay.js) で
  // iframe load 時に注入する。サーバ側は HTML を「クリーンな改善後 DOM (+ data-changed 属性)」
  // 状態で出力するだけ。責務分離 (Stage 1: AI patches / Stage 3: marker UI) により、
  // marker UI を変更しても HTML 再生成が不要になった。

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
