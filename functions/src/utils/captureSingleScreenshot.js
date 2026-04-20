/**
 * 一元化スクリーンショット取得ユーティリティ（PSI API 経由）
 *
 * 全ての画面キャプチャは本ユーティリティを通す。Puppeteer は使わない。
 * 理由: GCP IP が Cloudflare にブロックされる問題を完全に回避するため
 *       PageSpeed Insights API（Google 公式、Lighthouse ベース）を使用する。
 *
 * フロー:
 *   1) PSI API 呼出 (strategy = desktop | mobile)
 *   2) lighthouseResult.fullPageScreenshot.screenshot を最優先取得
 *   3) 画像密度が低い(Lighthouse 展開破綻) 場合はビューポート版に自動フォールバック
 *   4) Firebase Storage にアップロードし公開 URL を返す
 *
 * 失敗時は null を返す（例外を投げない）
 */
import { logger } from 'firebase-functions/v2';
import { getStorage } from 'firebase-admin/storage';

const DENSITY_THRESHOLD = 12; // bytes per Kpixel 未満は破綻と判定
const PSI_TIMEOUT_MS = 90_000;
const PSI_BASE_URL = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';
const PSI_MAX_RETRIES = 2;        // 初回 + 最大2回リトライ = 計3回試行
const PSI_RETRY_DELAY_MS = 3_000; // リトライ間隔

/**
 * @param {object} params
 * @param {string} params.url         - 撮影対象URL（必須、http/https のみ）
 * @param {'pc'|'mobile'} params.deviceType - 必須
 * @param {string} params.userId      - Storage パス用
 * @param {object} [params.options]
 * @param {'screenshots'|'page-screenshots'} [params.options.storagePathPrefix='screenshots']
 * @param {string} [params.options.siteId]        - page-screenshots 使用時に必要
 * @param {string} [params.options.pagePath]      - ファイル名補助
 * @param {number} [params.options.densityThreshold=12]
 * @param {number} [params.options.timeoutMs=90000]
 * @returns {Promise<null | { imageUrl: string, source: 'psi', screenshotType: 'full-page'|'viewport', dimensions: {width:number|string,height:number|string}, bytesPerKpx: number|null, imageSize: number }>}
 */
export async function captureSingleScreenshot({ url, deviceType, userId, options = {} }) {
  if (!url || !/^https?:\/\//i.test(url)) {
    logger.warn('[captureSingleScreenshot] 無効なURL:', url);
    return null;
  }
  if (!['pc', 'mobile'].includes(deviceType)) {
    logger.warn('[captureSingleScreenshot] 無効なdeviceType:', deviceType);
    return null;
  }
  if (!userId) {
    logger.warn('[captureSingleScreenshot] userId が必要です');
    return null;
  }

  const psiApiKey = process.env.PSI_API_KEY;
  if (!psiApiKey) {
    logger.warn('[captureSingleScreenshot] PSI_API_KEY が設定されていません');
    return null;
  }

  const {
    storagePathPrefix = 'screenshots',
    siteId,
    pagePath,
    densityThreshold = DENSITY_THRESHOLD,
    timeoutMs = PSI_TIMEOUT_MS,
  } = options;

  const strategy = deviceType === 'mobile' ? 'mobile' : 'desktop';
  const psiUrl = `${PSI_BASE_URL}?url=${encodeURIComponent(url)}&strategy=${strategy}&category=performance&key=${psiApiKey}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  // PSI 呼出: 5xx / ネットワーク系の一時的失敗は自動リトライする
  async function fetchPsiWithRetry() {
    let lastStatus = null;
    let lastError = null;
    for (let attempt = 0; attempt <= PSI_MAX_RETRIES; attempt++) {
      try {
        const prefix = attempt === 0 ? '[captureSingleScreenshot] PSI 呼出' : `[captureSingleScreenshot] PSI リトライ${attempt}`;
        logger.info(`${prefix}: ${url} (${strategy})`);
        const res = await fetch(psiUrl, { signal: controller.signal });
        if (res.ok) return res;
        lastStatus = res.status;
        // 4xx はリトライしても無意味（URL不正・認証切れ等）
        if (res.status < 500) {
          logger.warn(`[captureSingleScreenshot] PSI HTTP ${res.status} (リトライ不要) for ${url}`);
          return null;
        }
        logger.warn(`[captureSingleScreenshot] PSI HTTP ${res.status} (リトライ可能) for ${url}`);
      } catch (err) {
        lastError = err;
        if (err?.name === 'AbortError') throw err; // タイムアウトはリトライしない
        logger.warn(`[captureSingleScreenshot] PSI fetch エラー: ${err?.message || err} for ${url}`);
      }
      if (attempt < PSI_MAX_RETRIES) {
        await new Promise(r => setTimeout(r, PSI_RETRY_DELAY_MS));
      }
    }
    logger.warn(`[captureSingleScreenshot] PSI リトライ上限到達: lastStatus=${lastStatus}, lastError=${lastError?.message} for ${url}`);
    return null;
  }

  try {
    const res = await fetchPsiWithRetry();
    if (!res) return null;
    const data = await res.json();

    // スクショデータ抽出（優先度: fullPageScreenshot → audits['full-page-screenshot'] → audits['final-screenshot']）
    const topLevelFps = data.lighthouseResult?.fullPageScreenshot?.screenshot;
    const auditFps = data.lighthouseResult?.audits?.['full-page-screenshot']?.details?.screenshot;
    const viewportDataUrl = data.lighthouseResult?.audits?.['final-screenshot']?.details?.data;

    let fullPage = null;
    if (topLevelFps?.data) fullPage = topLevelFps;
    else if (auditFps?.data) fullPage = auditFps;

    let chosenBase64;
    let screenshotType;
    let dimensions = null;
    let bytesPerKpx = null;

    // base64 データからデコード後のバイナリサイズ推定
    const estimateBinarySize = (dataUrl) => {
      const b64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');
      return Math.floor(b64.length * 0.75);
    };

    if (fullPage?.data) {
      const pixelCount = Math.max(1, (fullPage.width || 1) * (fullPage.height || 1));
      const estBytes = estimateBinarySize(fullPage.data);
      bytesPerKpx = (estBytes / pixelCount) * 1000;

      if (bytesPerKpx < densityThreshold && viewportDataUrl) {
        // 破綻検知 → viewport版
        chosenBase64 = viewportDataUrl;
        screenshotType = 'viewport';
        dimensions = { width: 'viewport', height: 'viewport' };
        logger.info(`[captureSingleScreenshot] 密度 ${bytesPerKpx.toFixed(1)} < ${densityThreshold} → viewport フォールバック: ${url}`);
      } else {
        chosenBase64 = fullPage.data;
        screenshotType = 'full-page';
        dimensions = { width: fullPage.width, height: fullPage.height };
      }
    } else if (viewportDataUrl) {
      chosenBase64 = viewportDataUrl;
      screenshotType = 'viewport';
    }

    if (!chosenBase64) {
      logger.warn(`[captureSingleScreenshot] PSI からスクショを取得できませんでした: ${url}`);
      return null;
    }

    const base64Str = chosenBase64.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Str, 'base64');

    // Firebase Storage にアップロード
    const bucket = getStorage().bucket();
    let fileName;
    if (storagePathPrefix === 'page-screenshots' && siteId) {
      const safePath = encodeURIComponent((pagePath || '/').replace(/\//g, '_')).substring(0, 100);
      fileName = `page-screenshots/${siteId}/${Date.now()}_${deviceType}_${safePath}.jpg`;
    } else {
      fileName = `screenshots/${userId}/${deviceType}_${Date.now()}.jpg`;
    }

    const file = bucket.file(fileName);
    await file.save(imageBuffer, {
      metadata: { contentType: 'image/jpeg', cacheControl: 'public, max-age=31536000' },
      resumable: false,
    });
    await file.makePublic();

    const imageUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
    logger.info(`[captureSingleScreenshot] 成功: ${url} → ${screenshotType}, ${imageBuffer.length} bytes`);

    return {
      imageUrl,
      source: 'psi',
      screenshotType,
      dimensions,
      bytesPerKpx,
      imageSize: imageBuffer.length,
    };
  } catch (err) {
    if (err.name === 'AbortError') {
      logger.warn(`[captureSingleScreenshot] タイムアウト: ${url}`);
    } else {
      logger.error(`[captureSingleScreenshot] エラー: ${url} - ${err.message}`);
    }
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}
