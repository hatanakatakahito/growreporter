import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { checkCanGenerate, incrementGenerationCount } from '../utils/planManager.js';
import { getCachedAnalysis, saveCachedAnalysis } from '../utils/aiCacheManager.js';
import { buildPrompt } from '../utils/aiPromptBuilder.js';

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
    // 1. usage typeを先に決定（制限チェックで使用）
    const usageType = pageType === 'comprehensive_improvement' ? 'improvement' : 'summary';

    // 2. キャッシュチェック（強制再生成でない場合）
    if (!forceRegenerate) {
      const cachedAnalysis = await getCachedAnalysis(userId, siteId, pageType, startDate, endDate);
      if (cachedAnalysis) {
        console.log('[generateAISummary] Cache hit (aiAnalysisCache):', cachedAnalysis.cacheId);
        
        // キャッシュがある場合でも、現在の制限を確認
        // （プラン変更等で制限が変わっている可能性があるため）
        const canGenerate = await checkCanGenerate(userId, usageType);
        if (!canGenerate) {
          console.log('[generateAISummary] キャッシュはあるが制限超過:', userId, usageType);
          const limitTypeName = usageType === 'improvement' ? 'AI改善提案' : 'AI分析サマリー';
          throw new HttpsError(
            'resource-exhausted',
            `今月の${limitTypeName}の上限に達しました。来月1日に自動的にリセットされます。`
          );
        }
        
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
        
        // キャッシュがある場合でも、現在の制限を確認
        const canGenerate = await checkCanGenerate(userId, usageType);
        if (!canGenerate) {
          console.log('[generateAISummary] 旧キャッシュはあるが制限超過:', userId, usageType);
          const limitTypeName = usageType === 'improvement' ? 'AI改善提案' : 'AI分析サマリー';
          throw new HttpsError(
            'resource-exhausted',
            `今月の${limitTypeName}の上限に達しました。来月1日に自動的にリセットされます。`
          );
        }
        
        return {
          summary: cachedSummary.summary,
          recommendations: cachedSummary.recommendations || [],
          fromCache: true,
          generatedAt: cachedSummary.generatedAt,
        };
      }
    }

    // 3. プラン制限チェック（新規生成時）
    const canGenerate = await checkCanGenerate(userId, usageType);
    if (!canGenerate) {
      console.log('[generateAISummary] プラン制限超過（新規生成）:', userId, usageType);
      const limitTypeName = usageType === 'improvement' ? 'AI改善提案' : 'AI分析サマリー';
      throw new HttpsError(
        'resource-exhausted',
        `今月の${limitTypeName}の上限に達しました。来月1日に自動的にリセットされます。`
      );
    }

    // 4. Gemini APIキーの確認
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      console.error('[generateAISummary] GEMINI_API_KEY not configured');
      throw new HttpsError(
        'failed-precondition',
        'Gemini API key is not configured'
      );
    }

    // 5. プロンプト生成
    const prompt = generatePrompt(pageType, startDate, endDate, metrics);

    // 6. Gemini API呼び出し
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

    console.log('[generateAISummary] Summary generated successfully - 文字数:', rawSummary.length);
    console.log('[generateAISummary] AIの生テキスト (先頭500文字):', rawSummary.substring(0, 500));

    // 推奨アクションの抽出
    const recommendations = extractRecommendations(rawSummary, pageType);
    console.log('[generateAISummary] 抽出された推奨施策数:', recommendations.length);
    
    // AI生成テキストから「アクションプラン」セクションを削除（重複を防ぐため）
    const summary = removeActionPlanSection(rawSummary, pageType);
    console.log('[generateAISummary] サマリー文字数:', summary.length);

    // 7. 新しいキャッシュシステムに保存
    const now = new Date();
    await saveCachedAnalysis(userId, siteId, pageType, summary, recommendations, startDate, endDate);
    
    // 8. 旧システムにも保存（互換性のため、将来的に削除予定）
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

    // 9. 生成回数をインクリメント
    // usageTypeは前で定義済み
    await incrementGenerationCount(userId, usageType);
    console.log('[generateAISummary] Generation count incremented:', usageType);

    // 10. 古いキャッシュをクリーンアップ（非同期）
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
 * comprehensive_improvement用の改善施策抽出
 * 形式: タイトル:、説明:、カテゴリー:、優先度:、期待効果: を解析
 */
function extractImprovementRecommendations(summary) {
  console.log('[extractImprovementRecommendations] 開始 - 入力テキスト長:', summary.length);
  const recommendations = [];
  
  // "---"で区切られたブロックに分割
  const blocks = summary.split(/---+/);
  console.log('[extractImprovementRecommendations] ブロック数:', blocks.length);
  
  blocks.forEach((block, blockIndex) => {
    const lines = block.trim().split('\n');
    let currentRec = {};
    
    lines.forEach((line) => {
      const trimmedLine = line.trim();
      
      // 各フィールドを抽出
      if (trimmedLine.startsWith('タイトル:')) {
        currentRec.title = trimmedLine.substring('タイトル:'.length).trim();
      } else if (trimmedLine.startsWith('説明:')) {
        currentRec.description = trimmedLine.substring('説明:'.length).trim();
      } else if (trimmedLine.startsWith('カテゴリー:')) {
        const category = trimmedLine.substring('カテゴリー:'.length).trim().toLowerCase();
        currentRec.category = category;
      } else if (trimmedLine.startsWith('優先度:')) {
        const priority = trimmedLine.substring('優先度:'.length).trim().toLowerCase();
        currentRec.priority = priority;
      } else if (trimmedLine.startsWith('期待効果:')) {
        currentRec.expectedImpact = trimmedLine.substring('期待効果:'.length).trim();
      } else if (currentRec.description && trimmedLine && !trimmedLine.startsWith('タイトル:') && !trimmedLine.startsWith('説明:') && !trimmedLine.startsWith('カテゴリー:') && !trimmedLine.startsWith('優先度:') && !trimmedLine.startsWith('期待効果:')) {
        // 説明文が複数行にわたる場合は追加
        currentRec.description += ' ' + trimmedLine;
      }
    });
    
    // 必須フィールドがすべて揃っている場合のみ追加
    if (currentRec.title && currentRec.description && currentRec.category && currentRec.priority) {
      console.log(`[extractImprovementRecommendations] ブロック${blockIndex}をパース成功:`, currentRec.title);
      recommendations.push(currentRec);
    } else {
      console.log(`[extractImprovementRecommendations] ブロック${blockIndex}をスキップ - 不足フィールド:`, {
        hasTitle: !!currentRec.title,
        hasDescription: !!currentRec.description,
        hasCategory: !!currentRec.category,
        hasPriority: !!currentRec.priority,
      });
    }
  });
  
  console.log('[extractImprovementRecommendations] 抽出完了:', recommendations.length, '件');
  
  // もし抽出できなかった場合は、一般的な抽出関数を試す（フォールバック）
  if (recommendations.length === 0) {
    console.warn('[extractImprovementRecommendations] 「タイトル:」形式で抽出できませんでした。番号付きリスト形式を試します。');
    console.warn('[extractImprovementRecommendations] AIの生テキスト (先頭1000文字):', summary.substring(0, 1000));
    
    // 一般的な抽出関数（番号付きリスト対応）にフォールバック
    const fallbackRecommendations = extractRecommendationsFromNumberedList(summary);
    console.log('[extractImprovementRecommendations] フォールバック抽出完了:', fallbackRecommendations.length, '件');
    return fallbackRecommendations;
  }
  
  return recommendations;
}

/**
 * 番号付きリストから改善施策を抽出（フォールバック用）
 */
function extractRecommendationsFromNumberedList(summary) {
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
        expectedImpact: '',
      };
      itemIndex++;
    } else if (currentRecommendation && trimmedLine && !trimmedLine.startsWith('-')) {
      // 現在の推奨アクションの説明文を追加
      // ただし、箇条書き（-で始まる）は除外
      currentRecommendation.description += (currentRecommendation.description ? ' ' : '') + trimmedLine.replace(/\*\*/g, '');
    }
  });
  
  // 最後の推奨アクションを保存
  if (currentRecommendation) {
    recommendations.push(currentRecommendation);
  }
  
  console.log('[extractRecommendationsFromNumberedList] 番号付きリストから抽出:', recommendations.length, '件');
  return recommendations;
}

/**
 * AI分析結果から推奨アクションを抽出
 * セクション見出しに依存せず、番号付きリスト（1., 2., 3.など）を直接検出
 */
function extractRecommendations(summary, pageType) {
  // comprehensive_improvementの場合は専用の抽出処理
  if (pageType === 'comprehensive_improvement') {
    return extractImprovementRecommendations(summary);
  }
  
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
function removeActionPlanSection(text, pageType) {
  // comprehensive_improvementの場合は「### 選択した施策ID」セクション以降を削除
  if (pageType === 'comprehensive_improvement') {
    const lines = text.split('\n');
    const resultLines = [];
    
    for (let i = 0; i < lines.length; i++) {
      const trimmedLine = lines[i].trim();
      
      // 「選択した施策ID」「推奨改善施策」「おすすめの改善施策」セクションを検出したら、そこで終了
      if (trimmedLine.includes('選択した施策') || 
          trimmedLine.includes('推奨改善施策') || 
          trimmedLine.includes('おすすめの改善施策')) {
        break;
      }
      
      resultLines.push(lines[i]);
    }
    
    return resultLines.join('\n').trim();
  }
  
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

  // ✅ 16種類の分析ページタイプは共通化プロンプトを使用
  const TARGET_PAGE_TYPES = [
    'dashboard', 'summary', 'users', 'day', 'week', 'hour',
    'channels', 'keywords', 'referrals', 'pages', 'pageCategories',
    'landingPages', 'fileDownloads', 'externalLinks', 'conversions', 'reverseFlow'
  ];

  if (TARGET_PAGE_TYPES.includes(pageType) && pageType !== 'comprehensive_improvement') {
    return buildPrompt(pageType, metrics, period);
  }

  // ✅ comprehensive_improvementは既存の個別プロンプト処理へ（下部で定義）

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
あなたは中長期的なトレンド分析の専門家です。${period}のWebサイトパフォーマンスを13ヶ月の推移データと合わせて分析し、**成長トレンドの特定と今後の戦略に役立つビジネスインサイト**を含む日本語の要約を**必ず800文字以内**で生成してください。

【現在期間のデータ】
- 総ユーザー数: ${metrics.users?.toLocaleString() || metrics.totalUsers?.toLocaleString() || 0}人
- セッション数: ${metrics.sessions?.toLocaleString() || 0}回
- ページビュー数: ${metrics.pageViews?.toLocaleString() || metrics.screenPageViews?.toLocaleString() || 0}回
- エンゲージメント率: ${((metrics.engagementRate || 0) * 100).toFixed(1)}%
- コンバージョン数: ${metrics.conversions?.toLocaleString() || 0}件${monthlyTrendText}

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

    return `
あなたはコンバージョン最適化（CRO）の専門家です。${period}のWebサイトでコンバージョンに至ったユーザーの行動導線を分析し、**CVR向上に直結する改善施策に役立つビジネスインサイト**を含む日本語の要約を**必ず800文字以内**で生成してください。

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

  if (pageType === 'comprehensive_improvement') {
    // 包括的改善案生成用のプロンプト
    // データ範囲: 過去365日
    // 分析重点: 直近30日

    // 月次トレンドデータの整形
    let monthlyTrendText = '';
    if (metrics.monthlyTrend && metrics.monthlyTrend.monthlyData && Array.isArray(metrics.monthlyTrend.monthlyData)) {
      const monthlyData = metrics.monthlyTrend.monthlyData;
      monthlyTrendText = '\n\n【過去13ヶ月の推移】\n';
      monthlyData.forEach(month => {
        monthlyTrendText += `- ${month.month}: ユーザー${month.users?.toLocaleString() || 0}人, セッション${month.sessions?.toLocaleString() || 0}回, CV${month.conversions?.toLocaleString() || 0}件\n`;
      });
    }

    // 直近30日のサマリー
    const recent30Days = metrics.summary?.metrics || {};
    let conversionDetails = '';
    if (recent30Days.conversions && typeof recent30Days.conversions === 'object') {
      const cvList = Object.entries(recent30Days.conversions)
        .map(([name, count]) => `  - ${name}: ${count}件`)
        .join('\n');
      conversionDetails = `\n${cvList}`;
    }
    const recentSummaryText = `
【直近30日のサマリー（${startDate} 〜 ${endDate}）】
- ユーザー数: ${recent30Days.totalUsers?.toLocaleString() || 0}人
- セッション数: ${recent30Days.sessions?.toLocaleString() || 0}回
- ページビュー数: ${recent30Days.screenPageViews?.toLocaleString() || 0}回
- エンゲージメント率: ${((recent30Days.engagementRate || 0) * 100).toFixed(1)}%
- コンバージョン数: ${recent30Days.totalConversions?.toLocaleString() || 0}件${conversionDetails}
`;

    // 集客チャネル
    let channelsText = '';
    if (metrics.channels && Array.isArray(metrics.channels) && metrics.channels.length > 0) {
      channelsText = '\n\n【集客チャネル（直近30日）】\n';
      metrics.channels.slice(0, 5).forEach(channel => {
        channelsText += `- ${channel.channel}: セッション${channel.sessions?.toLocaleString() || 0}回, CV${channel.conversions?.toLocaleString() || 0}件\n`;
      });
    }

    // 人気ランディングページ
    let landingPagesText = '';
    if (metrics.landingPages && Array.isArray(metrics.landingPages) && metrics.landingPages.length > 0) {
      landingPagesText = '\n\n【人気ランディングページ（直近30日、トップ5）】\n';
      metrics.landingPages.slice(0, 5).forEach(page => {
        landingPagesText += `- ${page.page}: セッション${page.sessions?.toLocaleString() || 0}回, ENG率${(page.engagementRate * 100).toFixed(1)}%, CV${page.conversions?.toLocaleString() || 0}件\n`;
      });
    }

    // ページ別データ
    let pagesText = '';
    if (metrics.pages && Array.isArray(metrics.pages) && metrics.pages.length > 0) {
      pagesText = '\n\n【ページ別アクセス（直近30日、トップ10）】\n';
      metrics.pages.slice(0, 10).forEach(page => {
        pagesText += `- ${page.path}: PV${page.pageViews?.toLocaleString() || 0}, ユーザー${page.users?.toLocaleString() || 0}人, CV${page.conversions?.toLocaleString() || 0}件\n`;
      });
    }

    // ページ分類別データ
    let pageCategoriesText = '';
    if (metrics.pageCategories && Array.isArray(metrics.pageCategories) && metrics.pageCategories.length > 0) {
      pageCategoriesText = '\n\n【ページ分類別（直近30日、トップ5）】\n';
      metrics.pageCategories.slice(0, 5).forEach(category => {
        pageCategoriesText += `- ${category.category}: PV${category.pageViews?.toLocaleString() || 0}, ユーザー${category.users?.toLocaleString() || 0}人, ENG率${(category.engagementRate * 100).toFixed(1)}%\n`;
      });
    }

    // 月次コンバージョンデータ
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

    // 改善施策ナレッジベース（スプレッドシートから取得）
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

## 分析サマリー

（800文字以内。過去1年のトレンドを踏まえ、直近30日を分析。ビジネスインサイトを提供。改善施策は含めない。**必ず具体的な数値を含めてください**）

【必須の分析要素】
1. **直近30日の主要指標**（具体的な数値を明記）
   - ユーザー数、セッション数、PV数、エンゲージメント率
   - コンバージョン数、コンバージョン率
   - コンバージョンの内訳と件数

2. **前月比の分析**（増減率を％で表示）
   - 各指標の前月との比較
   - 増減の傾向を明確に

3. **前年同月比の分析**（可能な場合）
   - 1年前の同時期との比較
   - 季節性の影響を考慮

4. **過去13ヶ月のトレンド**
   - 最高値・最低値の月と数値
   - 全体的な傾向（上昇・下降・横ばい）

5. **原因の仮説**（必須）
   - なぜこのような結果になったのか、データから読み取れる原因を2-3点挙げる
   - 例：季節要因、マーケティング施策の影響、市場環境の変化など

【記載例】
- 「直近30日のセッション数は10,471回（前月10,991回から-4.7％、前年同月比+15.2％）」
- 「コンバージョン率は1.19％（前月0.94％から+0.25ポイント改善）」
- 「原因として、①季節的な閑散期、②広告予算の削減、③競合サイトの台頭などが考えられます」

### 選択した施策ID

施策ID: [選択したID], [選択したID], [選択したID]（3〜5件）

### 推奨改善施策

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
## 分析サマリー

**過去13ヶ月のトレンド**
2月に最高値（ユーザー数14,795人、セッション数18,232回）を記録した後、増減を繰り返しています。最低値は6月（ユーザー数4,203人、セッション数5,891回）でした。

**直近30日（2025年10月7日〜2025年11月6日）の実績**
- ユーザー数: 8,163人（前月8,632人から-5.4％、前年同月比+12.3％）
- セッション数: 10,471回（前月10,991回から-4.7％、前年同月比+15.8％）
- ページビュー数: 26,800回（前月比-3.2％）
- エンゲージメント率: 59.4％（前月61.2％から-1.8ポイント）
- コンバージョン数: 125件（前月103件から+21.4％）
- コンバージョン率: 1.19％（前月0.94％から+0.25ポイント改善）

**コンバージョン内訳**
資料請求申込完了86件（68.8％）、入居のお申込完了21件（16.8％）、見学のお申込完了18件（14.4％）

**原因の仮説**
前月比でユーザー数とセッション数が減少している主な原因として、①11月の季節的な閑散期に入ったこと、②広告キャンペーンの終了、③競合サイトのプロモーション強化が考えられます。一方で、コンバージョン率が大幅に改善している点は、サイト内のCTA改善やコンテンツ最適化の効果が表れていると推測されます。前年同月比ではプラス成長を維持しており、中長期的には順調な成長トレンドにあると言えます。

### 選択した施策ID
施策ID: 15, 42, 78, 103

### 推奨改善施策

タイトル: メタディスクリプションの最適化
説明: 主要ページのメタディスクリプションを検索意図に沿った内容に書き換え、クリック率を改善します
カテゴリー: acquisition
優先度: high
期待効果: オーガニック流入の増加

---

（以下同様）
`;
  }

  // デフォルト（未対応のpageType）
  return `
あなたはWebサイト分析の専門家です。${period}のWebサイトデータを分析し、ビジネスインサイトを含む日本語の要約を800文字以内で生成してください。

【要求事項】
- **800文字以内で簡潔にまとめる**
- 数値の羅列ではなく、ビジネス判断に役立つインサイトを提供
- 具体的なアクションを1-3点提案
`;
}


