/**
 * Before指標スナップショット取得 Callable Function
 * 改善タスク完了時にGA4/GSCのBefore期間データを取得・保存する
 */
import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { google } from 'googleapis';
import { getAndRefreshToken } from '../utils/tokenManager.js';
import { canAccessSite } from '../utils/permissionHelper.js';
import {
  calculateBeforePeriod,
  calculateNextMeasurementDate,
  isAfterPeriodPast,
  getCategoryMetrics,
  shouldFetchGSC,
  shouldFetchChannels,
  shouldFetchEvents,
  extractPagePath,
  buildPageFilter,
  buildSnapshot,
  extractKpiActual,
} from '../utils/effectMeasurementHelper.js';

/**
 * @param {object} request
 * @param {string} request.data.siteId
 * @param {string} request.data.improvementId
 * @param {string} request.data.effectiveDate - 改善反映日 (YYYY-MM-DD)
 * @param {string} request.data.category - improvement category
 * @param {string|null} request.data.targetPageUrl
 */
export async function fetchBeforeMetricsCallable(request) {
  const db = getFirestore();
  const { siteId, improvementId, effectiveDate, category, targetPageUrl } = request.data;

  // バリデーション
  if (!siteId || !improvementId || !effectiveDate) {
    throw new HttpsError('invalid-argument', 'siteId, improvementId, effectiveDate are required');
  }
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'ユーザー認証が必要です');
  }

  const userId = request.auth.uid;
  console.log(`[fetchBeforeMetrics] Start: siteId=${siteId}, improvementId=${improvementId}, effectiveDate=${effectiveDate}, category=${category}`);

  try {
    // 1. サイトアクセス権限チェック
    const siteDoc = await db.collection('sites').doc(siteId).get();
    if (!siteDoc.exists) throw new HttpsError('not-found', 'サイトが見つかりません');

    const siteData = siteDoc.data();
    const hasAccess = await canAccessSite(userId, siteId);
    if (!hasAccess) throw new HttpsError('permission-denied', 'このサイトにアクセスする権限がありません');

    // GA4設定チェック
    if (!siteData.ga4PropertyId || !siteData.ga4OauthTokenId) {
      throw new HttpsError('failed-precondition', 'GA4の設定が完了していません');
    }

    // 2. Before期間算出
    const beforePeriod = calculateBeforePeriod(effectiveDate);
    console.log(`[fetchBeforeMetrics] Before period: ${beforePeriod.startDate} to ${beforePeriod.endDate}`);

    // 3. OAuthトークン取得
    const tokenOwnerId = siteData.ga4TokenOwner || siteData.userId;
    const { oauth2Client } = await getAndRefreshToken(tokenOwnerId, siteData.ga4OauthTokenId);

    // 4. ページフィルター構築
    const pagePath = extractPagePath(targetPageUrl);
    const pageFilter = buildPageFilter(pagePath);

    // 5. GA4データ取得（並列）
    const analyticsData = google.analyticsdata('v1beta');
    const propertyId = `properties/${siteData.ga4PropertyId}`;
    const metricsToFetch = getCategoryMetrics(category || 'other');

    const promises = [];

    // 5a. 基本メトリクス
    promises.push(
      analyticsData.properties.runReport({
        auth: oauth2Client,
        property: propertyId,
        requestBody: {
          dateRanges: [{ startDate: beforePeriod.startDate, endDate: beforePeriod.endDate }],
          metrics: metricsToFetch.map(m => ({ name: m })),
          ...(pageFilter ? { dimensionFilter: pageFilter } : {}),
        },
      }).then(res => ({ type: 'basic', data: res.data }))
       .catch(err => ({ type: 'basic', error: err.message }))
    );

    // 5b. コンバージョンイベント
    if (siteData.conversionEvents?.length > 0) {
      const cvFilter = pageFilter
        ? {
            andGroup: {
              expressions: [
                { filter: { fieldName: 'eventName', inListFilter: { values: siteData.conversionEvents.map(e => e.eventName) } } },
                pageFilter,
              ],
            },
          }
        : { filter: { fieldName: 'eventName', inListFilter: { values: siteData.conversionEvents.map(e => e.eventName) } } };

      promises.push(
        analyticsData.properties.runReport({
          auth: oauth2Client,
          property: propertyId,
          requestBody: {
            dateRanges: [{ startDate: beforePeriod.startDate, endDate: beforePeriod.endDate }],
            dimensions: [{ name: 'eventName' }],
            metrics: [{ name: 'eventCount' }],
            dimensionFilter: cvFilter,
          },
        }).then(res => ({ type: 'conversions', data: res.data }))
         .catch(err => ({ type: 'conversions', error: err.message }))
      );
    }

    // 5c. チャネル別セッション（集客カテゴリのみ）
    if (shouldFetchChannels(category)) {
      promises.push(
        analyticsData.properties.runReport({
          auth: oauth2Client,
          property: propertyId,
          requestBody: {
            dateRanges: [{ startDate: beforePeriod.startDate, endDate: beforePeriod.endDate }],
            dimensions: [{ name: 'sessionDefaultChannelGroup' }],
            metrics: [{ name: 'sessions' }, { name: 'totalUsers' }, { name: 'engagementRate' }],
            ...(pageFilter ? { dimensionFilter: pageFilter } : {}),
          },
        }).then(res => ({ type: 'channels', data: res.data }))
         .catch(err => ({ type: 'channels', error: err.message }))
      );
    }

    // 5d. 外部リンク・ファイルDL（機能カテゴリのみ）
    if (shouldFetchEvents(category)) {
      promises.push(
        analyticsData.properties.runReport({
          auth: oauth2Client,
          property: propertyId,
          requestBody: {
            dateRanges: [{ startDate: beforePeriod.startDate, endDate: beforePeriod.endDate }],
            dimensions: [{ name: 'eventName' }],
            metrics: [{ name: 'eventCount' }],
            dimensionFilter: {
              filter: {
                fieldName: 'eventName',
                inListFilter: { values: ['click', 'file_download'] },
              },
            },
          },
        }).then(res => ({ type: 'events', data: res.data }))
         .catch(err => ({ type: 'events', error: err.message }))
      );
    }

    // 6. GSCデータ取得（集客カテゴリのみ）
    let gscResult = null;
    if (shouldFetchGSC(category) && siteData.gscSiteUrl && siteData.gscOauthTokenId) {
      try {
        const gscTokenOwnerId = siteData.gscTokenOwner || siteData.userId;
        const { oauth2Client: gscClient } = await getAndRefreshToken(gscTokenOwnerId, siteData.gscOauthTokenId);
        const searchConsole = google.searchconsole('v1');

        const gscRequestBody = {
          startDate: beforePeriod.startDate,
          endDate: beforePeriod.endDate,
          dimensions: [],
          rowLimit: 1,
        };

        // ページ指定がある場合はGSCでもフィルタ
        if (targetPageUrl) {
          gscRequestBody.dimensionFilter = {
            filters: [{ dimension: 'page', operator: 'contains', expression: pagePath }],
          };
          gscRequestBody.dimensions = ['page'];
          gscRequestBody.rowLimit = 25000;
        }

        const gscRes = await searchConsole.searchanalytics.query({
          auth: gscClient,
          siteUrl: siteData.gscSiteUrl,
          requestBody: gscRequestBody,
        });

        if (targetPageUrl && gscRes.data.rows?.length > 0) {
          // ページフィルタ時は集計
          let totalClicks = 0, totalImpressions = 0, totalPosition = 0, count = 0;
          gscRes.data.rows.forEach(row => {
            totalClicks += row.clicks || 0;
            totalImpressions += row.impressions || 0;
            totalPosition += row.position || 0;
            count++;
          });
          gscResult = {
            clicks: totalClicks,
            impressions: totalImpressions,
            ctr: totalImpressions > 0 ? totalClicks / totalImpressions : 0,
            position: count > 0 ? totalPosition / count : 0,
          };
        } else if (gscRes.data.rows?.[0]) {
          gscResult = {
            clicks: gscRes.data.rows[0].clicks || 0,
            impressions: gscRes.data.rows[0].impressions || 0,
            ctr: gscRes.data.rows[0].ctr || 0,
            position: gscRes.data.rows[0].position || 0,
          };
        }
      } catch (gscErr) {
        console.warn(`[fetchBeforeMetrics] GSC fetch failed (non-fatal):`, gscErr.message);
      }
    }

    // 7. GA4結果を集約
    const results = await Promise.allSettled(promises);
    const resolved = results
      .filter(r => r.status === 'fulfilled')
      .map(r => r.value)
      .filter(r => !r.error);

    // 基本メトリクス
    const basicResult = resolved.find(r => r.type === 'basic');
    const ga4Basic = {};
    if (basicResult?.data?.rows?.[0]) {
      const row = basicResult.data.rows[0];
      metricsToFetch.forEach((metric, idx) => {
        const val = row.metricValues?.[idx]?.value;
        ga4Basic[metric] = metric.includes('Rate') || metric.includes('Duration')
          ? parseFloat(val || 0)
          : parseInt(val || 0);
      });
    }

    // コンバージョン
    const cvResult = resolved.find(r => r.type === 'conversions');
    const ga4Conversions = {};
    if (cvResult?.data?.rows) {
      cvResult.data.rows.forEach(row => {
        ga4Conversions[row.dimensionValues[0].value] = parseInt(row.metricValues[0].value || 0);
      });
    }

    // チャネル
    const channelResult = resolved.find(r => r.type === 'channels');
    let channelData = null;
    if (channelResult?.data?.rows) {
      channelData = channelResult.data.rows.map(row => ({
        channel: row.dimensionValues[0].value,
        sessions: parseInt(row.metricValues[0].value || 0),
        totalUsers: parseInt(row.metricValues[1].value || 0),
        engagementRate: parseFloat(row.metricValues[2].value || 0),
      }));
    }

    // イベント（外部リンク・ファイルDL）
    const eventResult = resolved.find(r => r.type === 'events');
    let eventData = null;
    if (eventResult?.data?.rows) {
      eventData = { externalLinkClicks: 0, fileDownloads: 0 };
      eventResult.data.rows.forEach(row => {
        const eventName = row.dimensionValues[0].value;
        const count = parseInt(row.metricValues[0].value || 0);
        if (eventName === 'click') eventData.externalLinkClicks = count;
        if (eventName === 'file_download') eventData.fileDownloads = count;
      });
    }

    // 8. KPIメトリクス取得
    let kpiData = null;
    if (siteData.kpiSettings?.kpiList?.length > 0) {
      kpiData = siteData.kpiSettings.kpiList
        .filter(kpi => kpi.isActive)
        .map(kpi => ({
          id: kpi.id,
          metric: kpi.metric,
          label: kpi.label,
          target: kpi.target,
          // 実績値はga4Basicまたはコンバージョンから取得
          actual: extractKpiActual(kpi, ga4Basic, ga4Conversions),
        }));
    }

    // 9. スナップショット構築
    const beforeSnapshot = buildSnapshot({
      ga4Basic,
      ga4Conversions,
      gscData: gscResult,
      channelData,
      eventData,
      kpiData,
      period: beforePeriod,
    });

    // 10. effectMeasurementのステータス判定
    const afterPeriodPast = isAfterPeriodPast(effectiveDate);
    const status = afterPeriodPast ? 'measuring' : 'pending';
    const nextMeasurementAt = afterPeriodPast ? null : calculateNextMeasurementDate(effectiveDate);

    // 11. Firestoreに保存
    // emStatus/emNextMeasurementAt はcollectionGroupクエリ用のtop-levelフィールド
    const improvementRef = db.collection('sites').doc(siteId).collection('improvements').doc(improvementId);
    await improvementRef.update({
      effectiveDate,
      'effectMeasurement.before': beforeSnapshot,
      'effectMeasurement.status': status,
      'effectMeasurement.nextMeasurementAt': nextMeasurementAt,
      'effectMeasurement.measurementHistory': [],
      'effectMeasurement.createdAt': FieldValue.serverTimestamp(),
      emStatus: status,
      emNextMeasurementAt: nextMeasurementAt,
    });

    console.log(`[fetchBeforeMetrics] Success: siteId=${siteId}, improvementId=${improvementId}, status=${status}`);

    return {
      success: true,
      status,
      beforePeriod,
      nextMeasurementAt,
      immediateFullMeasurement: afterPeriodPast,
    };

  } catch (error) {
    console.error('[fetchBeforeMetrics] Error:', error);

    // エラーでもeffectMeasurementにerrorステータスを書き込む
    try {
      const improvementRef = db.collection('sites').doc(siteId).collection('improvements').doc(improvementId);
      await improvementRef.update({
        effectiveDate,
        'effectMeasurement.status': 'error',
        'effectMeasurement.error': error.message,
        'effectMeasurement.errorAt': FieldValue.serverTimestamp(),
        'effectMeasurement.retryCount': 0,
        emStatus: 'error',
      });
    } catch (writeErr) {
      console.error('[fetchBeforeMetrics] Failed to write error status:', writeErr);
    }

    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', `Before指標の取得に失敗しました: ${error.message}`);
  }
}

