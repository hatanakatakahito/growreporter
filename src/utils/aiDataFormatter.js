/**
 * AI分析用データフォーマットユーティリティ
 * 
 * 標準化されたデータを、AIが理解しやすい形式（JSON + 人間可読文字列）に変換します。
 */

/**
 * データをAI向けにフォーマットする
 * @param {string} pageType - ページタイプ
 * @param {Object} enrichedData - 標準化済みデータ
 * @param {Object} aggregates - 集計値
 * @param {Array<string>} conversionEventNames - コンバージョンイベント名リスト
 * @returns {Object} AI分析用フォーマット済みデータ
 */
export function formatForAI(pageType, enrichedData, aggregates = {}, conversionEventNames = []) {
  const formatters = {
    // ダッシュボード
    dashboard: (data, agg) => ({
      aggregates: {
        totalUsers: data.totalUsers ?? 0,
        sessions: data.sessions ?? 0,
        pageViews: data.pageViews ?? 0,
        engagementRate: data.engagementRate ?? 0,
        conversions: data.conversions ?? 0,
        avgPageViewsPerSession: data.avgPageViewsPerSession ?? 0,
        conversionRate: data.conversionRate ?? 0,
      },
      topPerformance: data.topPerformance || {},
      summary: formatDashboardSummary(data),
    }),
    
    // 全体サマリー
    summary: (data, agg) => ({
      aggregates: {
        totalUsers: data.metrics?.totalUsers ?? 0,
        sessions: data.metrics?.sessions ?? 0,
        pageViews: data.metrics?.pageViews ?? 0,
        engagementRate: data.metrics?.engagementRate ?? 0,
        totalConversions: data.totalConversions ?? 0,
      },
      monthlyTrend: data.monthlyData?.length || 0,
      summary: formatAnalysisSummary(data),
    }),
    
    // ユーザー属性
    users: (data, agg) => ({
      // ユーザー属性は複雑なのでそのまま渡す
      rawData: data,
      summary: '多次元ユーザー属性データ（デバイス・地域・年齢・性別）',
    }),
    
    // 日別
    day: (items, agg) => ({
      aggregates: agg,
      topDays: formatTopN(items, 10, (item) => 
        `${item.date}: セッション${item.sessions?.toLocaleString()}回, CV${item.conversions?.toLocaleString()}件, CVR${(item.conversionRate * 100).toFixed(2)}%`
      ),
    }),
    
    // 曜日別
    week: (items, agg) => ({
      aggregates: agg,
      weekPattern: formatTopN(items, 7, (item) =>
        `${item.dayOfWeek || item.day}: セッション${item.sessions?.toLocaleString()}回, CV${item.conversions?.toLocaleString()}件`
      ),
    }),
    
    // 時間帯別
    hour: (items, agg) => ({
      aggregates: agg,
      topHours: formatTopN(items.sort((a, b) => b.sessions - a.sessions), 10, (item) =>
        `${item.hour}時: セッション${item.sessions?.toLocaleString()}回, CV${item.conversions?.toLocaleString()}件`
      ),
    }),
    
    // 集客チャネル
    channels: (items, agg) => ({
      aggregates: agg,
      topChannels: formatTopN(items, 10, (item) =>
        `${item.channel}: セッション${item.sessions?.toLocaleString()}回, ユーザー${item.users?.toLocaleString()}人, CV${item.conversions?.toLocaleString()}件, CVR${(item.conversionRate * 100).toFixed(2)}%`
      ),
    }),
    
    // 流入キーワード
    keywords: (items, agg) => ({
      aggregates: agg,
      topKeywords: formatTopN(items, 10, (item) =>
        `${item.query}: クリック${item.clicks?.toLocaleString()}回, IMP${item.impressions?.toLocaleString()}回, CTR${item.ctr?.toFixed(2)}%, 順位${item.position?.toFixed(1)}位`
      ),
    }),
    
    // 被リンク元
    referrals: (items, agg) => ({
      aggregates: agg,
      topReferrals: formatTopN(items, 10, (item) =>
        `${item.source}: セッション${item.sessions?.toLocaleString()}回, ユーザー${item.users?.toLocaleString()}人, CV${item.conversions?.toLocaleString()}件, CVR${(item.conversionRate * 100).toFixed(2)}%`
      ),
    }),
    
    // ページ別
    pages: (items, agg) => ({
      aggregates: agg,
      topPages: formatTopN(items, 10, (item) =>
        `${item.pagePath}: PV${item.pageViews?.toLocaleString()}回, セッション${item.sessions?.toLocaleString()}回, ENG率${(item.engagementRate * 100).toFixed(1)}%, CV${item.conversions?.toLocaleString()}件`
      ),
    }),
    
    // ページ分類別
    pageCategories: (items, agg) => ({
      aggregates: agg,
      topCategories: formatTopN(items, 5, (item) =>
        `${item.category}: PV${item.pageViews?.toLocaleString()}回, ページ数${item.pages}件, ENG率${(item.engagementRate * 100).toFixed(1)}%, CV${item.conversions?.toLocaleString()}件`
      ),
    }),
    
    // ランディングページ
    landingPages: (items, agg) => ({
      aggregates: agg,
      topLandingPages: formatTopN(items, 10, (item) =>
        `${item.landingPage}: セッション${item.sessions?.toLocaleString()}回, ユーザー${item.users?.toLocaleString()}人, CV${item.conversions?.toLocaleString()}件, CVR${(item.conversionRate * 100).toFixed(2)}%`
      ),
    }),
    
    // ファイルダウンロード
    fileDownloads: (items, agg) => ({
      aggregates: agg,
      topDownloads: formatTopN(items, 10, (item) =>
        `${item.fileName}: DL${item.downloads?.toLocaleString()}回, ユーザー${item.users?.toLocaleString()}人, 平均DL/人${item.avgDownloadsPerUser?.toFixed(2)}回`
      ),
    }),
    
    // 外部リンククリック
    externalLinks: (items, agg) => ({
      aggregates: agg,
      topLinks: formatTopN(items, 10, (item) =>
        `${item.linkUrl}: クリック${item.clicks?.toLocaleString()}回, ユーザー${item.users?.toLocaleString()}人, 平均クリック/人${item.avgClicksPerUser?.toFixed(2)}回`
      ),
    }),
    
    // コンバージョン一覧
    conversions: (data, agg) => {
      const { conversionData, conversionEvents } = data;
      const eventSummary = conversionEvents?.map(event => {
        const total = conversionData?.reduce((sum, month) => 
          sum + (month[event.eventName] || 0), 0
        ) || 0;
        return `${event.eventName}: ${total.toLocaleString()}件`;
      }).join('\n') || '';
      
      return {
        aggregates: {
          monthlyDataPoints: conversionData?.length || 0,
          conversionEventCount: conversionEvents?.length || 0,
        },
        eventSummary,
      };
    },
    
    // 逆算フロー
    reverseFlow: (data, agg) => ({
      // 逆算フローは複雑なのでそのまま渡す
      rawData: data,
      summary: 'コンバージョンからの逆算ユーザー行動フローデータ',
    }),
  };
  
  const formatter = formatters[pageType];
  if (!formatter) {
    console.warn(`[aiDataFormatter] Unknown pageType: ${pageType}`);
    return { rawData: enrichedData };
  }
  
  const formatted = formatter(enrichedData, aggregates);
  
  // 共通フィールド追加
  return {
    ...formatted,
    conversionEventNames,
  };
}

/**
 * トップN件をフォーマット
 * @param {Array} items - アイテムリスト
 * @param {number} n - 上位N件
 * @param {Function} formatter - フォーマット関数
 * @returns {string} フォーマット済み文字列
 */
function formatTopN(items, n, formatter) {
  if (!items || items.length === 0) return '';
  return items.slice(0, n).map((item, i) => `${i + 1}. ${formatter(item)}`).join('\n');
}

/**
 * ダッシュボード用サマリー
 */
function formatDashboardSummary(data) {
  return [
    `ユーザー: ${data.totalUsers?.toLocaleString() || 0}人`,
    `セッション: ${data.sessions?.toLocaleString() || 0}回`,
    `PV: ${data.pageViews?.toLocaleString() || 0}回`,
    `ENG率: ${(data.engagementRate * 100).toFixed(1) || 0}%`,
    `CV: ${data.conversions?.toLocaleString() || 0}件`,
    `CVR: ${(data.conversionRate * 100).toFixed(2) || 0}%`,
  ].join(', ');
}

/**
 * 全体サマリー用
 */
function formatAnalysisSummary(data) {
  const m = data.metrics || {};
  return [
    `ユーザー: ${m.totalUsers?.toLocaleString() || 0}人`,
    `セッション: ${m.sessions?.toLocaleString() || 0}回`,
    `PV: ${m.pageViews?.toLocaleString() || 0}回`,
    `ENG率: ${(m.engagementRate * 100).toFixed(1) || 0}%`,
    `CV: ${data.totalConversions?.toLocaleString() || 0}件`,
  ].join(', ');
}

