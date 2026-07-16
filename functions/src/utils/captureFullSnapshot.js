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
import * as cheerio from 'cheerio';
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
 * snapshot HTML をブラウザでそのまま表示できる形に整形する。
 *
 * 取得したサイトの多くは lazyload ライブラリ (lozad / lazysizes 等) や
 * 自前の遅延表示 JS に依存しており、JS を実行しない CF Worker snapshot は
 * 「lazyload クラスが残ったまま CSS で visibility:hidden になっている」
 * ケースが頻発する（例: grow-group.jp/recruit/ のメインビジュアル）。
 *
 * 本関数では下記を適用してビジュアル再現性を高める:
 *   A. .lazyload / .lazyloaded クラスを除去（JS 待ちにせず即座に有効化）
 *   B. style 属性内の data:image/svg+xml プレースホルダを除去
 *      （多重 background-image の 1 段目を削って 2 段目の本物画像を有効化）
 *   C. メインビジュアル / ヒーロー / ファーストビュー系クラスへの
 *      visibility:visible !important を <head> に注入（サイト固有 CSS 上書き）
 *   D. data-src / data-srcset を src / srcset にフォールバック
 *
 * snapshot 自体は素のまま Storage に保存し続ける（後で整形ロジックを変えやすい）。
 * 整形は読み出し時に毎回実行する。
 */
export function enhanceSnapshotForRender(html) {
  if (!html || typeof html !== 'string') return html;
  let $;
  try {
    $ = cheerio.load(html, { decodeEntities: false });
  } catch (err) {
    logger.warn(`[enhanceSnapshotForRender] cheerio.load 失敗: ${err.message}`);
    return html;
  }

  // A. lazyload / lazyloaded クラスを除去
  $('.lazyload, .lazyloaded').each((_, el) => {
    $(el).removeClass('lazyload').removeClass('lazyloaded');
  });

  // B. style 内の data:image/svg+xml プレースホルダ background-image を除去
  $('[style]').each((_, el) => {
    const s = $(el).attr('style') || '';
    if (s.includes('data:image/svg')) {
      const cleaned = s
        .replace(/background-image\s*:\s*url\(\s*["']?data:image\/svg\+xml[^)]+\)\s*;?/gi, '')
        .replace(/;\s*;/g, ';')
        .replace(/^\s*;|;\s*$/g, '')
        .trim();
      if (cleaned !== s) $(el).attr('style', cleaned);
    }
  });

  // D. data-src → src フォールバック
  $('img[data-src]').each((_, el) => {
    const dataSrc = $(el).attr('data-src');
    const currentSrc = $(el).attr('src') || '';
    if (dataSrc && (!currentSrc || /data:image\/svg/.test(currentSrc))) {
      $(el).attr('src', dataSrc);
    }
  });
  $('img[data-srcset], source[data-srcset]').each((_, el) => {
    const dataSrcset = $(el).attr('data-srcset');
    const currentSrcset = $(el).attr('srcset') || '';
    if (dataSrcset && !currentSrcset) {
      $(el).attr('srcset', dataSrcset);
    }
  });

  // C. visibility:visible 強制 + 100vh hero 高さ抑制 CSS を <head> に注入
  // - サイト固有の `visibility:hidden` （JS で visible に切替を待つ実装）を上書き
  // - メインビジュアル / ヒーロー / ファーストビュー系クラス名にマッチ
  // - `height:100vh` の hero が iframe / PSI fullPageScreenshot で viewport 全体に
  //   引き伸ばされてレイアウト破綻するのを抑制（720px に固定）
  const visibleCss = `
[data-src],[data-srcset],[data-lazy-src],[data-original]{opacity:1 !important;visibility:visible !important;}
.lazy,.lazyloading{opacity:1 !important;visibility:visible !important;}
[class*="main-visual"],[class*="mainvisual"],[class*="key-visual"],[class*="keyvisual"],
[class*="kv-"],[class*="-kv"],[class*="hero"],[class*="firstview"],[class*="first-view"],
[class*="mv-"],[class*="-mv"],[id*="main-visual"],[id*="hero"]{
visibility:visible !important;opacity:1 !important;
height:720px !important;min-height:0 !important;max-height:720px !important;
}
[class*="main-visual"] [class*="image"],[class*="main-visual"] [class*="video"],
[class*="main-visual__"][class*="bg"],[class*="hero"] [class*="image"],
[class*="hero"] [class*="bg"]{
height:720px !important;min-height:0 !important;max-height:720px !important;
position:relative !important;top:auto !important;left:auto !important;
}
`;
  if ($('head').length > 0) {
    if ($('head #__snapshot-render-fix').length === 0) {
      $('head').append(`<style id="__snapshot-render-fix">${visibleCss}</style>`);
    }
  } else {
    $.root().prepend(`<style id="__snapshot-render-fix">${visibleCss}</style>`);
  }

  return $.html();
}

/**
 * Storage から snapshot HTML を読み出す
 *
 * 読み出し時に enhanceSnapshotForRender を適用してビジュアル再現性を高める
 * （JS 依存の lazyload / visibility:hidden を解除）。
 */
export async function readSnapshotHtml(storagePath) {
  const bucket = getStorage().bucket();
  const file = bucket.file(storagePath);
  try {
    const [buf] = await file.download();
    const raw = buf.toString('utf-8');
    return enhanceSnapshotForRender(raw);
  } catch (err) {
    logger.warn(`[readSnapshotHtml] 読み出し失敗: ${storagePath} - ${err.message}`);
    return null;
  }
}
