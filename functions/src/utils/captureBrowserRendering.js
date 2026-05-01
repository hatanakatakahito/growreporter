/**
 * Cloudflare Browser Rendering 経由の HTML 取得ユーティリティ。
 *
 * 既存 captureFullSnapshot.js (CF Worker mode='snapshot') の代替経路。
 *
 * 主な改善点（snapshot 経路との比較）:
 *   - JS 実行後の DOM を取得 → lazy-load 解決済 / 動的挿入要素 込み
 *   - enhanceSnapshotForRender の細工（lazy 解除・720px hero 圧縮・visibility 強制）が不要
 *   - そのまま iframe で表示しても実サイトと同等のレンダリング
 *
 * 24時間キャッシュ（Storage）。SNAPSHOT_VERSION を bump すれば旧キャッシュを無効化可能。
 *
 * @returns {Promise<null | {
 *   storagePath: string,
 *   publicUrl: string,
 *   byteLen: number,
 *   capturedAt: Date,
 *   fromCache: boolean,
 * }>}
 */
import { getStorage } from 'firebase-admin/storage';
import { logger } from 'firebase-functions/v2';
import crypto from 'node:crypto';
import { fetchViaCloudflareProxy } from './cloudflareProxy.js';

const RENDER_TIMEOUT_MS = 120_000;
const RENDER_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h
// バージョン: Browser Rendering ロジックを変更したらここを bump して既存キャッシュを無効化
const RENDER_VERSION = 'br-v1';

/**
 * @param {object} params
 * @param {string} params.siteId
 * @param {string} params.pageUrl
 * @param {'pc'|'mobile'} [params.viewport='pc']
 * @param {boolean} [params.forceRefresh=false]
 */
export async function captureBrowserRendering({ siteId, pageUrl, viewport = 'pc', forceRefresh = false }) {
  if (!siteId) {
    logger.warn('[captureBrowserRendering] siteId が必要です');
    return null;
  }
  if (!pageUrl || !/^https?:\/\//i.test(pageUrl)) {
    logger.warn('[captureBrowserRendering] 無効な URL:', pageUrl);
    return null;
  }

  const bucket = getStorage().bucket();
  const urlHash = crypto
    .createHash('sha1')
    .update(`${RENDER_VERSION}:${viewport}:${pageUrl}`)
    .digest('hex')
    .substring(0, 16);
  const storagePath = `page-renderings/${siteId}/${urlHash}.html`;
  const file = bucket.file(storagePath);

  // キャッシュチェック
  if (!forceRefresh) {
    try {
      const [exists] = await file.exists();
      if (exists) {
        const [metadata] = await file.getMetadata();
        const updatedAt = new Date(metadata.updated || metadata.timeCreated);
        const ageMs = Date.now() - updatedAt.getTime();
        if (ageMs < RENDER_CACHE_TTL_MS) {
          logger.info(`[captureBrowserRendering] キャッシュ再利用 (${Math.round(ageMs / 60_000)}分前): ${pageUrl}`);
          return {
            storagePath,
            publicUrl: `https://storage.googleapis.com/${bucket.name}/${storagePath}`,
            byteLen: Number(metadata.size) || 0,
            capturedAt: updatedAt,
            fromCache: true,
          };
        }
      }
    } catch (err) {
      logger.warn(`[captureBrowserRendering] キャッシュ確認失敗: ${err.message}`);
    }
  }

  // CF Worker 経由で render を取得 (Rate limit 429 時は 25 秒待機 + 1 回再試行)
  const RATE_LIMIT_WAIT_MS = 25_000;
  const MAX_ATTEMPTS = 2;
  let data;
  let lastError = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      logger.info(`[captureBrowserRendering] Worker 呼出 (attempt ${attempt}/${MAX_ATTEMPTS}, mode=render, viewport=${viewport}): ${pageUrl}`);
      data = await fetchViaCloudflareProxy({
        targetUrl: pageUrl,
        mode: 'render',
        viewport,
        timeoutMs: RENDER_TIMEOUT_MS,
      });
      break; // 成功
    } catch (err) {
      lastError = err;
      const msg = err?.message || '';
      const isRateLimit = /429|Rate limit/i.test(msg);
      if (isRateLimit && attempt < MAX_ATTEMPTS) {
        logger.warn(`[captureBrowserRendering] Rate limit (429)、${RATE_LIMIT_WAIT_MS / 1000}s 待機後にリトライ: ${pageUrl}`);
        await new Promise((r) => setTimeout(r, RATE_LIMIT_WAIT_MS));
        continue;
      }
      if (err.name === 'AbortError') {
        logger.warn(`[captureBrowserRendering] タイムアウト: ${pageUrl}`);
      } else {
        logger.error(`[captureBrowserRendering] エラー (attempt ${attempt}/${MAX_ATTEMPTS}): ${pageUrl} - ${msg}`);
      }
      return null;
    }
  }
  if (!data) {
    logger.warn(`[captureBrowserRendering] 全 attempt 失敗: ${pageUrl} - ${lastError?.message}`);
    return null;
  }

  if (!data?.html || data.status >= 400) {
    logger.warn(`[captureBrowserRendering] Worker returned status=${data?.status}, error=${data?.error}`);
    return null;
  }

  const html = data.html;

  try {
    await file.save(html, {
      metadata: {
        contentType: 'text/html; charset=utf-8',
        cacheControl: 'public, max-age=86400',
        metadata: {
          sourceUrl: pageUrl,
          finalUrl: data.finalUrl || pageUrl,
          viewport,
          renderVersion: RENDER_VERSION,
        },
      },
      resumable: false,
    });
    await file.makePublic();

    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
    logger.info(`[captureBrowserRendering] 成功: ${pageUrl} → ${storagePath} (${html.length} bytes)`);

    return {
      storagePath,
      publicUrl,
      byteLen: html.length,
      capturedAt: new Date(),
      fromCache: false,
    };
  } catch (err) {
    logger.error(`[captureBrowserRendering] Storage 保存エラー: ${pageUrl} - ${err.message}`);
    return null;
  }
}

/**
 * Storage から rendered HTML を読み出す
 *
 * captureFullSnapshot.js の readSnapshotHtml と異なり、ここでは
 * enhanceSnapshotForRender 相当の細工は **不要**（JS 実行後の素の HTML が既に正しい）。
 */
export async function readBrowserRenderedHtml(storagePath) {
  const bucket = getStorage().bucket();
  const file = bucket.file(storagePath);
  try {
    const [buf] = await file.download();
    return buf.toString('utf-8');
  } catch (err) {
    logger.warn(`[readBrowserRenderedHtml] 読み出し失敗: ${storagePath} - ${err.message}`);
    return null;
  }
}
