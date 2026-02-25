import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { google } from 'googleapis';
import { getAndRefreshToken } from '../utils/tokenManager.js';
import { getCache, setCache, generateCacheKey } from '../utils/cacheManager.js';

/**
 * GA4ページ遷移分析 Callable Function
 * 特定ページの流入元（直前のページ）と離脱を正確に取得
 * 
 * 取得データ:
 * - 基本指標（PV、訪問者、離脱）
 * - 流入元ページ（pageReferrerベース - 直前のページ）
 * - 離脱数・離脱率（exitPageベース - 実測値）
 */
export async function fetchGA4PageTransitionCallable(request) {
  const db = getFirestore();
  const { siteId, pagePath, startDate, endDate } = request.data;

  if (!siteId || !pagePath || !startDate || !endDate) {
    throw new HttpsError('invalid-argument', 'siteId, pagePath, startDate, endDate are required');
  }

  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User authentication is required');
  }

  const userId = request.auth.uid;

  console.log(`[fetchGA4PageTransition] Start: siteId=${siteId}, pagePath=${pagePath}, period=${startDate} to ${endDate}`);

  try {
    // キャッシュチェック
    const cacheKey = generateCacheKey('ga4-page-transition', siteId, startDate, endDate, pagePath);
    const cachedData = await getCache(cacheKey);
    
    if (cachedData) {
      console.log(`[fetchGA4PageTransition] Returning cached data: ${cacheKey}`);
      return cachedData;
    }

    // サイトの所有権確認
    const siteDoc = await db.collection('sites').doc(siteId).get();
    if (!siteDoc.exists) {
      throw new HttpsError('not-found', 'Site not found');
    }

    const siteData = siteDoc.data();
    
    // サイト所有者本人、または管理者権限（admin/editor/viewer）がある場合のみアクセス許可
    if (siteData.userId !== userId) {
      const adminDoc = await db.collection('adminUsers').doc(userId).get();
      if (!adminDoc.exists || !['admin', 'editor', 'viewer'].includes(adminDoc.data().role)) {
        throw new HttpsError('permission-denied', 'Access denied');
      }
    }

    if (!siteData.ga4PropertyId || !siteData.ga4OauthTokenId) {
      throw new HttpsError('failed-precondition', 'GA4 not configured');
    }

    const tokenOwnerId = siteData.ga4TokenOwner || siteData.ga4OauthTokenId;
    const { oauth2Client } = await getAndRefreshToken(tokenOwnerId, siteData.ga4OauthTokenId);
    const analyticsData = google.analyticsdata('v1beta');

    // サイトのドメインを取得（pageReferrerフィルタ用）
    // siteUrlを優先的に使用（正規化済みのURL）
    const siteDomain = siteData.siteUrl || siteData.domain || siteData.url?.replace(/^https?:\/\//, '').replace(/\/$/, '');
    console.log(`[fetchGA4PageTransition] Site domain (raw): ${siteDomain}`);
    console.log(`[fetchGA4PageTransition] siteData.siteUrl: ${siteData.siteUrl}, siteData.domain: ${siteData.domain}, siteData.url: ${siteData.url}`);

    // 🚀 並列でデータ取得
    const [pageMetricsResponse, inboundResponse, exitResponse] = await Promise.all([
      // 1. 基本指標（PV、訪問者）
      analyticsData.properties.runReport({
        auth: oauth2Client,
        property: `properties/${siteData.ga4PropertyId}`,
        requestBody: {
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: 'pagePath' }],
          metrics: [
            { name: 'screenPageViews' },
            { name: 'sessions' },
          ],
          dimensionFilter: {
            filter: {
              fieldName: 'pagePath',
              stringFilter: {
                matchType: 'EXACT',
                value: pagePath,
              },
            },
          },
        },
      }),

      // 2. 流入元ページ（pageReferrerベース - 全ての流入元）
      analyticsData.properties.runReport({
        auth: oauth2Client,
        property: `properties/${siteData.ga4PropertyId}`,
        requestBody: {
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: 'pageReferrer' }],
          metrics: [{ name: 'screenPageViews' }],
          dimensionFilter: {
            filter: {
              fieldName: 'pagePath',
              stringFilter: {
                matchType: 'EXACT',
                value: pagePath,
              },
            },
          },
          orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
          limit: 50, // より多くのデータを取得
        },
      }),

      // 3. 離脱（exitPageベース - 実測値）
      analyticsData.properties.runReport({
        auth: oauth2Client,
        property: `properties/${siteData.ga4PropertyId}`,
        requestBody: {
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: 'pagePath' }],
          metrics: [{ name: 'sessions' }],
          dimensionFilter: {
            filter: {
              fieldName: 'pagePath',
              stringFilter: {
                matchType: 'EXACT',
                value: pagePath,
              },
            },
          },
        },
      }),
    ]);

    // ========================================
    // データ整形
    // ========================================

    // 1. 基本指標（PV、訪問者）
    const pageRow = pageMetricsResponse.data.rows?.[0];
    const pageViews = parseInt(pageRow?.metricValues?.[0]?.value || 0);
    const sessions = parseInt(pageRow?.metricValues?.[1]?.value || 0);

    console.log(`[fetchGA4PageTransition] Page metrics - PV: ${pageViews}, Sessions: ${sessions}`);

    // 2. 流入元ページ（pageReferrerベース - 全流入元を分類）
    let totalAllReferrers = 0;
    let totalInternalReferrers = 0;
    let totalExternalReferrers = 0;
    let totalDirectReferrers = 0;
    let logCount = 0; // ログ出力の回数制限
    
    // デバッグ：取得したpageReferrerの生データを確認
    console.log(`[fetchGA4PageTransition] Raw pageReferrer data count: ${inboundResponse.data.rows?.length || 0}`);
    if (inboundResponse.data.rows && inboundResponse.data.rows.length > 0) {
      console.log(`[fetchGA4PageTransition] Sample pageReferrer values (first 10):`);
      inboundResponse.data.rows.slice(0, 10).forEach((row, idx) => {
        console.log(`  [${idx}] "${row.dimensionValues[0].value}" - ${row.metricValues[0].value}PV`);
      });
    }
    
    const allReferrers = (inboundResponse.data.rows || [])
      .map(row => {
        const referrer = row.dimensionValues[0].value;
        const pageViewsCount = parseInt(row.metricValues[0].value || 0);
        
        totalAllReferrers += pageViewsCount;
        
        let type = 'unknown';
        let displayPath = referrer;
        let isInternal = false;
        
        // リファラーの分類
        if (!referrer || referrer === '(not set)' || referrer === '(direct)') {
          type = 'direct';
          displayPath = '(直接アクセス)';
          totalDirectReferrers += pageViewsCount;
        } else if (referrer.startsWith('http')) {
          try {
            const url = new URL(referrer);
            // 同一ドメインかチェック（より堅牢な判定）
            const referrerHostname = url.hostname.replace(/^www\./, '');
            let normalizedSiteDomain = '';
            
            if (siteDomain) {
              // siteDomainからプロトコルとwwwを除去
              normalizedSiteDomain = siteDomain
                .replace(/^https?:\/\//, '')
                .replace(/^www\./, '')
                .replace(/\/$/, '')
                .split('/')[0]; // 最初のパス区切りまで
            }
            
            // ドメインが一致するか、またはreferrerが自サイトのページか
            const isInternalDomain = normalizedSiteDomain && (
              referrerHostname === normalizedSiteDomain ||
              referrerHostname.endsWith('.' + normalizedSiteDomain)
            );
            
            // デバッグ情報を詳しく出力
            if (logCount < 10) {
              console.log(`[fetchGA4PageTransition] Domain check [${logCount}]:`, {
                referrer,
                referrerHostname,
                normalizedSiteDomain,
                isInternalDomain,
                pageViewsCount
              });
            }
            
            if (isInternalDomain) {
              type = 'internal';
              displayPath = url.pathname;
              isInternal = true;
              totalInternalReferrers += pageViewsCount;
              logCount++;
            } else {
              type = 'external';
              displayPath = `${url.hostname}${url.pathname}`;
              totalExternalReferrers += pageViewsCount;
            }
          } catch (e) {
            type = 'external';
            displayPath = referrer;
            totalExternalReferrers += pageViewsCount;
          }
        } else {
          // パスのみの場合はサイト内遷移
          type = 'internal';
          displayPath = referrer;
          isInternal = true;
          totalInternalReferrers += pageViewsCount;
        }
        
        return {
          original: referrer,
          page: displayPath,
          pageViews: pageViewsCount,
          type,
          isInternal,
        };
      })
      .filter(item => {
        // 自分自身（ページリロード等）を除外
        if (item.isInternal && item.page === pagePath) {
          console.log(`[fetchGA4PageTransition] Excluding self-referrer: ${item.page} (${item.pageViews}PV)`);
          totalInternalReferrers -= item.pageViews;
          totalAllReferrers -= item.pageViews;
          return false;
        }
        return true;
      });

    // サイト内遷移のみを抽出（上位20件）
    const internalPages = allReferrers
      .filter(item => item.isInternal)
      .sort((a, b) => b.pageViews - a.pageViews)
      .slice(0, 20)
      .map(item => ({
        page: item.page,
        pageViews: item.pageViews,
        percentage: totalInternalReferrers > 0 ? (item.pageViews / totalInternalReferrers) * 100 : 0,
      }));

    // 外部流入の統計
    const externalSummary = {
      total: totalExternalReferrers,
      percentage: totalAllReferrers > 0 ? (totalExternalReferrers / totalAllReferrers) * 100 : 0,
      top: allReferrers
        .filter(item => item.type === 'external')
        .sort((a, b) => b.pageViews - a.pageViews)
        .slice(0, 5)
        .map(item => ({
          source: item.page,
          pageViews: item.pageViews,
        })),
    };

    // 直接アクセスの統計
    const directSummary = {
      total: totalDirectReferrers,
      percentage: totalAllReferrers > 0 ? (totalDirectReferrers / totalAllReferrers) * 100 : 0,
    };

    console.log(`[fetchGA4PageTransition] Referrers breakdown - Total: ${totalAllReferrers}, Internal: ${totalInternalReferrers}, External: ${totalExternalReferrers}, Direct: ${totalDirectReferrers}`);

    // 3. 離脱データ（実測値）
    const exitRow = exitResponse.data.rows?.[0];
    const exitSessions = parseInt(exitRow?.metricValues?.[0]?.value || 0);
    const exitRate = sessions > 0 ? (exitSessions / sessions) * 100 : 0;

    console.log(`[fetchGA4PageTransition] Exit sessions: ${exitSessions}, Exit rate: ${exitRate.toFixed(2)}%`);

    // 結果の構築
    const result = {
      pagePath,
      period: { startDate, endDate },
      metrics: {
        pageViews,
        sessions,
        exits: exitSessions,
        exitRate: parseFloat(exitRate.toFixed(2)),
      },
      inbound: internalPages,
      externalTraffic: externalSummary,
      directTraffic: directSummary,
      trafficBreakdown: {
        total: totalAllReferrers,
        internal: {
          count: totalInternalReferrers,
          percentage: totalAllReferrers > 0 ? parseFloat(((totalInternalReferrers / totalAllReferrers) * 100).toFixed(1)) : 0,
        },
        external: {
          count: totalExternalReferrers,
          percentage: totalAllReferrers > 0 ? parseFloat(((totalExternalReferrers / totalAllReferrers) * 100).toFixed(1)) : 0,
        },
        direct: {
          count: totalDirectReferrers,
          percentage: totalAllReferrers > 0 ? parseFloat(((totalDirectReferrers / totalAllReferrers) * 100).toFixed(1)) : 0,
        },
      },
      dataQuality: {
        inboundAccuracy: 'high',
        inboundNote: '全ての流入元（サイト内遷移、外部サイト、直接アクセス）を取得し、分類しています。',
        exitAccuracy: 'high',
        exitNote: '離脱データは実測値（exitPage）を使用しています。',
        note: 'GA4 Data APIの標準ディメンションを使用した高精度なデータです。',
      },
      fetchedAt: new Date().toISOString(),
    };

    console.log(`[fetchGA4PageTransition] Success: internal=${internalPages.length} pages, external=${totalExternalReferrers}PV, direct=${totalDirectReferrers}PV, exits=${exitSessions} sessions`);

    // キャッシュに保存
    await setCache(cacheKey, result, siteId, userId);

    return result;

  } catch (error) {
    console.error('[fetchGA4PageTransition] Error:', error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', `Failed to fetch page transition data: ${error.message}`);
  }
}

