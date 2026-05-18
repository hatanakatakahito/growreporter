import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import {
  calculateCurrentRevenueSnapshot,
  calculateMonthlyContractTrend,
  isInternalEmail,
} from '../../utils/revenueCalculator.js';

/**
 * 管理者ダッシュボードの統計データを取得
 *
 * 社内ドメイン (grow-group.jp) のユーザーは全指標から除外する。
 * users 取得を 1 回に集約し、すべてのユーザー系指標をメモリ上で計算する。
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

    // 並列でデータを取得 (users / sites / inquiries / AI)
    const [
      userMetricsData,
      totalSitesData,
      contractTrendData,
      aiUsageData,
    ] = await Promise.all([
      getUserMetrics(),
      getTotalSites(),
      getContractTrend(),
      getAIUsage(),
    ]);

    const stats = {
      totalUsers: userMetricsData.totalUsers,
      totalSites: totalSitesData,
      monthlyActiveUsers: userMetricsData.monthlyActiveUsers,
      newUsersThisMonth: userMetricsData.newUsersThisMonth,
      planDistribution: userMetricsData.planDistribution,
      userTrend: userMetricsData.userTrend,
      aiUsage: aiUsageData,
      revenue: userMetricsData.revenue,
      contractTrend: contractTrendData,
      fetchedAt: new Date().toISOString(),
    };

    logger.info('管理者統計データ取得完了', {
      adminId: uid,
      totalUsers: userMetricsData.totalUsers,
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
 * ユーザー系指標を一括計算 (社内ドメイン除外済み)
 *
 * 戻り値:
 *   - totalUsers: 社外ユーザー総数
 *   - monthlyActiveUsers: 過去 30 日にログインした社外ユーザー数
 *   - newUsersThisMonth: 当月新規登録の社外ユーザー数
 *   - planDistribution: { free, business } 社外ユーザーのみ
 *   - userTrend: 過去 6 ヶ月の累計ユーザー数推移 (各月末時点)
 *   - revenue: { mrr, arr, activeBusinessContracts, totalExtras, arpu }
 */
async function getUserMetrics() {
  const db = getFirestore();
  const ZERO = {
    totalUsers: 0,
    monthlyActiveUsers: 0,
    newUsersThisMonth: 0,
    planDistribution: { free: 0, business: 0 },
    userTrend: [],
    revenue: { mrr: 0, arr: 0, activeBusinessContracts: 0, totalExtras: 0, arpu: 0 },
  };

  try {
    const usersSnap = await db.collection('users')
      .select('plan', 'memberRole', 'extraSitesCount', 'extraSitesValidUntil', 'email', 'createdAt', 'lastLoginAt')
      .get();

    // 社外ユーザーのみに絞り込む
    const externalDocs = usersSnap.docs.filter(d => !isInternalEmail(d.data()?.email));

    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let totalUsers = 0;
    let monthlyActiveUsers = 0;
    let newUsersThisMonth = 0;
    const planDistribution = { free: 0, business: 0 };

    for (const doc of externalDocs) {
      const u = doc.data();
      if (!u) continue;
      totalUsers++;

      const lastLoginAt = u.lastLoginAt?.toDate?.() ?? null;
      if (lastLoginAt instanceof Date && !Number.isNaN(lastLoginAt.getTime()) && lastLoginAt >= thirtyDaysAgo) {
        monthlyActiveUsers++;
      }

      const createdAt = u.createdAt?.toDate?.() ?? null;
      if (createdAt instanceof Date && !Number.isNaN(createdAt.getTime()) && createdAt >= firstDayOfMonth) {
        newUsersThisMonth++;
      }

      const rawPlan = u.plan || 'free';
      const normalized = (rawPlan === 'standard' || rawPlan === 'premium' || rawPlan === 'paid') ? 'business' : rawPlan;
      if (Object.prototype.hasOwnProperty.call(planDistribution, normalized)) {
        planDistribution[normalized]++;
      }
    }

    // ユーザー数推移 (過去 6 ヶ月、各月末までの累計)
    const userTrend = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      let count = 0;
      for (const doc of externalDocs) {
        const u = doc.data();
        const createdAt = u?.createdAt?.toDate?.() ?? null;
        if (!(createdAt instanceof Date) || Number.isNaN(createdAt.getTime())) continue;
        if (createdAt < monthEnd) count++;
      }
      userTrend.push({
        month: monthStart.toLocaleDateString('ja-JP', { year: 'numeric', month: 'short' }),
        count,
      });
    }

    // 売上 (calculateCurrentRevenueSnapshot 内でも isInternalEmail フィルタが効くが、
    // ここで先に絞った社外 docs を渡すので二重防御)
    const revenue = calculateCurrentRevenueSnapshot(externalDocs, now);

    return { totalUsers, monthlyActiveUsers, newUsersThisMonth, planDistribution, userTrend, revenue };
  } catch (error) {
    logger.error('ユーザー指標取得エラー', { error: error.message });
    return ZERO;
  }
}

/**
 * 総サイト数を取得 (社内/社外フィルタなし — システム規模指標)
 */
async function getTotalSites() {
  const db = getFirestore();
  const sitesSnapshot = await db.collection('sites').count().get();
  return sitesSnapshot.data().count;
}

/**
 * 月次契約数増減トレンド (過去 12 ヶ月、社内ドメイン除外済み)
 */
async function getContractTrend() {
  const db = getFirestore();
  try {
    const inquiriesSnap = await db.collection('upgradeInquiries')
      .select('status', 'inquiryType', 'statusUpdatedAt', 'email')
      .get();
    return calculateMonthlyContractTrend(inquiriesSnap.docs, 12, new Date());
  } catch (error) {
    logger.error('契約トレンド取得エラー', { error: error.message });
    return [];
  }
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
      .collectionGroup('aiAnalysisCache')
      .where('generatedAt', '>=', Timestamp.fromDate(firstDayOfMonth))
      .count()
      .get();

    // AI改善案生成回数（pageType: comprehensive_improvement）
    const improvementCacheSnapshot = await db
      .collectionGroup('aiAnalysisCache')
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
