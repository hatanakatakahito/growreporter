import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';

/**
 * 管理者ダッシュボードの統計データを取得
 * 
 * @returns {Object} 統計データ
 */
export const getAdminStatsCallable = async (request) => {
  const uid = request.auth?.uid;

  if (!uid) {
    throw new HttpsError('unauthenticated', 'ユーザー認証が必要です');
  }

  try {
    const db = getFirestore();
    
    // 管理者権限チェック
    const adminDoc = await db.collection('adminUsers').doc(uid).get();
    if (!adminDoc.exists || !['admin', 'editor'].includes(adminDoc.data()?.role)) {
      throw new HttpsError('permission-denied', '管理者権限がありません');
    }

    logger.info('管理者統計データ取得開始', { adminId: uid });

    // 並列でデータを取得
    const [
      totalUsersData,
      totalSitesData,
      monthlyActiveUsersData,
      newUsersThisMonthData,
      planDistributionData,
      userTrendData,
      aiUsageData,
    ] = await Promise.all([
      getTotalUsers(),
      getTotalSites(),
      getMonthlyActiveUsers(),
      getNewUsersThisMonth(),
      getPlanDistribution(),
      getUserTrend(),
      getAIUsage(),
    ]);

    const stats = {
      totalUsers: totalUsersData,
      totalSites: totalSitesData,
      monthlyActiveUsers: monthlyActiveUsersData,
      newUsersThisMonth: newUsersThisMonthData,
      planDistribution: planDistributionData,
      userTrend: userTrendData,
      aiUsage: aiUsageData,
      fetchedAt: new Date().toISOString(),
    };

    logger.info('管理者統計データ取得完了', { 
      adminId: uid,
      totalUsers: totalUsersData,
      totalSites: totalSitesData,
    });

    return { success: true, data: stats };

  } catch (error) {
    logger.error('管理者統計データ取得エラー', { 
      error: error.message,
      adminId: uid,
    });

    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError('internal', '統計データの取得に失敗しました');
  }
};

/**
 * 総ユーザー数を取得
 */
async function getTotalUsers() {
  const db = getFirestore();
  const usersSnapshot = await db.collection('users').count().get();
  return usersSnapshot.data().count;
}

/**
 * 総サイト数を取得
 */
async function getTotalSites() {
  const db = getFirestore();
  const sitesSnapshot = await db.collection('sites').count().get();
  return sitesSnapshot.data().count;
}

/**
 * 月間アクティブユーザー数（過去30日間にログインしたユーザー）
 */
async function getMonthlyActiveUsers() {
  const db = getFirestore();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const activeUsersSnapshot = await db
    .collection('users')
    .where('lastLoginAt', '>=', Timestamp.fromDate(thirtyDaysAgo))
    .count()
    .get();

  return activeUsersSnapshot.data().count;
}

/**
 * 今月の新規登録ユーザー数
 */
async function getNewUsersThisMonth() {
  const db = getFirestore();
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const newUsersSnapshot = await db
    .collection('users')
    .where('createdAt', '>=', Timestamp.fromDate(firstDayOfMonth))
    .count()
    .get();

  return newUsersSnapshot.data().count;
}

/**
 * プラン別ユーザー分布
 */
async function getPlanDistribution() {
  const db = getFirestore();
  const usersSnapshot = await db
    .collection('users')
    .select('plan')
    .get();

  const distribution = {
    free: 0,
    standard: 0,
    premium: 0,
  };

  usersSnapshot.forEach((doc) => {
    const plan = doc.data().plan || 'free';
    if (distribution.hasOwnProperty(plan)) {
      distribution[plan]++;
    }
  });

  return distribution;
}

/**
 * ユーザー数推移（過去6ヶ月）
 */
async function getUserTrend() {
  const db = getFirestore();
  const months = [];
  const now = new Date();

  // 過去6ヶ月のデータを準備
  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const nextDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

    const usersSnapshot = await db
      .collection('users')
      .where('createdAt', '<', Timestamp.fromDate(nextDate))
      .count()
      .get();

    months.push({
      month: date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'short' }),
      count: usersSnapshot.data().count,
    });
  }

  return months;
}

/**
 * AI機能の使用状況（今月）
 */
async function getAIUsage() {
  const db = getFirestore();
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  try {
    // AI分析サマリー使用回数（全pageType）
    const analysisCacheSnapshot = await db
      .collection('aiAnalysisCache')
      .where('generatedAt', '>=', Timestamp.fromDate(firstDayOfMonth))
      .count()
      .get();

    // AI改善案生成回数（pageType: comprehensive_improvement）
    const improvementCacheSnapshot = await db
      .collection('aiAnalysisCache')
      .where('pageType', '==', 'comprehensive_improvement')
      .where('generatedAt', '>=', Timestamp.fromDate(firstDayOfMonth))
      .count()
      .get();

    return {
      analysisCount: analysisCacheSnapshot.data().count,
      improvementCount: improvementCacheSnapshot.data().count,
    };
  } catch (error) {
    logger.error('AI使用状況取得エラー', { error: error.message });
    // エラーの場合は0を返す
    return {
      analysisCount: 0,
      improvementCount: 0,
    };
  }
}

