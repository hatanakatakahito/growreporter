import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { logUserActivity, ACTIVITY_ACTIONS } from '../utils/userActivityLogger.js';

/**
 * ユーザーが自分のサイトを削除
 * サイトドキュメントとすべての関連サブコレクション・データを削除
 *
 * @param {string} data.siteId - 削除するサイトID（必須）
 * @returns {Object} 削除結果
 */
export const deleteSiteCallable = async (request) => {
  const uid = request.auth?.uid;

  if (!uid) {
    throw new HttpsError('unauthenticated', 'ユーザー認証が必要です');
  }

  const { siteId } = request.data || {};

  if (!siteId) {
    throw new HttpsError('invalid-argument', 'サイトIDが必要です');
  }

  try {
    const db = getFirestore();

    // サイト存在確認
    const siteDoc = await db.collection('sites').doc(siteId).get();
    if (!siteDoc.exists) {
      throw new HttpsError('not-found', 'サイトが見つかりません');
    }

    const siteData = siteDoc.data();

    // 権限チェック: サイトオーナーまたは同一アカウントのオーナー
    if (siteData.userId !== uid) {
      // メンバーの場合、アカウントオーナーかチェック
      const userDoc = await db.collection('users').doc(uid).get();
      const userData = userDoc.exists ? userDoc.data() : {};
      const memberships = userData.memberships || {};
      const memberEntry = memberships[siteData.userId];
      if (!memberEntry || memberEntry.role !== 'owner') {
        throw new HttpsError('permission-denied', 'このサイトを削除する権限がありません');
      }
    }

    const siteName = siteData.siteName || '名称未設定';
    const siteUrl = siteData.siteUrl || '';

    logger.info('ユーザーによるサイト削除開始', { uid, siteId, siteName });

    // サブコレクション削除（バッチ処理）
    const subCollections = ['pageScrapingData', 'scrapingErrors', 'pageNotes', 'aiAnalysisCache', 'alerts', 'improvements', 'pageScrapingMeta'];
    let totalDeleted = 0;

    for (const collName of subCollections) {
      const snap = await db.collection('sites').doc(siteId).collection(collName).get();
      for (let i = 0; i < snap.docs.length; i += 500) {
        const batch = db.batch();
        snap.docs.slice(i, i + 500).forEach(d => batch.delete(d.ref));
        await batch.commit();
      }
      totalDeleted += snap.size;
    }

    // 関連コレクション: scrapingProgress
    const progressRef = db.collection('scrapingProgress').doc(siteId);
    if ((await progressRef.get()).exists) {
      await progressRef.delete();
    }

    // 関連コレクション: scrapingJobs
    const jobsSnap = await db.collection('scrapingJobs').where('siteId', '==', siteId).get();
    for (let i = 0; i < jobsSnap.docs.length; i += 500) {
      const batch = db.batch();
      jobsSnap.docs.slice(i, i + 500).forEach(d => batch.delete(d.ref));
      await batch.commit();
    }

    // 関連コレクション: api_cache
    const apiCacheSnap = await db.collection('api_cache').where('siteId', '==', siteId).get();
    for (let i = 0; i < apiCacheSnap.docs.length; i += 500) {
      const batch = db.batch();
      apiCacheSnap.docs.slice(i, i + 500).forEach(d => batch.delete(d.ref));
      await batch.commit();
    }

    // サイトドキュメント自体を削除
    await db.collection('sites').doc(siteId).delete();

    logger.info('ユーザーによるサイト削除完了', { uid, siteId, siteName });

    // アクティビティログ
    await logUserActivity({
      userId: uid,
      userEmail: request.auth.token.email || '',
      userName: '',
      action: ACTIVITY_ACTIONS.SITE_DELETED,
      details: { siteId, siteName, siteUrl },
    });

    return {
      success: true,
      message: `「${siteName}」を削除しました`,
    };

  } catch (error) {
    logger.error('サイト削除エラー', {
      error: error.message,
      stack: error.stack,
      uid,
      siteId,
    });

    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError('internal', 'サイトの削除に失敗しました: ' + error.message);
  }
};
