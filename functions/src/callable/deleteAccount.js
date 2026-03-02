import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { logger } from 'firebase-functions/v2';

/**
 * ユーザーが自分のアカウントを削除
 * 紐づく全サイトと関連データも削除
 *
 * @returns {Object} 削除結果
 */
export const deleteAccountCallable = async (request) => {
  const uid = request.auth?.uid;

  if (!uid) {
    throw new HttpsError('unauthenticated', 'ユーザー認証が必要です');
  }

  try {
    const db = getFirestore();
    const auth = getAuth();

    // ユーザードキュメント確認
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      throw new HttpsError('not-found', 'ユーザーが見つかりません');
    }

    logger.info('ユーザーによるアカウント削除開始', { uid });

    // 1. ユーザーのサイト一覧を取得
    const sitesSnapshot = await db.collection('sites')
      .where('userId', '==', uid)
      .get();

    const siteIds = sitesSnapshot.docs.map(d => d.id);

    // 2. 各サイトのサブコレクションを削除
    const subCollections = ['pageScrapingData', 'scrapingErrors', 'pageNotes', 'aiAnalysisCache', 'alerts', 'improvements', 'pageScrapingMeta'];

    for (const siteId of siteIds) {
      for (const collName of subCollections) {
        const snap = await db.collection('sites').doc(siteId).collection(collName).get();
        for (let i = 0; i < snap.docs.length; i += 500) {
          const batch = db.batch();
          snap.docs.slice(i, i + 500).forEach(d => batch.delete(d.ref));
          await batch.commit();
        }
      }

      // scrapingProgress
      const progressRef = db.collection('scrapingProgress').doc(siteId);
      if ((await progressRef.get()).exists) {
        await progressRef.delete();
      }

      // scrapingJobs
      const jobsSnap = await db.collection('scrapingJobs').where('siteId', '==', siteId).get();
      for (const d of jobsSnap.docs) await d.ref.delete();

      // api_cache
      const apiCacheSnap = await db.collection('api_cache').where('siteId', '==', siteId).get();
      for (const d of apiCacheSnap.docs) await d.ref.delete();
    }

    // 3. サイトドキュメントを削除
    await Promise.all(sitesSnapshot.docs.map(d => d.ref.delete()));
    logger.info('サイト削除完了', { count: sitesSnapshot.size });

    // 4. OAuthトークン削除
    const tokensSnap = await db.collection('users').doc(uid).collection('oauth_tokens').get();
    await Promise.all(tokensSnap.docs.map(d => d.ref.delete()));

    // 5. レポート削除
    const reportsSnap = await db.collection('users').doc(uid).collection('reports').get();
    await Promise.all(reportsSnap.docs.map(d => d.ref.delete()));

    // 6. 個別制限削除
    const customLimitsDoc = await db.collection('users').doc(uid).collection('customLimits').doc(uid).get();
    if (customLimitsDoc.exists) await customLimitsDoc.ref.delete();

    // 7. プラン変更履歴削除
    const planHistorySnap = await db.collection('users').doc(uid).collection('planChangeHistory').get();
    await Promise.all(planHistorySnap.docs.map(d => d.ref.delete()));

    // 8. メモ既読・アラート既読削除
    const memoReadSnap = await db.collection('users').doc(uid).collection('memoReadStatus').get();
    await Promise.all(memoReadSnap.docs.map(d => d.ref.delete()));
    const alertReadSnap = await db.collection('users').doc(uid).collection('userAlertReads').get();
    await Promise.all(alertReadSnap.docs.map(d => d.ref.delete()));

    // 9. 管理者ロール削除（該当する場合）
    const adminDoc = await db.collection('adminUsers').doc(uid).get();
    if (adminDoc.exists) await adminDoc.ref.delete();

    // 10. usersコレクションから削除
    await db.collection('users').doc(uid).delete();

    // 11. Firebase Authentication削除
    try {
      await auth.deleteUser(uid);
    } catch (authError) {
      logger.warn('Firebase Auth削除エラー', { error: authError.message });
    }

    logger.info('ユーザーアカウント削除完了', { uid, sitesDeleted: sitesSnapshot.size });

    return {
      success: true,
      message: 'アカウントを削除しました',
    };

  } catch (error) {
    logger.error('アカウント削除エラー', {
      error: error.message,
      stack: error.stack,
      uid,
    });

    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError('internal', 'アカウントの削除に失敗しました: ' + error.message);
  }
};
