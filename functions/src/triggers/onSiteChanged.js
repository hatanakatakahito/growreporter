import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { fetchMetadataCallable } from '../callable/fetchMetadata.js';

/**
 * サイト登録完了時のハンドラー
 * メタデータとスクリーンショットを自動取得
 * index.js の onDocumentWritten トリガーから呼ばれる
 *
 * 実行条件: setupCompleted === true かつ _metaFetchDone フラグが未設定
 *
 * 重要: captureScreenshot は動的 import で分離する。
 * Chromium 関連の問題でメタデータ取得まで巻き添えにならないようにするため。
 */
export async function onSiteChangedHandler(event) {
  const siteId = event.params.siteId;
  const afterData = event.data?.after?.data();

  // ドキュメントが削除された場合は何もしない
  if (!afterData) return;

  // 登録完了していないサイトはスキップ
  if (afterData.setupCompleted !== true) return;

  // 既に処理済みならスキップ
  if (afterData._metaFetchDone) return;

  const siteUrl = afterData.siteUrl;
  if (!siteUrl) {
    logger.info('サイトURLがないためスキップ', { siteId });
    return;
  }

  logger.info('サイトメタデータ自動取得開始', { siteId, siteUrl });

  const db = getFirestore();

  // 処理中フラグを先に立てる（再トリガー防止）
  await db.collection('sites').doc(siteId).update({ _metaFetchDone: true });

  const updateData = {};

  // ========================================
  // 1. メタデータ取得（Chromium不要・軽量）
  //    先に実行して即座にFirestore保存する
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
      logger.error('メタデータ取得エラー', { siteId, error: metadataError.message });
    }
  }

  // メタデータが取れたら先にFirestore保存（スクショ失敗に巻き込まれないように）
  if (Object.keys(updateData).length > 0) {
    await db.collection('sites').doc(siteId).update(updateData);
    logger.info('メタデータをFirestoreに保存', { siteId, fields: Object.keys(updateData) });
  }

  // ========================================
  // 2. スクリーンショット取得（Chromium使用・重い）
  //    動的importで分離し、失敗してもメタデータには影響しない
  // ========================================
  const ownerUid = afterData.userId || null;
  const screenshotData = {};

  try {
    // 動的importでChromium関連モジュールを分離
    const { captureScreenshotCallable } = await import('../callable/captureScreenshot.js');

    // PC版スクリーンショット取得
    if (!afterData.pcScreenshotUrl) {
      logger.info('PC版スクリーンショット取得開始', { siteId, siteUrl });
      try {
        const pcResult = await captureScreenshotCallable({
          data: { siteUrl, deviceType: 'pc' },
          auth: ownerUid ? { uid: ownerUid } : undefined,
        });
        if (pcResult?.imageUrl) screenshotData.pcScreenshotUrl = pcResult.imageUrl;
        logger.info('PC版スクリーンショット取得完了', { siteId, hasUrl: !!pcResult?.imageUrl });
      } catch (pcError) {
        logger.error('PC版スクリーンショット取得エラー', { siteId, error: pcError.message });
      }
    }

    // モバイル版スクリーンショット取得
    if (!afterData.mobileScreenshotUrl) {
      logger.info('モバイル版スクリーンショット取得開始', { siteId, siteUrl });
      try {
        const mobileResult = await captureScreenshotCallable({
          data: { siteUrl, deviceType: 'mobile' },
          auth: ownerUid ? { uid: ownerUid } : undefined,
        });
        if (mobileResult?.imageUrl) screenshotData.mobileScreenshotUrl = mobileResult.imageUrl;
        logger.info('モバイル版スクリーンショット取得完了', { siteId, hasUrl: !!mobileResult?.imageUrl });
      } catch (mobileError) {
        logger.error('モバイル版スクリーンショット取得エラー', { siteId, error: mobileError.message });
      }
    }

    // スクリーンショットが取れたらFirestore更新
    if (Object.keys(screenshotData).length > 0) {
      await db.collection('sites').doc(siteId).update(screenshotData);
      logger.info('スクリーンショットをFirestoreに保存', { siteId, fields: Object.keys(screenshotData) });
    }
  } catch (importError) {
    logger.error('captureScreenshotモジュール読み込みエラー', { siteId, error: importError.message });
  }

  // 何も取得できなかった場合はフラグをリセット
  if (Object.keys(updateData).length === 0 && Object.keys(screenshotData).length === 0) {
    logger.warn('取得できたデータがありません、フラグをリセット', { siteId });
    try {
      await db.collection('sites').doc(siteId).update({ _metaFetchDone: false });
    } catch (_) { /* ignore */ }
  } else {
    logger.info('サイトメタデータ自動取得完了', {
      siteId,
      metaFields: Object.keys(updateData),
      screenshotFields: Object.keys(screenshotData),
    });
  }
}
