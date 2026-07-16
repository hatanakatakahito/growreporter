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
import * as cheerio from 'cheerio';
import { fetchViaCloudflareProxy } from './cloudflareProxy.js';
import { fetchViaCloudRun } from './cloudRunRender.js';

// ========================================================
// post-BR cleanup (2026-05-11):
// L1 (CF Worker BR) と L2 (Cloud Run) で生成された HTML を統一的に後処理する **唯一の真実**。
// Worker / Cloud Run はレンダリングのみを担当し、HTML 文字列ベースの cleanup は
// すべて本関数に集約する（ワンソース化）。これにより L1/L2 で完全一致の HTML 出力を保証。
//
// 処理内容:
//   1. <script> / <noscript> 除去
//   2. 全要素の on* インラインイベントハンドラ属性削除 (HTML5 spec 全 89 属性、大文字混じり対応)
//   3. href="javascript:..." / xlink:href="javascript:..." を無効化
//   4. <video> を poster <img> に置換 (poster 無しは透明 SVG、width/height 数値抽出)
//   5. YouTube embed iframe をサムネ画像に置換 (id 属性継承)
// ========================================================
// HTML5 spec 準拠の全 on* 属性 (WHATWG spec)
const EVENT_ATTRS = new Set([
  // マウス・ポインター
  'onclick', 'ondblclick', 'oncontextmenu',
  'onmousedown', 'onmouseup', 'onmousemove',
  'onmouseover', 'onmouseout', 'onmouseenter', 'onmouseleave',
  'onwheel',
  'onpointerdown', 'onpointerup', 'onpointermove',
  'onpointerover', 'onpointerout', 'onpointerenter', 'onpointerleave',
  'onpointercancel', 'ongotpointercapture', 'onlostpointercapture',
  // フォーカス・フォーム
  'onfocus', 'onblur', 'onfocusin', 'onfocusout',
  'onchange', 'oninput', 'onsubmit', 'onreset',
  'oninvalid', 'onselect', 'onbeforeinput', 'onformdata',
  // キーボード・IME
  'onkeydown', 'onkeyup', 'onkeypress',
  'oncompositionstart', 'oncompositionupdate', 'oncompositionend',
  // タッチ・ジェスチャ
  'ontouchstart', 'ontouchend', 'ontouchmove', 'ontouchcancel',
  // ライフサイクル・ロード
  'onload', 'onerror', 'onabort', 'onbeforeunload', 'onunload',
  'onreadystatechange', 'onhashchange', 'onpopstate', 'onpageshow', 'onpagehide',
  'onresize', 'onafterprint', 'onbeforeprint',
  // メディア (video/audio)
  'oncanplay', 'oncanplaythrough', 'onplay', 'onplaying', 'onpause',
  'onseeked', 'onseeking', 'onstalled', 'onsuspend',
  'ontimeupdate', 'ondurationchange', 'onloadeddata', 'onloadedmetadata',
  'onloadstart', 'onprogress', 'onratechange', 'onvolumechange',
  'onended', 'onwaiting', 'onemptied', 'oncuechange', 'onencrypted',
  // ドラッグ&ドロップ・クリップボード
  'ondrag', 'ondragstart', 'ondragend', 'ondragover',
  'ondragenter', 'ondragleave', 'ondrop',
  'onpaste', 'oncopy', 'oncut',
  // アニメーション・トランジション
  'onanimationstart', 'onanimationend', 'onanimationiteration', 'onanimationcancel',
  'ontransitionstart', 'ontransitionend', 'ontransitionrun', 'ontransitioncancel',
  // スクロール・表示
  'onscroll', 'ontoggle',
  // その他 (HTML5 拡張)
  'onmessage', 'onmessageerror', 'onsearch', 'onstorage',
  'onsecuritypolicyviolation',
]);

// width/height 属性から数値だけを抽出（"100%" → "100"、"320px" → "320"）
function extractNumeric(value, fallback) {
  if (!value) return fallback;
  const m = String(value).match(/\d+/);
  return m ? m[0] : fallback;
}

function applyPostBrCleanup(html) {
  try {
    const $ = cheerio.load(html, { decodeEntities: false });

    // 1) <script> / <noscript> 除去
    $('script').remove();
    $('noscript').remove();

    // 2) 全 on* 属性削除 (大文字混じり対応)
    $('*').each((_, el) => {
      if (!el.attribs) return;
      for (const key of Object.keys(el.attribs)) {
        if (EVENT_ATTRS.has(key.toLowerCase())) {
          delete el.attribs[key];
        }
      }
    });

    // 3) javascript: スキーム無効化 (href / xlink:href)
    $('a[href^="javascript:"], [href^="javascript:" i]').attr('href', '#');
    $('[xlink\\:href^="javascript:"]').each((_, el) => {
      if (el.attribs) delete el.attribs['xlink:href'];
    });

    // 4) (2026-05-11 削除): <video> → <img> 置換ロジック
    //    element.screenshot で video 領域を撮影して poster 埋込する方式を試したが、
    //    フルスクリーン hero 動画でオーバーレイ文字込みで撮れてしまい、レイアウト
    //    崩壊の原因になった。元の <video> タグをそのまま残す方針に戻す（iframe 内
    //    では autoplay がブロックされるため実質静止画として安定表示される）。

    // 5) (2026-05-11 削除): YouTube embed → サムネ <img> 置換ロジック
    //    同上の理由で <iframe> をそのまま残す方針。YouTube プレーヤー UI が表示
    //    されるが iframe 内では再生されないため害なし。

    return $.html();
  } catch (err) {
    logger.warn(`[applyPostBrCleanup] エラー: ${err.message}`);
    return html; // 失敗時は元の HTML を返す
  }
}

// 並列度制御セマフォ (2026-05-11):
// 同時 BR 呼出数が CF Browser Rendering の同時 10 ブラウザ上限を圧迫すると
// attempt 1 hang が頻発する仮説の検証用。Cloud Function インスタンスあたり
// 同時 3 件までに制限。それ以上はキューで待機。
//
// 注意: Cloud Function は自動スケールするため複数インスタンスが立つと
//       システム全体では 3×N 件が同時実行される可能性がある。実測では
//       9 件並列バルクで通常 1-2 インスタンスに収まるため概ね 3-6 並列に
//       絞られる想定。
const MAX_CONCURRENT_BR_CALLS = 3;
let activeBrCalls = 0;
const brWaitingQueue = [];

async function acquireBrSlot(pageUrl) {
  if (activeBrCalls < MAX_CONCURRENT_BR_CALLS) {
    activeBrCalls++;
    logger.info(`[captureBrowserRendering] BR slot acquired (active=${activeBrCalls}/${MAX_CONCURRENT_BR_CALLS}): ${pageUrl}`);
    return;
  }
  logger.info(`[captureBrowserRendering] BR slot waiting (queue=${brWaitingQueue.length}, active=${activeBrCalls}): ${pageUrl}`);
  await new Promise((resolve) => brWaitingQueue.push(resolve));
  activeBrCalls++;
  logger.info(`[captureBrowserRendering] BR slot acquired after wait (active=${activeBrCalls}/${MAX_CONCURRENT_BR_CALLS}): ${pageUrl}`);
}

function releaseBrSlot() {
  activeBrCalls--;
  const next = brWaitingQueue.shift();
  if (next) next();
}

// per-attempt timeout: 90s
// 経緯:
//   - 旧 120s: CF Browser Rendering hang 時に 120s × 3 回 = 6 分の長待ちが発生
//   - 一時 45s: 成功する slow BR コール (50-80s かかる重いページ) を false-fail させて
//     Legacy mode (低品質) 落ちさせる事象が頻発 (2026-05-08)
//   - 現 90s: 成功する BR は 14-60s で完了するため 90s なら大半救える。
//     hang 時は 90s × 3 = 270s + 待機 = 約 4.7 分 (semaphore 同時 2 件で並行処理)
const RENDER_TIMEOUT_MS = 90_000;
const RENDER_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h
// バージョン: Browser Rendering ロジックを変更したらここを bump して既存キャッシュを無効化
// br-v2 (2026-05-08): worker に evaluateOnNewDocument + MutationObserver による
//   <script> タグ事前除去を追加。happi.net 等 TLS 切れスクリプトが Chromium に届く前に
//   DOM から消去する。既存 br-v1 キャッシュは TLS 失敗の影響を受けたまま生成された
//   ものが含まれる可能性があるため版番号を bump して強制再生成。
// br-v3 (2026-05-11): worker の goto を networkidle0 → domcontentloaded + 2s 固定 wait に
//   緩和。BLOCKED_HOSTS に recaptcha.net 追加 + BLOCKED_URL_PATTERNS で
//   google.com/recaptcha/* と gstatic.com/recaptcha/* をパス前提で遮断。
//   reCAPTCHA keepalive で networkidle0 が永久発火しない問題を解消し、
//   attempt 1 で 90s フル消費するパターンを根絶した。既存 br-v2 キャッシュは
//   旧 goto/遮断ルールで生成されているため bump して強制再取得。
const RENDER_VERSION = 'br-v3';

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

  // ここから BR 実呼出。セマフォで同時実行数を制限（キャッシュ命中時は通さない）
  await acquireBrSlot(pageUrl);
  try {

  // ========================================================
  // L1 スキップ判定 (2026-05-11 追加):
  //   @cloudflare/puppeteer 固有の問題で CDP 自体が応答せず L1 が 100% 失敗する
  //   URL パターン (例: grow-group.jp/ TOP) は最初から L2 (Cloud Run) に送る。
  //   L1 で 60s 級無駄に消費するのを回避し、総時間を 30s 程度に短縮。
  //
  //   判定基準: ホストのルートパス (path === '/' or '')
  //   理由: 観測上 TOP ページ (hero 動画 + 大量画像 + 第三者 script) で CDP が
  //     詰まるケースが顕著。下位パスは比較的成功率が高い。
  //   将来的にこの判定を runtime 学習（過去 N 回連続失敗で skip）に拡張可能。
  // ========================================================
  function shouldSkipL1(url) {
    try {
      const parsed = new URL(url);
      // ホストのルートパス → L1 スキップ
      if (parsed.pathname === '/' || parsed.pathname === '') {
        return { skip: true, reason: 'site-root-known-l1-failure' };
      }
      return { skip: false };
    } catch {
      return { skip: false };
    }
  }
  const routing = shouldSkipL1(pageUrl);
  // CF Worker 経由で render を取得
  //
  // リトライポリシー:
  //   - 429 (rate limit): 25 秒待機後にリトライ
  //   - "Target closed" / "aborted" / 5xx: 8 秒待機後にリトライ
  //     (CF Browser Rendering の間欠的なブラウザクラッシュ対応)
  //   - 上記以外のエラー: 即時 abort
  //
  // 試行回数 (2026-05-11 で 3 → 2 に変更):
  //   ログ分析で attempt 2 で成功する例 (warm browser pool 効果) は実在するが、
  //   attempt 3 で初めて成功するケースは極稀。3 attempt 目で 90s 浪費して結局
  //   失敗するパターン (例: /recruit/entry/) を排除し、早期に Cloud Run へ
  //   フォールバックして総時間を短縮する目的。
  //   最悪ケース 2 × 90s + 8s + Cloud Run 90s = 278s で、Cloud Function の
  //   timeoutSeconds: 540 内に余裕で収まる。
  const RATE_LIMIT_WAIT_MS = 25_000;
  const TRANSIENT_WAIT_MS = 8_000;
  const MAX_ATTEMPTS = 2;
  let data;
  let lastError = null;

  // L1 スキップ判定: 確実に失敗する URL は最初から L2 へ
  if (routing.skip) {
    logger.info(`[captureBrowserRendering] L1 skip (${routing.reason}) → 直接 L2 (Cloud Run): ${pageUrl}`);
    lastError = new Error(`L1 skipped: ${routing.reason}`);
    // data は undefined のまま → L2 fallback ロジックへ自動的に流れる
  } else for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
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
      // CF Browser Rendering の間欠失敗パターンを transient とみなしてリトライ
      // 2026-05-11: Connection closed / Target crashed / EPIPE / page-dead / -timeout-Nms
      //   等の網羅性向上。worker.js の withTimeout が "<label>-timeout-<ms>ms" 形式で
      //   エラーを投げるため、それも transient 扱いにする。
      const isTransient =
        /Target closed/i.test(msg) ||
        /Target crashed/i.test(msg) ||
        /Connection closed/i.test(msg) ||
        /aborted/i.test(msg) ||
        /5\d\d/.test(msg) ||
        err.name === 'AbortError' ||
        /Protocol error/i.test(msg) ||
        /EPIPE/i.test(msg) ||
        /ECONNRESET/i.test(msg) ||
        /page-dead-after-goto/i.test(msg) ||
        /page-alive-check-failed/i.test(msg) ||
        /-timeout-\d+ms/i.test(msg);

      if (attempt < MAX_ATTEMPTS && (isRateLimit || isTransient)) {
        const waitMs = isRateLimit ? RATE_LIMIT_WAIT_MS : TRANSIENT_WAIT_MS;
        const reason = isRateLimit ? 'Rate limit (429)' : 'Transient (Target closed/aborted)';
        logger.warn(`[captureBrowserRendering] ${reason}, ${waitMs / 1000}s 待機後にリトライ (${attempt}/${MAX_ATTEMPTS}): ${pageUrl}`);
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }

      if (err.name === 'AbortError') {
        logger.warn(`[captureBrowserRendering] タイムアウト: ${pageUrl}`);
      } else {
        logger.error(`[captureBrowserRendering] エラー (attempt ${attempt}/${MAX_ATTEMPTS}): ${pageUrl} - ${msg}`);
      }
      break; // L2 (Cloud Run) フォールバックへ
    }
  }
  // L1 (CF BR) が完全失敗 or 4xx/5xx を返した場合 → L2 (Cloud Run) にフォールバック
  // 別 ASN (GCP) の Chromium で render 品質を維持したまま再試行する。
  // grow-group.jp/contact/estimate/ のように特定 IP 帯 (104.28.x.x) を anti-spam plugin で
  // ブロックしているサイトに対し、GCP IP からアクセスして 200 を取得する用途。
  const l1Failed = !data;
  const l1HttpError = data && (!data.html || data.status >= 400);
  if (l1Failed || l1HttpError) {
    const reason = l1Failed
      ? `L1 全 attempt 失敗: ${lastError?.message || 'unknown'}`
      : `L1 Worker returned status=${data?.status} error=${data?.error || ''}`;
    logger.warn(`[captureBrowserRendering] ${reason} → L2 (Cloud Run) にフォールバック: ${pageUrl}`);

    // L2 タイムアウト (2026-05-11): L1 で既に時間を消費しているため、L2 専用に短縮 (90s → 45s)
    // Cloud Run の実測 BR は 10-25s で完了するため 45s 上限で十分。
    const L2_TIMEOUT_MS = 45_000;
    const l2 = await fetchViaCloudRun({ url: pageUrl, viewport, timeoutMs: L2_TIMEOUT_MS });
    if (l2 && l2.html && l2.status < 400) {
      logger.info(`[captureBrowserRendering] L2 (Cloud Run) 成功: ${pageUrl} (status=${l2.status}, ${l2.html.length} bytes)`);
      data = { status: l2.status, html: l2.html, finalUrl: l2.finalUrl || pageUrl };
    } else {
      logger.warn(`[captureBrowserRendering] L2 も失敗: ${pageUrl} - ${l2?.error || 'no response'}`);
      return null;
    }
  }

  if (!data?.html || data.status >= 400) {
    logger.warn(`[captureBrowserRendering] Worker returned status=${data?.status}, error=${data?.error}`);
    return null;
  }

  // post-BR cleanup (2026-05-11):
  // L1 (Worker) と L2 (Cloud Run) の HTML を統一して onmouseover/video/YouTube を後処理。
  // L1 では既に Worker 側で実施済だが冪等なので二重適用しても害なし。
  // L2 経由ではここで初めて適用される。
  const rawByteLen = data.html.length;
  const html = applyPostBrCleanup(data.html);
  const cleanedByteLen = html.length;
  logger.info(`[captureBrowserRendering] post-BR cleanup: ${rawByteLen} → ${cleanedByteLen} bytes (diff=${rawByteLen - cleanedByteLen})`);

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
  } finally {
    // セマフォ slot を解放（キャッシュ命中以外の全パスで実行される）
    releaseBrSlot();
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
    // 30s timeout で Storage download を保護 (2026-05-11)
    const [buf] = await Promise.race([
      file.download(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('storage-download-timeout-30s')), 30_000)),
    ]);
    return buf.toString('utf-8');
  } catch (err) {
    logger.warn(`[readBrowserRenderedHtml] 読み出し失敗: ${storagePath} - ${err.message}`);
    return null;
  }
}
