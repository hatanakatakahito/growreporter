import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

/**
 * AI要約生成 Callable Function
 * Gemini 2.5 Flash Liteを使用してGA4データの要約を生成
 * @param {object} request - リクエストオブジェクト
 * @returns {Promise<object>} - 生成された要約
 */
export async function generateAISummaryCallable(request) {
  const db = getFirestore();
  const { pageType, startDate, endDate, metrics } = request.data;

  // 入力バリデーション
  if (!pageType || !startDate || !endDate || !metrics) {
    throw new HttpsError(
      'invalid-argument',
      'pageType, startDate, endDate, metrics are required'
    );
  }

  // 認証チェック
  if (!request.auth) {
    throw new HttpsError(
      'unauthenticated',
      'ユーザー認証が必要です'
    );
  }

  const userId = request.auth.uid;

  console.log('[generateAISummary] Start:', { userId, pageType, startDate, endDate });

  try {
    // 1. キャッシュチェック
    const cachedSummary = await getCachedSummary(db, userId, pageType, startDate, endDate);
    if (cachedSummary) {
      console.log('[generateAISummary] Cache hit:', cachedSummary.id);
      return {
        summary: cachedSummary.summary,
        recommendations: cachedSummary.recommendations || [],
        cached: true,
        generatedAt: cachedSummary.generatedAt,
      };
    }

    // 2. Gemini APIキーの確認
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      console.error('[generateAISummary] GEMINI_API_KEY not configured');
      throw new HttpsError(
        'failed-precondition',
        'Gemini API key is not configured'
      );
    }

    // 3. プロンプト生成
    const prompt = generatePrompt(pageType, startDate, endDate, metrics);

    // 4. Gemini API呼び出し
    console.log('[generateAISummary] Calling Gemini API...');
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `あなたはGoogle Analytics 4のデータ分析の専門家です。データを分析し、ビジネスインサイトを提供する日本語の要約を生成してください。\n\n${prompt}`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1500,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[generateAISummary] Gemini API error:', errorText);
      throw new HttpsError(
        'internal',
        `Gemini API error: ${response.status}`
      );
    }

    const data = await response.json();
    let rawSummary = data.candidates?.[0]?.content?.parts?.[0]?.text || 'AI要約を生成できませんでした。';

    console.log('[generateAISummary] Summary generated successfully');

    // 推奨アクションの抽出
    const recommendations = extractRecommendations(rawSummary, pageType);
    
    // AI生成テキストから「アクションプラン」セクションを削除（重複を防ぐため）
    const summary = removeActionPlanSection(rawSummary);

    // 5. Firestoreに保存
    const now = new Date();
    const summaryDoc = {
      userId,
      pageType,
      startDate,
      endDate,
      summary,
      recommendations,
      metrics: JSON.parse(JSON.stringify(metrics)), // undefinedを除外
      generatedAt: Timestamp.fromDate(now),
      createdAt: Timestamp.fromDate(now),
    };

    const docRef = await db.collection('aiSummaries').add(summaryDoc);
    console.log('[generateAISummary] Saved to Firestore:', docRef.id);

    // 6. 古いキャッシュをクリーンアップ（非同期）
    cleanupOldSummaries(db, userId).catch(err => {
      console.error('[generateAISummary] Cleanup error:', err);
    });

    return {
      summary,
      recommendations,
      cached: false,
      generatedAt: now.toISOString(),
    };
  } catch (error) {
    console.error('[generateAISummary] Error:', error);

    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError(
      'internal',
      `AI要約の生成に失敗しました: ${error.message}`
    );
  }
}

/**
 * キャッシュされたAI要約を取得
 */
async function getCachedSummary(db, userId, pageType, startDate, endDate) {
  try {
    const snapshot = await db
      .collection('aiSummaries')
      .where('userId', '==', userId)
      .where('pageType', '==', pageType)
      .where('startDate', '==', startDate)
      .where('endDate', '==', endDate)
      .orderBy('generatedAt', 'desc')
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
      generatedAt: doc.data().generatedAt?.toDate()?.toISOString(),
    };
  } catch (error) {
    console.error('[getCachedSummary] Error:', error);
    return null;
  }
}

/**
 * 古いAI要約を削除（30日以上前）
 */
async function cleanupOldSummaries(db, userId) {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const snapshot = await db
      .collection('aiSummaries')
      .where('userId', '==', userId)
      .where('createdAt', '<', Timestamp.fromDate(thirtyDaysAgo))
      .get();

    if (snapshot.empty) {
      return;
    }

    const batch = db.batch();
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    console.log(`[cleanupOldSummaries] Deleted ${snapshot.size} old summaries`);
  } catch (error) {
    console.error('[cleanupOldSummaries] Error:', error);
  }
}

/**
 * AI分析結果から推奨アクションを抽出
 * セクション見出しに依存せず、番号付きリスト（1., 2., 3.など）を直接検出
 */
function extractRecommendations(summary, pageType) {
  const recommendations = [];
  const lines = summary.split('\n');
  let currentRecommendation = null;
  let itemIndex = 0;
  
  lines.forEach((line) => {
    const trimmedLine = line.trim();
    
    // 見出し行（#で始まる）はスキップ
    if (trimmedLine.startsWith('#')) {
      return;
    }
    
    // 番号付きリスト（1. 2. 3. など）を検出
    const match = trimmedLine.match(/^([0-9]+)\.\s*\*?\*?(.+)\*?\*?$/);
    
    if (match) {
      // 前の推奨アクションを保存
      if (currentRecommendation) {
        recommendations.push(currentRecommendation);
      }
      
      // 新しい推奨アクションを開始
      const fullText = match[2].replace(/\*\*/g, '').trim();
      
      // タイトルと説明を分離
      let title = fullText;
      let description = '';
      
      // コロン（:）で分割
      const colonIndex = fullText.indexOf(':');
      if (colonIndex > 0) {
        title = fullText.substring(0, colonIndex).trim();
        description = fullText.substring(colonIndex + 1).trim();
      } else {
        // コロンがない場合は、最初の句点（。）で分割
        const periodIndex = fullText.indexOf('。');
        if (periodIndex > 0 && periodIndex < 50) { // 50文字以内に句点がある場合のみ
          title = fullText.substring(0, periodIndex).trim();
          description = fullText.substring(periodIndex + 1).trim();
        }
      }
      
      currentRecommendation = {
        title,
        description,
        category: estimateCategory(fullText),
        priority: estimatePriority(fullText, itemIndex),
      };
      itemIndex++;
    } else if (currentRecommendation && trimmedLine && !trimmedLine.startsWith('-')) {
      // 現在の推奨アクションの説明文を追加
      // ただし、箇条書き（-で始まる）は除外
      currentRecommendation.description += (currentRecommendation.description ? ' ' : '') + trimmedLine;
    }
  });
  
  // 最後の推奨アクションを保存
  if (currentRecommendation) {
    recommendations.push(currentRecommendation);
  }
  
  return recommendations;
}

/**
 * AI生成テキストから番号付きリストを含むセクションを削除
 * （推奨アクションと重複するため）
 * 
 * 番号付きリスト（1., 2., 3.）が連続して出現する直前の見出しから削除
 */
function removeActionPlanSection(text) {
  const lines = text.split('\n');
  let numberedListStartIndex = -1;
  let lastHeadingBeforeListIndex = -1;
  
  // 番号付きリスト（1., 2., 3.）が連続している箇所を検出
  for (let i = 0; i < lines.length; i++) {
    const trimmedLine = lines[i].trim();
    
    // 見出し（#で始まる）を記録
    if (trimmedLine.startsWith('#')) {
      lastHeadingBeforeListIndex = i;
      continue;
    }
    
    // 番号付きリスト（1., 2., 3.など）を検出
    const match = trimmedLine.match(/^([0-9]+)\.\s+(.+)$/);
    if (match) {
      const number = parseInt(match[1], 10);
      
      // 1から始まる番号付きリストを検出
      if (number === 1) {
        numberedListStartIndex = i;
        
        // 次の行も番号付きリストかチェック（2.で始まるか）
        let hasMultipleItems = false;
        for (let j = i + 1; j < lines.length && j < i + 10; j++) {
          const nextLine = lines[j].trim();
          const nextMatch = nextLine.match(/^([0-9]+)\.\s+(.+)$/);
          if (nextMatch && parseInt(nextMatch[1], 10) === 2) {
            hasMultipleItems = true;
            break;
          }
        }
        
        // 複数の番号付きリストがある場合のみ削除対象
        if (hasMultipleItems) {
          break;
        }
      }
    }
  }
  
  // 番号付きリストが見つかり、その前に見出しがある場合
  if (numberedListStartIndex > 0 && lastHeadingBeforeListIndex >= 0 && lastHeadingBeforeListIndex < numberedListStartIndex) {
    // その見出しより前の部分のみを返す
    return lines.slice(0, lastHeadingBeforeListIndex).join('\n').trim();
  }
  
  // 番号付きリストが見つかったが見出しがない場合（リストの直前まで削除）
  if (numberedListStartIndex > 0) {
    return lines.slice(0, numberedListStartIndex).join('\n').trim();
  }
  
  // 見つからない場合はそのまま返す
  return text;
}

/**
 * タイトルからカテゴリーを推定
 */
function estimateCategory(text) {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('コンテンツ') || lowerText.includes('記事') || lowerText.includes('情報')) {
    return 'content';
  }
  if (lowerText.includes('デザイン') || lowerText.includes('ui') || lowerText.includes('ux') || lowerText.includes('レイアウト')) {
    return 'design';
  }
  if (lowerText.includes('集客') || lowerText.includes('広告') || lowerText.includes('seo') || lowerText.includes('マーケティング')) {
    return 'acquisition';
  }
  if (lowerText.includes('コンバージョン') || lowerText.includes('cv') || lowerText.includes('フォーム') || lowerText.includes('cta')) {
    return 'feature';
  }
  
  return 'other';
}

/**
 * タイトルから優先度を推定
 */
function estimatePriority(text, order) {
  const lowerText = text.toLowerCase();
  
  // 緊急性の高いキーワード
  if (lowerText.includes('緊急') || lowerText.includes('早急') || lowerText.includes('すぐに') || lowerText.includes('至急')) {
    return 'urgent';
  }
  
  // 重要性の高いキーワード
  if (lowerText.includes('重要') || lowerText.includes('必須') || lowerText.includes('優先') || order === 0) {
    return 'high';
  }
  
  // 中程度
  if (order === 1) {
    return 'medium';
  }
  
  return 'low';
}

/**
 * ページタイプに応じたプロンプトを生成
 */
function generatePrompt(pageType, startDate, endDate, metrics) {
  const period = `${startDate}から${endDate}までの期間`;

  if (pageType === 'summary') {
    // 13ヶ月推移データの整形
    let monthlyTrendText = '';
    if (metrics.monthlyData && Array.isArray(metrics.monthlyData) && metrics.monthlyData.length > 0) {
      const recentMonths = metrics.monthlyData.slice(0, 5); // 最新5ヶ月のみ
      monthlyTrendText = '\n\n【13ヶ月推移（最新5ヶ月）】\n';
      recentMonths.forEach(month => {
        monthlyTrendText += `- ${month.yearMonth}: ユーザー${month.users?.toLocaleString() || 0}人, セッション${month.sessions?.toLocaleString() || 0}回, CV${month.conversions?.toLocaleString() || 0}件\n`;
      });
    }

    return `
以下はWebサイトの全体サマリーデータです。${period}のデータを分析し、ビジネスインサイトを含む日本語の要約を**必ず800文字以内**で生成してください。

【現在期間のデータ】
- 総ユーザー数: ${metrics.users?.toLocaleString() || metrics.totalUsers?.toLocaleString() || 0}人
- セッション数: ${metrics.sessions?.toLocaleString() || 0}回
- ページビュー数: ${metrics.pageViews?.toLocaleString() || metrics.screenPageViews?.toLocaleString() || 0}回
- エンゲージメント率: ${((metrics.engagementRate || 0) * 100).toFixed(1)}%
- コンバージョン数: ${metrics.conversions?.toLocaleString() || 0}件${monthlyTrendText}

【要求事項】
- **800文字以内で簡潔にまとめる**（これは厳守してください）
- Markdownの見出し記法（##, ###）を使用して構造化
- 現在期間のデータと13ヶ月推移の両方を考慮してトレンドを分析
- 改善提案を1-2点含める
- ビジネス的な観点から分析
`;
  }

  if (pageType === 'day') {
    // 日別分析データの整形
    let dailyTrendText = '';
    if (metrics.dailyData && Array.isArray(metrics.dailyData) && metrics.dailyData.length > 0) {
      const recentDays = metrics.dailyData.slice(0, 7); // 最新7日のみ
      dailyTrendText = '\n\n【日別推移（最新7日）】\n';
      recentDays.forEach(day => {
        dailyTrendText += `- ${day.date}: セッション${day.sessions?.toLocaleString() || 0}回, CV${day.conversions?.toLocaleString() || 0}件\n`;
      });
    }

    return `
以下はWebサイトの日別分析データです。${period}のデータを分析し、ビジネスインサイトを含む日本語の要約を**必ず800文字以内**で生成してください。

【期間全体のデータ】
- 総セッション数: ${metrics.sessions?.toLocaleString() || 0}回
- 総コンバージョン数: ${metrics.conversions?.toLocaleString() || 0}件${dailyTrendText}

【要求事項】
- **800文字以内で簡潔にまとめる**（これは厳守してください）
- Markdownの見出し記法（##, ###）を使用して構造化
- 日別のトレンドや特徴的な日を分析
- 曜日パターンや特定日の変動要因を考察
- 改善提案を1-2点含める
`;
  }

  if (pageType === 'week') {
    return `
以下はWebサイトの曜日別分析データです。${period}のデータを分析し、ビジネスインサイトを含む日本語の要約を**必ず800文字以内**で生成してください。

【データ】
- 最大セッション数: ${metrics.sessions?.toLocaleString() || 0}回
- 最大コンバージョン数: ${metrics.conversions?.toLocaleString() || 0}件
- 曜日×時間帯のヒートマップデータあり

【要求事項】
- **800文字以内で簡潔にまとめる**（これは厳守してください）
- Markdownの見出し記法（##, ###）を使用して構造化
- 曜日や時間帯別の傾向を分析
- アクセスが多い曜日・時間帯を特定
- 広告配信や投稿タイミングの最適化を提案
`;
  }

  if (pageType === 'hour') {
    // 時間帯別データの整形
    let peakHours = '';
    if (metrics.hourlyData && Array.isArray(metrics.hourlyData) && metrics.hourlyData.length > 0) {
      const sortedBySession = [...metrics.hourlyData].sort((a, b) => b.sessions - a.sessions).slice(0, 3);
      peakHours = '\n\n【セッションが多い時間帯トップ3】\n';
      sortedBySession.forEach(hour => {
        if (hour.sessions > 0) {
          peakHours += `- ${hour.hour}時: セッション${hour.sessions?.toLocaleString() || 0}回, CV${hour.conversions?.toLocaleString() || 0}件\n`;
        }
      });
    }

    return `
以下はWebサイトの時間帯別分析データです。${period}のデータを分析し、ビジネスインサイトを含む日本語の要約を**必ず800文字以内**で生成してください。

【期間全体のデータ】
- 総セッション数: ${metrics.sessions?.toLocaleString() || 0}回
- 総コンバージョン数: ${metrics.conversions?.toLocaleString() || 0}件${peakHours}

【要求事項】
- **800文字以内で簡潔にまとめる**（これは厳守してください）
- Markdownの見出し記法（##, ###）を使用して構造化
- アクセスが集中する時間帯を特定
- コンバージョンが発生しやすい時間帯を分析
- コンテンツ投稿や広告配信の最適な時間帯を提案
`;
  }

  if (pageType === 'dashboard') {
    // コンバージョン定義の確認と内訳の整形
    const hasConversions = metrics.hasConversionDefinitions === true;
    let conversionText = '';
    
    if (hasConversions) {
      conversionText = `\n- コンバージョン数: ${metrics.conversions?.toLocaleString() || 0}件`;
      if (metrics.conversionBreakdown && typeof metrics.conversionBreakdown === 'object') {
        conversionText += '\n  内訳:';
        Object.entries(metrics.conversionBreakdown).forEach(([name, count]) => {
          conversionText += `\n  - ${name}: ${count?.toLocaleString() || 0}件`;
        });
      }
    } else {
      conversionText = '\n- コンバージョン定義: 未設定（設定後に計測開始）';
    }
    
    // 前月比データの整形
    let monthOverMonthText = '';
    if (metrics.monthOverMonth) {
      const mom = metrics.monthOverMonth;
      monthOverMonthText = '\n\n【前月比】';
      
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

    return `
あなたは経営者や意思決定者に向けたダッシュボードレポートを作成する専門家です。${period}のWebサイト全体のパフォーマンスを分析し、**経営判断に役立つビジネスインサイト**を含む日本語の要約を**必ず800文字以内**で生成してください。

【現在期間の主要指標】
- 総ユーザー数: ${metrics.users?.toLocaleString() || 0}人
- 新規ユーザー数: ${metrics.newUsers?.toLocaleString() || 0}人
- セッション数: ${metrics.sessions?.toLocaleString() || 0}回
- ページビュー数: ${metrics.pageViews?.toLocaleString() || 0}回
- エンゲージメント率: ${((metrics.engagementRate || 0) * 100).toFixed(1)}%
- 直帰率: ${((metrics.bounceRate || 0) * 100).toFixed(1)}%
- 平均セッション時間: ${metrics.avgSessionDuration ? `${Math.floor(metrics.avgSessionDuration / 60)}分${Math.floor(metrics.avgSessionDuration % 60)}秒` : '0秒'}${conversionText}${hasConversions ? `\n- コンバージョン率: ${(metrics.conversionRate || 0).toFixed(2)}%` : ''}${monthOverMonthText}

【要求事項】
- **800文字以内で簡潔にまとめる**（これは厳守してください）
- Markdownの見出し記法（##, ###）を使用して構造化
- **前月比の増減を必ず分析し、その原因を考察すること**
- 良い点（成長トレンド）と改善点（課題）の両方を明確に指摘
- **経営判断や施策の優先順位付けに役立つ具体的なアクションを1-2点提案**
- 数値の羅列ではなく、「なぜそうなったか」「次に何をすべきか」の視点で記述
- ビジネスインパクトの大きい指標を優先的に取り上げる
- **コンバージョンについて**：${hasConversions ? 'コンバージョン数が0件でも「発生なし」として言及し、その理由を分析してください' : 'コンバージョン定義が未設定のため、コンバージョンについては触れないでください'}
`;
  }

  // その他のページタイプ用のデフォルト
  return `
${period}のデータを分析し、**必ず800文字以内**で日本語の要約を生成してください。

【データ】
${JSON.stringify(metrics, null, 2)}

【要求事項】
- **800文字以内で簡潔にまとめる**（これは厳守してください）
- Markdownの見出し記法（##, ###）を使用して構造化
- 主要なポイントを3-5点にまとめる
- 改善提案を含める
`;
}


