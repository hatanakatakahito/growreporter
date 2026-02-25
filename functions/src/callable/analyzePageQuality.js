import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';
import { analyzePageQuality as analyzePageQualityUtil } from '../utils/analyzePageQuality.js';

/**
 * ページ品質分析Callable Function
 * GA4データを分析（サイトマップデータはオプション）
 */
export const analyzePageQualityCallable = onCall(
  {
    region: 'asia-northeast1',
    memory: '512MiB',
    timeoutSeconds: 60,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'ユーザー認証が必要です');
    }

    const { ga4PageData, sitemapPages, landingPageData } = request.data;

    if (!ga4PageData || !landingPageData) {
      throw new HttpsError('invalid-argument', 'ga4PageData, landingPageDataが必要です');
    }

    logger.info('[analyzePageQuality] 分析開始', {
      uid: request.auth.uid,
      ga4PageCount: ga4PageData.length,
      sitemapPageCount: sitemapPages?.length || 0,
      landingPageCount: landingPageData.length,
    });

    try {
      const result = analyzePageQualityUtil({
        ga4PageData,
        sitemapPages: sitemapPages || [],
        landingPageData,
      });

      logger.info('[analyzePageQuality] 分析完了', {
        problematicPageCount: result.problematicPages.length,
        totalAnalyzedPages: result.totalAnalyzedPages,
      });

      return result;
    } catch (error) {
      logger.error('[analyzePageQuality] エラー', error);
      throw new HttpsError('internal', `ページ品質分析に失敗しました: ${error.message}`);
    }
  }
);
