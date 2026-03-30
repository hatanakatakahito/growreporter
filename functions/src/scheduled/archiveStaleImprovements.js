/**
 * 鮮度管理・自動アーカイブ（日次実行）
 *
 * - draft ステータスの提案で createdAt から90日超のものを archived に変更
 * - relevanceScore は段階的:
 *   30日まで: 100, 31-60日: 50, 61-90日: 25, 90日超: 0（アーカイブ）
 */
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';

const ARCHIVE_THRESHOLD_DAYS = 90;

/**
 * relevanceScore を日数から算出
 */
function calcRelevanceScore(daysSinceCreation) {
  if (daysSinceCreation <= 30) return 100;
  if (daysSinceCreation <= 60) return 50;
  if (daysSinceCreation <= 90) return 25;
  return 0;
}

export async function archiveStaleImprovementsHandler() {
  const db = getFirestore();
  const now = Date.now();

  logger.info('[ArchiveStale] 鮮度チェック・自動アーカイブ開始');

  // 全サイトの draft 提案を取得
  const sitesSnap = await db.collection('sites').get();
  let totalUpdated = 0;
  let totalArchived = 0;

  for (const siteDoc of sitesSnap.docs) {
    const improvementsSnap = await db.collection('sites').doc(siteDoc.id)
      .collection('improvements')
      .where('status', '==', 'draft')
      .get();

    if (improvementsSnap.empty) continue;

    let batch = db.batch();
    let batchCount = 0;

    for (const impDoc of improvementsSnap.docs) {
      const data = impDoc.data();
      const createdAt = data.createdAt?.toDate?.() || (data.createdAt ? new Date(data.createdAt) : null);
      if (!createdAt) continue;

      const daysSince = Math.floor((now - createdAt.getTime()) / (24 * 60 * 60 * 1000));
      const score = calcRelevanceScore(daysSince);

      if (daysSince > ARCHIVE_THRESHOLD_DAYS) {
        // 自動アーカイブ
        batch.update(impDoc.ref, {
          status: 'archived',
          relevanceScore: 0,
          isStale: true,
          archivedAt: FieldValue.serverTimestamp(),
          archivedReason: 'auto_stale',
        });
        totalArchived++;
      } else {
        // relevanceScore のみ更新
        const currentScore = data.relevanceScore;
        if (currentScore !== score) {
          batch.update(impDoc.ref, {
            relevanceScore: score,
            isStale: score <= 25,
          });
        }
      }

      batchCount++;
      if (batchCount >= 400) {
        totalUpdated += batchCount;
        await batch.commit();
        batch = db.batch();
        batchCount = 0;
      }
    }

    if (batchCount > 0) {
      await batch.commit();
      totalUpdated += batchCount;
    }
  }

  logger.info('[ArchiveStale] 完了', { totalUpdated, totalArchived });
  return { totalUpdated, totalArchived };
}

export const archiveStaleImprovements = onSchedule(
  {
    schedule: '0 5 * * *', // 毎日 5:00 JST
    timeZone: 'Asia/Tokyo',
    region: 'asia-northeast1',
    memory: '256MiB',
    timeoutSeconds: 120,
  },
  archiveStaleImprovementsHandler
);
