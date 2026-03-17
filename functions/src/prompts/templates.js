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
- 改善提案は含めない

【禁止】
- 「承知しました」「分析します」などの前置き
- 箇条書き記号（•、-、1.など）
- 「ポイント」という単位
- 具体的な改善提案

【記述例】
${period}は訪問者が前月比15%増加し、良い傾向です。ただしCVR（成果率）は2.8%から2.3%に低下しており、訪問者は増えても成果につながっていません。`;
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
- 改善提案は含めない

【禁止】
- 「承知しました」「分析します」などの前置き
- 箇条書き記号（•、-、1.など）
- 「ポイント」という単位
- 具体的な改善提案

【記述例】
${period}は週末に訪問者が集中し、特に土曜日が最も多くなっています。平日は訪問者が少なく、特に月曜日が最少です。週末と平日で約2倍の差があります。`;
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
- 改善提案は含めない

【禁止】
- 「承知しました」「分析します」などの前置き
- 箇条書き記号（•、-、1.など）
- 「ポイント」という単位
- 具体的な改善提案

【記述例】
${period}は土日に訪問者が集中し、平日は少ない傾向です。特に月曜日が最も少なく、土曜日と比較して約40%少なくなっています。`;
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
- 改善提案は含めない

【禁止】
- 「承知しました」「分析します」などの前置き
- 箇条書き記号（•、-、1.など）
- 「ポイント」という単位
- 具体的な改善提案

【記述例】
${period}は昼間（12-14時）に訪問者が集中し、夜間は少ない傾向です。朝の通勤時間帯も比較的多く、深夜と比較して約3倍の差があります。`;
}

/**
 * 月別分析用プロンプト
 */
function getMonthlyPrompt(period, metrics) {
  let monthlyDataText = '';
  if (metrics.monthlyData && Array.isArray(metrics.monthlyData) && metrics.monthlyData.length > 0) {
    monthlyDataText = '\n\n【月別推移データ】';
    metrics.monthlyData.forEach(month => {
      monthlyDataText += `\n- ${month.label || month.month}: ユーザー${month.users?.toLocaleString() || 0}人, 訪問${month.sessions?.toLocaleString() || 0}回, PV${month.pageViews?.toLocaleString() || 0}, ENG率${((month.engagementRate || 0) * 100).toFixed(1)}%, CV${month.conversions?.toLocaleString() || 0}件, CVR${((month.conversionRate || 0) * 100).toFixed(2)}%`;
    });
  }

  return `
あなたはWebサイト分析の専門家です。${period}の月別推移データを分析し、初心者にも分かりやすく説明してください。

【データ】
- 対象期間: ${metrics.monthCount || 0}ヶ月分
- 総訪問者数: ${metrics.sessions?.toLocaleString() || 0}回
- 総コンバージョン数: ${metrics.conversions?.toLocaleString() || 0}件${monthlyDataText}

【出力ルール】
- 150-200文字程度の自然な文章（段落形式）
- 前置きや挨拶は一切不要、分析内容から直接始める
- 月次トレンド（増加傾向・減少傾向・横ばい）を中心に分析
- 季節性やイベント影響の可能性にも言及
- 専門用語は使用可（ただし必ず補足を付ける）例: CVR（成果率）、エンゲージメント率（訪問者の関与度）
- 数値は実数値またはパーセンテージのみ（「ポイント」表記は禁止）
- 改善提案は含めない

【禁止】
- 「承知しました」「分析します」などの前置き
- 箇条書き記号（•、-、1.など）
- 「ポイント」という単位
- 具体的な改善提案

【記述例】
過去13ヶ月で訪問者数は右肩上がりの傾向にあり、直近3ヶ月は月平均5,000回を超えています。一方でCVR（成果率）は1.5%前後で横ばいが続いており、訪問者の増加が成果に直結していない状況です。エンゲージメント率（訪問者の関与度）も60%台で安定しています。`;
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
あなたはWebサイト分析の専門家です。${period}の全体サマリーデータを分析し、初心者にも分かりやすく説明してください。

【データ】
- 訪問者数: ${metrics.sessions?.toLocaleString() || 0}回
- 成果（お問い合わせなど）: ${metrics.conversions?.toLocaleString() || 0}件${monthOverMonthText}${conversionText}${kpiText}

【出力ルール】
- 150-200文字程度の自然な文章（段落形式）
- 前置きや挨拶は一切不要、分析内容から直接始める
- 専門用語は使用可（ただし必ず補足を付ける）例: CVR（成果率）、エンゲージメント率（訪問者の関与度）
- 数値は実数値またはパーセンテージのみ（「ポイント」表記は禁止）
- 改善提案は含めない

【禁止】
- 「承知しました」「分析します」などの前置き
- 箇条書き記号（•、-、1.など）
- 「ポイント」という単位
- 具体的な改善提案

【記述例】
${period}は訪問者が前月比15%増加し、良い傾向です。ただしCVR（成果率）は2.8%から2.3%に低下しており、訪問者は増えても成果につながっていません。エンゲージメント率（訪問者の関与度）も前月比5%低下しています。`;
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
- 改善提案は含めない

【禁止】
- 「承知しました」「分析します」などの前置き
- 箇条書き記号（•、-、1.など）
- 「ポイント」という単位
- 具体的な改善提案

【記述例】
${period}はスマホからの訪問者が全体の80%を占めています。地域別では東京・大阪などの都市部からのアクセスが多く、全体の65%を占めています。新規訪問者とリピーターの比率は6:4です。`;
}

/**
 * 逆算フロー分析用プロンプト
 */
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

  const startLabel = hasEntryPage ? '起点PV' : '全PV';

  let entryPageText = '';
  if (hasEntryPage) {
    entryPageText = `\n- 起点ページパス: ${entryPagePath}\n- 起点PV: ${(entryPageViews ?? 0).toLocaleString()}回`;
  }

  let monthlyText = '';
  if (monthlyData.length > 0) {
    monthlyText = '\n\n【月次推移データ】\n';
    monthlyData.forEach((month) => {
      const mStartViews = hasEntryPage && month.entryPageViews != null ? month.entryPageViews : month.totalSiteViews;
      monthlyText += `${month.month || month.yearMonth}: ${startLabel}${(mStartViews ?? 0).toLocaleString()}, フォームPV${month.formPageViews?.toLocaleString() || 0}, CV${month.submissionComplete?.toLocaleString() || 0}件, 達成率①${mStartViews > 0 ? ((month.formPageViews / mStartViews) * 100).toFixed(2) : 0}%\n`;
    });
  }

  return `
あなたは【コンバージョンフロー分析の専門家】です。${period}のWebサイトの「${flowName}」フローを分析し、**CVR向上に直結する改善施策に役立つビジネスインサイト**を含む日本語の要約を生成してください。

【現在期間のデータ】
- フロー名: ${flowName}${entryPageText}
- フォームページパス: ${formPagePath}
- 目標CVイベント: ${targetCvEvent}
- 全サイトPV: ${totalSiteViews.toLocaleString()}回
- フォームPV: ${formPageViews.toLocaleString()}回
- 送信完了（${targetCvEvent}）: ${submissionComplete.toLocaleString()}件
- 達成率① (${startLabel}→フォームPV): ${achievementRate1.toFixed(2)}%
- 達成率② (フォームPV→送信完了): ${achievementRate2.toFixed(2)}%
- 全体CVR (${startLabel}→送信完了): ${overallCVR.toFixed(2)}%${monthlyText}

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
 * ページタイプのラベルを取得
 */
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

/**
 * 包括的改善案用プロンプト
 * @param {object} [options] - siteContext: { industry, siteType, sitePurpose }, improvementFocus
 */
function getComprehensiveImprovementPrompt(period, metrics, startDate, endDate, options = {}) {
  const sd = startDate || '';
  const ed = endDate || '';
  const { siteContext, improvementFocus, conversionGoals = [], kpiSettings = [], diagnosisData } = options;

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
        scrapingDataText += `フォーム: あり（${page.formFields?.length || 0}項目）\n`;
      }
      
      // 問題点を特定
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
      
      scrapingDataText += '\n';
    });
  } else {
    scrapingDataText = '\n\n【アクセス上位ページの詳細分析】\n';
    scrapingDataText += '⚠️ スクレイピングデータが未取得です。管理画面から「上位100ページをスクレイピング」を実行してください。\n\n';
  }

  // サイト診断データ（PSI・CWV・コンテンツ品質）
  let diagnosisText = '';
  if (diagnosisData) {
    const d = diagnosisData;
    diagnosisText = `\n\n【サイト診断結果（PageSpeed Insights）】
■ 総合スコア: ${d.overallScore ?? '-'}/100
■ パフォーマンス: モバイル ${d.psi?.mobile?.performance ?? '-'} / デスクトップ ${d.psi?.desktop?.performance ?? '-'}
■ SEO: モバイル ${d.psi?.mobile?.seo ?? '-'} / デスクトップ ${d.psi?.desktop?.seo ?? '-'}
■ アクセシビリティ: モバイル ${d.psi?.mobile?.accessibility ?? '-'} / デスクトップ ${d.psi?.desktop?.accessibility ?? '-'}

■ Core Web Vitals（モバイル）:
  LCP: ${d.psi?.mobile?.cwv?.lcp?.value ?? '-'}${d.psi?.mobile?.cwv?.lcp?.unit ?? ''} (${d.psi?.mobile?.cwv?.lcp?.rating ?? '-'})
  CLS: ${d.psi?.mobile?.cwv?.cls?.value ?? '-'} (${d.psi?.mobile?.cwv?.cls?.rating ?? '-'})
  TBT: ${d.psi?.mobile?.cwv?.tbt?.value ?? '-'}${d.psi?.mobile?.cwv?.tbt?.unit ?? ''} (${d.psi?.mobile?.cwv?.tbt?.rating ?? '-'})
  FCP: ${d.psi?.mobile?.cwv?.fcp?.value ?? '-'}${d.psi?.mobile?.cwv?.fcp?.unit ?? ''} (${d.psi?.mobile?.cwv?.fcp?.rating ?? '-'})
  TTFB: ${d.psi?.mobile?.cwv?.ttfb?.value ?? '-'}${d.psi?.mobile?.cwv?.ttfb?.unit ?? ''} (${d.psi?.mobile?.cwv?.ttfb?.rating ?? '-'})

■ 主要な問題Audit:
${(d.psi?.mobile?.topAudits || []).slice(0, 5).map(a => `  - ${a.title}: ${a.displayValue || ''}`).join('\n')}
`;
  }

  // 未使用のプレースホルダ（将来の拡張用）。未定義エラー防止のため空文字で定義
  const sitemapText = '';
  const pageQualityText = '';

  // サイト前提情報（業界・種別・目的）をタスク2の前に挿入
  let siteContextBlock = '';
  if (siteContext && (siteContext.industryText || siteContext.siteTypeText || siteContext.sitePurposeText)) {
    siteContextBlock = `
【サイトの前提情報（改善提案の前提として考慮すること）】
- 業界・業種: ${siteContext.industryText || '未設定'}
- サイト種別: ${siteContext.siteTypeText || '未設定'}
- サイトの目的: ${siteContext.sitePurposeText || '未設定'}
上記を踏まえ、この業界・サイト種別・目的に適した改善案のみを提案すること。

`;
    
    // サイト種別による重点ポイントの追加
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

  // コンバージョン設定・KPI設定の情報
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

  // 改善の軸（最優先の成果指標）と方針別の詳細指示
  let improvementFocusLine = '';
  if (improvementFocus) {
    improvementFocusLine = `今回の提案は【${improvementFocus}】を最優先の成果指標として、このサイトに即効性のある改善策に絞ること。\n\n`;
    
    // 方針別の詳細指示
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

  // 既存の改善案（重複回避用）
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
【タスク2】改善施策の提案（サイト構造と実データに基づく）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${siteContextBlock}${conversionSettingsText}
${scrapingDataText}
${diagnosisText}
${sitemapText}${pageQualityText}

【改善施策の生成ルール】
${improvementFocusLine}${existingImprovementsText}✓ このサイトの実際の構造とアクセスデータに基づいて提案
✓ 専門用語を使わず、中学生でも理解できる言葉で説明
✓ 「なぜ必要か」「どう改善するか」「どんな効果が期待できるか」を明確に記述
✓ 3〜5件の具体的な改善案を提案
✓ 既に提案した施策と重複しないよう、重複判定用ラベルでテーマが同じものは出さない

【重要】具体性を担保するための必須ルール：
✓ 改善案のタイトルと説明には必ず具体的なページURL・パスを明記すること
✓ スクレイピングデータから実際の問題を特定して引用すること
  例: 「/about ページのh1が2つある」「/contact のフォーム項目が15個（業界平均の2倍）」
✓ 実際の数値を根拠として示すこと
  例: 「PV 1,234/月なのにCV 0件」「読込時間4.2秒（平均の2倍）」
✓ 実際のコンテンツを引用すること
  例: 現在のCTAボタン「詳しくはこちら」→「無料で資料請求（3分で完了）」に変更
✓ 改善前後の具体的な変更内容を示すこと
✓ 期待効果を定量的に表現すること（例: 「CV率が1.2%→2.5%に向上見込み」）
✓ 汎用的な提案は禁止: 「表示速度改善」「alt属性設定」「h1タグ設定」などの一般論は、
  具体的なページURL、現状の数値、改善後の目標値を伴わない限り提案しないこと

【データ分析の優先順位】
1. 高PV×低CVのページを最優先で特定（最大の改善機会）
2. 高離脱率のページの原因分析（フォーム、読込速度、コンテンツ不足など）
3. CVに至るまでの導線で離脱が多いステップを特定
4. スクレイピングデータの「⚠️ 問題点」を優先的に改善対象とする
5. 実際のCTAボタンの文言、h1タグの内容、フォーム項目数などを引用する
6. ヒートマップデータがある場合、クリック集中箇所・離脱ポイント・スクロール到達率を根拠として活用する

【禁止事項】
✗ 具体的なページURLを伴わない汎用的な提案
✗ 数値根拠のない抽象的な提案
✗ 「〜を検討しましょう」「〜が望ましい」などの曖昧な表現
✗ 全ページに当てはまる一般論（例外: 新規ページ・コンテンツ追加の提案は可）
✗ スクレイピングデータに記載されていない問題の推測

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

【記述例】
• 直近30日の訪問は10,471回（前月比-4.7%）で減少傾向、一方CV率は+0.25pt改善。
• 流入減の主因は季節的閑散期と広告予算削減、CV率改善はCTA最適化の効果と推測。
• 過去13ヶ月で2月が最高値、6月が最低値。中長期では横ばい〜微増傾向。

推奨改善施策

【改善案の出力例】

❌ 悪い例（汎用的・抽象的）:
タイトル: ページ表示速度の改善
説明: 画像を圧縮して表示速度を改善しましょう
対象ページ: （空欄）
対象箇所: 全体

✅ 良い例（具体的・データドリブン）:
タイトル: 商品一覧ページ（/products/）の読込時間を4.2秒→2秒以内に短縮
説明: 【現状】/products/ の読込時間が4.2秒（スクレイピングデータより）で、業界平均（2秒）の2倍。直帰率が68%と高い。【改善策】(1)商品画像6枚を次世代フォーマット（WebP）に変換し容量を70%削減 (2)画像の遅延読み込み（lazy loading）を実装 (3)不要なJavaScriptライブラリ2つを削除。【期待効果】読込時間が2秒以内になることで、直帰率が68%→50%に改善し、月間CVが+15件増加見込み。
対象ページ: /products/
対象箇所: 商品一覧ページ
期待効果: 直帰率18%改善、月間CV+15件
重複判定用ラベル: products_page_speed

---

上記「良い例」の形式に従い、各改善案には必ず「対象ページ:」にパスまたはURL、「期待効果:」「想定工数（時間）:」を含め、数値根拠・改善前後の内容を明記すること。

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

【出力例】
分析サマリー
• 直近30日の訪問は10,471回（前月比-4.7%）で減少傾向、一方CV数は125件（前月比+21.4%）で増加。
• 流入減の主因は季節的閑散期と広告キャンペーン終了、CV率改善はCTA最適化の効果と推測。
• 過去13ヶ月で2月が最高値、6月が最低値。前年同月比ではプラス成長を維持。

推奨改善施策

タイトル: 商品ページに「お客様の声」セクションを追加
説明: 現在、商品ページには商品説明と価格のみが表示されていますが、購入の決め手となる「実際に使った人の感想」がありません。各商品ページに3〜5件のレビューを掲載することで、訪問者の不安を解消し、購入率の向上が期待できます。テキストと写真を用意するだけなので、外部に依頼せずに社内で対応可能です
対象ページ: /products
対象箇所: 商品説明セクション
カテゴリー: content
優先度: high
期待効果: 商品ページからの購入率向上、訪問者の滞在時間増加
実装者: in_house
難易度: easy
費用感: free
想定工数（時間）: 2

---

タイトル: ヘッダーのナビゲーションを簡潔にする
説明: 現在ヘッダーのメニュー項目が多く、訪問者が迷いやすい状態です。主要な3〜5項目に絞り、優先度の高い導線を前面に出すことで直帰率の改善が期待できます。
対象ページ: /
対象箇所: ヘッダー
カテゴリー: design
優先度: medium
期待効果: 直帰率の改善、目的ページへの到達率向上
実装者: in_house
難易度: easy
費用感: free
想定工数（時間）: 1

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
- 改善提案は含めない

【禁止】
- 「承知しました」「分析します」などの前置き
- 箇条書き記号（•、-、1.など）
- 「ポイント」という単位
- 具体的な改善提案

【記述例】
${period}はオーガニック検索（自然検索）からの訪問が全体の60%を占め、最も多い流入経路です。SNSからの訪問は10%程度で、リファラル（他サイトからのリンク）は15%です。`;
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
- 改善提案は含めない

【禁止】
- 「承知しました」「分析します」などの前置き
- 箇条書き記号（•、-、1.など）
- 「ポイント」という単位
- 具体的な改善提案

【記述例】
${period}はGoogleからの訪問が全体の55%を占め、最も多い参照元です。Yahoo!からの訪問は8%、SNSからは12%です。直接訪問（ブックマークなど）は20%を占めています。`;
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
- 改善提案は含めない

【禁止】
- 「承知しました」「分析します」などの前置き
- 箇条書き記号（•、-、1.など）
- 「ポイント」という単位
- 具体的な改善提案

【記述例】
${period}はトップページから入ってくる訪問者が全体の45%を占め、最も多いランディングページ（最初に見られるページ）です。商品ページから直接入ってくる訪問者も30%あり、検索からの流入が多いことがわかります。`;
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
- 改善提案は含めない

【禁止】
- 「承知しました」「分析します」などの前置き
- 箇条書き記号（•、-、1.など）
- 「ポイント」という単位
- 具体的な改善提案

【記述例】
${period}はトップページが最もよく見られており、全体のPV（ページビュー、閲覧数）の35%を占めています。商品ページも25%を占めていますが、お問い合わせページは5%程度です。`;
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
- 改善提案は含めない

【禁止】
- 「承知しました」「分析します」などの前置き
- 箇条書き記号（•、-、1.など）
- 「ポイント」という単位
- 具体的な改善提案

【記述例】
${period}は商品カテゴリが最もよく見られており、全体のPV（ページビュー）の40%を占めています。ブログカテゴリは15%程度で、サービス紹介カテゴリは25%です。`;
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
- 改善提案は含めない

【禁止】
- 「承知しました」「分析します」などの前置き
- 箇条書き記号（•、-、1.など）
- 「ポイント」という単位
- 具体的な改善提案

【記述例】
${period}は「商品名」での検索が最も多く、全体のクリック数の30%を占めています。「サービス名」での検索は15%程度です。CTR（クリック率）は平均5.2%で、インプレッション（表示回数）に対してクリックされる割合は良好です。`;
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
- 改善提案は含めない

【禁止】
- 「承知しました」「分析します」などの前置き
- 箇条書き記号（•、-、1.など）
- 「ポイント」という単位
- 具体的な改善提案

【記述例】
${period}はお問い合わせCV（コンバージョン、成果）が前月比10%増加し、良い傾向です。資料ダウンロードは横ばいで、前月と同水準の50件です。全体のCV数は前月比8%増加しています。`;
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
- 改善提案は含めない

【禁止】
- 「承知しました」「分析します」などの前置き
- 箇条書き記号（•、-、1.など）
- 「ポイント」という単位
- 具体的な改善提案

【記述例】
${period}はカタログPDFが最も多くダウンロードされており、全体の45%を占めています。価格表のダウンロードは15%程度で、会社案内は20%です。全体のダウンロード数は前月比12%増加しています。`;
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
- 改善提案は含めない

【禁止】
- 「承知しました」「分析します」などの前置き
- 箇条書き記号（•、-、1.など）
- 「ポイント」という単位
- 具体的な改善提案

【記述例】
${period}はSNSへのリンクが最も多くクリックされており、全体の40%を占めています。関連サイトへのリンクは15%程度で、パートナーサイトへは25%です。全体のクリック数は前月比8%増加しています。`;
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
