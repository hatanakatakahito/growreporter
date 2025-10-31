import { google } from 'googleapis';
import { appendBenchmarkData, appendBenchmarkDataBatch, checkDataExists } from './sheetsManager.js';
import { getAndRefreshToken } from './tokenManager.js';
import { getFirestore } from 'firebase-admin/firestore';

/**
 * 指定した年月のデータを取得
 * @param {Object} site - サイト情報（全体）
 * @param {string} yearMonth - 年月（yyyy-MM形式）
 * @returns {Object} - 月次データ
 */
async function fetchMonthlyData(site, yearMonth) {
  const db = getFirestore();
  
  try {
    const propertyId = site.ga4PropertyId;
    if (!propertyId) {
      console.error(`[benchmarkCollector] GA4プロパティIDが未設定: ${site.siteName}`);
      return null;
    }

    // yyyy-MM形式から年と月を取得
    const [year, month] = yearMonth.split('-').map(Number);
    
    // 月の開始日と終了日を計算
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0); // 次の月の0日 = 当月の最終日
    
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    console.log(`[benchmarkCollector] データ取得: ${site.siteName} ${yearMonth} (${startDateStr} ~ ${endDateStr})`);

    // トークン取得
    const tokenData = await getAndRefreshToken(db, site.id);
    if (!tokenData) {
      console.error(`[benchmarkCollector] トークン取得失敗: ${site.siteName}`);
      return null;
    }

    // OAuth2クライアント設定
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
    });

    // GA4データを取得
    const analyticsData = google.analyticsdata({ version: 'v1beta', auth: oauth2Client });
    
    const response = await analyticsData.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [{ startDate: startDateStr, endDate: endDateStr }],
        dimensions: [],
        metrics: [
          { name: 'sessions' },
          { name: 'newUsers' },
          { name: 'totalUsers' },
          { name: 'screenPageViews' },
          { name: 'engagementRate' },
          { name: 'conversions' },
        ],
      },
    });

    if (!response.data.rows || response.data.rows.length === 0) {
      console.log(`[benchmarkCollector] データなし: ${site.siteName} (${yearMonth})`);
      return null;
    }

    const row = response.data.rows[0];
    const sessions = parseInt(row.metricValues[0].value) || 0;
    const newUsers = parseInt(row.metricValues[1].value) || 0;
    const users = parseInt(row.metricValues[2].value) || 0;
    const pageViews = parseInt(row.metricValues[3].value) || 0;
    const engagementRate = parseFloat(row.metricValues[4].value) || 0;
    const conversions = parseInt(row.metricValues[5].value) || 0;

    // 計算値
    const avgPageViews = sessions > 0 ? (pageViews / sessions).toFixed(2) : 0;
    const conversionRate = sessions > 0 ? ((conversions / sessions) * 100).toFixed(2) : 0;

    return {
      yearMonth,
      sessions,
      newUsers,
      users,
      pageViews,
      avgPageViews: parseFloat(avgPageViews),
      engagementRate: parseFloat((engagementRate * 100).toFixed(2)), // パーセント表記
      conversions,
      conversionRate: parseFloat(conversionRate),
    };
  } catch (error) {
    console.error(`[benchmarkCollector] データ取得エラー (${site.siteName} ${yearMonth}):`, error);
    return null;
  }
}

/**
 * サイトの過去N ヶ月分のデータを収集してスプレッドシートに追加
 * @param {Object} site - サイト情報
 * @param {number} monthsBack - 何ヶ月前まで遡るか（デフォルト: 3）
 */
export async function collectHistoricalData(site, monthsBack = 3) {
  try {
    console.log(`[benchmarkCollector] 過去${monthsBack}ヶ月のデータ収集開始: ${site.siteName}`);

    const propertyId = site.ga4PropertyId;
    if (!propertyId) {
      console.error(`[benchmarkCollector] GA4プロパティIDが未設定: ${site.siteName}`);
      return;
    }

    const today = new Date();
    const dataToCollect = [];

    // 過去N ヶ月分のデータを収集
    for (let i = 1; i <= monthsBack; i++) {
      const targetDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const yearMonth = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`;

      // 既に存在するかチェック
      const exists = await checkDataExists(site.id, yearMonth);
      if (exists) {
        console.log(`[benchmarkCollector] データ既存のためスキップ: ${site.siteName} (${yearMonth})`);
        continue;
      }

      // データ取得
      const monthlyData = await fetchMonthlyData(site, yearMonth);
      if (monthlyData) {
        dataToCollect.push({
          siteId: site.id,
          siteName: site.siteName,
          siteType: site.siteType || '',
          industry: site.industry || '',
          ...monthlyData,
        });
      }

      // レート制限対策: 少し待機
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // データをスプレッドシートに追加
    if (dataToCollect.length > 0) {
      await appendBenchmarkDataBatch(dataToCollect);
      console.log(`[benchmarkCollector] 収集完了: ${site.siteName} (${dataToCollect.length}件)`);
    } else {
      console.log(`[benchmarkCollector] 新規データなし: ${site.siteName}`);
    }
  } catch (error) {
    console.error(`[benchmarkCollector] 収集エラー: ${site.siteName}`, error);
    throw error;
  }
}

/**
 * サイトの前月データを収集してスプレッドシートに追加
 * @param {Object} site - サイト情報
 */
export async function collectPreviousMonthData(site) {
  try {
    console.log(`[benchmarkCollector] 前月データ収集開始: ${site.siteName}`);

    const propertyId = site.ga4PropertyId;
    if (!propertyId) {
      console.error(`[benchmarkCollector] GA4プロパティIDが未設定: ${site.siteName}`);
      return;
    }

    // 前月の年月を計算
    const today = new Date();
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const yearMonth = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;

    // 既に存在するかチェック
    const exists = await checkDataExists(site.id, yearMonth);
    if (exists) {
      console.log(`[benchmarkCollector] データ既存のためスキップ: ${site.siteName} (${yearMonth})`);
      return;
    }

    // データ取得
    const monthlyData = await fetchMonthlyData(site, yearMonth);
    if (!monthlyData) {
      console.log(`[benchmarkCollector] データなし: ${site.siteName} (${yearMonth})`);
      return;
    }

    // スプレッドシートに追加
    await appendBenchmarkData({
      siteId: site.id,
      siteName: site.siteName,
      siteType: site.siteType || '',
      industry: site.industry || '',
      ...monthlyData,
    });

    console.log(`[benchmarkCollector] 収集完了: ${site.siteName} (${yearMonth})`);
  } catch (error) {
    console.error(`[benchmarkCollector] 収集エラー: ${site.siteName}`, error);
    throw error;
  }
}

