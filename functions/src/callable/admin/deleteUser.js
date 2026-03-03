import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { logger } from 'firebase-functions/v2';

/**
 * ユーザーを完全に削除
 * Firebase Authenticationとすべての関連データを削除
 * 
 * @param {Object} data - リクエストパラメータ
 * @param {string} data.targetUserId - 削除するユーザーのUID
 * @param {string} data.reason - 削除理由
 * @returns {Object} 削除結果
 */
export const deleteUserCallable = async (request) => {
  const uid = request.auth?.uid;

  if (!uid) {
    throw new HttpsError('unauthenticated', 'ユーザー認証が必要です');
  }

  const {
    targetUserId,
    reason = '',
  } = request.data || {};

  if (!targetUserId) {
    throw new HttpsError('invalid-argument', 'ユーザーIDが必要です');
  }

  if (uid === targetUserId) {
    throw new HttpsError('invalid-argument', '自分自身は削除できません');
  }

  try {
    const db = getFirestore();
    const auth = getAuth();
    
    // 実行者の管理者権限チェック（adminロールのみ許可）
    const executorAdminDoc = await db.collection('adminUsers').doc(uid).get();
    if (!executorAdminDoc.exists || executorAdminDoc.data()?.role !== 'admin') {
      throw new HttpsError('permission-denied', 'この操作は管理者ロールのみ実行可能です');
    }

    // 対象ユーザーの存在確認
    const userDoc = await db.collection('users').doc(targetUserId).get();
    if (!userDoc.exists) {
      throw new HttpsError('not-found', '対象のユーザーが見つかりません');
    }

    const userData = userDoc.data();
    const targetName = userData.name || (userData.lastName && userData.firstName
      ? `${userData.lastName} ${userData.firstName}`
      : '') || userData.displayName || userData.email || 'Unknown';

    // 実行者情報を取得
    const executorData = executorAdminDoc.data();
    const executorName = executorData.name || (executorData.lastName && executorData.firstName
      ? `${executorData.lastName} ${executorData.firstName}`
      : '') || executorData.displayName || executorData.email || 'Admin';

    logger.info('ユーザー削除開始', { 
      executorId: uid,
      targetUserId,
      targetName,
    });

    // 1. ユーザーのサイト一覧を取得
    const sitesSnapshot = await db.collection('sites')
      .where('userId', '==', targetUserId)
      .get();
    
    const siteIds = sitesSnapshot.docs.map(doc => doc.id);

    // 1a. 各サイトに紐づくスクレイピング関連データを削除（再登録時のクリーンな状態のため）
    let scrapingDataDeleted = 0;
    let scrapingProgressDeleted = 0;
    let scrapingJobsDeleted = 0;
    let scrapingErrorsDeleted = 0;
    for (const siteId of siteIds) {
      const pageScrapingSnap = await db.collection('sites').doc(siteId).collection('pageScrapingData').get();
      for (let i = 0; i < pageScrapingSnap.docs.length; i += 500) {
        const batch = db.batch();
        pageScrapingSnap.docs.slice(i, i + 500).forEach(doc => batch.delete(doc.ref));
        await batch.commit();
      }
      scrapingDataDeleted += pageScrapingSnap.size;

      const progressRef = db.collection('scrapingProgress').doc(siteId);
      if ((await progressRef.get()).exists) {
        await progressRef.delete();
        scrapingProgressDeleted += 1;
      }

      const jobsSnap = await db.collection('scrapingJobs').where('siteId', '==', siteId).get();
      for (let i = 0; i < jobsSnap.docs.length; i += 500) {
        const batch = db.batch();
        jobsSnap.docs.slice(i, i + 500).forEach(doc => batch.delete(doc.ref));
        await batch.commit();
      }
      scrapingJobsDeleted += jobsSnap.size;

      const errorsSnap = await db.collection('sites').doc(siteId).collection('scrapingErrors').get();
      for (let i = 0; i < errorsSnap.docs.length; i += 500) {
        const batch = db.batch();
        errorsSnap.docs.slice(i, i + 500).forEach(doc => batch.delete(doc.ref));
        await batch.commit();
      }
      scrapingErrorsDeleted += errorsSnap.size;
    }
    if (siteIds.length > 0) {
      logger.info('スクレイピング関連データ削除完了', {
        pageScrapingData: scrapingDataDeleted,
        scrapingProgress: scrapingProgressDeleted,
        scrapingJobs: scrapingJobsDeleted,
        scrapingErrors: scrapingErrorsDeleted,
      });
    }

    // 1c. 各サイトの pageNotes / aiAnalysisCache を削除（collection group を避けサブコレで削除）
    let notesDeleted = 0;
    let aiCacheDeleted = 0;
    for (const siteId of siteIds) {
      const notesSnap = await db.collection('sites').doc(siteId).collection('pageNotes')
        .where('userId', '==', targetUserId)
        .get();
      for (const d of notesSnap.docs) await d.ref.delete();
      notesDeleted += notesSnap.size;

      const cacheSnap = await db.collection('sites').doc(siteId).collection('aiAnalysisCache')
        .where('userId', '==', targetUserId)
        .get();
      for (const d of cacheSnap.docs) await d.ref.delete();
      aiCacheDeleted += cacheSnap.size;
    }
    if (notesDeleted > 0 || aiCacheDeleted > 0) {
      logger.info('メモ・AIキャッシュ削除完了', { notes: notesDeleted, aiCache: aiCacheDeleted });
    }

    // 1b. サイトドキュメントを削除
    const deleteSitesPromises = sitesSnapshot.docs.map(doc => doc.ref.delete());
    await Promise.all(deleteSitesPromises);
    logger.info('サイト削除完了', { count: sitesSnapshot.size });

    // 2. （他サイトに紐づくページメモは collection group で削除しないためスキップ済み）

    // 3. OAuthトークンを削除（users/{uid}/oauth_tokens）
    const tokensSnapshot = await db.collection('users').doc(targetUserId).collection('oauth_tokens').get();
    const deleteTokensPromises = tokensSnapshot.docs.map(doc => doc.ref.delete());
    await Promise.all(deleteTokensPromises);
    logger.info('OAuthトークン削除完了', { count: tokensSnapshot.size });

    // 4. （aiAnalysisCache は 1c で各サイトごとに削除済み）

    // 5. レポートを削除（users/{uid}/reports）
    const reportsSnapshot = await db.collection('users').doc(targetUserId).collection('reports').get();
    const deleteReportsPromises = reportsSnapshot.docs.map(doc => doc.ref.delete());
    await Promise.all(deleteReportsPromises);
    logger.info('レポート削除完了', { count: reportsSnapshot.size });

    // 6. 個別制限を削除（users/{uid}/customLimits/{uid}）
    const customLimitsDoc = await db.collection('users').doc(targetUserId).collection('customLimits').doc(targetUserId).get();
    if (customLimitsDoc.exists) {
      await customLimitsDoc.ref.delete();
      logger.info('個別制限削除完了');
    }

    // 7. プラン変更履歴を削除（users/{uid}/planChangeHistory）
    const planHistorySnapshot = await db.collection('users').doc(targetUserId).collection('planChangeHistory').get();
    const deletePlanHistoryPromises = planHistorySnapshot.docs.map(doc => doc.ref.delete());
    await Promise.all(deletePlanHistoryPromises);
    logger.info('プラン変更履歴削除完了', { count: planHistorySnapshot.size });

    // 7b. メモ既読・アラート既読を削除（users/{uid}/memoReadStatus, userAlertReads）
    const memoReadSnap = await db.collection('users').doc(targetUserId).collection('memoReadStatus').get();
    await Promise.all(memoReadSnap.docs.map(doc => doc.ref.delete()));
    const alertReadSnap = await db.collection('users').doc(targetUserId).collection('userAlertReads').get();
    await Promise.all(alertReadSnap.docs.map(doc => doc.ref.delete()));
    logger.info('memoReadStatus/userAlertReads削除完了', { memo: memoReadSnap.size, alert: alertReadSnap.size });

    // 8. 管理者ロールを削除（該当する場合）
    const adminUserDoc = await db.collection('adminUsers').doc(targetUserId).get();
    if (adminUserDoc.exists) {
      await adminUserDoc.ref.delete();
      logger.info('管理者ロール削除完了');
    }

    // 9. usersコレクションから削除
    await db.collection('users').doc(targetUserId).delete();
    logger.info('usersコレクション削除完了');

    // 10. Firebase Authenticationからユーザーを削除
    try {
      await auth.deleteUser(targetUserId);
      logger.info('Firebase Authentication削除完了');
    } catch (authError) {
      logger.warn('Firebase Authenticationの削除に失敗（ユーザーが存在しない可能性）', { 
        error: authError.message 
      });
    }

    logger.info('ユーザー削除完了', { 
      executorId: uid,
      targetUserId,
      sitesDeleted: sitesSnapshot.size,
      notesDeleted,
    });

    return {
      success: true,
      message: `${targetName}さんを削除しました`,
      deletedData: {
        sites: sitesSnapshot.size,
        notes: notesDeleted,
        tokens: tokensSnapshot.size,
        aiCache: aiCacheDeleted,
        reports: reportsSnapshot.size,
        pageScrapingData: scrapingDataDeleted,
        scrapingProgress: scrapingProgressDeleted,
        scrapingJobs: scrapingJobsDeleted,
        scrapingErrors: scrapingErrorsDeleted,
      },
    };

  } catch (error) {
    logger.error('ユーザー削除エラー', { 
      error: error.message,
      stack: error.stack,
      executorId: uid,
      targetUserId,
    });

    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError('internal', 'ユーザーの削除に失敗しました: ' + error.message);
  }
};
