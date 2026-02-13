import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { logger } from 'firebase-functions/v2';
import { logActivity } from '../../utils/activityLogger.js';

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
    const targetName = (userData.lastName && userData.firstName) 
      ? `${userData.lastName} ${userData.firstName}` 
      : (userData.displayName || userData.email || 'Unknown');

    // 実行者情報を取得
    const executorData = executorAdminDoc.data();
    const executorName = (executorData.lastName && executorData.firstName) 
      ? `${executorData.lastName} ${executorData.firstName}` 
      : (executorData.displayName || executorData.email || 'Admin');

    logger.info('ユーザー削除開始', { 
      executorId: uid,
      targetUserId,
      targetName,
    });

    // 1. ユーザーのサイトを削除
    const sitesSnapshot = await db.collection('sites')
      .where('userId', '==', targetUserId)
      .get();
    
    const siteIds = [];
    const deleteSitesPromises = sitesSnapshot.docs.map(doc => {
      siteIds.push(doc.id);
      return doc.ref.delete();
    });
    await Promise.all(deleteSitesPromises);
    logger.info('サイト削除完了', { count: sitesSnapshot.size });

    // 2. ページメモを削除
    const notesSnapshot = await db.collection('pageNotes')
      .where('userId', '==', targetUserId)
      .get();
    
    const deleteNotesPromises = notesSnapshot.docs.map(doc => doc.ref.delete());
    await Promise.all(deleteNotesPromises);
    logger.info('メモ削除完了', { count: notesSnapshot.size });

    // 3. OAuthトークンを削除
    const tokensSnapshot = await db.collection('oauth_tokens')
      .where('user_uid', '==', targetUserId)
      .get();
    
    const deleteTokensPromises = tokensSnapshot.docs.map(doc => doc.ref.delete());
    await Promise.all(deleteTokensPromises);
    logger.info('OAuthトークン削除完了', { count: tokensSnapshot.size });

    // 4. AI分析キャッシュを削除
    const aiCacheSnapshot = await db.collection('aiAnalysisCache')
      .where('userId', '==', targetUserId)
      .get();
    
    const deleteAICachePromises = aiCacheSnapshot.docs.map(doc => doc.ref.delete());
    await Promise.all(deleteAICachePromises);
    logger.info('AI分析キャッシュ削除完了', { count: aiCacheSnapshot.size });

    // 5. レポートを削除
    const reportsSnapshot = await db.collection('reports')
      .where('userId', '==', targetUserId)
      .get();
    
    const deleteReportsPromises = reportsSnapshot.docs.map(doc => doc.ref.delete());
    await Promise.all(deleteReportsPromises);
    logger.info('レポート削除完了', { count: reportsSnapshot.size });

    // 6. 個別制限を削除
    const customLimitsDoc = await db.collection('customLimits').doc(targetUserId).get();
    if (customLimitsDoc.exists) {
      await customLimitsDoc.ref.delete();
      logger.info('個別制限削除完了');
    }

    // 7. プラン変更履歴を削除
    const planHistorySnapshot = await db.collection('planChangeHistory')
      .where('userId', '==', targetUserId)
      .get();
    
    const deletePlanHistoryPromises = planHistorySnapshot.docs.map(doc => doc.ref.delete());
    await Promise.all(deletePlanHistoryPromises);
    logger.info('プラン変更履歴削除完了', { count: planHistorySnapshot.size });

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

    // アクティビティログに記録
    await logActivity(db, {
      adminId: uid,
      adminName: executorName,
      action: 'user_deleted',
      targetType: 'user',
      targetId: targetUserId,
      details: {
        targetName,
        email: userData.email,
        plan: userData.plan,
        sitesDeleted: sitesSnapshot.size,
        reason,
      },
    });

    logger.info('ユーザー削除完了', { 
      executorId: uid,
      targetUserId,
      sitesDeleted: sitesSnapshot.size,
      notesDeleted: notesSnapshot.size,
    });

    return {
      success: true,
      message: `${targetName}さんを削除しました`,
      deletedData: {
        sites: sitesSnapshot.size,
        notes: notesSnapshot.size,
        tokens: tokensSnapshot.size,
        aiCache: aiCacheSnapshot.size,
        reports: reportsSnapshot.size,
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
