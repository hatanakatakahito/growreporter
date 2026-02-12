/**
 * AI分析用データ標準化ユーティリティ
 * 
 * 各ページタイプのデータを標準化し、欠損データを補完します。
 * これにより、画面表示とAI分析で完全に同じデータソースを使用できます。
 */

/**
 * データを標準化・補完する
 * @param {string} pageType - ページタイプ
 * @param {Array|Object} rawData - 生データ
 * @param {Object} additionalData - 追加データ（オプション）
 * @returns {Array|Object} 標準化されたデータ
 */
export function enrichData(pageType, rawData, additionalData = {}) {
  if (!rawData) return pageType === 'dashboard' || pageType === 'summary' ? {} : [];
  
  const enrichers = {
    // ダッシュボード
    dashboard: (data) => ({
      ...data,
      // 基本メトリクスの補完
      totalUsers: data.totalUsers ?? 0,
      sessions: data.sessions ?? 0,
      pageViews: data.pageViews ?? 0,
      engagementRate: data.engagementRate ?? 0,
      conversions: data.conversions ?? 0,
      // 計算値
      avgPageViewsPerSession: data.sessions > 0 ? (data.pageViews / data.sessions) : 0,
      conversionRate: data.sessions > 0 ? (data.conversions / data.sessions) : 0,
    }),
    
    // 全体サマリー
    summary: (data) => ({
      ...data,
      metrics: {
        totalUsers: data.metrics?.totalUsers ?? 0,
        sessions: data.metrics?.sessions ?? 0,
        pageViews: data.metrics?.pageViews ?? 0,
        engagementRate: data.metrics?.engagementRate ?? 0,
      },
      totalConversions: data.totalConversions ?? 0,
      monthlyData: data.monthlyData ?? [],
    }),
    
    // ユーザー属性
    users: (data) => data,  // そのまま（複雑な構造のため）
    
    // 日別
    day: (items) => items.map(item => ({
      ...item,
      date: item.date,
      sessions: item.sessions ?? 0,
      conversions: item.conversions ?? 0,
      conversionRate: item.sessions > 0 ? (item.conversions / item.sessions) : 0,
    })),
    
    // 曜日別
    week: (items) => items.map(item => ({
      ...item,
      sessions: item.sessions ?? 0,
      conversions: item.conversions ?? 0,
    })),
    
    // 時間帯別
    hour: (items) => items.map(item => ({
      ...item,
      hour: item.hour,
      sessions: item.sessions ?? 0,
      conversions: item.conversions ?? 0,
    })),
    
    // 集客チャネル
    channels: (items) => items.map(item => ({
      ...item,
      channel: item.channel || item.sessionDefaultChannelGroup || 'Unknown',
      sessions: item.sessions ?? 0,
      users: item.users ?? 0,
      conversions: item.conversions ?? 0,
      conversionRate: item.sessions > 0 ? (item.conversions / item.sessions) : 0,
    })),
    
    // 流入キーワード
    keywords: (items) => items.map(item => ({
      ...item,
      query: item.query || item.keyword || '',
      clicks: item.clicks ?? 0,
      impressions: item.impressions ?? 0,
      ctr: item.ctr ?? 0,
      position: item.position ?? 0,
    })),
    
    // 被リンク元
    referrals: (items) => items.map(item => ({
      ...item,
      source: item.source || item.referrer || 'Unknown',
      sessions: item.sessions ?? 0,
      users: item.users ?? 0,
      conversions: item.conversions ?? 0,
      conversionRate: item.sessions > 0 ? (item.conversions / item.sessions) : 0,
    })),
    
    // ページ別
    pages: (items) => items.map(item => ({
      ...item,
      pagePath: item.pagePath || item.page || '/',
      pageViews: item.pageViews ?? 0,
      sessions: item.sessions ?? 0,
      users: item.users ?? 0,
      engagementRate: item.engagementRate ?? 0,
      conversions: item.conversions ?? 0,
      bounceRate: item.bounceRate ?? (item.engagementRate !== undefined ? 1 - item.engagementRate : 0),
    })),
    
    // ページ分類別
    pageCategories: (items) => items.map(item => ({
      ...item,
      category: item.category || '/',
      pageViews: item.pageViews ?? 0,
      pages: item.pages ?? 0,
      sessions: item.sessions ?? 0,
      users: item.users ?? 0,
      engagementRate: item.engagementRate ?? 0,
      conversions: item.conversions ?? 0,
      // ページあたり平均PV
      avgPageViewsPerPage: item.pages > 0 ? (item.pageViews / item.pages) : 0,
    })),
    
    // ランディングページ
    landingPages: (items) => items.map(item => ({
      ...item,
      landingPage: item.landingPage || item.pagePath || '/',
      sessions: item.sessions ?? 0,
      users: item.users ?? 0,
      conversions: item.conversions ?? 0,
      conversionRate: item.sessions > 0 ? (item.conversions / item.sessions) : 0,
      bounceRate: item.bounceRate ?? 0,
    })),
    
    // ファイルダウンロード
    fileDownloads: (items) => items.map(item => ({
      ...item,
      fileName: item.fileName || item.linkUrl || 'Unknown',
      downloads: item.downloads ?? item.eventCount ?? 0,
      users: item.users ?? 0,
      avgDownloadsPerUser: item.users > 0 ? (item.downloads / item.users) : 0,
    })),
    
    // 外部リンククリック
    externalLinks: (items) => items.map(item => ({
      ...item,
      linkUrl: item.linkUrl || 'Unknown',
      clicks: item.clicks ?? item.eventCount ?? 0,
      users: item.users ?? 0,
      avgClicksPerUser: item.users > 0 ? (item.clicks / item.users) : 0,
    })),
    
    // コンバージョン一覧
    conversions: (data) => data,  // 複雑な構造のためそのまま
    
    // 逆算フロー
    reverseFlow: (data) => data,  // 複雑な構造のためそのまま
  };
  
  const enricher = enrichers[pageType];
  if (!enricher) {
    console.warn(`[dataEnricher] Unknown pageType: ${pageType}`);
    return rawData;
  }
  
  return enricher(rawData);
}

/**
 * 集計値を計算する
 * @param {string} pageType - ページタイプ
 * @param {Array|Object} data - データ
 * @returns {Object} 集計値
 */
export function calculateAggregates(pageType, data) {
  if (!data) return {};
  
  const aggregators = {
    day: (items) => ({
      totalSessions: items.reduce((sum, item) => sum + (item.sessions || 0), 0),
      totalConversions: items.reduce((sum, item) => sum + (item.conversions || 0), 0),
      dataPoints: items.length,
    }),
    
    week: (items) => ({
      totalSessions: items.reduce((sum, item) => sum + (item.sessions || 0), 0),
      totalConversions: items.reduce((sum, item) => sum + (item.conversions || 0), 0),
      maxSessions: Math.max(...items.map(item => item.sessions || 0)),
      maxConversions: Math.max(...items.map(item => item.conversions || 0)),
    }),
    
    hour: (items) => ({
      totalSessions: items.reduce((sum, item) => sum + (item.sessions || 0), 0),
      totalConversions: items.reduce((sum, item) => sum + (item.conversions || 0), 0),
    }),
    
    channels: (items) => ({
      totalSessions: items.reduce((sum, item) => sum + (item.sessions || 0), 0),
      totalUsers: items.reduce((sum, item) => sum + (item.users || 0), 0),
      totalConversions: items.reduce((sum, item) => sum + (item.conversions || 0), 0),
      channelCount: items.length,
    }),
    
    keywords: (items) => ({
      totalClicks: items.reduce((sum, item) => sum + (item.clicks || 0), 0),
      totalImpressions: items.reduce((sum, item) => sum + (item.impressions || 0), 0),
      avgCTR: items.length > 0 ? items.reduce((sum, item) => sum + (item.ctr || 0), 0) / items.length : 0,
      avgPosition: items.length > 0 ? items.reduce((sum, item) => sum + (item.position || 0), 0) / items.length : 0,
      keywordCount: items.length,
    }),
    
    referrals: (items) => ({
      totalSessions: items.reduce((sum, item) => sum + (item.sessions || 0), 0),
      totalUsers: items.reduce((sum, item) => sum + (item.users || 0), 0),
      totalConversions: items.reduce((sum, item) => sum + (item.conversions || 0), 0),
      referralCount: items.length,
    }),
    
    pages: (items) => ({
      totalPageViews: items.reduce((sum, item) => sum + (item.pageViews || 0), 0),
      totalSessions: items.reduce((sum, item) => sum + (item.sessions || 0), 0),
      totalUsers: items.reduce((sum, item) => sum + (item.users || 0), 0),
      pageCount: items.length,
    }),
    
    pageCategories: (items) => ({
      totalPageViews: items.reduce((sum, item) => sum + (item.pageViews || 0), 0),
      categoryCount: items.length,
    }),
    
    landingPages: (items) => ({
      totalSessions: items.reduce((sum, item) => sum + (item.sessions || 0), 0),
      totalUsers: items.reduce((sum, item) => sum + (item.users || 0), 0),
      totalConversions: items.reduce((sum, item) => sum + (item.conversions || 0), 0),
      landingPageCount: items.length,
    }),
    
    fileDownloads: (items) => ({
      totalDownloads: items.reduce((sum, item) => sum + (item.downloads || 0), 0),
      totalUsers: items.reduce((sum, item) => sum + (item.users || 0), 0),
      downloadCount: items.length,
    }),
    
    externalLinks: (items) => ({
      totalClicks: items.reduce((sum, item) => sum + (item.clicks || 0), 0),
      totalUsers: items.reduce((sum, item) => sum + (item.users || 0), 0),
      clickCount: items.length,
    }),
  };
  
  const aggregator = aggregators[pageType];
  if (!aggregator) {
    return {};
  }
  
  return aggregator(data);
}

