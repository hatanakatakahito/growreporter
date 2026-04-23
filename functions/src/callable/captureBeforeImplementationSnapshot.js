/**
 * 改善タスクの実装検証用 Before スナップショット取得 Callable
 *
 * 呼び出しタイミング（Improve.jsx 側）:
 *   - status が in_progress に遷移した時点（ユーザーが作業に着手する宣言）
 *   - 同じ改善で再び in_progress になった場合は上書き
 *
 * 処理:
 *   1. targetPageUrl を取得（空/`/` ならサイトトップ siteUrl を代替）
 *   2. unifiedPageScraper.scrapeUrlStandalone で単一ページ DOM 取得
 *   3. captureAndStoreBeforeScreenshot でスクショ取得（既存関数再利用）
 *   4. improvements/{id}.implementationCheck.beforeSnapshot に保存
 *
 * scrape / スクショのどちらかが失敗しても、取れたほうは保存する。
 * 両方失敗時は error フィールドのみ記録（verified=null の布石）。
 */
import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { canEditSite } from '../utils/permissionHelper.js';
import { scrapeUrlStandalone } from '../utils/unifiedPageScraper.js';
import { captureAndStoreBeforeScreenshot } from '../utils/captureAndStoreBeforeScreenshot.js';

/**
 * スクレイピング結果から beforeSnapshot 用の構造化データを抽出
 */
function extractSnapshotFields(scrapeResult) {
  if (!scrapeResult || !scrapeResult.success) {
    return {
      error: scrapeResult?.error || 'scrape failed',
    };
  }

  // mainText は先頭 2000 文字に制限（Firestore サイズ節約 + diff には十分）
  const mainText = (scrapeResult.mainText || '').slice(0, 2000);

  return {
    metaTitle: scrapeResult.metaTitle || '',
    metaDescription: scrapeResult.metaDescription || '',
    headingStructure: scrapeResult.headingStructure || { h1: 0, h2: 0, h3: 0, h4: 0 },
    textLength: Number(scrapeResult.textLength || 0),
    mainText,
    ctaButtons: Array.isArray(scrapeResult.ctaButtons)
      ? scrapeResult.ctaButtons.slice(0, 20).map(c => ({
          text: (c?.text || '').slice(0, 200),
          href: (c?.href || '').slice(0, 500),
        }))
      : [],
    forms: Array.isArray(scrapeResult.forms)
      ? scrapeResult.forms.slice(0, 10).map(f => ({
          purpose: f?.purpose || '',
          fields: Array.isArray(f?.fields) ? f.fields.slice(0, 30) : [],
          submitText: f?.submitText || '',
        }))
      : [],
    imagesWithAlt: Number(scrapeResult.imagesWithAlt || 0),
    imagesWithoutAlt: Number(scrapeResult.imagesWithoutAlt || 0),
    internalLinks: Number(scrapeResult.internalLinks || 0),
    externalLinks: Number(scrapeResult.externalLinks || 0),
    error: null,
  };
}

export async function captureBeforeImplementationSnapshotCallable(req) {
  if (!req.auth) {
    throw new HttpsError('unauthenticated', 'ユーザー認証が必要です');
  }

  const { siteId, improvementId } = req.data || {};
  if (!siteId || !improvementId) {
    throw new HttpsError('invalid-argument', 'siteId と improvementId が必要です');
  }

  const userId = req.auth.uid;
  const canEdit = await canEditSite(userId, siteId);
  if (!canEdit) {
    throw new HttpsError('permission-denied', 'この改善を編集する権限がありません');
  }

  const db = getFirestore();
  const improvementRef = db
    .collection('sites')
    .doc(siteId)
    .collection('improvements')
    .doc(improvementId);

  const impDoc = await improvementRef.get();
  if (!impDoc.exists) {
    throw new HttpsError('not-found', '改善タスクが見つかりません');
  }

  const siteDoc = await db.collection('sites').doc(siteId).get();
  if (!siteDoc.exists) {
    throw new HttpsError('not-found', 'サイトが見つかりません');
  }

  const impData = impDoc.data();
  const siteData = siteDoc.data();

  // targetPageUrl が空 or '/' ならサイトトップを代替
  let targetUrl = (impData.targetPageUrl || '').split(',')[0].trim();
  const isGlobalImprovement = !targetUrl || targetUrl === '/' || !/^https?:\/\//i.test(targetUrl);
  if (isGlobalImprovement) {
    targetUrl = (siteData.siteUrl || '').trim().replace(/\/+$/, '');
    if (!targetUrl) {
      throw new HttpsError('failed-precondition', 'サイトURLが未設定です');
    }
  }

  logger.info('[captureBeforeImpl] 開始', { siteId, improvementId, targetUrl, isGlobalImprovement });

  // DOM スクレイピングとスクショ取得を並列実行（片方失敗しても続行）
  const [scrapeResult, screenshotResult] = await Promise.allSettled([
    scrapeUrlStandalone(targetUrl),
    captureAndStoreBeforeScreenshot({ siteId, targetPageUrl: targetUrl }),
  ]);

  const scrapeValue = scrapeResult.status === 'fulfilled' ? scrapeResult.value : null;
  const screenshotValue = screenshotResult.status === 'fulfilled' ? screenshotResult.value : null;

  const snapshotFields = extractSnapshotFields(scrapeValue);
  const screenshotUrl = screenshotValue?.success ? screenshotValue.screenshotUrl : null;

  // 両方完全失敗時は error のみ記録
  const allFailed = !scrapeValue?.success && !screenshotUrl;

  const beforeSnapshot = {
    ...snapshotFields,
    screenshotUrl: screenshotUrl || null,
    targetUrl,
    isGlobalImprovement,
    capturedAt: FieldValue.serverTimestamp(),
    ...(allFailed ? { error: 'both scrape and screenshot failed' } : {}),
  };

  await improvementRef.update({
    'implementationCheck.beforeSnapshot': beforeSnapshot,
    // afterSnapshot / diffResult は measureImprovementEffects 側で後から書き込むため、
    // ここでは beforeSnapshot のみ上書き（既存があっても新しい値で置換）
  });

  logger.info('[captureBeforeImpl] 完了', {
    siteId,
    improvementId,
    scrapeOk: !!scrapeValue?.success,
    screenshotOk: !!screenshotUrl,
    allFailed,
  });

  return {
    success: !allFailed,
    scrapeOk: !!scrapeValue?.success,
    screenshotOk: !!screenshotUrl,
    targetUrl,
    isGlobalImprovement,
  };
}
