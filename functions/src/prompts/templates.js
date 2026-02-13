/**
 * AI分析プロンプトテンプレート集
 *
 * 各ページタイプごとのプロンプトを一元管理
 * プロンプトを変更する場合は、このファイルを編集してください
 * 元のコード（generateAISummary.js）から正確に抽出
 */

/**
 * プロンプトテンプレートを取得
 * @param {string} pageType - ページタイプ
 * @param {string} period - 期間（例: "2024/01/01から2024/01/31までの期間"）
 * @param {object} metrics - メトリクスデータ
 * @param {string} [startDate] - 開始日（comprehensive_improvement用、省略時はperiodから解析）
 * @param {string} [endDate] - 終了日（comprehensive_improvement用、省略時はperiodから解析）
 * @returns {string} プロンプトテンプレート
 */
export function getPromptTemplate(pageType, period, metrics, startDate, endDate) {
  const templates = {
    summary: getSummaryPrompt,
    day: getDayPrompt,
    week: getWeekPrompt,
    hour: getHourPrompt,
    dashboard: getDashboardPrompt,
    users: getUsersPrompt,
    reverseFlow: getReverseFlowPrompt,
    comprehensive_improvement: getComprehensiveImprovementPrompt,
    channels: getChannelsPrompt,
    referrals: getReferralsPrompt,
    landingPages: getLandingPagesPrompt,
    pages: getPagesPrompt,
    pageCategories: getPageCategoriesPrompt,
    keywords: getKeywordsPrompt,
    conversions: getConversionsPrompt,
    fileDownloads: getFileDownloadsPrompt,
    externalLinks: getExternalLinksPrompt,
  };

  const templateFunc = templates[pageType];
  if (!templateFunc) {
    return getDefaultPrompt(period, metrics);
  }

  if (pageType === 'comprehensive_improvement') {
    const parsed = parsePeriod(period);
    const sd = startDate || parsed.startDate;
    const ed = endDate || parsed.endDate;
    return templateFunc(period, metrics, sd, ed);
  }

  return templateFunc(period, metrics);
}

function parsePeriod(period) {
  const m = (period || '').match(/^(.+?)から(.+?)までの期間$/);
  return { startDate: m ? m[1] : '', endDate: m ? m[2] : '' };
}

/**
 * 全体サマリー用プロンプト
 */
function getSummaryPrompt(period, metrics) {
  let monthlyTrendText = '';
  if (metrics.monthlyData && Array.isArray(metrics.monthlyData) && metrics.monthlyData.length > 0) {
    const recentMonths = metrics.monthlyData.slice(0, 5);
    monthlyTrendText = '\n\n【13ヶ月推移（最新5ヶ月）】\n';
    recentMonths.forEach(month => {
      monthlyTrendText += `- ${month.yearMonth}: ユーザー${month.users?.toLocaleString() || 0}人, セッション${month.sessions?.toLocaleString() || 0}回, CV${month.conversions?.toLocaleString() || 0}件\n`;
    });
  }

  return `
あなたはWebアクセス解析の専門家です。${period}のWebサイトパフォーマンスを分析し、**Web担当者にわかりやすく端的に伝える**日本語の要約を生成してください。

【現在期間のデータ】
- 総ユーザー数: ${metrics.users?.toLocaleString() || metrics.totalUsers?.toLocaleString() || 0}人
- セッション数: ${metrics.sessions?.toLocaleString() || 0}回
- ページビュー数: ${metrics.pageViews?.toLocaleString() || metrics.screenPageViews?.toLocaleString() || 0}回
- エンゲージメント率: ${((metrics.engagementRate || 0) * 100).toFixed(1)}%
- コンバージョン数: ${metrics.conversions?.toLocaleString() || 0}件${monthlyTrendText}

【出力形式】
箇条書き（•）で2-4個の要点のみ。見出し（##）は一切使わない。合計300-400文字程度。

【記述内容】
1. 最重要ポイント：最も注目すべき変化や傾向（数値付き）
2. 原因分析：なぜそうなったか（簡潔に）
3. 改善提案：何をすべきか（1-2個、端的に）

【必須】具体的な数値、増減の方向性、原因の推測、わかりやすい表現

【禁止】見出し（##）、長文（1要点2文以内）、5個以上の箇条書き、800文字

【記述例】
• サイト全体は流入が減少傾向の一方、CVは増加。
• 流入減の主因はトップページPVの大幅減（-14%）で、トップの改善がインパクト大。
• エンゲージメント率は前月比+5.2%と改善傾向で、コンテンツの質は向上している。
`;
}

/**
 * 日別分析用プロンプト
 */
function getDayPrompt(period, metrics) {
  const hasConversions = metrics.hasConversionDefinitions === true;

  let dailyStatsText = '';
  if (metrics.dailyData && Array.isArray(metrics.dailyData) && metrics.dailyData.length > 0) {
    const allDays = metrics.dailyData;
    let maxSessions = 0, minSessions = Infinity;
    let maxSessionDay = '', minSessionDay = '';
    let totalSessions = 0;
    let maxConversions = 0, minConversions = Infinity;
    let maxConversionDay = '', minConversionDay = '';
    let totalConversions = 0;
    let hasConversionData = false;
    const dayOfWeekStats = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
    const dayOfWeekConversions = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
    const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
    const dailyDetailList = [];

    allDays.forEach(day => {
      const sessions = day.sessions || 0;
      const conversions = day.conversions || 0;
      totalSessions += sessions;
      totalConversions += conversions;
      if (conversions > 0) hasConversionData = true;
      if (sessions > maxSessions) { maxSessions = sessions; maxSessionDay = day.date; }
      if (sessions < minSessions) { minSessions = sessions; minSessionDay = day.date; }
      if (conversions > maxConversions) { maxConversions = conversions; maxConversionDay = day.date; }
      if (conversions < minConversions && conversions > 0) { minConversions = conversions; minConversionDay = day.date; }
      if (day.date) {
        const dateStr = day.date.toString();
        const year = parseInt(dateStr.substring(0, 4));
        const month = parseInt(dateStr.substring(4, 6)) - 1;
        const dayNum = parseInt(dateStr.substring(6, 8));
        const date = new Date(year, month, dayNum);
        const dayOfWeek = date.getDay();
        if (!isNaN(dayOfWeek)) {
          dayOfWeekStats[dayOfWeek].push(sessions);
          dayOfWeekConversions[dayOfWeek].push(conversions);
          const formattedDate = `${year}/${month + 1}/${dayNum}`;
          dailyDetailList.push({ date: formattedDate, dayOfWeek: dayNames[dayOfWeek], sessions, conversions });
        }
      }
    });

    const avgSessions = Math.round(totalSessions / allDays.length);
    const avgConversions = hasConversionData ? (totalConversions / allDays.length).toFixed(1) : 0;
    const dayOfWeekAvg = Object.keys(dayOfWeekStats).map(day => {
      const sessions = dayOfWeekStats[day];
      if (sessions.length === 0) return null;
      const avg = Math.round(sessions.reduce((a, b) => a + b, 0) / sessions.length);
      return `${dayNames[day]}曜: ${avg.toLocaleString()}`;
    }).filter(Boolean).join(', ');
    const topDays = [...dailyDetailList]
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, 10)
      .map(d => `${d.date}(${d.dayOfWeek}): ${d.sessions.toLocaleString()}セッション, ${d.conversions}CV`)
      .join('\n');

    dailyStatsText = `\n\n【日別データの統計】
セッション:
- 最大: ${maxSessionDay}（${maxSessions.toLocaleString()}セッション）
- 最小: ${minSessionDay}（${minSessions.toLocaleString()}セッション）
- 平均: ${avgSessions.toLocaleString()}セッション/日
- 変動幅: ${((maxSessions - minSessions) / avgSessions * 100).toFixed(0)}%
- 曜日別平均: ${dayOfWeekAvg}

【日別詳細データ（上位10日）】
${topDays}`;

    if (hasConversions && hasConversionData) {
      const maxCvr = maxSessions > 0 ? ((maxConversions / maxSessions) * 100).toFixed(2) : 0;
      const minCvr = minSessions > 0 ? ((minConversions / minSessions) * 100).toFixed(2) : 0;
      dailyStatsText += `\n\nコンバージョン:
- 最大: ${maxConversionDay}（${maxConversions}件、CVR ${maxCvr}%）
- 最小: ${minConversionDay}（${minConversions}件、CVR ${minCvr}%）
- 平均: ${avgConversions}件/日`;
    }
  }

  const conversionWarning = !hasConversions ? `\n\n⚠️ **注意**: コンバージョン定義が未設定です。サイト設定画面から設定すると、CV分析が可能になります。` : '';

  return `
あなたは【トラフィック変動分析の専門家】です。${period}のWebサイトの日別データを分析し、**ビジネスへの影響と実用的なインサイト**を含む日本語の要約を生成してください。

【現在期間のデータ】
- 総セッション数: ${metrics.sessions?.toLocaleString() || 0}回
- 1日平均: ${metrics.sessions && dailyStatsText ? Math.round(metrics.sessions / (metrics.dailyData?.length || 30)).toLocaleString() : 0}回${hasConversions ? `
- 総コンバージョン数: ${metrics.conversions?.toLocaleString() || 0}件
- 全体CVR: ${(metrics.sessions > 0 ? ((metrics.conversions / metrics.sessions) * 100) : 0).toFixed(2)}%` : ''}${dailyStatsText}${conversionWarning}

【出力形式】
箇条書き（•）で2-4個の要点のみ。見出し（##）は一切使わない。合計300-400文字程度。

【記述内容】
1. 最重要ポイント：最大日・最小日や曜日傾向など、最も注目すべき変化（数値付き）
2. 原因分析：なぜその変動パターンになったか（簡潔に）
3. 改善提案：セッション少ない曜日への施策、CVR改善など（1-2個、端的に）

【必須】具体的な数値、増減の方向性、原因の推測、わかりやすい表現

【禁止】見出し（##）、長文（1要点2文以内）、5個以上の箇条書き、800文字
`;
}

/**
 * 曜日別分析用プロンプト
 */
function getWeekPrompt(period, metrics) {
  const hasConversions = metrics.conversionEventNames && metrics.conversionEventNames.length > 0;
  let weeklyDetailsText = '';
  if (metrics.weeklyData && Array.isArray(metrics.weeklyData) && metrics.weeklyData.length > 0) {
    const dayMap = {};
    metrics.weeklyData.forEach(row => {
      const dayOfWeek = parseInt(row.dayOfWeek);
      const sessions = row.sessions || 0;
      const conversions = row.conversions || 0;
      const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      if (!dayMap[adjustedDay]) dayMap[adjustedDay] = { sessions: 0, conversions: 0 };
      dayMap[adjustedDay].sessions += sessions;
      dayMap[adjustedDay].conversions += conversions;
    });
    const dayNames = ['月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日', '日曜日'];
    weeklyDetailsText = `\n\n【曜日別の詳細データ】\n` + dayNames.map((name, index) => {
      const data = dayMap[index] || { sessions: 0, conversions: 0 };
      const cvText = hasConversions ? `, CV: ${data.conversions}件` : '';
      return `${name}: ${data.sessions}セッション${cvText}`;
    }).join('\n');
  }
  const conversionNote = hasConversions ? `\n- コンバージョン数: ${metrics.conversions?.toLocaleString() || 0}件` : '\n\n⚠️ **注意**: コンバージョン定義が未設定です。CV分析をご希望の場合、サイト設定画面から設定してください。';

  return `
あなたは【曜日別分析の専門家】です。${period}のWebサイトの曜日別データを分析し、**曜日ごとのトレンドと最適な施策タイミング**を含む日本語の要約を生成してください。

【現在期間のデータ】
- 総セッション数: ${metrics.sessions?.toLocaleString() || 0}回${conversionNote}${weeklyDetailsText}

【出力形式】
箇条書き（•）で2-4個の要点のみ。見出し（##）は一切使わない。合計300-400文字程度。

【記述内容】
1. 最重要ポイント：最多曜日・最少曜日、平日vs週末の差など（数値付き）
2. 原因分析：なぜその曜日傾向になったか（簡潔に）
3. 改善提案：セッション少ない曜日への施策、CVR高い曜日への集中など（1-2個、端的に）

【必須】具体的な数値、増減の方向性、原因の推測、わかりやすい表現

【禁止】見出し（##）、長文（1要点2文以内）、5個以上の箇条書き、800文字、時間帯の言及（データに含まれない）
`;
}

/**
 * 時間帯別分析用プロンプト
 */
function getHourPrompt(period, metrics) {
  const hasConversions = metrics.conversionEventNames && metrics.conversionEventNames.length > 0;
  let hourlyDetailsText = '';
  if (metrics.hourlyData && Array.isArray(metrics.hourlyData) && metrics.hourlyData.length > 0) {
    const sortedByHour = [...metrics.hourlyData].sort((a, b) => parseInt(a.hour) - parseInt(b.hour));
    hourlyDetailsText = `\n\n【時間帯別の詳細データ】\n` + sortedByHour.map(row => {
      const hour = parseInt(row.hour);
      const sessions = row.sessions || 0;
      const conversions = row.conversions || 0;
      const cvText = hasConversions ? `, CV: ${conversions}件` : '';
      return `${hour}時: ${sessions}セッション${cvText}`;
    }).join('\n');
  }
  const conversionNote = hasConversions ? `\n- コンバージョン数: ${metrics.conversions?.toLocaleString() || 0}件` : '\n\n⚠️ **注意**: コンバージョン定義が未設定です。CV分析をご希望の場合、サイト設定画面から設定してください。';

  return `
あなたは【24時間行動分析の専門家】です。${period}のWebサイトの時間帯別データを分析し、**時間軸でのユーザー行動理解とビジネスへの影響**を含む日本語の要約を生成してください。

【現在期間のデータ】
- 総セッション数: ${metrics.sessions?.toLocaleString() || 0}回${conversionNote}${hourlyDetailsText}

【出力形式】
箇条書き（•）で2-4個の要点のみ。見出し（##）は一切使わない。合計300-400文字程度。

【記述内容】
1. 最重要ポイント：ピーク時間帯・デッドタイム、時間帯別の割合など（数値付き）
2. 原因分析：なぜその時間帯傾向になったか（簡潔に）
3. 改善提案：ピーク時間帯への広告集中、CVR高い時間帯への予算シフトなど（1-2個、端的に）

【必須】具体的な数値、増減の方向性、原因の推測、わかりやすい表現

【禁止】見出し（##）、長文（1要点2文以内）、5個以上の箇条書き、800文字
`;
}

/**
 * ダッシュボード用プロンプト
 */
function getDashboardPrompt(period, metrics) {
  const hasConversions = metrics.hasConversionDefinitions === true;
  let conversionText = '';
  if (hasConversions) {
    conversionText = `\n- 総コンバージョン数: ${metrics.conversions?.toLocaleString() || 0}件`;
    if (metrics.conversionBreakdown && typeof metrics.conversionBreakdown === 'object') {
      const cvEntries = Object.entries(metrics.conversionBreakdown);
      if (cvEntries.length > 0) {
        conversionText += '\n\n【コンバージョン内訳】';
        cvEntries.forEach(([name, data]) => {
          const sign = data.monthChange >= 0 ? '+' : '';
          conversionText += `\n- ${name}: ${data.current?.toLocaleString() || 0}件 (前月比${sign}${data.monthChange.toFixed(1)}%)`;
        });
      }
    }
  } else {
    conversionText = '\n- コンバージョン定義: 未設定（設定後に計測開始）';
  }
  let monthOverMonthText = '';
  if (metrics.monthOverMonth) {
    const mom = metrics.monthOverMonth;
    monthOverMonthText = '\n\n【前月比サマリ】';
    if (mom.users) {
      const sign = mom.users.change >= 0 ? '+' : '';
      monthOverMonthText += `\n- ユーザー数: ${mom.users.current?.toLocaleString() || 0}人 (前月${mom.users.previous?.toLocaleString() || 0}人, ${sign}${mom.users.change.toFixed(1)}%)`;
    }
    if (mom.sessions) {
      const sign = mom.sessions.change >= 0 ? '+' : '';
      monthOverMonthText += `\n- セッション数: ${mom.sessions.current?.toLocaleString() || 0}回 (前月${mom.sessions.previous?.toLocaleString() || 0}回, ${sign}${mom.sessions.change.toFixed(1)}%)`;
    }
    if (mom.conversions && hasConversions) {
      const sign = mom.conversions.change >= 0 ? '+' : '';
      monthOverMonthText += `\n- コンバージョン数: ${mom.conversions.current?.toLocaleString() || 0}件 (前月${mom.conversions.previous?.toLocaleString() || 0}件, ${sign}${mom.conversions.change.toFixed(1)}%)`;
    }
    if (mom.engagementRate) {
      const sign = mom.engagementRate.change >= 0 ? '+' : '';
      monthOverMonthText += `\n- エンゲージメント率: ${((mom.engagementRate.current || 0) * 100).toFixed(1)}% (前月${((mom.engagementRate.previous || 0) * 100).toFixed(1)}%, ${sign}${mom.engagementRate.change.toFixed(1)}%)`;
    }
  }
  let kpiText = '';
  if (metrics.hasKpiSettings && metrics.kpiData && Array.isArray(metrics.kpiData) && metrics.kpiData.length > 0) {
    kpiText = '\n\n【KPI予実】';
    metrics.kpiData.forEach(kpi => {
      const achievementColor = kpi.achievement >= 100 ? '✅' : kpi.achievement >= 80 ? '⚠️' : '❌';
      kpiText += `\n- ${kpi.name}: 実績${kpi.actual?.toLocaleString() || 0}${kpi.unit || ''} / 目標${kpi.target?.toLocaleString() || 0}${kpi.unit || ''} (達成率${kpi.achievement.toFixed(1)}% ${achievementColor})`;
    });
  }

  return `
あなたは優秀なWebアクセスの解析士です。${period}のWebサイト全体のパフォーマンスを分析し、ビジネス成長に役立つ洞察を含む日本語の要約を生成してください。

【現在期間のデータ】
- 総ユーザー数: ${metrics.users?.toLocaleString() || 0}人
- 新規ユーザー数: ${metrics.newUsers?.toLocaleString() || 0}人
- セッション数: ${metrics.sessions?.toLocaleString() || 0}回
- ページビュー数: ${metrics.pageViews?.toLocaleString() || 0}回
- 平均PV/セッション: ${metrics.pageViews && metrics.sessions ? (metrics.pageViews / metrics.sessions).toFixed(2) : '0.00'}
- エンゲージメント率: ${((metrics.engagementRate || 0) * 100).toFixed(1)}%
- 直帰率: ${((metrics.bounceRate || 0) * 100).toFixed(1)}%
- 平均セッション時間: ${metrics.avgSessionDuration ? `${Math.floor(metrics.avgSessionDuration / 60)}分${Math.floor(metrics.avgSessionDuration % 60)}秒` : '0秒'}${conversionText}${hasConversions ? `\n- コンバージョン率: ${((metrics.conversionRate || 0) * 100).toFixed(2)}%` : ''}${monthOverMonthText}${kpiText}

【出力形式】
箇条書き（•）で2-4個の要点のみ。見出し（##）は一切使わない。合計300-400文字程度。

【記述内容】
1. 最重要ポイント：前月比で変化の大きい指標、主要な傾向（数値付き）
2. 原因分析：なぜその結果になったか（簡潔に）
3. 改善提案：未達成KPIの改善、CV内訳の強化など（1-2個、端的に）

【必須】具体的な数値、増減の方向性、原因の推測、わかりやすい表現

【禁止】見出し（##）、長文（1要点2文以内）、5個以上の箇条書き、800文字
`;
}

/**
 * ユーザー属性分析用プロンプト
 */
function getUsersPrompt(period, metrics) {
  let demographicsText = '';
  let hasDeviceData = false;
  let hasLocationData = false;
  let hasAgeData = false;
  let hasGenderData = false;

  if (metrics.demographicsData) {
    const demo = metrics.demographicsData;
    demographicsText = '\n\n【ユーザー属性の分布】\n';
    if (demo.newReturning && Array.isArray(demo.newReturning) && demo.newReturning.length > 0) {
      demographicsText += '新規/リピーター別:\n';
      demo.newReturning.forEach(nr => {
        const label = nr.name || '不明';
        const userCount = nr.value || 0;
        const percentage = nr.percentage || 0;
        if (label !== '不明' && userCount > 0) {
          demographicsText += `- ${label}: ${userCount.toLocaleString()}人 (${percentage.toFixed(1)}%)\n`;
        }
      });
      demographicsText += '\n';
    }
    if (demo.device && Array.isArray(demo.device) && demo.device.length > 0) {
      hasDeviceData = true;
      demographicsText += 'デバイス別:\n';
      demo.device.forEach(d => {
        const deviceName = d.name || d.deviceCategory || d.device || '不明';
        const userCount = d.value || d.sessions || 0;
        const percentage = d.percentage || 0;
        if (deviceName !== '不明' && userCount > 0) {
          demographicsText += `- ${deviceName}: ${userCount.toLocaleString()}人 (${percentage.toFixed(1)}%)\n`;
        }
      });
      demographicsText += '\n';
    }
    if (demo.location) {
      const locationData = demo.location.city || demo.location.region || [];
      if (Array.isArray(locationData) && locationData.length > 0) {
        hasLocationData = true;
        demographicsText += '地域別（上位5）:\n';
        locationData.slice(0, 5).forEach(loc => {
          const locationName = loc.name || loc.city || loc.region || '不明';
          const userCount = loc.value || loc.sessions || 0;
          const percentage = loc.percentage || 0;
          if (locationName !== '不明' && userCount > 0) {
            demographicsText += `- ${locationName}: ${userCount.toLocaleString()}人 (${percentage.toFixed(1)}%)\n`;
          }
        });
        demographicsText += '\n';
      }
    }
    if (demo.age && Array.isArray(demo.age) && demo.age.length > 0) {
      hasAgeData = true;
      demographicsText += '年齢別:\n';
      demo.age.forEach(a => {
        const ageLabel = a.name || a.ageRange || a.age || '不明';
        const userCount = a.value || a.sessions || 0;
        const percentage = a.percentage || 0;
        if (ageLabel !== '不明' && userCount > 0) {
          demographicsText += `- ${ageLabel}: ${userCount.toLocaleString()}人 (${percentage.toFixed(1)}%)\n`;
        }
      });
      demographicsText += '\n';
    }
    if (demo.gender && Array.isArray(demo.gender) && demo.gender.length > 0) {
      hasGenderData = true;
      demographicsText += '性別:\n';
      demo.gender.forEach(g => {
        const genderLabel = g.name || (g.gender === 'male' ? '男性' : g.gender === 'female' ? '女性' : (g.gender || '不明'));
        const userCount = g.value || g.sessions || 0;
        const percentage = g.percentage || 0;
        if (genderLabel !== '不明' && userCount > 0) {
          demographicsText += `- ${genderLabel}: ${userCount.toLocaleString()}人 (${percentage.toFixed(1)}%)\n`;
        }
      });
    }
  }

  let dataLimitationNote = '';
  if (!hasDeviceData && !hasLocationData && !hasAgeData && !hasGenderData) {
    dataLimitationNote = '\n⚠️ **注意**: ユーザー属性データが取得できていません。GA4の設定を確認してください。\n';
  } else if (!hasAgeData && !hasGenderData) {
    dataLimitationNote = '\n⚠️ **注意**: 年齢・性別データが不足しています。GA4でGoogleシグナルを有効化すると、より詳細な属性分析が可能になります。\n';
  }

  return `
あなたは【ターゲット層分析の専門家】です。${period}のWebサイトのユーザー属性データを分析し、**マーケティング戦略の最適化に役立つインサイト**を含む日本語の要約を生成してください。

【現在期間のデータ】${demographicsText}${dataLimitationNote}

【出力形式】
箇条書き（•）で2-4個の要点のみ。見出し（##）は一切使わない。合計300-400文字程度。

【記述内容】
1. 最重要ポイント：新規/リピーター比率、デバイス・地域・年齢・性別の主要傾向（数値付き）
2. 原因分析：なぜその属性分布になったか（簡潔に）
3. 改善提案：リピーター強化、地域拡大、デバイス最適化など（1-2個、端的に）

【必須】具体的な数値、増減の方向性、原因の推測、わかりやすい表現

【禁止】見出し（##）、長文（1要点2文以内）、5個以上の箇条書き、800文字、「undefined」の出力
`;
}

/**
 * 逆算フロー分析用プロンプト
 */
function getReverseFlowPrompt(period, metrics) {
  const flowName = metrics.flowName || 'フロー名未設定';
  const formPagePath = metrics.formPagePath || '未設定';
  const targetCvEvent = metrics.targetCvEvent || '未設定';
  const totalSiteViews = metrics.totalSiteViews || 0;
  const formPageViews = metrics.formPageViews || 0;
  const submissionComplete = metrics.submissionComplete || 0;
  const achievementRate1 = parseFloat(metrics.achievementRate1) || 0;
  const achievementRate2 = parseFloat(metrics.achievementRate2) || 0;
  const overallCVR = parseFloat(metrics.overallCVR) || 0;
  const monthlyData = metrics.monthlyData || [];

  let monthlyText = '';
  if (monthlyData.length > 0) {
    monthlyText = '\n\n【月次推移データ】\n';
    monthlyData.forEach((month) => {
      monthlyText += `${month.month}: 全PV${month.totalSiteViews?.toLocaleString() || 0}, フォームPV${month.formPageViews?.toLocaleString() || 0}, CV${month.submissionComplete?.toLocaleString() || 0}件, 達成率①${month.achievementRate1 || 0}%\n`;
    });
  }

  return `
あなたは【コンバージョンフロー分析の専門家】です。${period}のWebサイトの「${flowName}」フローを分析し、**CVR向上に直結する改善施策に役立つビジネスインサイト**を含む日本語の要約を生成してください。

【現在期間のデータ】
- フロー名: ${flowName}
- フォームページパス: ${formPagePath}
- 目標CVイベント: ${targetCvEvent}
- 全PV: ${totalSiteViews.toLocaleString()}回
- フォームPV: ${formPageViews.toLocaleString()}回
- 送信完了（${targetCvEvent}）: ${submissionComplete.toLocaleString()}件
- 達成率① (全PV→フォームPV): ${achievementRate1.toFixed(2)}%
- 達成率② (フォームPV→送信完了): ${achievementRate2.toFixed(2)}%
- 全体CVR (全PV→送信完了): ${overallCVR.toFixed(2)}%${monthlyText}

【重要な制約】
⚠️ 上記の実際のデータのみを使用。架空のページ名や存在しないデータを推測して記載しないこと。

【出力形式】
箇条書き（•）で2-4個の要点のみ。見出し（##）は一切使わない。合計300-400文字程度。

【記述内容】
1. 最重要ポイント：達成率①・②、全体CVRの評価、ボトルネック（誘導 or フォーム）の特定（数値付き）
2. 原因分析：なぜそのCVRになっているか（簡潔に）
3. 改善提案：誘導強化、フォーム改善、離脱防止など（1-2個、端的に）

【必須】具体的な数値、増減の方向性、原因の推測、わかりやすい表現

【禁止】見出し（##）、長文（1要点2文以内）、5個以上の箇条書き、800文字、架空データの記載
`;
}

/**
 * 包括的改善案用プロンプト
 */
function getComprehensiveImprovementPrompt(period, metrics, startDate, endDate) {
  const sd = startDate || '';
  const ed = endDate || '';

  let monthlyTrendText = '';
  if (metrics.monthlyTrend && metrics.monthlyTrend.monthlyData && Array.isArray(metrics.monthlyTrend.monthlyData)) {
    const monthlyData = metrics.monthlyTrend.monthlyData;
    monthlyTrendText = '\n\n【過去13ヶ月の推移】\n';
    monthlyData.forEach(month => {
      monthlyTrendText += `- ${month.month}: ユーザー${month.users?.toLocaleString() || 0}人, セッション${month.sessions?.toLocaleString() || 0}回, CV${month.conversions?.toLocaleString() || 0}件\n`;
    });
  }

  const recent30Days = metrics.summary?.metrics || {};
  let conversionDetails = '';
  if (recent30Days.conversions && typeof recent30Days.conversions === 'object') {
    const cvList = Object.entries(recent30Days.conversions)
      .map(([name, count]) => `  - ${name}: ${count}件`)
      .join('\n');
    conversionDetails = `\n${cvList}`;
  }
  const recentSummaryText = `
【直近30日のサマリー（${sd} 〜 ${ed}）】
- ユーザー数: ${recent30Days.totalUsers?.toLocaleString() || 0}人
- セッション数: ${recent30Days.sessions?.toLocaleString() || 0}回
- ページビュー数: ${recent30Days.screenPageViews?.toLocaleString() || 0}回
- エンゲージメント率: ${((recent30Days.engagementRate || 0) * 100).toFixed(1)}%
- コンバージョン数: ${recent30Days.totalConversions?.toLocaleString() || 0}件${conversionDetails}
`;

  let channelsText = '';
  if (metrics.channels && Array.isArray(metrics.channels) && metrics.channels.length > 0) {
    channelsText = '\n\n【集客チャネル（直近30日）】\n';
    metrics.channels.slice(0, 5).forEach(channel => {
      channelsText += `- ${channel.channel}: セッション${channel.sessions?.toLocaleString() || 0}回, CV${channel.conversions?.toLocaleString() || 0}件\n`;
    });
  }

  let landingPagesText = '';
  if (metrics.landingPages && Array.isArray(metrics.landingPages) && metrics.landingPages.length > 0) {
    landingPagesText = '\n\n【人気ランディングページ（直近30日、トップ5）】\n';
    metrics.landingPages.slice(0, 5).forEach(page => {
      landingPagesText += `- ${page.page}: セッション${page.sessions?.toLocaleString() || 0}回, ENG率${(page.engagementRate * 100).toFixed(1)}%, CV${page.conversions?.toLocaleString() || 0}件\n`;
    });
  }

  let pagesText = '';
  if (metrics.pages && Array.isArray(metrics.pages) && metrics.pages.length > 0) {
    pagesText = '\n\n【ページ別アクセス（直近30日、トップ10）】\n';
    metrics.pages.slice(0, 10).forEach(page => {
      pagesText += `- ${page.path}: PV${page.pageViews?.toLocaleString() || 0}, ユーザー${page.users?.toLocaleString() || 0}人, CV${page.conversions?.toLocaleString() || 0}件\n`;
    });
  }

  let pageCategoriesText = '';
  if (metrics.pageCategories && Array.isArray(metrics.pageCategories) && metrics.pageCategories.length > 0) {
    pageCategoriesText = '\n\n【ページ分類別（直近30日、トップ5）】\n';
    metrics.pageCategories.slice(0, 5).forEach(category => {
      pageCategoriesText += `- ${category.category}: PV${category.pageViews?.toLocaleString() || 0}, ユーザー${category.users?.toLocaleString() || 0}人, ENG率${(category.engagementRate * 100).toFixed(1)}%\n`;
    });
  }

  let monthlyConversionsText = '';
  const conversionData = metrics.monthlyConversions?.data || metrics.monthlyConversions?.monthlyData;
  if (conversionData && Array.isArray(conversionData)) {
    monthlyConversionsText = '\n\n【過去13ヶ月のコンバージョン推移】\n';
    conversionData.forEach(month => {
      monthlyConversionsText += `- ${month.month}: CV${month.totalConversions?.toLocaleString() || 0}件`;
      if (month.conversions && Object.keys(month.conversions).length > 0) {
        const cvDetails = Object.entries(month.conversions).map(([name, count]) => `${name}:${count}件`).join(', ');
        monthlyConversionsText += ` (${cvDetails})`;
      }
      monthlyConversionsText += '\n';
    });
  }

  let knowledgeText = '';
  if (metrics.improvementKnowledge && Array.isArray(metrics.improvementKnowledge) && metrics.improvementKnowledge.length > 0) {
    knowledgeText = `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    knowledgeText += `【改善施策のナレッジベース：全${metrics.improvementKnowledge.length}件】\n`;
    knowledgeText += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    knowledgeText += '以下のリストから、このサイトに最も効果的な施策を3〜5件選んでください。\n';
    knowledgeText += '【重要】このリスト以外の施策を提案することは禁止です。\n\n';
    metrics.improvementKnowledge.forEach((knowledge, index) => {
      knowledgeText += `【施策ID: ${index + 1}】\n`;
      knowledgeText += `カテゴリー: ${knowledge.category || 'その他'}\n`;
      knowledgeText += `サイト種別: ${knowledge.siteType || '全般'}\n`;
      knowledgeText += `タイトル: ${knowledge.title || ''}\n`;
      knowledgeText += `内容: ${knowledge.description || ''}\n`;
      knowledgeText += `\n`;
    });
  }

  return `
あなたはWebサイト改善コンサルタントです。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【タスク1】サイトデータの分析（分析サマリー作成）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
過去365日分のデータを参照し、直近30日のパフォーマンスを分析してください。
**【重要】分析サマリーには「改善施策」や「アクション」を含めないでください。現状の分析と課題特定のみです。**

${recentSummaryText}
${monthlyTrendText}
${channelsText}
${landingPagesText}
${pagesText}
${pageCategoriesText}
${monthlyConversionsText}

【分析の視点】
- 長期トレンド（過去13ヶ月）と直近30日の比較
- 季節性や前年同期との変化
- 最もビジネスインパクトが大きい課題の特定（チャネル、コンテンツ、CV導線など）

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【タスク2】改善施策の選択（ナレッジベースから厳選）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${knowledgeText}

【選択ルール】
✓ 上記リストから「施策ID」を指定して3〜5件選択する
✓ リストにない独自の施策は提案禁止
✓ サイトの課題に最も効果的な施策を選ぶ
✓ 選択した施策の説明文は、このサイトのデータに合わせてカスタマイズする

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【出力形式】以下の形式で厳密に出力してください
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

分析サマリー（箇条書き•で2-4個の要点のみ。見出しは使わない。合計300-400文字。改善施策は含めない）
- 最重要ポイント：直近30日の主要指標と前月比（数値付き）
- 原因分析：なぜその結果になったか（簡潔に）
- 改善提案は含めない（タスク2で別途出力）

【記述例】
• 直近30日のセッションは10,471回（前月比-4.7%）で減少傾向、一方CV率は+0.25pt改善。
• 流入減の主因は季節的閑散期と広告予算削減、CV率改善はCTA最適化の効果と推測。
• 過去13ヶ月で2月が最高値、6月が最低値。中長期では横ばい〜微増傾向。

選択した施策ID

施策ID: [選択したID], [選択したID], [選択したID]（3〜5件）

推奨改善施策

タイトル: （選択した施策IDのタイトルをそのまま使用、または微調整）
説明: （このサイトの具体的な状況に合わせてカスタマイズした説明）
カテゴリー: （選択した施策のカテゴリー: acquisition, content, design, feature, other）
優先度: （このサイトでの優先度: high, medium, low）
期待効果: （具体的な数値を含めず、定性的に記述）

---

タイトル: （2件目）
説明: （2件目）
カテゴリー: （2件目）
優先度: （2件目）
期待効果: （2件目）

---

（以下、選択した件数分繰り返す。必ず3〜5件）

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【厳守事項】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. 分析サマリーには改善施策を含めない
2. 必ず「選択した施策ID」セクションを出力する
3. 推奨改善施策はナレッジベースから選択（独自提案禁止）
4. 件数は必ず3〜5件（6件以上は禁止、2件以下も禁止）
5. タイトルはナレッジベースのものを基本的に使用
6. 説明はこのサイトのデータに基づいてカスタマイズ
7. 必ず「タイトル:」「説明:」「カテゴリー:」「優先度:」「期待効果:」の形式で出力
8. 番号付きリスト（1. 2. 3.）は使用禁止
9. 期待効果に具体的な数値は含めない
10. タイトル、説明、期待効果にマークダウン記号（**、#、-、*）は使用禁止
11. 各改善施策の間に「---」を挿入

【出力例】
分析サマリー
• 直近30日のセッションは10,471回（前月比-4.7%）で減少傾向、一方CV数は125件（前月比+21.4%）で増加。
• 流入減の主因は季節的閑散期と広告キャンペーン終了、CV率改善はCTA最適化の効果と推測。
• 過去13ヶ月で2月が最高値、6月が最低値。前年同月比ではプラス成長を維持。

選択した施策ID
施策ID: 15, 42, 78, 103

推奨改善施策

タイトル: メタディスクリプションの最適化
説明: 主要ページのメタディスクリプションを検索意図に沿った内容に書き換え、クリック率を改善します
カテゴリー: acquisition
優先度: high
期待効果: オーガニック流入の増加

---

（以下同様）
`;
}

/**
 * 集客チャネル分析用プロンプト
 */
function getChannelsPrompt(period, metrics) {
  const hasConversions = metrics.conversionEventNames && metrics.conversionEventNames.length > 0;
  const conversionNote = hasConversions ? '' : '\n\n⚠️ **注意**: コンバージョン定義が未設定です。CV分析をご希望の場合、サイト設定画面から設定してください。';

  return `
あなたは【流入チャネル最適化の専門家】です。${period}のWebサイトの流入チャネルデータを分析し、**マーケティングROI最適化に役立つインサイト**を含む日本語の要約を生成してください。

【現在期間のデータ】
- 総セッション数: ${metrics.totalSessions?.toLocaleString() || 0}回
- 総ユーザー数: ${metrics.totalUsers?.toLocaleString() || 0}人${hasConversions ? `
- 総コンバージョン数: ${metrics.totalConversions?.toLocaleString() || 0}件` : ''}
- チャネル数: ${metrics.channelCount || 0}個${conversionNote}

【チャネル別の内訳】
${metrics.channelsText || 'データなし'}

【出力形式】
箇条書き（•）で2-4個の要点のみ。見出し（##）は一切使わない。合計300-400文字程度。

【記述内容】
1. 最重要ポイント：上位3チャネル、集中度、オーガニックvs有料の割合など（数値付き）
2. 原因分析：なぜそのチャネル構成になったか（簡潔に）
3. 改善提案：低CVRチャネルへの施策、チャネル分散など（1-2個、端的に）

【必須】具体的な数値、増減の方向性、原因の推測、わかりやすい表現

【禁止】見出し（##）、長文（1要点2文以内）、5個以上の箇条書き、800文字
`;
}

/**
 * 参照元/メディア分析用プロンプト
 */
function getReferralsPrompt(period, metrics) {
  const hasConversions = metrics.conversionEventNames && metrics.conversionEventNames.length > 0;
  const conversionNote = hasConversions ? '' : '\n\n⚠️ **注意**: コンバージョン定義が未設定です。CV分析をご希望の場合、サイト設定画面から設定してください。';

  return `
あなたは【参照元最適化分析の専門家】です。${period}のWebサイトの参照元/メディアデータを分析し、**外部サイトからの流入最適化に役立つインサイト**を含む日本語の要約を生成してください。

【現在期間のデータ】
- 総セッション数: ${metrics.totalSessions?.toLocaleString() || 0}回
- 総ユーザー数: ${metrics.totalUsers?.toLocaleString() || 0}人${hasConversions ? `
- 総コンバージョン数: ${metrics.totalConversions?.toLocaleString() || 0}件
- 平均CVR: ${(metrics.avgConversionRate || 0).toFixed(2)}%` : ''}
- 参照元数: ${metrics.referralCount || 0}件${conversionNote}

【参照元別の内訳（上位10件）】
${metrics.topReferralsText || 'データなし'}

【出力形式】
箇条書き（•）で2-4個の要点のみ。見出し（##）は一切使わない。合計300-400文字程度。

【記述内容】
1. 最重要ポイント：上位3参照元、集中度、CVRの高い/低い参照元など（数値付き）
2. 原因分析：なぜその参照元構成になったか（簡潔に）
3. 改善提案：高CVR参照元への露出強化、低CVR参照元の改善など（1-2個、端的に）

【必須】具体的な数値、増減の方向性、原因の推測、わかりやすい表現

【禁止】見出し（##）、長文（1要点2文以内）、5個以上の箇条書き、800文字
`;
}

/**
 * ランディングページ分析用プロンプト
 */
function getLandingPagesPrompt(period, metrics) {
  const hasConversions = metrics.conversionEventNames && metrics.conversionEventNames.length > 0;
  const conversionNote = hasConversions ? '' : '\n\n⚠️ **注意**: コンバージョン定義が未設定です。CV分析をご希望の場合、サイト設定画面から設定してください。';

  return `
あなたは【ランディングページ最適化の専門家】です。${period}のWebサイトのランディングページデータを分析し、**ファーストインプレッション改善に役立つインサイト**を含む日本語の要約を生成してください。

【現在期間のデータ】
- 総セッション数: ${metrics.totalSessions?.toLocaleString() || 0}回${hasConversions ? `
- 総コンバージョン数: ${metrics.totalConversions?.toLocaleString() || 0}件` : ''}
- LP数: ${metrics.landingPageCount || 0}ページ${conversionNote}

【LP別の内訳（上位10件）】
${metrics.topLandingPagesText || 'データなし'}

【出力形式】
箇条書き（•）で2-4個の要点のみ。見出し（##）は一切使わない。合計300-400文字程度。

【記述内容】
1. 最重要ポイント：上位3LP、集中度、ENG率の高い/低いLPなど（数値付き）
2. 原因分析：なぜそのLPパフォーマンスになったか（簡潔に）
3. 改善提案：ENG率低いLPの改善、高セッションLPへの予算集中など（1-2個、端的に）

【必須】具体的な数値、増減の方向性、原因の推測、わかりやすい表現

【禁止】見出し（##）、長文（1要点2文以内）、5個以上の箇条書き、800文字
`;
}

/**
 * ページ別分析用プロンプト
 */
function getPagesPrompt(period, metrics) {
  const hasConversions = metrics.conversionEventNames && metrics.conversionEventNames.length > 0;
  const conversionNote = hasConversions ? '' : '\n\n⚠️ **注意**: コンバージョン定義が未設定です。CV分析をご希望の場合、サイト設定画面から設定してください。';

  return `
あなたは【コンテンツパフォーマンス分析の専門家】です。${period}のWebサイトのページ別データを分析し、**コンテンツ最適化に役立つインサイト**を含む日本語の要約を生成してください。

【現在期間のデータ】
- 総ページビュー数: ${metrics.totalPageViews?.toLocaleString() || 0}PV
- ページ数: ${metrics.pageCount || 0}ページ${conversionNote}

【ページ別の内訳（上位10件）】
${metrics.topPagesText || 'データなし'}

【出力形式】
箇条書き（•）で2-4個の要点のみ。見出し（##）は一切使わない。合計300-400文字程度。

【記述内容】
1. 最重要ポイント：上位3ページ、集中度、ENG率・滞在時間の高い/低いページなど（数値付き）
2. 原因分析：なぜそのページパフォーマンスになったか（簡潔に）
3. 改善提案：ENG率低いページの改善、高PVページの導線強化など（1-2個、端的に）

【必須】具体的な数値、増減の方向性、原因の推測、わかりやすい表現

【禁止】見出し（##）、長文（1要点2文以内）、5個以上の箇条書き、800文字
`;
}

/**
 * ページ分類別分析用プロンプト
 */
function getPageCategoriesPrompt(period, metrics) {
  return `
あなたは【コンテンツカテゴリ戦略の専門家】です。${period}のWebサイトのカテゴリ別データを分析し、**サイト構造最適化に役立つインサイト**を含む日本語の要約を生成してください。

【現在期間のデータ】
- 総ページビュー数: ${metrics.totalPageViews?.toLocaleString() || 0}PV
- カテゴリ数: ${metrics.categoryCount || 0}カテゴリ

【カテゴリ別の内訳（上位10件）】
${metrics.topCategoriesText || 'データなし'}

【出力形式】
箇条書き（•）で2-4個の要点のみ。見出し（##）は一切使わない。合計300-400文字程度。

【記述内容】
1. 最重要ポイント：上位3カテゴリ、集中度、カテゴリ間のバランスなど（数値付き）
2. 原因分析：なぜそのカテゴリ構成になったか（簡潔に）
3. 改善提案：低PVカテゴリの強化、導線改善など（1-2個、端的に）

【必須】具体的な数値、増減の方向性、原因の推測、わかりやすい表現

【禁止】見出し（##）、長文（1要点2文以内）、5個以上の箇条書き、800文字
`;
}

/**
 * 流入キーワード分析用プロンプト
 */
function getKeywordsPrompt(period, metrics) {
  const hasGSCConnection = metrics.hasGSCConnection === true;
  const noDataNote = !hasGSCConnection ? '\n\n⚠️ **注意**: Search Consoleが未連携です。キーワードデータを取得するには、サイト設定でSearch Consoleを連携してください。' : '';

  return `
あなたは【SEOキーワード戦略の専門家】です。${period}のWebサイトの流入キーワードデータを分析し、**検索流入最適化に役立つインサイト**を含む日本語の要約を生成してください。

【現在期間のデータ】
- 総クリック数: ${metrics.totalClicks?.toLocaleString() || 0}回
- 総表示回数: ${metrics.totalImpressions?.toLocaleString() || 0}回
- 平均CTR: ${(metrics.avgCTR || 0).toFixed(2)}%
- 平均掲載順位: ${(metrics.avgPosition || 0).toFixed(1)}位
- キーワード数: ${metrics.keywordCount || 0}個${noDataNote}

【キーワード別の内訳（上位10件）】
${metrics.topKeywordsText || 'データなし'}

【出力形式】
箇条書き（•）で2-4個の要点のみ。見出し（##）は一切使わない。合計300-400文字程度。

【記述内容】
1. 最重要ポイント：上位3キーワード、集中度、CTR・掲載順位の傾向など（数値付き）
2. 原因分析：なぜそのキーワード構成になったか（簡潔に）
3. 改善提案：CTR低いキーワードのタイトル改善、4-10位キーワードの順位向上など（1-2個、端的に）

【必須】具体的な数値、増減の方向性、原因の推測、わかりやすい表現

【禁止】見出し（##）、長文（1要点2文以内）、5個以上の箇条書き、800文字
`;
}

/**
 * コンバージョン一覧分析用プロンプト
 */
function getConversionsPrompt(period, metrics) {
  const hasConversions = metrics.conversionEventCount > 0;
  const noDataNote = !hasConversions ? '\n\n⚠️ **注意**: コンバージョン定義が未設定です。サイト設定でコンバージョンイベントを定義してください。' : '';

  return `
あなたは【コンバージョン最適化の専門家】です。${period}のWebサイトのコンバージョン推移データを分析し、**成果最大化に役立つインサイト**を含む日本語の要約を生成してください。

【現在期間のデータ】
- データポイント数: ${metrics.monthlyDataPoints || 0}ヶ月分
- 定義済みコンバージョンイベント数: ${metrics.conversionEventCount || 0}種類
- 最新月: ${metrics.latestMonth || '不明'}${noDataNote}

【コンバージョンイベント別の合計】
${metrics.conversionSummaryText || 'データなし'}

【最新月（${metrics.latestMonth || '不明'}）のコンバージョン】
${metrics.latestMonthText || 'データなし'}
${metrics.monthlyDetailText || ''}

【重要な制約】
⚠️ 上記データに記載されているイベント名と数値のみを使用。記載されていないイベント名や数値を推測したり例として挙げたりしないこと。

【出力形式】
箇条書き（•）で2-4個の要点のみ。見出し（##）は一切使わない。合計300-400文字程度。

【記述内容】
1. 最重要ポイント：主要CVイベント、集中度、最新月の前月比、月次トレンドなど（数値付き）
2. 原因分析：なぜそのCV推移になったか（簡潔に）
3. 改善提案：CV減少月の要因分析、主力CVイベントの強化など（1-2個、端的に）

【必須】具体的な数値、増減の方向性、原因の推測、わかりやすい表現

【禁止】見出し（##）、長文（1要点2文以内）、5個以上の箇条書き、800文字、架空データの記載
`;
}

/**
 * ファイルダウンロード分析用プロンプト
 */
function getFileDownloadsPrompt(period, metrics) {
  const hasConversions = metrics.conversionEventNames && metrics.conversionEventNames.length > 0;
  const conversionNote = hasConversions ? '' : '\n\n⚠️ **注意**: コンバージョン定義が未設定です。CV分析をご希望の場合、サイト設定画面から設定してください。';

  return `
あなたは【コンテンツエンゲージメント分析の専門家】です。${period}のWebサイトのファイルダウンロードデータを分析し、**資料配布戦略最適化に役立つインサイト**を含む日本語の要約を生成してください。

【現在期間のデータ】
- 総ダウンロード数: ${metrics.totalDownloads?.toLocaleString() || 0}回
- 総ユーザー数: ${metrics.totalUsers?.toLocaleString() || 0}人
- ファイル数: ${metrics.downloadCount || 0}種類${conversionNote}

【ファイル別の内訳（上位10件）】
${metrics.topFilesText || 'データなし'}

【出力形式】
箇条書き（•）で2-4個の要点のみ。見出し（##）は一切使わない。合計300-400文字程度。

【記述内容】
1. 最重要ポイント：上位3ファイル、集中度、ユーザー当たりDL数など（数値付き）
2. 原因分析：なぜそのDL構成になったか（簡潔に）
3. 改善提案：人気資料の露出強化、DL少ない資料の見直しなど（1-2個、端的に）

【必須】具体的な数値、増減の方向性、原因の推測、わかりやすい表現

【禁止】見出し（##）、長文（1要点2文以内）、5個以上の箇条書き、800文字
`;
}

/**
 * 外部リンククリック分析用プロンプト
 */
function getExternalLinksPrompt(period, metrics) {
  const hasConversions = metrics.conversionEventNames && metrics.conversionEventNames.length > 0;
  const conversionNote = hasConversions ? '' : '\n\n⚠️ **注意**: コンバージョン定義が未設定です。CV分析をご希望の場合、サイト設定画面から設定してください。';

  return `
あなたは【ユーザー行動分析の専門家】です。${period}のWebサイトの外部リンククリックデータを分析し、**ユーザー導線最適化に役立つインサイト**を含む日本語の要約を生成してください。

【現在期間のデータ】
- 総クリック数: ${metrics.totalClicks?.toLocaleString() || 0}回
- 総ユーザー数: ${metrics.totalUsers?.toLocaleString() || 0}人
- 外部リンク数: ${metrics.clickCount || 0}種類${conversionNote}

【外部リンク別の内訳（上位10件）】
${metrics.topLinksText || 'データなし'}

【出力形式】
箇条書き（•）で2-4個の要点のみ。見出し（##）は一切使わない。合計300-400文字程度。

【記述内容】
1. 最重要ポイント：上位3リンク、集中度、リンク先タイプ別の傾向など（数値付き）
2. 原因分析：なぜそのクリック構成になったか（簡潔に）
3. 改善提案：重要リンクの強化、不要リンクの削減など（1-2個、端的に）

【必須】具体的な数値、増減の方向性、原因の推測、わかりやすい表現

【禁止】見出し（##）、長文（1要点2文以内）、5個以上の箇条書き、800文字
`;
}

/**
 * デフォルトプロンプト
 */
function getDefaultPrompt(period, metrics) {
  return `
あなたはWebサイト分析の専門家です。${period}のWebサイトデータを分析し、ビジネスインサイトを含む日本語の要約を生成してください。

【出力形式】
箇条書き（•）で2-4個の要点のみ。見出し（##）は一切使わない。合計300-400文字程度。

【記述内容】
1. 最重要ポイント（数値付き）
2. 原因分析（簡潔に）
3. 改善提案（1-2個、端的に）

【必須】具体的な数値、増減の方向性、原因の推測、わかりやすい表現

【禁止】見出し（##）、長文（1要点2文以内）、5個以上の箇条書き、800文字
`;
}
