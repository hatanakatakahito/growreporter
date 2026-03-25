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

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const GEMINI_MODEL = 'gemini-2.5-flash';
const MAX_OUTPUT_TOKENS = 8192;

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

    // Gemini API呼び出し
    const response = await fetch(
      `${GEMINI_API_BASE}/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemInstruction }] },
          contents: [{ parts }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: MAX_OUTPUT_TOKENS,
            thinkingConfig: { thinkingBudget: 2048 },
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[generateImprovementMockup] Gemini API error: ${response.status}`, errorText);
      throw new HttpsError('internal', `Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // HTML/CSS抽出
    const { html, css } = extractHtmlCss(rawText);

    if (!html) {
      console.warn(`[generateImprovementMockup] No HTML generated for ${improvementId}. rawText length=${rawText.length}, first 500 chars: ${rawText.substring(0, 500)}`);
      return { success: false, message: 'モックアップHTMLの生成に失敗しました' };
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
