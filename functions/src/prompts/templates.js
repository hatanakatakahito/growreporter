/**
 * AI分析プロンプトテンプレート集
 *
 * 各ページタイプごとのプロンプトを一元管理
 * プロンプトを変更する場合は、このファイルを編集してください
 */

// ==================== 共通ヘルパー ====================

function getCommonOutputRules(hasComparison = false) {
  if (hasComparison) {
    return `
【出力形式 — 比較データあり】
冒頭: 全体の変化を2〜3文（150〜200文字）で要約。主要指標の増減、主因、全体の傾向を具体的な数値とともに述べる。
その後: 注目すべき変化を3〜5個、「・」で始まる箇条書きで1行ずつ記載。

出力例:
全体流入は875→1,133で-22.8%と大きく減少しました。主因はダイレクト流入の落ち込みで、自然検索も減少した一方、直帰率は44.75%→40.57%へ改善しており、流入量は縮小しつつ質はやや改善しています。

・ダイレクト流入の急減が全体UU減少を主導（434→254、-41.5%）
・自然検索の減速で主力流入基盤が縮小（642→573、-10.7%）
・流入減少の中でも直帰率は改善、低品質流入の縮小が示唆（44.75%→40.57%）
・前週に流入を押し上げたニュース記事LPが失速し、反動減を発生（82→4、-95.1%）
・リファラー/UTMの構成は大勢維持、ただしメール流入は消失（8→0）`;
  }

  // 比較データなしの場合
  return `
【出力形式 — 比較データなし（当期のみ）】
「前期値→当期値」の比較は絶対に書かないこと。【前期間データ】セクションがない場合、前期との比較は一切行わない。
同じ期間内の異なる指標（例: 訪問数とユーザー数）を「前期→当期」と誤解して比較することは厳禁。

冒頭: 当期データの全体像を2〜3文（150〜200文字）で要約。主要指標の数値、構成の特徴、目立つ傾向を具体的に述べる。
その後: 注目すべきポイントを3〜5個、「・」で始まる箇条書きで1行ずつ記載。

出力例:
当期の訪問数は合計99,840回で、9種類のチャネルから流入がありました。検索からの流入が全体の52.5%を占め、主力チャネルとなっています。

・検索からの流入が全体の過半数を占める（52,412回、構成比52.5%）
・有料検索広告は訪問数に対して成果効率が低い（23,288回に対し成果9件、CVR 0.04%）
・紹介（Referral）は少数ながら成果効率が高い（1,784回、CVR 0.17%）`;
}

function getCommonOutputRulesFooter() {
  return `
【共通ルール】
- 前置きや挨拶は一切不要、分析内容から直接始める
- **太字**、\`バッククォート\`、見出し記号（#）などの装飾は一切使わない。プレーンテキストのみ
- 箇条書きは「・」（中黒）のみ使用。「-」「*」「1.」は使わない
- 各箇条書きは1行で完結させる。箇条書きの下に補足説明文を書かない
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
- 数値は実数値（○○回、○○件、○○人など）を優先
- 「ポイント」表記は禁止
- 改善提案は含めない（事実と分析のみ）
- 各箇条書きには具体的な数値を必ず含める

【厳守事項】
- 提供されたデータにない数値は絶対に記載しないこと
- 同じ期間内の異なる指標（訪問数とユーザー数など）を前期→当期と誤解して比較しないこと
- 「承知しました」「分析します」などの前置き禁止
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

  let text = `\n\n【前期間データ（${period.startDate}〜${period.endDate}）】\n`;

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
      const changeText = change != null ? `（${change > 0 ? '+' : ''}${change}%）` : '';
      shown.push(`${label}: 前期${prev.toLocaleString()} → 当期${cur.toLocaleString()} ${changeText}`);
    }
  }
  if (shown.length > 0) {
    text += shown.join('\n') + '\n';
  }

  // 詳細データの前期比較は当期テキスト側に対比形式で組み込み済み（buildComparisonDetailTexts）
  // ここでは合計値の比較のみ表示

  text += '\n重要: 当期データの各項目に「前期:」行が付いている場合、その前期値と比較して変化を分析してください。変化の大きい項目を優先的に取り上げてください。';
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
    contentAnalysis: getContentAnalysisPrompt,
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
あなたはWebサイト分析の専門家です。${period}の日別データを分析してください。
単なるデータの羅列ではなく、「何が起きたか」「なぜか」を中心に、変化の大きい日や曜日パターンに注目して分析してください。

【当期データ】
- 訪問数合計: ${metrics.sessions?.toLocaleString() || 0}回${conversionNote}
- データ日数: ${metrics.dailyDataCount || metrics.dailyData?.length || 0}日${dailyDetailText}
${getComparisonContextBlock(metrics)}
${getCommonOutputRules(!!metrics.comparisonMetrics)}
${getCommonOutputRulesFooter()}${getScrapingContextBlock(metrics)}`;
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
あなたはWebサイト分析の専門家です。${period}の曜日別データを分析してください。
単なるデータの羅列ではなく、曜日間の差異パターンや前期間との変化に注目して分析してください。

【当期データ】
- 訪問数合計: ${metrics.sessions?.toLocaleString() || 0}回${conversionNote}${weeklyDetailText}
${getComparisonContextBlock(metrics)}
${getCommonOutputRules(!!metrics.comparisonMetrics)}
${getCommonOutputRulesFooter()}${getScrapingContextBlock(metrics)}`;
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
あなたはWebサイト分析の専門家です。${period}の時間帯別データを分析してください。
単なるデータの羅列ではなく、ピーク時間帯・閑散時間帯のパターンや前期間との変化に注目して分析してください。

【当期データ】
- 訪問数合計: ${metrics.sessions?.toLocaleString() || 0}回${conversionNote}${hourlyDetailText}
${getComparisonContextBlock(metrics)}
${getCommonOutputRules(!!metrics.comparisonMetrics)}
${getCommonOutputRulesFooter()}${getScrapingContextBlock(metrics)}`;
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
あなたはWebサイト分析の専門家です。${period}の月別推移データを分析してください。
月次トレンド（増加・減少・横ばい）を中心に、変化の大きい月とその原因を分析してください。季節性やイベント影響の可能性にも言及してください。

【当期データ】
- 対象期間: ${metrics.monthCount || 0}ヶ月分
- 総訪問数: ${metrics.sessions?.toLocaleString() || 0}回
- 総成果数: ${metrics.conversions?.toLocaleString() || 0}件${monthlyDataText}
${getComparisonContextBlock(metrics)}
${getCommonOutputRules(!!metrics.comparisonMetrics)}
${getCommonOutputRulesFooter()}${getScrapingContextBlock(metrics)}`;
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
あなたはWebサイト分析の専門家です。${period}の全体サマリーデータを分析してください。
単なるデータの羅列ではなく、前月比・前年比の変化を中心に「何が起きたか」「なぜか」を分析してください。

【当期データ】
- 訪問数: ${metrics.sessions?.toLocaleString() || 0}回${additionalMetrics}${conversionText}${monthOverMonthText}${yearAgoText}${kpiText}
${getComparisonContextBlock(metrics)}
${getCommonOutputRules(!!metrics.comparisonMetrics)}
${getCommonOutputRulesFooter()}${getScrapingContextBlock(metrics)}`;
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
あなたはWebサイト分析の専門家です。${period}のユーザー属性データを分析してください。
単なるデータの羅列ではなく、属性間の偏りや前期間との変化に注目して分析してください。

【当期データ】${demographicsText}${dataLimitationNote}
${getComparisonContextBlock(metrics)}
${getCommonOutputRules(!!metrics.comparisonMetrics)}
${getCommonOutputRulesFooter()}${getScrapingContextBlock(metrics)}`;
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
あなたはWebサイト分析の専門家です。${period}の「${flowName}」フローのデータを分析してください。
ファネルの各ステップでの離脱ポイントや、前期間との変化に注目して分析してください。

【当期データ】
- フロー名: ${flowName}${entryPageText}
- フォームページパス: ${formPagePath}
- 目標成果イベント: ${targetCvEvent}
- ${startLabel}: ${startViews.toLocaleString()}回
- フォーム閲覧数: ${formPageViews.toLocaleString()}回
- 成果完了数（${targetCvEvent}）: ${submissionComplete.toLocaleString()}件
- フォーム到達率 (${startLabel}→フォーム閲覧): ${achievementRate1.toFixed(2)}%
- フォーム完了率 (フォーム閲覧→成果完了): ${achievementRate2.toFixed(2)}%
- 全体成果率 (${startLabel}→成果完了): ${overallCVR.toFixed(2)}%${monthlyText}
${getComparisonContextBlock(metrics)}
${getCommonOutputRules(!!metrics.comparisonMetrics)}
${getCommonOutputRulesFooter()}${getScrapingContextBlock(metrics)}`;
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
あなたはWebサイト分析の専門家です。${period}の流入経路データを分析してください。
チャネル間の構成比の変化や、特定チャネルの急増・急減とその原因に注目して分析してください。

【当期データ】
- 訪問数合計: ${metrics.totalSessions?.toLocaleString() || 0}回
- ユーザー数: ${metrics.totalUsers?.toLocaleString() || 0}人${conversionNote}
- チャネル数: ${metrics.channelCount || 0}種類${channelsDetailText}
${getComparisonContextBlock(metrics)}
${getCommonOutputRules(!!metrics.comparisonMetrics)}
${getCommonOutputRulesFooter()}${getScrapingContextBlock(metrics)}`;
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
あなたはWebサイト分析の専門家です。${period}の参照元データを分析してください。
主要な参照元の変化や、新規・消失した参照元に注目して分析してください。

【当期データ】
- 訪問数合計: ${metrics.totalSessions?.toLocaleString() || 0}回
- ユーザー数: ${metrics.totalUsers?.toLocaleString() || 0}人${conversionNote}
- 参照元数: ${metrics.referralCount || 0}種類${referralsDetailText}
${getComparisonContextBlock(metrics)}
${getCommonOutputRules(!!metrics.comparisonMetrics)}
${getCommonOutputRulesFooter()}${getScrapingContextBlock(metrics)}`;
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
あなたはWebサイト分析の専門家です。${period}の最初に見られるページ（ランディングページ）データを分析してください。
上位LPの順位変動や、新規・消失したLPに注目して分析してください。

【当期データ】
- 訪問数合計: ${metrics.totalSessions?.toLocaleString() || 0}回${conversionNote}
- ページ数: ${metrics.landingPageCount || 0}ページ${landingPagesDetailText}
${getComparisonContextBlock(metrics)}
${getCommonOutputRules(!!metrics.comparisonMetrics)}
${getCommonOutputRulesFooter()}${getScrapingContextBlock(metrics)}`;
}

// ==================== ページ別分析 ====================

function getPagesPrompt(period, metrics) {
  // topPagesTextから詳細データを構築
  let pagesDetailText = '';
  if (metrics.topPagesText) {
    pagesDetailText = `\n\n【ページ別内訳（上位10）】\n${metrics.topPagesText}`;
  }

  // 興味度スコア統計
  let interestScoreText = '';
  if (metrics.interestScoreStats) {
    const s = metrics.interestScoreStats;
    interestScoreText = `\n- 平均興味スコア: ${s.avgScore}/100\n- 高興味ページ数（70以上）: ${s.highScoreCount}ページ\n- 低興味ページ数（40未満）: ${s.lowScoreCount}ページ`;
  }

  return `
あなたはWebサイト分析の専門家です。${period}のページ別データを分析してください。
上位ページの閲覧数変化や、急増・急減したページに注目して分析してください。
${metrics.hasScrollData ? '興味スコアが低いページの原因を分析し、高スコアページとの差異にも注目してください。完読率（90%到達率）が低いページはコンテンツの前半で離脱している可能性があります。' : ''}

【当期データ】
- ページ閲覧数合計: ${metrics.totalPageViews?.toLocaleString() || 0}回
- ページ数: ${metrics.pageCount || 0}ページ${interestScoreText}${pagesDetailText}
${getComparisonContextBlock(metrics)}
${getCommonOutputRules(!!metrics.comparisonMetrics)}
${getCommonOutputRulesFooter()}${getScrapingContextBlock(metrics)}`;
}

// ==================== コンテンツ分析 ====================

function getContentAnalysisPrompt(period, metrics) {
  let pagesDetailText = '';
  if (metrics.topPagesText) {
    pagesDetailText = `\n\n【ページ別内訳（上位10）】\n${metrics.topPagesText}`;
  }

  const s = metrics.interestScoreStats || {};
  const hasGTM = metrics.hasGTMScrollData;

  // GTMデータの有無でスコア説明を切り替え
  const scoreExplanation = hasGTM
    ? `興味度スコアは以下5指標で算出されています（拡張スコア / GTM連携済み）：
・エンゲージメント率 (20%): ユーザーが積極的に操作した割合
・スクロール深度スコア (25%): 25/50/75/100%到達率の加重平均
・滞在時間スコア (20%): 平均滞在時間（3分で満点）
・非直帰率 (15%): 直帰しなかったユーザーの割合
・CTAクリック率 (20%): CTAボタンのクリック率`
    : `興味度スコアは以下の指標で算出されています：
・エンゲージメント率: ユーザーが積極的に操作した割合
${metrics.hasScrollData ? '・完読率: ページの90%以上までスクロールしたユーザーの割合\n' : ''}・滞在時間スコア: 平均滞在時間（3分で満点）
・非直帰率: 直帰しなかったユーザーの割合`;

  let gtmAnalysisPoints = '';
  if (hasGTM) {
    gtmAnalysisPoints = `
5. スクロール深度の分布（どの地点で離脱が多いか）を分析し、コンテンツ構成の改善ポイントを特定
6. CTAクリック率が低いページでは、ボタンの位置・文言・デザインの改善を具体的に提案`;
  }

  return `
あなたはWebサイトのコンテンツ分析の専門家です。${period}のページ別コンテンツ興味度データを分析してください。

${scoreExplanation}

以下の観点で分析してください：
1. 興味スコアが高いページの共通点と、なぜユーザーに支持されているか
2. 興味スコアが低いページの問題点と、改善すべき優先順位
3. 完読率が低いページ（コンテンツ前半で離脱している可能性）の対策
4. PVは多いが興味スコアが低いページ（改善インパクトが大きい）の特定${gtmAnalysisPoints}

【当期データ】
- ページ閲覧数合計: ${metrics.totalPageViews?.toLocaleString() || 0}回
- ページ数: ${metrics.pageCount || 0}ページ
- 平均興味スコア: ${s.avgScore || 0}/100
- 高興味ページ数（70以上）: ${s.highScoreCount || 0}ページ
- 低興味ページ数（40未満）: ${s.lowScoreCount || 0}ページ${pagesDetailText}
${getComparisonContextBlock(metrics)}
${getCommonOutputRules(!!metrics.comparisonMetrics)}
${getCommonOutputRulesFooter()}${getScrapingContextBlock(metrics)}`;
}

// ==================== ページ分類別分析 ====================

function getPageCategoriesPrompt(period, metrics) {
  // topCategoriesTextから詳細データを構築
  let categoriesDetailText = '';
  if (metrics.topCategoriesText) {
    categoriesDetailText = `\n\n【カテゴリ別内訳（上位10）】\n${metrics.topCategoriesText}`;
  }

  return `
あなたはWebサイト分析の専門家です。${period}のページ分類別データを分析してください。
カテゴリ間の閲覧数の偏りや、前期間との構成比変化に注目して分析してください。

【当期データ】
- ページ閲覧数合計: ${metrics.totalPageViews?.toLocaleString() || 0}回
- カテゴリ数: ${metrics.categoryCount || 0}種類${categoriesDetailText}
${getComparisonContextBlock(metrics)}
${getCommonOutputRules(!!metrics.comparisonMetrics)}
${getCommonOutputRulesFooter()}${getScrapingContextBlock(metrics)}`;
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
あなたはWebサイト分析の専門家です。${period}の検索キーワードデータを分析してください。
主要キーワードの順位・クリック数変化や、新たに流入を生んだキーワードに注目して分析してください。

【当期データ】
- クリック数合計: ${metrics.totalClicks?.toLocaleString() || 0}回
- 検索結果での表示回数合計: ${metrics.totalImpressions?.toLocaleString() || 0}回
- 平均クリック率（CTR）: ${((metrics.avgCTR || 0) * 100).toFixed(2)}%
- 平均掲載順位: ${(metrics.avgPosition || 0).toFixed(1)}位
- キーワード数: ${metrics.keywordCount || 0}個${noDataNote}${keywordsDetailText}
${getComparisonContextBlock(metrics)}
${getCommonOutputRules(!!metrics.comparisonMetrics)}
${getCommonOutputRulesFooter()}${getScrapingContextBlock(metrics)}`;
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
あなたはWebサイト分析の専門家です。${period}の成果データを分析してください。
成果数の推移や、成果イベントごとの変化に注目して分析してください。

【当期データ】
- 成果イベント数: ${metrics.conversionEventCount || 0}種類
- データ期間: ${metrics.monthlyDataPoints || 0}ヶ月分${noDataNote}${conversionDetailText}
${getComparisonContextBlock(metrics)}
${getCommonOutputRules(!!metrics.comparisonMetrics)}
${getCommonOutputRulesFooter()}${getScrapingContextBlock(metrics)}`;
}

// ==================== ファイルダウンロード分析 ====================

function getFileDownloadsPrompt(period, metrics) {
  // topFilesTextから詳細データを構築
  let filesDetailText = '';
  if (metrics.topFilesText) {
    filesDetailText = `\n\n【ファイル別内訳（上位10）】\n${metrics.topFilesText}`;
  }

  return `
あなたはWebサイト分析の専門家です。${period}のファイルダウンロードデータを分析してください。
人気ファイルの変化や、新規・消失したダウンロード対象に注目して分析してください。

【当期データ】
- ダウンロード数合計: ${metrics.totalDownloads?.toLocaleString() || 0}回
- ユーザー数: ${metrics.totalUsers?.toLocaleString() || 0}人
- ファイル数: ${metrics.downloadCount || 0}種類${filesDetailText}
${getComparisonContextBlock(metrics)}
${getCommonOutputRules(!!metrics.comparisonMetrics)}
${getCommonOutputRulesFooter()}${getScrapingContextBlock(metrics)}`;
}

// ==================== 外部リンククリック分析 ====================

function getExternalLinksPrompt(period, metrics) {
  // topLinksTextから詳細データを構築
  let linksDetailText = '';
  if (metrics.topLinksText) {
    linksDetailText = `\n\n【リンク別内訳（上位10）】\n${metrics.topLinksText}`;
  }

  return `
あなたはWebサイト分析の専門家です。${period}の外部リンククリックデータを分析してください。
クリック数の多いリンクの変化や、新規・消失したリンクに注目して分析してください。

【当期データ】
- クリック数合計: ${metrics.totalClicks?.toLocaleString() || 0}回
- ユーザー数: ${metrics.totalUsers?.toLocaleString() || 0}人
- リンク数: ${metrics.clickCount || 0}種類${linksDetailText}
${getComparisonContextBlock(metrics)}
${getCommonOutputRules(!!metrics.comparisonMetrics)}
${getCommonOutputRulesFooter()}${getScrapingContextBlock(metrics)}`;
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
あなたはWebサイト分析の専門家です。${period}のページ「${pagePath}」への流入フローデータを分析してください。
流入元の構成変化や、サイト内遷移パターンの変動に注目して分析してください。

【当期データ】
- 対象ページ: ${pagePath}
- ページ閲覧数: ${totalPageViews.toLocaleString()}回
- セッション数: ${totalSessions.toLocaleString()}回
- サイト内からの遷移パターン数: ${metrics.transitionCount || 0}件${trafficText}${transitionsText}
${getComparisonContextBlock(metrics)}
${getCommonOutputRules(!!metrics.comparisonMetrics)}
${getCommonOutputRulesFooter()}${getScrapingContextBlock(metrics)}`;
}

// ==================== デフォルトプロンプト ====================

function getDefaultPrompt(period, metrics) {
  return `
あなたはWebサイト分析の専門家です。${period}のWebサイトデータを分析してください。
単なるデータの羅列ではなく、変化の大きい項目とその原因に注目して分析してください。
${getComparisonContextBlock(metrics)}
${getCommonOutputRules(!!metrics.comparisonMetrics)}
${getCommonOutputRulesFooter()}${getScrapingContextBlock(metrics)}`;
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
  if (siteContext && (siteContext.industryText || siteContext.siteTypeText || siteContext.sitePurposeText || siteContext.siteName || siteContext.siteUrl)) {
    const siteName = siteContext.siteName || '（サイト名未設定）';
    const siteUrl = siteContext.siteUrl || '（URL未設定）';
    const industryText = siteContext.industryText || '（業界未設定）';
    const siteTypeText = siteContext.siteTypeText || '（サイト種別未設定）';
    const sitePurposeText = siteContext.sitePurposeText || '（目的未設定）';

    siteContextBlock = `
【クライアントの前提】
・サイト名: ${siteName}
・サイトURL: ${siteUrl}
・業界: ${industryText}
・サイト種別: ${siteTypeText}
・サイトの目的: ${sitePurposeText}

このサイトの存在意義は「${siteTypeText}として ${sitePurposeText} を実現する」ことです。
すべての改善提案はこの目的に資するかを基準に採否を判断してください。

【業界コンテキストの踏まえ方（必須）】
以下を一流コンサルタントとして「${industryText}の${siteTypeText}」の現場で
働いてきた経験として想定し、提案本文に反映してください:

1. 典型的なステークホルダー像
   ・誰がこのサイトを見るのか（例: BtoBなら担当者+決裁者、採用なら求職者本人+家族、
     ECならB2C個人）
   ・彼らの意思決定プロセス（例: BtoBの稟議フロー・複数人合議、採用の応募前不安解消、
     ECの比較検討→購入判断）
   ・利用シーン（業務中／私用／モバイル／PC、時間帯、心理状態）

2. 業界固有の購買・応募・問合せの心理障壁
   ・この業界で「コンバージョン前に確認される必須情報」は何か
   （例: BtoBなら料金・導入事例・契約条件、採用なら福利厚生・社員の声・
     1日の流れ、ECなら送料・返品・レビュー）
   ・競合との差別化軸として何が効くか

3. 業界特有の専門用語・表現
   ・ターゲットが使う検索語彙・業界用語をメタタイトル・見出し・本文で適切に使う

提案の本文には、可能な限り以下を含めてください:
・「${industryText}の${siteTypeText}では、〇〇なユーザー（例: 法人の人事担当者／
  地方赴任者／比較検討中の決裁者 等）が〇〇を求めている」という具体的ユーザー像
・「このサイト種別／目的にとってなぜ有効か」の紐付け理由
・そのユーザーの意思決定プロセスにおけるこの施策の位置づけ

`;
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
    improvementFocusLine = `
【重点観点】${improvementFocus}

これは提案範囲を狭める指示ではありません。「${improvementFocus}」に資する施策を
全体の中で相対的に厚く（半数以上の比重で）提案してください。
ただし、データから明らかに致命的な問題が他の領域にある場合は、
プロの判断として必ずその指摘・提案を含めてください。
「${improvementFocus}」を追求しても効果が出せない前提条件があれば、
そこにも踏み込むのが一流のコンサルタントの仕事です。

`;

    if (improvementFocus === '集客力の向上') {
      improvementFocusLine += `【深掘りすべきデータと想定施策領域】
深掘りデータ:
・チャネル別（Organic / Paid / Social / Referral / Direct）の強弱
・流入キーワードの順位・CTR・改善余地
・ランディングページ別の流入数・直帰率・CVR
・参照元サイトの質と量
・スクレイピングデータ（meta description、title、h1構成）のSEO観点

想定施策例（これ以外も有効と判断すれば提案可）:
・SEO: 順位が惜しい（4-20位）KWのコンテンツ強化、メタタグ最適化、内部リンク構造改善
・広告: リスティングKW選定、SNS広告ターゲティング、リマーケティング、LP×広告マッチング
・SNS/動画: Instagram/X/YouTube等との相互導線、シェアされるコンテンツ企画
・PR/外部: プレスリリース、業界メディア掲載、オフライン連携

各施策で「どのチャネルの、どの数値を、どれくらい改善するか」を数値で明示すること。

`;
    } else if (improvementFocus === 'コンバージョン（成果）の向上') {
      const hasConversionSettings = conversionGoals && conversionGoals.length > 0;
      improvementFocusLine += `【深掘りすべきデータと想定施策領域】
深掘りデータ:
・コンバージョン一覧データ（どのCVイベントが多い/少ない、CVR推移）
・逆算フロー（CV直前のページ遷移パターン、成功パターンと離脱ポイント）
・ページフロー（フォームページへの到達経路と離脱箇所）
・スクレイピングデータ（フォームページの項目構成、CTA文言）
${hasConversionSettings
  ? '・設定されているCV目標・KPI目標値に対する達成状況と未達要因'
  : '・CVゴール未設定のため、まず設定を促す提案を含めること'}

想定施策例（これ以外も有効と判断すれば提案可）:
・EFO: フォーム項目の削減/最適化、必須/任意の見直し、ステップ分割、入力補助
・CTA: ボタンの配置・文言・色・サイズ、各ページからフォームへの誘導強化
・離脱防止: 入力中の不安解消（プライバシー表示、所要時間明示）
・マイクロCV: 資料DL、メルマガ登録など中間CVの追加でファネル補強

各施策で「CVRを現状何%から何%へ」を期待値として明示すること。

`;
    } else if (improvementFocus === 'ブランディングの向上') {
      improvementFocusLine += `【深掘りすべきデータと想定施策領域】
深掘りデータ:
・スクレイピングデータ（各ページのmeta/h1/コンテンツ構造・ファーストビュー）
・サイト全体のビジュアル統一性（配色・フォント・余白・写真のトーン）
・${siteContext?.industryText || 'この業界'}における「あるべきブランド像」と現状のギャップ

想定施策例（これ以外も有効と判断すれば提案可）:
・ファーストビュー: 企業/サービスの価値訴求を瞬時に伝える見出し・画像の改善
・写真・画像: ストックフォト依存からオリジナル写真・図解への置き換え
・トンマナ: テキストの語調・表現をターゲットユーザーに合わせる
・差別化: このサイトならではの独自性・世界観の表現
・信頼感: 実績・お客様の声・メディア掲載・認証バッジの適切配置
・ストーリーテリング: 理念・開発背景・想いが伝わるコンテンツ
・統一感: 下層ページもトップと同じブランド体験を提供

各施策で「何をどう変えるとブランド印象がどう向上するか」を具体的に。

`;
    } else if (improvementFocus === 'ユーザービリティの向上') {
      improvementFocusLine += `【深掘りすべきデータと想定施策領域】
深掘りデータ:
・ページ別の活発さ率・滞在時間・直帰率（問題ページ特定）
・ページ分類別の弱いカテゴリ特定
・ページフロー（迷いや離脱の多い遷移）
・スクレイピングデータ（ALT属性、見出し構造、読込速度、レスポンシブ対応）

想定施策例（これ以外も有効と判断すれば提案可）:
・ナビゲーション: メニュー構成、パンくず、サイト内検索の使いやすさ
・表示速度: Core Web Vitals改善、画像最適化、不要スクリプト削除
・モバイルUI: タップ領域、フォント可読性、横スクロール、フォーム入力
・アクセシビリティ: ALT属性、コントラスト、キーボード操作、スクリーンリーダー
・情報設計: 見出し階層、テキストの読みやすさ、重要情報の視認性

各施策で「どのページの、どの指標を、どう改善するか」を具体的に。

`;
    } else if (improvementFocus === 'バランス（まんべんなく）') {
      improvementFocusLine += `【深掘りすべきデータと方針】
サイトの状態を多角的に診断し、集客・CV・ブランディング・UXのうち
最もインパクトが大きい領域を特定して、そこを軸にしつつ全方位で
バランスよく提案してください。どれか1つに偏る必要はありません。

`;
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

  // フォーカス別にデータブロックの順序と量を最適化
  const focus = improvementFocus || '';
  let primaryDataBlocks = '';
  let secondaryDataBlocks = '';
  let analysisViewpoints = '';

  if (focus === '集客力の向上') {
    // 集客: チャネル・KW・LP・参照元を先頭に、CV系・ページ詳細は補助
    primaryDataBlocks = `${recentSummaryText}
${channelsText}
${keywordsText}
${referralsText}
${landingPagesText}
${monthlyTrendText}`;
    secondaryDataBlocks = `${pagesText}
${demographicsText}
${dailyDataText}
${externalLinksText}
${aiComprehensiveAnalysisText}`;
    analysisViewpoints = `【分析の視点（集客重点）】
- チャネル別の流入数・成長率を比較し、弱いチャネルを特定
- 流入キーワードの順位・CTR・検索ボリュームの改善余地
- ランディングページ別の直帰率・CVR比較
- 参照元サイトの質と量の評価
- 前年同期比でのオーガニック流入の成長率`;
  } else if (focus === 'コンバージョン（成果）の向上') {
    // CV: コンバージョン・逆算フロー・ページフロー・フォームを先頭に
    primaryDataBlocks = `${recentSummaryText}
${monthlyConversionsText}
${reverseFlowText}
${pageFlowText}
${landingPagesText}
${pagesText}`;
    secondaryDataBlocks = `${channelsText}
${monthlyTrendText}
${dailyDataText}
${aiComprehensiveAnalysisText}`;
    analysisViewpoints = `【分析の視点（コンバージョン重点）】
- コンバージョン数・CVRの推移と、達成率の評価
- 逆算フロー: CVに至るユーザーの典型的なページ遷移パターン
- ページフロー: ユーザーが離脱しているボトルネックの特定
- フォームページへの到達率と、フォーム完了率の分析
- ランディングページ別のCVR比較と改善余地`;
  } else if (focus === 'ブランディングの向上') {
    // ブランディング: スクレイピング（ビジュアル）を先頭に、数値データは最小限
    primaryDataBlocks = `${recentSummaryText}
${aiComprehensiveAnalysisText}`;
    secondaryDataBlocks = `${pagesText}
${monthlyTrendText}`;
    analysisViewpoints = `【分析の視点（ブランディング重点）】
- サイト全体のビジュアル統一性（配色・フォント・余白・写真のトーン）
- ファーストビューが企業/サービスの価値を瞬時に伝えられているか
- 各ページのデザイン品質と統一感の評価
- ブランドメッセージの一貫性と訴求力
- 競合との差別化ポイントの有無`;
  } else if (focus === 'ユーザービリティの向上') {
    // UX: ページ別データ・ページフロー・表示速度を先頭に
    primaryDataBlocks = `${recentSummaryText}
${pagesText}
${pageCategoriesText}
${pageFlowText}
${landingPagesText}
${hourlyDataText}`;
    secondaryDataBlocks = `${channelsText}
${monthlyTrendText}
${dailyDataText}
${demographicsText}
${aiComprehensiveAnalysisText}`;
    analysisViewpoints = `【分析の視点（ユーザビリティ重点）】
- ページ別のエンゲージメント率・滞在時間・直帰率の比較
- ページ分類別の傾向と、弱いカテゴリの特定
- ページフロー: ユーザーが迷っている箇所・離脱の多い遷移
- 表示速度・Core Web Vitalsの問題ページ特定
- モバイル/デスクトップ別のUX差異`;
  } else {
    // バランス: 全データを均等に配置（従来通り）
    primaryDataBlocks = `${recentSummaryText}
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
${aiComprehensiveAnalysisText}`;
    secondaryDataBlocks = '';
    analysisViewpoints = `【分析の視点】
- 長期トレンド（過去13ヶ月）と直近30日の比較
- 季節性や前年同期との変化
- 曜日別・時間帯別のパターン分析
- ページ遷移フローと離脱ポイントの特定
- コンバージョン導線（逆算フロー）の効率性
- 最もビジネスインパクトが大きい課題の特定（チャネル、コンテンツ、CV導線など）`;
  }

  // ブランディング時はスクレイピングデータを先頭に、それ以外は従来通りTask2に配置
  const scrapingInTask1 = focus === 'ブランディングの向上' || focus === 'ユーザービリティの向上';
  const task1ScrapingBlock = scrapingInTask1 ? `\n${scrapingDataText}\n${sitemapText}${pageQualityText}` : '';
  const task2ScrapingBlock = scrapingInTask1 ? '' : `\n${scrapingDataText}\n${sitemapText}${pageQualityText}`;

  return `あなたは一流のWebコンサルタントです。
業界で15年以上、様々なサイトを診断・改善してきた経験を持ち、
クライアントの経営者に改善提案書を提出する場面を想定してください。
${siteContextBlock}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【タスク1】現状診断（分析サマリー）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
以下の実データを踏まえ、このサイトの現状を診断してください。
分析サマリーには「改善施策」や「アクション」を含めないこと（施策はタスク2）。

【重点データ】
${primaryDataBlocks}
${task1ScrapingBlock}
${secondaryDataBlocks ? `\n【補助データ】\n${secondaryDataBlocks}` : ''}

${analysisViewpoints}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【タスク2】改善施策の提案
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${conversionSettingsText}${task2ScrapingBlock}
${userNoteBlock}${improvementFocusLine}${existingImprovementsText}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【6つの原則】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. 固有名詞で語る
   本サイトの実URL・実文言（見出し・meta・CTAボタン文言・ファーストビュー等）を、
   提供データから引用して本文に織り込むこと。「/about ページの見出し
   『〇〇』を〇〇に変更」のように、Before/Afterを具体文言で記述する。

2. 数値で裏付ける
   現状数値（PV、CV、CVR、直帰率、読込速度、フォーム項目数等）は、
   提供データに明記されているものだけを引用する。データにない数値の
   推測・捏造は絶対禁止。データにない場合は定性的な表現に留める。

3. 件数は10件前後を目安に、本当に効くものだけ
   件数を埋めるために弱い提案を足すことはしない。データから読み
   取れる本当に有効な課題を抽出し、10件前後で構成する。6件しか
   有効な課題がなければ6件で構わないし、15件の価値ある提案が
   できるなら15件でも許容する。水増しも切り捨てもしない。

4. サイト種別と目的に整合
   すべての提案は「${siteContext?.siteTypeText || 'このサイト種別'}として
   ${siteContext?.sitePurposeText || 'このサイトの目的'}を実現する」という
   目的に資するか否かを基準に採否を判断する。本文中に「この種別・
   目的にとってなぜ有効か」の紐付け理由を1文以上含めること。

5. 業界ステークホルダーの具体像を本文に織り込む
   ${siteContext?.industryText || 'この業界'}・${siteContext?.siteTypeText || 'このサイト種別'}の現場で、
   このサイトを実際に見るのは誰か（法人の人事担当者／出張手配担当者／
   総務／地方赴任者／購買検討者／既存顧客 等）を本文に必ず登場させる。
   その人物が「何を確認したくて」「何に不安を感じていて」「何がわかれば
   次のアクションに進むか」を具体的に描写する。抽象的な「ユーザー」
   ではなく、「○○業の人事担当者」「地方赴任を控えた40代管理職」のように
   輪郭を与える。BtoBなら意思決定プロセス（比較→稟議→契約）にも触れる。

6. プレゼン調で、経営者にも伝わる言葉で、簡潔に
   - 専門用語は初出時のみ「お問い合わせ率（CVR）」のように括弧で補足
   - 「〜すべき」ではなく「〜しましょう」「〜が効きます」
   - マークダウン記号（**、#、-、*）は使わない
   - **説明文は 200〜350字 を目安に、冗長にしない**。長く書けばよいわけではない。
     必要十分な情報を簡潔にまとめる。Before/Afterや数値根拠は重要だが、
     1件の説明が400字を超えると読まれない。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【診断の優先順位（参考）】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. 高PV × 低CV のページ（最大の改善機会）
2. CV導線上の離脱ポイント
3. スクレイピングデータに「⚠️ 問題点」がついているページ
4. 流入・遷移のボトルネック
5. 業界標準との明確な差

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【判定値の定義】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
カテゴリー（正しく分類すること。"その他" に逃げない）:
  - acquisition: SEO・広告・SNS・外部流入・キーワード改善など「訪問者数を増やす」施策
  - content: 見出し/本文テキスト追加、記事企画、料金説明・サービス紹介文の拡充、FAQ充実、導入事例追加、メリット訴求強化など「読める情報を増やす／質を高める」施策
  - design: 配色・レイアウト・写真・ビジュアル・ブランド表現・余白・フォント・ファーストビューの見え方など「見た目・ブランド体験の改善」施策
  - feature: フォーム最適化・CTA改善・検索UI・絞込機能・シミュレーションツール・比較機能・マイページ・お気に入り等「機能や仕組みの追加／改善」施策
  - other: 読込速度・alt属性・h1/metaタグ・構造化データ・robots.txt・セキュリティなど「技術的/インフラ的な改善」施策のみ
  ※ 重要: 「料金体系の明確化」「サービス紹介の拡充」などは content。
        「シミュレーションツール設置」「CTA追加」などは feature。
        "その他(other)" は 純粋な技術改修（速度・alt・メタ・構造化データ等）のみに使う。
        提案10件あれば、other は最大3件まで。他は acquisition/content/design/feature で分散させる。

優先度（必ず分散させる。全部 high は禁止）:
  - high: インパクト大 × 緊急度高（CV に直結、売上影響が大きい、構造的欠陥）
  - medium: インパクト中（改善余地はあるが今すぐ致命的ではない）
  - low: インパクト小〜中期的な施策（中長期の底上げ）
  10件出すなら目安として high:4件 / medium:4件 / low:2件 程度に分散させる。
  全件 high は「全部が最重要=何も優先できない」と同義で、提案書として価値がない。

実装者: in_house（社内可）/ agency（制作会社推奨）/ either（どちらも可）
難易度: easy（1〜2時間）/ medium（1〜2日）/ hard（1週間以上）
費用感: free（社内のみ）/ low（〜10万円）/ medium（10〜50万円）/ high（50万円〜）

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【出力形式】以下の形式で厳密に出力してください
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

冒頭に「分析サマリー」として、このサイトの現状診断を
・（中黒）で始まる箇条書きで2〜4個、合計300〜400字で記述。
改善施策は含めず、事実の分析と課題特定のみ。

その後、以下のフォーマットで改善施策を列挙（施策間は「---」で区切る）:

タイトル: 具体的なタイトル。ページパス・URLを明記
説明: プレゼン調の自然な文章。現状の実文言・実数値を引用。なぜ・どうする・効果を明示。Before/Afterを具体文言で示す。${siteContext?.siteTypeText || 'この種別'}／${siteContext?.sitePurposeText || 'この目的'}にとってなぜ有効かを含める
重複判定用ラベル: この施策のテーマを1〜3語で（例: alt属性, h1タグ, 記事CTA）
カテゴリー: acquisition | content | design | feature | other
優先度: high | medium | low
期待効果: 定量的な数値（例: CVR 0.45%→0.8%へ、月間CV +25件）
実装者: in_house | agency | either
難易度: easy | medium | hard
費用感: free | low | medium | high
想定工数（時間）: 0.5〜100の数値
対象ページ: 特定ページ向けなら /パス or https://..., サイト共通なら「/」
対象箇所: ヘッダー・フッター等の場合に記述、特定ページなら空欄可

---

タイトル: （2件目）
（以下同じ項目を繰り返す）

---

（これを 10件前後 繰り返す。本当に効くものだけ）

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【チェックリスト】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
・タイトル／説明／期待効果にマークダウン記号（**、#、-、*）を使わない
・番号付きリスト（1. 2. 3.）を使わない
・「スクレイピングデータ」という言葉は本文に出さない
・データにない数値を書かない
・サイト種別・目的と整合しない施策を出さない
・専門用語は初出時のみ括弧で補足（例: お問い合わせ率（CVR））
・各施策で「なぜ・どうする・効果」を必ず含める
`;
}


// ==================== 改善効果AI評価プロンプト ====================

/**
 * 改善効果のBefore/After比較に基づくAI評価プロンプト
 * @param {object} params
 * @param {string} params.title - 改善タスクのタイトル
 * @param {string} params.description - 改善タスクの説明
 * @param {string} params.expectedImpact - 期待効果
 * @param {string} params.category - カテゴリ (acquisition, content, design, feature, other)
 * @param {string|null} params.targetPageUrl - 対象ページURL
 * @param {object} params.before - Before指標スナップショット
 * @param {object} params.after - After指標スナップショット
 * @param {object} params.changes - 変化率
 * @param {number} params.overallScore - 総合スコア (-100〜+100)
 * @param {boolean} params.hasConcurrentTasks - 同一ページ・同時期に他タスクあり
 * @returns {string}
 */
export function getEffectEvaluationPrompt(params) {
  const {
    title, description, expectedImpact, category,
    targetPageUrl, before, after, changes, overallScore,
    hasConcurrentTasks = false,
  } = params;

  const categoryLabel = {
    acquisition: '集客',
    content: 'コンテンツ',
    design: 'デザイン・UI',
    feature: '機能',
    other: 'その他',
  }[category] || 'その他';

  // Before/After指標テキスト構築
  const metricsText = buildMetricsComparisonText(before, after, changes);

  // KPI情報
  let kpiText = '';
  if (after.kpiMetrics?.length > 0) {
    kpiText = '\n\n【KPI指標】\n';
    after.kpiMetrics.forEach(kpi => {
      const beforeKpi = before.kpiMetrics?.find(k => k.id === kpi.id);
      kpiText += `- ${kpi.label}: Before=${beforeKpi?.actual ?? '—'} → After=${kpi.actual ?? '—'} (目標: ${kpi.target ?? '—'})\n`;
    });
  }

  // 同時期の他タスク注記
  const concurrentNote = hasConcurrentTasks
    ? '\n\n【注意】この改善タスクと同じページ・同時期に他の改善タスクも完了しています。そのため、数値の変化はこのタスク単独の効果ではなく、複数の改善の複合的な結果である可能性があります。この点を考慮して評価してください。'
    : '';

  // ページ未指定の注記
  const noPageNote = !targetPageUrl
    ? '\n\n【注意】この改善タスクには対象ページの指定がないため、サイト全体の指標で評価しています。季節変動や他の施策の影響も含まれる可能性があります。'
    : '';

  return `あなたはWebサイト改善の効果を評価する専門アナリストです。
以下の改善タスクのBefore/After指標を分析し、改善効果を評価してください。

【改善タスク情報】
- タイトル: ${title}
- 説明: ${description || 'なし'}
- カテゴリ: ${categoryLabel}
- 期待効果: ${expectedImpact || '記載なし'}
- 対象ページ: ${targetPageUrl || 'サイト全体'}
- 総合スコア: ${overallScore > 0 ? '+' : ''}${overallScore.toFixed(1)}

【Before/After指標比較】
Before期間: ${before.period || '不明'}
After期間: ${after.period || '不明'}

${metricsText}${kpiText}${concurrentNote}${noPageNote}

【出力形式】以下のJSON形式で出力してください。JSON以外のテキストは含めないでください。
\`\`\`json
{
  "achievementLevel": "exceeded または met または partial または not_met",
  "summary": "改善効果の要約（2〜3文、150〜200文字）。期待効果に対する達成度、主要指標の変化、全体的な評価を述べる。",
  "analysis": "詳細考察（3〜5個の箇条書き、各1〜2文）。指標の変化の原因分析、改善が効いたポイント、想定外の変化など。",
  "nextActions": ["次に取るべきアクション1", "次に取るべきアクション2", "次に取るべきアクション3"]
}
\`\`\`

【achievementLevelの判定基準】
- exceeded: 期待効果を大きく上回る成果（主要指標が20%以上改善、または総合スコア+30以上）
- met: 期待効果をおおむね達成（主要指標が改善傾向、総合スコア+10〜+30）
- partial: 一部改善が見られるが期待効果には未達（一部指標のみ改善、総合スコア-5〜+10）
- not_met: 改善効果が見られない、または悪化（主要指標が悪化、総合スコア-5未満）

【文章表現のルール】
- 専門用語を使う場合は必ず括弧で補足（例: 「訪問数（セッション）」）
- 数値は具体的に記載（例: 「訪問数が1,200→1,500に25%増加」）
- 「分析」は箇条書き（「・」で始める）で3〜5項目
- 「次のアクション」は具体的かつ実行可能な提案を2〜4個
- マークダウン記号（**、#）は使用禁止
- ポジティブな変化とネガティブな変化の両方をバランスよく言及`;
}

/**
 * Before/After指標の比較テキストを構築
 */
function buildMetricsComparisonText(before, after, changes) {
  const lines = [];

  const addLine = (label, bVal, aVal, changeVal, format = 'num') => {
    if (bVal == null && aVal == null) return;
    const fmt = (v) => {
      if (v == null) return '—';
      if (format === 'pct') return `${(v * 100).toFixed(1)}%`;
      if (format === 'sec') return `${Math.round(v)}秒`;
      if (format === 'pos') return v.toFixed(1);
      return v.toLocaleString();
    };
    const changeStr = changeVal != null ? ` (${changeVal > 0 ? '+' : ''}${changeVal.toFixed(1)}%)` : '';
    lines.push(`- ${label}: ${fmt(bVal)} → ${fmt(aVal)}${changeStr}`);
  };

  addLine('訪問数', before.sessions, after.sessions, changes.sessions);
  addLine('ユーザー数', before.totalUsers, after.totalUsers, changes.totalUsers);
  addLine('新規ユーザー', before.newUsers, after.newUsers, changes.newUsers);
  addLine('ページビュー', before.pageViews, after.pageViews, changes.pageViews);
  addLine('エンゲージメント率', before.engagementRate, after.engagementRate, changes.engagementRate, 'pct');
  addLine('直帰率', before.bounceRate, after.bounceRate, changes.bounceRate, 'pct');
  addLine('平均セッション時間', before.avgSessionDuration, after.avgSessionDuration, changes.avgSessionDuration, 'sec');
  addLine('コンバージョン数', before.conversions, after.conversions, changes.conversions);
  addLine('コンバージョン率', before.conversionRate, after.conversionRate, changes.conversionRate, 'pct');

  // GSC
  if (before.impressions != null || after.impressions != null) {
    addLine('検索表示回数', before.impressions, after.impressions, changes.impressions);
    addLine('検索クリック数', before.clicks, after.clicks, changes.clicks);
    addLine('検索CTR', before.ctr, after.ctr, changes.ctr, 'pct');
    addLine('平均掲載順位', before.avgPosition, after.avgPosition, changes.avgPosition, 'pos');
  }

  return lines.join('\n');
}

// ==================== AIチャット用システムプロンプト ====================

/**
 * AIチャット用のシステムプロンプトを生成
 * サイトの全データをコンテキストとして含む
 */
export function getChatSystemPrompt(metrics, siteData) {
  const siteName = siteData?.siteName || '（サイト名不明）';
  const siteUrl = siteData?.siteUrl || '';
  const industry = siteData?.industry ? (Array.isArray(siteData.industry) ? siteData.industry.join('、') : siteData.industry) : '未設定';

  // fetchComprehensiveDataForImprovement の戻り値に合わせてデータアクセス
  const summaryData = metrics.summary?.metrics || {};
  const totalCV = summaryData.totalConversions || 0;
  const cvDetail = summaryData.conversions && typeof summaryData.conversions === 'object'
    ? Object.entries(summaryData.conversions).map(([k, v]) => `${k}: ${v}件`).join(', ')
    : '';
  const recentSummaryText = summaryData.sessions != null ? `
【直近30日のサマリー】
- ユーザー数: ${summaryData.totalUsers?.toLocaleString() || 0}人
- 訪問数: ${summaryData.sessions?.toLocaleString() || 0}回
- ページビュー数: ${(summaryData.screenPageViews || summaryData.pageViews || 0).toLocaleString()}回
- エンゲージメント率: ${((summaryData.engagementRate || 0) * 100).toFixed(1)}%
- コンバージョン数: ${totalCV}件${cvDetail ? `（${cvDetail}）` : ''}` : '';

  let channelsText = '';
  if (metrics.channels?.length > 0) {
    channelsText = '\n\n【集客チャネル（直近30日）】\n';
    metrics.channels.slice(0, 10).forEach(ch => {
      channelsText += `- ${ch.channel}: 訪問${ch.sessions?.toLocaleString() || 0}回, ユーザー${(ch.users || ch.totalUsers || 0).toLocaleString()}人, CV${ch.conversions?.toLocaleString() || 0}件\n`;
    });
  }

  let keywordsText = '';
  if (metrics.keywords?.length > 0) {
    keywordsText = '\n\n【流入キーワード（GSC、直近30日、トップ15）】\n';
    metrics.keywords.slice(0, 15).forEach(kw => {
      keywordsText += `- "${kw.query || kw.keys?.[0] || ''}": クリック${kw.clicks?.toLocaleString() || 0}回, 表示${kw.impressions?.toLocaleString() || 0}回, CTR${((kw.ctr || 0) * 100).toFixed(1)}%, 順位${(kw.position || 0).toFixed(1)}\n`;
    });
  }

  let pagesText = '';
  const scrollEventsMap = metrics.scrollEvents || {};
  const hasAnyScrollEvents = Object.keys(scrollEventsMap).length > 0;
  if (metrics.pages?.length > 0) {
    pagesText = '\n\n【ページ別データ（直近30日、トップ15）】\n';
    metrics.pages.slice(0, 15).forEach(p => {
      const pagePath = p.path || p.page || p.pagePath || '不明';
      const pageTitle = p.title || '';
      const pv = p.pageViews || p.screenPageViews || 0;
      const avgDur = p.averageSessionDuration || 0;
      const engR = p.engagementRate || 0;
      const bR = p.bounceRate || 0;
      const engScore = engR * 100;
      const durationScore = Math.min(avgDur / 180, 1) * 100;
      const nonBounceScore = (1 - bR) * 100;
      let scrollText = '';
      let interestScore;
      if (hasAnyScrollEvents) {
        const scrollCount = scrollEventsMap[pagePath] || 0;
        const scrollRate = pv > 0 ? Math.min(scrollCount / pv, 1) : 0;
        scrollText = `, 完読率${(scrollRate * 100).toFixed(1)}%`;
        interestScore = (engScore * 0.25 + scrollRate * 100 * 0.25 + durationScore * 0.25 + nonBounceScore * 0.25).toFixed(1);
      } else {
        interestScore = (engScore / 3 + durationScore / 3 + nonBounceScore / 3).toFixed(1);
      }
      pagesText += `- ${pagePath}${pageTitle ? `（${pageTitle}）` : ''}: PV${pv.toLocaleString()}, ユーザー${(p.users || p.totalUsers || 0).toLocaleString()}, CV${(p.conversions || 0).toLocaleString()}${scrollText}, 興味スコア${interestScore}\n`;
    });
  }

  let landingPagesText = '';
  if (metrics.landingPages?.length > 0) {
    landingPagesText = '\n\n【ランディングページ（トップ10）】\n';
    metrics.landingPages.slice(0, 10).forEach(p => {
      const lpPath = p.page || p.path || '不明';
      landingPagesText += `- ${lpPath}: 訪問${p.sessions?.toLocaleString() || 0}回, ENG率${((p.engagementRate || 0) * 100).toFixed(1)}%, CV${(p.conversions || 0).toLocaleString()}件\n`;
    });
  }

  // monthlyConversions: { rows: [ { dimensionValues: [yearMonth, eventName], metricValues: [eventCount] } ] }
  let conversionsText = '';
  const cvRows = metrics.monthlyConversions?.rows;
  if (cvRows?.length > 0) {
    // yearMonth別に集計
    const byMonth = {};
    cvRows.forEach(r => {
      const ym = r.dimensionValues?.[0]?.value || '不明';
      const count = parseInt(r.metricValues?.[0]?.value || '0');
      byMonth[ym] = (byMonth[ym] || 0) + count;
    });
    const sorted = Object.entries(byMonth).sort((a, b) => a[0].localeCompare(b[0]));
    if (sorted.length > 0) {
      conversionsText = '\n\n【月別コンバージョン推移】\n';
      sorted.forEach(([ym, count]) => {
        const y = ym.substring(0, 4);
        const m = ym.substring(4, 6);
        conversionsText += `- ${y}年${parseInt(m)}月: CV${count.toLocaleString()}件\n`;
      });
    }
  }

  // reverseFlow: [ { flowName, rows: [ { dimensionValues: [pagePath], metricValues: [screenPageViews, totalUsers] } ] } ]
  let reverseFlowText = '';
  if (Array.isArray(metrics.reverseFlow) && metrics.reverseFlow.length > 0) {
    reverseFlowText = '\n\n【逆算フロー（CV直前のページ遷移）】\n';
    metrics.reverseFlow.forEach(flow => {
      const flowName = flow.flowName || '不明';
      reverseFlowText += `\nCV地点: ${flowName}\n`;
      (flow.rows || []).slice(0, 5).forEach(r => {
        const page = r.dimensionValues?.[0]?.value || '不明';
        const pv = parseInt(r.metricValues?.[0]?.value || '0');
        reverseFlowText += `  - ${page}: ${pv.toLocaleString()}PV\n`;
      });
    });
  }

  // monthlyTrend: { rows: [ { dimensionValues: [yearMonth], metricValues: [sessions, totalUsers, screenPageViews, engagementRate] } ] }
  let monthlyTrendText = '';
  const trendRows = metrics.monthlyTrend?.rows;
  if (trendRows?.length > 0) {
    monthlyTrendText = '\n\n【月別トレンド（過去13ヶ月）】\n';
    trendRows.forEach(r => {
      const ym = r.dimensionValues?.[0]?.value || '不明';
      const sessions = parseInt(r.metricValues?.[0]?.value || '0');
      const users = parseInt(r.metricValues?.[1]?.value || '0');
      const pv = parseInt(r.metricValues?.[2]?.value || '0');
      const eng = parseFloat(r.metricValues?.[3]?.value || '0');
      const y = ym.substring(0, 4);
      const m = ym.substring(4, 6);
      monthlyTrendText += `- ${y}年${parseInt(m)}月: ユーザー${users.toLocaleString()}, 訪問${sessions.toLocaleString()}, PV${pv.toLocaleString()}, ENG率${(eng * 100).toFixed(1)}%\n`;
    });
  }

  // pageFlow: [ { pagePath, nextPages: [ { path, pageViews }, ... ] } ]
  let pageFlowText = '';
  if (Array.isArray(metrics.pageFlow) && metrics.pageFlow.length > 0) {
    pageFlowText = '\n\n【ページフロー（主要な遷移パターン）】\n';
    metrics.pageFlow.slice(0, 5).forEach(flow => {
      pageFlowText += `\n${flow.pagePath} からの遷移先:\n`;
      (flow.nextPages || []).slice(0, 5).forEach(next => {
        pageFlowText += `  → ${next.path}: ${(next.pageViews || 0).toLocaleString()}PV\n`;
      });
    });
  }

  let scrapingText = '';
  if (metrics.scrapingData?.pages?.length > 0) {
    scrapingText = '\n\n【サイト構造データ（スクレイピング、上位20ページ）】\n';
    metrics.scrapingData.pages.slice(0, 20).forEach((p, i) => {
      scrapingText += `\n[${i + 1}] ${p.pagePath}\n`;
      scrapingText += `  タイトル: ${p.metaTitle || '未設定'}\n`;
      scrapingText += `  PV: ${p.pageViews?.toLocaleString() || 0}, 見出し: h1=${p.headingStructure?.h1 || 0}/h2=${p.headingStructure?.h2 || 0}\n`;
      scrapingText += `  画像: alt有=${p.imagesWithAlt || 0}/alt無=${p.imagesWithoutAlt || 0}, 読込: ${p.loadTime || 0}ms\n`;
      if (p.ctaButtons?.length > 0) {
        scrapingText += `  CTA: ${p.ctaButtons.slice(0, 3).map(c => `「${c.text}」`).join(', ')}\n`;
      }
      const issues = [];
      if (p.headingStructure?.h1 === 0) issues.push('h1なし');
      if (p.headingStructure?.h1 > 1) issues.push('h1複数');
      if (!p.metaDescription) issues.push('description未設定');
      if (p.loadTime > 3000) issues.push('読込遅い');
      if (p.imagesWithoutAlt > p.imagesWithAlt) issues.push('alt不足');
      if (issues.length > 0) scrapingText += `  問題: ${issues.join(', ')}\n`;
    });
  }

  // 前年同月データの構築
  const prevYear = metrics.prevYear;
  let prevYearText = '';
  if (prevYear) {
    const prevPeriod = prevYear.period ? `${prevYear.period.startDate} 〜 ${prevYear.period.endDate}` : '前年同月';

    if (prevYear.channels?.length > 0) {
      prevYearText += `\n\n【前年同月の集客チャネル（${prevPeriod}）】\n`;
      prevYear.channels.slice(0, 10).forEach(ch => {
        prevYearText += `- ${ch.channel}: 訪問${ch.sessions?.toLocaleString() || 0}回, ユーザー${ch.users?.toLocaleString() || 0}人, CV${ch.conversions?.toLocaleString() || 0}件\n`;
      });
    }

    if (prevYear.keywords?.length > 0) {
      prevYearText += `\n\n【前年同月の流入キーワード（${prevPeriod}、トップ15）】\n`;
      prevYear.keywords.slice(0, 15).forEach(kw => {
        prevYearText += `- "${kw.query || ''}": クリック${kw.clicks?.toLocaleString() || 0}回, 表示${kw.impressions?.toLocaleString() || 0}回, CTR${((kw.ctr || 0) * 100).toFixed(1)}%, 順位${(kw.position || 0).toFixed(1)}\n`;
      });
    }

    if (prevYear.pages?.length > 0) {
      prevYearText += `\n\n【前年同月のページ別データ（${prevPeriod}、トップ15）】\n`;
      prevYear.pages.slice(0, 15).forEach(p => {
        prevYearText += `- ${p.path || p.page || ''}${p.title ? `（${p.title}）` : ''}: PV${p.pageViews?.toLocaleString() || 0}, ユーザー${p.users?.toLocaleString() || 0}, CV${p.conversions?.toLocaleString() || 0}\n`;
      });
    }

    if (prevYear.landingPages?.length > 0) {
      prevYearText += `\n\n【前年同月のランディングページ（${prevPeriod}、トップ10）】\n`;
      prevYear.landingPages.slice(0, 10).forEach(p => {
        prevYearText += `- ${p.page}: 訪問${p.sessions?.toLocaleString() || 0}回, ENG率${((p.engagementRate || 0) * 100).toFixed(1)}%, CV${p.conversions?.toLocaleString() || 0}件\n`;
      });
    }
  }

  return `あなたは「${siteName}」（${siteUrl}）のWebアナリスト兼改善コンサルタントです。
業種: ${industry}

以下はこのサイトの最新のアクセス解析データです。ユーザーからの質問にこのデータに基づいて回答してください。

━━ 直近30日のデータ ━━
${recentSummaryText}${channelsText}${keywordsText}${pagesText}${landingPagesText}${conversionsText}${reverseFlowText}${monthlyTrendText}${pageFlowText}${scrapingText}
${prevYearText ? `\n━━ 前年同月のデータ（比較用） ━━${prevYearText}` : ''}

【回答ルール】
- データに基づいて回答し、具体的な数値を根拠として示す
- 専門用語は避け、括弧で補足する（例: 「訪問数（セッション）」）
- 必ずマークダウン形式で回答する（見出し、リスト、太字、テーブル等を活用）
- 【最重要】数値の比較・一覧・ランキング・期間比較・チャネル別データ等は、必ず以下のようなマークダウンテーブル構文で出力すること:

| 指標 | 2025年3月 | 2026年3月 | 増減率 |
| :--- | ---: | ---: | ---: |
| ユーザー数 | 3,012人 | 4,812人 | +59.8% |
| 訪問数 | 4,149回 | 6,373回 | +53.6% |

- テーブルのヘッダー行の後に必ず区切り行（| :--- | ---: |）を入れること。これがないとテーブルとして認識されない
- スペースで揃えたり、インデントで表を作るのは禁止。必ず | で区切ること
- 箇条書きで数値を並べるよりテーブルの方が見やすい場合は常にテーブルを使う
- グラフが有効な場合は :::chart ブロックでRechartsデータをJSON形式で出力する
  形式: :::chart\n{"type":"line|bar|pie","data":[...],"xKey":"name","yKeys":["value"],"title":"グラフタイトル"}\n:::
- 改善を提案する場合は :::improvement ブロックで出力する
  形式: :::improvement\n{"title":"提案タイトル","description":"説明","category":"acquisition|content|design|feature|other","priority":"high|medium|low","expectedImpact":"期待効果","targetPageUrl":"/path"}\n:::
- ページURLやパス（例: /contact/）に言及する場合は、必ずマークダウンリンクで出力すること
  - サイトの実際のページ: [/contact/](${siteUrl}/contact/) ← 別タブで開けるリンク
  - 例: 「[トップページ](${siteUrl}/)のPVは1,432回です」
  - パスだけをテキストで書くのは禁止。必ずリンク化すること
- 一般的なWebマーケティングの質問にも回答可能（データがない場合はその旨を伝える）
- 回答の長さに制限はなし。質問に応じて適切な分量で回答する`;
}
