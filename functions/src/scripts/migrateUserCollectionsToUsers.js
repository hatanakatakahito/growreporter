/**
 * ルートのユーザー関連コレクションを users/{uid}/... にコピーするマイグレーション
 * 実行: migrateData callable で migrationType: 'migrateUserCollectionsToUsers' または Node で直接実行
 */
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';

export async function migrateUserCollectionsToUsers() {
  const db = getFirestore();
  const stats = { oauth_tokens: 0, planChangeHistory: 0, memoReadStatus: 0, userAlertReads: 0, reports: 0, customLimits: 0 };

  try {
    // 1. oauth_tokens: user_uid でグループ化 → users/{user_uid}/oauth_tokens/{id}
    const tokensSnap = await db.collection('oauth_tokens').get();
    const tokensByUser = new Map();
    tokensSnap.docs.forEach((d) => {
      const uid = d.data().user_uid;
      if (!uid) return;
      if (!tokensByUser.has(uid)) tokensByUser.set(uid, []);
      tokensByUser.get(uid).push({ id: d.id, data: d.data() });
    });
    for (const [uid, items] of tokensByUser) {
      const col = db.collection('users').doc(uid).collection('oauth_tokens');
      for (const { id, data } of items) {
        await col.doc(id).set(data, { merge: true });
        stats.oauth_tokens++;
      }
    }

    // 2. planChangeHistory: userId でグループ化 → users/{userId}/planChangeHistory/{id}
    const planSnap = await db.collection('planChangeHistory').get();
    const planByUser = new Map();
    planSnap.docs.forEach((d) => {
      const uid = d.data().userId;
      if (!uid) return;
      if (!planByUser.has(uid)) planByUser.set(uid, []);
      planByUser.get(uid).push({ id: d.id, data: d.data() });
    });
    for (const [uid, items] of planByUser) {
      const col = db.collection('users').doc(uid).collection('planChangeHistory');
      for (const { id, data } of items) {
        await col.doc(id).set(data, { merge: true });
        stats.planChangeHistory++;
      }
    }

    // 3. memoReadStatus: data.userId でグループ化 → users/{userId}/memoReadStatus/{id}
    const memoSnap = await db.collection('memoReadStatus').get();
    const memoByUser = new Map();
    memoSnap.docs.forEach((d) => {
      const uid = d.data().userId;
      if (!uid) return;
      if (!memoByUser.has(uid)) memoByUser.set(uid, []);
      memoByUser.get(uid).push({ id: d.id, data: d.data() });
    });
    for (const [uid, items] of memoByUser) {
      const col = db.collection('users').doc(uid).collection('memoReadStatus');
      for (const { id, data } of items) {
        await col.doc(id).set(data, { merge: true });
        stats.memoReadStatus++;
      }
    }

    // 4. userAlertReads: data.userId でグループ化 → users/{userId}/userAlertReads/{id}
    const alertSnap = await db.collection('userAlertReads').get();
    const alertByUser = new Map();
    alertSnap.docs.forEach((d) => {
      const uid = d.data().userId;
      if (!uid) return;
      if (!alertByUser.has(uid)) alertByUser.set(uid, []);
      alertByUser.get(uid).push({ id: d.id, data: d.data() });
    });
    for (const [uid, items] of alertByUser) {
      const col = db.collection('users').doc(uid).collection('userAlertReads');
      for (const { id, data } of items) {
        await col.doc(id).set(data, { merge: true });
        stats.userAlertReads++;
      }
    }

    // 5. reports: data.userId でグループ化 → users/{userId}/reports/{id}
    const reportsSnap = await db.collection('reports').get();
    const reportsByUser = new Map();
    reportsSnap.docs.forEach((d) => {
      const uid = d.data().userId;
      if (!uid) return;
      if (!reportsByUser.has(uid)) reportsByUser.set(uid, []);
      reportsByUser.get(uid).push({ id: d.id, data: d.data() });
    });
    for (const [uid, items] of reportsByUser) {
      const col = db.collection('users').doc(uid).collection('reports');
      for (const { id, data } of items) {
        await col.doc(id).set(data, { merge: true });
        stats.reports++;
      }
    }

    // 6. customLimits: doc id = userId → users/{userId}/customLimits/{userId}
    const limitsSnap = await db.collection('customLimits').get();
    for (const d of limitsSnap.docs) {
      const uid = d.id;
      const data = d.data();
      await db.collection('users').doc(uid).collection('customLimits').doc(uid).set(data, { merge: true });
      stats.customLimits++;
    }

    logger.info('migrateUserCollectionsToUsers complete', stats);
    return { success: true, ...stats };
  } catch (err) {
    logger.error('migrateUserCollectionsToUsers failed', err);
    throw err;
  }
}
