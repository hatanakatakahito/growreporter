/**
 * 手動改善案 AI 補完 Callable Function
 *
 * ユーザーが「対象 + 改善方向」を入力するだけで、Gemini が AI 補完して
 * 完全な改善案 JSON を返す。Firestore 保存はクライアント側で実行。
 *
 * 入力:
 *   siteId: string
 *   targetType: 'existing_single' | 'existing_template' | 'new_page'
 *   targetPageUrl?: string  (existing_* のみ)
 *   userIntent: string  (必須、フリーテキスト改善方向)
 *   targetSection?: string  ('header'|'first_view'|'body'|'cta'|'form'|'faq'|'footer'|'other')
 *   targetSectionDetail?: string  (section==='other' 時のテキスト)
 *   referenceUrls?: string[]  (参考他社 URL、最大 3 件)
 *   referenceImageUrls?: string[]  (Storage URL、参考画像、最大 3 枚)
 *
 * 出力:
 *   title, description, category, priority, expectedImpact, estimatedLaborHours, targetArea
 *   similarityWarning?: { id, title, score }[] - 類似改善があれば
 */

import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { canEditSite } from '../utils/permissionHelper.js';
import { captureAndStoreBeforeScreenshot } from '../utils/captureAndStoreBeforeScreenshot.js';
import { captureRenderAndScreenshot, readRenderedHtml } from '../utils/captureRenderAndScreenshot.js';
import { getManualImprovementExpansionPrompt } from '../prompts/templates.js';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const GEMINI_MODEL = 'gemini-2.5-flash';
const MAX_RETRIES = 2;
const JACCARD_THRESHOLD = 0.5;
const MAX_SNAPSHOT_HTML_BYTES = 250_000;
const MAX_REFERENCE_URLS = 3;
const MAX_REFERENCE_IMAGES = 3;

// 改善ロジック統一化プラン (Phase 3-b):
//   - 対象 URL: render+shot で PC + Mobile を取得、両方を AI multimodal に渡す
//   - 参考 URL: 同上、最大 3 件 × 2 viewport = 6 撮影
//   - PSI fallback / USE_BROWSER_RENDERING フラグは廃止 (BR 一本)
//   - 失敗時は HttpsError で client へ伝播 (フロントは「BR 一時障害」表示)

// ==================== Jaccard 類似度（重複検知） ====================

function normalizeTitle(s) {
  return (s || '').trim().replace(/\s+/g, ' ');
}

function bigramSet(str) {
  const n = normalizeTitle(str);
  const set = new Set();
  for (let i = 0; i < n.length - 1; i++) {
    set.add(n.slice(i, i + 2));
  }
  return set;
}

function jaccardSimilarity(a, b) {
  const sa = bigramSet(a);
  const sb = bigramSet(b);
  if (sa.size === 0 && sb.size === 0) return 1;
  let intersection = 0;
  for (const x of sa) {
    if (sb.has(x)) intersection++;
  }
  const union = sa.size + sb.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

// ==================== JSON 抽出 ====================

function parseExpansionJson(rawText) {
  if (!rawText) return null;
  // ```json ... ``` のフェンスを剥がす
  const fenceMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = fenceMatch ? fenceMatch[1] : rawText;
  try {
    const parsed = JSON.parse(jsonStr.trim());
    if (parsed && typeof parsed === 'object' && parsed.title && parsed.description) {
      return parsed;
    }
    return null;
  } catch (_) {
    return null;
  }
}

// ==================== 参考 URL の取得 (render+shot で HTML + PC/Mobile 撮影) ====================

/**
 * HTML から title / description を抽出 (参考 URL のテキスト要約用)。
 */
function extractTitleAndSummary(html) {
  if (!html) return { title: '', summary: '' };
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
  const ogDescMatch = html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i);
  return {
    title: titleMatch?.[1]?.trim() || '',
    summary: (descMatch?.[1] || ogDescMatch?.[1] || '').trim().substring(0, 200),
  };
}

/**
 * 参考 URL を render+shot で取得し、HTML 要約 + PC/Mobile screenshot URL を返す。
 *
 * Storage は siteId-scoped (page-renderings/{siteId}/{hash}.html, .jpg)。
 * 24h cache。失敗時は null を返す (取れた分だけプロンプトに使う)。
 */
async function fetchReferenceUrlData(siteId, url) {
  if (!url || !/^https?:\/\//i.test(url)) return null;
  const captured = await captureRenderAndScreenshot(siteId, url, { viewports: ['pc', 'mobile'] });
  if (captured.error) {
    logger.warn(`[expandManualImprovement] reference capture failed (${captured.error}): ${url}`);
    return null;
  }
  let html = '';
  try {
    if (captured.pc?.htmlStoragePath) {
      html = (await readRenderedHtml(captured.pc.htmlStoragePath)) || '';
    }
  } catch (e) {
    logger.warn(`[expandManualImprovement] reference html read failed: ${url}: ${e.message}`);
  }
  const meta = extractTitleAndSummary(html);
  return {
    url,
    title: meta.title,
    summary: meta.summary,
    pcScreenshotUrl: captured.pc?.screenshotUrl || null,
    mobileScreenshotUrl: captured.mobile?.screenshotUrl || null,
  };
}

// ==================== 対象ページのデータ取得 ====================

/**
 * 対象 URL の PC レンダリング HTML (snapshot_patch / プロンプト構造解析用) と
 * pageScrapingData を取得する。
 *
 * 改善ロジック統一化プラン (Phase 3-b):
 *   captureAndStoreBeforeScreenshot 経由で render+shot 取得 (PC + Mobile を同時保存)。
 *   ここでは PC HTML だけを返す (Mobile HTML は当面 expand では使わない)。
 *   PC/Mobile screenshot URL は別途 getOrCaptureBeforeScreenshots で取得。
 */
async function fetchTargetPageData(db, siteId, targetType, targetPageUrl) {
  if (targetType === 'new_page' || !targetPageUrl) {
    return { snapshotHtml: null, scrapingData: null };
  }

  let snapshotHtml = null;
  let scrapingData = null;

  // 1) PC HTML を取得 (render+shot キャッシュから or 新規撮影)
  try {
    const captured = await captureRenderAndScreenshot(siteId, targetPageUrl, { viewports: ['pc'] });
    if (captured.error) {
      logger.warn(`[expandManualImprovement] PC HTML capture failed (${captured.error}): ${targetPageUrl}`);
    } else if (captured.pc?.htmlStoragePath) {
      const html = await readRenderedHtml(captured.pc.htmlStoragePath);
      if (html) {
        snapshotHtml = html.length > MAX_SNAPSHOT_HTML_BYTES
          ? html.substring(0, MAX_SNAPSHOT_HTML_BYTES)
          : html;
        logger.info(`[expandManualImprovement] PC HTML 取得 (${snapshotHtml.length} bytes, fromCache=${captured.alreadyExists.pc})`);
      }
    }
  } catch (e) {
    logger.warn(`[expandManualImprovement] PC HTML fetch failed: ${e.message}`);
  }

  // 2) pageScrapingData 取得（あれば）
  try {
    const url = new URL(targetPageUrl, 'https://dummy');
    const pagePath = url.pathname;
    const querySnap = await db
      .collection(`sites/${siteId}/pageScrapingData`)
      .where('pageUrl', '==', targetPageUrl)
      .limit(1)
      .get();
    if (!querySnap.empty) {
      scrapingData = querySnap.docs[0].data();
    } else {
      // pagePath でもう一度試す
      const querySnap2 = await db
        .collection(`sites/${siteId}/pageScrapingData`)
        .where('pageUrl', '==', pagePath)
        .limit(1)
        .get();
      if (!querySnap2.empty) {
        scrapingData = querySnap2.docs[0].data();
      }
    }
  } catch (e) {
    logger.warn(`[expandManualImprovement] scrapingData fetch failed: ${e.message}`);
  }

  return { snapshotHtml, scrapingData };
}

// ==================== Before スクショの取得 (PC + Mobile) ====================

async function fetchUrlAsBase64(url) {
  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 15000);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    return `data:image/jpeg;base64,${Buffer.from(buf).toString('base64')}`;
  } catch (e) {
    logger.warn(`[expandManualImprovement] image fetch failed: ${url}: ${e.message}`);
    return null;
  }
}

/**
 * 対象ページの Before スクショ (PC + Mobile) を取得して base64 化する。
 *
 * captureAndStoreBeforeScreenshot 経由で render+shot キャッシュ優先 → 必要なら新規撮影。
 * Firestore pageScreenshots に PC / Mobile の 2 ドキュメントが既存なら再利用、
 * 無ければ Worker 1 アクセス × 2 viewport で同時取得。
 *
 * 失敗時は { pc: null, mobile: null } を返す (取れた分だけ AI に渡す)。
 *
 * @returns {Promise<{ pc: string|null, mobile: string|null }>}
 */
async function getOrCaptureBeforeScreenshots(siteId, targetPageUrl) {
  const empty = { pc: null, mobile: null };
  if (!siteId || !targetPageUrl || !/^https?:\/\//i.test(targetPageUrl)) return empty;

  const r = await captureAndStoreBeforeScreenshot({ siteId, targetPageUrl });
  if (!r?.success) {
    logger.warn(`[expandManualImprovement] Before スクショ取得失敗: ${targetPageUrl} (reason=${r?.reason})`);
    return empty;
  }

  logger.info(
    `[expandManualImprovement] Before スクショ${r.alreadyExists ? ' キャッシュヒット' : ' 新規撮影'} (pc+mobile): ${targetPageUrl}`
  );

  const [pcB64, mobileB64] = await Promise.all([
    r.pc?.screenshotUrl ? fetchUrlAsBase64(r.pc.screenshotUrl) : Promise.resolve(null),
    r.mobile?.screenshotUrl ? fetchUrlAsBase64(r.mobile.screenshotUrl) : Promise.resolve(null),
  ]);

  return { pc: pcB64, mobile: mobileB64 };
}

// ==================== サイトコンテキスト取得 ====================

async function fetchSiteContext(db, siteId) {
  try {
    const siteDoc = await db.doc(`sites/${siteId}`).get();
    if (!siteDoc.exists) return {};
    const d = siteDoc.data();
    return {
      industry: d.industry || d.industryText || '',
      siteRole: d.siteRole || d.siteRoleText || '',
      sitePurpose: d.sitePurpose || '',
      industryText: d.industryText || '',
      siteRoleText: d.siteRoleText || '',
      siteTypeText: d.siteTypeText || '',
    };
  } catch (e) {
    logger.warn(`[expandManualImprovement] site context fetch failed: ${e.message}`);
    return {};
  }
}

// ==================== Gemini 呼び出し ====================

/**
 * data:image/...;base64,XXX 形式の文字列を { mimeType, data } に分解する。
 */
function splitDataUri(dataUri) {
  if (!dataUri) return null;
  const m = dataUri.match(/^data:(image\/[a-z]+);base64,([\s\S]+)$/i);
  if (!m) return null;
  return { mimeType: m[1], data: m[2] };
}

/**
 * 公開 URL から画像を fetch して base64 に変換 (mimeType も headers から取得)。
 */
async function fetchUrlAsBase64Inline(url) {
  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 15000);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const mt = (res.headers.get('content-type') || 'image/jpeg').split(';')[0].trim();
    return { mimeType: mt, data: Buffer.from(buf).toString('base64') };
  } catch (e) {
    logger.warn(`[expandManualImprovement] image fetch failed: ${url}: ${e.message}`);
    return null;
  }
}

async function callGeminiForExpansion({
  apiKey,
  prompt,
  targetPcBase64 = null,
  targetMobileBase64 = null,
  referenceData = [],
  referenceImageUrls = [],
}) {
  const systemInstruction =
    'あなたは Web サイト改善のエキスパートです。ユーザーの口語入力を受け取り、制作会社への修正依頼に使える具体的な改善案 JSON を返してください。Before スクリーンショット (PC + Mobile) が提供された場合、対象ページの実際の見た目（レイアウト・色・写真・既存の CTA 配置・モバイル時の崩れなど）を踏まえて、現実的で違和感のない改善案を出してください。参考 URL の screenshot が提供された場合は、ベンチマーク先のデザイン意図を読み取って提案に活かしてください。返答は必ず JSON のみで、説明文やマークダウンは不要です。';

  // multimodal parts:
  //   1) 対象 PC Before
  //   2) 対象 Mobile Before
  //   3) 参考 URL × {PC, Mobile} (最大 3 件)
  //   4) ユーザーアップロード参考画像 (最大 3 件)
  //   5) プロンプト
  const parts = [];
  const targetPcSplit = splitDataUri(targetPcBase64);
  if (targetPcSplit) {
    parts.push({ inlineData: targetPcSplit });
    parts.push({ text: '↑ 対象ページの現在の PC レイアウト (Before)' });
  }
  const targetMobileSplit = splitDataUri(targetMobileBase64);
  if (targetMobileSplit) {
    parts.push({ inlineData: targetMobileSplit });
    parts.push({ text: '↑ 対象ページの現在の Mobile レイアウト (Before)' });
  }

  // 参考 URL の screenshot
  for (const ref of referenceData) {
    if (ref?.pcScreenshotUrl) {
      const inline = await fetchUrlAsBase64Inline(ref.pcScreenshotUrl);
      if (inline) {
        parts.push({ inlineData: inline });
        parts.push({ text: `↑ 参考 URL [${ref.url}] の PC レイアウト` });
      }
    }
    if (ref?.mobileScreenshotUrl) {
      const inline = await fetchUrlAsBase64Inline(ref.mobileScreenshotUrl);
      if (inline) {
        parts.push({ inlineData: inline });
        parts.push({ text: `↑ 参考 URL [${ref.url}] の Mobile レイアウト` });
      }
    }
  }

  // ユーザーアップロード参考画像
  for (const imgUrl of referenceImageUrls.slice(0, MAX_REFERENCE_IMAGES)) {
    const inline = await fetchUrlAsBase64Inline(imgUrl);
    if (inline) {
      parts.push({ inlineData: inline });
      parts.push({ text: '↑ ユーザー添付の参考画像' });
    }
  }

  parts.push({ text: prompt });

  const body = {
    system_instruction: { parts: [{ text: systemInstruction }] },
    contents: [{ parts }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 4096,
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
        logger.warn(`[callGeminiForExpansion] HTTP ${res.status} (retriable=${retriable}): ${errText.substring(0, 200)}`);
        if (!retriable || attempt >= MAX_RETRIES) return null;
        await new Promise(r => setTimeout(r, (attempt + 1) * 1000));
        continue;
      }
      const data = await res.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const finishReason = data.candidates?.[0]?.finishReason;
      if (!rawText) {
        logger.warn(`[callGeminiForExpansion] empty response (finishReason=${finishReason})`);
        if (finishReason === 'SAFETY' || finishReason === 'RECITATION') return null;
        if (attempt >= MAX_RETRIES) return null;
        await new Promise(r => setTimeout(r, (attempt + 1) * 1000));
        continue;
      }
      const parsed = parseExpansionJson(rawText);
      if (!parsed) {
        logger.warn(`[callGeminiForExpansion] JSON parse failed, rawText head: ${rawText.substring(0, 300)}`);
        if (attempt >= MAX_RETRIES) return null;
        await new Promise(r => setTimeout(r, (attempt + 1) * 1000));
        continue;
      }
      return parsed;
    } catch (err) {
      logger.warn(`[callGeminiForExpansion] exception (attempt=${attempt}): ${err.message}`);
      if (attempt >= MAX_RETRIES) return null;
      await new Promise(r => setTimeout(r, (attempt + 1) * 1000));
    }
  }
  return null;
}

// ==================== 既存改善との類似度チェック ====================

async function checkSimilarity(db, siteId, newTitle) {
  try {
    const snap = await db
      .collection(`sites/${siteId}/improvements`)
      .where('status', '!=', 'archived')
      .get();
    const warnings = [];
    snap.forEach(doc => {
      const d = doc.data();
      const score = jaccardSimilarity(newTitle, d.title || '');
      if (score >= JACCARD_THRESHOLD) {
        warnings.push({ id: doc.id, title: d.title, score: Math.round(score * 100) / 100 });
      }
    });
    warnings.sort((a, b) => b.score - a.score);
    return warnings.slice(0, 3);
  } catch (e) {
    logger.warn(`[checkSimilarity] failed: ${e.message}`);
    return [];
  }
}

// ==================== メイン Callable ====================

export async function expandManualImprovementCallable(req) {
  // 認証チェック
  if (!req.auth) {
    throw new HttpsError('unauthenticated', 'ユーザー認証が必要です');
  }

  const {
    siteId,
    targetType,
    targetPageUrl,
    userIntent,
    targetSection,
    targetSectionDetail,
    referenceUrls,
    referenceImageUrls,
  } = req.data || {};

  // バリデーション
  if (!siteId || typeof siteId !== 'string') {
    throw new HttpsError('invalid-argument', 'siteId が必要です');
  }
  if (!['existing_single', 'existing_template', 'new_page'].includes(targetType)) {
    throw new HttpsError('invalid-argument', 'targetType は existing_single | existing_template | new_page のいずれか');
  }
  if (targetType !== 'new_page' && !targetPageUrl) {
    throw new HttpsError('invalid-argument', 'existing_* タイプでは targetPageUrl が必要です');
  }
  if (!userIntent || typeof userIntent !== 'string' || userIntent.trim().length < 3) {
    throw new HttpsError('invalid-argument', '改善方向（userIntent）は 3 文字以上必要です');
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new HttpsError('failed-precondition', 'GEMINI_API_KEY が設定されていません');
  }

  // 権限チェック
  const allowed = await canEditSite(req.auth.uid, siteId);
  if (!allowed) {
    throw new HttpsError('permission-denied', 'このサイトを編集する権限がありません');
  }

  const db = getFirestore();
  const startedAt = Date.now();

  // 0) Before スクショ (PC + Mobile) を取得 + 対象 HTML / scrapingData / 参考 URL を並列取得
  //    Worker の同時 3 ブラウザ制約を考慮し、対象と参考 URL は直列で順次撮影
  //    (内部で render+shot は viewport も直列、24h cache あり)
  let targetPcBase64 = null;
  let targetMobileBase64 = null;
  if (targetType !== 'new_page' && targetPageUrl && /^https?:\/\//i.test(targetPageUrl)) {
    try {
      const shots = await getOrCaptureBeforeScreenshots(siteId, targetPageUrl);
      targetPcBase64 = shots.pc;
      targetMobileBase64 = shots.mobile;
    } catch (e) {
      logger.warn(`[expandManualImprovement] Before スクショ取得 例外: ${e?.message}`);
    }
  }

  // 1) 対象ページの PC HTML + scrapingData (上の Before 撮影で 24h cache に乗っているはず)
  const pageData = await fetchTargetPageData(db, siteId, targetType, targetPageUrl);

  // 2) 参考 URL を render+shot で取得 (HTML 要約 + PC/Mobile screenshot URL)
  const refUrls = (Array.isArray(referenceUrls) ? referenceUrls : [])
    .filter(u => typeof u === 'string' && u.trim())
    .slice(0, MAX_REFERENCE_URLS);
  const referenceData = [];
  for (const url of refUrls) {
    const data = await fetchReferenceUrlData(siteId, url);
    if (data) referenceData.push(data);
  }

  // 3) サイトコンテキスト
  const siteContext = await fetchSiteContext(db, siteId);

  // 4) プロンプト生成 (referenceData は { url, title, summary, pcScreenshotUrl, mobileScreenshotUrl } 形式)
  const prompt = getManualImprovementExpansionPrompt(
    {
      targetType,
      targetPageUrl,
      userIntent,
      targetSection,
      targetSectionDetail,
      referenceUrls: refUrls,
    },
    pageData,
    siteContext,
    referenceData
  );

  // 5) Gemini 呼び出し (PC/Mobile Before + 参考 URL × {PC,Mobile} + ユーザー画像 を multimodal で渡す)
  const refImgs = (Array.isArray(referenceImageUrls) ? referenceImageUrls : [])
    .filter(u => typeof u === 'string' && u.trim())
    .slice(0, MAX_REFERENCE_IMAGES);
  const expansion = await callGeminiForExpansion({
    apiKey,
    prompt,
    targetPcBase64,
    targetMobileBase64,
    referenceData,
    referenceImageUrls: refImgs,
  });

  if (!expansion) {
    logger.error(`[expandManualImprovement] Gemini failed for site=${siteId}`);
    throw new HttpsError('internal', 'AI 補完に失敗しました。手動入力に切り替えてください。');
  }

  // 6) 類似改善との重複検知
  const similarityWarning = await checkSimilarity(db, siteId, expansion.title || '');

  const elapsed = Date.now() - startedAt;
  logger.info(`[expandManualImprovement] Done in ${elapsed}ms (site=${siteId}, type=${targetType})`);

  return {
    title: expansion.title || '',
    description: expansion.description || '',
    category: expansion.category || 'other',
    priority: ['high', 'medium', 'low'].includes(expansion.priority) ? expansion.priority : 'medium',
    expectedImpact: expansion.expectedImpact || '',
    estimatedLaborHours: typeof expansion.estimatedLaborHours === 'number' ? expansion.estimatedLaborHours : null,
    targetArea: expansion.targetArea || '',
    similarityWarning: similarityWarning.length > 0 ? similarityWarning : undefined,
  };
}
