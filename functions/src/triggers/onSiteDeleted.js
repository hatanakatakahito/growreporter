import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';

/**
 * サイト削除時のクリーンアップ処理
 *
 * - viewer の users.allowedSiteIds 配列から、削除された siteId を自動的に取り除く
 *   (孤立した siteId を残さないため)
 *
 * @param {Object} event - Firestore onDocumentDeleted イベント
 */
export async function onSiteDeletedHandler(event) {
  const siteId = event.params?.siteId;
  if (!siteId) {
    logger.warn('[onSiteDeleted] siteId が取得できませんでした', { params: event.params });
    return;
  }

  try {
    const db = getFirestore();

    // allowedSiteIds に当該 siteId を含む viewer を全て検索して除去
    const affectedUsersSnap = await db.collection('users')
      .where('allowedSiteIds', 'array-contains', siteId)
      .get();

    if (affectedUsersSnap.empty) {
      logger.info('[onSiteDeleted] allowedSiteIds に該当する viewer なし', { siteId });
      return;
    }

    const CHUNK = 450;
    const docs = affectedUsersSnap.docs;
    for (let i = 0; i < docs.length; i += CHUNK) {
      const batch = db.batch();
      docs.slice(i, i + CHUNK).forEach((doc) => {
        batch.update(doc.ref, {
          allowedSiteIds: FieldValue.arrayRemove(siteId),
          updatedAt: FieldValue.serverTimestamp(),
        });
      });
      await batch.commit();
    }

    logger.info('[onSiteDeleted] viewer の allowedSiteIds から siteId を自動除去', {
      siteId,
      affectedCount: docs.length,
    });
  } catch (error) {
    logger.error('[onSiteDeleted] クリーンアップ失敗', {
      siteId,
      error: error?.message,
    });
    // トリガーは失敗してもサイト削除自体は完了済み。再試行はしない（手動修復）
  }
}
