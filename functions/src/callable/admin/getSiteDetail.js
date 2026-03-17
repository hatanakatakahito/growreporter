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
    logger.info('getSiteDetail siteData keys', { keys: Object.keys(siteData), industry: siteData.industry, siteType: siteData.siteType, sitePurpose: siteData.sitePurpose });

    // ユーザー情報を取得（業種 = users.industry）
    let userData = null;
    if (siteData.userId) {
      const userDoc = await db.collection('users').doc(siteData.userId).get();
      if (userDoc.exists) {
        const user = userDoc.data();
        logger.info('getSiteDetail user keys', { keys: Object.keys(user), industry: user.industry });
        const userName = (user.lastName && user.firstName)
          ? `${user.lastName} ${user.firstName}`
          : (user.displayName || '');
        userData = {
          uid: userDoc.id,
          displayName: userName,
          email: user.email || '',
          plan: user.plan || 'free',
          industry: user.industry ?? user.Industry ?? '', // 業種: users の industry
        };
      }
    }

    // AI使用状況を取得（このサイトでの使用）
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const aiUsage = await getAISiteUsage(db, siteId, firstDayOfMonth);

    // サイトタイプ: Firestore は配列 ["corporate"] で保存されているため、表示用に文字列化
    const siteTypeDisplay = Array.isArray(siteData.siteType) && siteData.siteType.length > 0
      ? siteData.siteType.join(', ')
      : (siteData.siteType || '');

    const industryArr = Array.isArray(siteData.industry) ? siteData.industry : (siteData.industry ? [siteData.industry] : []);
    const sitePurposeArr = siteData.sitePurpose ?? [];

    const siteDetail = {
      siteId: siteDoc.id,
      siteName: siteData.siteName || '',
      siteUrl: siteData.siteUrl || '',
      userId: siteData.userId || '',
      user: userData,
      ga4PropertyId: siteData.ga4PropertyId || '',
      gscSiteUrl: siteData.gscSiteUrl || '',
      industry: industryArr,
      siteType: siteTypeDisplay,
      sitePurpose: sitePurposeArr,
      conversionEvents: siteData.conversionEvents || [],
      createdAt: siteData.createdAt?.toDate?.().toISOString() || null,
      updatedAt: siteData.updatedAt?.toDate?.().toISOString() || null,
      // AI使用状況
      aiUsage,
      // スクリーンショット
      pcScreenshotUrl: siteData.pcScreenshotUrl || '',
      mobileScreenshotUrl: siteData.mobileScreenshotUrl || '',
      // ステータス
      hasGA4: !!siteData.ga4PropertyId,
      hasGSC: !!siteData.gscSiteUrl,
      isOrphan: !userData,
    };

    logger.info('サイト詳細取得完了', { 
      adminId: uid,
      siteId,
      returnedIndustry: siteDetail.industry?.length ? siteDetail.industry : '(none)',
      returnedSitePurpose: siteDetail.sitePurpose?.length ? siteDetail.sitePurpose : '(none)',
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
      .collection('sites')
      .doc(siteId)
      .collection('aiAnalysisCache')
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

