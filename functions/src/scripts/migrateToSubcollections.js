import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';

/**
 * ルートコレクションから sites/{siteId}/<サブコレクション> へデータをコピーするマイグレーション
 * 実行: migrateData callable で migrationType: 'migrateToSubcollections' または Node で直接実行
 */
export async function migrateToSubcollections() {
  const db = getFirestore();
  const stats = { improvements: 0, pageNotes: 0, pageScrapingData: 0, pageScrapingMeta: 0, scrapingProgress: 0, scrapingErrors: 0, aiAnalysisCache: 0, aiSummaries: 0 };

  try {
    // 1. improvements: siteId でグループ化して sites/{siteId}/improvements にコピー
    const improvementsSnap = await db.collection('improvements').get();
    const improvementsBySite = new Map();
    improvementsSnap.docs.forEach((d) => {
      const siteId = d.data().siteId;
      if (!siteId) return;
      if (!improvementsBySite.has(siteId)) improvementsBySite.set(siteId, []);
      improvementsBySite.get(siteId).push({ id: d.id, data: d.data() });
    });
    for (const [siteId, items] of improvementsBySite) {
      const col = db.collection('sites').doc(siteId).collection('improvements');
      for (const { id, data } of items) {
        const { siteId: _s, ...rest } = data;
        await col.doc(id).set(rest, { merge: true });
        stats.improvements++;
      }
    }

    // 2. pageNotes
    const pageNotesSnap = await db.collection('pageNotes').get();
    const notesBySite = new Map();
    pageNotesSnap.docs.forEach((d) => {
      const siteId = d.data().siteId;
      if (!siteId) return;
      if (!notesBySite.has(siteId)) notesBySite.set(siteId, []);
      notesBySite.get(siteId).push({ id: d.id, data: d.data() });
    });
    for (const [siteId, items] of notesBySite) {
      const col = db.collection('sites').doc(siteId).collection('pageNotes');
      for (const { id, data } of items) {
        await col.doc(id).set(data, { merge: true });
        stats.pageNotes++;
      }
    }

    // 3. pageScrapingData
    const scrapingDataSnap = await db.collection('pageScrapingData').get();
    const dataBySite = new Map();
    scrapingDataSnap.docs.forEach((d) => {
      const siteId = d.data().siteId;
      if (!siteId) return;
      if (!dataBySite.has(siteId)) dataBySite.set(siteId, []);
      dataBySite.get(siteId).push({ id: d.id, data: d.data() });
    });
    for (const [siteId, items] of dataBySite) {
      const col = db.collection('sites').doc(siteId).collection('pageScrapingData');
      for (const { id, data } of items) {
        const { siteId: _s, ...rest } = data;
        await col.doc(id).set(rest, { merge: true });
        stats.pageScrapingData++;
      }
    }

    // 4. pageScrapingMeta (doc id = siteId) -> sites/{siteId}/pageScrapingMeta/default
    const metaSnap = await db.collection('pageScrapingMeta').get();
    for (const d of metaSnap.docs) {
      const siteId = d.id;
      const data = d.data();
      const { siteId: _s, ...rest } = data;
      await db.collection('sites').doc(siteId).collection('pageScrapingMeta').doc('default').set(rest, { merge: true });
      stats.pageScrapingMeta++;
    }

    // 5. scrapingProgress (doc id = siteId) -> sites/{siteId}/scrapingProgress/default
    const progressSnap = await db.collection('scrapingProgress').get();
    for (const d of progressSnap.docs) {
      const siteId = d.id;
      const data = d.data();
      const { siteId: _s, ...rest } = data;
      await db.collection('sites').doc(siteId).collection('scrapingProgress').doc('default').set(rest, { merge: true });
      stats.scrapingProgress++;
    }

    // 6. scrapingErrors
    const errorsSnap = await db.collection('scrapingErrors').get();
    const errorsBySite = new Map();
    errorsSnap.docs.forEach((d) => {
      const siteId = d.data().siteId;
      if (!siteId) return;
      if (!errorsBySite.has(siteId)) errorsBySite.set(siteId, []);
      errorsBySite.get(siteId).push({ id: d.id, data: d.data() });
    });
    for (const [siteId, items] of errorsBySite) {
      const col = db.collection('sites').doc(siteId).collection('scrapingErrors');
      for (const { id, data } of items) {
        const { siteId: _s, ...rest } = data;
        await col.doc(id).set(rest, { merge: true });
        stats.scrapingErrors++;
      }
    }

    // 7. aiAnalysisCache
    const aiCacheSnap = await db.collection('aiAnalysisCache').get();
    const aiCacheBySite = new Map();
    aiCacheSnap.docs.forEach((d) => {
      const siteId = d.data().siteId;
      if (!siteId) return;
      if (!aiCacheBySite.has(siteId)) aiCacheBySite.set(siteId, []);
      aiCacheBySite.get(siteId).push({ id: d.id, data: d.data() });
    });
    for (const [siteId, items] of aiCacheBySite) {
      const col = db.collection('sites').doc(siteId).collection('aiAnalysisCache');
      for (const { id, data } of items) {
        await col.doc(id).set(data, { merge: true });
        stats.aiAnalysisCache++;
      }
    }

    // 8. aiSummaries
    const aiSumSnap = await db.collection('aiSummaries').get();
    const aiSumBySite = new Map();
    aiSumSnap.docs.forEach((d) => {
      const siteId = d.data().siteId;
      if (!siteId) return;
      if (!aiSumBySite.has(siteId)) aiSumBySite.set(siteId, []);
      aiSumBySite.get(siteId).push({ id: d.id, data: d.data() });
    });
    for (const [siteId, items] of aiSumBySite) {
      const col = db.collection('sites').doc(siteId).collection('aiSummaries');
      for (const { id, data } of items) {
        await col.doc(id).set(data, { merge: true });
        stats.aiSummaries++;
      }
    }

    logger.info('migrateToSubcollections complete', stats);
    return { success: true, ...stats };
  } catch (err) {
    logger.error('migrateToSubcollections failed', err);
    throw err;
  }
}
