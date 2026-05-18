/**
 * Cloudflare Browser Rendering 経由で 1 アクセス × viewport ごとに
 * HTML と JPEG を同時取得する統一ユーティリティ。
 *
 * Worker `mode='render+shot'` を呼び、戻り値の HTML を `page-renderings/` に、
 * screenshot を `page-renderings-shots/` に同じ hash で保存する。
 *
 * 改善ロジック統一化プラン (Phase 2) の中核。
 *   - source of truth: snapshot HTML (page-renderings/{hash}.html)
 *   - 派生 1: AI multimodal 入力 (page-renderings-shots/{hash}.jpg)
 *   - 派生 2: モックアップ Before 表示 (同上)
 *   - 派生 3: モックアップ After 生成のベース (htmlUrl from page-renderings)
 *
 * 既存 captureBrowserRendering.js と captureBrowserScreenshot.js は当面残し、
 * 安定稼働後 Phase 6 で削除判断。
 *
 * 24 時間キャッシュ (Storage)。RENDER_SHOT_VERSION を bump すれば旧キャッシュを無効化可能。
 *
 * 失敗時は { error: 'BR_RATE_LIMITED' | 'BR_UNAVAILABLE' | 'BR_FAILED' } を返す
 * (PSI フォールバックは廃止。改善する機能の source of truth 統一を優先)。
 */

import { getStorage } from 'firebase-admin/storage';
import { logger } from 'firebase-functions/v2';
import crypto from 'node:crypto';
import { fetchViaCloudflareProxy } from './cloudflareProxy.js';

const RENDER_SHOT_TIMEOUT_MS = 120_000;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h
// バージョン: render+shot ロジックを変更したらここを bump して既存キャッシュを無効化
//   rs-v1: 初版 (fullPage screenshot のみ)
//   rs-v2: viewport screenshot 追加 (Gemini Lite 入力用、page-renderings-shots-vp/ に保存)
//   rs-v3: Worker に Google Maps iframe scrollIntoView + 4s 待機を追加 (空白マップ問題対策)
export const RENDER_SHOT_VERSION = 'rs-v3';
const RATE_LIMIT_WAIT_MS = 25_000;
const MAX_ATTEMPTS = 2;

function buildHash(viewport, pageUrl, fullPage = true) {
  // fullPage:true は既存ハッシュ算出と完全互換 (改善 Before / preheat / mockup の cache 維持)
  // fullPage:false (サムネ用 viewport モード) は別ハッシュで衝突回避
  const seed = fullPage
    ? `${RENDER_SHOT_VERSION}:${viewport}:${pageUrl}`
    : `${RENDER_SHOT_VERSION}:${viewport}:vp:${pageUrl}`;
  return crypto
    .createHash('sha1')
    .update(seed)
    .digest('hex')
    .substring(0, 16);
}

function publicUrlOf(bucket, storagePath) {
  return `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
}

/**
 * Cache hit 判定。skipScreenshot=true のときは HTML のみチェック。
 *   - skipScreenshot=false (default): HTML と screenshot 両方が 24h 以内に存在する必要あり
 *   - skipScreenshot=true: HTML のみ 24h 以内に存在すれば hit
 *     (mockup 用途では screenshot 不要、HTML のみで十分。preheat の render+shot 由来 cache とも共有可)
 */
async function tryCacheHit(bucket, htmlPath, shotPath, skipScreenshot = false) {
  try {
    const htmlFile = bucket.file(htmlPath);
    const [htmlExists] = await htmlFile.exists();
    if (!htmlExists) return null;
    const [htmlMeta] = await htmlFile.getMetadata();
    const htmlAge = Date.now() - new Date(htmlMeta.updated || htmlMeta.timeCreated).getTime();
    if (htmlAge >= CACHE_TTL_MS) return null;

    if (skipScreenshot) {
      return {
        htmlUrl: publicUrlOf(bucket, htmlPath),
        htmlStoragePath: htmlPath,
        screenshotUrl: null,
        screenshotStoragePath: null,
        htmlByteLen: Number(htmlMeta.size) || 0,
        screenshotByteLen: 0,
      };
    }

    const shotFile = bucket.file(shotPath);
    const [shotExists] = await shotFile.exists();
    if (!shotExists) return null;
    const [shotMeta] = await shotFile.getMetadata();
    const shotAge = Date.now() - new Date(shotMeta.updated || shotMeta.timeCreated).getTime();
    if (shotAge >= CACHE_TTL_MS) return null;
    return {
      htmlUrl: publicUrlOf(bucket, htmlPath),
      htmlStoragePath: htmlPath,
      screenshotUrl: publicUrlOf(bucket, shotPath),
      screenshotStoragePath: shotPath,
      htmlByteLen: Number(htmlMeta.size) || 0,
      screenshotByteLen: Number(shotMeta.size) || 0,
    };
  } catch (err) {
    logger.warn(`[captureRenderAndScreenshot] cache check failed: ${err.message}`);
    return null;
  }
}

/**
 * 1 viewport 分の撮影 + Storage 保存。
 *
 * @returns {Promise<
 *   | { error: 'BR_RATE_LIMITED' | 'BR_UNAVAILABLE' | 'BR_FAILED', message?: string }
 *   | { htmlUrl, htmlStoragePath, screenshotUrl, screenshotStoragePath, htmlByteLen, screenshotByteLen, hash, fromCache }
 * >}
 */
async function captureSingleViewport({ siteId, pageUrl, viewport, forceRefresh, bucket, skipScreenshot = false, fullPage = true }) {
  const hash = buildHash(viewport, pageUrl, fullPage);
  const htmlPath = `page-renderings/${siteId}/${hash}.html`;
  // fullPage:true は既存 path、false (サムネ用) は別 path で衝突回避
  const shotPath = fullPage
    ? `page-renderings-shots/${siteId}/${hash}.jpg`
    : `page-renderings-shots-vp/${siteId}/${hash}.jpg`;

  if (!forceRefresh) {
    const cached = await tryCacheHit(bucket, htmlPath, shotPath, skipScreenshot);
    if (cached) {
      logger.info(`[captureRenderAndScreenshot] cache hit (${viewport}, skipScreenshot=${skipScreenshot}): ${pageUrl}`);
      return { ...cached, hash, fromCache: true };
    }
  }

  // Worker call (rate limit 429 時は 25s 待機 + 1 回再試行)
  // skipScreenshot=true なら mode='render' (HTML のみ、screenshot 撮影スキップで高速)
  // skipScreenshot=false なら mode='render+shot' (HTML + fullPage screenshot 同時取得)
  const workerMode = skipScreenshot ? 'render' : 'render+shot';
  let data = null;
  let lastError = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      logger.info(
        `[captureRenderAndScreenshot] worker call (attempt ${attempt}/${MAX_ATTEMPTS}, viewport=${viewport}, mode=${workerMode}): ${pageUrl}`
      );
      data = await fetchViaCloudflareProxy({
        targetUrl: pageUrl,
        mode: workerMode,
        viewport,
        fullPage,
        timeoutMs: RENDER_SHOT_TIMEOUT_MS,
      });
      break;
    } catch (err) {
      lastError = err;
      const msg = err?.message || '';
      const isRateLimit = /429|Rate limit/i.test(msg);
      if (isRateLimit && attempt < MAX_ATTEMPTS) {
        logger.warn(
          `[captureRenderAndScreenshot] rate limit (429), waiting ${RATE_LIMIT_WAIT_MS / 1000}s: ${pageUrl}`
        );
        await new Promise((r) => setTimeout(r, RATE_LIMIT_WAIT_MS));
        continue;
      }
      logger.warn(`[captureRenderAndScreenshot] worker error (attempt ${attempt}): ${pageUrl} - ${msg}`);
      const errorCode = isRateLimit
        ? 'BR_RATE_LIMITED'
        : err?.name === 'AbortError'
          ? 'BR_UNAVAILABLE'
          : 'BR_FAILED';
      return { error: errorCode, message: msg };
    }
  }
  if (!data) {
    return { error: 'BR_FAILED', message: lastError?.message || 'unknown' };
  }
  if (!data.html || (!skipScreenshot && !data.screenshot)) {
    logger.warn(
      `[captureRenderAndScreenshot] worker returned incomplete: status=${data.status}, hasHtml=${!!data.html}, hasShot=${!!data.screenshot}, skipScreenshot=${skipScreenshot}`
    );
    return { error: 'BR_FAILED', message: data?.error || 'missing html/screenshot' };
  }
  // 5xx (上流サーバエラー) は失敗扱い、4xx は警告のみで保存続行
  // 理由: 403/404 ページの screenshot も Before として表示できれば、
  //       「アクセス拒否されている / ページが消えた」状態がユーザーに視覚的に伝わる。
  //       完全拒否すると drawer が永遠にローディングのままになる UX 問題があった。
  if (data.status && data.status >= 500) {
    logger.warn(
      `[captureRenderAndScreenshot] upstream 5xx: status=${data.status}, ${pageUrl} (${viewport})`
    );
    return { error: 'BR_FAILED', message: `upstream ${data.status}` };
  }
  if (data.status && data.status >= 400) {
    logger.warn(
      `[captureRenderAndScreenshot] upstream 4xx: status=${data.status}, ${pageUrl} (${viewport}) — saving content anyway`
    );
  }

  // Save HTML (and screenshot if not skipScreenshot)
  const htmlFile = bucket.file(htmlPath);
  const commonMeta = {
    sourceUrl: pageUrl,
    finalUrl: data.finalUrl || pageUrl,
    viewport,
    renderShotVersion: RENDER_SHOT_VERSION,
  };

  try {
    await htmlFile.save(data.html, {
      metadata: {
        contentType: 'text/html; charset=utf-8',
        cacheControl: 'public, max-age=86400',
        metadata: commonMeta,
      },
      resumable: false,
    });
    await htmlFile.makePublic();
  } catch (err) {
    logger.error(`[captureRenderAndScreenshot] storage save (html) error: ${pageUrl} - ${err.message}`);
    return { error: 'BR_FAILED', message: `storage: ${err.message}` };
  }

  let screenshotByteLen = 0;
  if (!skipScreenshot && data.screenshot) {
    const imageBuffer = Buffer.from(data.screenshot, 'base64');
    const shotFile = bucket.file(shotPath);
    try {
      await shotFile.save(imageBuffer, {
        metadata: {
          contentType: 'image/jpeg',
          cacheControl: 'public, max-age=86400',
          metadata: commonMeta,
        },
        resumable: false,
      });
      await shotFile.makePublic();
      screenshotByteLen = imageBuffer.length;
    } catch (err) {
      logger.error(`[captureRenderAndScreenshot] storage save (shot) error: ${pageUrl} - ${err.message}`);
      return { error: 'BR_FAILED', message: `storage: ${err.message}` };
    }
  }

  logger.info(
    `[captureRenderAndScreenshot] ok (${viewport}, skipScreenshot=${skipScreenshot}): ${pageUrl} → html=${data.html.length}B${screenshotByteLen ? `, shot=${screenshotByteLen}B` : ''}`
  );

  return {
    htmlUrl: publicUrlOf(bucket, htmlPath),
    htmlStoragePath: htmlPath,
    screenshotUrl: skipScreenshot ? null : publicUrlOf(bucket, shotPath),
    screenshotStoragePath: skipScreenshot ? null : shotPath,
    htmlByteLen: data.html.length,
    screenshotByteLen,
    hash,
    fromCache: false,
  };
}

/**
 * 指定 URL を render+shot で取得し、PC / Mobile (デフォルト両方) を Storage に保存する。
 *
 * 1 URL × N viewport を **直列** で撮影 (Worker rate limit 配慮)。
 * URL 単位の並列化は呼出側 (preheatSitePageScreenshots 等) で行う。
 *
 * @param {string} siteId
 * @param {string} pageUrl
 * @param {object} [options]
 * @param {Array<'pc'|'mobile'>} [options.viewports=['pc','mobile']]
 * @param {boolean} [options.forceRefresh=false] - 24h cache を無視して再撮影
 * @param {boolean} [options.skipScreenshot=false] - true なら HTML のみ取得 (Worker mode='render')、screenshot は撮影/保存しない
 *   - mockup 用途では HTML だけで cheerio パッチ可能 → screenshot 撮影で +20-40s 浪費を回避
 *   - preheat の render+shot 由来の HTML cache (同 hash) と共有して使える
 * @param {boolean} [options.fullPage=true] - true: ページ全体撮影 (デフォルト、改善 Before 等)、false: viewport のみ撮影 (サムネ用)
 *   - false 時は別 Storage path (page-renderings-shots-vp/) + 別 hash (vp プレフィクス) で fullPage cache と衝突しない
 *
 * @returns {Promise<{
 *   pc:     { htmlUrl, htmlStoragePath, screenshotUrl, screenshotStoragePath, hash, htmlByteLen, screenshotByteLen } | null,
 *   mobile: { htmlUrl, htmlStoragePath, screenshotUrl, screenshotStoragePath, hash, htmlByteLen, screenshotByteLen } | null,
 *   capturedAt: Date,
 *   source: 'render+shot',
 *   alreadyExists: { pc: boolean, mobile: boolean },
 *   error?: 'BR_RATE_LIMITED' | 'BR_UNAVAILABLE' | 'BR_FAILED' | 'INVALID_PARAMS',
 *   message?: string,
 * }>}
 */
export async function captureRenderAndScreenshot(siteId, pageUrl, options = {}) {
  const { viewports = ['pc', 'mobile'], forceRefresh = false, skipScreenshot = false, fullPage = true } = options;

  if (!siteId) {
    return { pc: null, mobile: null, error: 'INVALID_PARAMS', message: 'siteId required' };
  }
  if (!pageUrl || !/^https?:\/\//i.test(pageUrl)) {
    return { pc: null, mobile: null, error: 'INVALID_PARAMS', message: `invalid URL: ${pageUrl}` };
  }
  if (!Array.isArray(viewports) || viewports.length === 0) {
    return { pc: null, mobile: null, error: 'INVALID_PARAMS', message: 'viewports must be non-empty' };
  }

  const bucket = getStorage().bucket();
  const result = {
    pc: null,
    mobile: null,
    capturedAt: new Date(),
    source: 'render+shot',
    alreadyExists: { pc: false, mobile: false },
  };

  // viewports は直列処理 (Worker rate limit 配慮)
  for (const vp of viewports) {
    if (vp !== 'pc' && vp !== 'mobile') {
      logger.warn(`[captureRenderAndScreenshot] invalid viewport: ${vp}, skipping`);
      continue;
    }
    const r = await captureSingleViewport({ siteId, pageUrl, viewport: vp, forceRefresh, bucket, skipScreenshot, fullPage });
    if (r.error) {
      result.error = r.error;
      result.message = r.message;
      // 1 viewport が失敗したら以降をスキップ (rate limit が原因の可能性大)
      logger.warn(`[captureRenderAndScreenshot] ${vp} failed (${r.error}), skipping remaining viewports: ${pageUrl}`);
      break;
    }
    result[vp] = {
      htmlUrl: r.htmlUrl,
      htmlStoragePath: r.htmlStoragePath,
      screenshotUrl: r.screenshotUrl,
      screenshotStoragePath: r.screenshotStoragePath,
      hash: r.hash,
      htmlByteLen: r.htmlByteLen,
      screenshotByteLen: r.screenshotByteLen,
    };
    result.alreadyExists[vp] = r.fromCache;
  }

  return result;
}

/**
 * Storage の rendered HTML を読み出す (cheerio パッチ等で使用)。
 *
 * @param {string} storagePath - 例: 'page-renderings/{siteId}/{hash}.html'
 * @returns {Promise<string|null>}
 */
export async function readRenderedHtml(storagePath) {
  if (!storagePath) return null;
  const bucket = getStorage().bucket();
  const file = bucket.file(storagePath);
  try {
    const [buf] = await file.download();
    return buf.toString('utf-8');
  } catch (err) {
    logger.warn(`[readRenderedHtml] download failed: ${storagePath} - ${err.message}`);
    return null;
  }
}
