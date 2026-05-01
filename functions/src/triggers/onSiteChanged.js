import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { fetchMetadataCallable } from '../callable/fetchMetadata.js';

/**
 * サイト登録完了時のハンドラー
 * メタデータ（fetchMetadata: 素fetch→Puppeteerフォールバック）と
 * スクリーンショット（captureScreenshot: Puppeteer→PSIフォールバック）を自動取得
 * index.js の onDocumentWritten トリガーから呼ばれる
 *
 * 実行条件: setupCompleted === true かつ _metaFetchDone フラグが未設定
 */
export async function onSiteChangedHandler(event) {
  const siteId = event.params.siteId;
  const beforeData = event.data?.before?.data();
  const afterData = event.data?.after?.data();

  // ドキュメントが削除された場合は何もしない
  if (!afterData) return;

  // 登録完了していないサイトはスキップ
  if (afterData.setupCompleted !== true) return;

  // 既に処理済みならスキップ
  if (afterData._metaFetchDone) return;

  // setupCompleted の変更がない場合はスキップ（再トリガー防止）
  if (beforeData?.setupCompleted === true && beforeData?._metaFetchDone === afterData._metaFetchDone) return;

  const siteUrl = afterData.siteUrl;
  if (!siteUrl) {
    logger.info('サイトURLがないためスキップ', { siteId });
    return;
  }

  logger.info('サイトメタデータ・スクリーンショット自動取得開始', { siteId, siteUrl });

  const db = getFirestore();

  // 処理中フラグを先に立てる（再トリガー防止）
  await db.collection('sites').doc(siteId).update({ _metaFetchDone: true });

  const updateData = {};

  // ========================================
  // 1. メタデータ取得（素fetch→Puppeteerフォールバック）
  // ========================================
  if (!afterData.metaTitle && !afterData.metaDescription) {
    logger.info('メタデータ取得開始', { siteId, siteUrl });
    try {
      const metadataResult = await fetchMetadataCallable({ data: { siteUrl } });
      const metadata = metadataResult?.metadata;

      if (metadata) {
        if (metadata.title || metadata.ogTitle) {
          updateData.metaTitle = metadata.title || metadata.ogTitle;
        }
        if (metadata.description || metadata.ogDescription) {
          updateData.metaDescription = metadata.description || metadata.ogDescription;
        }
      }

      logger.info('メタデータ取得完了', {
        siteId,
        hasTitle: !!updateData.metaTitle,
        hasDescription: !!updateData.metaDescription,
      });
    } catch (metadataError) {
      logger.warn('メタデータ取得エラー（スクリーンショット取得は続行）', { siteId, error: metadataError.message });
    }
  }

  // メタデータが取れたら先にFirestore保存（スクショ失敗に巻き込まれないように）
  if (Object.keys(updateData).length > 0) {
    await db.collection('sites').doc(siteId).update(updateData);
    logger.info('メタデータをFirestoreに保存', { siteId, fields: Object.keys(updateData) });
  }

  // ========================================
  // 2. スクリーンショット取得（CF Worker Browser Rendering 経由 viewport モード）
  // ========================================
  // PC + Mobile を 1 アクセスで同時取得。siteUrl 変更検知時は強制再撮影 (forceRefresh: true)。
  const screenshotData = {};

  try {
    const needsCapture = !afterData.pcScreenshotUrl || !afterData.mobileScreenshotUrl || beforeData?.siteUrl !== siteUrl;
    if (needsCapture) {
      logger.info('スクリーンショット取得開始', { siteId, siteUrl, urlChanged: beforeData?.siteUrl !== siteUrl });
      const { refreshSiteThumbnails } = await import('../utils/refreshSiteThumbnails.js');
      const result = await refreshSiteThumbnails({
        siteId,
        siteUrl,
        forceRefresh: beforeData?.siteUrl !== siteUrl, // siteUrl 変更時は cache を bypass
        persist: false, // 下の siteRef.update に任せて 1 回の write にまとめる
      });
      if (result?.error) {
        logger.warn('スクリーンショット取得エラー', { siteId, error: result.error, message: result.message });
      } else {
        if (result?.pcScreenshotUrl) screenshotData.pcScreenshotUrl = result.pcScreenshotUrl;
        if (result?.mobileScreenshotUrl) screenshotData.mobileScreenshotUrl = result.mobileScreenshotUrl;
      }
    }

    // スクリーンショットが取れたら Firestore 更新
    if (Object.keys(screenshotData).length > 0) {
      await db.collection('sites').doc(siteId).update(screenshotData);
      logger.info('スクリーンショットをFirestoreに保存', { siteId, fields: Object.keys(screenshotData) });
    }
  } catch (importError) {
    logger.error('refreshSiteThumbnailsモジュール読み込みエラー', { siteId, error: importError.message });
  }

  // 結果ログ
  if (Object.keys(updateData).length === 0 && Object.keys(screenshotData).length === 0) {
    logger.warn('メタデータ・スクリーンショットの取得に失敗（WAFによるブロックの可能性）', { siteId });
  } else {
    logger.info('サイトメタデータ・スクリーンショット自動取得完了', {
      siteId,
      metaFields: Object.keys(updateData),
      screenshotFields: Object.keys(screenshotData),
    });
  }
}
