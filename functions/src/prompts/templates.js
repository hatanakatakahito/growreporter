/**
 * AI分析プロンプトテンプレート集
 *
 * 各ページタイプごとのプロンプトを一元管理
 * プロンプトを変更する場合は、このファイルを編集してください
 */

// ==================== 共通ヘルパー ====================

function getCommonOutputRules() {
  return `
【出力ルール】
- 150-200文字程度の自然な文章（段落形式）
- 前置きや挨拶は一切不要、分析内容から直接始める
- 専門用語はできるだけ避け、やさしい日本語で書く。どうしても使う場合は括弧で補足
  - CVR → お問い合わせ率（CVR）
  - セッション → 訪問数
  - PV → ページ閲覧数
  - エンゲージメント率 → 閲覧の活発さ（エンゲージメント率）
  - オーガニック検索 → 検索からの流入（オーガニック検索）
  - 直帰率 → 1ページだけ見て離脱する割合（直帰率）
  - ランディングページ → 最初に見られるページ（ランディングページ）
  - CTR → クリック率（CTR）
  - インプレッション → 検索結果での表示回数
- 数値は基本的に実数値（○○回、○○件、○○人など）を優先し、素人にも直感的に分かるようにする
- パーセンテージは前月比・前年比などの比較文脈でのみ使用する
- 「ポイント」表記は禁止
- 改善提案は含めない

【厳守事項】
- 提供されたデータにない数値は絶対に記載しないこと
- 「承知しました」「分析します」などの前置き禁止
- 箇条書き記号（•、-、1.など）禁止
- 具体的な改善提案禁止`;
}

function getScrapingContextBlock(metrics) {
  if (!metrics.scrapingContext) return '';
  return `\n${metrics.scrapingContext}\nアクセス解析データの考察が主役。上記サイト構造データはあくまで補足。`;
}

function getComparisonContextBlock(metrics) {
  if (!metrics.comparisonMetrics || !metrics.comparisonPeriod) return '';
  const comp = metrics.comparisonMetrics;
  const period = metrics.comparisonPeriod;

  let text = `\n\n【比較期間データ】${period.startDate}〜${period.endDate}\n`;

  // 共通指標の比較テキスト生成
  const pairs = [
    ['sessions', '訪問数'],
    ['conversions', 'CV数'],
    ['totalSessions', '訪問数合計'],
    ['totalUsers', 'ユーザー数合計'],
    ['totalConversions', 'CV数合計'],
    ['totalPageViews', 'PV数合計'],
    ['totalClicks', 'クリック数合計'],
    ['totalDownloads', 'ダウンロード数合計'],
    ['totalImpressions', 'インプレッション合計'],
  ];
  const shown = [];
  for (const [key, label] of pairs) {
    if (metrics[key] != null && comp[key] != null) {
      const cur = metrics[key];
      const prev = comp[key];
      const change = prev > 0 ? (((cur - prev) / prev) * 100).toFixed(1) : null;
      const changeText = change != null ? `（前期間比 ${change > 0 ? '+' : ''}${change}%）` : '';
      shown.push(`${label}: 現在${cur.toLocaleString()} / 前期間${prev.toLocaleString()} ${changeText}`);
    }
  }
  if (shown.length > 0) {
    text += shown.join('\n') + '\n';
  }

  text += '\n上記の比較期間データがある場合、現在期間との違いや変化の傾向にも触れてください。';
  return text;
}

// ==================== メインエクスポート ====================

/**
 * プロンプトテンプレートを取得
 * @param {string} pageType - ページタイプ
 * @param {string} period - 期間（例: "2024/01/01から2024/01/31までの期間"）
 * @param {object} metrics - メトリクスデータ
 * @param {string} [startDate] - 開始日（comprehensive_improvement用、省略時はperiodから解析）
 * @param {string} [endDate] - 終了日（comprehensive_improvement用、省略時はperiodから解析）
 * @returns {string} プロンプトテンプレート
 */
export function getPromptTemplate(pageType, period, metrics, startDate, endDate, options = {}) {
  const templates = {
    summary: getDashboardPrompt,
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
    'analysis/month': getMonthlyPrompt,
    comprehensive_analysis: getComprehensiveAnalysisPrompt,
    pageFlow: getPageFlowPrompt,
    page_flow: getPageFlowPrompt,
  };

  const templateFunc = templates[pageType];
  if (!templateFunc) {
    return getDefaultPrompt(period, metrics);
  }

  if (pageType === 'comprehensive_improvement') {
    const parsed = parsePeriod(period);
    const sd = startDate || parsed.startDate;
    const ed = endDate || parsed.endDate;
    return templateFunc(period, metrics, sd, ed, options);
  }

  return templateFunc(period, metrics);
}

function parsePeriod(period) {
  const m = (period || '').match(/^(.+?)から(.+?)までの期間$/);
  return { startDate: m ? m[1] : '', endDate: m ? m[2] : '' };
}

// ==================== 日別分析 ====================

function getDayPrompt(period, metrics) {
  const hasConversions = metrics.hasConversionDefinitions === true;
  const conversionNote = hasConversions ? `\n- 成果合計: ${metrics.conversions?.toLocaleString() || 0}件` : '';

  // dailyDataから上位5日・下位3日を構築
  let dailyDetailText = '';
  if (metrics.dailyData && Array.isArray(metrics.dailyData) && metrics.dailyData.length > 0) {
    const sorted = [...metrics.dailyData].sort((a, b) => (b.sessions || 0) - (a.sessions || 0));
    dailyDetailText = '\n\n【日別内訳（訪問数上位5日）】\n';
    sorted.slice(0, 5).forEach(row => {
      const cvText = hasConversions ? `, 成果${row.conversions?.toLocaleString() || 0}件` : '';
      dailyDetailText += `${row.date}: 訪問${row.sessions?.toLocaleString() || 0}回${cvText}\n`;
    });
    if (sorted.length > 3) {
      dailyDetailText += '\n【訪問数が少ない3日】\n';
      sorted.slice(-3).forEach(row => {
        const cvText = hasConversions ? `, 成果${row.conversions?.toLocaleString() || 0}件` : '';
        dailyDetailText += `${row.date}: 訪問${row.sessions?.toLocaleString() || 0}回${cvText}\n`;
      });
    }
  }

  return `
あなたはWebサイト分析の専門家です。${period}の日別データを分析し、初心者にも分かりやすく説明してください。

【データ】
- 訪問数合計: ${metrics.sessions?.toLocaleString() || 0}回${conversionNote}
- データ日数: ${metrics.dailyDataCount || metrics.dailyData?.length || 0}日${dailyDetailText}
${getCommonOutputRules()}
${getComparisonContextBlock(metrics)}${getScrapingContextBlock(metrics)}`;
}

// ==================== 曜日別分析 ====================

function getWeekPrompt(period, metrics) {
  const hasConversions = metrics.conversionEventNames && metrics.conversionEventNames.length > 0;
  const conversionNote = hasConversions ? `\n- 成果合計: ${metrics.conversions?.toLocaleString() || 0}件` : '';

  // weeklyDataから全曜日内訳を構築
  let weeklyDetailText = '';
  if (metrics.weeklyData && Array.isArray(metrics.weeklyData) && metrics.weeklyData.length > 0) {
    weeklyDetailText = '\n\n【曜日別内訳】\n';
    metrics.weeklyData.forEach(row => {
      const dayName = row.dayOfWeekName || row.dayOfWeek || '不明';
      const cvText = hasConversions ? `, 成果${row.conversions?.toLocaleString() || 0}件` : '';
      weeklyDetailText += `${dayName}: 訪問${row.sessions?.toLocaleString() || 0}回${cvText}\n`;
    });
  }

  return `
あなたはWebサイト分析の専門家です。${period}の曜日別データを分析し、初心者にも分かりやすく説明してください。

【データ】
- 訪問数合計: ${metrics.sessions?.toLocaleString() || 0}回${conversionNote}${weeklyDetailText}
${getCommonOutputRules()}
${getComparisonContextBlock(metrics)}${getScrapingContextBlock(metrics)}`;
}

// ==================== 時間帯別分析 ====================

function getHourPrompt(period, metrics) {
  const hasConversions = metrics.conversionEventNames && metrics.conversionEventNames.length > 0;
  const conversionNote = hasConversions ? `\n- 成果合計: ${metrics.conversions?.toLocaleString() || 0}件` : '';

  // hourlyDataから全24時間帯内訳を構築
  let hourlyDetailText = '';
  if (metrics.hourlyData && Array.isArray(metrics.hourlyData) && metrics.hourlyData.length > 0) {
    hourlyDetailText = '\n\n【時間帯別内訳】\n';
    metrics.hourlyData.forEach(row => {
      const cvText = hasConversions ? `, 成果${row.conversions?.toLocaleString() || 0}件` : '';
      hourlyDetailText += `${row.hour}時: 訪問${row.sessions?.toLocaleString() || 0}回${cvText}\n`;
    });
  }

  return `
あなたはWebサイト分析の専門家です。${period}の時間帯別データを分析し、初心者にも分かりやすく説明してください。

【データ】
- 訪問数合計: ${metrics.sessions?.toLocaleString() || 0}回${conversionNote}${hourlyDetailText}
${getCommonOutputRules()}
${getComparisonContextBlock(metrics)}${getScrapingContextBlock(metrics)}`;
}

// ==================== 月別分析 ====================

function getMonthlyPrompt(period, metrics) {
  let monthlyDataText = '';
  if (metrics.monthlyData && Array.isArray(metrics.monthlyData) && metrics.monthlyData.length > 0) {
    monthlyDataText = '\n\n【月別推移データ】\n';
    metrics.monthlyData.forEach(month => {
      monthlyDataText += `${month.label || month.month}: ユーザー${month.users?.toLocaleString() || 0}人, 訪問${month.sessions?.toLocaleString() || 0}回, ページ閲覧${month.pageViews?.toLocaleString() || 0}回, 閲覧活発さ${((month.engagementRate || 0) * 100).toFixed(1)}%, 成果${month.conversions?.toLocaleString() || 0}件, 成果率${((month.conversionRate || 0) * 100).toFixed(2)}%\n`;
    });
  }

  return `
あなたはWebサイト分析の専門家です。${period}の月別推移データを分析し、初心者にも分かりやすく説明してください。

【データ】
- 対象期間: ${metrics.monthCount || 0}ヶ月分
- 総訪問数: ${metrics.sessions?.toLocaleString() || 0}回
- 総成果数: ${metrics.conversions?.toLocaleString() || 0}件${monthlyDataText}

- 月次トレンド（増加傾向・減少傾向・横ばい）を中心に分析
- 季節性やイベント影響の可能性にも言及
${getCommonOutputRules()}
${getComparisonContextBlock(metrics)}${getScrapingContextBlock(metrics)}`;
}

// ==================== ダッシュボード ====================

function getDashboardPrompt(period, metrics) {
  const hasConversions = metrics.hasConversionDefinitions === true;
  let conversionText = '';
  if (hasConversions) {
    conversionText = `\n- 総成果数: ${metrics.conversions?.toLocaleString() || 0}件`;
    if (metrics.conversionBreakdown && typeof metrics.conversionBreakdown === 'object') {
      const cvEntries = Object.entries(metrics.conversionBreakdown);
      if (cvEntries.length > 0) {
        conversionText += '\n\n【成果の内訳】';
        cvEntries.forEach(([name, data]) => {
          const sign = data.monthChange >= 0 ? '+' : '';
          conversionText += `\n${name}: ${data.current?.toLocaleString() || 0}件 (前月比${sign}${data.monthChange.toFixed(1)}%)`;
        });
      }
    }
  } else {
    conversionText = '\n- 成果の定義: 未設定（設定後に計測開始）';
  }

  let monthOverMonthText = '';
  if (metrics.monthOverMonth) {
    const mom = metrics.monthOverMonth;
    monthOverMonthText = '\n\n【前月比サマリ】';
    if (mom.users) {
      const sign = mom.users.change >= 0 ? '+' : '';
      monthOverMonthText += `\nユーザー数: ${mom.users.current?.toLocaleString() || 0}人 (前月${mom.users.previous?.toLocaleString() || 0}人, ${sign}${mom.users.change.toFixed(1)}%)`;
    }
    if (mom.sessions) {
      const sign = mom.sessions.change >= 0 ? '+' : '';
      monthOverMonthText += `\n訪問数: ${mom.sessions.current?.toLocaleString() || 0}回 (前月${mom.sessions.previous?.toLocaleString() || 0}回, ${sign}${mom.sessions.change.toFixed(1)}%)`;
    }
    if (mom.conversions && hasConversions) {
      const sign = mom.conversions.change >= 0 ? '+' : '';
      monthOverMonthText += `\n成果数: ${mom.conversions.current?.toLocaleString() || 0}件 (前月${mom.conversions.previous?.toLocaleString() || 0}件, ${sign}${mom.conversions.change.toFixed(1)}%)`;
    }
    if (mom.engagementRate) {
      const sign = mom.engagementRate.change >= 0 ? '+' : '';
      monthOverMonthText += `\n閲覧の活発さ: ${((mom.engagementRate.current || 0) * 100).toFixed(1)}% (前月${((mom.engagementRate.previous || 0) * 100).toFixed(1)}%, ${sign}${mom.engagementRate.change.toFixed(1)}%)`;
    }
  }

  // 追加データ: newUsers, pageViews, bounceRate
  let additionalMetrics = '';
  if (metrics.newUsers != null) {
    additionalMetrics += `\n- 新規ユーザー数: ${metrics.newUsers?.toLocaleString() || 0}人`;
  }
  if (metrics.pageViews != null) {
    additionalMetrics += `\n- ページ閲覧数: ${metrics.pageViews?.toLocaleString() || 0}回`;
  }
  if (metrics.bounceRate != null && metrics.bounceRate > 0) {
    additionalMetrics += `\n- 1ページだけで離脱する割合（直帰率）: ${(metrics.bounceRate * 100).toFixed(1)}%`;
  }

  // 前年比データ
  let yearAgoText = '';
  if (metrics.yearAgoData) {
    const ya = metrics.yearAgoData;
    const yaMetrics = ya.metrics || ya;
    yearAgoText = '\n\n【前年同期比】';
    if (yaMetrics.sessions) {
      yearAgoText += `\n前年訪問数: ${yaMetrics.sessions?.toLocaleString() || 0}回`;
    }
    if (ya.totalConversions != null || yaMetrics.conversions != null) {
      const yaConv = ya.totalConversions ?? yaMetrics.conversions ?? 0;
      yearAgoText += `\n前年成果数: ${yaConv.toLocaleString()}件`;
    }
  }

  let kpiText = '';
  if (metrics.hasKpiSettings && metrics.kpiData && Array.isArray(metrics.kpiData) && metrics.kpiData.length > 0) {
    kpiText = '\n\n【KPI予実】';
    metrics.kpiData.forEach(kpi => {
      const achievementColor = kpi.achievement >= 100 ? '✅' : kpi.achievement >= 80 ? '⚠️' : '❌';
      kpiText += `\n${kpi.name}: 実績${kpi.actual?.toLocaleString() || 0}${kpi.unit || ''} / 目標${kpi.target?.toLocaleString() || 0}${kpi.unit || ''} (達成率${kpi.achievement.toFixed(1)}% ${achievementColor})`;
    });
  }

  return `
あなたはWebサイト分析の専門家です。${period}の全体サマリーデータを分析し、初心者にも分かりやすく説明してください。

【データ】
- 訪問数: ${metrics.sessions?.toLocaleString() || 0}回${additionalMetrics}${conversionText}${monthOverMonthText}${yearAgoText}${kpiText}
${getCommonOutputRules()}
${getComparisonContextBlock(metrics)}${getScrapingContextBlock(metrics)}`;
}

// ==================== ユーザー属性分析 ====================

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
          demographicsText += `${label}: ${userCount.toLocaleString()}人 (${percentage.toFixed(1)}%)\n`;
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
          demographicsText += `${deviceName}: ${userCount.toLocaleString()}人 (${percentage.toFixed(1)}%)\n`;
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
            demographicsText += `${locationName}: ${userCount.toLocaleString()}人 (${percentage.toFixed(1)}%)\n`;
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
          demographicsText += `${ageLabel}: ${userCount.toLocaleString()}人 (${percentage.toFixed(1)}%)\n`;
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
          demographicsText += `${genderLabel}: ${userCount.toLocaleString()}人 (${percentage.toFixed(1)}%)\n`;
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
あなたはWebサイト分析の専門家です。${period}のユーザー属性データを分析し、初心者にも分かりやすく説明してください。

【データ】${demographicsText}${dataLimitationNote}
${getCommonOutputRules()}
${getComparisonContextBlock(metrics)}${getScrapingContextBlock(metrics)}`;
}

// ==================== 逆算フロー分析 ====================

function getReverseFlowPrompt(period, metrics) {
  const flowName = metrics.flowName || 'フロー名未設定';
  const hasEntryPage = metrics.hasEntryPage || false;
  const entryPagePath = metrics.entryPagePath || '';
  const formPagePath = metrics.formPagePath || '未設定';
  const targetCvEvent = metrics.targetCvEvent || '未設定';
  const totalSiteViews = metrics.totalSiteViews || 0;
  const entryPageViews = metrics.entryPageViews ?? null;
  const startViews = metrics.startViews || totalSiteViews;
  const formPageViews = metrics.formPageViews || 0;
  const submissionComplete = metrics.submissionComplete || 0;
  const achievementRate1 = parseFloat(metrics.achievementRate1) || 0;
  const achievementRate2 = parseFloat(metrics.achievementRate2) || 0;
  const overallCVR = parseFloat(metrics.overallCVR) || 0;
  const monthlyData = metrics.monthlyData || [];

  const startLabel = hasEntryPage ? '起点ページ閲覧数' : '全ページ閲覧数';

  let entryPageText = '';
  if (hasEntryPage) {
    entryPageText = `\n- 起点ページパス: ${entryPagePath}\n- 起点ページ閲覧数: ${(entryPageViews ?? 0).toLocaleString()}回`;
  }

  let monthlyText = '';
  if (monthlyData.length > 0) {
    monthlyText = '\n\n【月次推移データ】\n';
    monthlyData.forEach((month) => {
      const mStartViews = hasEntryPage && month.entryPageViews != null ? month.entryPageViews : month.totalSiteViews;
      monthlyText += `${month.month || month.yearMonth}: ${startLabel}${(mStartViews ?? 0).toLocaleString()}回, フォーム閲覧${month.formPageViews?.toLocaleString() || 0}回, 成果${month.submissionComplete?.toLocaleString() || 0}件, 到達率${mStartViews > 0 ? ((month.formPageViews / mStartViews) * 100).toFixed(2) : 0}%\n`;
    });
  }

  return `
あなたはWebサイト分析の専門家です。${period}の「${flowName}」フローのデータを分析し、初心者にも分かりやすく説明してください。

【現在期間のデータ】
- フロー名: ${flowName}${entryPageText}
- フォームページパス: ${formPagePath}
- 目標成果イベント: ${targetCvEvent}
- ${startLabel}: ${startViews.toLocaleString()}回
- フォーム閲覧数: ${formPageViews.toLocaleString()}回
- 成果完了数（${targetCvEvent}）: ${submissionComplete.toLocaleString()}件
- フォーム到達率 (${startLabel}→フォーム閲覧): ${achievementRate1.toFixed(2)}%
- フォーム完了率 (フォーム閲覧→成果完了): ${achievementRate2.toFixed(2)}%
- 全体成果率 (${startLabel}→成果完了): ${overallCVR.toFixed(2)}%${monthlyText}
${getCommonOutputRules()}
${getComparisonContextBlock(metrics)}${getScrapingContextBlock(metrics)}`;
}

// ==================== 集客チャネル分析 ====================

function getChannelsPrompt(period, metrics) {
  const hasConversions = metrics.conversionEventNames && metrics.conversionEventNames.length > 0;
  const conversionNote = hasConversions ? `\n- 成果合計: ${metrics.totalConversions?.toLocaleString() || 0}件` : '';

  // channelsTextから詳細データを構築
  let channelsDetailText = '';
  if (metrics.channelsText) {
    channelsDetailText = `\n\n【チャネル別内訳（上位${metrics.channelCount || 5}件）】\n${metrics.channelsText}`;
  }

  return `
あなたはWebサイト分析の専門家です。${period}の流入経路データを分析し、初心者にも分かりやすく説明してください。

【データ】
- 訪問数合計: ${metrics.totalSessions?.toLocaleString() || 0}回
- ユーザー数: ${metrics.totalUsers?.toLocaleString() || 0}人${conversionNote}
- チャネル数: ${metrics.channelCount || 0}種類${channelsDetailText}
${getCommonOutputRules()}
${getComparisonContextBlock(metrics)}${getScrapingContextBlock(metrics)}`;
}

// ==================== 参照元/メディア分析 ====================

function getReferralsPrompt(period, metrics) {
  const hasConversions = metrics.conversionEventNames && metrics.conversionEventNames.length > 0;
  const conversionNote = hasConversions ? `\n- 成果合計: ${metrics.totalConversions?.toLocaleString() || 0}件` : '';

  // topReferralsTextから詳細データを構築
  let referralsDetailText = '';
  if (metrics.topReferralsText) {
    referralsDetailText = `\n\n【参照元別内訳（上位10）】\n${metrics.topReferralsText}`;
  }

  return `
あなたはWebサイト分析の専門家です。${period}の参照元データを分析し、初心者にも分かりやすく説明してください。

【データ】
- 訪問数合計: ${metrics.totalSessions?.toLocaleString() || 0}回
- ユーザー数: ${metrics.totalUsers?.toLocaleString() || 0}人${conversionNote}
- 参照元数: ${metrics.referralCount || 0}種類${referralsDetailText}
${getCommonOutputRules()}
${getComparisonContextBlock(metrics)}${getScrapingContextBlock(metrics)}`;
}

// ==================== ランディングページ分析 ====================

function getLandingPagesPrompt(period, metrics) {
  const hasConversions = metrics.conversionEventNames && metrics.conversionEventNames.length > 0;
  const conversionNote = hasConversions ? `\n- 成果合計: ${metrics.totalConversions?.toLocaleString() || 0}件` : '';

  // topLandingPagesTextから詳細データを構築
  let landingPagesDetailText = '';
  if (metrics.topLandingPagesText) {
    landingPagesDetailText = `\n\n【最初に見られるページ別内訳（上位10）】\n${metrics.topLandingPagesText}`;
  }

  return `
あなたはWebサイト分析の専門家です。${period}の最初に見られるページ（ランディングページ）データを分析し、初心者にも分かりやすく説明してください。

【データ】
- 訪問数合計: ${metrics.totalSessions?.toLocaleString() || 0}回${conversionNote}
- ページ数: ${metrics.landingPageCount || 0}ページ${landingPagesDetailText}
${getCommonOutputRules()}
${getComparisonContextBlock(metrics)}${getScrapingContextBlock(metrics)}`;
}

// ==================== ページ別分析 ====================

function getPagesPrompt(period, metrics) {
  // topPagesTextから詳細データを構築
  let pagesDetailText = '';
  if (metrics.topPagesText) {
    pagesDetailText = `\n\n【ページ別内訳（上位10）】\n${metrics.topPagesText}`;
  }

  return `
あなたはWebサイト分析の専門家です。${period}のページ別データを分析し、初心者にも分かりやすく説明してください。

【データ】
- ページ閲覧数合計: ${metrics.totalPageViews?.toLocaleString() || 0}回
- ページ数: ${metrics.pageCount || 0}ページ${pagesDetailText}
${getCommonOutputRules()}
${getComparisonContextBlock(metrics)}${getScrapingContextBlock(metrics)}`;
}

// ==================== ページ分類別分析 ====================

function getPageCategoriesPrompt(period, metrics) {
  // topCategoriesTextから詳細データを構築
  let categoriesDetailText = '';
  if (metrics.topCategoriesText) {
    categoriesDetailText = `\n\n【カテゴリ別内訳（上位10）】\n${metrics.topCategoriesText}`;
  }

  return `
あなたはWebサイト分析の専門家です。${period}のページ分類別データを分析し、初心者にも分かりやすく説明してください。

【データ】
- ページ閲覧数合計: ${metrics.totalPageViews?.toLocaleString() || 0}回
- カテゴリ数: ${metrics.categoryCount || 0}種類${categoriesDetailText}
${getCommonOutputRules()}
${getComparisonContextBlock(metrics)}${getScrapingContextBlock(metrics)}`;
}

// ==================== 流入キーワード分析 ====================

function getKeywordsPrompt(period, metrics) {
  const hasGSCConnection = metrics.hasGSCConnection === true;
  const noDataNote = !hasGSCConnection ? '\n\n⚠️ Search Consoleが未連携です。' : '';

  // topKeywordsTextから詳細データを構築
  let keywordsDetailText = '';
  if (metrics.topKeywordsText) {
    keywordsDetailText = `\n\n【キーワード別内訳（上位10）】\n${metrics.topKeywordsText}`;
  }

  return `
あなたはWebサイト分析の専門家です。${period}の検索キーワードデータを分析し、初心者にも分かりやすく説明してください。

【データ】
- クリック数合計: ${metrics.totalClicks?.toLocaleString() || 0}回
- 検索結果での表示回数合計: ${metrics.totalImpressions?.toLocaleString() || 0}回
- 平均クリック率（CTR）: ${((metrics.avgCTR || 0) * 100).toFixed(2)}%
- 平均掲載順位: ${(metrics.avgPosition || 0).toFixed(1)}位
- キーワード数: ${metrics.keywordCount || 0}個${noDataNote}${keywordsDetailText}
${getCommonOutputRules()}
${getComparisonContextBlock(metrics)}${getScrapingContextBlock(metrics)}`;
}

// ==================== コンバージョン一覧分析 ====================

function getConversionsPrompt(period, metrics) {
  const hasConversions = metrics.conversionEventCount > 0;
  const noDataNote = !hasConversions ? '\n\n⚠️ 成果の定義が未設定です。' : '';

  // conversionSummaryText, monthlyDetailText, latestMonthTextから詳細データを構築
  let conversionDetailText = '';
  if (metrics.conversionSummaryText && metrics.conversionSummaryText !== 'データなし') {
    conversionDetailText = `\n\n【全期間の成果イベント合計】\n${metrics.conversionSummaryText}`;
  }
  if (metrics.latestMonthText && metrics.latestMonthText !== 'データなし') {
    conversionDetailText += `\n\n【最新月（${metrics.latestMonth || '不明'}）の内訳】\n${metrics.latestMonthText}`;
  }
  if (metrics.monthlyDetailText) {
    conversionDetailText += metrics.monthlyDetailText;
  }

  return `
あなたはWebサイト分析の専門家です。${period}の成果データを分析し、初心者にも分かりやすく説明してください。

【データ】
- 成果イベント数: ${metrics.conversionEventCount || 0}種類
- データ期間: ${metrics.monthlyDataPoints || 0}ヶ月分${noDataNote}${conversionDetailText}
${getCommonOutputRules()}
${getComparisonContextBlock(metrics)}${getScrapingContextBlock(metrics)}`;
}

// ==================== ファイルダウンロード分析 ====================

function getFileDownloadsPrompt(period, metrics) {
  // topFilesTextから詳細データを構築
  let filesDetailText = '';
  if (metrics.topFilesText) {
    filesDetailText = `\n\n【ファイル別内訳（上位10）】\n${metrics.topFilesText}`;
  }

  return `
あなたはWebサイト分析の専門家です。${period}のファイルダウンロードデータを分析し、初心者にも分かりやすく説明してください。

【データ】
- ダウンロード数合計: ${metrics.totalDownloads?.toLocaleString() || 0}回
- ユーザー数: ${metrics.totalUsers?.toLocaleString() || 0}人
- ファイル数: ${metrics.downloadCount || 0}種類${filesDetailText}
${getCommonOutputRules()}
${getComparisonContextBlock(metrics)}${getScrapingContextBlock(metrics)}`;
}

// ==================== 外部リンククリック分析 ====================

function getExternalLinksPrompt(period, metrics) {
  // topLinksTextから詳細データを構築
  let linksDetailText = '';
  if (metrics.topLinksText) {
    linksDetailText = `\n\n【リンク別内訳（上位10）】\n${metrics.topLinksText}`;
  }

  return `
あなたはWebサイト分析の専門家です。${period}の外部リンククリックデータを分析し、初心者にも分かりやすく説明してください。

【データ】
- クリック数合計: ${metrics.totalClicks?.toLocaleString() || 0}回
- ユーザー数: ${metrics.totalUsers?.toLocaleString() || 0}人
- リンク数: ${metrics.clickCount || 0}種類${linksDetailText}
${getCommonOutputRules()}
${getComparisonContextBlock(metrics)}${getScrapingContextBlock(metrics)}`;
}

// ==================== ページフロー分析（新規） ====================

function getPageFlowPrompt(period, metrics) {
  const pagePath = metrics.pagePath || '不明';
  const totalPageViews = metrics.totalPageViews || 0;
  const totalSessions = metrics.totalSessions || 0;

  // trafficBreakdownから流入元を構築
  let trafficText = '';
  if (metrics.trafficBreakdown && typeof metrics.trafficBreakdown === 'object') {
    const entries = Object.entries(metrics.trafficBreakdown).filter(([, v]) => v > 0);
    if (entries.length > 0) {
      trafficText = '\n\n【流入元の内訳】\n';
      entries.sort((a, b) => b[1] - a[1]);
      entries.forEach(([source, count]) => {
        trafficText += `${source}: ${count.toLocaleString()}回\n`;
      });
    }
  }

  // internalTransitionsからサイト内直前ページを構築
  let transitionsText = '';
  if (metrics.internalTransitions && Array.isArray(metrics.internalTransitions) && metrics.internalTransitions.length > 0) {
    transitionsText = `\n\n【サイト内の直前ページ（上位${Math.min(metrics.internalTransitions.length, 10)}件）】\n`;
    metrics.internalTransitions.slice(0, 10).forEach(t => {
      const from = t.previousPage || '不明';
      const count = t.count || 0;
      const pct = t.percentage ? `（${t.percentage.toFixed(1)}%）` : '';
      transitionsText += `${from}: ${count.toLocaleString()}PV${pct}\n`;
    });
  }

  return `
あなたはWebサイト分析の専門家です。${period}のページ「${pagePath}」への流入フローデータを分析し、初心者にも分かりやすく説明してください。

【データ】
- 対象ページ: ${pagePath}
- ページ閲覧数: ${totalPageViews.toLocaleString()}回
- セッション数: ${totalSessions.toLocaleString()}回
- サイト内からの遷移パターン数: ${metrics.transitionCount || 0}件${trafficText}${transitionsText}
${getCommonOutputRules()}
${getComparisonContextBlock(metrics)}${getScrapingContextBlock(metrics)}`;
}

// ==================== デフォルトプロンプト ====================

function getDefaultPrompt(period, metrics) {
  return `
あなたはWebサイト分析の専門家です。${period}のWebサイトデータを分析し、初心者にも分かりやすく説明してください。
${getCommonOutputRules()}
${getComparisonContextBlock(metrics)}${getScrapingContextBlock(metrics)}`;
}

// ==================== AI総合分析 ====================

function getComprehensiveAnalysisPrompt(period, metrics) {
  // 基本指標
  const sessions = metrics.sessions || 0;
  const users = metrics.users || 0;
  const pageViews = metrics.pageViews || 0;
  const engagementRate = metrics.engagementRate || 0;
  const conversions = metrics.conversions || 0;

  // 前月比
  let momText = '';
  if (metrics.monthOverMonth) {
    const mom = metrics.monthOverMonth;
    const items = [];
    if (mom.sessions) items.push(`訪問数: 前月比${mom.sessions.change >= 0 ? '+' : ''}${mom.sessions.change.toFixed(1)}%`);
    if (mom.users) items.push(`ユーザー: 前月比${mom.users.change >= 0 ? '+' : ''}${mom.users.change.toFixed(1)}%`);
    if (mom.conversions) items.push(`成果: 前月比${mom.conversions.change >= 0 ? '+' : ''}${mom.conversions.change.toFixed(1)}%`);
    if (mom.engagementRate) items.push(`閲覧の活発さ: 前月比${mom.engagementRate.change >= 0 ? '+' : ''}${mom.engagementRate.change.toFixed(1)}%`);
    if (items.length > 0) momText = `\n前月比: ${items.join(', ')}`;
  }

  // チャネルデータ
  let channelsText = '';
  if (metrics.channelsData && metrics.channelsData.length > 0) {
    channelsText = '\n\n【集客チャネル上位】\n' + metrics.channelsData
      .slice(0, 7)
      .map(ch => `${ch.channel || ch.sessionDefaultChannelGroup}: 訪問${ch.sessions || 0}回, 成果${ch.conversions || 0}件`)
      .join('\n');
  }

  // ランディングページ
  let lpText = '';
  if (metrics.landingPagesData && metrics.landingPagesData.length > 0) {
    lpText = '\n\n【最初に見られるページ上位】\n' + metrics.landingPagesData
      .slice(0, 5)
      .map(lp => `${lp.landingPage}: 訪問${lp.sessions || 0}回, 閲覧の活発さ${((lp.engagementRate || 0) * 100).toFixed(1)}%`)
      .join('\n');
  }

  // 参照元
  let referralsText = '';
  if (metrics.referralsData && metrics.referralsData.length > 0) {
    referralsText = '\n\n【被リンク元上位】\n' + metrics.referralsData
      .slice(0, 5)
      .map(ref => `${ref.source}: 訪問${ref.sessions || 0}回, 成果${ref.conversions || 0}件`)
      .join('\n');
  }

  // ページ
  let pagesText = '';
  if (metrics.pagesData && metrics.pagesData.length > 0) {
    pagesText = '\n\n【人気ページ上位】\n' + metrics.pagesData
      .slice(0, 10)
      .map(p => `${p.pagePath || p.pageTitle}: 閲覧${p.screenPageViews || 0}回`)
      .join('\n');
  }

  // ユーザー属性（unknown/不明/(not set)を除外して有効データのみ使用）
  let demographicsText = '';
  if (metrics.demographics) {
    const demo = metrics.demographics;
    const UNKNOWN_VALUES = new Set(['不明', 'unknown', '(not set)', 'undefined', 'null', '']);
    const isKnown = (name) => {
      if (name == null) return false;
      return !UNKNOWN_VALUES.has(String(name).toLowerCase().trim());
    };
    const getLabel = (...candidates) => {
      for (const c of candidates) {
        if (c != null && !UNKNOWN_VALUES.has(String(c).toLowerCase().trim())) return String(c);
      }
      return null;
    };
    const getVal = (d) => d.value || d.sessions || d.users || 0;

    const parts = [];
    if (demo.device && demo.device.length > 0) {
      const known = demo.device.filter(d => isKnown(getLabel(d.name, d.device, d.deviceCategory)));
      if (known.length > 0) {
        parts.push('デバイス: ' + known.slice(0, 3).map(d => `${getLabel(d.name, d.device, d.deviceCategory)}: ${getVal(d)}人`).join(', '));
      }
    }
    if (demo.gender && demo.gender.length > 0) {
      const known = demo.gender.filter(d => isKnown(d.name));
      if (known.length > 0) {
        parts.push('性別: ' + known.slice(0, 3).map(g => `${g.name}: ${getVal(g)}人`).join(', '));
      }
    }
    if (demo.age && demo.age.length > 0) {
      const known = demo.age.filter(d => isKnown(getLabel(d.name, d.age, d.userAgeBracket)));
      if (known.length > 0) {
        parts.push('年齢層: ' + known.slice(0, 3).map(a => `${getLabel(a.name, a.age, a.userAgeBracket)}: ${getVal(a)}人`).join(', '));
      }
    }
    if (demo.newReturning && demo.newReturning.length > 0) {
      const known = demo.newReturning.filter(n => isKnown(getLabel(n.name, n.type, n.newVsReturning)));
      if (known.length > 0) {
        parts.push('新規/再訪: ' + known.map(n => `${getLabel(n.name, n.type, n.newVsReturning)}: ${getVal(n)}人`).join(', '));
      }
    }
    if (demo.location) {
      const regions = demo.location.region || demo.location.regions || (Array.isArray(demo.location) ? demo.location : null);
      if (Array.isArray(regions) && regions.length > 0) {
        const known = regions.filter(l => isKnown(getLabel(l.name, l.region, l.city)));
        if (known.length > 0) {
          parts.push('地域: ' + known.slice(0, 3).map(l => `${getLabel(l.name, l.region, l.city)}: ${getVal(l)}人`).join(', '));
        }
      }
    }
    if (parts.length > 0) {
      demographicsText = '\n\n【ユーザー属性】※unknown/不明のデータは除外済み。以下は判明しているデータのみです。\n' + parts.join('\n');
    }
  }

  // キーワード（GSC連携時のみ）
  let keywordsText = '';
  if (metrics.keywordsData && metrics.keywordsData.length > 0) {
    keywordsText = '\n\n【検索キーワード上位】\n' + metrics.keywordsData
      .slice(0, 10)
      .map(k => `${k.query}: ${k.clicks}クリック, 表示${k.impressions}回, 平均順位${k.position?.toFixed(1) || '-'}`)
      .join('\n');
  }

  // 月次トレンド
  let monthlyText = '';
  if (metrics.monthlyData && metrics.monthlyData.length > 0) {
    monthlyText = '\n\n【月次トレンド（直近13ヶ月）】\n' + metrics.monthlyData
      .map(m => `${m.yearMonth}: 訪問${m.sessions || 0}回, 成果${m.conversions || 0}件`)
      .join('\n');
  }

  // CV設定有無
  const hasCV = metrics.hasConversionDefinitions !== false && conversions > 0;

  return `
あなたはWebサイト分析の専門家です。${period}の全データを横断的に分析し、サイトの現状と注目すべきポイントを初心者にも分かりやすく説明してください。

【基本指標】
- 訪問数: ${sessions.toLocaleString()}回
- ユーザー数: ${users.toLocaleString()}人
- ページ閲覧数: ${pageViews.toLocaleString()}回
- 閲覧の活発さ（エンゲージメント率）: ${(engagementRate * 100).toFixed(1)}%
- 成果数: ${conversions.toLocaleString()}件${momText}
${channelsText}${lpText}${referralsText}${pagesText}${demographicsText}${keywordsText}${monthlyText}

【出力形式】必ず以下の形式で出力してください。

冒頭にこのサイトの全体状況を2〜3文で簡潔に要約した段落を書いてください。

## 注目ポイント
- 最も注目すべき変化: [具体的な数値と内容] ([補足説明])
- 最大のリスク: [具体的な数値と内容] ([補足説明])
- 最大の機会: [具体的な数値と内容] ([補足説明])

## アクセス概況
[2〜3文。訪問数/ページ閲覧数/閲覧の活発さの変化、月別・日別の傾向]

## 訪問者の傾向
[2〜3文。提供されたユーザー属性データ（デバイス・性別・年齢・地域・新規再訪問）のうち、判明しているデータのみで傾向を分析。データがない属性には触れない]

## 集客分析
[2〜3文。チャネル別比較、${keywordsText ? 'キーワード変化、' : ''}被リンクの質]

## コンテンツ分析
[2〜3文。高/低パフォーマンスページ、最初に見られるページの課題]
${hasCV ? `
## コンバージョン分析
[2〜3文。成果数の推移、チャネル別成果率、改善余地のある導線]` : ''}

【ルール】
- 前置き不要、分析内容から直接開始
- Web初心者にもわかるよう、専門用語はできるだけ避けてやさしい日本語で書くこと
  - CVR → お問い合わせ率（CVR）
  - セッション → 訪問数
  - PV → ページ閲覧数
  - エンゲージメント率 → 閲覧の活発さ（エンゲージメント率）
  - オーガニック → 検索からの流入（オーガニック検索）
  - 直帰率 → 1ページだけ見て離脱する割合（直帰率）
  - ランディングページ → 最初に見られるページ（ランディングページ）
  - CTR → クリック率（CTR）
  - インプレッション → 検索結果での表示回数
  - どうしても使う場合は括弧で補足: 例「お問い合わせ率（CVR）」
- 数値は基本的に実数値（○○回、○○件、○○人など）を優先
- パーセンテージは前月比・前年比などの比較文脈でのみ使用
- 数値は実データのみ使用。提供されたデータにない数値は絶対に記載しないこと
- 改善提案は含めない（「改善する」ページで別途生成するため）
- 各セクション2〜3文で簡潔に。全体800〜1000文字
- 「ポイント」という単位は使わない
- ユーザー属性のunknown/不明/(not set)/undefinedのデータには一切言及しない。「データが含まれていない」「把握できない」「情報がない」「注視する必要がある」等のネガティブな表現は絶対に使わない。提供されたデータの中で判明している傾向のみを前向きに分析する。データが少ない属性はスキップし、豊富にあるデータの分析に注力する
${getComparisonContextBlock(metrics)}${getScrapingContextBlock(metrics)}`;
}

// ==================== ページタイプラベル ====================

function getPageTypeLabel(pageType) {
  const labels = {
    home: 'トップページ',
    article: '記事・ブログ',
    product: '商品・サービス',
    contact: 'お問い合わせ',
    about: '会社情報',
    landing: 'ランディングページ',
    other: 'その他',
  };
  return labels[pageType] || 'その他';
}

// ==================== 包括的改善案（変更なし） ====================

/**
 * 包括的改善案用プロンプト
 * @param {object} [options] - siteContext: { industry, siteType, sitePurpose }, improvementFocus
 */
function getComprehensiveImprovementPrompt(period, metrics, startDate, endDate, options = {}) {
  const sd = startDate || '';
  const ed = endDate || '';
  const { siteContext, improvementFocus, userNote = '', conversionGoals = [], kpiSettings = [] } = options;

  let monthlyTrendText = '';
  if (metrics.monthlyTrend && metrics.monthlyTrend.monthlyData && Array.isArray(metrics.monthlyTrend.monthlyData)) {
    const monthlyData = metrics.monthlyTrend.monthlyData;
    monthlyTrendText = '\n\n【過去13ヶ月の推移】\n';
    monthlyData.forEach(month => {
      monthlyTrendText += `- ${month.month}: ユーザー${month.users?.toLocaleString() || 0}人, 訪問${month.sessions?.toLocaleString() || 0}回, CV${month.conversions?.toLocaleString() || 0}件\n`;
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
- 訪問者数: ${recent30Days.sessions?.toLocaleString() || 0}回
- ページビュー数: ${recent30Days.screenPageViews?.toLocaleString() || 0}回
- エンゲージメント率: ${((recent30Days.engagementRate || 0) * 100).toFixed(1)}%
- コンバージョン数: ${recent30Days.totalConversions?.toLocaleString() || 0}件${conversionDetails}
`;

  let channelsText = '';
  if (metrics.channels && Array.isArray(metrics.channels) && metrics.channels.length > 0) {
    channelsText = '\n\n【集客チャネル（直近30日）】\n';
    metrics.channels.slice(0, 5).forEach(channel => {
      channelsText += `- ${channel.channel}: 訪問${channel.sessions?.toLocaleString() || 0}回, CV${channel.conversions?.toLocaleString() || 0}件\n`;
    });
  }

  let landingPagesText = '';
  if (metrics.landingPages && Array.isArray(metrics.landingPages) && metrics.landingPages.length > 0) {
    landingPagesText = '\n\n【人気ランディングページ（直近30日、トップ5）】\n';
    metrics.landingPages.slice(0, 5).forEach(page => {
      landingPagesText += `- ${page.page}: 訪問${page.sessions?.toLocaleString() || 0}回, ENG率${(page.engagementRate * 100).toFixed(1)}%, CV${page.conversions?.toLocaleString() || 0}件\n`;
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

  // ── 時系列: 日別データ ──
  let dailyDataText = '';
  if (metrics.dailyData && metrics.dailyData.rows && Array.isArray(metrics.dailyData.rows) && metrics.dailyData.rows.length > 0) {
    dailyDataText = '\n\n【日別データ（直近30日のうち特徴的な日）】\n';
    const rows = metrics.dailyData.rows;
    const sorted = [...rows].sort((a, b) => (b.sessions || 0) - (a.sessions || 0));
    dailyDataText += '上位日:\n';
    sorted.slice(0, 5).forEach(row => {
      dailyDataText += `- ${row.date}: 訪問${row.sessions?.toLocaleString() || 0}回, CV${row.conversions?.toLocaleString() || 0}件, ENG率${((row.engagementRate || 0) * 100).toFixed(1)}%\n`;
    });
    dailyDataText += '下位日:\n';
    sorted.slice(-3).forEach(row => {
      dailyDataText += `- ${row.date}: 訪問${row.sessions?.toLocaleString() || 0}回, CV${row.conversions?.toLocaleString() || 0}件\n`;
    });
  }

  // ── 時系列: 曜日別データ ──
  let weeklyDataText = '';
  if (metrics.weeklyData && metrics.weeklyData.rows && Array.isArray(metrics.weeklyData.rows) && metrics.weeklyData.rows.length > 0) {
    weeklyDataText = '\n\n【曜日別データ（直近30日）】\n';
    metrics.weeklyData.rows.forEach(row => {
      weeklyDataText += `- ${row.dayOfWeekName || row.dayOfWeek}: 訪問${row.sessions?.toLocaleString() || 0}回, CV${row.conversions?.toLocaleString() || 0}件, ENG率${((row.engagementRate || 0) * 100).toFixed(1)}%\n`;
    });
  }

  // ── 時系列: 時間帯別データ ──
  let hourlyDataText = '';
  if (metrics.hourlyData && metrics.hourlyData.rows && Array.isArray(metrics.hourlyData.rows) && metrics.hourlyData.rows.length > 0) {
    hourlyDataText = '\n\n【時間帯別データ（直近30日）】\n';
    metrics.hourlyData.rows.forEach(row => {
      hourlyDataText += `- ${row.hour}時: 訪問${row.sessions?.toLocaleString() || 0}回, CV${row.conversions?.toLocaleString() || 0}件\n`;
    });
  }

  // ── 集客: 被リンク元データ ──
  let referralsText = '';
  if (metrics.referrals && Array.isArray(metrics.referrals) && metrics.referrals.length > 0) {
    referralsText = '\n\n【被リンク元（直近30日、トップ10）】\n';
    metrics.referrals.slice(0, 10).forEach(row => {
      referralsText += `- ${row.source || '不明'}: 訪問${row.sessions?.toLocaleString() || 0}回, CV${row.conversions?.toLocaleString() || 0}件\n`;
    });
  }

  // ── ページ: ファイルダウンロード ──
  let fileDownloadsText = '';
  if (metrics.fileDownloads && Array.isArray(metrics.fileDownloads) && metrics.fileDownloads.length > 0) {
    fileDownloadsText = '\n\n【ファイルダウンロード（直近30日）】\n';
    metrics.fileDownloads.slice(0, 10).forEach(row => {
      fileDownloadsText += `- ${row.url}: ${row.downloads?.toLocaleString() || 0}回（ユーザー${row.users?.toLocaleString() || 0}人）\n`;
    });
  }

  // ── ページ: 外部リンククリック ──
  let externalLinksText = '';
  if (metrics.externalLinks && Array.isArray(metrics.externalLinks) && metrics.externalLinks.length > 0) {
    externalLinksText = '\n\n【外部リンククリック（直近30日、トップ10）】\n';
    metrics.externalLinks.slice(0, 10).forEach(row => {
      externalLinksText += `- ${row.url}: ${row.clicks?.toLocaleString() || 0}回（ユーザー${row.users?.toLocaleString() || 0}人）\n`;
    });
  }

  // ── ページ: ページフロー（遷移分析） ──
  let pageFlowText = '';
  if (metrics.pageFlow && Array.isArray(metrics.pageFlow) && metrics.pageFlow.length > 0) {
    pageFlowText = '\n\n【ページフロー（主要ページの遷移分析）】\n';
    metrics.pageFlow.forEach(flow => {
      pageFlowText += `\n■ ${flow.pagePath}\n`;
      if (flow.previousPages && flow.previousPages.length > 0) {
        pageFlowText += '  流入元: ';
        pageFlowText += flow.previousPages.slice(0, 3).map(p => `${p.pageReferrer}(${p.sessions || 0}回)`).join(', ');
        pageFlowText += '\n';
      }
      if (flow.exitData && flow.exitData.length > 0) {
        pageFlowText += '  遷移先: ';
        pageFlowText += flow.exitData.slice(0, 3).map(p => `${p.exitPage}(${p.exitCount || 0}回)`).join(', ');
        pageFlowText += '\n';
      }
    });
  }

  // ── コンバージョン: 逆算フロー ──
  let reverseFlowText = '';
  if (metrics.reverseFlow && Array.isArray(metrics.reverseFlow) && metrics.reverseFlow.length > 0) {
    reverseFlowText = '\n\n【逆算フロー（コンバージョン導線分析）】\n';
    metrics.reverseFlow.forEach(flow => {
      reverseFlowText += `\n■ ${flow.flowName}\n`;
      reverseFlowText += `  全体セッション: ${flow.totalSessions?.toLocaleString() || 0}回\n`;
      reverseFlowText += `  フォーム到達: ${flow.entryToFormSessions?.toLocaleString() || 0}回\n`;
      reverseFlowText += `  コンバージョン: ${flow.totalConversions?.toLocaleString() || 0}件\n`;
      if (flow.entryPages && flow.entryPages.length > 0) {
        reverseFlowText += '  主要流入ページ: ';
        reverseFlowText += flow.entryPages.slice(0, 3).map(p => `${p.pagePath}(${p.sessions || 0}回)`).join(', ');
        reverseFlowText += '\n';
      }
    });
  }

  // ── AI総合分析キャッシュ ──
  let aiComprehensiveAnalysisText = '';
  if (metrics.aiComprehensiveAnalysis) {
    aiComprehensiveAnalysisText = '\n\n【AI総合分析（直近の分析結果）】\n';
    const analysisText = typeof metrics.aiComprehensiveAnalysis === 'string'
      ? metrics.aiComprehensiveAnalysis
      : JSON.stringify(metrics.aiComprehensiveAnalysis);
    aiComprehensiveAnalysisText += analysisText.length > 1000
      ? analysisText.substring(0, 1000) + '...(省略)'
      : analysisText;
    aiComprehensiveAnalysisText += '\n';
  }

  // ── ユーザー属性（デモグラフィック）──
  let demographicsText = '';
  if (metrics.demographics) {
    const demo = metrics.demographics;
    demographicsText = '\n\n【ユーザー属性（直近30日）】\n';
    if (demo.device && Array.isArray(demo.device) && demo.device.length > 0) {
      demographicsText += 'デバイス: ';
      demographicsText += demo.device.map(d => `${d.device || d.category}(${d.sessions?.toLocaleString() || d.users?.toLocaleString() || 0})`).join(', ');
      demographicsText += '\n';
    }
    if (demo.newReturning && Array.isArray(demo.newReturning) && demo.newReturning.length > 0) {
      demographicsText += '新規/リピーター: ';
      demographicsText += demo.newReturning.map(d => `${d.userType || d.type}(${d.sessions?.toLocaleString() || d.users?.toLocaleString() || 0})`).join(', ');
      demographicsText += '\n';
    }
  }

  // ── GSCキーワードデータ ──
  let keywordsText = '';
  if (metrics.keywords && Array.isArray(metrics.keywords) && metrics.keywords.length > 0) {
    keywordsText = '\n\n【流入キーワード元（GSC、直近30日、トップ10）】\n';
    metrics.keywords.slice(0, 10).forEach(kw => {
      keywordsText += `- "${kw.query || kw.keys?.[0] || ''}": クリック${kw.clicks?.toLocaleString() || 0}回, 表示${kw.impressions?.toLocaleString() || 0}回, CTR${((kw.ctr || 0) * 100).toFixed(1)}%, 順位${(kw.position || 0).toFixed(1)}\n`;
    });
  }

  // スクレイピングデータ（上位50ページの詳細情報）
  let scrapingDataText = '';
  if (metrics.scrapingData && metrics.scrapingData.pages && metrics.scrapingData.pages.length > 0) {
    const pages = metrics.scrapingData.pages;
    const meta = metrics.scrapingData.meta;

    scrapingDataText = '\n\n【アクセス上位ページの詳細分析（スクレイピングデータ）】\n';

    if (meta && meta.lastScrapedAt) {
      const lastScraped = meta.lastScrapedAt.toDate ? meta.lastScrapedAt.toDate() : new Date(meta.lastScrapedAt);
      scrapingDataText += `最終スクレイピング: ${lastScraped.toLocaleDateString('ja-JP')}\n`;
      scrapingDataText += `取得ページ数: ${meta.totalPagesScraped || pages.length}ページ\n\n`;
    }

    // 上位30ページの詳細を表示
    pages.slice(0, 30).forEach((page, index) => {
      scrapingDataText += `【${index + 1}位】 ${page.pagePath}\n`;
      scrapingDataText += `タイトル: ${page.metaTitle || '未設定'}\n`;
      scrapingDataText += `PV: ${page.pageViews?.toLocaleString() || 0}, ユーザー: ${page.users?.toLocaleString() || 0}\n`;
      scrapingDataText += `ページタイプ: ${getPageTypeLabel(page.pageType)}\n`;
      scrapingDataText += `テキスト量: ${page.textLength?.toLocaleString() || 0}文字\n`;
      scrapingDataText += `見出し構造: h1=${page.headingStructure?.h1 || 0}, h2=${page.headingStructure?.h2 || 0}, h3=${page.headingStructure?.h3 || 0}\n`;
      scrapingDataText += `画像: alt有=${page.imagesWithAlt || 0}, alt無=${page.imagesWithoutAlt || 0}\n`;
      scrapingDataText += `リンク: 内部=${page.internalLinks || 0}, 外部=${page.externalLinks || 0}\n`;
      scrapingDataText += `読込速度: ${page.loadTime || 0}ms\n`;
      scrapingDataText += `レスポンシブ: ${page.isResponsive ? '対応' : '未対応'}\n`;

      if (page.ctaButtons && page.ctaButtons.length > 0) {
        scrapingDataText += `CTA: ${page.ctaButtons.length}個（${page.ctaButtons.slice(0, 3).map(cta => cta.text).join(', ')}）\n`;
      }

      if (page.hasForm) {
        const fields = page.formFields || [];
        const INPUT_TYPE_NAMES = ['text', 'email', 'tel', 'number', 'url', 'search', 'date', 'reset', 'submit', 'button', 'radio', 'checkbox', 'select', 'textarea'];
        const fieldLabels = fields
          .map(f => {
            const label = f.label || f.name || '';
            if (!label) return null;
            if (INPUT_TYPE_NAMES.includes(label.toLowerCase())) return null;
            if (/^[a-z0-9]{6,}$/i.test(label) && !/[\u3000-\u9FFF\u30A0-\u30FF\u3040-\u309F]/.test(label)) return null;
            const req = f.required ? '*' : '';
            return `${label}${req}`;
          })
          .filter(Boolean);
        const hasJapaneseLabel = fieldLabels.some(l => /[\u3000-\u9FFF\u30A0-\u30FF\u3040-\u309F]/.test(l));
        if (fieldLabels.length > 0 && hasJapaneseLabel) {
          scrapingDataText += `フォーム: あり（主な項目: ${fieldLabels.join('、')}）※項目数はデータ取得上の制約で正確でない場合があります\n`;
        } else {
          scrapingDataText += `フォーム: あり（項目の詳細はスクレイピングでは正確に取得できませんでした。フォームの改善提案を行う場合は、一般的なフォーム最適化のベストプラクティスに基づいて提案してください。具体的な項目名や項目数には言及しないでください）\n`;
        }
      }

      const issues = [];
      if (page.headingStructure?.h1 === 0) issues.push('h1なし');
      if (page.headingStructure?.h1 > 1) issues.push('h1複数');
      if (page.headingStructure?.h2 === 0) issues.push('h2なし');
      if (page.textLength < 500) issues.push('テキスト少ない');
      if (page.imagesWithoutAlt > page.imagesWithAlt) issues.push('alt属性不足');
      if (!page.metaDescription) issues.push('description未設定');
      if (page.loadTime > 3000) issues.push('読込遅い');
      if (!page.isResponsive) issues.push('レスポンシブ未対応');

      if (issues.length > 0) {
        scrapingDataText += `⚠️ 問題点: ${issues.join(', ')}\n`;
      }

      if (page.firstView) {
        const fv = page.firstView;
        if (fv.headline) scrapingDataText += `ファーストビュー見出し: ${fv.headline}\n`;
        if (fv.subheadline) scrapingDataText += `ファーストビュー・サブ見出し: ${fv.subheadline}\n`;
        if (fv.cta) scrapingDataText += `ファーストビューCTA: 「${fv.cta.text}」→ ${fv.cta.href}\n`;
      }

      if (page.sections && page.sections.length > 0) {
        scrapingDataText += 'セクション構成:\n';
        for (const sec of page.sections.slice(0, 8)) {
          scrapingDataText += `  - ${sec.tag || 'h2'}: 「${sec.heading}」`;
          if (sec.imageCount) scrapingDataText += ` (画像${sec.imageCount}枚)`;
          if (sec.ctas && sec.ctas.length > 0) scrapingDataText += ` [CTA: ${sec.ctas.map(c => `「${c.text}」`).join('、')}]`;
          scrapingDataText += '\n';
        }
      }

      if (page.forms && page.forms.length > 0) {
        const FORM_INPUT_TYPE_NAMES = ['text', 'email', 'tel', 'number', 'url', 'search', 'date', 'reset', 'submit', 'button', 'radio', 'checkbox', 'select', 'textarea'];
        for (const form of page.forms) {
          const filtered = (form.fields || []).filter(f => f && !FORM_INPUT_TYPE_NAMES.includes(f.toLowerCase()));
          const hasJapanese = filtered.some(f => /[\u3000-\u9FFF\u30A0-\u30FF\u3040-\u309F]/.test(f));
          if (filtered.length > 0 && hasJapanese) {
            scrapingDataText += `フォーム（${form.purpose || '不明'}）: フィールド=[${filtered.join('、')}], 送信ボタン=「${form.submitText || '送信'}」\n`;
          } else {
            scrapingDataText += `フォーム（${form.purpose || '不明'}）: フィールド詳細は取得不可（具体的な項目名・項目数に言及しないこと）, 送信ボタン=「${form.submitText || '送信'}」\n`;
          }
        }
      }

      if (page.designTokens) {
        const dt = page.designTokens;
        const tokenParts = [];
        if (dt.primaryColor) tokenParts.push(`メインカラー: ${dt.primaryColor}`);
        if (dt.fonts && dt.fonts.length > 0) tokenParts.push(`フォント: ${dt.fonts.join(', ')}`);
        if (dt.bodyFontSize) tokenParts.push(`本文サイズ: ${dt.bodyFontSize}`);
        if (dt.maxWidth) tokenParts.push(`コンテナ幅: ${dt.maxWidth}`);
        if (tokenParts.length > 0) scrapingDataText += `デザイン: ${tokenParts.join(' / ')}\n`;
      }

      scrapingDataText += '\n';
    });
  } else {
    scrapingDataText = '\n\n【アクセス上位ページの詳細分析】\n';
    scrapingDataText += '⚠️ スクレイピングデータが未取得です。管理画面から「上位100ページをスクレイピング」を実行してください。\n\n';
  }

  const sitemapText = '';
  const pageQualityText = '';

  let siteContextBlock = '';
  if (siteContext && (siteContext.industryText || siteContext.siteTypeText || siteContext.sitePurposeText)) {
    siteContextBlock = `
【サイトの前提情報（改善提案の前提として考慮すること）】
- 業界・業種: ${siteContext.industryText || '未設定'}
- サイト種別: ${siteContext.siteTypeText || '未設定'}
- サイトの目的: ${siteContext.sitePurposeText || '未設定'}
上記を踏まえ、この業界・サイト種別・目的に適した改善案のみを提案すること。

`;

    const siteTypeText = siteContext.siteTypeText || '';
    if (siteTypeText.includes('ECサイト') || siteTypeText.includes('通販')) {
      siteContextBlock += `【ECサイト特有の重点ポイント】
✓ カート離脱率の改善（カートページ、決済ページの最適化）
✓ 商品ページの改善（商品説明、画像、レビュー、関連商品）
✓ 購入導線の最適化（検索→商品詳細→カート→決済の流れ）
✓ リピート購入を促す施策
\n`;
    } else if (siteTypeText.includes('コーポレート') || siteTypeText.includes('企業')) {
      siteContextBlock += `【コーポレートサイト特有の重点ポイント】
✓ 問い合わせフォームへの導線強化
✓ 信頼性を高めるコンテンツ（実績、事例、お客様の声）
✓ サービス・製品ページの充実
✓ 採用ページの最適化（該当する場合）
\n`;
    } else if (siteTypeText.includes('メディア') || siteTypeText.includes('ブログ')) {
      siteContextBlock += `【メディアサイト特有の重点ポイント】
✓ 記事の回遊率向上（関連記事、内部リンク）
✓ 滞在時間の延長（コンテンツの質と量）
✓ SEO強化（検索流入の増加）
✓ 新規コンテンツの企画提案
\n`;
    } else if (siteTypeText.includes('LP') || siteTypeText.includes('ランディング')) {
      siteContextBlock += `【ランディングページ特有の重点ポイント】
✓ ファーストビューの最適化
✓ コンバージョンまでの導線設計
✓ 離脱ポイントの特定と改善
✓ CTA（行動喚起）の配置と文言
\n`;
    }
  }

  let conversionSettingsText = '';
  if (conversionGoals && conversionGoals.length > 0) {
    conversionSettingsText += '\n【コンバージョン設定】\n';
    conversionGoals.forEach((goal, index) => {
      conversionSettingsText += `${index + 1}. ${goal.name || '未設定'}\n`;
      if (goal.description) conversionSettingsText += `   説明: ${goal.description}\n`;
    });
  } else {
    conversionSettingsText += '\n【コンバージョン設定】\n⚠️ 未設定です。サイト管理の編集画面から設定してください。\n';
  }

  if (kpiSettings && kpiSettings.length > 0) {
    conversionSettingsText += '\n【KPI設定】\n';
    kpiSettings.forEach((kpi, index) => {
      conversionSettingsText += `${index + 1}. ${kpi.name || '未設定'}: 目標値 ${kpi.targetValue || '-'}\n`;
    });
  } else {
    conversionSettingsText += '\n【KPI設定】\n⚠️ 未設定です。サイト管理の編集画面から設定してください。\n';
  }

  let userNoteBlock = '';
  if (userNote) {
    userNoteBlock = `★★★【最重要】ユーザーからの具体的な改善指示 ★★★
以下のユーザー指示を最優先とし、この内容に基づいた改善案を必ず含めること。
他の方針設定よりもこの指示を優先すること。

「${userNote}」

---
`;
  }

  let improvementFocusLine = '';
  if (improvementFocus) {
    improvementFocusLine = `今回の提案は【${improvementFocus}】を最優先の成果指標として、このサイトに即効性のある改善策に絞ること。\n\n`;

    if (improvementFocus === '集客力の向上') {
      improvementFocusLine += `【集客力向上の重点ポイント】
✓ 集客チャネル、流入キーワード元、被リンク元のデータを重点的に分析
✓ SEO強化施策（メタタグ最適化、コンテンツ改善、内部リンク構造など）
✓ 広告活用施策（リスティング広告、SNS広告の最適化）
✓ オフラインマーケティングとの連携（QRコード活用、店舗連携、オフライン広告との統合）
✓ 訪問者数を増やすための具体的なアクションプランを提示
\n`;
    } else if (improvementFocus === 'コンバージョン（成果）の向上') {
      const hasConversionSettings = conversionGoals && conversionGoals.length > 0;
      improvementFocusLine += `【コンバージョン向上の重点ポイント】
${hasConversionSettings
  ? '✓ 設定されているコンバージョン目標とKPIを達成するための具体的な改善策を提案\n'
  : '✓ コンバージョン設定が未設定のため、まず設定を促す旨を明記すること\n'}
✓ EFO（Entry Form Optimization）を最重視：フォーム入力の障壁を減らす施策
✓ フォームページへのPV数を増やすための導線改善
✓ フォームページの離脱率を下げる具体的な施策
✓ コンバージョンデータ、逆算フロー、フォームページのデータを重点分析
✓ CTA（行動喚起）ボタンの配置・文言・デザインの最適化
\n`;
    } else if (improvementFocus === 'ブランディングの向上') {
      improvementFocusLine += `【ブランディング向上の重点ポイント】
✓ エンゲージメント率、滞在時間を重点的に分析
✓ 既存ページへの新規コンテンツ追加の提案（具体的なテーマ・構成案を含む）
✓ 新規ページの提案（タイトル、目的、想定される効果を明記）
✓ コンテンツギャップの特定と補完策
✓ ブランド価値を高めるストーリーテリング、ビジュアル改善
✓ ユーザーとの信頼関係構築につながる施策
\n`;
    } else if (improvementFocus === 'ユーザービリティの向上') {
      improvementFocusLine += `【ユーザービリティ向上の重点ポイント】
✓ エンゲージメント率、直帰率、ページフローを重点的に分析
✓ ナビゲーション構造の改善
✓ ページ表示速度の最適化
✓ モバイルユーザビリティの改善
✓ 情報の見つけやすさ、理解しやすさの向上
✓ ユーザーのストレスを減らす具体的な施策
\n`;
    } else if (improvementFocus === 'パフォーマンスの向上') {
      improvementFocusLine += `【パフォーマンス向上の重点ポイント】
✓ サイト診断結果（PageSpeed Insights）のスコアとCore Web Vitalsを重点的に分析
✓ LCP改善: 画像最適化（WebP変換、遅延読込）、重要リソースのプリロード、サーバー応答速度改善
✓ CLS改善: 画像・広告の明示的サイズ指定、フォント読込の最適化
✓ TBT/INP改善: JavaScript実行の最小化、コード分割、不要なサードパーティスクリプトの削除
✓ FCP改善: クリティカルCSSのインライン化、レンダリングブロックリソースの排除
✓ SEOスコアの技術的改善: 構造化データ、メタタグ最適化、アクセシビリティ改善
✓ サイト診断の失敗Audit一覧に基づいた具体的な改善策を提案
✓ 各施策の期待されるスコア改善幅を可能な限り数値で示す
\n`;
    }
  }

  const existingImprovements = options.existingImprovements || [];
  let existingImprovementsText = '';
  if (existingImprovements.length > 0) {
    existingImprovementsText = '\n\n【既に提案済みの改善案（これらと重複しない新しい視点の提案をすること）】\n';
    existingImprovements.forEach((item, index) => {
      existingImprovementsText += `${index + 1}. ${item.title}\n`;
      if (item.description) {
        existingImprovementsText += `   ${item.description.substring(0, 100)}${item.description.length > 100 ? '...' : ''}\n`;
      }
    });
    existingImprovementsText += '\n上記の改善案とは異なる、新しい視点・アプローチの改善策を提案すること。\n';
  }

  return `
あなたはWebサイト改善コンサルタントです。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【タスク1】サイトデータの分析（分析サマリー作成）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
過去365日分のデータを参照し、直近30日のパフォーマンスを分析してください。
**【重要】分析サマリーには「改善施策」や「アクション」を含めないでください。現状の分析と課題特定のみです。**

${recentSummaryText}
${demographicsText}
${monthlyTrendText}
${dailyDataText}
${weeklyDataText}
${hourlyDataText}
${channelsText}
${keywordsText}
${referralsText}
${pagesText}
${pageCategoriesText}
${landingPagesText}
${fileDownloadsText}
${externalLinksText}
${pageFlowText}
${monthlyConversionsText}
${reverseFlowText}
${aiComprehensiveAnalysisText}

【分析の視点】
- 長期トレンド（過去13ヶ月）と直近30日の比較
- 季節性や前年同期との変化
- 曜日別・時間帯別のパターン分析
- ページ遷移フローと離脱ポイントの特定
- コンバージョン導線（逆算フロー）の効率性
- 最もビジネスインパクトが大きい課題の特定（チャネル、コンテンツ、CV導線など）

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【タスク2】改善施策の提案（サイト構造と実データに基づく）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${siteContextBlock}${conversionSettingsText}
${scrapingDataText}
${sitemapText}${pageQualityText}

【改善施策の生成ルール】
${userNoteBlock}${improvementFocusLine}${existingImprovementsText}✓ このサイトの実際の構造とアクセスデータに基づいて提案
✓ 専門用語を使わず、中学生でも理解できる言葉で説明
✓ 「なぜ必要か」「どう改善するか」「どんな効果が期待できるか」を明確に記述
✓ 3〜5件の具体的な改善案を提案
✓ 既に提案した施策と重複しないよう、重複判定用ラベルでテーマが同じものは出さない

【重要】具体性を担保するための必須ルール：
✓ 改善案のタイトルと説明には必ず具体的なページURL・パスを明記すること
✓ スクレイピングデータから実際の問題を特定して引用すること
  例: 「/about ページのh1が2つある（スクレイピングデータ: h1=2）」
✓ 実際の数値を根拠として示すこと
  例: 「PV 1,234/月なのにCV 0件」「読込時間4.2秒（平均の2倍）」
✓ 実際のコンテンツを引用すること
  例: 現在のCTAボタン「詳しくはこちら」→「無料で資料請求（3分で完了）」に変更
✓ 改善前後の具体的な変更内容を示すこと
✓ 期待効果を定量的に表現すること（例: 「CV率が1.2%→2.5%に向上見込み」）
✓ 汎用的な提案は禁止: 「表示速度改善」「alt属性設定」「h1タグ設定」などの一般論は、
  具体的なページURL、現状の数値、改善後の目標値を伴わない限り提案しないこと

【文章表現のルール：素人にもわかりやすく】
✓ 専門用語・技術用語はできるだけ避け、誰でもわかる日本語で書くこと
  - ✗ 「CVR」→ ✓ 「お問い合わせ率」「成約率」
  - ✗ 「CTA」→ ✓ 「ボタン」「申し込みボタン」
  - ✗ 「直帰率」→ ✓ 「1ページだけ見て離脱する割合」
  - ✗ 「ファーストビュー」→ ✓ 「ページを開いて最初に見える部分」
  - ✗ 「alt属性」→ ✓ 「画像の説明テキスト」
  - ✗ 「h1タグ」→ ✓ 「ページの大見出し」
  - ✗ 「レスポンシブ」→ ✓ 「スマホ対応」
  - ✗ 「UI/UX」→ ✓ 「見た目や使いやすさ」
  - ✗ 「LCP」「FCP」→ ✓ 「ページの表示速度」
  - ✗ 「ENG率」→ ✓ 「閲覧の活発さ」
  - ✗ 「PV」→ ✓ 「ページの閲覧数」
  - ✗ 「セッション」→ ✓ 「訪問数」
  - ✗ 「オーガニック」→ ✓ 「検索からの流入」
  - ✗ 「スクレイピングデータ」→ この言葉は絶対に使わないこと
✓ どうしても専門用語を使う場合は必ず括弧で補足すること
  例: 「お問い合わせ率（CVR）が0.13%」
✓ 改善内容は「何をどう変えるか」を具体的かつ平易に書くこと
✓ フォームの項目名として意味不明な英数字（ランダム文字列）は絶対に記載しないこと

【最重要ルール：事実に基づく記述のみ】
✗ 絶対に禁止: 提供されたデータに記載されていない数値・事実の捏造
  - フォーム項目数、ページのテキスト量、リンク数、画像数などは、
    スクレイピングデータまたは深掘り分析データに明記されている数値のみ使用すること
  - データに記載がない場合は、具体的な数値を推測で書かず、
    「コンテンツの充実」「導線の改善」など定性的な表現にとどめること
  - 「〜は○○個です」「〜は○○項目あります」のような断定は、
    データで裏付けられる場合のみ使用すること
✗ 例（禁止）: フォーム項目数がデータにないのに「フォームが11項目」と記載
✗ 例（禁止）: 読込時間がデータにないのに「読込が5秒かかっている」と記載
✓ 例（正しい）: スクレイピングデータに「フォーム: あり（8項目）」とある場合のみ「8項目」と記載

【データ分析の優先順位】
1. 高PV×低CVのページを最優先で特定（最大の改善機会）
2. 高離脱率のページの原因分析（フォーム、読込速度、コンテンツ不足など）
3. CVに至るまでの導線で離脱が多いステップを特定
4. スクレイピングデータの「⚠️ 問題点」を優先的に改善対象とする
5. 実際のCTAボタンの文言、h1タグの内容、フォーム項目数などを引用する
6. 深掘り分析データがある場合、ファーストビュー構成・デザイントークン・セクション構造・フォーム構造を根拠として活用する

【禁止事項】
✗ 具体的なページURLを伴わない汎用的な提案
✗ 数値根拠のない抽象的な提案
✗ 「〜を検討しましょう」「〜が望ましい」などの曖昧な表現
✗ 全ページに当てはまる一般論（例外: 新規ページ・コンテンツ追加の提案は可）
✗ スクレイピングデータに記載されていない問題の推測
✗ データに存在しない数値の捏造（フォーム項目数、テキスト量、リンク数等）
✗ 「現在○○は△△個です」のような、データで裏付けのない断定的記述

【実装難易度・費用感の判定基準】
実装者（implementationType）:
  - in_house: テキスト修正、記事追加、簡単な設定変更など、社内で対応可能
  - agency: デザイン変更、システム改修、専門知識が必要な作業
  - either: どちらでも対応可能な中間的な作業

難易度（difficulty）:
  - easy: 1〜2時間程度で完了、専門知識不要
  - medium: 1〜2日程度、基本的な知識が必要
  - hard: 1週間以上、専門的な知識・技術が必要

費用感（estimatedCost）:
  - free: 社内リソースのみで対応可能
  - low: 10万円未満（外部委託の場合）
  - medium: 10〜50万円
  - high: 50万円以上

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【出力形式】以下の形式で厳密に出力してください
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

分析サマリー（箇条書き•で2-4個の要点のみ。見出しは使わない。合計300-400文字。改善施策は含めない）
- 最重要ポイント：直近30日の主要指標と前月比（数値付き）
- 原因分析：なぜその結果になったか（簡潔に）
- 改善提案は含めない（タスク2で別途出力）

推奨改善施策

タイトル: （具体的で分かりやすいタイトル。ページパス・URLを明記）
説明: （このサイトの具体的な状況に合わせた説明。初心者にも分かりやすく、「なぜ」「どうする」「効果」を明示。現状の数値・実際のコンテンツを引用）
重複判定用ラベル: （この施策のテーマを1〜3語で。例: alt属性, h1タグ, 記事CTA）
カテゴリー: （選択した施策のカテゴリー: acquisition, content, design, feature, other）
優先度: （このサイトでの優先度: high, medium, low）
期待効果: （定量的な数値を含めて記述。例: 直帰率18%改善、月間CV+15件）
実装者: （in_house=自社で実施可能, agency=制作会社推奨, either=どちらでも可能）
難易度: （easy=簡単, medium=中程度, hard=難しい）
費用感: （free=無料, low=低コスト〜10万円, medium=中コスト10〜50万円, high=高コスト50万円以上）
想定工数（時間）: （0.5〜100の数値。エンジニア工数＋必要に応じて設計・デザイン工数の合計）

---

タイトル: （2件目）
説明: （2件目）
重複判定用ラベル: （2件目、1〜3語）
カテゴリー: （2件目）
優先度: （2件目）
期待効果: （2件目）
実装者: （2件目）
難易度: （2件目）
費用感: （2件目）
想定工数（時間）: （2件目）

---

（以下、選択した件数分繰り返す。必ず3〜5件）

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【厳守事項】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. 分析サマリーには改善施策を含めない
2. 推奨改善施策はこのサイトの実際のデータと構造に基づいて提案
3. 件数は必ず3〜5件（6件以上は禁止、2件以下も禁止）
4. 専門用語を避け、初心者にも分かりやすい言葉で説明
5. 各施策で「なぜ必要か」「どう改善するか」「どんな効果が期待できるか」を明示
6. 必ず「タイトル:」「説明:」「重複判定用ラベル:」「カテゴリー:」「優先度:」「期待効果:」「実装者:」「難易度:」「費用感:」「想定工数（時間）:」の形式で出力
7. 番号付きリスト（1. 2. 3.）は使用禁止
8. 期待効果は可能な限り定量的に（数値で）記述する（例: 直帰率18%改善、月間CV+15件）
9. タイトル、説明、期待効果にマークダウン記号（**、#、-、*）は使用禁止
10. 各改善施策の間に「---」を挿入
11. 実装者は必ずin_house/agency/eitherのいずれかを指定
12. 難易度は必ずeasy/medium/hardのいずれかを指定
13. 費用感は必ずfree/low/medium/highのいずれかを指定
14. 対象ページ・対象箇所は該当する場合のみ記述。施策が特定ページ向けの場合は「対象ページ: /パス」または「対象ページ: https://...」、サイト共通（ヘッダー・フッター等）の場合は対象ページを空にするか「対象ページ: /」とし、対象箇所に「ヘッダー」「フッター」等を記述
`;
}
