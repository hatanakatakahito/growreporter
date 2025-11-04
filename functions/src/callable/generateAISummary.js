import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { checkCanGenerate, incrementGenerationCount } from '../utils/planManager.js';
import { getCachedAnalysis, saveCachedAnalysis } from '../utils/aiCacheManager.js';

/**
 * AI要約生成 Callable Function
 * Gemini 2.5 Flash Liteを使用してGA4データの要約を生成
 * @param {object} request - リクエストオブジェクト
 * @returns {Promise<object>} - 生成された要約
 */
export async function generateAISummaryCallable(request) {
  const db = getFirestore();
  const { siteId, pageType, startDate, endDate, metrics, forceRegenerate = false } = request.data;

  // 入力バリデーション
  if (!siteId || !pageType || !startDate || !endDate || !metrics) {
    throw new HttpsError(
      'invalid-argument',
      'siteId, pageType, startDate, endDate, metrics are required'
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

  console.log('[generateAISummary] Start:', { userId, siteId, pageType, startDate, endDate, forceRegenerate });

  try {
    // 1. キャッシュチェック（強制再生成でない場合）
    if (!forceRegenerate) {
      const cachedAnalysis = await getCachedAnalysis(userId, siteId, pageType, startDate, endDate);
      if (cachedAnalysis) {
        console.log('[generateAISummary] Cache hit (aiAnalysisCache):', cachedAnalysis.cacheId);
        return {
          summary: cachedAnalysis.summary,
          recommendations: cachedAnalysis.recommendations || [],
          fromCache: true,
          generatedAt: cachedAnalysis.generatedAt.toISOString(),
        };
      }
      
      // 旧キャッシュもチェック（互換性のため）
      const cachedSummary = await getCachedSummary(db, userId, siteId, pageType, startDate, endDate);
      if (cachedSummary) {
        console.log('[generateAISummary] Cache hit (legacy aiSummaries):', cachedSummary.id);
        return {
          summary: cachedSummary.summary,
          recommendations: cachedSummary.recommendations || [],
          fromCache: true,
          generatedAt: cachedSummary.generatedAt,
        };
      }
    }
    
    // 2. プラン制限チェック
    const canGenerate = await checkCanGenerate(userId);
    if (!canGenerate) {
      console.log('[generateAISummary] プラン制限超過:', userId);
      throw new HttpsError(
        'resource-exhausted',
        '今月のAI生成回数の上限に達しました。来月1日に自動的にリセットされます。'
      );
    }

    // 3. Gemini APIキーの確認
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      console.error('[generateAISummary] GEMINI_API_KEY not configured');
      throw new HttpsError(
        'failed-precondition',
        'Gemini API key is not configured'
      );
    }

    // 4. プロンプト生成
    const prompt = generatePrompt(pageType, startDate, endDate, metrics);

    // 5. Gemini API呼び出し
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

    // 6. 新しいキャッシュシステムに保存
    const now = new Date();
    await saveCachedAnalysis(userId, siteId, pageType, summary, recommendations, startDate, endDate);
    
    // 7. 旧システムにも保存（互換性のため、将来的に削除予定）
    const summaryDoc = {
      userId,
      siteId,
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
    console.log('[generateAISummary] Saved to Firestore (legacy):', docRef.id);

    // 8. 生成回数をインクリメント
    await incrementGenerationCount(userId);
    console.log('[generateAISummary] Generation count incremented');

    // 9. 古いキャッシュをクリーンアップ（非同期）
    cleanupOldSummaries(db, userId).catch(err => {
      console.error('[generateAISummary] Cleanup error:', err);
    });

    return {
      summary,
      recommendations,
      fromCache: false,
      generatedAt: now.toISOString(),
    };
  } catch (error) {
    console.error('[generateAISummary] Error:', error);

    if (error instanceof HttpsError) {
      throw error;
    }

    // 429 レート制限エラー
    if (error.message?.includes('429') || error.status === 429 || error.message?.includes('quota') || error.message?.includes('rate limit')) {
      throw new HttpsError(
        'resource-exhausted',
        'AI分析のリクエスト上限に達しました。しばらく時間をおいてから再度お試しください。（通常1〜5分で回復します）'
      );
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
async function getCachedSummary(db, userId, siteId, pageType, startDate, endDate) {
  try {
    const snapshot = await db
      .collection('aiSummaries')
      .where('userId', '==', userId)
      .where('siteId', '==', siteId)
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

  // コンバージョン定義の整形
  const formatConversionInfo = () => {
    if (!metrics.conversionEvents || metrics.conversionEvents.length === 0) {
      return '\n\n【コンバージョン定義】\n- コンバージョンイベントが設定されていません';
    }
    
    let text = '\n\n【コンバージョン定義】\n';
    text += `このサイトでは以下の${metrics.conversionEvents.length}種類のコンバージョンイベントを設定しています：\n`;
    metrics.conversionEvents.forEach((event, index) => {
      text += `${index + 1}. 「${event.displayName}」（GA4イベント名: ${event.eventName}）\n`;
      if (event.category) {
        text += `   - カテゴリ: ${event.category}\n`;
      }
    });
    
    // コンバージョン内訳がある場合
    if (metrics.conversions && typeof metrics.conversions === 'object' && !Array.isArray(metrics.conversions)) {
      text += '\n【コンバージョン内訳】\n';
      Object.entries(metrics.conversions).forEach(([eventName, count]) => {
        const event = metrics.conversionEvents.find(e => e.eventName === eventName);
        const displayName = event ? event.displayName : eventName;
        text += `- ${displayName}: ${count?.toLocaleString() || 0}件\n`;
      });
    }
    
    return text;
  };

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
    
    const conversionInfo = formatConversionInfo();
    const totalConversions = typeof metrics.conversions === 'object' && !Array.isArray(metrics.conversions)
      ? Object.values(metrics.conversions).reduce((sum, count) => sum + (count || 0), 0)
      : (metrics.conversions || 0);

    return `
あなたは中長期的なトレンド分析の専門家です。${period}のWebサイトパフォーマンスを13ヶ月の推移データと合わせて分析し、**成長トレンドの特定と今後の戦略に役立つビジネスインサイト**を含む日本語の要約を**必ず800文字以内**で生成してください。

【現在期間のデータ】
- 総ユーザー数: ${metrics.users?.toLocaleString() || metrics.totalUsers?.toLocaleString() || 0}人
- セッション数: ${metrics.sessions?.toLocaleString() || 0}回
- ページビュー数: ${metrics.pageViews?.toLocaleString() || metrics.screenPageViews?.toLocaleString() || 0}回
- エンゲージメント率: ${((metrics.engagementRate || 0) * 100).toFixed(1)}%
- コンバージョン合計: ${totalConversions.toLocaleString()}件${conversionInfo}${monthlyTrendText}

【要求事項】
- **800文字以内で簡潔にまとめる**（これは厳守してください）
- Markdownの見出し記法（##, ###）を使用して構造化
- **13ヶ月推移から成長トレンド、季節性、転換点を分析**
- 良い点（成長している指標）と改善点（停滞・減少している指標）の両方を明確に指摘
- **トレンドの原因を考察**：「なぜそうなったか」の視点で記述
- **今後3ヶ月の戦略として、具体的なアクションを1-3点提案**：
  - 成長トレンドを加速させる施策
  - 減少トレンドを反転させる施策
  - 各提案の優先順位とビジネスインパクトを明示
- 数値の羅列ではなく、ビジネス判断に直結するインサイトを提供
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
あなたは日次パフォーマンス分析の専門家です。${period}のWebサイトの日別データを分析し、**アクセス変動の要因特定と短期的な改善施策に役立つビジネスインサイト**を含む日本語の要約を**必ず800文字以内**で生成してください。

【期間全体のデータ】
- 総セッション数: ${metrics.sessions?.toLocaleString() || 0}回
- 総コンバージョン数: ${metrics.conversions?.toLocaleString() || 0}件${dailyTrendText}

【要求事項】
- **800文字以内で簡潔にまとめる**（これは厳守してください）
- Markdownの見出し記法（##, ###）を使用して構造化
- **日別の変動パターンを分析**：曜日による傾向、急増・急減した特定日を特定
- **変動の原因を考察**：「なぜその日にアクセスが増えた/減ったか」を推測
  - 曜日効果（週末vs平日）
  - イベントやキャンペーンの影響
  - 外部要因（天候、ニュース、季節性など）
- **具体的なアクションを1-3点提案**：
  - アクセスが多い曜日を活用した施策（コンテンツ公開、キャンペーン実施など）
  - アクセスが少ない曜日の改善策
  - CV率が高い日の特徴を他の日に応用する方法
  - 各提案の実施タイミングと期待効果を明示
- 数値の羅列ではなく、「次にどう動くべきか」の視点で記述
`;
  }

  if (pageType === 'week') {
    return `
あなたはマーケティングタイミング最適化の専門家です。${period}のWebサイトの曜日別・時間帯別データを分析し、**広告配信やコンテンツ投稿の最適タイミング戦略に役立つビジネスインサイト**を含む日本語の要約を**必ず800文字以内**で生成してください。

【データ】
- 最大セッション数: ${metrics.sessions?.toLocaleString() || 0}回
- 最大コンバージョン数: ${metrics.conversions?.toLocaleString() || 0}件
- 曜日×時間帯のヒートマップデータあり

【要求事項】
- **800文字以内で簡潔にまとめる**（これは厳守してください）
- Markdownの見出し記法（##, ###）を使用して構造化
- **曜日×時間帯のパターンを分析**：
  - アクセスが集中する曜日と時間帯の組み合わせを特定
  - CVが発生しやすい曜日・時間帯を特定
  - 平日vs週末、日中vs夜間の違いを分析
- **パターンの原因を考察**：「なぜその曜日・時間帯にアクセスが集中するか」をターゲット層の行動から推測
- **具体的なアクションを1-3点提案**：
  - 【広告配信】：最も効果的な曜日・時間帯と予算配分（例：「火曜20-22時に予算の30%を投下」）
  - 【コンテンツ投稿】：新規記事やSNS投稿の最適な曜日・時間（例：「月曜9時に新記事を公開」）
  - 【キャンペーン実施】：プロモーションやメルマガ配信の最適なタイミング
  - 各提案の実施方法と期待効果を具体的に明示
- 数値の羅列ではなく、「いつ、何をすべきか」を明確に記述
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
あなたは時間帯別マーケティング戦略の専門家です。${period}のWebサイトの時間帯別データを分析し、**24時間の中で最も効果的な施策実行タイミングに役立つビジネスインサイト**を含む日本語の要約を**必ず800文字以内**で生成してください。

【期間全体のデータ】
- 総セッション数: ${metrics.sessions?.toLocaleString() || 0}回
- 総コンバージョン数: ${metrics.conversions?.toLocaleString() || 0}件${peakHours}

【要求事項】
- **800文字以内で簡潔にまとめる**（これは厳守してください）
- Markdownの見出し記法（##, ###）を使用して構造化
- **時間帯別のパターンを分析**：
  - アクセスのピーク時間帯（朝/昼/夕方/夜/深夜）を特定
  - CVが発生しやすい時間帯とCV率が高い時間帯を特定
  - アクセス数とCV率の相関関係を分析
- **パターンの原因を考察**：「なぜその時間帯にアクセス/CVが集中するか」をユーザーのライフスタイルから推測
  - 通勤時間帯、休憩時間、帰宅後、就寝前などの行動パターン
  - BtoB vs BtoCでの違い
- **具体的なアクションを1-3点提案**：
  - 【広告配信】：最も費用対効果が高い時間帯と入札調整（例：「19-22時に入札を+30%」）
  - 【コンテンツ投稿】：SNS投稿やメルマガ配信の最適な時刻（例：「毎日12時にSNS投稿」）
  - 【リアルタイム対応】：問い合わせやチャット対応の優先時間帯
  - 【リターゲティング】：CVが高い時間帯に集中配信
  - 各提案の実施方法と期待ROIを明示
- 数値の羅列ではなく、「何時に、何をすべきか」を具体的に記述
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

  if (pageType === 'users') {
    // ユーザー属性データの整形
    let demographicsText = '';
    if (metrics.demographicsData) {
      const demo = metrics.demographicsData;
      demographicsText = '\n\n【ユーザー属性の分布】\n';
      
      // 年齢層
      if (demo.ageGroups && demo.ageGroups.length > 0) {
        demographicsText += '年齢層トップ3:\n';
        demo.ageGroups.slice(0, 3).forEach(age => {
          demographicsText += `- ${age.age}: ${age.percentage?.toFixed(1) || 0}% (${age.users?.toLocaleString() || 0}人)\n`;
        });
      }
      
      // 性別
      if (demo.genders && demo.genders.length > 0) {
        demographicsText += '性別分布:\n';
        demo.genders.forEach(gender => {
          demographicsText += `- ${gender.gender}: ${gender.percentage?.toFixed(1) || 0}% (${gender.users?.toLocaleString() || 0}人)\n`;
        });
      }
      
      // デバイス
      if (demo.devices && demo.devices.length > 0) {
        demographicsText += 'デバイス分布:\n';
        demo.devices.forEach(device => {
          demographicsText += `- ${device.device}: ${device.percentage?.toFixed(1) || 0}% (${device.users?.toLocaleString() || 0}人)\n`;
        });
      }
    }

    return `
あなたはターゲティング戦略とペルソナ設計の専門家です。${period}のWebサイトのユーザー属性データを分析し、**ターゲット層の特定とマーケティング施策の最適化に役立つビジネスインサイト**を含む日本語の要約を**必ず800文字以内**で生成してください。

【ユーザー属性データ】${demographicsText}

【要求事項】
- **800文字以内で簡潔にまとめる**（これは厳守してください）
- Markdownの見出し記法（##, ###）を使用して構造化
- **主要ターゲット層を特定**：
  - 最もボリュームの多い年齢層・性別・デバイスの組み合わせ
  - CVに貢献している属性セグメント
  - 意外性のある属性（想定外のユーザー層）
- **ターゲット層の行動特性を考察**：「なぜそのユーザー層が訪問するか」をサイトの特性から推測
- **具体的なアクションを1-3点提案**：
  - 【ターゲティング広告】：主要ターゲット層に最適化した広告配信設定（年齢・性別・デバイス指定）
  - 【コンテンツ最適化】：ターゲット層のニーズに合わせたコンテンツ改善（言葉遣い、デザイン、情報量など）
  - 【デバイス最適化】：主要デバイスでのUX改善（モバイルファーストなど）
  - 【新規開拓】：弱いセグメントの獲得戦略（未開拓の年齢層へのアプローチ）
  - 各提案の優先順位とビジネスインパクトを明示
- 数値の羅列ではなく、「誰に、何を、どう訴求すべきか」を明確に記述
`;
  }

  if (pageType === 'reverseFlow') {
    // 逆引き分析データの整形
    let reverseFlowText = '';
    if (metrics.summary) {
      const summary = metrics.summary;
      reverseFlowText = `\n\n【コンバージョン導線の概要】
- 総コンバージョン数: ${summary.totalConversions?.toLocaleString() || 0}件
- CV前に閲覧されたページ総数: ${summary.totalPages?.toLocaleString() || 0}ページ
- 平均閲覧ページ数: ${summary.avgPagesBeforeConversion?.toFixed(1) || 0}ページ`;
    }
    
    const conversionInfo = formatConversionInfo();

    return `
あなたはコンバージョン最適化（CRO）の専門家です。${period}のWebサイトでコンバージョンに至ったユーザーの行動導線を分析し、**CVR向上に直結する改善施策に役立つビジネスインサイト**を含む日本語の要約を**必ず800文字以内**で生成してください。
${conversionInfo}

【逆引き分析データ】${reverseFlowText}

【要求事項】
- **800文字以内で簡潔にまとめる**（これは厳守してください）
- Markdownの見出し記法（##, ###）を使用して構造化
- **コンバージョンパスの特徴を分析**：
  - CV前によく閲覧されるページ（上位3-5ページ）を特定
  - CV直前のページ（ラストタッチページ）の傾向
  - 平均閲覧ページ数から導線の長さを評価
- **CVに貢献しているページの役割を考察**：「なぜそのページがCV貢献度が高いか」を推測
  - 情報提供型（製品詳細、事例紹介など）
  - 信頼構築型（会社概要、お客様の声など）
  - 行動喚起型（料金案内、キャンペーンページなど）
- **具体的なアクションを1-3点提案**：
  - 【CV貢献ページの強化】：アクセス増加施策（内部リンク強化、SEO対策など）
  - 【導線改善】：CV貢献ページへの誘導強化（CTA配置、関連記事リンクなど）
  - 【コンテンツ改善】：CV貢献ページの情報充実（追加すべき情報、削除すべき障壁）
  - 【新規ページ作成】：導線に不足しているページの追加提案
  - 各提案の実装難易度とCVRへのインパクトを明示
- 数値の羅列ではなく、「どのページを、どう改善すべきか」を具体的に記述
`;
  }

  // その他のページタイプ用のデフォルト
  return `
あなたはWebサイト分析の専門家です。${period}のデータを分析し、**ビジネス改善に役立つ具体的なアクション**を含む日本語の要約を**必ず800文字以内**で生成してください。

【データ】
${JSON.stringify(metrics, null, 2)}

【要求事項】
- **800文字以内で簡潔にまとめる**（これは厳守してください）
- Markdownの見出し記法（##, ###）を使用して構造化
- **データから主要なトレンドや特徴を3-5点抽出**
- **トレンドの原因を考察**：「なぜそうなったか」の視点で記述
- **具体的なアクションを1-3点提案**：
  - 各提案の実施方法と期待効果を明示
  - 優先順位とビジネスインパクトを明確化
- 数値の羅列ではなく、「次に何をすべきか」を明確に記述
`;
}


