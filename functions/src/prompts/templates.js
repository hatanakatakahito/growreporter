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
  // 前月比データの取得
  let changeText = '';
  if (metrics.monthOverMonth) {
    const mom = metrics.monthOverMonth;
    if (mom.sessions) {
      const sign = mom.sessions.change >= 0 ? '増加' : '減少';
      changeText += `\n- 訪問者: 前月比${mom.sessions.change >= 0 ? '+' : ''}${mom.sessions.change.toFixed(1)}%（${sign}）`;
    }
    if (mom.conversions) {
      const sign = mom.conversions.change >= 0 ? '増加' : '減少';
      changeText += `\n- 成果: 前月比${mom.conversions.change >= 0 ? '+' : ''}${mom.conversions.change.toFixed(1)}%（${sign}）`;
    }
  }

  return `
あなたはWebサイト分析の専門家です。${period}のデータを分析し、初心者にも分かりやすく説明してください。

【データ】
- 訪問者数: ${metrics.sessions?.toLocaleString() || 0}回
- 成果（お問い合わせなど）: ${metrics.conversions?.toLocaleString() || 0}件${changeText}

【出力ルール】
- 150-200文字程度の自然な文章（段落形式）
- 前置きや挨拶は一切不要、分析内容から直接始める
- 専門用語は使用可（ただし必ず補足を付ける）例: CVR（成果率）、直帰率（すぐ離脱する割合）
- 数値は実数値またはパーセンテージのみ（「ポイント」表記は禁止）
- 改善提案は含めず、最後に「詳しい改善提案は下の『AI改善提案を生成』をご利用ください」で締める

【禁止】
- 「承知しました」「分析します」などの前置き
- 箇条書き記号（•、-、1.など）
- 「ポイント」という単位
- 具体的な改善提案

【記述例】
${period}は訪問者が前月比15%増加し、良い傾向です。ただしCVR（成果率）は2.8%から2.3%に低下しており、訪問者は増えても成果につながっていません。詳しい改善提案は下の「AI改善提案を生成」をご利用ください。
`;
}

/**
 * 日別分析用プロンプト
 */
function getDayPrompt(period, metrics) {
  const hasConversions = metrics.hasConversionDefinitions === true;
  
  // 最大・最小の日を簡易計算
  let maxDay = '', minDay = '';
  if (metrics.dailyData && Array.isArray(metrics.dailyData) && metrics.dailyData.length > 0) {
    const sorted = [...metrics.dailyData].sort((a, b) => (b.sessions || 0) - (a.sessions || 0));
    if (sorted.length > 0) {
      maxDay = sorted[0].date;
      minDay = sorted[sorted.length - 1].date;
    }
  }

  const conversionNote = hasConversions ? `\n- 成果: ${metrics.conversions?.toLocaleString() || 0}件` : '';

  return `
あなたはWebサイト分析の専門家です。${period}の日別データを分析し、初心者にも分かりやすく説明してください。

【データ】
- 訪問者数: ${metrics.sessions?.toLocaleString() || 0}回${conversionNote}
- 最も多い日: ${maxDay}
- 最も少ない日: ${minDay}

【出力ルール】
- 150-200文字程度の自然な文章（段落形式）
- 前置きや挨拶は一切不要、分析内容から直接始める
- 専門用語は使用可（ただし必ず補足を付ける）
- 数値は実数値またはパーセンテージのみ（「ポイント」表記は禁止）
- 改善提案は含めず、最後に「詳しい改善提案は『AI改善提案を生成』をご利用ください」で締める

【禁止】
- 「承知しました」「分析します」などの前置き
- 箇条書き記号（•、-、1.など）
- 「ポイント」という単位
- 具体的な改善提案

【記述例】
${period}は週末に訪問者が集中し、特に土曜日が最も多くなっています。平日は訪問者が少なく、特に月曜日が最少です。週末と平日で約2倍の差があります。詳しい改善提案は下の「AI改善提案を生成」をご利用ください。
`;
}

/**
 * 曜日別分析用プロンプト
 */
function getWeekPrompt(period, metrics) {
  const hasConversions = metrics.conversionEventNames && metrics.conversionEventNames.length > 0;
  const conversionNote = hasConversions ? `\n- 成果: ${metrics.conversions?.toLocaleString() || 0}件` : '';

  return `
あなたはWebサイト分析の専門家です。${period}の曜日別データを分析し、初心者にも分かりやすく説明してください。

【データ】
- 訪問者数: ${metrics.sessions?.toLocaleString() || 0}回${conversionNote}

【出力ルール】
- 150-200文字程度の自然な文章（段落形式）
- 前置きや挨拶は一切不要、分析内容から直接始める
- 専門用語は使用可（ただし必ず補足を付ける）
- 数値は実数値またはパーセンテージのみ（「ポイント」表記は禁止）
- 改善提案は含めず、最後に「詳しい改善提案は『AI改善提案を生成』をご利用ください」で締める

【禁止】
- 「承知しました」「分析します」などの前置き
- 箇条書き記号（•、-、1.など）
- 「ポイント」という単位
- 具体的な改善提案

【記述例】
${period}は土日に訪問者が集中し、平日は少ない傾向です。特に月曜日が最も少なく、土曜日と比較して約40%少なくなっています。詳しい改善提案は下の「AI改善提案を生成」をご利用ください。
`;
}

/**
 * 時間帯別分析用プロンプト
 */
function getHourPrompt(period, metrics) {
  const hasConversions = metrics.conversionEventNames && metrics.conversionEventNames.length > 0;
  const conversionNote = hasConversions ? `\n- 成果: ${metrics.conversions?.toLocaleString() || 0}件` : '';

  return `
あなたはWebサイト分析の専門家です。${period}の時間帯別データを分析し、初心者にも分かりやすく説明してください。

【データ】
- 訪問者数: ${metrics.sessions?.toLocaleString() || 0}回${conversionNote}

【出力ルール】
- 150-200文字程度の自然な文章（段落形式）
- 前置きや挨拶は一切不要、分析内容から直接始める
- 専門用語は使用可（ただし必ず補足を付ける）
- 数値は実数値またはパーセンテージのみ（「ポイント」表記は禁止）
- 改善提案は含めず、最後に「詳しい改善提案は『AI改善提案を生成』をご利用ください」で締める

【禁止】
- 「承知しました」「分析します」などの前置き
- 箇条書き記号（•、-、1.など）
- 「ポイント」という単位
- 具体的な改善提案

【記述例】
${period}は昼間（12-14時）に訪問者が集中し、夜間は少ない傾向です。朝の通勤時間帯も比較的多く、深夜と比較して約3倍の差があります。詳しい改善提案は下の「AI改善提案を生成」をご利用ください。
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
      monthOverMonthText += `\n- 訪問者数: ${mom.sessions.current?.toLocaleString() || 0}回 (前月${mom.sessions.previous?.toLocaleString() || 0}回, ${sign}${mom.sessions.change.toFixed(1)}%)`;
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
あなたはWebサイト分析の専門家です。${period}のダッシュボードデータを分析し、初心者にも分かりやすく説明してください。

【データ】
- 訪問者数: ${metrics.sessions?.toLocaleString() || 0}回
- 成果（お問い合わせなど）: ${metrics.conversions?.toLocaleString() || 0}件${monthOverMonthText}${conversionText}${kpiText}

【出力ルール】
- 150-200文字程度の自然な文章（段落形式）
- 前置きや挨拶は一切不要、分析内容から直接始める
- 専門用語は使用可（ただし必ず補足を付ける）例: CVR（成果率）、エンゲージメント率（訪問者の関与度）
- 数値は実数値またはパーセンテージのみ（「ポイント」表記は禁止）
- 改善提案は含めず、最後に「詳しい改善提案は『AI改善提案を生成』をご利用ください」で締める

【禁止】
- 「承知しました」「分析します」などの前置き
- 箇条書き記号（•、-、1.など）
- 「ポイント」という単位
- 具体的な改善提案

【記述例】
${period}は訪問者が前月比15%増加し、良い傾向です。ただしCVR（成果率）は2.8%から2.3%に低下しており、訪問者は増えても成果につながっていません。エンゲージメント率（訪問者の関与度）も前月比5%低下しています。詳しい改善提案は下の「AI改善提案を生成」をご利用ください。
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
あなたはWebサイト分析の専門家です。${period}のユーザー属性データを分析し、初心者にも分かりやすく説明してください。

【データ】${demographicsText}${dataLimitationNote}

【出力ルール】
- 150-200文字程度の自然な文章（段落形式）
- 前置きや挨拶は一切不要、分析内容から直接始める
- 専門用語は使用可（ただし必ず補足を付ける）
- 数値は実数値またはパーセンテージのみ（「ポイント」表記は禁止）
- 改善提案は含めず、最後に「詳しい改善提案は『AI改善提案を生成』をご利用ください」で締める

【禁止】
- 「承知しました」「分析します」などの前置き
- 箇条書き記号（•、-、1.など）
- 「ポイント」という単位
- 具体的な改善提案

【記述例】
${period}はスマホからの訪問者が全体の80%を占めています。地域別では東京・大阪などの都市部からのアクセスが多く、全体の65%を占めています。新規訪問者とリピーターの比率は6:4です。詳しい改善提案は下の「AI改善提案を生成」をご利用ください。
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
• 直近30日の訪問は10,471回（前月比-4.7%）で減少傾向、一方CV率は+0.25pt改善。
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
• 直近30日の訪問は10,471回（前月比-4.7%）で減少傾向、一方CV数は125件（前月比+21.4%）で増加。
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
  const conversionNote = hasConversions ? `\n- 成果: ${metrics.totalConversions?.toLocaleString() || 0}件` : '';

  return `
あなたはWebサイト分析の専門家です。${period}の流入経路データを分析し、初心者にも分かりやすく説明してください。

【データ】
- 訪問者数: ${metrics.totalSessions?.toLocaleString() || 0}回${conversionNote}

【出力ルール】
- 150-200文字程度の自然な文章（段落形式）
- 前置きや挨拶は一切不要、分析内容から直接始める
- 専門用語は使用可（ただし必ず補足を付ける）例: オーガニック検索（自然検索）、リファラル（他サイトからのリンク）
- 数値は実数値またはパーセンテージのみ（「ポイント」表記は禁止）
- 改善提案は含めず、最後に「詳しい改善提案は『AI改善提案を生成』をご利用ください」で締める

【禁止】
- 「承知しました」「分析します」などの前置き
- 箇条書き記号（•、-、1.など）
- 「ポイント」という単位
- 具体的な改善提案

【記述例】
${period}はオーガニック検索（自然検索）からの訪問が全体の60%を占め、最も多い流入経路です。SNSからの訪問は10%程度で、リファラル（他サイトからのリンク）は15%です。詳しい改善提案は下の「AI改善提案を生成」をご利用ください。
`;
}

/**
 * 参照元/メディア分析用プロンプト
 */
function getReferralsPrompt(period, metrics) {
  const hasConversions = metrics.conversionEventNames && metrics.conversionEventNames.length > 0;
  const conversionNote = hasConversions ? `\n- 成果: ${metrics.totalConversions?.toLocaleString() || 0}件` : '';

  return `
あなたはWebサイト分析の専門家です。${period}の参照元データを分析し、初心者にも分かりやすく説明してください。

【データ】
- 訪問者数: ${metrics.totalSessions?.toLocaleString() || 0}回${conversionNote}

【出力ルール】
- 150-200文字程度の自然な文章（段落形式）
- 前置きや挨拶は一切不要、分析内容から直接始める
- 専門用語は使用可（ただし必ず補足を付ける）
- 数値は実数値またはパーセンテージのみ（「ポイント」表記は禁止）
- 改善提案は含めず、最後に「詳しい改善提案は『AI改善提案を生成』をご利用ください」で締める

【禁止】
- 「承知しました」「分析します」などの前置き
- 箇条書き記号（•、-、1.など）
- 「ポイント」という単位
- 具体的な改善提案

【記述例】
${period}はGoogleからの訪問が全体の55%を占め、最も多い参照元です。Yahoo!からの訪問は8%、SNSからは12%です。直接訪問（ブックマークなど）は20%を占めています。詳しい改善提案は下の「AI改善提案を生成」をご利用ください。
`;
}

/**
 * ランディングページ分析用プロンプト
 */
function getLandingPagesPrompt(period, metrics) {
  const hasConversions = metrics.conversionEventNames && metrics.conversionEventNames.length > 0;
  const conversionNote = hasConversions ? `\n- 成果: ${metrics.totalConversions?.toLocaleString() || 0}件` : '';

  return `
あなたはWebサイト分析の専門家です。${period}のランディングページ（最初に見られたページ）データを分析し、初心者にも分かりやすく説明してください。

【データ】
- 訪問者数: ${metrics.totalSessions?.toLocaleString() || 0}回${conversionNote}

【出力ルール】
- 150-200文字程度の自然な文章（段落形式）
- 前置きや挨拶は一切不要、分析内容から直接始める
- 専門用語は使用可（ただし必ず補足を付ける）例: ランディングページ（最初に見られるページ）
- 数値は実数値またはパーセンテージのみ（「ポイント」表記は禁止）
- 改善提案は含めず、最後に「詳しい改善提案は『AI改善提案を生成』をご利用ください」で締める

【禁止】
- 「承知しました」「分析します」などの前置き
- 箇条書き記号（•、-、1.など）
- 「ポイント」という単位
- 具体的な改善提案

【記述例】
${period}はトップページから入ってくる訪問者が全体の45%を占め、最も多いランディングページ（最初に見られるページ）です。商品ページから直接入ってくる訪問者も30%あり、検索からの流入が多いことがわかります。詳しい改善提案は下の「AI改善提案を生成」をご利用ください。
`;
}

/**
 * ページ別分析用プロンプト
 */
function getPagesPrompt(period, metrics) {
  const hasConversions = metrics.conversionEventNames && metrics.conversionEventNames.length > 0;
  const conversionNote = hasConversions ? `\n- 成果: ${metrics.totalConversions?.toLocaleString() || 0}件` : '';

  return `
あなたはWebサイト分析の専門家です。${period}のページ別データを分析し、初心者にも分かりやすく説明してください。

【データ】
- ページ閲覧数: ${metrics.totalPageViews?.toLocaleString() || 0}回${conversionNote}

【出力ルール】
- 150-200文字程度の自然な文章（段落形式）
- 前置きや挨拶は一切不要、分析内容から直接始める
- 専門用語は使用可（ただし必ず補足を付ける）例: PV（ページビュー、閲覧数）
- 数値は実数値またはパーセンテージのみ（「ポイント」表記は禁止）
- 改善提案は含めず、最後に「詳しい改善提案は『AI改善提案を生成』をご利用ください」で締める

【禁止】
- 「承知しました」「分析します」などの前置き
- 箇条書き記号（•、-、1.など）
- 「ポイント」という単位
- 具体的な改善提案

【記述例】
${period}はトップページが最もよく見られており、全体のPV（ページビュー、閲覧数）の35%を占めています。商品ページも25%を占めていますが、お問い合わせページは5%程度です。詳しい改善提案は下の「AI改善提案を生成」をご利用ください。
`;
}

/**
 * ページ分類別分析用プロンプト
 */
function getPageCategoriesPrompt(period, metrics) {
  return `
あなたはWebサイト分析の専門家です。${period}のページ分類別データを分析し、初心者にも分かりやすく説明してください。

【データ】
- ページ閲覧数: ${metrics.totalPageViews?.toLocaleString() || 0}回

【出力ルール】
- 150-200文字程度の自然な文章（段落形式）
- 前置きや挨拶は一切不要、分析内容から直接始める
- 専門用語は使用可（ただし必ず補足を付ける）
- 数値は実数値またはパーセンテージのみ（「ポイント」表記は禁止）
- 改善提案は含めず、最後に「詳しい改善提案は『AI改善提案を生成』をご利用ください」で締める

【禁止】
- 「承知しました」「分析します」などの前置き
- 箇条書き記号（•、-、1.など）
- 「ポイント」という単位
- 具体的な改善提案

【記述例】
${period}は商品カテゴリが最もよく見られており、全体のPV（ページビュー）の40%を占めています。ブログカテゴリは15%程度で、サービス紹介カテゴリは25%です。詳しい改善提案は下の「AI改善提案を生成」をご利用ください。
`;
}

/**
 * 流入キーワード分析用プロンプト
 */
function getKeywordsPrompt(period, metrics) {
  const hasGSCConnection = metrics.hasGSCConnection === true;
  const noDataNote = !hasGSCConnection ? '\n\n⚠️ Search Consoleが未連携です。' : '';

  return `
あなたはWebサイト分析の専門家です。${period}の検索キーワードデータを分析し、初心者にも分かりやすく説明してください。

【データ】
- クリック数: ${metrics.totalClicks?.toLocaleString() || 0}回
- 表示回数: ${metrics.totalImpressions?.toLocaleString() || 0}回${noDataNote}

【出力ルール】
- 150-200文字程度の自然な文章（段落形式）
- 前置きや挨拶は一切不要、分析内容から直接始める
- 専門用語は使用可（ただし必ず補足を付ける）例: CTR（クリック率）、インプレッション（表示回数）
- 数値は実数値またはパーセンテージのみ（「ポイント」表記は禁止）
- 改善提案は含めず、最後に「詳しい改善提案は『AI改善提案を生成』をご利用ください」で締める

【禁止】
- 「承知しました」「分析します」などの前置き
- 箇条書き記号（•、-、1.など）
- 「ポイント」という単位
- 具体的な改善提案

【記述例】
${period}は「商品名」での検索が最も多く、全体のクリック数の30%を占めています。「サービス名」での検索は15%程度です。CTR（クリック率）は平均5.2%で、インプレッション（表示回数）に対してクリックされる割合は良好です。詳しい改善提案は下の「AI改善提案を生成」をご利用ください。
`;
}

/**
 * コンバージョン一覧分析用プロンプト
 */
function getConversionsPrompt(period, metrics) {
  const hasConversions = metrics.conversionEventCount > 0;
  const noDataNote = !hasConversions ? '\n\n⚠️ 成果の定義が未設定です。' : '';

  return `
あなたはWebサイト分析の専門家です。${period}の成果データを分析し、初心者にも分かりやすく説明してください。

【データ】
- 最新月: ${metrics.latestMonth || '不明'}${noDataNote}

【出力ルール】
- 150-200文字程度の自然な文章（段落形式）
- 前置きや挨拶は一切不要、分析内容から直接始める
- 専門用語は使用可（ただし必ず補足を付ける）例: CV（コンバージョン、成果）
- 数値は実数値またはパーセンテージのみ（「ポイント」表記は禁止）
- 改善提案は含めず、最後に「詳しい改善提案は『AI改善提案を生成』をご利用ください」で締める

【禁止】
- 「承知しました」「分析します」などの前置き
- 箇条書き記号（•、-、1.など）
- 「ポイント」という単位
- 具体的な改善提案

【記述例】
${period}はお問い合わせCV（コンバージョン、成果）が前月比10%増加し、良い傾向です。資料ダウンロードは横ばいで、前月と同水準の50件です。全体のCV数は前月比8%増加しています。詳しい改善提案は下の「AI改善提案を生成」をご利用ください。
`;
}

/**
 * ファイルダウンロード分析用プロンプト
 */
function getFileDownloadsPrompt(period, metrics) {
  return `
あなたはWebサイト分析の専門家です。${period}のファイルダウンロードデータを分析し、初心者にも分かりやすく説明してください。

【データ】
- ダウンロード数: ${metrics.totalDownloads?.toLocaleString() || 0}回

【出力ルール】
- 150-200文字程度の自然な文章（段落形式）
- 前置きや挨拶は一切不要、分析内容から直接始める
- 専門用語は使用可（ただし必ず補足を付ける）
- 数値は実数値またはパーセンテージのみ（「ポイント」表記は禁止）
- 改善提案は含めず、最後に「詳しい改善提案は『AI改善提案を生成』をご利用ください」で締める

【禁止】
- 「承知しました」「分析します」などの前置き
- 箇条書き記号（•、-、1.など）
- 「ポイント」という単位
- 具体的な改善提案

【記述例】
${period}はカタログPDFが最も多くダウンロードされており、全体の45%を占めています。価格表のダウンロードは15%程度で、会社案内は20%です。全体のダウンロード数は前月比12%増加しています。詳しい改善提案は下の「AI改善提案を生成」をご利用ください。
`;
}

/**
 * 外部リンククリック分析用プロンプト
 */
function getExternalLinksPrompt(period, metrics) {
  return `
あなたはWebサイト分析の専門家です。${period}の外部リンククリックデータを分析し、初心者にも分かりやすく説明してください。

【データ】
- クリック数: ${metrics.totalClicks?.toLocaleString() || 0}回

【出力ルール】
- 150-200文字程度の自然な文章（段落形式）
- 前置きや挨拶は一切不要、分析内容から直接始める
- 専門用語は使用可（ただし必ず補足を付ける）
- 数値は実数値またはパーセンテージのみ（「ポイント」表記は禁止）
- 改善提案は含めず、最後に「詳しい改善提案は『AI改善提案を生成』をご利用ください」で締める

【禁止】
- 「承知しました」「分析します」などの前置き
- 箇条書き記号（•、-、1.など）
- 「ポイント」という単位
- 具体的な改善提案

【記述例】
${period}はSNSへのリンクが最も多くクリックされており、全体の40%を占めています。関連サイトへのリンクは15%程度で、パートナーサイトへは25%です。全体のクリック数は前月比8%増加しています。詳しい改善提案は下の「AI改善提案を生成」をご利用ください。
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
