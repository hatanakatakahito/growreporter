import { logger } from 'firebase-functions/v2';
import {
  BUSINESS_MODELS,
  SITE_ROLES,
  INDUSTRY_MAJOR,
  INDUSTRY_MINOR_BY_MAJOR,
  isMinorValidForMajor,
} from '../constants/siteOptionsV2.js';

/**
 * URL からタクソノミー V2 (businessModel / industryMajor / industryMinor / siteRole) を
 * Gemini で推定する共通ヘルパー。
 *
 * - URL のメタデータ(title/description/OGP) と HTML 先頭を Gemini に渡して JSON で答えさせる
 * - Gemini の返答は必ず既定の value 候補の中から選ばせ、範囲外なら 'その他' 相当にフォールバック
 * - 呼び出し側（inferSiteTaxonomy callable / migrateTaxonomyV2 script）は戻り値の confidence を
 *   もとに needsManualReclassify を判定する
 */

/**
 * HTML をプレーンテキスト抜粋に正規化（Gemini プロンプトのトークン節約）
 */
function normalizeHtmlExcerpt(html, maxLen = 4000) {
  if (!html || typeof html !== 'string') return '';
  const withoutScript = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '');
  const textLike = withoutScript
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return textLike.slice(0, maxLen);
}

/**
 * Gemini に投げるプロンプトを構築
 */
function buildPrompt({ siteUrl, siteName, metadata, htmlExcerpt }) {
  const businessModelOptions = BUSINESS_MODELS
    .map((m) => `  - ${m.value}: ${m.label}（${m.description}）`)
    .join('\n');
  const siteRoleOptions = SITE_ROLES
    .map((r) => `  - ${r.value}: ${r.label}（${r.description}）`)
    .join('\n');
  const industryMajorOptions = INDUSTRY_MAJOR
    .map((i) => `  - ${i.value}: ${i.label}（${i.description}）`)
    .join('\n');
  const industryMinorByMajor = Object.entries(INDUSTRY_MINOR_BY_MAJOR)
    .map(([major, minors]) => `  - ${major}: ${minors.join(' / ')}`)
    .join('\n');

  return `あなたはWebマーケティング専門のアナリストです。以下のWebサイトを分析し、
BtoB/BtoC の区分、業種（大分類・小分類）、サイト役割の 4 軸を JSON で推定してください。

【サイト情報】
URL: ${siteUrl}
${siteName ? `サイト名: ${siteName}\n` : ''}タイトル: ${metadata.title || '(不明)'}
ディスクリプション: ${metadata.description || '(不明)'}
OGタイトル: ${metadata.ogTitle || '(不明)'}
OGディスクリプション: ${metadata.ogDescription || '(不明)'}

【HTML抜粋（本文テキスト先頭）】
${htmlExcerpt || '(取得できず)'}

【判定する 4 軸と候補】

◆ businessModel（必ず下記 value から1つ選択）
${businessModelOptions}

◆ siteRole（必ず下記 value から1つ選択）
${siteRoleOptions}

◆ industryMajor（必ず下記 value から1つ選択）
${industryMajorOptions}

◆ industryMinor（industryMajor に対応する小分類から1つ選択）
${industryMinorByMajor}

【判定ルール】
1. すべての軸で、上記候補の value を厳密に1つ選ぶこと（範囲外は不可）
2. industryMinor は選んだ industryMajor に属する値のみ選ぶこと
3. 判定根拠が薄い/取得情報が乏しい場合は confidence を 'low' にすること
4. 判定困難な場合は 'その他'/'other' を選び confidence を 'low' にする
5. 返答は **JSON のみ**。前後に説明文・マークダウン記号を一切付けない
6. **JSON 以外の文字を出力したら失敗**とみなす

【出力フォーマット】
{
  "businessModel": "b2b|b2c|b2b2c|other",
  "industryMajor": "<value>",
  "industryMinor": "<value>",
  "siteRole": "<value>",
  "confidence": "high|medium|low",
  "reasoning": "判定根拠を日本語で1〜2文、50文字以内"
}`;
}

/**
 * Gemini API 呼び出し（aiChat.js と同じ構造）
 */
async function callGemini(promptText) {
  const geminiApiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!geminiApiKey) {
    throw new Error('GEMINI_API_KEY が設定されていません');
  }
  const geminiModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: promptText }] }],
        generationConfig: {
          temperature: 0.2, // 推定は保守的に
          maxOutputTokens: 512,
          responseMimeType: 'application/json',
        },
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`Gemini API error: ${response.status} ${response.statusText} ${errText}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

/**
 * Gemini 応答の JSON 抽出（フェンスブロック対策）
 */
function extractJson(text) {
  if (!text) return null;
  const trimmed = text.trim();
  // ```json ... ``` で囲まれている場合に備えて除去
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const jsonStr = fenced ? fenced[1] : trimmed;
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    // 先頭 { から最後の } を抽出してリトライ
    const first = jsonStr.indexOf('{');
    const last = jsonStr.lastIndexOf('}');
    if (first >= 0 && last > first) {
      try {
        return JSON.parse(jsonStr.slice(first, last + 1));
      } catch (_) {
        return null;
      }
    }
    return null;
  }
}

/**
 * 結果をマスター定数で検証し、範囲外なら安全側にフォールバック
 */
function validateResult(raw) {
  const result = {
    businessModel: 'other',
    industryMajor: 'public_education',
    industryMinor: 'その他',
    siteRole: 'other',
    confidence: 'low',
    reasoning: '',
  };
  if (!raw || typeof raw !== 'object') return result;

  const bmValid = BUSINESS_MODELS.some((m) => m.value === raw.businessModel);
  if (bmValid) result.businessModel = raw.businessModel;

  const roleValid = SITE_ROLES.some((r) => r.value === raw.siteRole);
  if (roleValid) result.siteRole = raw.siteRole;

  const majorValid = INDUSTRY_MAJOR.some((i) => i.value === raw.industryMajor);
  if (majorValid) result.industryMajor = raw.industryMajor;

  if (majorValid && isMinorValidForMajor(raw.industryMajor, raw.industryMinor)) {
    result.industryMinor = raw.industryMinor;
  } else if (majorValid) {
    // 大分類は当たっているが小分類が不正 → その大分類の 'その他' を使う
    result.industryMinor = 'その他';
  }

  if (['high', 'medium', 'low'].includes(raw.confidence)) {
    result.confidence = raw.confidence;
  }

  if (typeof raw.reasoning === 'string') {
    result.reasoning = raw.reasoning.slice(0, 200);
  }

  // すべての軸が正常に当たらなかったら confidence を下げる
  if (!bmValid || !roleValid || !majorValid) {
    result.confidence = 'low';
  }

  return result;
}

/**
 * URL と抜粋情報から V2 タクソノミーを推定する公開 API
 *
 * @param {Object} args
 * @param {string} args.siteUrl - サイトURL（必須）
 * @param {string} [args.siteName] - サイト名（任意・プロンプト補助）
 * @param {Object} [args.metadata] - { title, description, ogTitle, ogDescription }
 * @param {string} [args.html] - 取得済み HTML（正規化済みでも raw でも可）
 * @returns {Promise<{ businessModel, industryMajor, industryMinor, siteRole, confidence, reasoning }>}
 */
export async function inferTaxonomyFromUrl({ siteUrl, siteName = '', metadata = {}, html = '' }) {
  if (!siteUrl) {
    throw new Error('siteUrl is required');
  }

  const htmlExcerpt = normalizeHtmlExcerpt(html);
  const prompt = buildPrompt({ siteUrl, siteName, metadata, htmlExcerpt });

  const rawText = await callGemini(prompt);
  logger.info('[taxonomyInference] Gemini raw response length', { len: rawText.length });

  const parsed = extractJson(rawText);
  const result = validateResult(parsed);

  logger.info('[taxonomyInference] Inference result', {
    siteUrl,
    result,
  });

  return result;
}
