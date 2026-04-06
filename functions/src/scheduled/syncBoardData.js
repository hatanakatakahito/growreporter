import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { syncFromBoard } from '../callable/admin/syncBoardInquiry.js';

/**
 * board自動同期（毎日0時実行）
 * active / estimate_created の問い合わせに対してboardから最新情報を取得
 */
export async function syncBoardDataHandler() {
  const db = getFirestore();

  try {
    const snapshot = await db.collection('upgradeInquiries')
      .where('status', 'in', ['estimate_created', 'contract_sent', 'active'])
      .get();

    if (snapshot.empty) {
      logger.info('[boardSync] 同期対象なし');
      return;
    }

    let syncedCount = 0;
    let errorCount = 0;

    for (const doc of snapshot.docs) {
      const data = doc.data();
      if (!data.boardProjectId) continue;

      try {
        await syncFromBoard(db, doc.id, data);
        syncedCount++;
      } catch (error) {
        logger.warn('[boardSync] 同期エラー', { inquiryId: doc.id, error: error.message });
        errorCount++;
      }

      // レート制限対応: 各同期間に500ms待機
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    logger.info('[boardSync] 自動同期完了', {
      total: snapshot.size,
      synced: syncedCount,
      errors: errorCount,
    });
  } catch (error) {
    logger.error('[boardSync] 自動同期エラー', { error: error.message });
  }
}
