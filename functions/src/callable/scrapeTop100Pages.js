import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { google } from 'googleapis';
import { getAndRefreshToken } from '../utils/tokenManager.js';
import { launchBrowser, scrapeAllPages, normalizeUrl, checkRobotsTxt } from '../utils/unifiedPageScraper.js';
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
  const siteUrl = (siteData.siteUrl || '').trim().replace(/\/+$/, '');

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

  // 既存のスクリーンショットを削除（最新のみ保持）
  const existingScreenshots = await db.collection('sites').doc(siteId).collection('pageScreenshots').get();
  for (let i = 0; i < existingScreenshots.docs.length; i += 500) {
    const chunk = existingScreenshots.docs.slice(i, i + 500);
    const deleteBatch = db.batch();
    chunk.forEach(docSnap => deleteBatch.delete(docSnap.ref));
    await deleteBatch.commit();
  }
  if (existingScreenshots.size > 0) {
    logger.info(`[runScrapingForSite] 既存スクショ${existingScreenshots.size}件を削除`);
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

  // robots.txtチェック + URL構築
  const pageInfos = [];
  for (const pageData of top100Pages) {
    let fullUrl;
    if (pageData.pagePath.startsWith('http://') || pageData.pagePath.startsWith('https://')) {
      fullUrl = pageData.pagePath;
    } else {
      const base = siteUrl.replace(/\/$/, '');
      fullUrl = pageData.pagePath.startsWith('/') ? `${base}${pageData.pagePath}` : `${base}/${pageData.pagePath}`;
    }
    fullUrl = normalizeUrl(fullUrl);

    const robotsCheck = await checkRobotsTxt(fullUrl);
    if (!robotsCheck.allowed) {
      logger.warn(`[runScrapingForSite] robots.txtでdisallow: ${fullUrl}`);
      continue;
    }

    pageInfos.push({
      pagePath: pageData.pagePath,
      pageUrl: fullUrl,
      pageTitle: pageData.pageTitle,
      pageViews: pageData.pageViews,
      users: pageData.users,
      engagementRate: pageData.engagementRate,
    });
  }

  if (pageInfos.length === 0) {
    await progressDocRef.update({
      status: 'completed',
      completedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { success: true, totalPages: 0, successCount: 0, failedCount: 0, message: 'スクレイピング対象ページなし' };
  }

  // Puppeteerブラウザ起動 + 5並列スクレイピング
  let browser = null;
  let results = [];
  try {
    browser = await launchBrowser();
    logger.info(`[runScrapingForSite] Browser起動: ${Date.now() - startedAt}ms`);

    results = await scrapeAllPages(browser, pageInfos, {
      siteId,
      screenshotTopN: 30,
      onProgress: async ({ message, completedPages, failedPages }) => {
        await progressDocRef.set({
          siteId,
          status: 'in_progress',
          totalPages: pageInfos.length,
          completedPages: completedPages ?? 0,
          failedPages: failedPages ?? 0,
          progressMessage: message,
          updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
      },
    });
  } catch (err) {
    logger.error(`[runScrapingForSite] Browserエラー: ${err.message}`);
    throw err;
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
      logger.info('[runScrapingForSite] Browser closed');
    }
  }

  // 進捗更新
  const successCount = results.filter(r => r.success).length;
  const failedCount = results.filter(r => !r.success).length;
  await progressDocRef.update({
    completedPages: successCount,
    failedPages: failedCount,
    updatedAt: FieldValue.serverTimestamp(),
  });

  const failedResults = results.filter(r => !r.success);
  if (failedResults.length > 0) {
    failedResults.slice(0, 3).forEach((r, i) => {
      logger.warn(`[runScrapingForSite] 失敗例 ${i + 1}: ${r.pagePath || r.url} -> ${r.error}`);
    });
  }

  logger.info('[runScrapingForSite] Firestoreへの保存開始');
  const savedCount = await saveScrapingResults(db, siteId, results);

  const metaPayload = {
    lastScrapedAt: FieldValue.serverTimestamp(),
    totalPagesScraped: savedCount,
    totalPagesFailed: failedCount,
    scrapingDuration: Date.now() - startedAt,
  };
  await db.collection('sites').doc(siteId).collection('pageScrapingMeta').doc('default').set(metaPayload, { merge: true });
  logger.info('[runScrapingForSite] pageScrapingMeta 書き込み完了', { siteId, totalPagesScraped: savedCount, totalPagesFailed: failedCount });

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
    failedCount,
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
 * スクレイピング結果をFirestoreに保存
 * pageScrapingData + pageScreenshots の両方に保存
 */
async function saveScrapingResults(db, siteId, results) {
  let savedCount = 0;
  const screenshotDocs = [];

  // Firestoreのバッチは500件制限があるため、チャンクに分割
  const successResults = results.filter(r => r.success && !r.skipped);
  const failedResults = results.filter(r => !r.success && !r.skipped);

  // 成功したページをバッチ保存
  for (let i = 0; i < successResults.length; i += 250) {
    const chunk = successResults.slice(i, i + 250);
    const batch = db.batch();

    for (const result of chunk) {
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

        // フォーム情報（pageScraper互換）
        hasForm: result.hasForm || false,
        formFields: result.formFields || [],

        // GA4データ
        pageViews: result.pageViews || 0,
        users: result.users || 0,
        engagementRate: result.engagementRate || 0,

        // レスポンシブ判定
        isResponsive: result.isResponsive || false,

        // ===== 新規フィールド（deepPageScraper由来）=====
        // ファーストビュー
        firstView: result.firstView || null,
        // デザイントークン
        designTokens: result.designTokens || null,
        // キー要素（hero, CTA, header等のHTML+スタイル）
        keyElements: result.keyElements || [],
        // セクション構造（見出し + コンテンツ要約 + CTA）
        sections: result.sections || [],
        // フォーム詳細（purpose, fields, submitText）
        forms: result.forms || [],
        // スクリーンショットURL（上位30ページのみ）
        screenshotUrl: result.screenshotUrl || null,

        // エラー情報
        scrapingError: null,
        retryCount: 0,
      });

      // スクショ付きページは pageScreenshots にも保存
      if (result.screenshotUrl) {
        screenshotDocs.push({
          url: result.url,
          pagePath: result.pagePath,
          screenshotUrl: result.screenshotUrl,
          imageSize: result.imageSize || 0,
        });
      }

      savedCount++;
    }

    await batch.commit();
  }

  // 失敗したページのエラーログを保存
  for (let i = 0; i < failedResults.length; i += 500) {
    const chunk = failedResults.slice(i, i + 500);
    const batch = db.batch();
    for (const result of chunk) {
      const errorLogRef = db.collection('sites').doc(siteId).collection('scrapingErrors').doc();
      batch.set(errorLogRef, {
        pagePath: result.pagePath || '',
        error: result.error || 'Unknown error',
        retryCount: 0,
        timestamp: FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();
  }

  // pageScreenshots コレクションに保存
  if (screenshotDocs.length > 0) {
    for (let i = 0; i < screenshotDocs.length; i += 500) {
      const chunk = screenshotDocs.slice(i, i + 500);
      const batch = db.batch();
      for (const ssDoc of chunk) {
        const ref = db.collection('sites').doc(siteId).collection('pageScreenshots').doc();
        batch.set(ref, {
          ...ssDoc,
          capturedAt: FieldValue.serverTimestamp(),
        });
      }
      await batch.commit();
    }

    // メタ情報を更新
    await db.collection('sites').doc(siteId).collection('pageScreenshots').doc('_meta').set({
      totalCaptured: screenshotDocs.length,
      totalFailed: 0,
      capturedAt: FieldValue.serverTimestamp(),
    });

    logger.info(`[saveScrapingResults] pageScreenshots ${screenshotDocs.length}件保存`);
  }

  return savedCount;
}
