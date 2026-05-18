/**
 * 毎月 1 日 03:00 に全 GSC 連携サイトの AI 分類キャッシュを破棄
 * 次回 fetchGSCKeywordsV2Data 呼び出し時に新月の分類が再生成される
 */

import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions/v2';
import { getFirestore } from 'firebase-admin/firestore';

export const monthlyKeywordReclassify = onSchedule(
  {
    schedule: '0 3 1 * *', // 毎月 1 日 03:00 (Asia/Tokyo) — 月初負荷を分散
    timeZone: 'Asia/Tokyo',
    region: 'asia-northeast1',
    memory: '256MiB',
    timeoutSeconds: 300,
  },
  async () => {
    logger.info('[monthlyKeywordReclassify] 月次 AI 分類リフレッシュ開始');
    const db = getFirestore();

    const now = new Date();
    const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;

    try {
      // GSC 連携済みサイトを取得
      const sitesSnapshot = await db.collection('sites').get();
      let cleared = 0;
      let skipped = 0;
      let apiCacheClearedTotal = 0;

      for (const siteDoc of sitesSnapshot.docs) {
        const siteData = siteDoc.data();
        if (!siteData.gscSiteUrl || !siteData.gscOauthTokenId) {
          skipped++;
          continue;
        }
        const siteId = siteDoc.id;

        try {
          // 1. 当月の分類キャッシュを削除（無ければスキップされるだけ）
          await db
            .collection('gscKeywordClassifyCache')
            .doc(`${siteId}_${yyyymm}`)
            .delete();

          // 2. gsc-kw-v2 系の api_cache を削除（強制 cold cache）
          const apiCacheSnap = await db
            .collection('api_cache')
            .where('siteId', '==', siteId)
            .get();
          const targets = apiCacheSnap.docs.filter((doc) => doc.id.startsWith('gsc-kw-v2_'));
          if (targets.length > 0) {
            const batch = db.batch();
            targets.forEach((doc) => batch.delete(doc.ref));
            await batch.commit();
          }
          apiCacheClearedTotal += targets.length;
          cleared++;
          logger.info(`[monthlyKeywordReclassify] cleared: ${siteId}（api_cache ${targets.length} 件）`);
        } catch (e) {
          logger.warn(`[monthlyKeywordReclassify] error for ${siteId}:`, { error: e.message });
        }
      }

      logger.info(
        `[monthlyKeywordReclassify] 完了: ${cleared} 件クリア / ${skipped} 件スキップ / api_cache 計 ${apiCacheClearedTotal} 件削除`
      );
    } catch (error) {
      logger.error('[monthlyKeywordReclassify] エラー:', error);
      throw error;
    }
  }
);
