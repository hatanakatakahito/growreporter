import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';

/**
 * 管理者用サイト詳細取得
 * 
 * @param {Object} data - リクエストパラメータ
 * @param {string} data.siteId - サイトID
 * @returns {Object} サイト詳細情報
 */
export const getSiteDetailCallable = async (request) => {
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
    
    // 管理者権限チェック
    const adminDoc = await db.collection('adminUsers').doc(uid).get();
    if (!adminDoc.exists || !['admin', 'editor', 'viewer'].includes(adminDoc.data()?.role)) {
      throw new HttpsError('permission-denied', '管理者権限がありません');
    }

    logger.info('サイト詳細取得開始', { 
      adminId: uid,
      siteId,
    });

    // サイト情報を取得
    const siteDoc = await db.collection('sites').doc(siteId).get();
    
    if (!siteDoc.exists) {
      throw new HttpsError('not-found', 'サイトが見つかりません');
    }

    const siteData = siteDoc.data();

    // ユーザー情報を取得
    let userData = null;
    if (siteData.userId) {
      const userDoc = await db.collection('users').doc(siteData.userId).get();
      if (userDoc.exists) {
        const user = userDoc.data();
        userData = {
          uid: userDoc.id,
          displayName: user.displayName || '',
          email: user.email || '',
          plan: user.plan || 'free',
        };
      }
    }

    // AI使用状況を取得（このサイトでの使用）
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const aiUsage = await getAISiteUsage(db, siteId, firstDayOfMonth);

    // データ収集状況を取得（過去30日間）
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const dataStatus = await getDataCollectionStatus(db, siteId, thirtyDaysAgo);

    const siteDetail = {
      siteId: siteDoc.id,
      siteName: siteData.siteName || '',
      siteUrl: siteData.siteUrl || '',
      userId: siteData.userId || '',
      user: userData,
      ga4PropertyId: siteData.ga4PropertyId || '',
      gscSiteUrl: siteData.gscSiteUrl || '',
      industry: siteData.industry || '',
      siteType: siteData.siteType || '',
      conversionEvents: siteData.conversionEvents || [],
      createdAt: siteData.createdAt?.toDate?.().toISOString() || null,
      updatedAt: siteData.updatedAt?.toDate?.().toISOString() || null,
      // AI使用状況
      aiUsage,
      // データ収集状況
      dataStatus,
      // ステータス
      hasGA4: !!siteData.ga4PropertyId,
      hasGSC: !!siteData.gscSiteUrl,
      isOrphan: !userData,
    };

    logger.info('サイト詳細取得完了', { 
      adminId: uid,
      siteId,
    });

    return {
      success: true,
      data: siteDetail,
    };

  } catch (error) {
    logger.error('サイト詳細取得エラー', { 
      error: error.message,
      adminId: uid,
      siteId,
    });

    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError('internal', 'サイト詳細の取得に失敗しました');
  }
};

/**
 * サイトのAI使用状況を取得
 */
async function getAISiteUsage(db, siteId, startDate) {
  try {
    const aiCacheSnapshot = await db
      .collection('aiAnalysisCache')
      .where('siteId', '==', siteId)
      .where('generatedAt', '>=', Timestamp.fromDate(startDate))
      .get();

    let analysisCount = 0;
    let improvementCount = 0;

    aiCacheSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.pageType === 'comprehensive_improvement') {
        improvementCount++;
      } else {
        analysisCount++;
      }
    });

    return {
      analysisCount,
      improvementCount,
      totalCount: analysisCount + improvementCount,
    };
  } catch (error) {
    logger.error('AI使用状況取得エラー', { error: error.message, siteId });
    return {
      analysisCount: 0,
      improvementCount: 0,
      totalCount: 0,
    };
  }
}

/**
 * データ収集状況を取得
 */
async function getDataCollectionStatus(db, siteId, startDate) {
  try {
    // GA4データの収集状況
    // Note: 実際のデータ取得APIの呼び出し履歴をログから取得するのは複雑なため、
    // ここでは簡易的にAI分析キャッシュの存在で判定
    const recentDataSnapshot = await db
      .collection('aiAnalysisCache')
      .where('siteId', '==', siteId)
      .where('generatedAt', '>=', Timestamp.fromDate(startDate))
      .limit(1)
      .get();

    const hasRecentData = !recentDataSnapshot.empty;

    // 最新データの日付を取得
    let latestDataDate = null;
    if (hasRecentData) {
      const latestDoc = recentDataSnapshot.docs[0];
      latestDataDate = latestDoc.data().generatedAt?.toDate?.().toISOString() || null;
    }

    return {
      hasRecentData,
      latestDataDate,
      status: hasRecentData ? 'active' : 'inactive',
    };
  } catch (error) {
    logger.error('データ収集状況取得エラー', { error: error.message, siteId });
    return {
      hasRecentData: false,
      latestDataDate: null,
      status: 'unknown',
    };
  }
}

