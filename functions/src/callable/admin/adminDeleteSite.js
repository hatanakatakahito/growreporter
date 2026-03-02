import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { logUserActivity, ACTIVITY_ACTIONS } from '../../utils/userActivityLogger.js';

/**
 * 管理者がサイトを削除
 * サイトドキュメントとすべての関連サブコレクション・データを削除
 *
 * @param {string} data.siteId - 削除するサイトID（必須）
 * @param {string} data.reason - 削除理由（任意）
 * @returns {Object} 削除結果
 */
export const adminDeleteSiteCallable = async (request) => {
  const uid = request.auth?.uid;

  if (!uid) {
    throw new HttpsError('unauthenticated', 'ユーザー認証が必要です');
  }

  const { siteId, reason = '' } = request.data || {};

  if (!siteId) {
    throw new HttpsError('invalid-argument', 'サイトIDが必要です');
  }

  try {
    const db = getFirestore();

    // 管理者権限チェック（adminロールのみ許可）
    const executorAdminDoc = await db.collection('adminUsers').doc(uid).get();
    if (!executorAdminDoc.exists || executorAdminDoc.data()?.role !== 'admin') {
      throw new HttpsError('permission-denied', 'この操作は管理者ロールのみ実行可能です');
    }

    // サイト存在確認
    const siteDoc = await db.collection('sites').doc(siteId).get();
    if (!siteDoc.exists) {
      throw new HttpsError('not-found', '対象のサイトが見つかりません');
    }

    const siteData = siteDoc.data();
    const siteName = siteData.siteName || '名称未設定';
    const siteUrl = siteData.siteUrl || '';
    const siteUserId = siteData.userId || '';

    // オーナー情報を取得
    let ownerName = 'Unknown';
    if (siteUserId) {
      const userDoc = await db.collection('users').doc(siteUserId).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        ownerName = (userData.lastName && userData.firstName)
          ? `${userData.lastName} ${userData.firstName}`
          : (userData.displayName || userData.email || 'Unknown');
      }
    }

    logger.info('管理者によるサイト削除開始', {
      executorId: uid,
      siteId,
      siteName,
      siteUrl,
      siteUserId,
    });

    // 1. サブコレクション: pageScrapingData
    let scrapingDataDeleted = 0;
    const pageScrapingSnap = await db.collection('sites').doc(siteId).collection('pageScrapingData').get();
    for (let i = 0; i < pageScrapingSnap.docs.length; i += 500) {
      const batch = db.batch();
      pageScrapingSnap.docs.slice(i, i + 500).forEach(d => batch.delete(d.ref));
      await batch.commit();
    }
    scrapingDataDeleted = pageScrapingSnap.size;

    // 2. サブコレクション: scrapingErrors
    let scrapingErrorsDeleted = 0;
    const errorsSnap = await db.collection('sites').doc(siteId).collection('scrapingErrors').get();
    for (let i = 0; i < errorsSnap.docs.length; i += 500) {
      const batch = db.batch();
      errorsSnap.docs.slice(i, i + 500).forEach(d => batch.delete(d.ref));
      await batch.commit();
    }
    scrapingErrorsDeleted = errorsSnap.size;

    // 3. サブコレクション: pageNotes
    let notesDeleted = 0;
    const notesSnap = await db.collection('sites').doc(siteId).collection('pageNotes').get();
    for (let i = 0; i < notesSnap.docs.length; i += 500) {
      const batch = db.batch();
      notesSnap.docs.slice(i, i + 500).forEach(d => batch.delete(d.ref));
      await batch.commit();
    }
    notesDeleted = notesSnap.size;

    // 4. サブコレクション: aiAnalysisCache
    let aiCacheDeleted = 0;
    const cacheSnap = await db.collection('sites').doc(siteId).collection('aiAnalysisCache').get();
    for (let i = 0; i < cacheSnap.docs.length; i += 500) {
      const batch = db.batch();
      cacheSnap.docs.slice(i, i + 500).forEach(d => batch.delete(d.ref));
      await batch.commit();
    }
    aiCacheDeleted = cacheSnap.size;

    // 5. サブコレクション: alerts
    let alertsDeleted = 0;
    const alertsSnap = await db.collection('sites').doc(siteId).collection('alerts').get();
    for (let i = 0; i < alertsSnap.docs.length; i += 500) {
      const batch = db.batch();
      alertsSnap.docs.slice(i, i + 500).forEach(d => batch.delete(d.ref));
      await batch.commit();
    }
    alertsDeleted = alertsSnap.size;

    // 6. サブコレクション: improvements
    let improvementsDeleted = 0;
    const improvementsSnap = await db.collection('sites').doc(siteId).collection('improvements').get();
    for (let i = 0; i < improvementsSnap.docs.length; i += 500) {
      const batch = db.batch();
      improvementsSnap.docs.slice(i, i + 500).forEach(d => batch.delete(d.ref));
      await batch.commit();
    }
    improvementsDeleted = improvementsSnap.size;

    // 7. 関連コレクション: scrapingProgress
    const progressRef = db.collection('scrapingProgress').doc(siteId);
    let scrapingProgressDeleted = 0;
    if ((await progressRef.get()).exists) {
      await progressRef.delete();
      scrapingProgressDeleted = 1;
    }

    // 8. 関連コレクション: scrapingJobs
    let scrapingJobsDeleted = 0;
    const jobsSnap = await db.collection('scrapingJobs').where('siteId', '==', siteId).get();
    for (let i = 0; i < jobsSnap.docs.length; i += 500) {
      const batch = db.batch();
      jobsSnap.docs.slice(i, i + 500).forEach(d => batch.delete(d.ref));
      await batch.commit();
    }
    scrapingJobsDeleted = jobsSnap.size;

    // 9. 関連コレクション: api_cache（サイトに紐づくキャッシュ）
    let apiCacheDeleted = 0;
    const apiCacheSnap = await db.collection('api_cache').where('siteId', '==', siteId).get();
    for (let i = 0; i < apiCacheSnap.docs.length; i += 500) {
      const batch = db.batch();
      apiCacheSnap.docs.slice(i, i + 500).forEach(d => batch.delete(d.ref));
      await batch.commit();
    }
    apiCacheDeleted = apiCacheSnap.size;

    // 10. サイトドキュメント自体を削除
    await db.collection('sites').doc(siteId).delete();

    logger.info('管理者によるサイト削除完了', {
      executorId: uid,
      siteId,
      siteName,
      deletedData: {
        pageScrapingData: scrapingDataDeleted,
        scrapingErrors: scrapingErrorsDeleted,
        pageNotes: notesDeleted,
        aiAnalysisCache: aiCacheDeleted,
        alerts: alertsDeleted,
        improvements: improvementsDeleted,
        scrapingProgress: scrapingProgressDeleted,
        scrapingJobs: scrapingJobsDeleted,
        apiCache: apiCacheDeleted,
      },
    });

    // アクティビティログ
    const executorData = executorAdminDoc.data();
    await logUserActivity({
      userId: uid,
      userEmail: executorData?.email || '',
      userName: executorData?.displayName || '',
      action: ACTIVITY_ACTIONS.ADMIN_SITE_DELETED,
      details: {
        siteId,
        siteName,
        siteUrl,
        siteUserId,
        ownerName,
        reason,
      },
    });

    return {
      success: true,
      message: `「${siteName}」を削除しました`,
      deletedData: {
        pageScrapingData: scrapingDataDeleted,
        scrapingErrors: scrapingErrorsDeleted,
        pageNotes: notesDeleted,
        aiAnalysisCache: aiCacheDeleted,
        alerts: alertsDeleted,
        improvements: improvementsDeleted,
        scrapingProgress: scrapingProgressDeleted,
        scrapingJobs: scrapingJobsDeleted,
        apiCache: apiCacheDeleted,
      },
    };

  } catch (error) {
    logger.error('管理者サイト削除エラー', {
      error: error.message,
      stack: error.stack,
      executorId: uid,
      siteId,
    });

    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError('internal', 'サイトの削除に失敗しました: ' + error.message);
  }
};
