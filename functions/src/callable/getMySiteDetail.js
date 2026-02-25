import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';

/**
 * ユーザー用サイト詳細取得（オーナーまたは同一アカウントのメンバーのみ）
 * 返却に user は含めない（ユーザー向け画面では表示しない）
 *
 * @param {Object} request - リクエスト
 * @param {string} request.data.siteId - サイトID
 * @returns {Object} サイト詳細（user 除く）
 */
export const getMySiteDetailCallable = async (request) => {
  const uid = request.auth?.uid;

  if (!uid) {
    throw new HttpsError('unauthenticated', 'ユーザー認証が必要です');
  }

  const { siteId } = request.data || {};

  if (!siteId || typeof siteId !== 'string') {
    throw new HttpsError('invalid-argument', 'サイトIDが必要です');
  }

  const db = getFirestore();

  try {
    const siteDoc = await db.collection('sites').doc(siteId).get();
    if (!siteDoc.exists) {
      throw new HttpsError('not-found', 'サイトが見つかりません');
    }

    const siteData = siteDoc.data() || {};
    const siteOwnerId = siteData.userId || '';

    // アクセス許可: 自分がオーナー または 同一アカウントのメンバー
    if (siteOwnerId === uid) {
      // オーナー
    } else {
      const userDoc = await db.collection('users').doc(uid).get();
      if (!userDoc.exists) {
        throw new HttpsError('permission-denied', 'このサイトにアクセスする権限がありません');
      }
      const memberships = userDoc.data()?.memberships || {};
      if (!memberships[siteOwnerId]) {
        throw new HttpsError('permission-denied', 'このサイトにアクセスする権限がありません');
      }
    }

    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const aiUsage = await getAISiteUsage(db, siteId, firstDayOfMonth);

    const siteTypeDisplay = Array.isArray(siteData.siteType) && siteData.siteType.length > 0
      ? siteData.siteType.join(', ')
      : (siteData.siteType || '');

    const industryArr = Array.isArray(siteData.industry) ? siteData.industry : (siteData.industry ? [siteData.industry] : []);
    const sitePurposeArr = siteData.sitePurpose ?? [];

    let createdAt = null;
    let updatedAt = null;
    try {
      if (siteData.createdAt && typeof siteData.createdAt.toDate === 'function') {
        createdAt = siteData.createdAt.toDate().toISOString();
      }
      if (siteData.updatedAt && typeof siteData.updatedAt.toDate === 'function') {
        updatedAt = siteData.updatedAt.toDate().toISOString();
      }
    } catch (_) {
      // ignore date conversion errors
    }

    const siteDetail = {
      siteId: siteDoc.id,
      siteName: siteData.siteName || '',
      siteUrl: siteData.siteUrl || '',
      userId: siteData.userId || '',
      ga4PropertyId: siteData.ga4PropertyId || '',
      gscSiteUrl: siteData.gscSiteUrl || '',
      industry: industryArr,
      siteType: siteTypeDisplay,
      sitePurpose: sitePurposeArr,
      conversionEvents: Array.isArray(siteData.conversionEvents) ? siteData.conversionEvents : [],
      createdAt,
      updatedAt,
      aiUsage,
      hasGA4: !!siteData.ga4PropertyId,
      hasGSC: !!siteData.gscSiteUrl,
    };

    return {
      success: true,
      data: siteDetail,
    };
  } catch (error) {
    logger.error('getMySiteDetail エラー', { error: error?.message, stack: error?.stack, uid, siteId });
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', error?.message || 'サイト詳細の取得に失敗しました');
  }
};

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

    aiCacheSnapshot.forEach((docSnap) => {
      const data = docSnap.data();
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
