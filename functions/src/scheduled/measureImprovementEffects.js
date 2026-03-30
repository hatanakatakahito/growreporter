/**
 * 改善効果 After指標 自動計測 Scheduled Function
 * 毎日AM4:00(JST)に実行し、計測対象の改善タスクのAfter指標を取得・評価する
 *
 * 対象:
 * - effectMeasurement.status === 'pending' かつ nextMeasurementAt <= now
 * - effectMeasurement.status === 'measuring' （過去日の改善、即時計測）
 * - effectMeasurement.status === 'error' かつ retryCount < 3
 */
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { google } from 'googleapis';
import { getAndRefreshToken } from '../utils/tokenManager.js';
import { sendEmailDirect } from '../utils/emailSender.js';
import {
  calculateAfterPeriod,
  isAfterPeriodPast,
  getCategoryMetrics,
  shouldFetchGSC,
  shouldFetchChannels,
  shouldFetchEvents,
  extractPagePath,
  buildPageFilter,
  buildSnapshot,
  calculateChanges,
  extractKpiActual,
} from '../utils/effectMeasurementHelper.js';
import { generateEffectEvaluation, checkConcurrentTasks } from '../utils/generateEffectEvaluation.js';

const MAX_RETRY = 3;
const BATCH_SIZE = 20; // 1回の実行で処理する最大件数

export async function measureImprovementEffectsHandler() {
  const db = getFirestore();
  const now = new Date();
  console.log(`[measureEffects] Start: ${now.toISOString()}`);

  // 1. 計測対象の改善タスクを検索
  const targets = await findMeasurementTargets(db, now);
  console.log(`[measureEffects] Found ${targets.length} targets`);

  if (targets.length === 0) return { processed: 0 };

  // 2. サイト単位でグループ化（トークン再利用のため）
  const siteGroups = groupBySite(targets);

  let processed = 0;
  let succeeded = 0;
  let failed = 0;
  const completedBySite = {}; // siteId → [{title, overallScore, achievementLevel}]

  for (const [siteId, items] of Object.entries(siteGroups)) {
    try {
      const result = await processSiteGroup(db, siteId, items);
      processed += result.processed;
      succeeded += result.succeeded;
      failed += result.failed;
      if (result.completedItems?.length > 0) {
        completedBySite[siteId] = result.completedItems;
      }
    } catch (err) {
      console.error(`[measureEffects] Site ${siteId} group error:`, err.message);
      failed += items.length;
    }
  }

  // 通知送信（アラート + メール）
  for (const [siteId, completedItems] of Object.entries(completedBySite)) {
    try {
      await sendMeasurementNotifications(db, siteId, completedItems);
    } catch (notifErr) {
      console.warn(`[measureEffects] Notification error for site ${siteId}:`, notifErr.message);
    }
  }

  console.log(`[measureEffects] Done: processed=${processed}, succeeded=${succeeded}, failed=${failed}`);
  return { processed, succeeded, failed };
}

/**
 * 計測対象の改善タスクを検索
 */
async function findMeasurementTargets(db, now) {
  const targets = [];

  // emStatus/emNextMeasurementAt はcollectionGroupクエリ用のtop-levelフィールド

  // A. emStatus=pending かつ emNextMeasurementAt <= now
  const pendingSnap = await db.collectionGroup('improvements')
    .where('status', '==', 'completed')
    .where('emStatus', '==', 'pending')
    .where('emNextMeasurementAt', '<=', now.toISOString())
    .limit(BATCH_SIZE)
    .get();

  pendingSnap.forEach(doc => {
    targets.push({ id: doc.id, ref: doc.ref, ...doc.data() });
  });

  // B. emStatus=measuring（即時計測対象）
  if (targets.length < BATCH_SIZE) {
    const measuringSnap = await db.collectionGroup('improvements')
      .where('status', '==', 'completed')
      .where('emStatus', '==', 'measuring')
      .limit(BATCH_SIZE - targets.length)
      .get();

    measuringSnap.forEach(doc => {
      targets.push({ id: doc.id, ref: doc.ref, ...doc.data() });
    });
  }

  // C. emStatus=error かつ retryCount < MAX_RETRY
  if (targets.length < BATCH_SIZE) {
    const errorSnap = await db.collectionGroup('improvements')
      .where('status', '==', 'completed')
      .where('emStatus', '==', 'error')
      .limit(BATCH_SIZE - targets.length)
      .get();

    errorSnap.forEach(doc => {
      const data = doc.data();
      if ((data.effectMeasurement?.retryCount || 0) < MAX_RETRY) {
        targets.push({ id: doc.id, ref: doc.ref, ...data });
      }
    });
  }

  return targets;
}

/**
 * サイトIDでグループ化
 */
function groupBySite(targets) {
  const groups = {};
  for (const item of targets) {
    // refのパスからsiteIdを抽出: sites/{siteId}/improvements/{id}
    const siteId = item.ref.parent.parent.id;
    if (!groups[siteId]) groups[siteId] = [];
    groups[siteId].push(item);
  }
  return groups;
}

/**
 * サイト単位でAfter指標を取得
 */
async function processSiteGroup(db, siteId, items) {
  const siteDoc = await db.collection('sites').doc(siteId).get();
  if (!siteDoc.exists) {
    console.warn(`[measureEffects] Site ${siteId} not found, skipping ${items.length} items`);
    return { processed: items.length, succeeded: 0, failed: items.length };
  }

  const siteData = siteDoc.data();
  if (!siteData.ga4PropertyId || !siteData.ga4OauthTokenId) {
    console.warn(`[measureEffects] Site ${siteId} missing GA4 config`);
    return { processed: items.length, succeeded: 0, failed: items.length };
  }

  // OAuthトークン取得（サイト単位で1回）
  let oauth2Client;
  try {
    const tokenOwnerId = siteData.ga4TokenOwner || siteData.userId;
    const result = await getAndRefreshToken(tokenOwnerId, siteData.ga4OauthTokenId);
    oauth2Client = result.oauth2Client;
  } catch (err) {
    console.error(`[measureEffects] Token error for site ${siteId}:`, err.message);
    // 全アイテムをエラーにする
    await Promise.allSettled(items.map(item => markError(item, err.message)));
    return { processed: items.length, succeeded: 0, failed: items.length };
  }

  let succeeded = 0;
  let failed = 0;
  const completedItems = [];

  for (const item of items) {
    try {
      const result = await processItem(db, siteId, siteData, oauth2Client, item);
      succeeded++;
      if (result?.completed) {
        completedItems.push({
          title: item.title,
          overallScore: result.overallScore,
          achievementLevel: result.achievementLevel,
        });
      }
    } catch (err) {
      console.error(`[measureEffects] Item ${item.id} error:`, err.message);
      await markError(item, err.message);
      failed++;
    }
  }

  return { processed: items.length, succeeded, failed, completedItems };
}

/**
 * 個別の改善タスクのAfter指標を取得して保存
 */
async function processItem(db, siteId, siteData, oauth2Client, item) {
  const effectiveDate = item.effectiveDate;
  const category = item.category || 'other';
  const targetPageUrl = item.targetPageUrl || null;

  if (!effectiveDate) {
    throw new Error('effectiveDate is missing');
  }

  // After期間が過去かチェック
  if (!isAfterPeriodPast(effectiveDate)) {
    // まだAfter期間が終わっていない → pendingのまま（nextMeasurementAtで再チェック）
    console.log(`[measureEffects] Item ${item.id}: After period not yet past, skipping`);
    return;
  }

  const afterPeriod = calculateAfterPeriod(effectiveDate);
  console.log(`[measureEffects] Item ${item.id}: After period ${afterPeriod.startDate} to ${afterPeriod.endDate}`);

  // GA4データ取得
  const analyticsData = google.analyticsdata('v1beta');
  const propertyId = `properties/${siteData.ga4PropertyId}`;
  const metricsToFetch = getCategoryMetrics(category);
  const pagePath = extractPagePath(targetPageUrl);
  const pageFilter = buildPageFilter(pagePath);

  const promises = [];

  // 基本メトリクス
  promises.push(
    analyticsData.properties.runReport({
      auth: oauth2Client,
      property: propertyId,
      requestBody: {
        dateRanges: [{ startDate: afterPeriod.startDate, endDate: afterPeriod.endDate }],
        metrics: metricsToFetch.map(m => ({ name: m })),
        ...(pageFilter ? { dimensionFilter: pageFilter } : {}),
      },
    }).then(res => ({ type: 'basic', data: res.data }))
      .catch(err => ({ type: 'basic', error: err.message }))
  );

  // コンバージョン
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
          dateRanges: [{ startDate: afterPeriod.startDate, endDate: afterPeriod.endDate }],
          dimensions: [{ name: 'eventName' }],
          metrics: [{ name: 'eventCount' }],
          dimensionFilter: cvFilter,
        },
      }).then(res => ({ type: 'conversions', data: res.data }))
        .catch(err => ({ type: 'conversions', error: err.message }))
    );
  }

  // チャネル別（集客カテゴリ）
  if (shouldFetchChannels(category)) {
    promises.push(
      analyticsData.properties.runReport({
        auth: oauth2Client,
        property: propertyId,
        requestBody: {
          dateRanges: [{ startDate: afterPeriod.startDate, endDate: afterPeriod.endDate }],
          dimensions: [{ name: 'sessionDefaultChannelGroup' }],
          metrics: [{ name: 'sessions' }, { name: 'totalUsers' }, { name: 'engagementRate' }],
          ...(pageFilter ? { dimensionFilter: pageFilter } : {}),
        },
      }).then(res => ({ type: 'channels', data: res.data }))
        .catch(err => ({ type: 'channels', error: err.message }))
    );
  }

  // 外部リンク・ファイルDL（機能カテゴリ）
  if (shouldFetchEvents(category)) {
    promises.push(
      analyticsData.properties.runReport({
        auth: oauth2Client,
        property: propertyId,
        requestBody: {
          dateRanges: [{ startDate: afterPeriod.startDate, endDate: afterPeriod.endDate }],
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

  // GSC（集客カテゴリ）
  let gscResult = null;
  if (shouldFetchGSC(category) && siteData.gscSiteUrl && siteData.gscOauthTokenId) {
    try {
      const gscTokenOwnerId = siteData.gscTokenOwner || siteData.userId;
      const { oauth2Client: gscClient } = await getAndRefreshToken(gscTokenOwnerId, siteData.gscOauthTokenId);
      const searchConsole = google.searchconsole('v1');

      const gscRequestBody = {
        startDate: afterPeriod.startDate,
        endDate: afterPeriod.endDate,
        dimensions: [],
        rowLimit: 1,
      };

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
      console.warn(`[measureEffects] GSC fetch failed for ${item.id}:`, gscErr.message);
    }
  }

  // GA4結果を集約
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

  // イベント
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

  // KPI
  let kpiData = null;
  if (siteData.kpiSettings?.kpiList?.length > 0) {
    kpiData = siteData.kpiSettings.kpiList
      .filter(kpi => kpi.isActive)
      .map(kpi => ({
        id: kpi.id,
        metric: kpi.metric,
        label: kpi.label,
        target: kpi.target,
        actual: extractKpiActual(kpi, ga4Basic, ga4Conversions),
      }));
  }

  // Afterスナップショット構築
  const afterSnapshot = buildSnapshot({
    ga4Basic,
    ga4Conversions,
    gscData: gscResult,
    channelData,
    eventData,
    kpiData,
    period: afterPeriod,
  });

  // Before/After変化率算出
  const before = item.effectMeasurement?.before;
  if (!before) {
    throw new Error('Before snapshot is missing');
  }

  const changes = calculateChanges(before, afterSnapshot);

  // 総合スコア算出（主要指標の加重平均）
  let overallScore = calculateOverallScore(changes, category);
  if (isNaN(overallScore)) overallScore = 0;

  // AI評価生成（エラーでも計測自体は成功扱い）
  let aiEvaluation = null;
  try {
    const hasConcurrentTasks = await checkConcurrentTasks(db, siteId, item);
    aiEvaluation = await generateEffectEvaluation({
      item, before, after: afterSnapshot, changes, overallScore, category, hasConcurrentTasks,
    });
  } catch (aiErr) {
    console.warn(`[measureEffects] AI evaluation failed for ${item.id} (non-fatal):`, aiErr.message);
  }

  // Firestore保存
  const measurementRecord = {
    measuredAt: FieldValue.serverTimestamp(),
    afterPeriod: `${afterPeriod.startDate}_to_${afterPeriod.endDate}`,
  };

  const updateData = {
    'effectMeasurement.after': afterSnapshot,
    'effectMeasurement.changes': changes,
    'effectMeasurement.overallScore': overallScore,
    'effectMeasurement.status': 'completed',
    'effectMeasurement.completedAt': FieldValue.serverTimestamp(),
    'effectMeasurement.measurementHistory': FieldValue.arrayUnion(measurementRecord),
    emStatus: 'completed',
    emNextMeasurementAt: null,
  };

  if (aiEvaluation) {
    updateData['effectMeasurement.aiEvaluation'] = aiEvaluation;
  }

  await item.ref.update(updateData);

  console.log(`[measureEffects] Item ${item.id} completed: overallScore=${overallScore.toFixed(1)}, aiEval=${aiEvaluation ? aiEvaluation.achievementLevel : 'skipped'}`);

  // ナレッジ蓄積（匿名化）
  try {
    await saveImprovementKnowledge(db, siteId, siteData, item, category, changes, overallScore, aiEvaluation);
  } catch (knowledgeErr) {
    console.warn(`[measureEffects] Knowledge save failed for ${item.id} (non-fatal):`, knowledgeErr.message);
  }

  return {
    completed: true,
    overallScore,
    achievementLevel: aiEvaluation?.achievementLevel || null,
  };
}

/**
 * エラー記録
 */
async function markError(item, errorMessage) {
  try {
    const currentRetry = item.effectMeasurement?.retryCount || 0;
    await item.ref.update({
      'effectMeasurement.status': 'error',
      'effectMeasurement.error': errorMessage,
      'effectMeasurement.errorAt': FieldValue.serverTimestamp(),
      'effectMeasurement.retryCount': currentRetry + 1,
      emStatus: 'error',
    });
  } catch (err) {
    console.error(`[measureEffects] Failed to mark error for ${item.id}:`, err.message);
  }
}

/**
 * 総合スコア算出（-100 〜 +100）
 * カテゴリごとに重要指標の重みを変えて加重平均
 */
function calculateOverallScore(changes, category) {
  const weights = {
    acquisition: {
      sessions: 0.25, totalUsers: 0.20, newUsers: 0.15,
      clicks: 0.15, impressions: 0.10, engagementRate: 0.10, bounceRate: -0.05,
    },
    content: {
      engagementRate: 0.30, avgSessionDuration: 0.25, bounceRate: -0.20,
      pageViews: 0.15, sessions: 0.10,
    },
    design: {
      engagementRate: 0.25, bounceRate: -0.25, avgSessionDuration: 0.20,
      conversions: 0.15, conversionRate: 0.15,
    },
    feature: {
      conversions: 0.25, conversionRate: 0.25, engagementRate: 0.20,
      sessions: 0.15, bounceRate: -0.15,
    },
    other: {
      sessions: 0.20, engagementRate: 0.20, bounceRate: -0.15,
      conversions: 0.15, conversionRate: 0.15, pageViews: 0.15,
    },
  };

  const w = weights[category] || weights.other;
  let score = 0;
  let totalWeight = 0;

  for (const [metric, weight] of Object.entries(w)) {
    const change = changes[metric];
    if (change == null) continue;
    // bounceRateは負の重みなので、改善（減少）がプラス評価になる
    score += change * weight;
    totalWeight += Math.abs(weight);
  }

  if (totalWeight === 0) return 0;

  // 正規化して -100〜+100 にクランプ
  const normalized = score / totalWeight;
  return Math.max(-100, Math.min(100, normalized));
}

/**
 * 計測完了時のアラート作成 + メール送信
 */
async function sendMeasurementNotifications(db, siteId, completedItems) {
  if (!completedItems || completedItems.length === 0) return;

  const siteDoc = await db.collection('sites').doc(siteId).get();
  if (!siteDoc.exists) return;
  const siteData = siteDoc.data();
  const siteName = siteData.siteName || siteId;

  // 1. アプリ内アラート作成
  const achievementLabels = { exceeded: '期待以上', met: '達成', partial: '一部達成', not_met: '未達成' };
  const itemSummaries = completedItems.map(i => {
    const scoreStr = i.overallScore != null ? `${i.overallScore > 0 ? '+' : ''}${i.overallScore.toFixed(0)}` : '';
    const levelStr = i.achievementLevel ? ` (${achievementLabels[i.achievementLevel] || ''})` : '';
    return `${i.title}: スコア${scoreStr}${levelStr}`;
  }).join('、');

  const message = completedItems.length === 1
    ? `改善効果の計測が完了しました: ${completedItems[0].title}`
    : `${completedItems.length}件の改善効果計測が完了しました`;

  await db.collection('sites').doc(siteId).collection('alerts').add({
    siteId,
    type: 'effect_measurement_completed',
    message,
    details: itemSummaries,
    completedCount: completedItems.length,
    createdAt: FieldValue.serverTimestamp(),
  });

  // 2. メール送信（alertEmail有効なユーザーのみ）
  const ownerId = siteData.userId;
  if (!ownerId) return;

  const ownerDoc = await db.collection('users').doc(ownerId).get();
  if (!ownerDoc.exists) return;

  const ownerData = ownerDoc.data();
  const ns = ownerData.notificationSettings || {};
  if (ns.alertEmail === false) return;

  const email = ownerData.email;
  if (!email) return;

  const itemRows = completedItems.map(i => {
    const scoreStr = i.overallScore != null ? `${i.overallScore > 0 ? '+' : ''}${i.overallScore.toFixed(1)}` : '—';
    const levelStr = i.achievementLevel ? (achievementLabels[i.achievementLevel] || '') : '—';
    return `<tr><td style="padding:8px 12px;border-bottom:1px solid #eee;">${i.title}</td><td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;">${scoreStr}</td><td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;">${levelStr}</td></tr>`;
  }).join('');

  const subject = `【グローレポータ】改善効果の計測が完了しました（${siteName}）`;
  const html = `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#333;">
  <h2 style="color:#3758F9;font-size:18px;">改善効果の計測が完了しました</h2>
  <p style="font-size:14px;">${siteName} の改善タスク ${completedItems.length}件 の効果計測が完了しました。</p>
  <table style="width:100%;border-collapse:collapse;font-size:13px;margin:16px 0;">
    <thead><tr style="background:#f8f9fa;">
      <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #ddd;">タスク名</th>
      <th style="padding:8px 12px;text-align:center;border-bottom:2px solid #ddd;">スコア</th>
      <th style="padding:8px 12px;text-align:center;border-bottom:2px solid #ddd;">評価</th>
    </tr></thead>
    <tbody>${itemRows}</tbody>
  </table>
  <p style="font-size:13px;">詳細は<a href="https://growgroupreporter.web.app/reports" style="color:#3758F9;">評価する画面</a>でご確認ください。</p>
  <hr style="border:none;border-top:1px solid #eee;margin:20px 0;">
  <p style="font-size:11px;color:#999;">このメールはグローレポータ（grow-reporter.com）から自動送信されています。</p>
</div>`;
  const text = `【グローレポータ】改善効果の計測が完了しました\n\n${siteName} の改善タスク ${completedItems.length}件 の効果計測が完了しました。\n\n${completedItems.map(i => `・${i.title}: スコア${i.overallScore != null ? i.overallScore.toFixed(1) : '—'}`).join('\n')}\n\n詳細: https://growgroupreporter.web.app/reports`;

  try {
    await sendEmailDirect({ to: email, subject, html, text });
    console.log(`[measureEffects] Notification email sent to ${email} for site ${siteId}`);
  } catch (emailErr) {
    console.warn(`[measureEffects] Email send failed for ${email}:`, emailErr.message);
  }
}

/**
 * 改善ナレッジを匿名化して蓄積
 */
async function saveImprovementKnowledge(db, siteId, siteData, item, category, changes, overallScore, aiEvaluation) {
  // サイト規模帯の判定（月間PVベース）
  const monthlyPV = siteData.monthlyPageViews || 0;
  const siteScale = monthlyPV >= 100000 ? 'large' : monthlyPV >= 10000 ? 'medium' : 'small';

  // 主要指標の変化率を取得
  const primaryMetric = getPrimaryMetricForCategory(category);
  const primaryChange = changes[primaryMetric] ?? null;

  // 改善内容の匿名化要約（タイトルのみ、URL等は除外）
  const improvementSummary = (item.title || '').substring(0, 100);

  await db.collection('improvementKnowledge').add({
    industry: siteData.industry ? (Array.isArray(siteData.industry) ? siteData.industry : [siteData.industry]) : [],
    siteScale,
    category,
    targetArea: item.targetArea || '',
    improvementSummary,
    metrics: {
      primaryMetric,
      changePercent: primaryChange,
      overallScore,
      achievementLevel: aiEvaluation?.achievementLevel || null,
    },
    measurementRound: (item.effectMeasurement?.measurementHistory?.length || 0) + 1,
    createdAt: FieldValue.serverTimestamp(),
  });

  console.log(`[measureEffects] Knowledge saved for item ${item.id}`);
}

function getPrimaryMetricForCategory(category) {
  const map = {
    acquisition: 'sessions',
    content: 'engagementRate',
    design: 'engagementRate',
    feature: 'conversions',
    other: 'sessions',
  };
  return map[category] || 'sessions';
}

