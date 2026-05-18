import { logger } from 'firebase-functions/v2';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

/**
 * レート制限イベントの古いエントリをクリーンアップする scheduled function
 *
 * 目的:
 *   - functions/src/utils/rateLimiter.js が rate_limits/{uid}_{action}/events/{eventId} に
 *     timestamp 付きで履歴を書き込む。
 *   - 期限切れエントリを削除しないと、利用が増えるほど Firestore のドキュメント数が線形に
 *     増えて読取コストが上がる。
 *   - 24 時間以上経過したイベントは判定に使わないので削除して良い。
 *
 * 実装:
 *   - 毎日 03:30 (Asia/Tokyo) に実行
 *   - rate_limits/{docId}/events を collectionGroup で走査し、24h 前より古い
 *     timestamp を持つ document を一括削除
 *   - 1 回の実行で最大 5000 件まで（過大な実行時間を防ぐため）。
 *     超過する場合は次回実行で続きを処理。
 */

const RETENTION_HOURS = 24;
const MAX_DELETES_PER_RUN = 5000;
const BATCH_SIZE = 450; // Firestore batch 上限 500 未満

export async function cleanupRateLimitsHandler() {
  const db = getFirestore();
  const cutoff = new Date(Date.now() - RETENTION_HOURS * 60 * 60 * 1000);
  const cutoffTs = Timestamp.fromDate(cutoff);

  logger.info('[cleanupRateLimits] 開始', {
    cutoff: cutoff.toISOString(),
    retentionHours: RETENTION_HOURS,
  });

  let deleted = 0;
  let lastDocSnap = null;

  while (deleted < MAX_DELETES_PER_RUN) {
    let query = db
      .collectionGroup('events')
      .where('timestamp', '<', cutoffTs)
      .orderBy('timestamp')
      .limit(BATCH_SIZE);
    if (lastDocSnap) {
      query = query.startAfter(lastDocSnap);
    }

    const snap = await query.get();
    if (snap.empty) break;

    const batch = db.batch();
    snap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();

    deleted += snap.size;
    lastDocSnap = snap.docs[snap.docs.length - 1];

    if (snap.size < BATCH_SIZE) break;
  }

  logger.info('[cleanupRateLimits] 完了', { deleted });
  return { deleted };
}
