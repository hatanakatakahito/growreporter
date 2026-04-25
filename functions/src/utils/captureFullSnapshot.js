/**
 * 完全スナップショット取得ユーティリティ
 *
 * Cloudflare Workers プロキシ (mode: 'snapshot') を呼び出して
 * 対象ページの HTML + インライン CSS + 絶対URL化された自己完結スナップショットを取得し、
 * Firebase Storage に保存する。
 *
 * 用途: 改善モックアップ生成で「現行サイトの完全再現 + 差分適用」の基礎として使う。
 *
 * 24時間以内のキャッシュが存在すれば再利用する。
 */

import { getStorage } from 'firebase-admin/storage';
import { logger } from 'firebase-functions/v2';
import crypto from 'node:crypto';
import { fetchViaCloudflareProxy } from './cloudflareProxy.js';

const SNAPSHOT_TIMEOUT_MS = 60_000;
const SNAPSHOT_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h
// バージョン: Worker 側のスナップショット生成ロジックを変更したらここをバンプして
//             既存キャッシュを自動で無効化する（古い snapshot は orphan として残るが
//             Storage の管理画面で必要に応じて手動削除可）
const SNAPSHOT_VERSION = 'v2'; // v2: lazy-load 属性解決対応

/**
 * @param {object} params
 * @param {string} params.siteId  - Storage パス用
 * @param {string} params.pageUrl - 対象ページURL
 * @param {boolean} [params.forceRefresh=false] - キャッシュを無視して再取得
 * @returns {Promise<null | {
 *   storagePath: string,
 *   publicUrl: string,
 *   byteLen: number,
 *   cssInlined: number,
 *   cssFailed: number,
 *   capturedAt: Date,
 *   fromCache: boolean,
 * }>}
 */
export async function captureFullSnapshot({ siteId, pageUrl, forceRefresh = false }) {
  if (!siteId) {
    logger.warn('[captureFullSnapshot] siteId が必要です');
    return null;
  }
  if (!pageUrl || !/^https?:\/\//i.test(pageUrl)) {
    logger.warn('[captureFullSnapshot] 無効な URL:', pageUrl);
    return null;
  }

  const bucket = getStorage().bucket();
  const urlHash = crypto.createHash('sha1').update(`${SNAPSHOT_VERSION}:${pageUrl}`).digest('hex').substring(0, 16);
  const storagePath = `page-snapshots/${siteId}/${urlHash}.html`;
  const file = bucket.file(storagePath);

  // キャッシュチェック
  if (!forceRefresh) {
    try {
      const [exists] = await file.exists();
      if (exists) {
        const [metadata] = await file.getMetadata();
        const updatedAt = new Date(metadata.updated || metadata.timeCreated);
        const ageMs = Date.now() - updatedAt.getTime();
        if (ageMs < SNAPSHOT_CACHE_TTL_MS) {
          logger.info(`[captureFullSnapshot] キャッシュ再利用 (${Math.round(ageMs / 60_000)}分前): ${pageUrl}`);
          return {
            storagePath,
            publicUrl: `https://storage.googleapis.com/${bucket.name}/${storagePath}`,
            byteLen: Number(metadata.size) || 0,
            cssInlined: Number(metadata.metadata?.cssInlined) || 0,
            cssFailed: Number(metadata.metadata?.cssFailed) || 0,
            capturedAt: updatedAt,
            fromCache: true,
          };
        }
      }
    } catch (err) {
      logger.warn(`[captureFullSnapshot] キャッシュ確認失敗: ${err.message}`);
    }
  }

  // Worker 経由で snapshot を取得
  let data;
  try {
    logger.info(`[captureFullSnapshot] Worker 呼出: ${pageUrl}`);
    data = await fetchViaCloudflareProxy({
      targetUrl: pageUrl,
      mode: 'snapshot',
      timeoutMs: SNAPSHOT_TIMEOUT_MS,
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      logger.warn(`[captureFullSnapshot] タイムアウト: ${pageUrl}`);
    } else {
      logger.error(`[captureFullSnapshot] エラー: ${pageUrl} - ${err.message}`);
    }
    return null;
  }

  if (!data.html || data.status >= 400) {
    logger.warn(`[captureFullSnapshot] Worker returned status=${data.status}, error=${data.error}`);
    return null;
  }

  const html = data.html;
  const stats = data.stats || {};

  try {
    // Firebase Storage に保存
    await file.save(html, {
      metadata: {
        contentType: 'text/html; charset=utf-8',
        cacheControl: 'public, max-age=86400',
        metadata: {
          sourceUrl: pageUrl,
          cssInlined: String(stats.cssInlined || 0),
          cssFailed: String(stats.cssFailed || 0),
        },
      },
      resumable: false,
    });
    await file.makePublic();

    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
    logger.info(`[captureFullSnapshot] 成功: ${pageUrl} → ${storagePath} (${html.length} bytes, CSS ${stats.cssInlined}/${stats.cssInlined + stats.cssFailed})`);

    return {
      storagePath,
      publicUrl,
      byteLen: html.length,
      cssInlined: stats.cssInlined || 0,
      cssFailed: stats.cssFailed || 0,
      capturedAt: new Date(),
      fromCache: false,
    };
  } catch (err) {
    logger.error(`[captureFullSnapshot] Storage 保存エラー: ${pageUrl} - ${err.message}`);
    return null;
  }
}

/**
 * Storage から snapshot HTML を読み出す
 */
export async function readSnapshotHtml(storagePath) {
  const bucket = getStorage().bucket();
  const file = bucket.file(storagePath);
  try {
    const [buf] = await file.download();
    return buf.toString('utf-8');
  } catch (err) {
    logger.warn(`[readSnapshotHtml] 読み出し失敗: ${storagePath} - ${err.message}`);
    return null;
  }
}
