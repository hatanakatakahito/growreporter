import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { checkCanGenerate, incrementGenerationCount } from '../utils/planManager.js';
import { getCachedAnalysis, saveCachedAnalysis } from '../utils/aiCacheManager.js';

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
  // 【重要】legacyMetrics は後方互換性のためのみ残している
  // 実際には rawData → finalMetrics → metrics という流れで使用する
  const { siteId, pageType, startDate, endDate, metrics: legacyMetrics, rawData, forceRegenerate = false } = request.data;

  // 入力バリデーション
  if (!siteId || !pageType || !startDate || !endDate) {
    throw new HttpsError(
      'invalid-argument',
      'siteId, pageType, startDate, endDate are required'
    );
  }
  
  // rawDataもlegacyMetricsも渡されていない場合はエラー
  if (!legacyMetrics && !rawData) {
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
    // 【重要】ここで metrics 変数を定義し、以降はこれのみを使用
    let metrics;
    
    if (rawData) {
      // ✅ 新方式（推奨）：rawDataが渡されている場合は変換
      console.log('[generateAISummary] ✅ 新方式: rawDataをmetricsに変換');
      metrics = formatRawDataToMetrics(rawData, pageType);
      console.log('[generateAISummary] 変換後のメトリクス keys:', Object.keys(metrics));
    } else {
      // ❌ 旧方式（非推奨・後方互換性のみ）：legacyMetricsが直接渡されている場合
      console.log('[generateAISummary] ⚠️ 旧方式: フロントから受け取ったlegacyMetricsを使用（非推奨）');
      metrics = legacyMetrics;
    }
    
    // metricsが未定義の場合はエラー
    if (!metrics) {
      throw new HttpsError(
        'invalid-argument',
        'Failed to prepare metrics data'
      );
    }
    
    // 6. プロンプト生成
    console.log('[generateAISummary] メトリクスデータ:', JSON.stringify(metrics, null, 2));
    const prompt = await generatePrompt(db, pageType, startDate, endDate, metrics);
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
      metrics: JSON.parse(JSON.stringify(metrics)), // undefinedを除外（metricsは常に定義済み）
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
      // ダッシュボード：current, previousMonth, yearAgo, monthlyTrend を受け取る
      const current = rawData.current || {};
      const prev = rawData.previousMonth || null;
      const yearAgo = rawData.yearAgo || null;
      
      // 前月比を計算
      let monthOverMonth = null;
      if (prev && prev.metrics) {
        monthOverMonth = {
          users: {
            current: current.metrics?.totalUsers || 0,
            previous: prev.metrics.totalUsers || 0,
            change: prev.metrics.totalUsers > 0 
              ? ((current.metrics?.totalUsers || 0) - prev.metrics.totalUsers) / prev.metrics.totalUsers * 100 
              : 0,
          },
          sessions: {
            current: current.metrics?.sessions || 0,
            previous: prev.metrics.sessions || 0,
            change: prev.metrics.sessions > 0 
              ? ((current.metrics?.sessions || 0) - prev.metrics.sessions) / prev.metrics.sessions * 100 
              : 0,
          },
          conversions: {
            current: current.totalConversions || 0,
            previous: prev.totalConversions || 0,
            change: prev.totalConversions > 0 
              ? ((current.totalConversions || 0) - prev.totalConversions) / prev.totalConversions * 100 
              : 0,
          },
          engagementRate: {
            current: current.metrics?.engagementRate || 0,
            previous: prev.metrics.engagementRate || 0,
            change: prev.metrics.engagementRate > 0 
              ? ((current.metrics?.engagementRate || 0) - prev.metrics.engagementRate) / prev.metrics.engagementRate * 100 
              : 0,
          },
        };
      }
      
      return {
        users: current.metrics?.totalUsers || 0,
        newUsers: current.metrics?.newUsers || 0,
        sessions: current.metrics?.sessions || 0,
        pageViews: current.metrics?.pageViews || 0,
        conversions: current.totalConversions || 0,
        engagementRate: current.metrics?.engagementRate || 0,
        bounceRate: current.metrics?.bounceRate || 0,
        avgSessionDuration: current.metrics?.averageSessionDuration || 0,
        conversionRate: current.metrics?.sessions > 0 ? (current.totalConversions || 0) / current.metrics.sessions : 0,
        conversionBreakdown: current.conversionBreakdown || {},
        monthOverMonth,
        yearAgoData: yearAgo,
        monthlyData: rawData.monthlyTrend || [],
        kpiData: rawData.kpiData || [],
        hasConversionDefinitions: rawData.hasConversionEvents || false,
        hasKpiSettings: rawData.hasKpiSettings || false,
      };

    case 'summary':
      // サマリー（全体サマリー）：current, previousMonth, yearAgo, monthlyTrend を受け取る
      const summCurrent = rawData.current || {};
      const summPrev = rawData.previousMonth || null;
      const summYearAgo = rawData.yearAgo || null;
      
      // 前月比を計算
      let summMonthOverMonth = null;
      if (summPrev) {
        const currentUsers = summCurrent.users || summCurrent.totalUsers || 0;
        const prevUsers = summPrev.users || summPrev.totalUsers || 0;
        const currentConversions = summCurrent.conversions || 0;
        const prevConversions = summPrev.conversions || 0;
        
        summMonthOverMonth = {
          users: {
            current: currentUsers,
            previous: prevUsers,
            change: prevUsers > 0 ? ((currentUsers - prevUsers) / prevUsers) * 100 : 0,
          },
          sessions: {
            current: summCurrent.sessions || 0,
            previous: summPrev.sessions || 0,
            change: summPrev.sessions > 0 
              ? ((summCurrent.sessions || 0) - summPrev.sessions) / summPrev.sessions * 100 
              : 0,
          },
          conversions: {
            current: currentConversions,
            previous: prevConversions,
            change: prevConversions > 0 ? ((currentConversions - prevConversions) / prevConversions) * 100 : 0,
          },
          engagementRate: {
            current: summCurrent.engagementRate || 0,
            previous: summPrev.engagementRate || 0,
            change: summPrev.engagementRate > 0 
              ? ((summCurrent.engagementRate || 0) - summPrev.engagementRate) / summPrev.engagementRate * 100 
              : 0,
          },
        };
      }
      
      return {
        users: summCurrent.users || summCurrent.totalUsers || 0,
        sessions: summCurrent.sessions || 0,
        pageViews: summCurrent.pageViews || summCurrent.screenPageViews || 0,
        conversions: summCurrent.conversions || 0,
        engagementRate: summCurrent.engagementRate || 0,
        conversionRate: summCurrent.sessions > 0 ? (summCurrent.conversions || 0) / summCurrent.sessions : 0,
        monthOverMonth: summMonthOverMonth,
        yearAgoData: summYearAgo,
        monthlyData: rawData.monthlyTrend || [],
        hasConversionDefinitions: rawData.hasConversionEvents || false,
        conversionEventNames: rawData.conversionEventNames || [],
      };

    case 'users':
      // ユーザー属性分析：fetchGA4UserDemographics の結果
      return {
        totalUsers: rawData.totalUsers || 0,
        totalSessions: rawData.totalSessions || 0,
        demographicsData: rawData || null,
        newReturning: rawData.newReturning || [],
        device: rawData.device || [],
        location: rawData.location || {},
        age: rawData.age || [],
        gender: rawData.gender || [],
        hasConversionDefinitions: rawData.hasConversionEvents || false,
        conversionEventNames: rawData.conversionEventNames || [],
      };

    case 'reverseFlow':
      // 逆算フロー分析：フロントから { summary, monthly, flow } 構造で受け取る
      const summary = rawData.summary || {};
      const monthly = rawData.monthly || [];
      const flow = rawData.flow || {};
      const totalSiteViews = summary.totalSiteViews || 0;
      const formPageViews = summary.formPageViews || 0;
      const submissionComplete = summary.submissionComplete || 0;
      const achievementRate1 = totalSiteViews > 0 ? (formPageViews / totalSiteViews) * 100 : 0;
      const achievementRate2 = formPageViews > 0 ? (submissionComplete / formPageViews) * 100 : 0;
      const overallCVR = totalSiteViews > 0 ? (submissionComplete / totalSiteViews) * 100 : 0;
      return {
        flowName: flow.flowName || 'フロー名未設定',
        formPagePath: flow.formPagePath || '未設定',
        targetCvEvent: flow.targetCvEvent || '未設定',
        totalSiteViews,
        formPageViews,
        submissionComplete,
        achievementRate1: achievementRate1.toFixed(2),
        achievementRate2: achievementRate2.toFixed(2),
        overallCVR: overallCVR.toFixed(2),
        monthlyData: monthly,
      };

    case 'pageFlow':
    case 'page_flow':
      // ページフロー分析：fetchGA4PageTransition の結果
      return {
        pagePath: rawData.pagePath || '',
        totalPageViews: rawData.totalPageViews || 0,
        trafficBreakdown: rawData.trafficBreakdown || {},
        internalTransitions: rawData.internalTransitions || [],
        transitionCount: rawData.internalTransitions?.length || 0,
      };

    case 'channels':
      // 集客チャネル分析：fetchGA4ChannelConversionData の結果
      const channelsRows = rawData.rows || [];
      const totalSessions = channelsRows.reduce((sum, row) => sum + (row.sessions || 0), 0);
      const totalUsers = channelsRows.reduce((sum, row) => sum + (row.activeUsers || 0), 0);
      const totalConversions = channelsRows.reduce((sum, row) => sum + (row.conversions || 0), 0);
      const channelsText = channelsRows
        .sort((a, b) => (b.sessions || 0) - (a.sessions || 0))
        .slice(0, 5)
        .map(row => `${row.sessionDefaultChannelGroup || row.channel || '不明'}: ${row.sessions || 0}セッション, ${row.conversions || 0}コンバージョン`)
        .join(', ');
      return {
        totalSessions,
        totalUsers,
        totalConversions,
        channelCount: channelsRows.length,
        channelsText,
        channelsData: channelsRows,
        hasConversionDefinitions: rawData.hasConversionEvents || false,
        conversionEventNames: rawData.conversionEventNames || [],
      };

    case 'keywords':
      // 流入キーワード分析：fetchGSCData の結果
      const topQueries = rawData.topQueries || [];
      const totalClicks = rawData.metrics?.clicks || 0;
      const totalImpressions = rawData.metrics?.impressions || 0;
      const avgCTR = rawData.metrics?.ctr || 0;
      const avgPosition = rawData.metrics?.position || 0;
      const topKeywordsText = topQueries
        .slice(0, 10)
        .map(q => `${q.query}: ${q.clicks}クリック, ${q.impressions}表示, CTR ${(q.ctr * 100).toFixed(2)}%, 平均順位 ${q.position.toFixed(1)}`)
        .join('\n');
      return {
        totalClicks,
        totalImpressions,
        avgCTR,
        avgPosition,
        keywordCount: topQueries.length,
        topKeywordsText,
        keywordsData: topQueries,
        hasGSCConnection: true,
      };

    case 'referrals':
      // 参照元/メディア分析：fetchGA4ReferralConversionData の結果
      const referralsRows = rawData.rows || [];
      const referralsTotalSessions = referralsRows.reduce((sum, row) => sum + (row.sessions || 0), 0);
      const referralsTotalUsers = referralsRows.reduce((sum, row) => sum + (row.users || 0), 0);
      const referralsTotalConversions = referralsRows.reduce((sum, row) => sum + (row.conversions || 0), 0);
      const avgConversionRate = referralsTotalSessions > 0 ? (referralsTotalConversions / referralsTotalSessions) * 100 : 0;
      const topReferralsText = referralsRows
        .sort((a, b) => (b.sessions || 0) - (a.sessions || 0))
        .slice(0, 10)
        .map(row => {
          const sessions = row.sessions || 0;
          const users = row.users || 0;
          const conversions = row.conversions || 0;
          const cvr = sessions > 0 ? ((conversions / sessions) * 100).toFixed(2) : '0.00';
          const engRate = ((row.engagementRate || 0) * 100).toFixed(1);
          const avgDuration = row.avgSessionDuration || 0;
          const durationMin = Math.floor(avgDuration / 60);
          const durationSec = Math.floor(avgDuration % 60);
          return `${row.source}: ${sessions}セッション, ${users}ユーザー, CV ${conversions}件 (CVR ${cvr}%), ENG率 ${engRate}%, 滞在時間 ${durationMin}分${durationSec}秒`;
        })
        .join('\n');
      return {
        totalSessions: referralsTotalSessions,
        totalUsers: referralsTotalUsers,
        totalConversions: referralsTotalConversions,
        avgConversionRate,
        referralCount: referralsRows.length,
        topReferralsText,
        referralsData: referralsRows,
        hasConversionDefinitions: rawData.hasConversionEvents || false,
        conversionEventNames: rawData.conversionEventNames || [],
      };

    case 'landingPages':
      // ランディングページ分析：fetchGA4LandingPageConversionData の結果
      const landingPagesRows = rawData.rows || [];
      const landingPagesTotalSessions = landingPagesRows.reduce((sum, row) => sum + (row.sessions || 0), 0);
      const landingPagesTotalConversions = landingPagesRows.reduce((sum, row) => sum + (row.conversions || 0), 0);
      const topLandingPagesText = landingPagesRows
        .sort((a, b) => (b.sessions || 0) - (a.sessions || 0))
        .slice(0, 10)
        .map(row => {
          const sessions = row.sessions || 0;
          const engRate = ((row.engagementRate || 0) * 100).toFixed(1);
          const avgDuration = row.averageSessionDuration ? `${Math.floor(row.averageSessionDuration / 60)}分${Math.floor(row.averageSessionDuration % 60)}秒` : '0秒';
          const conversions = row.conversions || 0;
          const cvr = sessions > 0 ? ((conversions / sessions) * 100).toFixed(2) : '0.00';
          return `${row.landingPage}: ${sessions}セッション, ENG率 ${engRate}%, 滞在時間 ${avgDuration}, CV ${conversions}件 (CVR ${cvr}%)`;
        })
        .join('\n');
      return {
        totalSessions: landingPagesTotalSessions,
        totalConversions: landingPagesTotalConversions,
        landingPageCount: landingPagesRows.length,
        topLandingPagesText,
        landingPagesData: landingPagesRows,
        hasConversionDefinitions: rawData.hasConversionEvents || false,
        conversionEventNames: rawData.conversionEventNames || [],
      };

    case 'pages':
      // ページ別分析：useGA4Data (pagePath, pageTitle) の結果
      const pagesRows = rawData.rows || [];
      const pagesTotalPageViews = pagesRows.reduce((sum, row) => sum + (row.screenPageViews || 0), 0);
      const topPagesText = pagesRows
        .sort((a, b) => (b.screenPageViews || 0) - (a.screenPageViews || 0))
        .slice(0, 10)
        .map(row => {
          const pv = row.screenPageViews || 0;
          const engRate = ((row.engagementRate || 0) * 100).toFixed(1);
          const avgDuration = row.averageSessionDuration || 0;
          const durationMin = Math.floor(avgDuration / 60);
          const durationSec = Math.floor(avgDuration % 60);
          return `${row.pagePath || row.pageTitle}: ${pv}PV, ENG率 ${engRate}%, 滞在時間 ${durationMin}分${durationSec}秒`;
        })
        .join('\n');
      return {
        totalPageViews: pagesTotalPageViews,
        pageCount: pagesRows.length,
        topPagesText,
        pagesData: pagesRows,
        hasConversionDefinitions: rawData.hasConversionEvents || false,
        conversionEventNames: rawData.conversionEventNames || [],
      };

    case 'pageCategories':
      // ページ分類別分析：categoryDataの結果
      console.log('[formatRawDataToMetrics - pageCategories] rawData:', JSON.stringify(rawData, null, 2));
      const pageCategoriesRows = rawData.rows || [];
      console.log('[formatRawDataToMetrics - pageCategories] rows count:', pageCategoriesRows.length);
      console.log('[formatRawDataToMetrics - pageCategories] sample row:', pageCategoriesRows[0]);
      const categoriesTotalPageViews = pageCategoriesRows.reduce((sum, row) => sum + (row.pageViews || 0), 0);
      
      // カテゴリ別の詳細テキスト生成（上位10件）
      const topCategoriesText = pageCategoriesRows
        .sort((a, b) => (b.pageViews || 0) - (a.pageViews || 0))
        .slice(0, 10)
        .map(row => {
          const category = row.category || '不明';
          const pageCount = row.pages || 0;
          const pv = row.pageViews || 0;
          const percentage = categoriesTotalPageViews > 0 ? ((pv / categoriesTotalPageViews) * 100).toFixed(1) : 0;
          return `${category}: ${pageCount}ページ, ${pv.toLocaleString()}PV (${percentage}%)`;
        })
        .join('\n');
      
      return {
        totalPageViews: categoriesTotalPageViews,
        categoryCount: pageCategoriesRows.length,
        topCategoriesText,
        pageCategoriesData: pageCategoriesRows,
      };

    case 'conversions':
      // コンバージョン一覧分析：fetchGA4MonthlyConversionData の結果
      const conversionsData = rawData.data || [];
      const conversionEventNames = Object.keys(conversionsData[0] || {}).filter(key => key !== 'yearMonth');
      
      // イベント別の合計値を計算
      const eventTotals = {};
      conversionEventNames.forEach(eventName => {
        eventTotals[eventName] = conversionsData.reduce((sum, month) => sum + (month[eventName] || 0), 0);
      });
      
      // イベント別の合計をテキスト化
      const conversionSummaryText = conversionEventNames.length > 0
        ? conversionEventNames.map(name => `${name}: ${eventTotals[name].toLocaleString()}件`).join(', ')
        : 'データなし';
      
      // 月次データの詳細テキストを生成
      let monthlyDetailText = '';
      if (conversionsData.length > 0 && conversionEventNames.length > 0) {
        monthlyDetailText = '\n\n【月次データ詳細】\n';
        conversionsData.forEach(month => {
          const yearMonth = month.yearMonth || '不明';
          const eventDetails = conversionEventNames.map(name => `${name}: ${month[name] || 0}件`).join(', ');
          monthlyDetailText += `${yearMonth}: ${eventDetails}\n`;
        });
      }
      
      // 当月（最新月）のデータを取得
      const latestMonth = conversionsData.length > 0 ? conversionsData[conversionsData.length - 1] : null;
      const latestMonthText = latestMonth
        ? conversionEventNames.map(name => `${name}: ${latestMonth[name] || 0}件`).join(', ')
        : 'データなし';
      
      return {
        monthlyDataPoints: conversionsData.length,
        conversionEventCount: conversionEventNames.length,
        conversionSummaryText,
        monthlyDetailText,
        latestMonth: latestMonth?.yearMonth || '不明',
        latestMonthText,
        monthlyConversions: conversionsData,
        conversionEventNames,
        eventTotals,
      };

    case 'fileDownloads':
      // ファイルダウンロード分析：useGA4Data (file_download) の結果
      const downloadRows = rawData.rows?.filter(row => row.eventName === 'file_download') || [];
      const totalDownloads = downloadRows.reduce((sum, row) => sum + (row.eventCount || 0), 0);
      const downloadTotalUsers = downloadRows.reduce((sum, row) => sum + (row.activeUsers || 0), 0);
      const topFilesText = downloadRows
        .sort((a, b) => (b.eventCount || 0) - (a.eventCount || 0))
        .slice(0, 10)
        .map(row => `${row.fileName || row.linkUrl}: ${row.eventCount || 0}ダウンロード`)
        .join(', ');
      return {
        totalDownloads,
        totalUsers: downloadTotalUsers,
        downloadCount: downloadRows.length,
        topFilesText,
        downloadsData: downloadRows,
        hasConversionDefinitions: rawData.hasConversionEvents || false,
        conversionEventNames: rawData.conversionEventNames || [],
      };

    case 'externalLinks':
      // 外部リンククリック分析：useGA4Data (click) の結果
      const clickRows = rawData.rows?.filter(row => row.eventName === 'click') || [];
      const totalClicksCount = clickRows.reduce((sum, row) => sum + (row.eventCount || 0), 0);
      const clickTotalUsers = clickRows.reduce((sum, row) => sum + (row.activeUsers || 0), 0);
      const topLinksText = clickRows
        .sort((a, b) => (b.eventCount || 0) - (a.eventCount || 0))
        .slice(0, 10)
        .map(row => `${row.linkUrl}: ${row.eventCount || 0}クリック`)
        .join(', ');
      return {
        totalClicks: totalClicksCount,
        totalUsers: clickTotalUsers,
        clickCount: clickRows.length,
        topLinksText,
        linksData: clickRows,
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
  console.log(`[generatePrompt] ページタイプ「${pageType}」のデフォルトプロンプトを使用`);

  // デフォルトプロンプトを使用（カスタムプロンプト機能は廃止）
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
- 平均PV/セッション: ${metrics.pageViews && metrics.sessions ? (metrics.pageViews / metrics.sessions).toFixed(2) : '0.00'}
- エンゲージメント率: ${((metrics.engagementRate || 0) * 100).toFixed(1)}%
- コンバージョン数: ${metrics.conversions?.toLocaleString() || 0}件${monthlyTrendText}

【要求事項】
- **800文字以内で簡潔にまとめる**（これは厳守してください）
- Markdownの見出し記法（##, ###）を使用して構造化
- **構成比や割合を示す際は、必ず数値（件数・人数など）とパーセンテージをセットで明示する**
  例：「上位3で全体の65%（12,150PV）」「男性60%（1,200人）」
- **必ず以下のセクションを含める**：

## 概要
- 期間全体のパフォーマンスを2-3文で簡潔に総括
- 主要指標サマリ（セッション、ユーザー、新規ユーザー、表示回数、平均PV、エンゲージメント率、コンバージョン数、CVR）の全体像を俯瞰
- 最も注目すべきポイントを冒頭で明示

## 主要指標サマリの考察
- セッション、ユーザー、新規ユーザー、表示回数（ページビュー）、平均PV、エンゲージメント率、コンバージョン数、CVRの総評
- 各指標の数値を明示し、ビジネスへの影響を考察
- 良い点（成長・改善している指標）と課題点（停滞・減少している指標）の両方を明確に指摘

## 当月の考察
- 直近1ヶ月にフォーカスした分析
- 前月比データから増減傾向を具体的な数値で分析
- 特に変化の大きい指標（±10%以上）を優先的に取り上げる
- 当月の特徴的な動きやイベントがあれば言及

## 過去の推移の考察
- 13ヶ月間の推移にフォーカスした分析
- 成長トレンド、季節性、転換点を特定
- **トレンドの原因を考察**：「なぜそうなったか」の視点で記述
- 中長期的なパターンや傾向を読み取り、今後の予測に役立てる

## 改善点
- 課題となっている指標とその原因仮説を2-3点提示
- 具体的で実行可能な改善アプローチを提案
- 優先順位とビジネスインパクトを明示

【禁止事項】
- ❌ 数値の羅列のみで終わる
- ❌ 抽象的な表現（「多い」「少ない」など）のみで数値を示さない
- ❌ 5つのセクション（概要、主要指標サマリの考察、当月の考察、過去の推移の考察、改善点）の欠落
`;
  }

  if (pageType === 'day') {
    // CV定義の有無をチェック
    const hasConversions = metrics.hasConversionDefinitions === true;
    
    // 日別分析データの詳細整形（統計+曜日別平均）
    let dailyStatsText = '';
    if (metrics.dailyData && Array.isArray(metrics.dailyData) && metrics.dailyData.length > 0) {
      const allDays = metrics.dailyData;
      
      // セッションの最大・最小・平均を計算
      let maxSessions = 0, minSessions = Infinity;
      let maxSessionDay = '', minSessionDay = '';
      let totalSessions = 0;
      
      // コンバージョンの最大・最小・平均を計算
      let maxConversions = 0, minConversions = Infinity;
      let maxConversionDay = '', minConversionDay = '';
      let totalConversions = 0;
      let hasConversionData = false;
      
      // 曜日別の集計
      const dayOfWeekStats = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
      const dayOfWeekConversions = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
      const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
      
      // 日別詳細データ（日付+曜日）を格納
      const dailyDetailList = [];
      
      allDays.forEach(day => {
        const sessions = day.sessions || 0;
        const conversions = day.conversions || 0;
        
        totalSessions += sessions;
        totalConversions += conversions;
        
        if (conversions > 0) hasConversionData = true;
        
        // セッションの最大・最小
        if (sessions > maxSessions) {
          maxSessions = sessions;
          maxSessionDay = day.date;
        }
        if (sessions < minSessions) {
          minSessions = sessions;
          minSessionDay = day.date;
        }
        
        // コンバージョンの最大・最小
        if (conversions > maxConversions) {
          maxConversions = conversions;
          maxConversionDay = day.date;
        }
        if (conversions < minConversions && conversions > 0) {
          minConversions = conversions;
          minConversionDay = day.date;
        }
        
        // 曜日を判定（dateがYYYYMMDD形式）
        if (day.date) {
          const dateStr = day.date.toString();
          const year = parseInt(dateStr.substring(0, 4));
          const month = parseInt(dateStr.substring(4, 6)) - 1; // 0-indexed
          const dayNum = parseInt(dateStr.substring(6, 8));
          const date = new Date(year, month, dayNum);
          const dayOfWeek = date.getDay(); // 0=日, 1=月, ..., 6=土
          
          if (!isNaN(dayOfWeek)) {
            dayOfWeekStats[dayOfWeek].push(sessions);
            dayOfWeekConversions[dayOfWeek].push(conversions);
            
            // 日別詳細リストに追加（日付、曜日、セッション、コンバージョン）
            const formattedDate = `${year}/${month + 1}/${dayNum}`;
            dailyDetailList.push({
              date: formattedDate,
              dayOfWeek: dayNames[dayOfWeek],
              sessions,
              conversions
            });
          }
        }
      });
      
      const avgSessions = Math.round(totalSessions / allDays.length);
      const avgConversions = hasConversionData ? (totalConversions / allDays.length).toFixed(1) : 0;
      
      // 曜日別平均を計算
      const dayOfWeekAvg = Object.keys(dayOfWeekStats).map(day => {
        const sessions = dayOfWeekStats[day];
        if (sessions.length === 0) return null;
        const avg = Math.round(sessions.reduce((a, b) => a + b, 0) / sessions.length);
        return `${dayNames[day]}曜: ${avg.toLocaleString()}`;
      }).filter(Boolean).join(', ');
      
      // 日別詳細データをテキスト化（上位10件と下位5件を表示）
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
- **必ず以下のセクションを含める**：

## 概要
- 日別のセッションとコンバージョンの総括（2-3文で簡潔に）
- 総セッション数、1日平均${hasConversions ? '、全体CVR' : ''}を数値で明示
- 最も特徴的なポイント（例：変動の大きさ、曜日傾向など）を冒頭で述べる

## セッションの考察
- **最大日・最小日の対比**：具体的な日付と数値を明示
  例：「10月15日（金）が最大で485セッション、10月3日（月）が最小で248セッション（1.96倍の差）」
- **曜日による傾向**：各曜日の特徴を数値で示す
  例：「週末（土日）は平日比+32%で、平均で120セッション多い」
  例：「月曜日が最も少なく、金曜日が最も多い傾向」
- **期間内でのトレンド**：週次・前半後半での変化
  例：「第1週平均340回 → 第4週385回（+13.2%の増加傾向）」
- セッションが多い日・少ない日の特徴を分析し、その要因を考察
  例：「イベント開催日、キャンペーン実施日、広告配信強化日など」

## コンバージョンの考察
- ${hasConversions ? 'コンバージョンが多い日・少ない日の対比を具体的な数値で示す' : 'コンバージョン定義が未設定のため、このセクションは「コンバージョン未設定」と簡潔に記載'}
  ${hasConversions ? '例：「10月18日が最大で25件（CVR 4.8%）、10月5日が最小で8件（CVR 2.5%）」' : ''}
- ${hasConversions ? 'CVRと曜日の相関を分析' : ''}
  ${hasConversions ? '例：「水曜日のCVRが平均3.8%で最も高く、月曜日が2.1%で最も低い」' : ''}
- ${hasConversions ? 'セッション数とCVRの関係性を考察' : ''}
  ${hasConversions ? '例：「セッション数が多い日でもCVRが低い場合、質の低いトラフィックの可能性」' : ''}

## 改善点
- 課題となっている日別パターンとその原因仮説を2-3点提示
- 具体的で実行可能な改善アプローチを提案
  例：「セッションが少ない曜日への広告配信強化」
  例：「CVRが低い曜日のランディングページ改善」
  例：「トラフィックが多い曜日にキャンペーンを集中」
- 優先順位とビジネスインパクトを明示

【禁止事項】
- ❌ 統計値の羅列のみで終わる
- ❌ 数値を示さない抽象的な表現
- ❌ 4つのセクション（概要、セッションの考察、コンバージョンの考察、改善点）の欠落
`;
  }

  if (pageType === 'week') {
    // CV定義の有無をチェック
    const hasConversions = metrics.conversionEventNames && metrics.conversionEventNames.length > 0;
    
    // 曜日別データの詳細テキスト化（rawDataから正確に）
    let weeklyDetailsText = '';
    if (metrics.weeklyData && Array.isArray(metrics.weeklyData) && metrics.weeklyData.length > 0) {
      const dayMap = {};
      metrics.weeklyData.forEach(row => {
        const dayOfWeek = parseInt(row.dayOfWeek); // 0=日曜, 1=月曜, ..., 6=土曜
        const sessions = row.sessions || 0;
        const conversions = row.conversions || 0;
        const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // 月曜日を0にする
        if (!dayMap[adjustedDay]) {
          dayMap[adjustedDay] = { sessions: 0, conversions: 0 };
        }
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
    
    const conversionNote = hasConversions ? `
- コンバージョン数: ${metrics.conversions?.toLocaleString() || 0}件` : '\n\n⚠️ **注意**: コンバージョン定義が未設定です。CV分析をご希望の場合、サイト設定画面から設定してください。';

    return `
あなたは【曜日別分析の専門家】です。${period}のWebサイトの曜日別データを分析し、**曜日ごとのトレンドと最適な施策タイミング**を含む日本語の要約を**必ず800文字以内**で生成してください。

【曜日別データの概要】
- 総セッション数: ${metrics.sessions?.toLocaleString() || 0}回${conversionNote}${weeklyDetailsText}

【要求事項】
- **800文字以内で簡潔にまとめる**（これは厳守してください）
- Markdownの見出し記法（##, ###）を使用して構造化
- **必ず以下のセクションを含める**：

## 概要
- 曜日毎のセッションとコンバージョンの総括（2-3文で簡潔に）
- 総セッション数${hasConversions ? '、全体CVR' : ''}を数値で明示
- 最も特徴的なポイント（例：平日vs週末、最多曜日vs最少曜日など）を冒頭で述べる

## セッションの考察
- **最多曜日・最少曜日の対比**：具体的な数値を明示
  例：「火曜日が2,273セッション（全体の17.3%）で最多、水曜日が1,716セッション（13.1%）で最少（1.32倍の差）」
- **平日vs週末の比較**：
  例：「平日平均390回/日（月～金の合計1,950回）、週末平均510回/日（土日の合計1,020回）で週末が+30.8%多い」
- **セッションが多い上位3曜日**を具体的に列挙
  例：「①火曜日: 2,273セッション（17.3%）、②月曜日: 2,030セッション（15.5%）、③土曜日: 1,864セッション（14.2%）」
- **セッションが少ない下位3曜日**も列挙し、なぜその曜日が少ないか考察
- **ユーザー行動パターンの推測**：
  例：「平日が多い → BtoB寄り（業務時間中に情報収集）」
  例：「週末が多い → BtoC寄り（プライベート時間でじっくり検討）」

## コンバージョンの考察
- ${hasConversions ? 'コンバージョンが多い曜日・少ない曜日の対比を具体的な数値で示す' : 'コンバージョン定義が未設定のため、このセクションは「コンバージョン未設定」と簡潔に記載'}
  ${hasConversions ? '例：「日曜日が最大で21件（CVR 1.30%）、木曜日が最小で8件（CVR 0.55%）」' : ''}
- ${hasConversions ? 'CVRが高い曜日と低い曜日を分析' : ''}
  ${hasConversions ? '例：「日曜日のCVR 1.30%が最も高く、木曜日が0.55%で最も低い」' : ''}
- ${hasConversions ? 'セッション数とCVRの関係性を考察' : ''}
  ${hasConversions ? '例：「セッション数が多い曜日でもCVRが低い場合、質の低いトラフィックの可能性」' : ''}
  ${hasConversions ? '例：「セッション数が少ない曜日でもCVRが高い場合、購買意欲の高いユーザーが来訪」' : ''}

## 改善点
- 課題となっている曜日別パターンとその原因仮説を2-3点提示
- 具体的で実行可能な改善アプローチを提案
  例：「セッションが少ない曜日への広告配信強化」
  例：「CVRが低い曜日のランディングページ改善」
  例：「CVRが高い曜日に予算・キャンペーンを集中」
  例：「平日と週末で訴求メッセージを変える」
- 優先順位とビジネスインパクトを明示

【禁止事項】
- ❌ 「曜日による違いがある」程度の抽象的な記述
- ❌ 数値を示さない曖昧な表現（「多い」「少ない」だけで終わる）
- ❌ 4つのセクション（概要、セッションの考察、コンバージョンの考察、改善点）の欠落
- ❌ 時間帯（9時、20時など）の言及（このデータには時間帯情報が含まれていません）
`;
  }

  if (pageType === 'hour') {
    // CV定義の有無をチェック
    const hasConversions = metrics.conversionEventNames && metrics.conversionEventNames.length > 0;
    
    // 時間帯別データの詳細テキスト化（rawDataから正確に）
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
    
    const conversionNote = hasConversions ? `
- コンバージョン数: ${metrics.conversions?.toLocaleString() || 0}件` : '\n\n⚠️ **注意**: コンバージョン定義が未設定です。CV分析をご希望の場合、サイト設定画面から設定してください。';

    return `
あなたは【24時間行動分析の専門家】です。${period}のWebサイトの時間帯別データを分析し、**時間軸でのユーザー行動理解とビジネスへの影響**を含む日本語の要約を**必ず800文字以内**で生成してください。

【時間帯別データの概要】
- 総セッション数: ${metrics.sessions?.toLocaleString() || 0}回${conversionNote}${hourlyDetailsText}

【要求事項】
- **800文字以内で簡潔にまとめる**（これは厳守してください）
- Markdownの見出し記法（##, ###）を使用して構造化
- **必ず以下のセクションを含める**：

## 概要
- 時間帯毎のセッションとコンバージョンの総括（2-3文で簡潔に）
- 総セッション数${hasConversions ? '、全体CVR' : ''}を数値で明示
- 最も特徴的なポイント（例：ピーク時間帯、デッドタイムなど）を冒頭で述べる

## セッションの考察
- **ピーク時間帯トップ3**を具体的な数値で特定
  例：「①20時: 1,450セッション（全体の12.9%）、②21時: 1,380セッション（12.3%）、③14時: 1,120セッション（10.0%）」
- **デッドタイム**（セッションが最も少ない時間帯）を特定
  例：「4-6時は平均50セッション/時で最も低調（全体の1.3%）」
- **時間帯区分別の割合**を明示
  例：「朝（6-9時）: 8%（900セッション）、日中（10-17時）: 42%（4,720セッション）、夜（18-23時）: 38%（4,270セッション）、深夜（0-5時）: 12%（1,350セッション）」
- **セッションが多い時間帯・少ない時間帯の対比**を行い、その特徴を分析
  例：「ピークとデッドタイムの差は29倍で、時間帯による差が顕著」
- **ユーザー行動パターンの推測**：
  例：「通勤時間（7-9時）のアクセスが多い → モバイル利用が中心」
  例：「昼休み（12-14時）のピーク → 休憩時間の閲覧」
  例：「夜間（20-22時）が最大 → 帰宅後のゆっくりした時間に閲覧」

## コンバージョンの考察
- ${hasConversions ? 'コンバージョンが多い時間帯・少ない時間帯の対比を具体的な数値で示す' : 'コンバージョン定義が未設定のため、このセクションは「コンバージョン未設定」と簡潔に記載'}
  ${hasConversions ? '例：「21時が最大で45件（CVR 3.3%）、5時が最小で1件（CVR 0.8%）」' : ''}
- ${hasConversions ? 'CVRが高い時間帯と低い時間帯を分析' : ''}
  ${hasConversions ? '例：「14時はセッション少ないがCVR 4.2%で高く、費用対効果が良好」' : ''}
- ${hasConversions ? 'セッション数とCVRの関係性を考察' : ''}
  ${hasConversions ? '例：「ピーク時間帯（20-22時）はセッション多いがCVRは平均的、質より量のトラフィック」' : ''}

## 改善点
- 課題となっている時間帯別パターンとその原因仮説を2-3点提示
- 具体的で実行可能な改善アプローチを提案
  例：「デッドタイム（深夜・早朝）の活用：システムメンテナンス、データ処理に充てる」
  例：「ピーク時間帯（20-22時）への広告予算集中でリーチを最大化」
  例：「CVRが高い時間帯（14時など）へ予算シフトで費用対効果を向上」
  例：「時間帯別の入札調整で広告配信効率を最適化」
- 優先順位とビジネスインパクトを明示

【禁止事項】
- ❌ 時間ごとの数値羅列のみで終わる
- ❌ 数値を示さない抽象的な表現
- ❌ 4つのセクション（概要、セッションの考察、コンバージョンの考察、改善点）の欠落
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
    logger.info(`[Dashboard KPI] hasKpiSettings: ${metrics.hasKpiSettings}, kpiData length: ${metrics.kpiData?.length || 0}`);
    if (metrics.kpiData && Array.isArray(metrics.kpiData)) {
      logger.info(`[Dashboard KPI] kpiData内容:`, JSON.stringify(metrics.kpiData));
    }
    
    if (metrics.hasKpiSettings && metrics.kpiData && Array.isArray(metrics.kpiData) && metrics.kpiData.length > 0) {
      kpiText = '\n\n【KPI予実】';
      metrics.kpiData.forEach(kpi => {
        const achievementColor = kpi.achievement >= 100 ? '✅' : kpi.achievement >= 80 ? '⚠️' : '❌';
        kpiText += `\n- ${kpi.name}: 実績${kpi.actual?.toLocaleString() || 0}${kpi.unit || ''} / 目標${kpi.target?.toLocaleString() || 0}${kpi.unit || ''} (達成率${kpi.achievement.toFixed(1)}% ${achievementColor})`;
      });
      logger.info(`[Dashboard KPI] KPI予実テキスト生成成功`);
    } else {
      logger.warn(`[Dashboard KPI] KPI予実データが不足しています`);
    }

    return `
あなたは優秀なWebアクセスの解析士です。${period}のWebサイト全体のパフォーマンスを分析し、ビジネス成長に役立つ洞察を含む日本語の要約を**必ず800文字以内**で生成してください。

【現在期間の主要指標】
- 総ユーザー数: ${metrics.users?.toLocaleString() || 0}人
- 新規ユーザー数: ${metrics.newUsers?.toLocaleString() || 0}人
- セッション数: ${metrics.sessions?.toLocaleString() || 0}回
- ページビュー数: ${metrics.pageViews?.toLocaleString() || 0}回
- 平均PV/セッション: ${metrics.pageViews && metrics.sessions ? (metrics.pageViews / metrics.sessions).toFixed(2) : '0.00'}
- エンゲージメント率: ${((metrics.engagementRate || 0) * 100).toFixed(1)}%
- 直帰率: ${((metrics.bounceRate || 0) * 100).toFixed(1)}%
- 平均セッション時間: ${metrics.avgSessionDuration ? `${Math.floor(metrics.avgSessionDuration / 60)}分${Math.floor(metrics.avgSessionDuration % 60)}秒` : '0秒'}${conversionText}${hasConversions ? `\n- コンバージョン率: ${((metrics.conversionRate || 0) * 100).toFixed(2)}%` : ''}${monthOverMonthText}${kpiText}

【要求事項】
- **800文字以内で簡潔にまとめる**（これは厳守してください）
- Markdownの見出し記法（##, ###）を使用して構造化
- **構成比や割合を示す際は、必ず数値（件数・人数など）とパーセンテージをセットで明示する**
  例：「上位3チャネルで全体の78%（8,950セッション）」「男性60%（1,200人）」
- **必ず以下の4つのセクションを含める**：

## 概要
- 期間全体のパフォーマンスを2-3文で簡潔に総括
- 主要指標サマリ、コンバージョン内訳${metrics.hasKpiSettings ? '、KPI予実' : ''}の全体像を俯瞰
- 最も注目すべきポイントを冒頭で明示

## 主要指標サマリの考察
- セッション、ユーザー、新規ユーザー、表示回数（ページビュー）、平均PV、エンゲージメント率、コンバージョン数、CVRの総評
- 前月比データから増減傾向を具体的な数値で分析
- 特に変化の大きい指標（±10%以上）を優先的に取り上げる
- 数値を明示し、ビジネスへの影響を考察

## コンバージョン内訳の考察
- ${hasConversions ? 'コンバージョン内訳の各イベントを具体的に分析' : 'コンバージョン定義が未設定のため、このセクションは「コンバージョン未設定」と簡潔に記載'}
- ${hasConversions ? '前月比で増減が大きいイベントに注目し、その要因を考察' : ''}
- ${hasConversions ? '各イベントの数値と割合を明示' : ''}

## KPI予実の考察
- ${metrics.hasKpiSettings ? 'KPI予実の達成状況を具体的に評価' : 'KPI設定が未設定のため、このセクションは「KPI未設定」と簡潔に記載'}
- ${metrics.hasKpiSettings ? '達成率が高い項目（80%以上）と未達成の項目（80%未満）を明確に区別' : ''}
- ${metrics.hasKpiSettings ? '未達成項目については改善の方向性を具体的に示唆' : ''}

【禁止事項】
- ❌ 数値の羅列のみで終わる
- ❌ 抽象的な表現（「多い」「少ない」など）のみで数値を示さない
- ❌ 4つのセクション（概要、主要指標サマリの考察、コンバージョン内訳の考察、KPI予実の考察）の欠落
- ❌ ${hasConversions ? '提供されたコンバージョン内訳データを無視する' : 'コンバージョンについて詳細に言及する（未設定のため）'}
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
      logger.info('[Users] demographicsData全体:', JSON.stringify(demo, null, 2));
      demographicsText = '\n\n【ユーザー属性の分布】\n';
      
      // 新規/リピーター別（最優先）
      if (demo.newReturning && Array.isArray(demo.newReturning) && demo.newReturning.length > 0) {
        logger.info('[Users] newReturning:', JSON.stringify(demo.newReturning));
        demographicsText += '新規/リピーター別:\n';
        demo.newReturning.forEach(nr => {
          const label = nr.name || '不明';
          const userCount = nr.value || 0;
          const percentage = nr.percentage || 0;
          logger.info(`[Users] newReturning処理: label=${label}, userCount=${userCount}, percentage=${percentage}`);
          if (label !== '不明' && userCount > 0) {
            demographicsText += `- ${label}: ${userCount.toLocaleString()}人 (${percentage.toFixed(1)}%)\n`;
          }
        });
        demographicsText += '\n';
      }
      
      // デバイス別
      if (demo.device && Array.isArray(demo.device) && demo.device.length > 0) {
        hasDeviceData = true;
        logger.info('[Users] device:', JSON.stringify(demo.device));
        demographicsText += 'デバイス別:\n';
        demo.device.forEach(d => {
          const deviceName = d.name || d.deviceCategory || d.device || '不明';
          const userCount = d.value || d.sessions || 0;
          const percentage = d.percentage || 0;
          logger.info(`[Users] device処理: name=${deviceName}, userCount=${userCount}, percentage=${percentage}`);
          if (deviceName !== '不明' && userCount > 0) {
            demographicsText += `- ${deviceName}: ${userCount.toLocaleString()}人 (${percentage.toFixed(1)}%)\n`;
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
      
      // 年齢別
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
      
      // 性別
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
- **必ず以下のセクションを含める**：
- **各セクションで必ず具体的な数値（人数・ユーザー数とパーセンテージ）を引用する**

## 概要
- ユーザー属性の全体像を2-3文で簡潔に総括
- 新規ユーザー/リピーター比率、性別比率、年齢比率、デバイス比率、地域比率の概況を俯瞰
- 最も特徴的なポイントを冒頭で明示

## 新規ユーザー/リピーター比率の考察
- 新規ユーザーとリピーターの割合を具体的な数値で示す
  例：「新規ユーザーが2,500人 (65%)、リピーターが1,500人 (35%)」
- ビジネスへの影響を考察
  - 新規比率が高い → 認知拡大施策が効果的、ただしリピート施策も強化必要
  - リピート比率が高い → ロイヤル顧客の育成が成功、新規獲得施策も必要
- なぜこのような比率になっているか、仮説を提示

## 年齢・性別の考察
- ${hasAgeData || hasGenderData ? '年齢・性別データから主要ターゲット層を特定し、数値で示す' : '年齢・性別データが不足している場合は「データ不足のため分析不可」と記載'}
  ${hasAgeData ? '例：「25-34歳が最大セグメント（35%、1,200人）」' : ''}
  ${hasGenderData ? '例：「男性60%（1,200人）、女性40%（800人）」' : ''}
- ${hasAgeData || hasGenderData ? 'ターゲット層の特性に合わせた施策を提案' : ''}
  ${hasAgeData || hasGenderData ? '例：「若年層が多い → SNS施策、年配層が多い → 信頼性重視のコンテンツ」' : ''}

## デバイス比率の考察
- ${hasDeviceData ? 'デバイス別の構成を具体的な数値で示す' : 'デバイスデータが不足している場合は「データ不足のため分析不可」と記載'}
  ${hasDeviceData ? '例：「モバイルが9,182人 (83.5%)、デスクトップは1,696人 (15.4%)、タブレットは121人 (1.1%)」' : ''}
- ${hasDeviceData ? 'デバイス特性とビジネスへの影響を考察' : ''}
  ${hasDeviceData ? '例：「モバイル比率が高い → モバイルUX最適化、AMP対応が重要」' : ''}
  ${hasDeviceData ? '例：「デスクトップ比率が高い → 詳細情報提供、BtoB向けコンテンツが重要」' : ''}

## 地域比率の考察
- ${hasLocationData ? '地域別の構成を具体的な数値で示す（上位5地域）' : '地域データが不足している場合は「データ不足のため分析不可」と記載'}
  ${hasLocationData ? '例：「東京が2,500人 (32.3%)、大阪が1,680人 (21.7%)、神奈川が1,280人 (16.5%)」' : ''}
- ${hasLocationData ? '地域集中度の評価とビジネスへの影響を考察' : ''}
  ${hasLocationData ? '例：「特定地域に集中 → 地域特化型マーケティングが効果的」' : ''}
  ${hasLocationData ? '例：「全国的に分散 → 全国展開のポテンシャルあり」' : ''}

## 改善点
- 課題となっている属性分布とその原因仮説を2-3点提示
- 具体的で実行可能な改善アプローチを提案
  例：「リピーター率が低い → メルマガ施策、リマーケティング広告の強化」
  例：「特定地域に偏りすぎている → 他地域への広告配信拡大」
- 優先順位とビジネスインパクトを明示

【禁止事項】
- ❌ 数値の羅列のみで終わる
- ❌ 数値を示さない抽象的な表現（「多い」「少ない」など）
- ❌ セグメント間の比較がない
- ❌ 「undefined」などの不明な値の出力
- ❌ 6つのセクション（概要、新規ユーザー/リピーター比率の考察、年齢・性別の考察、デバイス比率の考察、地域比率の考察、改善点）の欠落
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
- **必ず以下のセクションを含める**：

## 概要
- 流入チャネルの全体像を2-3文で簡潔に総括
- 総セッション数、総ユーザー数${hasConversions ? '、総コンバージョン数、全体CVR' : ''}を数値で明示
- 最も特徴的なポイント（例：主要チャネル、チャネル集中度など）を冒頭で述べる

## セッションの考察
- **上位3チャネル**を具体的な数値で明示
  例：「Organic Search: 4,250セッション（37.8%）、Direct: 2,890セッション（25.7%）、Paid Search: 1,680セッション（14.9%）」
- **チャネルの集中度**を評価
  例：「上位3チャネルで全体の78.4%（8,950セッション）を占める（高集中型）」
- **チャネルごとのセッション特性を分析**：
  - Organic Search: SEOの成果、自然検索からの流入
  - Paid Search/Display: 広告投資の直接的な成果
  - Direct: ブランド力、リピーター、ブックマークの指標
  - Social: SNS施策の効果
  - Referral: 外部サイトからの被リンク効果
- **オーガニック vs 有料**の比較
  例：「Organic（自然流入）が全体の52%（5,940セッション）、Paid（有料広告）が23%（2,630セッション）で、SEO資産が効果的に機能」
- チャネル依存度のリスクを考察
  例：「特定チャネルへの過度な依存（50%超、5,000セッション以上）はアルゴリズム変更リスクあり」

## コンバージョンの考察
- ${hasConversions ? 'チャネルごとのコンバージョン数とCVRを具体的な数値で示す' : 'コンバージョン定義が未設定のため、このセクションは「コンバージョン未設定」と簡潔に記載'}
  ${hasConversions ? '例：「Organic Search: 76件（CVR 1.8%）、Direct: 26件（CVR 0.9%）、Paid Search: 22件（CVR 1.3%）」' : ''}
- ${hasConversions ? 'CVRが高いチャネルと低いチャネルを対比' : ''}
  ${hasConversions ? '例：「Organic SearchのCVR 1.8%が最も高く、費用対効果が良好」' : ''}
- ${hasConversions ? '費用対効果の評価' : ''}
  ${hasConversions ? '例：「有料チャネル（Paid Search）のCVR 1.3%は、オーガニック（1.8%）より低く、改善余地あり」' : ''}
- ${hasConversions ? 'セッション数とCVRの関係性を考察' : ''}
  ${hasConversions ? '例：「セッション数が多いチャネルでもCVRが低い場合、質より量のトラフィック」' : ''}

## 改善点
- 課題となっているチャネル構成とその原因仮説を2-3点提示
- 具体的で実行可能な改善アプローチを提案
  例：「低CVRの有料チャネルの広告クリエイティブ・ターゲティング見直し」
  例：「Organic Searchの強化でSEO資産を蓄積、広告費削減」
  例：「特定チャネル依存度を下げ、チャネル分散でリスクヘッジ」
  例：「高CVRチャネルへの予算シフトでROI向上」
- 優先順位とビジネスインパクトを明示

【禁止事項】
- ❌ チャネル名の羅列のみで終わる
- ❌ 数値を示さない抽象的な表現
- ❌ 4つのセクション（概要、セッションの考察、コンバージョンの考察、改善点）の欠落
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
- **必ず以下のセクションを含める**：

## 概要
- 参照元/被リンク元の全体像を2-3文で簡潔に総括
- 総セッション数、総ユーザー数${hasConversions ? '、総コンバージョン数、平均CVR' : ''}を数値で明示
- 最も特徴的なポイント（例：主要参照元、集中度など）を冒頭で述べる

## セッションの考察
- **上位3参照元**をセッション数で具体的に明示
  例：「google.com: 2,450セッション（42.3%）、facebook.com: 1,230セッション（21.2%）、twitter.com: 890セッション（15.4%）」
- **参照元の集中度**を評価
  例：「上位3参照元で全体の78.9%（4,570セッション）を占める（高集中型）」
- **ドメインタイプ別の分類**：
  - 検索エンジン（google.com, yahoo.co.jpなど）
  - SNS（facebook.com, twitter.com, instagram.comなど）
  - ポータルサイト（yahoo.co.jp, msn.comなど）
  - ニュースサイト、ブログ、フォーラムなど
- セッションが多い参照元・少ない参照元の特徴を分析

## ユーザーの考察
- 参照元ごとのユーザー数を分析
  例：「google.comからのユーザー数が1,850人（新規率75.5%）で最多」
- セッション数とユーザー数の関係性を考察
  例：「SNS系はセッション数は多いが新規ユーザー率が低い（リピート訪問が多い）」

## コンバージョンの考察
- ${hasConversions ? '参照元ごとのコンバージョン数とCVRを具体的な数値で示す' : 'コンバージョン定義が未設定のため、このセクションは「コンバージョン未設定」と簡潔に記載'}
  ${hasConversions ? '例：「google.com: 51件（CVR 2.1%）、facebook.com: 10件（CVR 0.8%）、twitter.com: 8件（CVR 0.9%）」' : ''}
- ${hasConversions ? 'CVRが高い参照元と低い参照元を対比' : ''}
  ${hasConversions ? '例：「google.comのCVR 2.1%が最も高く、SNS系は0.8%程度で低調」' : ''}
- ${hasConversions ? 'セッション数とCVRの関係性を考察' : ''}
  ${hasConversions ? '例：「セッション数が多い参照元でもCVRが低い場合、質の低いトラフィックの可能性」' : ''}

## 改善点
- 課題となっている参照元構成とその原因仮説を2-3点提示
- 具体的で実行可能な改善アプローチを提案
  例：「CVRが高い参照元（google.comなど）への露出を増やす（被リンク獲得、PR強化）」
  例：「低CVRのSNS参照元の改善（ターゲティング見直し、LP最適化）」
  例：「質の高い参照元からのリンク獲得でSEO効果も向上」
  例：「特定参照元依存度を下げ、参照元分散でリスクヘッジ」
- 優先順位とビジネスインパクトを明示

【禁止事項】
- ❌ 参照元の羅列のみで終わる
- ❌ 数値を示さない抽象的な表現
- ❌ 5つのセクション（概要、セッションの考察、ユーザーの考察、コンバージョンの考察、改善点）の欠落
`;
  }

  if (pageType === 'landingPages') {
    // ランディングページ分析用のプロンプト
    const hasConversions = metrics.conversionEventNames && metrics.conversionEventNames.length > 0;
    const conversionNote = hasConversions ? '' : '\n\n⚠️ **注意**: コンバージョン定義が未設定です。CV分析をご希望の場合、サイト設定画面から設定してください。';

    return `
あなたは【ランディングページ最適化の専門家】です。${period}のWebサイトのランディングページデータを分析し、**ファーストインプレッション改善に役立つインサイト**を含む日本語の要約を**必ず800文字以内**で生成してください。

【ランディングページデータ】
- 総セッション数: ${metrics.totalSessions?.toLocaleString() || 0}回${hasConversions ? `
- 総コンバージョン数: ${metrics.totalConversions?.toLocaleString() || 0}件` : ''}
- LP数: ${metrics.landingPageCount || 0}ページ${conversionNote}

【LP別の内訳（上位10件）】
${metrics.topLandingPagesText || 'データなし'}

【要求事項】
- **800文字以内で簡潔にまとめる**（これは厳守してください）
- Markdownの見出し記法（##, ###）を使用して構造化
- **構成比や割合を示す際は、必ず数値（件数・人数など）とパーセンテージをセットで明示する** 例：「上位3で全体の65%（1,950セッション）」「セッション数上位3LPで70%」
- **必ず以下のセクションを含める**：

## 概要
- ランディングページパフォーマンスの全体像を2-3文で簡潔に総括
- 総セッション数${hasConversions ? '、総コンバージョン数、平均CVR' : ''}を数値で明示
- 最も特徴的なポイント（例：主要LP、集中度など）を冒頭で述べる

## セッションの考察
- **上位3LP**をセッション数で具体的に明示
  例：「/ (トップページ): 3,450セッション（38.2%）、/products/abc: 1,230セッション（13.6%）、/campaign2025: 890セッション（9.9%）」
- **LPの集中度**を評価
  例：「上位3LPで全体の61.7%（5,570セッション）を占める（中集中型）」
- **LPタイプ別の分類**と特徴を分析：
  - トップページ（/）→ ブランド認知、直接訪問
  - 商品ページ（/products/, /services/）→ 検討・比較
  - キャンペーンLP（/campaign/, /lp/）→ 広告流入
  - ブログ・記事（/blog/, /articles/）→ SEO・認知拡大
- セッション数が多いLP・少ないLPの特徴を分析

## エンゲージメント率の考察
- **ENG率が高いLP**と**ENG率が低いLP**を対比
  例：「/campaign2025のENG率が78.5%で最も高く、トップページは52.3%で改善余地あり」
- ENG率とLPタイプの関係性を考察
  例：「キャンペーンLPのENG率が高い → ターゲットが明確で訴求が効果的」
  例：「トップページのENG率が低い → 導線改善、コンテンツ充実が必要」

## 平均滞在時間の考察
- **滞在時間が長いLP**と**滞在時間が短いLP**を対比
  例：「/blog/article-789の平均滞在時間が4分12秒で最も長く、トップページは1分8秒」
- 滞在時間とLPタイプの関係性を考察
  例：「ブログ記事LPは滞在時間が長い → じっくり読まれている」
  例：「トップページは滞在時間が短い → 次のページへの遷移が早い（回遊性が高い）」

## 改善点
- 課題となっているLPパフォーマンスとその原因仮説を2-3点提示
- 具体的で実行可能な改善アプローチを提案
  例：「セッションは多いがENG率が低いLP → ファーストビュー改善、明確なCTA配置」
  例：「滞在時間が短いLP → コンテンツ充実、関連コンテンツへの内部リンク追加」
  例：「高ENG率・高CVRのLP → 広告予算を集中投下してセッション数増加」
  例：「低セッションのLP → SEO改善、広告配信強化」
- 優先順位とビジネスインパクトを明示

【禁止事項】
- ❌ LPの羅列のみで終わる
- ❌ 数値を示さない抽象的な表現
- ❌ 5つのセクション（概要、ページビューの考察、エンゲージメント率の考察、平均滞在時間の考察、改善点）の欠落
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
- ページ数: ${metrics.pageCount || 0}ページ${conversionNote}

【ページ別の内訳（上位10件）】
${metrics.topPagesText || 'データなし'}

【要求事項】
- **800文字以内で簡潔にまとめる**（これは厳守してください）
- Markdownの見出し記法（##, ###）を使用して構造化
- **必ず以下のセクションを含める**：

## 概要
- ページ別パフォーマンスの全体像を2-3文で簡潔に総括
- 総ページビュー数を数値で明示
- 最も特徴的なポイント（例：主要ページ、集中度など）を冒頭で述べる

## ページビューの考察
- **上位3ページ**をページビュー数で具体的に明示
  例：「/ (トップ): 5,230PV（28.5%）、/products/abc: 2,140PV（11.7%）、/blog/article-123: 1,890PV（10.3%）」
- **ページの集中度**を評価
  例：「上位10ページで全体の65%（12,150PV）を占める（中集中型）」
- PVが多いページ・少ないページの特徴を分析
  例：「トップページが圧倒的に多い → 内部リンクがトップに集中」

## エンゲージメント率の考察
- **ENG率が高いページ**と**ENG率が低いページ**を対比
  例：「/blog/article-123のENG率が85.3%で最も高く、/products/abc は52.1%で改善余地あり」
- ENG率とページタイプの関係性を考察
  例：「ブログ記事のENG率が高い → コンテンツの質が高く、ユーザーが満足している」
  例：「商品ページのENG率が低い → コンテンツ改善、関連情報の充実が必要」
- ENG率とPVの関係性を考察
  例：「PVは多いがENG率が低いページ → 導線は機能しているがコンテンツ改善が必要」

## 平均滞在時間の考察
- **滞在時間が長いページ**と**滞在時間が短いページ**を対比
  例：「/blog/article-456の平均滞在時間が3分45秒で最も長く、/products/xyz は28秒で短い」
- 滞在時間とコンテンツタイプの関係性を考察
  例：「ブログ記事は滞在時間が長い → じっくり読まれている」
  例：「商品ページは滞在時間が短い → 簡潔に情報を得て次のアクションへ」
- 滞在時間とENG率の関係性を考察
  例：「滞在時間が長くENG率も高いページ → 質の高いコンテンツで満足度が高い」

## 改善点
- 課題となっているページパフォーマンスとその原因仮説を2-3点提示
- 具体的で実行可能な改善アプローチを提案
  例：「PVは多いがENG率が低いページ → コンテンツ改善、関連ページへの内部リンク追加」
  例：「滞在時間が短いページ → コンテンツの充実、ビジュアル改善」
  例：「低PVページ → SEO改善、内部リンク強化、統廃合を検討」
  例：「高ENG率・高滞在時間のページ → 同様のコンテンツを増産して成功パターンを横展開」
- 優先順位とビジネスインパクトを明示

【禁止事項】
- ❌ ページの羅列のみで終わる
- ❌ 数値を示さない抽象的な表現
- ❌ 5つのセクション（概要、ページビューの考察、エンゲージメント率の考察、平均滞在時間の考察、改善点）の欠落
`;
  }

  if (pageType === 'pageCategories') {
    // ページカテゴリ別分析用のプロンプト
    return `
あなたは【コンテンツカテゴリ戦略の専門家】です。${period}のWebサイトのカテゴリ別データを分析し、**サイト構造最適化に役立つインサイト**を含む日本語の要約を**必ず800文字以内**で生成してください。

【カテゴリ別データ】
- 総ページビュー数: ${metrics.totalPageViews?.toLocaleString() || 0}PV
- カテゴリ数: ${metrics.categoryCount || 0}カテゴリ

【カテゴリ別の内訳（上位10件）】
${metrics.topCategoriesText || 'データなし'}

【要求事項】
- **800文字以内で簡潔にまとめる**（これは厳守してください）
- Markdownの見出し記法（##, ###）を使用して構造化
- **必ず以下のセクションを含める**：

## 概要
- ページカテゴリ別パフォーマンスの全体像を2-3文で簡潔に総括
- 総ページビュー数、カテゴリ数を数値で明示
- 最も特徴的なポイント（例：主要カテゴリ、集中度など）を冒頭で述べる

## カテゴリに対するページビューの考察
- **上位3カテゴリ**をページビュー数で具体的に明示
  例：「/ (トップレベル): 8,450PV（45.2%）、/blog: 3,230PV（17.3%）、/products: 2,890PV（15.5%）」
- **カテゴリの集中度**を評価
  例：「上位3カテゴリで全体の78.0%（14,570PV）を占める（高集中型）」
- **カテゴリ規模の比較**：
  PV数だけでなく、含まれるページ数も考慮
  例：「/blogは230ページあるが、/productsは15ページのみで高PV → 商品ページの訴求力が高い」
- **カテゴリタイプ別の役割**を分析：
  - コアコンテンツ（/, /products, /servicesなど）→ ビジネスの中核
  - 集客コンテンツ（/blog, /news, /articlesなど）→ SEO・認知拡大
  - サポートコンテンツ（/faq, /support, /guideなど）→ ユーザーサポート
  - トランザクション（/contact, /apply, /cartなど）→ ユーザーアクション獲得
- **カテゴリ間のバランス**：
  集客カテゴリとビジネス目標達成に向けたカテゴリのバランスを評価
  例：「ブログカテゴリが全体の55%（10,285PV）を占め、集客重視のサイト構造」
- PVが多いカテゴリ・少ないカテゴリの特徴を分析し、ビジネス目標との一致度を考察
  例：「重要な商品カテゴリのPVが少ない → 導線改善、露出強化が必要」

## 改善点
- 課題となっているカテゴリ構成とその原因仮説を2-3点提示
- 具体的で実行可能な改善アプローチを提案
  例：「高PVカテゴリ → 継続的なコンテンツ拡充と品質維持でさらに伸ばす」
  例：「低PVカテゴリ → 拡充 or 統廃合を検討、SEO改善、内部リンク強化」
  例：「カテゴリ間のバランスが偏っている → 戦略的にバランスを調整」
  例：「高PVカテゴリへのアクセス導線を強化（メガメニュー、フッター、サイドバー）」
- 優先順位とビジネスインパクトを明示

【禁止事項】
- ❌ カテゴリの羅列のみで終わる
- ❌ 数値を示さない抽象的な表現
- ❌ 3つのセクション（概要、カテゴリに対するページビューの考察、改善点）の欠落
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
- **必ず以下のセクションを含める**：

## 概要
- 流入キーワードの全体像を2-3文で簡潔に総括
- 総クリック数、総表示回数、平均CTR、平均掲載順位を数値で明示
- 最も特徴的なポイント（例：主要キーワード、キーワード集中度など）を冒頭で述べる

## クリック数の考察
- **上位3キーワード**をクリック数で具体的に明示
  例：「○○○○: 450クリック（全体の15.2%）、△△△△: 320クリック（10.8%）、□□□□: 280クリック（9.5%）」
- **キーワードの集中度**を評価
  例：「上位10キーワードで全クリックの65%（1,950クリック）を占める（中集中型）」
- クリック数が多いキーワード・少ないキーワードの特徴を分析
  例：「ブランドキーワードがクリック数トップ → 指名検索が強い」

## 表示回数の考察
- **表示回数が多い上位3キーワード**を明示
  例：「○○○○: 3,600表示、△△△△: 2,800表示、□□□□: 2,100表示」
- 表示回数とクリック数の関係性を考察
  例：「表示回数は多いがクリック数が少ないキーワード → CTR低下の要因分析が必要」

## クリック率（CTR）の考察
- **CTRが高いキーワード**と**CTRが低いキーワード**を対比
  例：「ブランドキーワードのCTRが25.3%で最も高く、一般キーワードは8.2%」
- CTRと掲載順位の関係を分析
  例：「高順位（1-3位）でもCTRが低いキーワード → タイトル・ディスクリプション改善が必要」
  例：「低順位（4-10位）でもCTRが高いキーワード → 順位向上でクリック大幅増加が期待できる」

## 平均掲載順位の考察
- **掲載順位が高いキーワード**（上位1-3位）と**掲載順位が低いキーワード**（4位以下）を対比
  例：「ブランドキーワードは平均1.8位で安定、一般キーワードは5.2位で改善余地あり」
- 掲載順位が低いキーワードの改善機会を提示
  例：「4-10位のキーワードは上位3位以内を目指すことでクリック数が2-3倍になる可能性」

## 改善点
- 課題となっているキーワード構成とその原因仮説を2-3点提示
- 具体的で実行可能な改善アプローチを提案
  例：「表示回数は多いがCTRが低いキーワード → タイトル・ディスクリプション改善でクリック数増加」
  例：「掲載順位が4-10位のキーワード → コンテンツ強化で上位3位以内を目指す」
  例：「ロングテールキーワードの強化で検索流入の多様化」
  例：「CTRが高いキーワードへの追加コンテンツ投資でROI向上」
- 優先順位とビジネスインパクトを明示

【禁止事項】
- ❌ キーワードの羅列のみで終わる
- ❌ 数値を示さない抽象的な表現
- ❌ 6つのセクション（概要、クリック数の考察、表示回数の考察、クリック率の考察、平均掲載順位の考察、改善点）の欠落
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
- 定義済みコンバージョンイベント数: ${metrics.conversionEventCount || 0}種類
- 最新月: ${metrics.latestMonth || '不明'}${noDataNote}

【コンバージョンイベント別の合計】
${metrics.conversionSummaryText || 'データなし'}

【最新月（${metrics.latestMonth || '不明'}）のコンバージョン】
${metrics.latestMonthText || 'データなし'}
${metrics.monthlyDetailText || ''}

【重要な制約】
⚠️ **必ず上記の【コンバージョンイベント別の合計】および【月次データ詳細】に記載されているイベント名と数値のみを使用してください。記載されていないイベント名や数値を推測したり、例として挙げたりしないでください。**

【要求事項】
- **800文字以内で簡潔にまとめる**（これは厳守してください）
- Markdownの見出し記法（##, ###）を使用して構造化
- **構成比や割合を示す際は、必ず数値（件数）とパーセンテージをセットで明示する** 例：「お問い合わせが全CVの48.9%（245件）」
- **必ず以下のセクションを含める**：

## 概要
- コンバージョン全体の推移を2-3文で簡潔に総括
- データポイント数（○ヶ月分）、定義済みCVイベント数を数値で明示
- 最も特徴的なポイント（例：増加傾向、主要CVイベントなど）を冒頭で述べる

## 各コンバージョンごとの考察
- **上記【コンバージョンイベント別の合計】に記載されている各CVイベントの件数**を具体的な数値で明示
  例：「お問い合わせ: 245件、資料ダウンロード: 189件、無料トライアル申込: 67件」
- **CVの集中度**を評価（複数イベントがある場合のみ）
  例：「お問い合わせが全CVの48.9%（245件）を占め、主要なCVイベント」
- **CVイベント間の関係**：
  複数のCVイベントがある場合、カスタマージャーニー上の位置づけを分析
  例：「資料DL → 無料トライアル → お問い合わせの順でCV難易度が上がる」
- 件数が多いCVイベント・少ないCVイベントの特徴を分析

## 当月コンバージョンの考察
- **上記【最新月のコンバージョン】に記載されている最新月（${metrics.latestMonth || '不明'}）の各CVイベントの実績**を具体的な数値で明示
  例：「${metrics.latestMonth || '不明'}実績：お問い合わせ 28件、資料ダウンロード 45件、無料トライアル申込 12件」
- **前月比**を評価（【月次データ詳細】から計算可能な場合）
  例：「お問い合わせは前月比+15%（+4件）で好調」
- **当月の特徴的なポイント**を分析
  例：「資料DLが急増 → 新規コンテンツが効果的」「お問い合わせが減少 → 要因分析が必要」

## 月次推移の考察
- **上記【月次データ詳細】に基づいて月次トレンド**を具体的な数値で示す：
  増加傾向・減少傾向・季節変動を特定
  例：「過去3ヶ月で15%増加傾向」「2025年6月が最も多い（季節要因）」
- **変動の大きさ**を評価：
  安定しているか、ブレが大きいかを分析
  例：「月ごとの変動が±10%以内で安定」
- **異常値の特定**：
  特定月の急増・急減があれば、【月次データ詳細】から具体的な月と数値を示し、その要因を推測
  例：「2025年3月にキャンペーン実施でCV数が前月比2倍に増加（120件→240件）」
- CVが増加した月と減少した月を【月次データ詳細】から特定し、その要因を考察

## 改善点
- 課題となっているCV推移とその原因仮説を2-3点提示
- 具体的で実行可能な改善アプローチを提案
  例：「CV減少月の要因分析 → 広告予算、LP品質、季節要因を確認」
  例：「件数の多いCVイベント → 現状の主力施策を強化してさらに伸ばす」
  例：「件数の少ないCVイベント → 新規施策や導線改善で伸ばす余地あり」
  例：「CV増加月の成功要因を特定 → 他の月にも横展開」
- 優先順位とビジネスインパクトを明示

【禁止事項】
- ❌ CV数の羅列のみで終わる
- ❌ 数値を示さない抽象的な表現
- ❌ 5つのセクション（概要、各コンバージョンごとの考察、当月コンバージョンの考察、月次推移の考察、改善点）の欠落
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
- **必ず以下のセクションを含める**：

## 概要
- ファイルダウンロードの全体像を2-3文で簡潔に総括
- 総ダウンロード数、総ユーザー数、ファイル数を数値で明示
- 最も特徴的なポイント（例：主要ファイル、集中度など）を冒頭で述べる

## ダウンロード数の考察
- **上位3ファイル**をダウンロード数で具体的に明示
  例：「product_catalog.pdf: 890DL（42.3%）、whitepaper_2025.pdf: 520DL（24.7%）、price_list.xlsx: 340DL（16.2%）」
- **ファイルの集中度**を評価
  例：「上位3ファイルで全体の83.2%（1,750ダウンロード）を占める（高集中型）」
- **ユーザー当たりDL数**を計算
  例：「平均${metrics.totalDownloads && metrics.totalUsers ? (metrics.totalDownloads / metrics.totalUsers).toFixed(2) : 'N/A'}DL/ユーザー → 複数資料をDLするユーザーが多い」
- **ファイルタイプ別の分類**と特徴を分析：
  - 製品カタログ・パンフレット（PDF）→ 商品情報
  - ホワイトペーパー・事例集（PDF）→ 専門知識、実績
  - 価格表・見積書（PDF, Excel）→ 検討段階
  - 技術資料・マニュアル（PDF）→ 導入後サポート
- DL数が多いファイル・少ないファイルの特徴を分析し、顧客ニーズを把握
  例：「価格表のDLが多い → 具体的な検討段階の顧客が多い」
  例：「技術資料のDLが少ない → 導入前の認知段階の顧客が多い」

## 改善点
- 課題となっているファイルDL状況とその原因仮説を2-3点提示
- 具体的で実行可能な改善アプローチを提案
  例：「DL数の多い資料 → 同様のコンテンツを増産、営業フォローアップ強化」
  例：「DL数の少ない資料 → 内容見直し、プロモーション強化、または廃止」
  例：「DLユーザーへのフォローアップ施策（メール、電話）でCV率向上」
  例：「人気資料の露出を増やす（トップページ、ブログ記事内）」
- 優先順位とビジネスインパクトを明示

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
- **必ず以下のセクションを含める**：

## 概要
- 外部リンククリックの全体像を2-3文で簡潔に総括
- 総クリック数、総ユーザー数、外部リンク数を数値で明示
- 最も特徴的なポイント（例：主要リンク、集中度など）を冒頭で述べる

## 外部リンククリックの考察
- **上位3リンク**をクリック数で具体的に明示
  例：「https://example.com/shop: 1,230クリック（45.2%）、https://partner.com: 680クリック（25.0%）、https://sns.com: 450クリック（16.5%）」
- **リンクの集中度**を評価
  例：「上位3リンクで全体の75%（2,360クリック）を占める（高集中型）」
- **ユーザー当たりクリック数**を計算
  例：「平均${metrics.totalClicks && metrics.totalUsers ? (metrics.totalClicks / metrics.totalUsers).toFixed(2) : 'N/A'}クリック/ユーザー」
- **リンク先タイプ別の分類**と特徴を分析：
  - ECサイト・購入ページ（Amazon, 楽天, 自社ECなど）→ 購入誘導
  - SNS・ソーシャルメディア（Twitter, Facebook, Instagramなど）→ 拡散・認知拡大
  - パートナーサイト・関連サービス → 連携・協業
  - 求人サイト（採用情報への誘導）→ 採用活動
- **リンクの役割**を考察：
  購入誘導、情報補足、SNSシェア、パートナー連携など
- クリック数が多いリンク・少ないリンクの特徴を分析
  例：「自社ECへのクリックが多い → 購入意欲の高いユーザーが多い」

## 改善点
- 課題となっている外部リンククリック状況とその原因仮説を2-3点提示
- 具体的で実行可能な改善アプローチを提案
  例：「クリック数の多いリンク先 → 重要なパートナー、関係強化（タイアップ、広告出稿）」
  例：「クリック数の少ないリンク先 → 配置見直しまたは削除を検討」
  例：「外部リンククリック = サイト離脱リスク → 必要なリンクのみ残し、不要なリンクは削減」
  例：「外部リンクの前に自社コンテンツで価値提供し、離脱を最小化」
- 優先順位とビジネスインパクトを明示

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


