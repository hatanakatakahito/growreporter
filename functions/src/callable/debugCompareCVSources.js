/**
 * コンバージョン数ズレ調査用 Callable Function
 *
 * 同一期間について 2 系統 (fetchGA4Data 系 / fetchGA4Summary 系) を並列実行し、
 * 差異・メタデータ・サンプリング情報・conversionEvents 整合性・キャッシュ内容を比較する。
 *
 * Admin 権限のみ呼出可能。
 *
 * 入力: { siteId, startDate, endDate, bypassCache?: boolean }
 * 出力: 6観点の詳細比較レポート
 */
import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { google } from 'googleapis';
import crypto from 'crypto';
import { getAndRefreshToken } from '../utils/tokenManager.js';
import { logger } from 'firebase-functions/v2';

const analyticsData = google.analyticsdata('v1beta');

export async function debugCompareCVSourcesCallable(req) {
  if (!req.auth) {
    throw new HttpsError('unauthenticated', 'ユーザー認証が必要です');
  }

  const userId = req.auth.uid;
  const { siteId, startDate, endDate, bypassCache = true } = req.data || {};

  if (!siteId || !startDate || !endDate) {
    throw new HttpsError('invalid-argument', 'siteId, startDate, endDate が必要です');
  }

  // Admin 権限チェック
  const db = getFirestore();
  const adminDoc = await db.collection('adminUsers').doc(userId).get();
  if (!adminDoc.exists || !['admin', 'editor'].includes(adminDoc.data()?.role)) {
    throw new HttpsError('permission-denied', 'この機能は管理者のみ利用可能です');
  }

  // サイトデータ取得
  const siteDoc = await db.collection('sites').doc(siteId).get();
  if (!siteDoc.exists) throw new HttpsError('not-found', 'サイトが見つかりません');
  const siteData = siteDoc.data();

  if (!siteData.ga4PropertyId || !siteData.ga4OauthTokenId) {
    throw new HttpsError('failed-precondition', 'GA4 が未連携です');
  }

  // GA4 OAuth クライアント取得
  const tokenOwnerId = siteData.ga4TokenOwner || siteData.userId;
  const { oauth2Client } = await getAndRefreshToken(tokenOwnerId, siteData.ga4OauthTokenId);

  const conversionEvents = siteData.conversionEvents || [];
  const conversionEventNames = conversionEvents.map(e => e.eventName);
  const conversionEventsHash = crypto
    .createHash('sha256')
    .update(JSON.stringify(conversionEventNames.sort()))
    .digest('hex')
    .substring(0, 16);

  logger.info('[debugCompareCVSources] 開始', { siteId, startDate, endDate, conversionEventNames });

  // ==================== A系統: fetchGA4Data 相当 ====================
  const aSystemPromise = (async () => {
    const results = await Promise.allSettled([
      // 基本メトリクス
      analyticsData.properties.runReport({
        auth: oauth2Client,
        property: `properties/${siteData.ga4PropertyId}`,
        requestBody: {
          dateRanges: [{ startDate, endDate }],
          metrics: [
            { name: 'sessions' },
            { name: 'totalUsers' },
            { name: 'newUsers' },
            { name: 'screenPageViews' },
            { name: 'engagementRate' },
          ],
        },
      }),
      // CV (eventCount by eventName)
      conversionEventNames.length > 0 ? analyticsData.properties.runReport({
        auth: oauth2Client,
        property: `properties/${siteData.ga4PropertyId}`,
        requestBody: {
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: 'eventName' }],
          metrics: [{ name: 'eventCount' }],
          dimensionFilter: {
            filter: {
              fieldName: 'eventName',
              inListFilter: { values: conversionEventNames },
            },
          },
        },
      }) : null,
    ]);

    const metricsResp = results[0].status === 'fulfilled' ? results[0].value : null;
    const cvResp = results[1]?.status === 'fulfilled' ? results[1].value : null;

    const metrics = {
      sessions: parseInt(metricsResp?.data?.rows?.[0]?.metricValues?.[0]?.value || 0),
      totalUsers: parseInt(metricsResp?.data?.rows?.[0]?.metricValues?.[1]?.value || 0),
      newUsers: parseInt(metricsResp?.data?.rows?.[0]?.metricValues?.[2]?.value || 0),
      screenPageViews: parseInt(metricsResp?.data?.rows?.[0]?.metricValues?.[3]?.value || 0),
      engagementRate: parseFloat(metricsResp?.data?.rows?.[0]?.metricValues?.[4]?.value || 0),
    };

    const conversions = {};
    cvResp?.data?.rows?.forEach(row => {
      conversions[row.dimensionValues[0].value] = parseInt(row.metricValues[0].value);
    });
    const totalConversions = Object.values(conversions).reduce((s, v) => s + v, 0);

    return {
      metrics,
      conversions,
      totalConversions,
      sampling: {
        metrics: metricsResp?.data?.metadata?.samplingMetadatas || null,
        cv: cvResp?.data?.metadata?.samplingMetadatas || null,
      },
      rawKind: metricsResp?.data?.kind || null,
    };
  })();

  // ==================== B系統: serverComprehensiveDataFetcher (fetchGA4Summary) 相当 ====================
  const bSystemPromise = (async () => {
    const [summaryResp, cvResp] = await Promise.allSettled([
      analyticsData.properties.runReport({
        auth: oauth2Client,
        property: `properties/${siteData.ga4PropertyId}`,
        requestBody: {
          dateRanges: [{ startDate, endDate }],
          metrics: [
            { name: 'sessions' },
            { name: 'totalUsers' },
            { name: 'newUsers' },
            { name: 'screenPageViews' },
            { name: 'engagementRate' },
          ],
        },
      }),
      conversionEventNames.length > 0 ? analyticsData.properties.runReport({
        auth: oauth2Client,
        property: `properties/${siteData.ga4PropertyId}`,
        requestBody: {
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: 'eventName' }],
          metrics: [{ name: 'eventCount' }],
          dimensionFilter: {
            filter: {
              fieldName: 'eventName',
              inListFilter: { values: conversionEventNames },
            },
          },
        },
      }) : Promise.resolve(null),
    ]);

    const metricsResp = summaryResp.status === 'fulfilled' ? summaryResp.value : null;
    const cvRespVal = cvResp.status === 'fulfilled' ? cvResp.value : null;

    const metrics = {
      sessions: parseInt(metricsResp?.data?.rows?.[0]?.metricValues?.[0]?.value || 0),
      totalUsers: parseInt(metricsResp?.data?.rows?.[0]?.metricValues?.[1]?.value || 0),
      newUsers: parseInt(metricsResp?.data?.rows?.[0]?.metricValues?.[2]?.value || 0),
      screenPageViews: parseInt(metricsResp?.data?.rows?.[0]?.metricValues?.[3]?.value || 0),
      engagementRate: parseFloat(metricsResp?.data?.rows?.[0]?.metricValues?.[4]?.value || 0),
    };

    const conversions = {};
    cvRespVal?.data?.rows?.forEach(row => {
      conversions[row.dimensionValues[0].value] = parseInt(row.metricValues[0].value);
    });
    const totalConversions = Object.values(conversions).reduce((s, v) => s + v, 0);

    return {
      metrics,
      conversions,
      totalConversions,
      sampling: {
        metrics: metricsResp?.data?.metadata?.samplingMetadatas || null,
        cv: cvRespVal?.data?.metadata?.samplingMetadatas || null,
      },
      rawKind: metricsResp?.data?.kind || null,
    };
  })();

  // ==================== C系統: GA4 ネイティブ conversions メトリクス（eventCount との比較用） ====================
  const cSystemPromise = (async () => {
    try {
      const resp = await analyticsData.properties.runReport({
        auth: oauth2Client,
        property: `properties/${siteData.ga4PropertyId}`,
        requestBody: {
          dateRanges: [{ startDate, endDate }],
          metrics: [{ name: 'conversions' }, { name: 'sessionConversionRate' }],
        },
      });
      return {
        totalConversionsNativeMetric: parseFloat(resp.data?.rows?.[0]?.metricValues?.[0]?.value || 0),
        sessionConversionRate: parseFloat(resp.data?.rows?.[0]?.metricValues?.[1]?.value || 0),
        sampling: resp.data?.metadata?.samplingMetadatas || null,
      };
    } catch (e) {
      return { error: e.message };
    }
  })();

  // ==================== api_cache 検査 ====================
  const cacheInspectionPromise = (async () => {
    try {
      const metricsKey = `ga4_${siteId}_${startDate}_${endDate}`;
      const cvKey = `ga4_${siteId}_${startDate}_${endDate}_eventName_eventCount`;

      const [metricsCacheDoc, cvCacheDoc] = await Promise.all([
        db.collection('api_cache').doc(metricsKey).get(),
        db.collection('api_cache').doc(cvKey).get(),
      ]);

      return {
        metricsKey,
        metricsKeyExists: metricsCacheDoc.exists,
        metricsCacheAge: metricsCacheDoc.exists
          ? Math.round((Date.now() - metricsCacheDoc.data().timestamp.toMillis()) / 1000)
          : null,
        cvKey,
        cvKeyExists: cvCacheDoc.exists,
        cvCacheAge: cvCacheDoc.exists
          ? Math.round((Date.now() - cvCacheDoc.data().timestamp.toMillis()) / 1000)
          : null,
        // 実際のキャッシュ内容（最初の数件のみ）
        metricsCacheData: metricsCacheDoc.exists ? metricsCacheDoc.data().data : null,
        cvCacheData: cvCacheDoc.exists ? cvCacheDoc.data().data : null,
      };
    } catch (e) {
      return { error: e.message };
    }
  })();

  const [aResult, bResult, cResult, cacheResult] = await Promise.all([
    aSystemPromise,
    bSystemPromise,
    cSystemPromise,
    cacheInspectionPromise,
  ]);

  // ==================== 差異サマリー ====================
  const diff = {
    sessions: aResult.metrics.sessions - bResult.metrics.sessions,
    totalUsers: aResult.metrics.totalUsers - bResult.metrics.totalUsers,
    newUsers: aResult.metrics.newUsers - bResult.metrics.newUsers,
    screenPageViews: aResult.metrics.screenPageViews - bResult.metrics.screenPageViews,
    engagementRate: aResult.metrics.engagementRate - bResult.metrics.engagementRate,
    totalConversions: aResult.totalConversions - bResult.totalConversions,
    conversionsByEventDiff: {},
  };
  const allEventNames = new Set([...Object.keys(aResult.conversions), ...Object.keys(bResult.conversions)]);
  allEventNames.forEach(name => {
    const aVal = aResult.conversions[name] || 0;
    const bVal = bResult.conversions[name] || 0;
    if (aVal !== bVal) {
      diff.conversionsByEventDiff[name] = { a: aVal, b: bVal, diff: aVal - bVal };
    }
  });

  // ==================== eventCount vs conversions ネイティブメトリクス比較 ====================
  const metricComparison = {
    aSystemEventCount: aResult.totalConversions,
    bSystemEventCount: bResult.totalConversions,
    nativeConversionsMetric: cResult.totalConversionsNativeMetric ?? null,
    eventCountVsNativeDiff: cResult.totalConversionsNativeMetric != null
      ? aResult.totalConversions - cResult.totalConversionsNativeMetric
      : null,
    note: 'eventCount (dimensionFilter で特定eventNameに絞り集計) vs conversions (GA4 がネイティブに CV とマークしたイベント総数) の差分。大きく乖離する場合、どちらのメトリクスを dashboard / AI で使うべきか要再検討。',
  };

  return {
    siteId,
    period: { startDate, endDate },
    conversionEvents: {
      configured: conversionEventNames,
      hash: conversionEventsHash,
      count: conversionEventNames.length,
      note: 'A系統・B系統とも同じ siteData.conversionEvents を参照しているため hash は一意。',
    },
    aSystem: aResult,  // fetchGA4Data 相当
    bSystem: bResult,  // fetchGA4Summary 相当
    cSystem: cResult,  // GA4 conversions ネイティブメトリクス
    diff,
    metricComparison,
    cacheInspection: cacheResult,
    conclusion: {
      aEqualsB: diff.sessions === 0 && diff.totalConversions === 0,
      hasSampling:
        aResult.sampling?.metrics?.length > 0 ||
        aResult.sampling?.cv?.length > 0 ||
        bResult.sampling?.metrics?.length > 0 ||
        bResult.sampling?.cv?.length > 0,
      cacheHit: cacheResult?.metricsKeyExists || cacheResult?.cvKeyExists,
    },
    timestamp: new Date().toISOString(),
  };
}
