import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { checkCanGenerate, incrementGenerationCount } from '../utils/planManager.js';
import { getCachedAnalysis, saveCachedAnalysis } from '../utils/aiCacheManager.js';
import { getActivePromptTemplate, incrementPromptUsage } from '../utils/promptManager.js';

/**
 * AI要約生成 Callable Function
 * Gemini 2.5 Flash Liteを使用してGA4データの要約を生成
 * @param {object} request - リクエストオブジェクト
 * @returns {Promise<object>} - 生成された要約
 * 
 * パラメータ: siteId, pageType, metrics, startDate, endDate
 */
export async function generateAISummaryCallable(request) {
  const db = getFirestore();
  const { siteId, pageType, startDate, endDate, metrics, rawData, forceRegenerate = false } = request.data;

  // 入力バリデーション
  if (!siteId || !pageType || !startDate || !endDate) {
    throw new HttpsError(
      'invalid-argument',
      'siteId, pageType, startDate, endDate are required'
    );
  }
  
  // rawDataもmetricsも渡されていない場合はエラー
  if (!metrics && !rawData) {
    throw new HttpsError(
      'invalid-argument',
      'metrics or rawData is required'
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

    // 5. メトリクスの準備（新方式・旧方式の両対応）
    let finalMetrics;
    
    if (rawData) {
      // ✅ 新方式：rawDataが渡されている場合は変換
      console.log('[generateAISummary] 新方式: rawDataをmetricsに変換');
      finalMetrics = formatRawDataToMetrics(rawData, pageType);
      console.log('[generateAISummary] 変換後のメトリクス keys:', Object.keys(finalMetrics));
    } else {
      // ❌ 旧方式：metricsが直接渡されている場合（後方互換性）
      console.log('[generateAISummary] 旧方式: フロントから受け取ったmetricsを使用');
      finalMetrics = metrics;
    }
    
    // 6. プロンプト生成
    console.log('[generateAISummary] メトリクスデータ:', JSON.stringify(finalMetrics, null, 2));
    const prompt = await generatePrompt(db, pageType, startDate, endDate, finalMetrics);
    console.log('[generateAISummary] 生成されたプロンプト (先頭500文字):', prompt.substring(0, 500));

    // 7. Gemini API呼び出し
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
    console.log('[generateAISummary] Gemini APIレスポンス:', JSON.stringify(data, null, 2));
    
    let rawSummary = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!rawSummary || rawSummary.trim().length === 0) {
      console.error('[generateAISummary] AI生成結果が空です');
      console.error('[generateAISummary] Gemini レスポンス全体:', JSON.stringify(data, null, 2));
      throw new HttpsError(
        'internal',
        'AI分析の生成に失敗しました。データが不足している可能性があります。'
      );
    }

    console.log('[generateAISummary] Summary generated successfully - 文字数:', rawSummary.length);
    console.log('[generateAISummary] AIの生テキスト (先頭500文字):', rawSummary.substring(0, 500));

    // 推奨アクションの抽出
    const recommendations = extractRecommendations(rawSummary, pageType);
    console.log('[generateAISummary] 抽出された推奨施策数:', recommendations.length);
    
    // AI生成テキストから「アクションプラン」セクションを削除（重複を防ぐため）
    const summary = removeActionPlanSection(rawSummary, pageType);
    console.log('[generateAISummary] サマリー文字数:', summary.length);
    
    if (!summary || summary.trim().length === 0) {
      console.error('[generateAISummary] サマリーが空です（アクションセクション削除後）');
      console.error('[generateAISummary] 元のrawSummary:', rawSummary);
      throw new HttpsError(
        'internal',
        'AI分析の要約生成に失敗しました'
      );
    }

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
 * Cloud Functionの生データ（rawData）をAI分析用のメトリクスに変換
 * @param {object} rawData - フロント画面で取得したCloud Functionの生データ
 * @param {string} pageType - ページタイプ
 * @returns {object} AI分析用のメトリクス
 */
function formatRawDataToMetrics(rawData, pageType) {
  console.log(`[formatRawDataToMetrics] ページタイプ: ${pageType}`);
  console.log(`[formatRawDataToMetrics] rawData keys:`, Object.keys(rawData || {}));

  if (!rawData || typeof rawData !== 'object') {
    console.warn('[formatRawDataToMetrics] rawDataが不正です:', rawData);
    return {};
  }

  switch (pageType) {
    case 'day':
      // 日別分析：fetchGA4DailyConversionData の結果
      return {
        sessions: rawData.rows?.reduce((sum, row) => sum + (row.sessions || 0), 0) || 0,
        conversions: rawData.rows?.reduce((sum, row) => sum + (row.conversions || 0), 0) || 0,
        dailyData: rawData.rows || [],
        dailyDataCount: rawData.rows?.length || 0,
        hasConversionDefinitions: rawData.hasConversionEvents || false,
        conversionEventNames: rawData.conversionEventNames || [],
      };

    case 'week':
      // 曜日別分析：fetchGA4WeeklyConversionData の結果
      const weekSessions = rawData.rows?.reduce((sum, row) => sum + (row.sessions || 0), 0) || 0;
      const weekConversions = rawData.rows?.reduce((sum, row) => sum + (row.conversions || 0), 0) || 0;
      return {
        sessions: weekSessions,
        conversions: weekConversions,
        weeklyData: rawData.rows || [],
        totalDataPoints: rawData.rows?.length || 0,
        hasConversionDefinitions: rawData.hasConversionEvents || false,
        conversionEventNames: rawData.conversionEventNames || [],
      };

    case 'hour':
      // 時間帯別分析：fetchGA4HourlyConversionData の結果
      const hourSessions = rawData.rows?.reduce((sum, row) => sum + (row.sessions || 0), 0) || 0;
      const hourConversions = rawData.rows?.reduce((sum, row) => sum + (row.conversions || 0), 0) || 0;
      return {
        sessions: hourSessions,
        conversions: hourConversions,
        hourlyData: rawData.rows || [],
        hourlyDataCount: rawData.rows?.length || 0,
        hasConversionDefinitions: rawData.hasConversionEvents || false,
        conversionEventNames: rawData.conversionEventNames || [],
      };

    case 'dashboard':
    case 'summary':
      // ダッシュボード・サマリー
      // rawDataがすでに整形済みの形式で来る想定
      return {
        users: rawData.users || rawData.totalUsers || 0,
        newUsers: rawData.newUsers || 0,
        sessions: rawData.sessions || 0,
        pageViews: rawData.pageViews || rawData.screenPageViews || 0,
        conversions: rawData.conversions || rawData.totalConversions || 0,
        engagementRate: rawData.engagementRate || 0,
        bounceRate: rawData.bounceRate || 0,
        avgSessionDuration: rawData.avgSessionDuration || 0,
        conversionRate: rawData.conversionRate || 0,
        conversionBreakdown: rawData.conversionBreakdown || {},
        monthOverMonth: rawData.monthOverMonth || null,
        monthlyData: rawData.monthlyData || [],
        kpiData: rawData.kpiData || [],
        hasConversionDefinitions: rawData.hasConversionEvents || rawData.hasConversionDefinitions || false,
        hasKpiSettings: rawData.hasKpiSettings || false,
      };

    case 'users':
      // ユーザー属性分析
      return {
        totalUsers: rawData.totalUsers || 0,
        totalSessions: rawData.totalSessions || 0,
        demographicsData: rawData.demographicsData || null,
        hasConversionDefinitions: rawData.hasConversionEvents || false,
        conversionEventNames: rawData.conversionEventNames || [],
      };

    case 'reverseFlow':
      // 逆算フロー分析
      return {
        flowName: rawData.flowName || 'フロー名未設定',
        formPagePath: rawData.formPagePath || '未設定',
        targetCvEvent: rawData.targetCvEvent || '未設定',
        totalSiteViews: rawData.totalSiteViews || 0,
        formPageViews: rawData.formPageViews || 0,
        submissionComplete: rawData.submissionComplete || 0,
        achievementRate1: rawData.achievementRate1 || 0,
        achievementRate2: rawData.achievementRate2 || 0,
        overallCVR: rawData.overallCVR || 0,
        monthlyData: rawData.monthlyData || [],
      };

    case 'channels':
      // 集客チャネル分析
      return {
        totalSessions: rawData.totalSessions || 0,
        totalUsers: rawData.totalUsers || 0,
        totalConversions: rawData.totalConversions || 0,
        channelCount: rawData.channelCount || 0,
        channelsText: rawData.channelsText || '',
        hasConversionDefinitions: rawData.hasConversionEvents || false,
        conversionEventNames: rawData.conversionEventNames || [],
      };

    case 'keywords':
      // 流入キーワード分析
      return {
        totalClicks: rawData.totalClicks || 0,
        totalImpressions: rawData.totalImpressions || 0,
        avgCTR: rawData.avgCTR || 0,
        avgPosition: rawData.avgPosition || 0,
        keywordCount: rawData.keywordCount || 0,
        topKeywordsText: rawData.topKeywordsText || '',
        hasGSCConnection: rawData.hasGSCConnection || false,
      };

    case 'referrals':
      // 参照元/メディア分析
      return {
        totalSessions: rawData.totalSessions || 0,
        totalUsers: rawData.totalUsers || 0,
        totalConversions: rawData.totalConversions || 0,
        avgConversionRate: rawData.avgConversionRate || 0,
        referralCount: rawData.referralCount || 0,
        topReferralsText: rawData.topReferralsText || '',
        hasConversionDefinitions: rawData.hasConversionEvents || false,
        conversionEventNames: rawData.conversionEventNames || [],
      };

    case 'landingPages':
      // ランディングページ分析
      return {
        totalSessions: rawData.totalSessions || 0,
        totalUsers: rawData.totalUsers || 0,
        totalConversions: rawData.totalConversions || 0,
        landingPageCount: rawData.landingPageCount || 0,
        topLandingPagesText: rawData.topLandingPagesText || '',
        hasConversionDefinitions: rawData.hasConversionEvents || false,
        conversionEventNames: rawData.conversionEventNames || [],
      };

    case 'pages':
      // ページ別分析
      return {
        totalPageViews: rawData.totalPageViews || 0,
        totalSessions: rawData.totalSessions || 0,
        totalUsers: rawData.totalUsers || 0,
        pageCount: rawData.pageCount || 0,
        topPagesText: rawData.topPagesText || '',
        hasConversionDefinitions: rawData.hasConversionEvents || false,
        conversionEventNames: rawData.conversionEventNames || [],
      };

    case 'pageCategories':
      // ページ分類別分析
      return {
        totalPageViews: rawData.totalPageViews || 0,
        categoryCount: rawData.categoryCount || 0,
        topCategoriesText: rawData.topCategoriesText || '',
        hasConversionDefinitions: rawData.hasConversionEvents || false,
        conversionEventNames: rawData.conversionEventNames || [],
      };

    case 'conversions':
      // コンバージョン一覧分析
      return {
        monthlyDataPoints: rawData.monthlyDataPoints || 0,
        conversionEventCount: rawData.conversionEventCount || 0,
        conversionSummaryText: rawData.conversionSummaryText || '',
      };

    case 'fileDownloads':
      // ファイルダウンロード分析
      return {
        totalDownloads: rawData.totalDownloads || 0,
        totalUsers: rawData.totalUsers || 0,
        downloadCount: rawData.downloadCount || 0,
        topFilesText: rawData.topFilesText || '',
        hasConversionDefinitions: rawData.hasConversionEvents || false,
        conversionEventNames: rawData.conversionEventNames || [],
      };

    case 'externalLinks':
      // 外部リンククリック分析
      return {
        totalClicks: rawData.totalClicks || 0,
        totalUsers: rawData.totalUsers || 0,
        clickCount: rawData.clickCount || 0,
        topLinksText: rawData.topLinksText || '',
        hasConversionDefinitions: rawData.hasConversionEvents || false,
        conversionEventNames: rawData.conversionEventNames || [],
      };

    case 'comprehensive_improvement':
      // 包括的改善案生成
      return {
        monthlyTrend: rawData.monthlyTrend || {},
        summary: rawData.summary || {},
        channels: rawData.channels || [],
        landingPages: rawData.landingPages || [],
        pages: rawData.pages || [],
        pageCategories: rawData.pageCategories || [],
        monthlyConversions: rawData.monthlyConversions || {},
        improvementKnowledge: rawData.improvementKnowledge || [],
      };

    default:
      // 未知のページタイプの場合はrawDataをそのまま返す
      console.warn(`[formatRawDataToMetrics] 未知のページタイプ: ${pageType}`);
      return rawData;
  }
}

/**
 * ページタイプに応じたプロンプトを生成
 */
async function generatePrompt(db, pageType, startDate, endDate, metrics) {
  const period = `${startDate}から${endDate}までの期間`;

  // 1. Firestoreからアクティブなプロンプトテンプレートを取得を試みる
  try {
    const customTemplate = await getActivePromptTemplate(db, pageType);
    
    if (customTemplate) {
      console.log(`[generatePrompt] Using custom template from Firestore for ${pageType}`);
      
      // プロンプト使用回数を記録（非同期・非ブロッキング）
      incrementPromptUsage(db, pageType).catch(err => {
        console.warn('[generatePrompt] Failed to increment usage:', err);
      });
      
      // テンプレート内の変数を評価して置換
      // ${period}, ${metrics.xxx} などの変数をそのまま評価
      try {
        // テンプレートで使用される変数を事前に計算
        const hasConversions = metrics.hasConversionDefinitions && metrics.conversionBreakdown && Object.keys(metrics.conversionBreakdown).length > 0;
        
        let conversionText = '';
        if (hasConversions) {
          conversionText = '\n- 総コンバージョン数: ' + (metrics.conversions?.toLocaleString() || 0) + '件';
          conversionText += '\n\n【コンバージョン内訳】';
          for (const [name, data] of Object.entries(metrics.conversionBreakdown)) {
            conversionText += `\n- ${name}: ${data.current?.toLocaleString() || 0}件 (前月比${data.monthChange >= 0 ? '+' : ''}${data.monthChange?.toFixed(1) || 0}%)`;
          }
          conversionText += '\n- コンバージョン率: ' + ((metrics.conversionRate || 0) * 100).toFixed(2) + '%';
        }
        
        let monthOverMonthText = '';
        if (metrics.monthOverMonth) {
          monthOverMonthText = '\n\n【前月比サマリー】';
          monthOverMonthText += '\n- ユーザー数: ' + (metrics.monthOverMonth.users?.current?.toLocaleString() || 0) + '人 (前月' + (metrics.monthOverMonth.users?.previous?.toLocaleString() || 0) + '人, ' + (metrics.monthOverMonth.users?.change >= 0 ? '+' : '') + (metrics.monthOverMonth.users?.change?.toFixed(1) || 0) + '%)';
          monthOverMonthText += '\n- セッション数: ' + (metrics.monthOverMonth.sessions?.current?.toLocaleString() || 0) + '回 (前月' + (metrics.monthOverMonth.sessions?.previous?.toLocaleString() || 0) + '回, ' + (metrics.monthOverMonth.sessions?.change >= 0 ? '+' : '') + (metrics.monthOverMonth.sessions?.change?.toFixed(1) || 0) + '%)';
          if (hasConversions) {
            monthOverMonthText += '\n- コンバージョン数: ' + (metrics.monthOverMonth.conversions?.current?.toLocaleString() || 0) + '件 (前月' + (metrics.monthOverMonth.conversions?.previous?.toLocaleString() || 0) + '件, ' + (metrics.monthOverMonth.conversions?.change >= 0 ? '+' : '') + (metrics.monthOverMonth.conversions?.change?.toFixed(1) || 0) + '%)';
          }
          monthOverMonthText += '\n- エンゲージメント率: ' + ((metrics.monthOverMonth.engagementRate?.current || 0) * 100).toFixed(1) + '% (前月' + ((metrics.monthOverMonth.engagementRate?.previous || 0) * 100).toFixed(1) + '%, ' + (metrics.monthOverMonth.engagementRate?.change >= 0 ? '+' : '') + (metrics.monthOverMonth.engagementRate?.change?.toFixed(1) || 0) + '%)';
        }
        
        let kpiText = '';
        if (metrics.hasKpiSettings && metrics.kpiData && metrics.kpiData.length > 0) {
          kpiText = '\n\n【KPI予実】';
          for (const kpi of metrics.kpiData) {
            if (kpi.name) { // nameがnullでない場合のみ追加
              kpiText += `\n- ${kpi.name}: 実績${kpi.actual?.toLocaleString() || 0}${kpi.unit || ''} / 目標${kpi.target?.toLocaleString() || 0}${kpi.unit || ''} (達成率${kpi.achievement?.toFixed(1) || 0}%)`;
            }
          }
        }
        
        // eval を安全に使用するため、Function コンストラクタを使用
        const templateFunction = new Function('period', 'metrics', 'startDate', 'endDate', 'hasConversions', 'conversionText', 'monthOverMonthText', 'kpiText', `return \`${customTemplate}\`;`);
        const renderedPrompt = templateFunction(period, metrics, startDate, endDate, hasConversions, conversionText, monthOverMonthText, kpiText);
        console.log('[generatePrompt] Custom template rendered successfully');
        return renderedPrompt;
      } catch (renderError) {
        console.warn('[generatePrompt] Failed to render custom template, falling back to default:', renderError);
        console.warn('[generatePrompt] Error details:', renderError.stack);
      }
    }
  } catch (error) {
    console.warn('[generatePrompt] Failed to fetch custom template, falling back to default:', error);
  }

  // 2. Firestoreにテンプレートがない場合、またはレンダリングに失敗した場合、デフォルトプロンプトを使用
  console.log(`[generatePrompt] Using default prompt for ${pageType}`);

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
    // CV定義の有無をチェック
    const hasConversions = metrics.hasConversionDefinitions === true;
    
    // 日別分析データの整形（統計情報のみ）
    let dailyStatsText = '';
    if (metrics.dailyData && Array.isArray(metrics.dailyData) && metrics.dailyData.length > 0) {
      const allDays = metrics.dailyData;
      
      // 最大・最小・平均を計算
      let maxSessions = 0, minSessions = Infinity;
      let maxDay = '', minDay = '';
      let totalSessions = 0;
      
      allDays.forEach(day => {
        const sessions = day.sessions || 0;
        totalSessions += sessions;
        if (sessions > maxSessions) {
          maxSessions = sessions;
          maxDay = day.date;
        }
        if (sessions < minSessions) {
          minSessions = sessions;
          minDay = day.date;
        }
      });
      
      const avgSessions = Math.round(totalSessions / allDays.length);
      dailyStatsText = `\n\n【日別データの統計】
- 最大: ${maxDay}（${maxSessions.toLocaleString()}セッション）
- 最小: ${minDay}（${minSessions.toLocaleString()}セッション）
- 平均: ${avgSessions.toLocaleString()}セッション/日
- 変動幅: ${((maxSessions - minSessions) / avgSessions * 100).toFixed(0)}%`;
    }

    // CV定義がない場合の警告文
    const conversionWarning = !hasConversions ? `\n\n⚠️ **注意**: コンバージョン定義が未設定です。サイト設定画面から設定すると、CV分析が可能になります。` : '';

    return `
あなたは【トラフィック変動分析の専門家】です。${period}のWebサイトの日別データを分析し、**ビジネスへの影響と実用的なインサイト**を含む日本語の要約を**必ず800文字以内**で生成してください。

【期間全体のデータ】
- 総セッション数: ${metrics.sessions?.toLocaleString() || 0}回
- 1日平均: ${metrics.sessions && dailyStatsText ? Math.round(metrics.sessions / (metrics.dailyData?.length || 30)).toLocaleString() : 0}回${hasConversions ? `
- 総コンバージョン数: ${metrics.conversions?.toLocaleString() || 0}件
- 全体CVR: ${(metrics.sessions > 0 ? ((metrics.conversions / metrics.sessions) * 100) : 0).toFixed(2)}%` : ''}${dailyStatsText}${conversionWarning}

【要求事項】
- **800文字以内で簡潔にまとめる**（これは厳守してください）
- Markdownの見出し記法（##, ###）を使用して構造化
- **必ず以下のセクションを含める**：全体概要、日別変動パターン、ビジネスへの影響、原因の考察

## 全体概要
- 総セッション数、1日平均、全体CVR（CV定義ありの場合）を数値で明示
- 変動の安定性を評価
- 例：「総セッション数11,250回、1日平均363回。変動幅65%で比較的安定している」

## 日別変動パターンの分析
- **最大日・最小日**：具体的な日付と数値を明示
  例：「10月15日（金）が最大で485セッション、10月3日（月）が最小で248セッション」
- **曜日による傾向**：各曜日の特徴を数値で示す
  例：「週末（土日）は平日比+32%で、平均で120セッション多い」
- **週次トレンド**：期間内での変化
  例：「第1週平均340回 → 第4週385回（+13.2%の増加傾向）」
${hasConversions ? `- **CVRと曜日の相関**：CVRが高い曜日/低い曜日の傾向を分析` : ''}

## ビジネスへの影響
- **トラフィックの安定性**：
  - 変動が大きい場合：「不安定なトラフィックは広告費の無駄や機会損失につながる可能性」
  - 変動が小さい場合：「安定したトラフィックは計画的な施策実行が可能」
- **曜日パターンの活用**：
  例：「特定曜日への集中は、施策タイミングの最適化が可能」
${hasConversions ? `- **CVRの変動**：
  例：「CVRが安定している場合は導線が機能、変動が大きい場合は要因分析が必要」` : ''}

## 原因の考察
**なぜこのような変動パターンが生じているか**（2-3つの仮説を提示）：
- 仮説1: 曜日効果（週末にアクセス増加/減少の傾向）
- 仮説2: イベント・キャンペーンの影響（特定日の急増など）
- 仮説3: 広告配信の波（広告予算配分や配信スケジュール）
${hasConversions ? '- 仮説4: CVに至るユーザーの検討期間（特定曜日に決断しやすい）' : ''}

【禁止事項】
- ❌ 統計値の羅列のみで終わる
- ❌ 数値を示さない抽象的な表現
- ❌ 「ビジネスへの影響」「原因の考察」セクションの欠落
`;
  }

  if (pageType === 'week') {
    // CV定義の有無をチェック
    const hasConversions = metrics.conversionEventNames && metrics.conversionEventNames.length > 0;
    const conversionNote = hasConversions ? `
- コンバージョン数: ${metrics.conversions?.toLocaleString() || 0}件` : '\n\n⚠️ **注意**: コンバージョン定義が未設定です。CV分析をご希望の場合、サイト設定画面から設定してください。';

    return `
あなたは【タイミング最適化分析の専門家】です。${period}のWebサイトの曜日×時間帯データを分析し、**マーケティング施策のタイミング最適化に役立つインサイト**を含む日本語の要約を**必ず800文字以内**で生成してください。

【曜日×時間帯のデータ概要】
- 総セッション数: ${metrics.sessions?.toLocaleString() || 0}回${conversionNote}
- 曜日×時間帯のヒートマップで傾向を可視化

【要求事項】
- **800文字以内で簡潔にまとめる**（これは厳守してください）
- Markdownの見出し記法（##, ###）を使用して構造化
- **必ず以下のセクションを含める**：全体パターン、ピークタイム分析、ビジネスへの影響、原因の考察

## 全体的なアクセスパターン
- **平日vs週末の比較**を数値で示す
  例：「平日平均380回/日、週末平均520回/日（週末が+36.8%多い）」
- **日中vs夜間の比較**を割合で示す
  例：「日中（9-17時）が全体の45%、夜間（19-23時）が35%を占める」

## ピークタイムの特定と分析
- **最大3つのピーク時間帯**を具体的な数値で明示
  例：「①火曜20時: 1,250セッション（全体の11.2%）
       ②木曜21時: 1,180セッション（10.6%）
       ③土曜14時: 1,120セッション（10.0%）」
- **ピーク時間帯の集中度**を評価
  例：「上位3時間帯で全体の31.8%を占める（高集中型）」
- **ユーザー行動パターンの推測**：
  - 通勤時間帯（7-9時）、昼休み（12-13時）、帰宅後（20-22時）のピーク分析
  - 平日日中が多い → BtoB寄り（業務時間中の閲覧）
  - 夜間・週末が多い → BtoC寄り（プライベート時間の閲覧）
${hasConversions ? `- **CVが発生しやすい時間帯**：
  CVRが高い曜日×時間帯を特定し、費用対効果を評価` : ''}

## ビジネスへの影響
- **リソース配分**：
  - ピーク時間帯への人的リソース集中の必要性（カスタマーサポート、チャット対応など）
  - デッドタイム（低アクセス時間帯）の効率的な活用
- **マーケティング効率**：
  - 集中度が高い場合：「特定時間帯に絞った施策で効率化が可能」
  - 分散している場合：「24時間対応や自動化の検討が有効」
${hasConversions ? `- **CV獲得効率**：
  CVRが高い時間帯は広告費用対効果（ROAS）が良好` : ''}

## 原因の考察
**なぜこのようなアクセスパターンが形成されているか**（2-3つの仮説を提示）：
- 仮説1: ターゲット層のライフスタイル
  例：「会社員が帰宅後（20-22時）に情報収集している」
- 仮説2: コンテンツ・商材の特性
  例：「BtoB商材で業務時間内（9-17時）に意思決定者が閲覧」
- 仮説3: 現在の広告配信設定の影響
  例：「特定時間帯への広告集中がアクセスパターンを形成」

【禁止事項】
- ❌ 「ピークタイムがある」程度の抽象的な記述
- ❌ 数値を示さない曖昧な表現
- ❌ 「ビジネスへの影響」「原因の考察」セクションの欠落
`;
  }

  if (pageType === 'hour') {
    // CV定義の有無をチェック
    const hasConversions = metrics.conversionEventNames && metrics.conversionEventNames.length > 0;
    
    // 時間帯別データの統計（簡略版）
    let peakHoursText = '';
    if (metrics.hourlyDataCount && metrics.hourlyDataCount > 0) {
      peakHoursText = `\n- 24時間のデータで分析`;
    }
    
    const conversionNote = hasConversions ? `
- コンバージョン数: ${metrics.conversions?.toLocaleString() || 0}件` : '\n\n⚠️ **注意**: コンバージョン定義が未設定です。CV分析をご希望の場合、サイト設定画面から設定してください。';

    return `
あなたは【24時間行動分析の専門家】です。${period}のWebサイトの時間帯別データを分析し、**時間軸でのユーザー行動理解とビジネスへの影響**を含む日本語の要約を**必ず800文字以内**で生成してください。

【時間帯別データの概要】
- 総セッション数: ${metrics.sessions?.toLocaleString() || 0}回${conversionNote}${peakHoursText}

【要求事項】
- **800文字以内で簡潔にまとめる**（これは厳守してください）
- Markdownの見出し記法（##, ###）を使用して構造化
- **必ず以下のセクションを含める**：全体分布、ピークとデッドタイム、ビジネスへの影響、原因の考察

## 全体的なアクセス分布
- **時間帯区分別の割合**を明示
  例：「朝（6-9時）: 8%、日中（10-17時）: 42%、夜（18-23時）: 38%、深夜（0-5時）: 12%」
- アクセスの偏りを評価
  例：「日中と夜間に集中し、深夜は低調」

## ピーク時間帯とデッドタイム
- **ピーク時間帯トップ3**を具体的な数値で特定
  例：「①20時: 1,450セッション（全体の12.9%）
       ②21時: 1,380セッション（12.3%）
       ③14時: 1,120セッション（10.0%）」
- **ピーク時間の集中度**を評価
  例：「上位3時間で全体の35%を占める（高集中型）」
- **デッドタイム**を特定
  例：「4-6時は平均50セッション/時で最も低調（全体の1.3%）」
- **ユーザー行動パターンの解釈**：
  - 通勤時間（7-9時）のアクセスが多い → モバイル利用が中心と推測
  - 昼休み（12-14時）のピーク → 休憩時間の閲覧
  - 夜間（20-22時）が最大 → 帰宅後のゆっくりした時間に閲覧
  - 深夜（0-5時）が極少 → 一般消費者向けコンテンツの特徴
${hasConversions ? `- **CVRが高い時間帯**：
  セッション単価の視点でCV効率を評価
  例：「14時はセッション少ないがCVR高く、費用対効果が良好」` : ''}

## ビジネスへの影響
- **リソース配分**：
  - ピーク時間帯への人的リソース集中（カスタマーサポート、チャット対応）
  - デッドタイムの活用（システムメンテナンス、データ処理など）
- **広告配信効率**：
  - ピーク時間は競争が激しく、デッドタイムは低コストで獲得可能
  - 時間帯別の入札調整で費用対効果を最適化
${hasConversions ? `- **CV獲得効率**：
  CVRが高い時間帯への予算集中で、全体のCV数増加が期待できる` : ''}

## 原因の考察
**なぜこのような時間分布になっているか**（2-3つの仮説を提示）：
- 仮説1: ターゲット層のライフスタイル
  例：「会社員が昼休みと帰宅後に閲覧している」
- 仮説2: 商材の特性
  例：「緊急性の低い商材で、じっくり検討できる夜間に閲覧が多い」
- 仮説3: 現在の広告配信スケジュール
  例：「特定時間帯への広告集中がアクセスパターンを形成」

【禁止事項】
- ❌ 時間ごとの数値羅列のみで終わる
- ❌ 数値を示さない抽象的な表現
- ❌ 「ビジネスへの影響」「原因の考察」セクションの欠落
`;
  }

  if (pageType === 'dashboard') {
    // コンバージョン定義の確認と内訳の整形
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
    
    // 前月比データの整形
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

    // KPI予実データの整形
    let kpiText = '';
    if (metrics.hasKpiSettings && metrics.kpiData && Array.isArray(metrics.kpiData) && metrics.kpiData.length > 0) {
      kpiText = '\n\n【KPI予実】';
      metrics.kpiData.forEach(kpi => {
        const achievementColor = kpi.achievement >= 100 ? '✅' : kpi.achievement >= 80 ? '⚠️' : '❌';
        kpiText += `\n- ${kpi.name}: 実績${kpi.actual?.toLocaleString() || 0}${kpi.unit || ''} / 目標${kpi.target?.toLocaleString() || 0}${kpi.unit || ''} (達成率${kpi.achievement.toFixed(1)}% ${achievementColor})`;
      });
    }

    return `
あなたは優秀なWebアクセスの解析士です。${period}のWebサイト全体のパフォーマンスを分析し、ビジネス成長に役立つ洞察を含む日本語の要約を**必ず800文字以内**で生成してください。

【現在期間の主要指標】
- 総ユーザー数: ${metrics.users?.toLocaleString() || 0}人
- 新規ユーザー数: ${metrics.newUsers?.toLocaleString() || 0}人
- セッション数: ${metrics.sessions?.toLocaleString() || 0}回
- ページビュー数: ${metrics.pageViews?.toLocaleString() || 0}回
- エンゲージメント率: ${((metrics.engagementRate || 0) * 100).toFixed(1)}%
- 直帰率: ${((metrics.bounceRate || 0) * 100).toFixed(1)}%
- 平均セッション時間: ${metrics.avgSessionDuration ? `${Math.floor(metrics.avgSessionDuration / 60)}分${Math.floor(metrics.avgSessionDuration % 60)}秒` : '0秒'}${conversionText}${hasConversions ? `\n- コンバージョン率: ${((metrics.conversionRate || 0) * 100).toFixed(2)}%` : ''}${monthOverMonthText}${kpiText}

【要求事項】
- **800文字以内で簡潔にまとめる**（これは厳守してください）
- Markdownの見出し記法（##, ###）を使用して構造化
- **必ず以下の4つのセクションを含める**：

## 概要
- 期間全体のパフォーマンスを2-3文で簡潔にまとめる
- 最も重要な指標（ユーザー、セッション、エンゲージメント率）の数値を明示
- ${hasConversions ? 'コンバージョン総数と主要イベントの概況' : ''}${metrics.hasKpiSettings ? '、KPI達成状況の全体像' : ''}を冒頭で述べる

## 直近のトレンド
- 前月比データから増減傾向を具体的な数値で分析
- 特に変化の大きい指標（±10%以上）を優先的に取り上げる
- ${hasConversions ? 'コンバージョン内訳の各イベントの前月比を具体的に分析' : '基本指標の前月比を分析'}

## 評価できる点
- 成長している指標、改善している指標を2-3点挙げる
- 数値と前月比を明示（例：「ユーザー数が前月比+15.2%で5,000人に増加」）
- ${metrics.hasKpiSettings ? 'KPI予実で達成率が高い項目（達成率80%以上）を具体的に評価' : '改善傾向にある指標を評価'}

## 改善に向けた仮説
- 課題となっている指標とその原因仮説を2-3点提示
- ${metrics.hasKpiSettings ? 'KPI予実で未達成の項目（達成率80%未満）について、改善の方向性を具体的に示唆' : '低下傾向の指標について改善案を提示'}
- 具体的で実行可能な改善アプローチを提案

【禁止事項】
- ❌ 数値の羅列のみで終わる
- ❌ 抽象的な表現（「多い」「少ない」など）のみで数値を示さない
- ❌ 4つのセクション（概要、直近のトレンド、評価できる点、改善に向けた仮説）の欠落
- ❌ ${hasConversions ? '提供されたコンバージョン内訳データを無視する' : 'コンバージョンについて言及する（未設定のため）'}
`;
  }

  if (pageType === 'users') {
    // ユーザー属性データの整形
    let demographicsText = '';
    let hasDeviceData = false;
    let hasLocationData = false;
    let hasAgeData = false;
    let hasGenderData = false;

    if (metrics.demographicsData) {
      const demo = metrics.demographicsData;
      demographicsText = '\n\n【ユーザー属性の分布】\n';
      
      // デバイス別（最優先）
      if (demo.device && Array.isArray(demo.device) && demo.device.length > 0) {
        hasDeviceData = true;
        demographicsText += 'デバイス別:\n';
        demo.device.forEach(d => {
          const deviceName = d.deviceCategory || d.device || '不明';
          const sessions = d.sessions || 0;
          const percentage = d.percentage || 0;
          if (deviceName !== '不明' && sessions > 0) {
            demographicsText += `- ${deviceName}: ${sessions.toLocaleString()}セッション (${percentage.toFixed(1)}%)\n`;
          }
        });
        demographicsText += '\n';
      }
      
      // 地域別（上位5件）
      if (demo.location) {
        const locationData = demo.location.city || demo.location.region || [];
        if (Array.isArray(locationData) && locationData.length > 0) {
          hasLocationData = true;
          demographicsText += '地域別（上位5）:\n';
          locationData.slice(0, 5).forEach(loc => {
            const locationName = loc.city || loc.region || '不明';
            const sessions = loc.sessions || 0;
            const percentage = loc.percentage || 0;
            if (locationName !== '不明' && sessions > 0) {
              demographicsText += `- ${locationName}: ${sessions.toLocaleString()}セッション (${percentage.toFixed(1)}%)\n`;
            }
          });
          demographicsText += '\n';
        }
      }
      
      // 年齢別
      if (demo.age && Array.isArray(demo.age) && demo.age.length > 0) {
        hasAgeData = true;
        demographicsText += '年齢別:\n';
        demo.age.forEach(a => {
          const ageLabel = a.ageRange || a.age || '不明';
          const sessions = a.sessions || 0;
          const percentage = a.percentage || 0;
          if (ageLabel !== '不明' && sessions > 0) {
            demographicsText += `- ${ageLabel}: ${sessions.toLocaleString()}セッション (${percentage.toFixed(1)}%)\n`;
          }
        });
        demographicsText += '\n';
      }
      
      // 性別
      if (demo.gender && Array.isArray(demo.gender) && demo.gender.length > 0) {
        hasGenderData = true;
        demographicsText += '性別:\n';
        demo.gender.forEach(g => {
          const genderLabel = g.gender === 'male' ? '男性' : g.gender === 'female' ? '女性' : (g.gender || '不明');
          const sessions = g.sessions || 0;
          const percentage = g.percentage || 0;
          if (genderLabel !== '不明' && sessions > 0) {
            demographicsText += `- ${genderLabel}: ${sessions.toLocaleString()}セッション (${percentage.toFixed(1)}%)\n`;
          }
        });
      }
    }

    // データ不足の場合の警告
    let dataLimitationNote = '';
    if (!hasDeviceData && !hasLocationData && !hasAgeData && !hasGenderData) {
      dataLimitationNote = '\n⚠️ **注意**: ユーザー属性データが取得できていません。GA4の設定を確認してください。\n';
    } else if (!hasAgeData && !hasGenderData) {
      dataLimitationNote = '\n⚠️ **注意**: 年齢・性別データが不足しています。GA4でGoogleシグナルを有効化すると、より詳細な属性分析が可能になります。\n';
    }

  return `
あなたは【ターゲット層分析の専門家】です。${period}のWebサイトのユーザー属性データを分析し、**マーケティング戦略の最適化に役立つインサイト**を含む日本語の要約を**必ず800文字以内**で生成してください。

【ユーザー属性データ】${demographicsText}${dataLimitationNote}

【要求事項】
- **800文字以内で簡潔にまとめる**（これは厳守してください）
- Markdownの見出し記法（##, ###）を使用して構造化
- **必ず以下のセクションを含める**：主要セグメント、属性別特徴、ビジネスへの影響、原因の考察
- **各セクションで必ず具体的な数値（セッション数とパーセンテージ）を引用する**

## 主要セグメントの特定
${hasDeviceData ? `- **デバイス別の構成**：
  例：「モバイルが9,182セッション (83.5%)と圧倒的に多く、デスクトップは1,696セッション (15.4%)、タブレットは121セッション (1.1%)」
- **最大セグメントと2番目の差分**：
  例：「モバイルがデスクトップの5.4倍で、モバイル最適化が最優先課題」` : ''}
${hasLocationData ? `- **地域の集中度**：
  例：「上位3地域（東京32.3%、大阪21.7%、神奈川16.5%）で全体の70.5%を占める（高集中）」` : ''}
${hasAgeData || hasGenderData ? `- **ターゲット層**：
  例：「25-34歳の女性が最大セグメント（全体の28.5%、3,134セッション）」` : ''}

${hasDeviceData || hasLocationData || hasAgeData || hasGenderData ? `## 属性別の特徴分析` : ''}
${hasDeviceData ? `- **デバイス特性**：各デバイスの利用状況を数値で示し、その意味を考察
  例：「デスクトップが15.4%と一定の割合を占めており、詳細情報を求めるBtoB層の可能性」` : ''}
${hasLocationData ? `- **地域分散の評価**：
  例：「特定地域に集中 → 地域特化型マーケティングが効果的」
  または「全国的に分散 → 全国展開のポテンシャルあり」` : ''}
${hasAgeData || hasGenderData ? `- **デモグラフィック特性**：
  年齢・性別データから主要ターゲット層を特定し、ペルソナ像を具体化
  例：「若年層が多い → SNS施策、年配層が多い → 信頼性重視のコンテンツ」` : ''}

## ビジネスへの影響
- **マーケティング戦略**：
${hasDeviceData ? `  - モバイル比率が高い → モバイルUX、SNS施策、AMP対応が重要
  - デスクトップ比率が高い → 詳細情報提供、BtoB向けコンテンツが重要` : ''}
${hasLocationData ? `  - 地域集中度が高い → 地域特化型のマーケティングが効果的
  - 地域分散 → 全国規模の施策が必要` : ''}
- **リソース配分**：
  例：「最大セグメント（○○%）への投資を優先し、ROIを最大化」
${hasAgeData || hasGenderData ? `- **コミュニケーション戦略**：
  ターゲット層の特性に合わせたメッセージング、デザイン、チャネル選定` : ''}

## 原因の考察
**なぜこのような属性分布になっているか**（2-3つの仮説を提示）：
- 仮説1: 商材・サービスの特性
  例：「モバイルアプリ関連サービスのため、モバイルユーザーが多い」
- 仮説2: 現在の広告配信ターゲット設定
  例：「特定地域への広告集中が地域偏在を生んでいる」
- 仮説3: コンテンツの特性
  例：「スマホで完結しやすいコンテンツ設計のため、モバイル比率が高い」
${hasAgeData || hasGenderData ? '- 仮説4: ターゲット市場の人口動態との一致度' : ''}

【禁止事項】
- ❌ 数値の羅列のみで終わる
- ❌ 数値を示さない抽象的な表現（「多い」「少ない」など）
- ❌ セグメント間の比較がない
- ❌ 「undefined」などの不明な値の出力
- ❌ 「ビジネスへの影響」「原因の考察」セクションの欠落
`;
  }

  if (pageType === 'reverseFlow') {
    // 逆算フロー分析データの整形（画面表示データ）
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
あなたは【コンバージョンフロー分析の専門家】です。${period}のWebサイトの「${flowName}」フローを分析し、**CVR向上に直結する改善施策に役立つビジネスインサイト**を含む日本語の要約を**必ず800文字以内**で生成してください。

【画面表示データ】
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
⚠️ **必ず上記の実際のデータのみを使用してください。架空のページ名（製品A詳細ページ、料金プラン比較ページなど）や存在しないデータを推測して記載しないでください。**

【要求事項】
- **800文字以内で簡潔にまとめる**（これは厳守してください）
- Markdownの見出し記法（##, ###）を使用して構造化
- **必ず以下のセクションを含める**：フロー概要、コンバージョン効率の評価、ビジネスへの影響、改善の考察

## フロー概要
- フロー名とフォームページパスを明示
- 全体PV、フォームPV、CV数を具体的な数値で記述
- 達成率と全体CVRを評価
  例：「達成率2.05%は、フォームに到達したユーザーの約50人に1人がCVしている」

## コンバージョン効率の評価
- **達成率①（全PV→フォームPV: ${achievementRate1.toFixed(2)}%）の評価**：
  - 2%未満: 低い（フォームへの誘導が弱い）
  - 2-5%: 平均的（改善余地あり）
  - 5%以上: 良好
- **達成率②（フォームPV→送信完了: ${achievementRate2.toFixed(2)}%）の評価**：
  - 10%未満: 低い（フォーム改善が急務）
  - 10-30%: 平均的（改善余地あり）
  - 30%以上: 良好（さらなる最適化で伸びる）
- **全体CVR（全PV→送信完了: ${overallCVR.toFixed(2)}%）の評価**：
  - 0.1%未満: 低い
  - 0.1-0.5%: 平均的
  - 0.5%以上: 良好
- **ボトルネックの特定**：
  達成率①と達成率②を比較し、「フォームへの誘導」と「フォームの入力完了」のどちらが弱いかを明示

## ビジネスへの影響
- **CV効率**：
  達成率や全体CVRが低い場合、ビジネス機会の損失を具体的に試算
  例：「達成率を3%に改善すると、月間CV数が1.5倍（+○件）増加する見込み」
- **フォーム改善の重要性**：
  達成率が低い場合、EFO（入力フォーム最適化）が最優先課題
- **導線改善の重要性**：
  全体CVRが低い場合、フォームへの誘導強化が必要

## 改善の考察
**画面データから、なぜこのようなCVRになっているか、どう改善すべきかを2-3つの具体策で提示**：
- **改善策1: フォームへの誘導強化（達成率①: ${achievementRate1.toFixed(2)}%の向上）**
  - CTAボタンの配置最適化、誘導文言の改善、フォームページへのリンク追加
- **改善策2: フォーム改善（達成率②: ${achievementRate2.toFixed(2)}%の向上）**
  - 入力項目削減、エラーメッセージ改善、セキュリティ表示追加、EFO（入力フォーム最適化）
- **改善策3: 離脱防止施策**
  - フォーム入力中の離脱防止（自動保存、プログレスバー表示、入力ヘルプ強化）

【禁止事項】
- ❌ 数値の羅列のみで終わる
- ❌ 架空のページ名（製品A詳細ページ、料金プラン比較ページ、導入事例ページなど）を記載する
- ❌ 存在しないデータ（CV前閲覧ページ、平均閲覧ページ数など）を推測して記載する
- ❌ 「ビジネスへの影響」「改善の考察」セクションの欠落
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

  if (pageType === 'channels') {
    // 流入チャネル分析用のプロンプト
    const hasConversions = metrics.conversionEventNames && metrics.conversionEventNames.length > 0;
    const conversionNote = hasConversions ? '' : '\n\n⚠️ **注意**: コンバージョン定義が未設定です。CV分析をご希望の場合、サイト設定画面から設定してください。';

    return `
あなたは【流入チャネル最適化の専門家】です。${period}のWebサイトの流入チャネルデータを分析し、**マーケティングROI最適化に役立つインサイト**を含む日本語の要約を**必ず800文字以内**で生成してください。

【流入チャネルデータ】
- 総セッション数: ${metrics.totalSessions?.toLocaleString() || 0}回
- 総ユーザー数: ${metrics.totalUsers?.toLocaleString() || 0}人${hasConversions ? `
- 総コンバージョン数: ${metrics.totalConversions?.toLocaleString() || 0}件` : ''}
- チャネル数: ${metrics.channelCount || 0}個${conversionNote}

【チャネル別の内訳】
${metrics.channelsText || 'データなし'}

【要求事項】
- **800文字以内で簡潔にまとめる**（これは厳守してください）
- Markdownの見出し記法（##, ###）を使用して構造化
- **必ず以下のセクションを含める**：主要チャネル分析、チャネル特性、ビジネスへの影響、原因の考察

## 主要チャネルの分析
- **上位3チャネル**を具体的な数値で明示
  例：「Organic Search: 4,250セッション（37.8%）、Direct: 2,890セッション（25.7%）、Paid Search: 1,680セッション（14.9%）」
- **チャネルの集中度**を評価
  例：「上位3チャネルで全体の78.4%を占める（高集中型）」
${hasConversions ? `- **各チャネルのCVR**を比較
  例：「Organic SearchのCVRが1.8%と最も高く、Directは0.9%」` : ''}

## チャネル別の特性分析
- **オーガニック vs 有料**の比較
  例：「Organic（自然流入）が全体の52%、Paid（有料広告）が23%、Direct（直接流入）が25%」
- **各チャネルの役割と特徴**：
  - Organic Search: SEOの成果、ブランド認知度の指標
  - Paid Search/Display: 広告投資の直接的な成果
  - Direct: ブランド力、リピーター、ブックマークの指標
  - Social: SNS施策の効果
  - Referral: 外部サイトからの被リンク効果
${hasConversions ? `- **費用対効果の評価**：
  有料チャネル（Paid Search, Display）のCVRと、オーガニックチャネルのCVRを比較` : ''}

## ビジネスへの影響
- **マーケティング予算配分**：
  - 高CVRチャネルへの予算増額の検討
  - 低パフォーマンスチャネルの見直し
- **チャネル依存度のリスク**：
  - 特定チャネルへの過度な依存は、アルゴリズム変更や規約変更のリスク
  - 分散投資でリスクヘッジの必要性
- **オーガニック流入の重要性**：
  - Organic Searchが多い → SEO資産が蓄積、広告費削減効果
  - Organic Searchが少ない → SEO強化で中長期的なコスト削減が可能
${hasConversions ? `- **獲得効率**：
  CVRが高いチャネルは1CV当たりのコストが低く、ROIが高い` : ''}

## 原因の考察
**なぜこのようなチャネル構成になっているか**（2-3つの仮説を提示）：
- 仮説1: 現在のマーケティング戦略の反映
  例：「Paid Searchが多い → 広告投資に依存、SEOが少ない → SEO施策不足」
- 仮説2: ブランド認知度の影響
  例：「Directが多い → 高いブランド認知度、リピーター獲得に成功」
- 仮説3: コンテンツ戦略の成果
  例：「Organic Searchが多い → SEOコンテンツが効果的に機能」

【禁止事項】
- ❌ チャネル名の羅列のみで終わる
- ❌ 数値を示さない抽象的な表現
- ❌ 「ビジネスへの影響」「原因の考察」セクションの欠落
`;
  }

  if (pageType === 'referrals') {
    // 参照元/メディア分析用のプロンプト
    const hasConversions = metrics.conversionEventNames && metrics.conversionEventNames.length > 0;
    const conversionNote = hasConversions ? '' : '\n\n⚠️ **注意**: コンバージョン定義が未設定です。CV分析をご希望の場合、サイト設定画面から設定してください。';

    return `
あなたは【参照元最適化分析の専門家】です。${period}のWebサイトの参照元/メディアデータを分析し、**外部サイトからの流入最適化に役立つインサイト**を含む日本語の要約を**必ず800文字以内**で生成してください。

【参照元/メディアデータ】
- 総セッション数: ${metrics.totalSessions?.toLocaleString() || 0}回
- 総ユーザー数: ${metrics.totalUsers?.toLocaleString() || 0}人${hasConversions ? `
- 総コンバージョン数: ${metrics.totalConversions?.toLocaleString() || 0}件
- 平均CVR: ${(metrics.avgConversionRate || 0).toFixed(2)}%` : ''}
- 参照元数: ${metrics.referralCount || 0}件${conversionNote}

【参照元別の内訳（上位10件）】
${metrics.topReferralsText || 'データなし'}

【要求事項】
- **800文字以内で簡潔にまとめる**（これは厳守してください）
- Markdownの見出し記法（##, ###）を使用して構造化
- **必ず以下のセクションを含める**：主要参照元、参照元特性、ビジネスへの影響、原因の考察

## 主要参照元の分析
- **上位3参照元**を具体的な数値で明示
  例：「google.com: 2,450セッション（42.3%）、facebook.com: 1,230セッション（21.2%）、twitter.com: 890セッション（15.4%）」
- **参照元の集中度**を評価
  例：「上位3参照元で全体の78.9%を占める（高集中型）」
${hasConversions ? `- **各参照元のCVR**を比較
  例：「google.comのCVRが2.1%と最も高く、SNS系は0.8%程度」` : ''}

## 参照元の特性分析
- **ドメインタイプ別の分類**：
  - 検索エンジン（google.com, yahoo.co.jpなど）
  - SNS（facebook.com, twitter.com, instagram.comなど）
  - ポータルサイト（yahoo.co.jp, msn.comなど）
  - ニュースサイト、ブログ、フォーラムなど
- **メディアタイプの傾向**：
  - referral（一般的なリンク）vs cpc（有料広告）vs organic（自然検索）
  - 各タイプの割合と特徴
${hasConversions ? `- **CVRとの相関**：
  どの参照元/メディアタイプがコンバージョンに繋がりやすいか` : ''}

## ビジネスへの影響
- **パートナーシップ戦略**：
  - 流入の多い参照元との関係強化（タイアップ、広告出稿など）
  - 新規参照元の開拓機会
- **被リンク戦略**：
  - 質の高い参照元からのリンク獲得がSEOにも好影響
  - 低品質な参照元からのリンクは排除を検討
- **コンテンツ戦略**：
  - 参照元の特性に合わせたコンテンツ制作
  - シェアされやすいコンテンツフォーマットの特定
${hasConversions ? `- **獲得効率**：
  CVRが高い参照元への露出を増やすことで、全体のCV数増加が期待できる` : ''}

## 原因の考察
**なぜこのような参照元構成になっているか**（2-3つの仮説を提示）：
- 仮説1: PR・広報活動の成果
  例：「ニュースサイトからの流入が多い → プレスリリースやメディア露出が効果的」
- 仮説2: SNS施策の効果
  例：「SNSからの流入が多い → SNSマーケティングが機能している」
- 仮説3: 他社サイトとの提携・協業
  例：「特定企業サイトからの流入が多い → アライアンスやアフィリエイトが成功」

【禁止事項】
- ❌ 参照元の羅列のみで終わる
- ❌ 数値を示さない抽象的な表現
- ❌ 「ビジネスへの影響」「原因の考察」セクションの欠落
`;
  }

  if (pageType === 'landingPages') {
    // ランディングページ分析用のプロンプト
    const hasConversions = metrics.conversionEventNames && metrics.conversionEventNames.length > 0;
    const conversionNote = hasConversions ? '' : '\n\n⚠️ **注意**: コンバージョン定義が未設定です。CV分析をご希望の場合、サイト設定画面から設定してください。';

    return `
あなたは【ランディングページ最適化の専門家】です。${period}のWebサイトのランディングページデータを分析し、**ファーストインプレッション改善に役立つインサイト**を含む日本語の要約を**必ず800文字以内**で生成してください。

【ランディングページデータ】
- 総セッション数: ${metrics.totalSessions?.toLocaleString() || 0}回
- 総ユーザー数: ${metrics.totalUsers?.toLocaleString() || 0}人${hasConversions ? `
- 総コンバージョン数: ${metrics.totalConversions?.toLocaleString() || 0}件` : ''}
- LP数: ${metrics.landingPageCount || 0}ページ${conversionNote}

【LP別の内訳（上位10件）】
${metrics.topLandingPagesText || 'データなし'}

【要求事項】
- **800文字以内で簡潔にまとめる**（これは厳守してください）
- Markdownの見出し記法（##, ###）を使用して構造化
- **必ず以下のセクションを含める**：主要LP、LP特性、ビジネスへの影響、原因の考察

## 主要LPの分析
- **上位3LP**を具体的な数値で明示
  例：「/ (トップページ): 3,450セッション（38.2%）、/products/abc: 1,230セッション（13.6%）、/campaign2025: 890セッション（9.9%）」
- **LPの集中度**を評価
  例：「上位3LPで全体の61.7%を占める（中集中型）」
${hasConversions ? `- **各LPのCVR**を比較
  例：「/campaign2025のCVRが3.2%と最も高く、トップページは0.9%」` : ''}

## LPの特性分析
- **LPタイプ別の分類**：
  - トップページ（/）
  - 商品・サービス詳細ページ（/products/, /services/）
  - キャンペーンLP（/campaign/, /lp/）
  - ブログ・記事ページ（/blog/, /articles/）
  - その他（カテゴリページ、会社情報など）
- **流入源との関係**：
  - 広告流入のLPは専用LPが多い傾向
  - 自然検索流入はブログや商品詳細ページが多い傾向
${hasConversions ? `- **CVRの傾向**：
  どのタイプのLPがコンバージョンに繋がりやすいか` : ''}

## ビジネスへの影響
- **ファーストインプレッションの重要性**：
  - LPはユーザーの第一印象を決定する最重要ページ
  - 高トラフィックLPの改善は全体のパフォーマンス向上に直結
- **LP最適化の優先順位**：
  - トラフィックは多いがCVRが低いLP → 早急な改善が必要
  - CVRは高いがトラフィックが少ないLP → 流入増加施策が有効
- **コンテンツ戦略**：
  - 流入の多いLPタイプを特定し、同様のコンテンツを増産
  - 流入が少ないページタイプは露出増加や統廃合を検討
${hasConversions ? `- **CV最大化**：
  高CVRのLPへの流入を増やすことで、全体のCV数増加が期待できる` : ''}

## 原因の考察
**なぜこのようなLP構成になっているか**（2-3つの仮説を提示）：
- 仮説1: 広告キャンペーンの影響
  例：「特定のキャンペーンLPへの流入が多い → 現在の広告施策の成果」
- 仮説2: SEOコンテンツの効果
  例：「ブログ記事がLPとして機能 → コンテンツSEOが成功している」
- 仮説3: サイト構造・ナビゲーションの影響
  例：「トップページへの集中 → ブランド認知度が高い、または直接訪問が多い」

【禁止事項】
- ❌ LPの羅列のみで終わる
- ❌ 数値を示さない抽象的な表現
- ❌ 「ビジネスへの影響」「原因の考察」セクションの欠落
`;
  }

  if (pageType === 'pages') {
    // ページ別分析用のプロンプト
    const hasConversions = metrics.conversionEventNames && metrics.conversionEventNames.length > 0;
    const conversionNote = hasConversions ? '' : '\n\n⚠️ **注意**: コンバージョン定義が未設定です。CV分析をご希望の場合、サイト設定画面から設定してください。';

    return `
あなたは【コンテンツパフォーマンス分析の専門家】です。${period}のWebサイトのページ別データを分析し、**コンテンツ最適化に役立つインサイト**を含む日本語の要約を**必ず800文字以内**で生成してください。

【ページ別データ】
- 総ページビュー数: ${metrics.totalPageViews?.toLocaleString() || 0}PV
- 総セッション数: ${metrics.totalSessions?.toLocaleString() || 0}回
- 総ユーザー数: ${metrics.totalUsers?.toLocaleString() || 0}人
- ページ数: ${metrics.pageCount || 0}ページ${conversionNote}

【ページ別の内訳（上位10件）】
${metrics.topPagesText || 'データなし'}

【要求事項】
- **800文字以内で簡潔にまとめる**（これは厳守してください）
- Markdownの見出し記法（##, ###）を使用して構造化
- **必ず以下のセクションを含める**：主要ページ、コンテンツ特性、ビジネスへの影響、原因の考察

## 主要ページの分析
- **上位3ページ**を具体的な数値で明示
  例：「/ (トップ): 5,230PV（28.5%）、/products/abc: 2,140PV（11.7%）、/blog/article-123: 1,890PV（10.3%）」
- **ページの集中度**を評価
  例：「上位10ページで全体の65%を占める（中集中型）」
- **PV/セッション比**を計算
  例：「平均PV/セッション: ${metrics.totalPageViews && metrics.totalSessions ? (metrics.totalPageViews / metrics.totalSessions).toFixed(2) : 'N/A'}（ユーザーの回遊度を示す）」

## コンテンツタイプ別の特性
- **ページタイプ別の分類**：
  - トップページ（/）
  - 商品・サービスページ（/products/, /services/）
  - ブログ・記事（/blog/, /articles/, /news/）
  - 会社情報（/about/, /company/）
  - お問い合わせ・申込（/contact/, /apply/）
  - その他（カテゴリ、FAQ、利用規約など）
- **各タイプの役割**：
  - 情報提供型（ブログ、記事） → 集客・認知拡大
  - 商品紹介型 → 検討・比較
  - コンバージョン型（申込、問い合わせ） → 成果獲得
- **回遊性の評価**：
  PV/セッションが高い → ユーザーが複数ページを閲覧（良好）
  PV/セッションが低い → 1ページで離脱（改善必要）

## ビジネスへの影響
- **コンテンツ投資の優先順位**：
  - 高PVページ → 改善・更新の優先度が高い（影響範囲が大きい）
  - 低PVページ → 統廃合や導線改善を検討
- **コンテンツ戦略**：
  - 人気コンテンツタイプを特定し、同様のコンテンツを増産
  - 低パフォーマンスコンテンツは品質改善またはnoindex化
- **ユーザー体験**：
  - 回遊率が高い → ユーザーが情報を探しやすいサイト構造
  - 回遊率が低い → ナビゲーション改善、関連コンテンツの充実が必要

## 原因の考察
**なぜこのようなページ構成になっているか**（2-3つの仮説を提示）：
- 仮説1: SEOコンテンツの成果
  例：「特定のブログ記事のPVが多い → SEOで上位表示されている」
- 仮説2: サイト設計・導線の影響
  例：「トップページのPVが圧倒的に多い → 内部リンクがトップに集中」
- 仮説3: ユーザーニーズとの合致度
  例：「商品詳細ページのPVが多い → ユーザーの関心が高い商品」

【禁止事項】
- ❌ ページの羅列のみで終わる
- ❌ 数値を示さない抽象的な表現
- ❌ 「ビジネスへの影響」「原因の考察」セクションの欠落
`;
  }

  if (pageType === 'pageCategories') {
    // ページカテゴリ別分析用のプロンプト
    const hasConversions = metrics.conversionEventNames && metrics.conversionEventNames.length > 0;
    const conversionNote = hasConversions ? '' : '\n\n⚠️ **注意**: コンバージョン定義が未設定です。CV分析をご希望の場合、サイト設定画面から設定してください。';

    return `
あなたは【コンテンツカテゴリ戦略の専門家】です。${period}のWebサイトのカテゴリ別データを分析し、**サイト構造最適化に役立つインサイト**を含む日本語の要約を**必ず800文字以内**で生成してください。

【カテゴリ別データ】
- 総ページビュー数: ${metrics.totalPageViews?.toLocaleString() || 0}PV
- カテゴリ数: ${metrics.categoryCount || 0}カテゴリ${conversionNote}

【カテゴリ別の内訳（上位5件）】
${metrics.topCategoriesText || 'データなし'}

【要求事項】
- **800文字以内で簡潔にまとめる**（これは厳守してください）
- Markdownの見出し記法（##, ###）を使用して構造化
- **必ず以下のセクションを含める**：主要カテゴリ、カテゴリ特性、ビジネスへの影響、原因の考察

## 主要カテゴリの分析
- **上位3カテゴリ**を具体的な数値で明示
  例：「/ (トップレベル): 8,450PV（45.2%）、/blog: 3,230PV（17.3%）、/products: 2,890PV（15.5%）」
- **カテゴリの集中度**を評価
  例：「上位3カテゴリで全体の78.0%を占める（高集中型）」
- **カテゴリ規模の比較**：
  PV数だけでなく、含まれるページ数も考慮
  例：「/blogは230ページあるが、/productsは15ページのみで高PV」

## カテゴリの特性分析
- **カテゴリタイプ別の役割**：
  - コアコンテンツ（/, /products, /servicesなど）→ ビジネスの中核
  - 集客コンテンツ（/blog, /news, /articlesなど）→ SEO・認知拡大
  - サポートコンテンツ（/faq, /support, /guideなど）→ ユーザーサポート
  - トランザクション（/contact, /apply, /cartなど）→ コンバージョン獲得
- **カテゴリの充実度**：
  - ページ数が多いカテゴリ → コンテンツが充実
  - ページ数が少ないカテゴリ → 拡充の余地あり
- **カテゴリ間のバランス**：
  集客カテゴリとコンバージョンカテゴリのバランスを評価

## ビジネスへの影響
- **サイト構造の評価**：
  - 高PVカテゴリがビジネス目標と一致しているか
  - 重要なカテゴリのPVが少ない場合は導線改善が必要
- **コンテンツ投資戦略**：
  - 高PVカテゴリ → 継続的なコンテンツ拡充と品質維持
  - 低PVカテゴリ → 拡充 or 統廃合を検討
- **ユーザーニーズの把握**：
  - どのカテゴリがユーザーに求められているか
  - 需要の高いカテゴリへのリソース集中
- **サイトナビゲーション**：
  - 高PVカテゴリへのアクセスしやすさを確保
  - メガメニュー、フッター、サイドバーでの露出を最適化

## 原因の考察
**なぜこのようなカテゴリ構成になっているか**（2-3つの仮説を提示）：
- 仮説1: ビジネスモデルの反映
  例：「商品カテゴリのPVが多い → ECサイトまたは製品販売が主力」
- 仮説2: コンテンツマーケティングの成果
  例：「ブログカテゴリのPVが多い → SEO施策が成功している」
- 仮説3: ユーザーの行動パターン
  例：「トップページのPVが圧倒的 → ブランド認知度が高く、直接訪問が多い」

【禁止事項】
- ❌ カテゴリの羅列のみで終わる
- ❌ 数値を示さない抽象的な表現
- ❌ 「ビジネスへの影響」「原因の考察」セクションの欠落
`;
  }

  if (pageType === 'keywords') {
    // 流入キーワード分析用のプロンプト
    const hasGSCConnection = metrics.hasGSCConnection === true;
    const noDataNote = !hasGSCConnection ? '\n\n⚠️ **注意**: Search Consoleが未連携です。キーワードデータを取得するには、サイト設定でSearch Consoleを連携してください。' : '';

    return `
あなたは【SEOキーワード戦略の専門家】です。${period}のWebサイトの流入キーワードデータを分析し、**検索流入最適化に役立つインサイト**を含む日本語の要約を**必ず800文字以内**で生成してください。

【流入キーワードデータ】
- 総クリック数: ${metrics.totalClicks?.toLocaleString() || 0}回
- 総表示回数: ${metrics.totalImpressions?.toLocaleString() || 0}回
- 平均CTR: ${(metrics.avgCTR || 0).toFixed(2)}%
- 平均掲載順位: ${(metrics.avgPosition || 0).toFixed(1)}位
- キーワード数: ${metrics.keywordCount || 0}個${noDataNote}

【キーワード別の内訳（上位10件）】
${metrics.topKeywordsText || 'データなし'}

【要求事項】
- **800文字以内で簡潔にまとめる**（これは厳守してください）
- Markdownの見出し記法（##, ###）を使用して構造化
- **必ず以下のセクションを含める**：主要キーワード、キーワード特性、ビジネスへの影響、原因の考察

## 主要キーワードの分析
- **上位3キーワード**を具体的な数値で明示
  例：「○○○○: クリック450回（CTR 12.5%、順位2.3位）、△△△△: クリック320回（CTR 8.2%、順位4.1位）」
- **キーワードの集中度**を評価
  例：「上位10キーワードで全クリックの65%を占める（中集中型）」
- **CTRと掲載順位の関係**：
  高順位でもCTRが低いキーワード → タイトル・ディスクリプション改善が必要
  低順位でもCTRが高いキーワード → 順位向上でクリック大幅増加が期待できる

## キーワードの特性分析
- **キーワードタイプ別の分類**：
  - ブランドキーワード（企業名、商品名など）
  - 一般キーワード（検索ニーズを示すキーワード）
  - ロングテールキーワード（3語以上の詳細なキーワード）
  - 情報検索型（○○とは、○○方法など）
  - 商業検索型（○○価格、○○比較など）
- **検索意図の推測**：
  各キーワードからユーザーが何を求めているかを分析
- **競争度の評価**：
  順位が高いキーワード → 競争に勝てている
  順位が低いキーワード → 競合が強い、またはコンテンツ改善が必要

## ビジネスへの影響
- **SEO戦略の有効性**：
  - ブランドキーワードが多い → ブランド認知度が高い
  - 一般キーワードが多い → SEOコンテンツが効果的
- **機会損失の特定**：
  - 表示回数は多いがCTRが低いキーワード → タイトル改善で大幅なクリック増加が見込める
  - 掲載順位が4-10位のキーワード → 上位3位以内を目指すことでクリック数が2-3倍になる可能性
- **コンテンツギャップ**：
  - 流入が少ないキーワード → 競合との差別化ポイント、新規コンテンツ制作の機会

## 原因の考察
**なぜこのようなキーワード構成になっているか**（2-3つの仮説を提示）：
- 仮説1: SEOコンテンツ戦略の成果
  例：「特定の情報検索型キーワードが多い → ブログ記事が検索上位表示されている」
- 仮説2: ブランド認知度の反映
  例：「ブランドキーワードが多い → 指名検索が増えている」
- 仮説3: 競合との差別化
  例：「ロングテールキーワードが多い → ニッチな検索ニーズを捉えている」

【禁止事項】
- ❌ キーワードの羅列のみで終わる
- ❌ 数値を示さない抽象的な表現
- ❌ 「ビジネスへの影響」「原因の考察」セクションの欠落
`;
  }

  if (pageType === 'conversions') {
    // コンバージョン一覧分析用のプロンプト
    const hasConversions = metrics.conversionEventCount > 0;
    const noDataNote = !hasConversions ? '\n\n⚠️ **注意**: コンバージョン定義が未設定です。サイト設定でコンバージョンイベントを定義してください。' : '';

    return `
あなたは【コンバージョン最適化の専門家】です。${period}のWebサイトのコンバージョン推移データを分析し、**成果最大化に役立つインサイト**を含む日本語の要約を**必ず800文字以内**で生成してください。

【コンバージョンデータ】
- データポイント数: ${metrics.monthlyDataPoints || 0}ヶ月分
- 定義済みコンバージョンイベント数: ${metrics.conversionEventCount || 0}種類${noDataNote}

【コンバージョンイベント別の合計】
${metrics.conversionSummaryText || 'データなし'}

【重要な制約】
⚠️ **必ず上記の【コンバージョンイベント別の合計】に記載されているイベント名と数値のみを使用してください。記載されていないイベント名や数値を推測したり、例として挙げたりしないでください。**

【要求事項】
- **800文字以内で簡潔にまとめる**（これは厳守してください）
- Markdownの見出し記法（##, ###）を使用して構造化
- **必ず以下のセクションを含める**：主要CV、CV推移、ビジネスへの影響、原因の考察

## 主要コンバージョンの分析
- **上記【コンバージョンイベント別の合計】に記載されている各CVイベントの件数**を具体的な数値で明示
- **CVの集中度**を評価（複数イベントがある場合のみ）
- **CVイベント間の関係**：
  複数のCVイベントがある場合のみ、カスタマージャーニー上の位置づけを分析

## コンバージョン推移の分析
- **月次トレンド**：
  増加傾向・減少傾向・季節変動を特定
  例：「過去3ヶ月で15%増加傾向」「○月が最も多い（季節要因）」
- **変動の大きさ**：
  安定しているか、ブレが大きいかを評価
- **異常値の特定**：
  特定月の急増・急減があれば、その要因を推測
  例：「○月にキャンペーン実施で2倍に増加」

## ビジネスへの影響
- **売上・成果への直結度**：
  - CVが増加 → ビジネス成果の向上
  - CVが減少 → 早急な対策が必要
- **マーケティング施策の評価**：
  - CV増加月 → その月の施策（広告、キャンペーン、SEOなど）が効果的
  - CV減少月 → 施策の見直しが必要
- **リソース配分の最適化**：
  - 件数の多いCVイベント → 現状の主力施策を強化
  - 件数の少ないCVイベント → 新規施策や導線改善で伸ばす余地あり
- **ファネル最適化**：
  各CVイベントの役割を理解し、段階的な改善施策を実施

## 原因の考察
**なぜこのようなCV推移になっているか**（2-3つの仮説を提示）：
- 仮説1: マーケティング施策の影響
  例：「○月のCV増加 → 広告予算増額やキャンペーン実施の成果」
- 仮説2: 季節要因・外部環境
  例：「特定月の増加 → 業界の繁忙期や季節需要」
- 仮説3: サイト改善の効果
  例：「継続的な増加傾向 → LP改善やEFO（入力フォーム最適化）の成果」

【禁止事項】
- ❌ CV数の羅列のみで終わる
- ❌ 数値を示さない抽象的な表現
- ❌ 「ビジネスへの影響」「原因の考察」セクションの欠落
- ❌ 【コンバージョンイベント別の合計】に記載されていないイベント名や数値を使用する
- ❌ 架空のイベント名（入居のお申込完了、見学のお申込完了など）を推測して記載する
`;
  }

  if (pageType === 'fileDownloads') {
    // ファイルダウンロード分析用のプロンプト
    const hasConversions = metrics.conversionEventNames && metrics.conversionEventNames.length > 0;
    const conversionNote = hasConversions ? '' : '\n\n⚠️ **注意**: コンバージョン定義が未設定です。CV分析をご希望の場合、サイト設定画面から設定してください。';

    return `
あなたは【コンテンツエンゲージメント分析の専門家】です。${period}のWebサイトのファイルダウンロードデータを分析し、**資料配布戦略最適化に役立つインサイト**を含む日本語の要約を**必ず800文字以内**で生成してください。

【ファイルダウンロードデータ】
- 総ダウンロード数: ${metrics.totalDownloads?.toLocaleString() || 0}回
- 総ユーザー数: ${metrics.totalUsers?.toLocaleString() || 0}人
- ファイル数: ${metrics.downloadCount || 0}種類${conversionNote}

【ファイル別の内訳（上位10件）】
${metrics.topFilesText || 'データなし'}

【要求事項】
- **800文字以内で簡潔にまとめる**（これは厳守してください）
- Markdownの見出し記法（##, ###）を使用して構造化
- **必ず以下のセクションを含める**：主要ファイル、ファイル特性、ビジネスへの影響、原因の考察

## 主要ファイルの分析
- **上位3ファイル**を具体的な数値で明示
  例：「product_catalog.pdf: 890DL（42.3%）、whitepaper_2025.pdf: 520DL（24.7%）、price_list.xlsx: 340DL（16.2%）」
- **ファイルの集中度**を評価
  例：「上位3ファイルで全体の83.2%を占める（高集中型）」
- **ユーザー当たりDL数**：
  例：「平均${metrics.totalDownloads && metrics.totalUsers ? (metrics.totalDownloads / metrics.totalUsers).toFixed(2) : 'N/A'}DL/ユーザー → 複数資料をDLするユーザーが多い」

## ファイルタイプ別の特性
- **ファイルタイプ別の分類**：
  - 製品カタログ・パンフレット（PDF）
  - ホワイトペーパー・事例集（PDF）
  - 価格表・見積書（PDF, Excel）
  - プレゼン資料・提案書（PowerPoint, PDF）
  - 技術資料・マニュアル（PDF）
  - その他（画像、動画など）
- **ファイル形式の傾向**：
  PDFが多い → 印刷・閲覧用の資料
  Excelが多い → データ・計算用の資料
- **ファイル名の傾向**：
  具体的な名前 → ユーザーが明確な目的でDL
  一般的な名前 → 幅広いニーズに対応

## ビジネスへの影響
- **リード獲得への貢献**：
  - 資料DLは見込み顧客（リード）の獲得機会
  - DL数が多い → コンテンツマーケティングが機能している
- **顧客ニーズの把握**：
  - どの資料が求められているかでニーズを特定
  - DL数の多い資料 → 市場の関心が高い分野
  - DL数の少ない資料 → 改善または廃止を検討
- **営業・マーケティング活用**：
  - DLユーザーへのフォローアップ（メール、電話など）
  - DL後のCV率を分析し、効果的な資料を特定
- **コンテンツ戦略**：
  - 人気資料と同様のコンテンツを増産
  - DL数の少ない資料は内容見直しまたはプロモーション強化

## 原因の考察
**なぜこのようなDL構成になっているか**（2-3つの仮説を提示）：
- 仮説1: ユーザーのニーズ反映
  例：「製品カタログのDLが多い → 具体的な製品情報を求めるユーザーが多い」
- 仮説2: 資料の露出度
  例：「特定ファイルのDLが多い → サイト上で目立つ位置に配置されている」
- 仮説3: マーケティング施策の影響
  例：「ホワイトペーパーのDLが多い → リード獲得キャンペーンが効果的」

【禁止事項】
- ❌ ファイル名の羅列のみで終わる
- ❌ 数値を示さない抽象的な表現
- ❌ 「ビジネスへの影響」「原因の考察」セクションの欠落
`;
  }

  if (pageType === 'externalLinks') {
    // 外部リンククリック分析用のプロンプト
    const hasConversions = metrics.conversionEventNames && metrics.conversionEventNames.length > 0;
    const conversionNote = hasConversions ? '' : '\n\n⚠️ **注意**: コンバージョン定義が未設定です。CV分析をご希望の場合、サイト設定画面から設定してください。';

    return `
あなたは【ユーザー行動分析の専門家】です。${period}のWebサイトの外部リンククリックデータを分析し、**ユーザー導線最適化に役立つインサイト**を含む日本語の要約を**必ず800文字以内**で生成してください。

【外部リンククリックデータ】
- 総クリック数: ${metrics.totalClicks?.toLocaleString() || 0}回
- 総ユーザー数: ${metrics.totalUsers?.toLocaleString() || 0}人
- 外部リンク数: ${metrics.clickCount || 0}種類${conversionNote}

【外部リンク別の内訳（上位10件）】
${metrics.topLinksText || 'データなし'}

【要求事項】
- **800文字以内で簡潔にまとめる**（これは厳守してください）
- Markdownの見出し記法（##, ###）を使用して構造化
- **必ず以下のセクションを含める**：主要リンク、リンク特性、ビジネスへの影響、原因の考察

## 主要外部リンクの分析
- **上位3リンク**を具体的な数値で明示
  例：「https://example.com/shop: 1,230クリック（45.2%）、https://partner.com: 680クリック（25.0%）」
- **リンクの集中度**を評価
  例：「上位3リンクで全体の75%を占める（高集中型）」
- **ユーザー当たりクリック数**：
  例：「平均${metrics.totalClicks && metrics.totalUsers ? (metrics.totalClicks / metrics.totalUsers).toFixed(2) : 'N/A'}クリック/ユーザー」

## 外部リンクの特性分析
- **リンク先タイプ別の分類**：
  - ECサイト・購入ページ（Amazon, 楽天, 自社ECなど）
  - SNS・ソーシャルメディア（Twitter, Facebook, Instagramなど）
  - パートナーサイト・関連サービス
  - 求人サイト（採用情報への誘導）
  - その他のサービスサイト
- **リンクの役割**：
  - 購入・申込への誘導 → コンバージョン促進
  - 情報提供・補足 → ユーザー体験向上
  - SNSシェア → 拡散・認知拡大
- **クリック先の傾向**：
  特定ドメインへの集中 → 特定パートナーや自社ECへの誘導が多い

## ビジネスへの影響
- **収益機会の評価**：
  - ECサイトへのクリックが多い → アフィリエイト収益や自社EC売上に貢献
  - クリック数 = 潜在的な顧客流出または送客
- **パートナーシップ戦略**：
  - クリックの多いリンク先 → 重要なパートナー、関係強化を検討
  - クリックの少ないリンク先 → 配置見直しまたは削除を検討
- **ユーザー導線の最適化**：
  - 外部リンククリック = サイト離脱のリスク
  - 必要な外部リンクは残し、不要なリンクは削減
  - 外部リンクの前に自社コンテンツで価値提供
- **成果計測**：
  - 外部リンククリック後のCV率を追跡（可能な場合）
  - 効果的な外部リンクを特定し、プロモーション強化

## 原因の考察
**なぜこのようなクリック構成になっているか**（2-3つの仮説を提示）：
- 仮説1: ビジネスモデルの反映
  例：「ECサイトへのクリックが多い → アフィリエイトモデルまたは自社EC誘導」
- 仮説2: コンテンツ戦略
  例：「特定パートナーサイトへのクリックが多い → 提携・協業関係が強い」
- 仮説3: ユーザーニーズ
  例：「SNSリンクのクリックが多い → ユーザーがSNSでの情報発信を求めている」

【禁止事項】
- ❌ リンクの羅列のみで終わる
- ❌ 数値を示さない抽象的な表現
- ❌ 「ビジネスへの影響」「原因の考察」セクションの欠落
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


