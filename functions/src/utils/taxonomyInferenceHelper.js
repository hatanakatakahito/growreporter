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
  // 業種判定は 100ページの情報を扱うため精度重視で gemini-2.5-flash を使う。
  // 軽量パターン(単一URL)でも同じモデルを使う(差は僅少、一貫性優先)。
  const geminiModel =
    process.env.GEMINI_TAXONOMY_MODEL || process.env.GEMINI_MODEL || 'gemini-2.5-flash';

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

  logger.info('[taxonomyInference] Inference result (URL)', {
    siteUrl,
    result,
  });

  return result;
}

// ============================================================================
// 100ページスクレイピングデータ版の業種推定（メイン動線）
// ============================================================================

/**
 * pageScrapingData から会社情報・事業内容・サービス紹介系ページを優先的にピックアップする。
 *
 * 優先順位:
 * 1. pageType === 'top'（トップページ）
 * 2. pageType === 'about'（会社概要）
 * 3. pageType === 'service'（サービス紹介）
 * 4. pageType === 'product'（製品紹介）
 * 5. pagePath に /about|company|corporate|profile|business|service|products|solution 等が含まれる
 * 6. metaTitle に「会社概要」「事業内容」「サービス」「企業理念」「ミッション」「about」等が含まれる
 * 7. それでも足りなければ pageViews 降順で補完
 *
 * @returns {Array} 選定されたページ(最大 limit 件)
 */
function pickRepresentativePages(pages, limit = 8) {
  if (!Array.isArray(pages) || pages.length === 0) return [];

  const aboutTypePath = /\/(about|company|corporate|profile|outline|philosophy|mission|vision|ir)(\b|\/|\.|$)/i;
  const aboutTitle = /会社概要|企業情報|私たち|私達|企業理念|ミッション|ビジョン|代表[の者]?|代表者?メッセージ|about\b|company\b|profile\b/i;
  const serviceTypePath = /\/(service|services|business|product|products|solution|solutions|shop|works|portfolio|case-?stud)/i;
  const serviceTitle = /事業内容|サービス[紹一]|製品|商品|ソリューション|導入事例|お客様の声|works?\b|services?\b|products?\b/i;

  const scored = pages.map((p) => {
    const path = (p.pagePath || '').toLowerCase();
    const title = (p.metaTitle || '');
    const pageType = (p.pageType || '').toLowerCase();
    let score = 0;

    // pageType ベースの高スコア
    if (pageType === 'top') score += 100;
    else if (pageType === 'about') score += 90;
    else if (pageType === 'service') score += 80;
    else if (pageType === 'product') score += 75;

    // パス・タイトルマッチで加点
    if (aboutTypePath.test(path)) score += 60;
    if (aboutTitle.test(title)) score += 55;
    if (serviceTypePath.test(path)) score += 40;
    if (serviceTitle.test(title)) score += 35;

    // トップページのパス (/ や /index)
    if (path === '/' || path === '' || /^\/(index\.html?|home)$/i.test(path)) {
      score += 95;
    }

    // 情報量(本文 500字以上)でごく軽く加点
    const textLen = Number(p.textLength) || (p.mainText ? p.mainText.length : 0);
    if (textLen >= 500) score += 5;

    // PV は tie-break 用の最小加点
    const pv = Number(p.pageViews) || 0;
    score += Math.min(pv, 1000) / 1000;

    return { page: p, score };
  });

  scored.sort((a, b) => b.score - a.score);

  // 重複 pagePath は除外
  const seen = new Set();
  const picked = [];
  for (const { page } of scored) {
    const key = (page.pagePath || page.pageUrl || '').toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    picked.push(page);
    if (picked.length >= limit) break;
  }
  return picked;
}

/**
 * 100ページスクレイピングデータから Gemini 用プロンプトを構築
 */
function buildPromptFromScraping({
  siteUrl,
  siteName,
  topMetadata,
  allPages,
  representativePages,
  conversionEvents,
}) {
  const businessModelOptions = BUSINESS_MODELS.map((m) => `  - ${m.value}: ${m.label}（${m.description}）`).join('\n');
  const siteRoleOptions = SITE_ROLES.map((r) => `  - ${r.value}: ${r.label}（${r.description}）`).join('\n');
  const industryMajorOptions = INDUSTRY_MAJOR.map((i) => `  - ${i.value}: ${i.label}（${i.description}）`).join('\n');
  const industryMinorByMajor = Object.entries(INDUSTRY_MINOR_BY_MAJOR)
    .map(([major, minors]) => `  - ${major}: ${minors.join(' / ')}`)
    .join('\n');

  // 全ページ構造情報（トークン節約のため compact フォーマット）
  const pageListText = allPages
    .slice(0, 100)
    .map((p, i) => {
      const path = p.pagePath || '';
      const title = (p.metaTitle || '').slice(0, 80);
      const desc = (p.metaDescription || '').slice(0, 80);
      const type = p.pageType || '';
      return `${i + 1}. [${type}] ${path} | "${title}" | ${desc}`;
    })
    .join('\n');

  // 代表ページ本文抜粋
  const representativeText = representativePages
    .map((p, i) => {
      const body = (p.mainText || '').slice(0, 1000).replace(/\s+/g, ' ').trim();
      return `--- 代表ページ ${i + 1}: ${p.pagePath || ''} [${p.pageType || ''}] ---
タイトル: ${p.metaTitle || ''}
ディスクリプション: ${p.metaDescription || ''}
本文抜粋(1000字): ${body || '(本文なし)'}`;
    })
    .join('\n\n');

  const cvText =
    Array.isArray(conversionEvents) && conversionEvents.length > 0
      ? conversionEvents
          .map((e) => (typeof e === 'string' ? e : e.displayName || e.eventName || ''))
          .filter(Boolean)
          .join(' / ')
      : '(未設定)';

  return `あなたはWebマーケティング専門のアナリストです。以下のWebサイトについて、100ページ分のスクレイピング結果を踏まえてBtoB/BtoC・業種（大分類・小分類）・サイト役割の4軸を判定し、JSONで返してください。

【サイト情報】
URL: ${siteUrl}
${siteName ? `サイト名: ${siteName}\n` : ''}トップページ タイトル: ${topMetadata?.title || '(不明)'}
トップページ ディスクリプション: ${topMetadata?.description || '(不明)'}

【コンバージョンイベント名（ユーザー設定値）】
${cvText}

【全ページ一覧（最大100件。pagePath / タイトル / ディスクリプション）】
${pageListText || '(取得なし)'}

【代表ページの本文抜粋（会社概要・事業内容・サービス紹介・トップを優先選定）】
${representativeText || '(取得なし)'}

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
3. 全ページ一覧のパターン（例: /rent/ が並ぶ→不動産賃貸、/works/ が並ぶ→制作会社）を重視する
4. 代表ページ本文に「会社概要」「事業内容」が含まれていれば、そこの記述を最優先で根拠にする
5. コンバージョンイベント名も業種判定の強いシグナルにする
6. 取得情報から判断根拠が薄い場合は confidence を 'low' にすること
7. 返答は **JSON のみ**。前後に説明文・マークダウン記号を一切付けない
8. **JSON 以外の文字を出力したら失敗**とみなす

【industryMinor 選定の強化ルール】
A. 「その他」は**原則選ばない**こと。industryMajor を決めたなら、その配下の具体小分類から
   「一番近い/一番ましなもの」を必ず1つ選ぶ。完璧一致でなくても OK。
B. 「その他」を選びたくなったら、**その大分類の全小分類候補について、1つずつ**
   「なぜこのサイトに適合しないか」を頭の中で検証すること。
   全ての候補で明確な不適合理由が挙げられない限り、**最も近い具体小分類を選ぶ**。
C. 複数候補が当てはまりそうに見える場合は、**このサイト自身の機能・提供サービス・CV行動**を基準にする
   （親会社の業種ではなく）。
D. **「その他」を選んだ場合は confidence を必ず 'low' にする**（'high'/'medium' は禁止）。
   これは「人手確認が必須」を示す重要シグナル。

【判定の具体例（学習用）】
例1: 出版社が運営する法人向け広告ソリューションサイト
  - サイト内容: 「法人向け広告メニュー」「タイアップ」「資料請求」「導入事例」
  - CV: 資料ダウンロード、問い合わせ
  - **正解**: businessModel=b2b, industryMajor=media_advertising, industryMinor=広告代理店・マーケティング, siteRole=service_product
  - 理由: 親会社は出版だが、サイト自体は「法人向け広告サービス提供」が主力。出版物自体を販売しているわけではない

例2: SaaS 企業のコーポレート+サービス紹介統合サイト
  - サイト内容: 「導入事例」「料金プラン」「無料トライアル」「機能紹介」
  - CV: 無料トライアル申込、問い合わせ
  - **正解**: businessModel=b2b, industryMajor=it_communication, industryMinor=SaaS・クラウドサービス, siteRole=service_product

例3: ファーストフードチェーンの店舗紹介サイト
  - サイト内容: 「店舗検索」「メニュー」「キャンペーン」
  - CV: クーポン取得、店舗予約
  - **正解**: businessModel=b2c, industryMajor=food_beverage, industryMinor=ファストフード・ファミレス, siteRole=corporate

【出力フォーマット】
{
  "businessModel": "b2b|b2c|b2b2c|other",
  "industryMajor": "<value>",
  "industryMinor": "<value>",
  "siteRole": "<value>",
  "confidence": "high|medium|low",
  "reasoning": "判定根拠を日本語で1〜2文、80文字以内"
}`;
}

/**
 * 100ページスクレイピングデータから V2 タクソノミーを推定する公開 API。
 * onScrapingJobCreated のスクレイピング完了処理の最後に呼び出される想定。
 *
 * @param {Object} args
 * @param {string} args.siteUrl - サイトURL（必須）
 * @param {string} [args.siteName] - サイト名
 * @param {Object} [args.topMetadata] - { title, description, ogTitle, ogDescription }
 * @param {Array} args.pages - pageScrapingData ドキュメントの配列
 * @param {Array} [args.conversionEvents] - CV設定（名前配列 or {displayName}配列）
 * @returns {Promise<{ businessModel, industryMajor, industryMinor, siteRole, confidence, reasoning }>}
 */
export async function inferTaxonomyFromPageScrapingData({
  siteUrl,
  siteName = '',
  topMetadata = {},
  pages = [],
  conversionEvents = [],
}) {
  if (!siteUrl) {
    throw new Error('siteUrl is required');
  }
  if (!Array.isArray(pages) || pages.length === 0) {
    throw new Error('pageScrapingData が空です。スクレイピング未完了のサイトで呼ばれた可能性があります。');
  }

  const representativePages = pickRepresentativePages(pages, 8);

  const prompt = buildPromptFromScraping({
    siteUrl,
    siteName,
    topMetadata,
    allPages: pages,
    representativePages,
    conversionEvents,
  });

  const rawText = await callGemini(prompt);
  logger.info('[taxonomyInference] Gemini raw response length (scraping)', {
    len: rawText.length,
    totalPages: pages.length,
    representativeCount: representativePages.length,
  });

  const parsed = extractJson(rawText);
  const result = validateResult(parsed);

  logger.info('[taxonomyInference] Inference result', {
    siteUrl,
    result,
  });

  return result;
}
