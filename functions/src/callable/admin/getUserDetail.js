import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';

/**
 * ユーザーの詳細情報を取得
 * 
 * @param {Object} data - { uid: string }
 * @returns {Object} ユーザー詳細情報
 */
export const getUserDetailCallable = async (request) => {
  const adminUid = request.auth?.uid;
  const { uid } = request.data;

  if (!adminUid) {
    throw new HttpsError('unauthenticated', 'ユーザー認証が必要です');
  }

  if (!uid) {
    throw new HttpsError('invalid-argument', 'uidが指定されていません');
  }

  try {
    const db = getFirestore();
    
    // 管理者権限チェック
    const adminDoc = await db.collection('adminUsers').doc(adminUid).get();
    if (!adminDoc.exists || !['admin', 'editor'].includes(adminDoc.data()?.role)) {
      throw new HttpsError('permission-denied', '管理者権限がありません');
    }

    logger.info('ユーザー詳細取得開始', { adminId: adminUid, targetUid: uid });

    // 並列でデータを取得
    const [
      userDoc,
      sitesSnapshot,
      planHistory,
      aiUsage,
    ] = await Promise.all([
      db.collection('users').doc(uid).get(),
      db.collection('sites').where('userId', '==', uid).get(),
      db.collection('planChangeHistory')
        .where('userId', '==', uid)
        .orderBy('changedAt', 'desc')
        .limit(10)
        .get(),
      getAIUsageForUser(db, uid),
    ]);

    if (!userDoc.exists) {
      throw new HttpsError('not-found', 'ユーザーが見つかりません');
    }

    const userData = userDoc.data();
    
    // サイト情報を整形
    const sites = sitesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.().toISOString() || null,
    }));

    // プラン変更履歴を整形
    const planChangeHistory = planHistory.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      changedAt: doc.data().changedAt?.toDate?.().toISOString() || null,
    }));

    const userDetail = {
      uid: userDoc.id,
      email: userData.email || null,
      displayName: userData.displayName || null,
      photoURL: userData.photoURL || null,
      plan: userData.plan || 'free',
      createdAt: userData.createdAt?.toDate?.().toISOString() || null,
      lastLoginAt: userData.lastLoginAt?.toDate?.().toISOString() || null,
      
      // 使用状況
      usage: {
        sites: sites.length,
        aiSummaryUsage: userData.aiSummaryUsage || 0,
        aiImprovementUsage: userData.aiImprovementUsage || 0,
        aiSummaryLimit: userData.aiSummaryLimit || 0,
        aiImprovementLimit: userData.aiImprovementLimit || 0,
      },
      
      // サイト一覧
      sites: sites,
      
      // プラン変更履歴
      planChangeHistory: planChangeHistory,
      
      // 今月のAI使用状況
      aiUsageThisMonth: aiUsage,
    };

    logger.info('ユーザー詳細取得完了', { 
      adminId: adminUid,
      targetUid: uid,
      sitesCount: sites.length,
    });

    return { success: true, data: userDetail };

  } catch (error) {
    logger.error('ユーザー詳細取得エラー', { 
      error: error.message,
      adminId: adminUid,
      targetUid: uid,
    });

    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError('internal', 'ユーザー詳細の取得に失敗しました');
  }
};

/**
 * ユーザーの今月のAI使用状況を取得
 */
async function getAIUsageForUser(db, userId) {
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  try {
    // AI分析サマリー使用回数
    const analysisCacheSnapshot = await db
      .collection('aiAnalysisCache')
      .where('userId', '==', userId)
      .where('generatedAt', '>=', Timestamp.fromDate(firstDayOfMonth))
      .count()
      .get();

    // AI改善案生成回数
    const improvementCacheSnapshot = await db
      .collection('aiAnalysisCache')
      .where('userId', '==', userId)
      .where('pageType', '==', 'comprehensive_improvement')
      .where('generatedAt', '>=', Timestamp.fromDate(firstDayOfMonth))
      .count()
      .get();

    return {
      analysisCount: analysisCacheSnapshot.data().count,
      improvementCount: improvementCacheSnapshot.data().count,
    };
  } catch (error) {
    logger.error('AI使用状況取得エラー', { error: error.message, userId });
    return {
      analysisCount: 0,
      improvementCount: 0,
    };
  }
}

