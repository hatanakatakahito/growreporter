/**
 * 改善モックアップ生成 Callable Function（Claude Sonnet）
 *
 * 深掘りスクレイピングで取得した実際のサイトソース（HTML/CSS/デザイントークン）と
 * 改善案テキストをもとに、改善適用後のHTML/CSSを生成する。
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

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_MODEL = 'claude-haiku-4-5-20251001';
const MAX_OUTPUT_TOKENS = 4096;

export async function generateImprovementMockupCallable(req) {
  // 認証チェック
  if (!req.auth) {
    throw new HttpsError('unauthenticated', 'ユーザー認証が必要です');
  }

  const { siteId, improvementId } = req.data;

  if (!siteId || !improvementId) {
    throw new HttpsError('invalid-argument', 'siteId と improvementId が必要です');
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new HttpsError('failed-precondition', 'ANTHROPIC_API_KEY が設定されていません');
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
    let deepScrapeData = improvement.deepScrapeData;

    // deepScrapeDataがない場合、サイト共通デザインデータをフォールバック
    if (!deepScrapeData) {
      console.log(`[generateImprovementMockup] No deepScrapeData, trying site design fallback`);
      try {
        const siteDesignDoc = await db.doc(`sites/${siteId}/siteStructureData/_siteDesign`).get();
        if (siteDesignDoc.exists) {
          deepScrapeData = siteDesignDoc.data();
          console.log(`[generateImprovementMockup] Using site design fallback for ${improvementId}`);
        }
      } catch (e) {
        console.warn(`[generateImprovementMockup] Site design fallback failed: ${e.message}`);
      }
    }

    if (!deepScrapeData) {
      console.warn(`[generateImprovementMockup] No design data available for ${improvementId}`);
      return { success: false, message: 'デザインデータがありません' };
    }

    // 新規ページ/コンテンツかどうかを判定
    const isNewPage = !improvement.targetPageUrl || !improvement.deepScrapeData;

    // プロンプト構築
    const prompt = buildMockupPrompt(improvement, deepScrapeData, isNewPage);

    // Claude Sonnet API呼び出し
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: MAX_OUTPUT_TOKENS,
        messages: [{
          role: 'user',
          content: prompt,
        }],
        system: 'あなたはWebデザイン・フロントエンド開発の専門家です。指示された改善を適用した完全なHTML/CSSを生成してください。',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[generateImprovementMockup] Claude API error: ${response.status}`, errorText);
      throw new HttpsError('internal', `Claude API error: ${response.status}`);
    }

    const data = await response.json();
    const rawText = data.content?.[0]?.text || '';

    // HTML/CSS抽出
    const { html, css } = extractHtmlCss(rawText);

    if (!html) {
      console.warn(`[generateImprovementMockup] No HTML generated for ${improvementId}`);
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
2. サイトの既存デザイン（フォント、カラー、余白）を忠実に再現すること
3. **<style>タグ内CSS**を使用し、外部ファイル参照は禁止
4. PC幅1280pxで適切に表示
5. 日本語テキストを使用すること
6. 画像はプレースホルダー（灰色の矩形 + altテキスト表示）で代替
7. コードのみ出力し、説明文は不要

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

  // ```html ... ``` ブロックを抽出
  const htmlMatch = rawText.match(/```html\s*\n([\s\S]*?)\n```/);
  if (htmlMatch) {
    html = htmlMatch[1].trim();
  }

  // ```css ... ``` ブロックを抽出
  const cssMatch = rawText.match(/```css\s*\n([\s\S]*?)\n```/);
  if (cssMatch) {
    css = cssMatch[1].trim();
  }

  // HTMLブロックがない場合、全体をHTMLとして扱う
  if (!html && rawText.includes('<')) {
    // <html> or <div> で始まる部分を抽出
    const tagMatch = rawText.match(/(<(?:!DOCTYPE|html|head|body|div|section|header|main)[\s\S]*)/i);
    if (tagMatch) {
      html = tagMatch[1].trim();
    }
  }

  return { html, css };
}
