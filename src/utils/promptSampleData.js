/**
 * プロンプトプレビュー用のサンプルデータ
 */

export const sampleMetrics = {
  dashboard: {
    period: '2025年10月01日から2025年10月31日までの期間',
    metrics: {
      users: 5234,
      newUsers: 3890,
      sessions: 8756,
      pageViews: 23451,
      engagementRate: 0.672,
      bounceRate: 0.328,
      avgSessionDuration: 195,
      conversions: 123,
      conversionRate: 0.0141,
    },
    hasConversions: true,
    conversionBreakdown: {
      '資料請求': {
        current: 78,
        previous: 65,
        yearAgo: 52,
        monthChange: 20.0,
        yearChange: 50.0,
      },
      'お問い合わせ': {
        current: 45,
        previous: 38,
        yearAgo: 30,
        monthChange: 18.4,
        yearChange: 50.0,
      },
    },
    hasKpiSettings: true,
    kpiData: [
      { name: 'セッション数', actual: 8756, target: 10000, achievement: 87.6, unit: '回' },
      { name: 'CV数', actual: 123, target: 150, achievement: 82.0, unit: '件' },
    ],
    monthOverMonth: {
      users: {
        current: 5234,
        previous: 4890,
        change: 7.0,
      },
      sessions: {
        current: 8756,
        previous: 8234,
        change: 6.3,
      },
      conversions: {
        current: 123,
        previous: 103,
        change: 19.4,
      },
      engagementRate: {
        current: 0.672,
        previous: 0.618,
        change: 8.7,
      },
    },
  },
  summary: {
    period: '2025年10月01日から2025年10月31日までの期間',
    metrics: {
      users: 5234,
      sessions: 8756,
      pageViews: 23451,
      engagementRate: 0.672,
      conversions: 123,
      monthlyData: [
        { yearMonth: '2025-10', users: 5234, sessions: 8756, conversions: 123 },
        { yearMonth: '2025-09', users: 4890, sessions: 8234, conversions: 115 },
        { yearMonth: '2025-08', users: 5100, sessions: 8500, conversions: 120 },
      ],
    },
  },
  day: {
    period: '2025年10月01日から2025年10月31日までの期間',
    metrics: {
      sessions: 8756,
      conversions: 123,
      dailyDataCount: 31,
      dailyData: Array.from({ length: 31 }, (_, i) => ({
        date: `2025-10-${String(i + 1).padStart(2, '0')}`,
        sessions: Math.floor(Math.random() * 200 + 250),
        conversions: Math.floor(Math.random() * 10 + 2),
      })),
      hasConversionDefinitions: true,
      conversionEventNames: ['資料請求', 'お問い合わせ'],
    },
  },
  week: {
    period: '2025年10月01日から2025年10月31日までの期間',
    metrics: {
      sessions: 8756,
      conversions: 123,
      totalDataPoints: 7,
      conversionEventNames: ['資料請求', 'お問い合わせ'],
    },
  },
  hour: {
    period: '2025年10月01日から2025年10月31日までの期間',
    metrics: {
      sessions: 8756,
      conversions: 123,
      hourlyDataCount: 24,
      conversionEventNames: ['資料請求', 'お問い合わせ'],
    },
  },
  users: {
    period: '2025年10月01日から2025年10月31日までの期間',
    metrics: {
      totalSessions: 8756,
      deviceData: [
        { device: 'desktop', sessions: 5234, percentage: 59.8 },
        { device: 'mobile', sessions: 3012, percentage: 34.4 },
        { device: 'tablet', sessions: 510, percentage: 5.8 },
      ],
      topCities: [
        { city: '東京', sessions: 2800 },
        { city: '大阪', sessions: 1500 },
        { city: '名古屋', sessions: 900 },
      ],
      conversionEventNames: ['資料請求', 'お問い合わせ'],
    },
  },
  channels: {
    period: '2025年10月01日から2025年10月31日までの期間',
    metrics: {
      totalSessions: 8756,
      totalUsers: 5234,
      totalConversions: 123,
      channelCount: 5,
      channelsText: `1. Organic Search: セッション4,500回, CV78件, ユーザー3,200人
2. Direct: セッション2,100回, CV25件, ユーザー1,200人
3. Social: セッション1,500回, CV15件, ユーザー800人
4. Referral: セッション456回, CV3件, ユーザー234人
5. Paid Search: セッション200回, CV2件, ユーザー100人`,
      conversionEventNames: ['資料請求', 'お問い合わせ'],
    },
  },
  keywords: {
    period: '2025年10月01日から2025年10月31日までの期間',
    metrics: {
      totalClicks: 12345,
      totalImpressions: 456789,
      avgCTR: 2.7,
      avgPosition: 8.5,
      keywordCount: 150,
      topKeywordsText: `1. Webマーケティング: クリック1,234回, 表示45,678回, CTR2.7%, 順位3.2
2. SEO対策: クリック890回, 表示34,567回, CTR2.6%, 順位4.1
3. アクセス解析: クリック678回, 表示23,456回, CTR2.9%, 順位5.3`,
      conversionEventNames: ['資料請求', 'お問い合わせ'],
    },
  },
  referrals: {
    period: '2025年10月01日から2025年10月31日までの期間',
    metrics: {
      totalSessions: 456,
      totalUsers: 234,
      totalConversions: 8,
      avgConversionRate: 1.75,
      referralCount: 25,
      topReferralsText: `1. partner-site.com: セッション120回, ユーザー80人, CV3件, CVR2.50%
2. media-site.jp: セッション95回, ユーザー65人, CV2件, CVR2.11%
3. blog-site.net: セッション78回, ユーザー45人, CV1件, CVR1.28%`,
      conversionEventNames: ['資料請求', 'お問い合わせ'],
    },
  },
  pages: {
    period: '2025年10月01日から2025年10月31日までの期間',
    metrics: {
      totalPageViews: 23451,
      totalSessions: 8756,
      totalUsers: 5234,
      pageCount: 125,
      topPagesText: `1. /: PV5,234, セッション3,456回, ユーザー2,890人
2. /services/: PV2,100, セッション1,234回, ユーザー980人
3. /about/: PV1,890, セッション1,100回, ユーザー890人`,
      conversionEventNames: ['資料請求', 'お問い合わせ'],
    },
  },
  pageCategories: {
    period: '2025年10月01日から2025年10月31日までの期間',
    metrics: {
      totalPageViews: 23451,
      totalSessions: 8756,
      categoryCount: 8,
      topCategoriesText: `1. サービス: PV8,900, セッション4,500回
2. ブログ: PV6,700, セッション2,300回
3. 会社情報: PV3,200, セッション1,200回`,
      conversionEventNames: ['資料請求', 'お問い合わせ'],
    },
  },
  landingPages: {
    period: '2025年10月01日から2025年10月31日までの期間',
    metrics: {
      totalSessions: 8756,
      totalUsers: 5234,
      totalConversions: 123,
      landingPageCount: 45,
      topLandingPagesText: `1. /: セッション3,456回, ユーザー2,890人, CV45件, CVR1.30%
2. /services/web-marketing/: セッション1,234回, ユーザー980人, CV25件, CVR2.03%
3. /blog/seo-guide/: セッション890回, ユーザー720人, CV12件, CVR1.35%`,
      conversionEventNames: ['資料請求', 'お問い合わせ'],
    },
  },
  fileDownloads: {
    period: '2025年10月01日から2025年10月31日までの期間',
    metrics: {
      totalDownloads: 456,
      totalUsers: 234,
      downloadCount: 15,
      topFilesText: `1. service-catalog.pdf: ダウンロード125回, ユーザー98人
2. company-profile.pdf: ダウンロード89回, ユーザー67人
3. case-study.pdf: ダウンロード67回, ユーザー45人`,
      conversionEventNames: ['資料請求', 'お問い合わせ'],
    },
  },
  externalLinks: {
    period: '2025年10月01日から2025年10月31日までの期間',
    metrics: {
      totalClicks: 234,
      totalUsers: 156,
      clickCount: 12,
      topLinksText: `1. https://partner-site.com: クリック78回, ユーザー56人
2. https://social-media.com: クリック45回, ユーザー34人
3. https://external-service.jp: クリック34回, ユーザー23人`,
      conversionEventNames: ['資料請求', 'お問い合わせ'],
    },
  },
  conversions: {
    period: '2025年10月01日から2025年10月31日までの期間',
    metrics: {
      monthlyDataPoints: 13,
      conversionEventCount: 2,
      conversionSummaryText: `資料請求: 78件
お問い合わせ: 45件`,
      conversionEventNames: ['資料請求', 'お問い合わせ'],
    },
  },
  reverseFlow: {
    period: '2025年10月01日から2025年10月31日までの期間',
    metrics: {
      flowName: '資料請求フロー',
      formPagePath: '/contact/form/',
      targetCvEvent: 'form_submit',
      totalSiteViews: 23451,
      formPageViews: 1234,
      submissionComplete: 78,
      achievementRate: 6.32,
      overallCvr: 0.33,
      monthlyDataCount: 13,
      conversionEventNames: ['form_submit'],
    },
  },
};

/**
 * ページタイプに応じたサンプルデータを取得
 * @param {string} pageType - ページタイプ
 * @returns {object} サンプルデータ
 */
export function getSampleData(pageType) {
  return sampleMetrics[pageType] || sampleMetrics.dashboard;
}

/**
 * プロンプトテンプレートをサンプルデータでレンダリング
 * @param {string} template - プロンプトテンプレート
 * @param {string} pageType - ページタイプ
 * @returns {string} レンダリング済みプロンプト
 */
export function renderPromptPreview(template, pageType) {
  try {
    const sampleData = getSampleData(pageType);
    const { period, metrics } = sampleData;
    
    // テンプレートで使用される変数を事前に計算（バックエンドと同じロジック）
    const hasConversions = sampleData.hasConversions || (sampleData.conversionBreakdown && Object.keys(sampleData.conversionBreakdown).length > 0);
    
    let conversionText = '';
    if (hasConversions && sampleData.conversionBreakdown) {
      conversionText = '\n- 総コンバージョン数: ' + (metrics.conversions?.toLocaleString() || 0) + '件';
      conversionText += '\n\n【コンバージョン内訳】';
      for (const [name, data] of Object.entries(sampleData.conversionBreakdown)) {
        conversionText += `\n- ${name}: ${data.current?.toLocaleString() || 0}件 (前月比${data.monthChange >= 0 ? '+' : ''}${data.monthChange?.toFixed(1) || 0}%)`;
      }
      // コンバージョン率はプロンプトテンプレート内で別途追加されるため、ここでは追加しない
    }
    
    let monthOverMonthText = '';
    if (sampleData.monthOverMonth) {
      monthOverMonthText = '\n\n【前月比サマリー】';
      monthOverMonthText += '\n- ユーザー数: ' + (sampleData.monthOverMonth.users?.current?.toLocaleString() || 0) + '人 (前月' + (sampleData.monthOverMonth.users?.previous?.toLocaleString() || 0) + '人, ' + (sampleData.monthOverMonth.users?.change >= 0 ? '+' : '') + (sampleData.monthOverMonth.users?.change?.toFixed(1) || 0) + '%)';
      monthOverMonthText += '\n- セッション数: ' + (sampleData.monthOverMonth.sessions?.current?.toLocaleString() || 0) + '回 (前月' + (sampleData.monthOverMonth.sessions?.previous?.toLocaleString() || 0) + '回, ' + (sampleData.monthOverMonth.sessions?.change >= 0 ? '+' : '') + (sampleData.monthOverMonth.sessions?.change?.toFixed(1) || 0) + '%)';
      if (hasConversions) {
        monthOverMonthText += '\n- コンバージョン数: ' + (sampleData.monthOverMonth.conversions?.current?.toLocaleString() || 0) + '件 (前月' + (sampleData.monthOverMonth.conversions?.previous?.toLocaleString() || 0) + '件, ' + (sampleData.monthOverMonth.conversions?.change >= 0 ? '+' : '') + (sampleData.monthOverMonth.conversions?.change?.toFixed(1) || 0) + '%)';
      }
      monthOverMonthText += '\n- エンゲージメント率: ' + ((sampleData.monthOverMonth.engagementRate?.current || 0) * 100).toFixed(1) + '% (前月' + ((sampleData.monthOverMonth.engagementRate?.previous || 0) * 100).toFixed(1) + '%, ' + (sampleData.monthOverMonth.engagementRate?.change >= 0 ? '+' : '') + (sampleData.monthOverMonth.engagementRate?.change?.toFixed(1) || 0) + '%)';
    }
    
    let kpiText = '';
    if (sampleData.hasKpiSettings && sampleData.kpiData && sampleData.kpiData.length > 0) {
      kpiText = '\n\n【KPI予実】';
      for (const kpi of sampleData.kpiData) {
        if (kpi.name) { // nameがnullでない場合のみ追加
          kpiText += `\n- ${kpi.name}: 実績${kpi.actual?.toLocaleString() || 0}${kpi.unit || ''} / 目標${kpi.target?.toLocaleString() || 0}${kpi.unit || ''} (達成率${kpi.achievement?.toFixed(1) || 0}%)`;
        }
      }
    }
    
    // テンプレート内の変数を評価して置換
    const templateFunction = new Function(
      'period', 
      'metrics', 
      'startDate', 
      'endDate', 
      'hasConversions', 
      'conversionText', 
      'monthOverMonthText', 
      'kpiText', 
      `return \`${template}\`;`
    );
    const rendered = templateFunction(
      period,
      metrics,
      '2025-10-01',
      '2025-10-31',
      hasConversions,
      conversionText,
      monthOverMonthText,
      kpiText
    );
    
    return rendered;
  } catch (error) {
    console.error('Failed to render prompt preview:', error);
    return `プレビューのレンダリングに失敗しました: ${error.message}`;
  }
}

