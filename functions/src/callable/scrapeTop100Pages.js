import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { google } from 'googleapis';
import { getAndRefreshToken } from '../utils/tokenManager.js';
import { scrapePage, normalizeUrl, checkRobotsTxt } from '../utils/pageScraper.js';
import { canEditSite } from '../utils/permissionHelper.js';

/**
 * サイトIDに対してスクレイピングを実行するコア処理
 * トリガーまたはCallableから呼び出し可能
 * @param {FirebaseFirestore.Firestore} db
 * @param {string} siteId
 * @param {{ skipRateLimit?: boolean }} options
 * @returns {Promise<{ success: boolean, totalPages?: number, successCount?: number, failedCount?: number, message?: string }>}
 */
export async function runScrapingForSite(db, siteId, options = {}) {
  const siteDoc = await db.collection('sites').doc(siteId).get();
  if (!siteDoc.exists) {
    throw new Error('サイトが見つかりません');
  }
  const siteData = siteDoc.data();

  logger.info('[runScrapingForSite] 開始', { siteId });

  const top100Pages = await fetchTop100PagesFromGA4(db, siteData);
  if (top100Pages.length === 0) {
    throw new Error('GA4データが見つかりません');
  }

  logger.info(`[runScrapingForSite] GA4から${top100Pages.length}ページ取得`);

  // 既存のスクレイピングデータを削除（最新のみ保持、バッチは500件まで）
  const existingSnapshot = await db.collection('sites').doc(siteId).collection('pageScrapingData').get();
  for (let i = 0; i < existingSnapshot.docs.length; i += 500) {
    const chunk = existingSnapshot.docs.slice(i, i + 500);
    const deleteBatch = db.batch();
    chunk.forEach(docSnap => deleteBatch.delete(docSnap.ref));
    await deleteBatch.commit();
  }
  if (existingSnapshot.size > 0) {
    logger.info(`[runScrapingForSite] 既存データ${existingSnapshot.size}件を削除`);
  }

  const progressDocRef = db.collection('sites').doc(siteId).collection('scrapingProgress').doc('default');
  const startedAt = Date.now();
  await progressDocRef.set({
    siteId,
    status: 'in_progress',
    totalPages: top100Pages.length,
    completedPages: 0,
    failedPages: 0,
    startedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  const batchSize = 25; // fetch+Cheerio のため並列数を増やして高速化（ブラウザ制限なし）
  const results = [];

  for (let i = 0; i < top100Pages.length; i += batchSize) {
    const batch = top100Pages.slice(i, i + batchSize);
    logger.info(`[runScrapingForSite] バッチ ${Math.floor(i / batchSize) + 1}/${Math.ceil(top100Pages.length / batchSize)} 開始 (${batch.length}ページ並列)`);

    const batchResults = await Promise.allSettled(
      batch.map((pageInfo) => scrapePageWithRetry(pageInfo, siteData.siteUrl, 3))
    );

    for (const result of batchResults) {
      if (result.status === 'fulfilled' && result.value.success) {
        results.push(result.value);
      } else {
        results.push({
          success: false,
          error: result.reason?.message || result.value?.error || 'Unknown error',
          pagePath: result.value?.pagePath || 'unknown',
        });
      }
    }

    const completedCount = results.filter((r) => r.success).length;
    const failedCount = results.filter((r) => !r.success).length;
    await progressDocRef.update({
      completedPages: completedCount,
      failedPages: failedCount,
      updatedAt: FieldValue.serverTimestamp(),
    });
    logger.info(`[runScrapingForSite] 進捗: ${completedCount}/${top100Pages.length} 完了, ${failedCount} 失敗`);
  }

  const failedResults = results.filter((r) => !r.success && !r.skipped);
  if (failedResults.length > 0) {
    failedResults.slice(0, 3).forEach((r, i) => {
      logger.warn(`[runScrapingForSite] 失敗例 ${i + 1}: ${r.pagePath} -> ${r.error}`);
    });
  }

  logger.info('[runScrapingForSite] Firestoreへの保存開始');
  const savedCount = await saveScrapingResults(db, siteId, results);

  const metaPayload = {
    lastScrapedAt: FieldValue.serverTimestamp(),
    totalPagesScraped: savedCount,
    totalPagesFailed: results.filter(r => !r.success).length,
    scrapingDuration: Date.now() - startedAt,
  };
  await db.collection('sites').doc(siteId).collection('pageScrapingMeta').doc('default').set(metaPayload, { merge: true });
  logger.info('[runScrapingForSite] pageScrapingMeta 書き込み完了', { siteId, totalPagesScraped: savedCount, totalPagesFailed: results.filter(r => !r.success).length });

  await progressDocRef.update({
    status: 'completed',
    completedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  logger.info('[runScrapingForSite] scrapingProgress を completed に更新', { siteId });

  logger.info(`[runScrapingForSite] 完了: ${savedCount}ページ保存`);
  return {
    success: true,
    totalPages: top100Pages.length,
    successCount: savedCount,
    failedCount: results.filter(r => !r.success).length,
    message: `${savedCount}ページのスクレイピングが完了しました`,
  };
}

/**
 * スクレイピング開始ハンドラ（index から遅延読み込み用）
 */
export async function scrapeTop100PagesHandler(request) {
  const db = getFirestore();
    const { siteId, forceRescrape = false } = request.data;

    // 認証チェック
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'ユーザー認証が必要です');
    }

    const userId = request.auth.uid;

    // 入力バリデーション
    if (!siteId) {
      throw new HttpsError('invalid-argument', 'siteIdが必要です');
    }

    logger.info(`[scrapeTop100Pages] 開始リクエスト: siteId=${siteId}, userId=${userId}`);

    try {
      // 1. サイトの所有権確認
      const siteDoc = await db.collection('sites').doc(siteId).get();

      if (!siteDoc.exists) {
        throw new HttpsError('not-found', 'サイトが見つかりません');
      }

      // サイト編集権限（オーナー・アカウント編集者・システム管理者）のみ実行可
      const canEdit = await canEditSite(userId, siteId);
      if (!canEdit) {
        throw new HttpsError(
          'permission-denied',
          'このサイトでスクレイピングを実行する権限がありません'
        );
      }

      // 2. 既に実行中でないか確認（トリガーと同じ sites/{siteId}/scrapingProgress/default を参照）
      const progressDoc = await db.collection('sites').doc(siteId).collection('scrapingProgress').doc('default').get();
      if (progressDoc.exists && progressDoc.data().status === 'in_progress') {
        throw new HttpsError(
          'resource-exhausted',
          '既にスクレイピング実行中です。完了までお待ちください。'
        );
      }

      // 3. レート制限チェック
      const lastScrapingDoc = await db
        .collection('sites')
        .doc(siteId)
        .collection('pageScrapingMeta')
        .doc('default')
        .get();

      if (lastScrapingDoc.exists && !forceRescrape) {
        const lastScrapingData = lastScrapingDoc.data();
        const lastScrapedAt = lastScrapingData.lastScrapedAt?.toDate();

        if (lastScrapedAt) {
          const hoursSinceLastScraping = (Date.now() - lastScrapedAt.getTime()) / (1000 * 60 * 60);

          if (hoursSinceLastScraping < 1) {
            throw new HttpsError(
              'resource-exhausted',
              `スクレイピングは1時間に1回まで実行可能です。次回実行可能時刻: ${new Date(lastScrapedAt.getTime() + 60 * 60 * 1000).toLocaleString('ja-JP')}`
            );
          }
        }
      }

      // 4. ジョブをキューに追加（トリガーがバックグラウンドで実行）
      await db.collection('scrapingJobs').add({
        siteId,
        requestedBy: userId,
        forceRescrape: !!forceRescrape,
        status: 'pending',
        requestedAt: FieldValue.serverTimestamp(),
      });

      logger.info(`[scrapeTop100Pages] ジョブをキューに追加: siteId=${siteId}`);
      return {
        success: true,
        message: 'スクレイピングを開始しました。進捗は下で確認できます。',
      };
    } catch (error) {
      logger.error('[scrapeTop100Pages] エラー', error);

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        'internal',
        'スクレイピングの開始に失敗しました: ' + error.message
      );
    }
}

/**
 * GA4上位100ページをスクレイピング「開始」のみ実行（即座に返す）
 * 実際のスクレイピングは scrapingJobs 作成トリガーでバックグラウンド実行（deadline-exceeded 回避）
 */
export const scrapeTop100PagesCallable = onCall(
  {
    region: 'asia-northeast1',
    memory: '256MiB',
    timeoutSeconds: 30,
    cors: true,
  },
  scrapeTop100PagesHandler
);

/**
 * GA4から上位100ページを取得
 */
async function fetchTop100PagesFromGA4(db, siteData) {
  const { userId: siteOwnerId, ga4PropertyId, ga4OauthTokenId, ga4TokenOwner } = siteData;

  logger.info('[fetchTop100PagesFromGA4] サイトデータ', { 
    siteOwnerId, 
    ga4PropertyId, 
    ga4OauthTokenId, 
    ga4TokenOwner,
    allKeys: Object.keys(siteData)
  });

  if (!ga4PropertyId || !ga4OauthTokenId) {
    throw new Error('GA4の設定が完了していません');
  }

  // トークンはサイト所有者の users/{userId}/oauth_tokens/{tokenId} に保存されている
  const tokenOwnerId = ga4TokenOwner || siteOwnerId;
  logger.info('[fetchTop100PagesFromGA4] トークン取得試行', { tokenOwnerId, ga4OauthTokenId });
  const { oauth2Client } = await getAndRefreshToken(tokenOwnerId, ga4OauthTokenId);

  // GA4 Data API 呼び出し（直近30日）
  const analyticsData = google.analyticsdata('v1beta');
  
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  const response = await analyticsData.properties.runReport({
    auth: oauth2Client,
    property: `properties/${ga4PropertyId}`,
    requestBody: {
      dateRanges: [{
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      }],
      dimensions: [
        { name: 'pagePath' },
        { name: 'pageTitle' },
      ],
      metrics: [
        { name: 'screenPageViews' },
        { name: 'totalUsers' },
        { name: 'engagementRate' },
      ],
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
      limit: 100,
    },
  });

  const pages = [];
  
  response.data.rows?.forEach(row => {
    const pagePath = row.dimensionValues[0].value;
    const pageTitle = row.dimensionValues[1].value;
    const pageViews = parseInt(row.metricValues[0].value || '0');
    const users = parseInt(row.metricValues[1].value || '0');
    const engagementRate = parseFloat(row.metricValues[2].value || '0');

    if (pagePath && pagePath !== '(not set)') {
      pages.push({
        pagePath,
        pageTitle: pageTitle !== '(not set)' ? pageTitle : pagePath,
        pageViews,
        users,
        engagementRate,
      });
    }
  });

  return pages;
}

/**
 * ページをスクレイピング（リトライ機能付き / fetch+Cheerio）
 * @param {object} pageInfo - GA4のページ情報
 * @param {string} baseUrl - サイトのベースURL
 * @param {number} maxRetries - 最大リトライ回数
 */
async function scrapePageWithRetry(pageInfo, baseUrl, maxRetries = 3) {
  const { pagePath, pageViews, users, engagementRate } = pageInfo;

  let fullUrl;
  if (pagePath.startsWith('http://') || pagePath.startsWith('https://')) {
    fullUrl = pagePath;
  } else {
    const base = baseUrl.replace(/\/$/, '');
    fullUrl = pagePath.startsWith('/') ? `${base}${pagePath}` : `${base}/${pagePath}`;
  }

  fullUrl = normalizeUrl(fullUrl);

  const robotsCheck = await checkRobotsTxt(fullUrl);
  if (!robotsCheck.allowed) {
    logger.warn(`[scrapePageWithRetry] robots.txtでdisallow: ${fullUrl}`);
    return {
      success: false,
      pagePath,
      error: robotsCheck.reason,
      skipped: true,
    };
  }

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.info(`[scrapePageWithRetry] スクレイピング試行 ${attempt}/${maxRetries}: ${fullUrl}`);

      const result = await scrapePage(fullUrl, { timeout: 15000 });

      if (result.success) {
        return {
          ...result,
          pagePath,
          pageViews,
          users,
          engagementRate,
          retryCount: attempt - 1,
        };
      }
      if (attempt === maxRetries) {
        return {
          success: false,
          pagePath,
          error: result.error,
          retryCount: attempt - 1,
        };
      }
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    } catch (error) {
      logger.error(`[scrapePageWithRetry] エラー (試行 ${attempt}/${maxRetries}): ${fullUrl}`, error);

      if (attempt === maxRetries) {
        return {
          success: false,
          pagePath,
          error: error.message,
          retryCount: attempt - 1,
        };
      }
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }

  return {
    success: false,
    pagePath,
    error: 'Max retries exceeded',
    retryCount: maxRetries,
  };
}

/**
 * スクレイピング結果をFirestoreに保存
 */
async function saveScrapingResults(db, siteId, results) {
  const batch = db.batch();
  let savedCount = 0;

  for (const result of results) {
    if (!result.success || result.skipped) {
      // 失敗またはスキップしたページはエラーログに記録
      if (!result.skipped) {
        const errorLogRef = db.collection('sites').doc(siteId).collection('scrapingErrors').doc();
        batch.set(errorLogRef, {
          pagePath: result.pagePath,
          error: result.error,
          retryCount: result.retryCount || 0,
          timestamp: FieldValue.serverTimestamp(),
        });
      }
      continue;
    }

    // 成功したページはpageScrapingDataに保存
    const docRef = db.collection('sites').doc(siteId).collection('pageScrapingData').doc();
    batch.set(docRef, {
      pagePath: result.pagePath,
      pageUrl: result.url,
      scrapedAt: FieldValue.serverTimestamp(),
      
      // メタ情報
      metaTitle: result.metaTitle || '',
      metaDescription: result.metaDescription || '',
      
      // 見出し構造
      headingStructure: result.headingStructure || { h1: 0, h2: 0, h3: 0, h4: 0 },
      
      // コンテンツ情報
      textLength: result.textLength || 0,
      mainText: result.mainText || '',
      
      // 画像情報
      imagesWithAlt: result.imagesWithAlt || 0,
      imagesWithoutAlt: result.imagesWithoutAlt || 0,
      
      // リンク情報
      internalLinks: result.internalLinks || 0,
      externalLinks: result.externalLinks || 0,
      
      // パフォーマンス
      loadTime: result.loadTime || 0,
      
      // ページタイプ
      pageType: result.pageType || 'other',
      
      // CTA情報
      ctaButtons: result.ctaButtons || [],
      
      // フォーム情報
      hasForm: result.hasForm || false,
      formFields: result.formFields || [],
      
      // GA4データ
      pageViews: result.pageViews || 0,
      users: result.users || 0,
      engagementRate: result.engagementRate || 0,
      
      // レスポンシブ判定
      isResponsive: result.isResponsive || false,
      
      // エラー情報
      scrapingError: null,
      retryCount: result.retryCount || 0,
    });

    savedCount++;
  }

  // バッチコミット（最大500件まで）
  if (savedCount > 0) {
    await batch.commit();
  }

  return savedCount;
}
