import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getFunctions } from 'firebase-admin/functions';
import { logger } from 'firebase-functions/v2';
import { fetchMetadataCallable } from '../callable/fetchMetadata.js';
import { captureScreenshotCallable } from '../callable/captureScreenshot.js';

/**
 * サイト作成・更新時のトリガー
 * メタデータとスクリーンショットを自動取得
 */
export const onSiteChangedTrigger = onDocumentWritten(
  {
    document: 'sites/{siteId}',
    region: 'asia-northeast1',
    memory: '2GiB',
    timeoutSeconds: 540,
  },
  async (event) => {
    const siteId = event.params.siteId;
    const beforeData = event.data?.before?.data();
    const afterData = event.data?.after?.data();

    // ドキュメントが削除された場合は何もしない
    if (!afterData) {
      logger.info('サイトが削除されたためスキップ', { siteId });
      return;
    }

    const siteUrl = afterData.siteUrl;

    // URLがない場合はスキップ
    if (!siteUrl) {
      logger.info('サイトURLがないためスキップ', { siteId });
      return;
    }

    // 新規作成チェック
    const isNewSite = !beforeData;

    // 新規作成時のみ処理（URL変更時は実行しない）
    if (!isNewSite) {
      logger.info('既存サイトの更新のためスキップ', { siteId });
      return;
    }

    logger.info('サイトメタデータ自動取得開始', { 
      siteId, 
      siteUrl,
      isNewSite,
      hasExistingMeta: !!(afterData.metaTitle || afterData.metaDescription),
      hasExistingScreenshots: !!(afterData.pcScreenshotUrl || afterData.mobileScreenshotUrl),
    });

    const db = getFirestore();
    const updateData = {};

    try {
      // 1. メタデータ取得（既に存在する場合はスキップ）
      if (!afterData.metaTitle && !afterData.metaDescription) {
        logger.info('メタデータ取得開始', { siteId, siteUrl });
        try {
          const metadataResult = await fetchMetadataCallable({ data: { siteUrl } });
          const metadata = metadataResult.metadata;
          
          if (metadata.title || metadata.ogTitle) {
            updateData.metaTitle = metadata.title || metadata.ogTitle;
          }
          if (metadata.description || metadata.ogDescription) {
            updateData.metaDescription = metadata.description || metadata.ogDescription;
          }
          
          logger.info('メタデータ取得完了', { 
            siteId,
            hasTitle: !!updateData.metaTitle,
            hasDescription: !!updateData.metaDescription,
          });
        } catch (metadataError) {
          logger.error('メタデータ取得エラー', { 
            siteId,
            error: metadataError.message,
          });
          // エラーは無視して続行
        }
      } else {
        logger.info('メタデータは既に存在するためスキップ', { siteId });
      }

      // サイトオーナーの uid を渡す（captureScreenshot は request.auth 必須のため）
      const ownerUid = afterData.userId || null;

      // 2. スクショ取得（STEP1当初と同じ: PC→モバイルの順。既存ありはスキップ）
      if (!afterData.pcScreenshotUrl) {
        logger.info('PC版スクリーンショット取得開始', { siteId, siteUrl });
        try {
          const pcResult = await captureScreenshotCallable({
            data: { siteUrl, deviceType: 'pc' },
            auth: ownerUid ? { uid: ownerUid } : undefined,
          });
          if (pcResult?.imageUrl) updateData.pcScreenshotUrl = pcResult.imageUrl;
          logger.info('PC版スクリーンショット取得完了', { siteId });
        } catch (pcError) {
          logger.error('PC版スクリーンショット取得エラー', { siteId, error: pcError.message });
        }
      } else {
        logger.info('PC版スクリーンショットは既に存在するためスキップ', { siteId });
      }

      if (!afterData.mobileScreenshotUrl) {
        logger.info('モバイル版スクリーンショット取得開始', { siteId, siteUrl });
        try {
          const mobileResult = await captureScreenshotCallable({
            data: { siteUrl, deviceType: 'mobile' },
            auth: ownerUid ? { uid: ownerUid } : undefined,
          });
          if (mobileResult?.imageUrl) updateData.mobileScreenshotUrl = mobileResult.imageUrl;
          logger.info('モバイル版スクリーンショット取得完了', { siteId });
        } catch (mobileError) {
          logger.error('モバイル版スクリーンショット取得エラー', { siteId, error: mobileError.message });
        }
      } else {
        logger.info('モバイル版スクリーンショットは既に存在するためスキップ', { siteId });
      }

      // 4. 取得できたデータがあればFirestoreを更新
      if (Object.keys(updateData).length > 0) {
        await db.collection('sites').doc(siteId).update(updateData);
        
        logger.info('サイトメタデータ自動取得完了', { 
          siteId,
          updatedFields: Object.keys(updateData),
        });
      } else {
        logger.warn('取得できたデータがありません', { siteId });
      }

    } catch (error) {
      logger.error('サイトメタデータ自動取得エラー', { 
        siteId,
        error: error.message,
      });
      // トリガーのエラーは無視（サイト登録自体は成功）
    }
}

export const onSiteChangedTrigger = onDocumentWritten(
  onSiteChangedTriggerConfig,
  onSiteChangedHandler
);
