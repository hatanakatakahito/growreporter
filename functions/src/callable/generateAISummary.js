import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { checkCanGenerate, incrementGenerationCount } from '../utils/planManager.js';
import { getCachedAnalysis, saveCachedAnalysis } from '../utils/aiCacheManager.js';
import { getPromptTemplate } from '../prompts/templates.js';
import { SITE_TYPE_LABELS, SITE_PURPOSE_LABELS, IMPROVEMENT_FOCUS_LABELS } from '../constants/siteOptions.js';
import { canAccessSite, canEditSite } from '../utils/permissionHelper.js';

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
  const { siteId, pageType, startDate, endDate, metrics: legacyMetrics, rawData, forceRegenerate = false, improvementFocus: improvementFocusValue = 'balance', userNote = '', existingImprovements = [] } = request.data;

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
    // 1. サイトの所有権確認
    const siteDoc = await db.collection('sites').doc(siteId).get();
    if (!siteDoc.exists) {
      throw new HttpsError('not-found', 'サイトが見つかりません');
    }

    const siteData = siteDoc.data();
    
    // AI生成は編集権限が必要（閲覧者は不可）
    const canEdit = await canEditSite(userId, siteId);
    if (!canEdit) {
      throw new HttpsError(
        'permission-denied',
        'AI分析を生成する権限がありません（編集者以上の権限が必要です）'
      );
    }

    // 2. usage typeを決定（制限チェックで使用）
    const usageType = pageType === 'comprehensive_improvement' ? 'improvement' : 'summary';
    
    // サイト所有者のuserIdを使用（管理者がアクセスしている場合でもキャッシュは所有者ベース）
    const siteOwnerId = siteData.userId;

    // 2.5. 無料プランの再分析制限チェック（サマリーのみ）
    if (forceRegenerate && usageType === 'summary') {
      const ownerDoc = await db.collection('users').doc(siteOwnerId).get();
      const ownerPlan = ownerDoc.data()?.plan || 'free';
      if (ownerPlan === 'free') {
        logger.info('[generateAISummary] 無料プラン: サマリー再分析をブロック', { siteOwnerId });
        throw new HttpsError(
          'permission-denied',
          '無料プランでは再分析はご利用いただけません。有料プランにアップグレードしてください。'
        );
      }
    }

    // 3. キャッシュチェック（強制再生成でない場合）
    if (!forceRegenerate) {
      const cachedAnalysis = await getCachedAnalysis(siteOwnerId, siteId, pageType, startDate, endDate);
      if (cachedAnalysis) {
        console.log('[generateAISummary] Cache hit (aiAnalysisCache):', cachedAnalysis.cacheId);
        
        // キャッシュがある場合でも、現在の制限を確認
        // （プラン変更等で制限が変わっている可能性があるため）
        const canGenerate = await checkCanGenerate(siteOwnerId, usageType);
        if (!canGenerate) {
          console.log('[generateAISummary] キャッシュはあるが制限超過:', siteOwnerId, usageType);
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
    const cachedSummary = await getCachedSummary(db, siteOwnerId, siteId, pageType, startDate, endDate);
    if (cachedSummary) {
        console.log('[generateAISummary] Cache hit (legacy aiSummaries):', cachedSummary.id);
        
        // キャッシュがある場合でも、現在の制限を確認
        const canGenerate = await checkCanGenerate(siteOwnerId, usageType);
        if (!canGenerate) {
          console.log('[generateAISummary] 旧キャッシュはあるが制限超過:', siteOwnerId, usageType);
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

    // 4. プラン制限チェック（新規生成時）
    const canGenerate = await checkCanGenerate(siteOwnerId, usageType);
    if (!canGenerate) {
      console.log('[generateAISummary] プラン制限超過（新規生成）:', siteOwnerId, usageType);
      const limitTypeName = usageType === 'improvement' ? 'AI改善提案' : 'AI分析サマリー';
      throw new HttpsError(
        'resource-exhausted',
        `今月の${limitTypeName}の上限に達しました。来月1日に自動的にリセットされます。`
      );
    }

    // 5. Gemini APIキーの確認
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      console.error('[generateAISummary] GEMINI_API_KEY not configured');
      throw new HttpsError(
        'failed-precondition',
        'Gemini API key is not configured'
      );
    }

    // 6. メトリクスの準備（新方式・旧方式の両対応）
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
    
    // 7. プロンプト生成（スクレイピングデータの反映をログで確認可能に）
    if (metrics.scrapingData?.pages?.length > 0) {
      logger.info('[generateAISummary] スクレイピングデータをサイト改善に反映', {
        pageType,
        scrapingPages: metrics.scrapingData.pages.length,
        totalPagesInPrompt: Math.min(30, metrics.scrapingData.pages.length),
      });
    } else {
      logger.warn('[generateAISummary] スクレイピングデータなし（プロンプトには「未取得」と記載）', { pageType });
    }
    const options = {};
    if (pageType === 'comprehensive_improvement') {
      const industryArr = Array.isArray(siteData.industry) ? siteData.industry : (siteData.industry ? [siteData.industry] : []);
      const siteTypeArr = Array.isArray(siteData.siteType) ? siteData.siteType : (siteData.siteType ? [siteData.siteType] : []);
      const sitePurposeArr = Array.isArray(siteData.sitePurpose) ? siteData.sitePurpose : (siteData.sitePurpose ? [siteData.sitePurpose] : []);
      options.siteContext = {
        industryText: industryArr.length ? industryArr.join('、') : '未設定',
        siteTypeText: siteTypeArr.map((v) => SITE_TYPE_LABELS[v] || v).join('、') || '未設定',
        sitePurposeText: sitePurposeArr.map((v) => SITE_PURPOSE_LABELS[v] || v).join('、') || '未設定',
      };
      options.improvementFocus = IMPROVEMENT_FOCUS_LABELS[improvementFocusValue] || IMPROVEMENT_FOCUS_LABELS.balance;
      options.userNote = userNote || '';
      options.existingImprovements = existingImprovements || [];
      options.diagnosisData = metrics.diagnosisData || null;
      options.siteStructureData = metrics.siteStructureData || null;
      // コンバージョン設定とKPI設定を追加
      options.conversionGoals = siteData.conversionGoals || [];
      options.kpiSettings = siteData.kpiSettings || [];
    }
    const prompt = await generatePrompt(db, pageType, startDate, endDate, metrics, options);
    console.log('[generateAISummary] 生成されたプロンプト (先頭500文字):', prompt.substring(0, 500));

    // 8. Gemini API呼び出し
    console.log('[generateAISummary] Calling Gemini API...');
    const geminiModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';
    console.log('[generateAISummary] Using model:', geminiModel);
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`,
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
            maxOutputTokens: pageType === 'comprehensive_analysis' ? 3000 : 1500,
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
    await saveCachedAnalysis(siteOwnerId, siteId, pageType, summary, recommendations, startDate, endDate);
    
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
    const docRef = await db.collection('sites').doc(siteId).collection('aiSummaries').add(summaryDoc);
    console.log('[generateAISummary] Saved to Firestore (legacy):', docRef.id);

    // 9. 生成回数をインクリメント
    // usageTypeは前で定義済み
    await incrementGenerationCount(siteOwnerId, usageType);
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
      .collectionGroup('aiSummaries')
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
 * 行がラベル行（キー: または キー：）で始まるか（全角コロン対応）
 */
function isLabelLine(line, label) {
  const n = (line || '').trim().replace(/\uFF1A/g, ':');
  return n.startsWith(label);
}

function valueAfterLabel(trimmedLine, label) {
  const n = trimmedLine.replace(/\uFF1A/g, ':');
  if (!n.startsWith(label)) return '';
  // ラベル長で切り出し（説明文内のコロンで分割されないように）。全角コロンも1文字として同じ長さ
  const skip = label.length;
  return trimmedLine.substring(skip).trim();
}

/**
 * タイトルまたは説明文から対象ページパス（例: /contacts/）を抽出
 * @param {string} title
 * @param {string} description
 * @returns {string|null} 抽出したパス（見つからなければ null）
 */
function extractPathFromTitleOrDescription(title, description) {
  const text = [title, description].filter(Boolean).join(' ');
  if (!text || typeof text !== 'string') return null;
  // 括弧内のパス: (/path/) または （/path/）
  const parenMatch = text.match(/[（(](\/[^）)]*\/?)[）)]/);
  if (parenMatch && parenMatch[1]) {
    const p = parenMatch[1].trim();
    return p || '/';
  }
  // スラッシュで始まるパス: /path/ または /path
  const pathMatch = text.match(/(\/[a-zA-Z0-9/_.-]+)/);
  if (pathMatch && pathMatch[1]) return pathMatch[1];
  return null;
}

/**
 * comprehensive_improvement用の改善施策抽出
 * 形式: タイトル:、説明:、カテゴリー:、優先度:、期待効果:、対象ページ: 等を解析（全角コロン・対象ページURL: 対応）
 */
function extractImprovementRecommendations(summary) {
  console.log('[extractImprovementRecommendations] 開始 - 入力テキスト長:', summary.length);
  const recommendations = [];
  
  // "---"で区切られたブロックに分割
  const blocks = summary.split(/---+/);
  console.log('[extractImprovementRecommendations] ブロック数:', blocks.length);
  
  const labelPrefixes = [
    'タイトル:', '説明:', '重複判定用ラベル:', 'カテゴリー:', '優先度:', '期待効果:',
    '実装者:', '難易度:', '費用感:', '対象ページ:', '対象ページURL:', '対象箇所:', '想定工数（時間）:', '想定工数(時間):'
  ];
  
  blocks.forEach((block, blockIndex) => {
    const lines = block.trim().split('\n');
    let currentRec = {};
    
    lines.forEach((line) => {
      const trimmedLine = line.trim();
      const normalizedLine = trimmedLine.replace(/\uFF1A/g, ':');
      
      // 各フィールドを抽出（全角コロン対応。対象ページURL: も対象ページ: と同様に扱う）
      if (isLabelLine(trimmedLine, 'タイトル:')) {
        currentRec.title = valueAfterLabel(trimmedLine, 'タイトル:');
      } else if (isLabelLine(trimmedLine, '説明:')) {
        currentRec.description = valueAfterLabel(trimmedLine, '説明:');
      } else if (isLabelLine(trimmedLine, '重複判定用ラベル:')) {
        const label = valueAfterLabel(trimmedLine, '重複判定用ラベル:');
        if (label) currentRec.dedupKey = label;
      } else if (isLabelLine(trimmedLine, 'カテゴリー:')) {
        currentRec.category = valueAfterLabel(trimmedLine, 'カテゴリー:').toLowerCase();
      } else if (isLabelLine(trimmedLine, '優先度:')) {
        currentRec.priority = valueAfterLabel(trimmedLine, '優先度:').toLowerCase();
      } else if (isLabelLine(trimmedLine, '期待効果:')) {
        currentRec.expectedImpact = valueAfterLabel(trimmedLine, '期待効果:');
      } else if (isLabelLine(trimmedLine, '実装者:')) {
        currentRec.implementationType = valueAfterLabel(trimmedLine, '実装者:').toLowerCase();
      } else if (isLabelLine(trimmedLine, '難易度:')) {
        currentRec.difficulty = valueAfterLabel(trimmedLine, '難易度:').toLowerCase();
      } else if (isLabelLine(trimmedLine, '費用感:')) {
        currentRec.estimatedCost = valueAfterLabel(trimmedLine, '費用感:').toLowerCase();
      } else if (isLabelLine(trimmedLine, '対象ページ:') || isLabelLine(trimmedLine, '対象ページURL:')) {
        const isUrlKey = normalizedLine.startsWith('対象ページURL:');
        const prefixLen = isUrlKey
          ? (trimmedLine.startsWith('対象ページURL：') ? '対象ページURL：'.length : '対象ページURL:'.length)
          : (trimmedLine.startsWith('対象ページ：') ? '対象ページ：'.length : '対象ページ:'.length);
        const val = trimmedLine.substring(prefixLen).trim();
        if (val && val !== '/' && val.toLowerCase() !== 'トップページ') {
          currentRec.targetPagePath = val;
        } else {
          currentRec.targetPagePath = '/';
        }
      } else if (isLabelLine(trimmedLine, '対象箇所:')) {
        currentRec.targetArea = valueAfterLabel(trimmedLine, '対象箇所:');
      } else if (normalizedLine.startsWith('想定工数（時間）:') || normalizedLine.startsWith('想定工数(時間):')) {
        const val = trimmedLine.replace(/^想定工数[（(]時間[）)][：:]\s*/, '').trim();
        const num = parseFloat(val, 10);
        if (!Number.isNaN(num) && num >= 0) {
          currentRec.estimatedLaborHours = num;
        }
      } else if (currentRec.description && trimmedLine) {
        const isLabel = labelPrefixes.some(prefix => normalizedLine.startsWith(prefix) || normalizedLine.startsWith(prefix.replace(':', '：')));
        if (!isLabel && !/^想定工数[（(]/.test(normalizedLine)) {
          currentRec.description += ' ' + trimmedLine;
        }
      }
    });
    
    // タイトルと説明があれば追加。カテゴリ・優先度が無い場合はデフォルトで補う（任意項目を落とさない）
    if (currentRec.title && currentRec.description) {
      if (!currentRec.category) currentRec.category = 'other';
      if (!currentRec.priority) currentRec.priority = 'medium';
      // 「対象ページ:」行が無くても、タイトル・説明内のパス（例: (/contacts/)）から対象URLを補う
      if (!currentRec.targetPagePath || currentRec.targetPagePath === '/') {
        const extracted = extractPathFromTitleOrDescription(currentRec.title, currentRec.description);
        if (extracted && extracted !== '/') currentRec.targetPagePath = extracted;
      }
      console.log(`[extractImprovementRecommendations] ブロック${blockIndex}をパース成功:`, currentRec.title);
      recommendations.push(currentRec);
    } else {
      console.log(`[extractImprovementRecommendations] ブロック${blockIndex}をスキップ - 不足:`, {
        hasTitle: !!currentRec.title,
        hasDescription: !!currentRec.description,
      });
    }
  });
  
  console.log('[extractImprovementRecommendations] 抽出完了:', recommendations.length, '件');
  
  // もし抽出できなかった場合は、一般的な抽出関数を試す（フォールバック）
  if (recommendations.length === 0) {
    console.warn('[extractImprovementRecommendations] 「タイトル:」形式で抽出できませんでした。番号付きリスト形式を試します。');
    console.warn('[extractImprovementRecommendations] AIの生テキスト (先頭1000文字):', summary.substring(0, 1000));
    
    const fallbackRecommendations = extractRecommendationsFromNumberedList(summary);
    console.log('[extractImprovementRecommendations] フォールバック抽出完了:', fallbackRecommendations.length, '件');
    return fallbackRecommendations;
  }
  
  return recommendations;
}

/**
 * テキストから任意項目（期待効果・対象ページ・想定工数）を正規表現で抽出
 */
function extractOptionalFieldsFromText(text) {
  const o = {};
  if (!text || typeof text !== 'string') return o;
  const expectMatch = text.match(/期待効果[：:]\s*([^\n]+)/);
  if (expectMatch) o.expectedImpact = expectMatch[1].trim();
  const targetMatch = text.match(/対象ページ(?:URL)?[：:]\s*([^\n]+)/);
  if (targetMatch) {
    const val = targetMatch[1].trim();
    if (val && val !== '/' && val.toLowerCase() !== 'トップページ') o.targetPagePath = val;
  }
  const hoursMatch = text.match(/想定工数[（(]時間[）)][：:]\s*([0-9.]+)/);
  if (hoursMatch) {
    const num = parseFloat(hoursMatch[1], 10);
    if (!Number.isNaN(num) && num >= 0) o.estimatedLaborHours = num;
  }
  return o;
}

/**
 * 番号付きリストから改善施策を抽出（フォールバック用）。説明文から期待効果・対象ページ・想定工数も抽出
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
      // 前の推奨アクションを保存（任意項目を説明文から抽出してから追加）
      if (currentRecommendation) {
        const extracted = extractOptionalFieldsFromText(currentRecommendation.description);
        if (extracted.expectedImpact) currentRecommendation.expectedImpact = extracted.expectedImpact;
        if (extracted.targetPagePath) currentRecommendation.targetPagePath = extracted.targetPagePath;
        if (extracted.estimatedLaborHours != null) currentRecommendation.estimatedLaborHours = extracted.estimatedLaborHours;
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
      // 期待効果・対象ページ・想定工数らしき行ならフィールドに設定、それ以外は説明に追加
      const n = trimmedLine.replace(/\uFF1A/g, ':');
      if (n.startsWith('期待効果:')) {
        currentRecommendation.expectedImpact = trimmedLine.replace(/^期待効果[：:]\s*/, '').trim();
        return;
      }
      if (n.startsWith('対象ページ:') || n.startsWith('対象ページURL:')) {
        const val = trimmedLine.replace(/^対象ページ(?:URL)?[：:]\s*/, '').trim();
        if (val && val !== '/' && val.toLowerCase() !== 'トップページ') currentRecommendation.targetPagePath = val;
        return;
      }
      if (n.startsWith('想定工数（時間）:') || n.startsWith('想定工数(時間):')) {
        const val = trimmedLine.replace(/^想定工数[（(]時間[）)][：:]\s*/, '').trim();
        const num = parseFloat(val, 10);
        if (!Number.isNaN(num) && num >= 0) currentRecommendation.estimatedLaborHours = num;
        return;
      }
      // 現在の推奨アクションの説明文を追加
      currentRecommendation.description += (currentRecommendation.description ? ' ' : '') + trimmedLine.replace(/\*\*/g, '');
    }
  });
  
  // 最後の推奨アクションを保存
  if (currentRecommendation) {
    const extracted = extractOptionalFieldsFromText(currentRecommendation.description);
    if (extracted.expectedImpact) currentRecommendation.expectedImpact = extracted.expectedImpact;
    if (extracted.targetPagePath) currentRecommendation.targetPagePath = extracted.targetPagePath;
    if (extracted.estimatedLaborHours != null) currentRecommendation.estimatedLaborHours = extracted.estimatedLaborHours;
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
  // comprehensive_analysisの場合は改善提案セクションを除去
  if (pageType === 'comprehensive_analysis') {
    const idx = text.indexOf('## 改善');
    return idx >= 0 ? text.substring(0, idx).trim() : text;
  }

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
/**
 * demographicsデータからunknown/不明/undefined/(not set)を除外
 */
function cleanDemographics(demographics) {
  if (!demographics) return null;
  const UNKNOWN = new Set(['不明', 'unknown', '(not set)', 'undefined', 'null', '']);
  const isUnknown = (val) => val == null || UNKNOWN.has(String(val).toLowerCase().trim());
  const cleanArray = (arr, ...nameKeys) => {
    if (!Array.isArray(arr)) return arr;
    return arr.filter(item => {
      const name = nameKeys.reduce((found, key) => found || item[key], null);
      return !isUnknown(name);
    });
  };

  const cleaned = { ...demographics };
  if (cleaned.device) cleaned.device = cleanArray(cleaned.device, 'name', 'device', 'deviceCategory');
  if (cleaned.gender) cleaned.gender = cleanArray(cleaned.gender, 'name');
  if (cleaned.age) cleaned.age = cleanArray(cleaned.age, 'name', 'age', 'userAgeBracket');
  if (cleaned.newReturning) cleaned.newReturning = cleanArray(cleaned.newReturning, 'name', 'type', 'newVsReturning');
  if (cleaned.location) {
    cleaned.location = { ...cleaned.location };
    if (cleaned.location.country) cleaned.location.country = cleanArray(cleaned.location.country, 'name', 'country');
    if (cleaned.location.region) cleaned.location.region = cleanArray(cleaned.location.region, 'name', 'region');
    if (cleaned.location.city) cleaned.location.city = cleanArray(cleaned.location.city, 'name', 'city');
    if (cleaned.location.regions) cleaned.location.regions = cleanArray(cleaned.location.regions, 'name', 'region');
  }
  return cleaned;
}

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
        conversionRate: current.metrics?.sessions > 0 ? (current.totalConversions || 0) / current.metrics.sessions : 0,
        conversionBreakdown: current.conversionBreakdown || {},
        monthOverMonth,
        yearAgoData: yearAgo,
        monthlyData: rawData.monthlyTrend || [],
        kpiData: rawData.kpiData || [],
        hasConversionDefinitions: rawData.hasConversionEvents || false,
        hasKpiSettings: rawData.hasKpiSettings || false,
      };

    case 'analysis/month':
      // 月別分析：monthlyTrend を受け取る
      const monthlyTrendData = rawData.monthlyTrend || [];
      const monthlyTotalSessions = monthlyTrendData.reduce((sum, m) => sum + (m.sessions || 0), 0);
      const monthlyTotalConversions = monthlyTrendData.reduce((sum, m) => sum + (m.conversions || 0), 0);
      return {
        sessions: monthlyTotalSessions,
        conversions: monthlyTotalConversions,
        monthlyData: monthlyTrendData,
        monthCount: monthlyTrendData.length,
      };

    case 'summary':
      // サマリー（全体サマリー）：current, previousMonth, yearAgo, monthlyTrend を受け取る
      // current.metrics にネストされた新形式と、フラットな旧形式の両方に対応
      const summCurrent = rawData.current || {};
      const summPrev = rawData.previousMonth || null;
      const summYearAgo = rawData.yearAgo || null;

      // metrics がネストされている場合（新形式）とフラットな場合（旧形式）の両方に対応
      const summMetrics = summCurrent.metrics || summCurrent;
      const summPrevMetrics = summPrev?.metrics || summPrev;

      // conversions: totalConversions がある場合はそれを使用（新形式）、なければ metrics.conversions（旧形式）
      const currentTotalConv = summCurrent.totalConversions ?? summMetrics.conversions ?? 0;
      const prevTotalConv = summPrev?.totalConversions ?? summPrevMetrics?.conversions ?? 0;

      // 前月比を計算
      let summMonthOverMonth = null;
      if (summPrev && summPrevMetrics) {
        const currentUsers = summMetrics.users || summMetrics.totalUsers || 0;
        const prevUsers = summPrevMetrics.users || summPrevMetrics.totalUsers || 0;

        summMonthOverMonth = {
          users: {
            current: currentUsers,
            previous: prevUsers,
            change: prevUsers > 0 ? ((currentUsers - prevUsers) / prevUsers) * 100 : 0,
          },
          sessions: {
            current: summMetrics.sessions || 0,
            previous: summPrevMetrics.sessions || 0,
            change: summPrevMetrics.sessions > 0
              ? ((summMetrics.sessions || 0) - summPrevMetrics.sessions) / summPrevMetrics.sessions * 100
              : 0,
          },
          conversions: {
            current: currentTotalConv,
            previous: prevTotalConv,
            change: prevTotalConv > 0 ? ((currentTotalConv - prevTotalConv) / prevTotalConv) * 100 : 0,
          },
          engagementRate: {
            current: summMetrics.engagementRate || 0,
            previous: summPrevMetrics.engagementRate || 0,
            change: summPrevMetrics.engagementRate > 0
              ? ((summMetrics.engagementRate || 0) - summPrevMetrics.engagementRate) / summPrevMetrics.engagementRate * 100
              : 0,
          },
        };
      }

      return {
        users: summMetrics.users || summMetrics.totalUsers || 0,
        sessions: summMetrics.sessions || 0,
        pageViews: summMetrics.pageViews || summMetrics.screenPageViews || 0,
        conversions: currentTotalConv,
        engagementRate: summMetrics.engagementRate || 0,
        conversionRate: summMetrics.sessions > 0 ? currentTotalConv / summMetrics.sessions : 0,
        monthOverMonth: summMonthOverMonth,
        yearAgoData: summYearAgo?.metrics || summYearAgo,
        monthlyData: rawData.monthlyTrend || [],
        hasConversionDefinitions: rawData.hasConversionEvents || false,
        conversionEventNames: rawData.conversionEventNames || [],
        conversionBreakdown: summCurrent.conversionBreakdown || null,
        kpiData: rawData.kpiData || null,
        hasKpiSettings: rawData.hasKpiSettings || false,
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
      const hasEntryPage = !!flow.entryPagePath;
      const entryPageViews = summary.entryPageViews ?? null;
      const totalSiteViews = summary.totalSiteViews || 0;
      const startViews = hasEntryPage && entryPageViews != null ? entryPageViews : totalSiteViews;
      const formPageViews = summary.formPageViews || 0;
      const submissionComplete = summary.submissionComplete || 0;
      const achievementRate1 = startViews > 0 ? (formPageViews / startViews) * 100 : 0;
      const achievementRate2 = formPageViews > 0 ? (submissionComplete / formPageViews) * 100 : 0;
      const overallCVR = startViews > 0 ? (submissionComplete / startViews) * 100 : 0;
      return {
        flowName: flow.flowName || 'フロー名未設定',
        entryPagePath: flow.entryPagePath || '',
        formPagePath: flow.formPagePath || '未設定',
        targetCvEvent: flow.targetCvEvent || '未設定',
        hasEntryPage,
        entryPageViews,
        totalSiteViews,
        startViews,
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
        .map(row => `${row.sessionDefaultChannelGroup || row.channel || '不明'}: ${row.sessions || 0}訪問, ${row.conversions || 0}コンバージョン`)
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
          return `${row.source}: ${sessions}訪問, ${users}ユーザー, CV ${conversions}件 (CVR ${cvr}%), ENG率 ${engRate}%, 滞在時間 ${durationMin}分${durationSec}秒`;
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
          return `${row.landingPage}: ${sessions}訪問, ENG率 ${engRate}%, 滞在時間 ${avgDuration}, CV ${conversions}件 (CVR ${cvr}%)`;
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

    case 'comprehensive_analysis':
      // AI総合分析：全データを横断
      const compCurrent = rawData.current || {};
      const compPrev = rawData.previousMonth || null;
      const compMetrics = compCurrent.metrics || compCurrent;
      const compPrevMetrics = compPrev?.metrics || compPrev;
      const compCurrentConv = compCurrent.totalConversions ?? compMetrics.conversions ?? 0;
      const compPrevConv = compPrev?.totalConversions ?? compPrevMetrics?.conversions ?? 0;

      let compMonthOverMonth = null;
      if (compPrev && compPrevMetrics) {
        const cUsers = compMetrics.users || compMetrics.totalUsers || 0;
        const pUsers = compPrevMetrics.users || compPrevMetrics.totalUsers || 0;
        compMonthOverMonth = {
          users: { current: cUsers, previous: pUsers, change: pUsers > 0 ? ((cUsers - pUsers) / pUsers) * 100 : 0 },
          sessions: { current: compMetrics.sessions || 0, previous: compPrevMetrics.sessions || 0, change: compPrevMetrics.sessions > 0 ? ((compMetrics.sessions || 0) - compPrevMetrics.sessions) / compPrevMetrics.sessions * 100 : 0 },
          conversions: { current: compCurrentConv, previous: compPrevConv, change: compPrevConv > 0 ? ((compCurrentConv - compPrevConv) / compPrevConv) * 100 : 0 },
          engagementRate: { current: compMetrics.engagementRate || 0, previous: compPrevMetrics.engagementRate || 0, change: compPrevMetrics.engagementRate > 0 ? ((compMetrics.engagementRate || 0) - compPrevMetrics.engagementRate) / compPrevMetrics.engagementRate * 100 : 0 },
        };
      }

      return {
        users: compMetrics.users || compMetrics.totalUsers || 0,
        sessions: compMetrics.sessions || 0,
        pageViews: compMetrics.pageViews || compMetrics.screenPageViews || 0,
        engagementRate: compMetrics.engagementRate || 0,
        conversions: compCurrentConv,
        monthOverMonth: compMonthOverMonth,
        yearAgoData: rawData.yearAgo?.metrics || rawData.yearAgo,
        monthlyData: rawData.monthlyTrend || [],
        channelsData: (rawData.channels || []).sort((a, b) => (b.sessions || 0) - (a.sessions || 0)).slice(0, 7),
        landingPagesData: (rawData.landingPages || []).sort((a, b) => (b.sessions || 0) - (a.sessions || 0)).slice(0, 5),
        referralsData: (rawData.referrals || []).sort((a, b) => (b.sessions || 0) - (a.sessions || 0)).slice(0, 5),
        pagesData: (rawData.pages || []).sort((a, b) => (b.screenPageViews || 0) - (a.screenPageViews || 0)).slice(0, 10),
        keywordsData: rawData.keywords ? (rawData.keywords || []).slice(0, 10) : null,
        demographics: cleanDemographics(rawData.demographics),
        hasConversionDefinitions: rawData.hasConversionEvents || false,
        hasGSCConnection: rawData.hasGSCConnection || false,
      };

    case 'comprehensive_improvement':
      // 包括的改善案生成（全データソース）
      return {
        // 全体サマリー
        summary: rawData.summary || {},
        // ユーザー属性
        demographics: rawData.demographics || null,
        // 時系列
        monthlyTrend: rawData.monthlyTrend || {},
        dailyData: rawData.dailyData || null,
        weeklyData: rawData.weeklyData || null,
        hourlyData: rawData.hourlyData || null,
        // 集客
        channels: rawData.channels || [],
        keywords: rawData.keywords || [],
        referrals: rawData.referrals || [],
        // ページ
        pages: rawData.pages || [],
        pageCategories: rawData.pageCategories || [],
        landingPages: rawData.landingPages || [],
        fileDownloads: rawData.fileDownloads || [],
        externalLinks: rawData.externalLinks || [],
        pageFlow: rawData.pageFlow || [],
        // コンバージョン
        monthlyConversions: rawData.monthlyConversions || {},
        reverseFlow: rawData.reverseFlow || [],
        // AI総合分析
        aiComprehensiveAnalysis: rawData.aiComprehensiveAnalysis || null,
        // スクレイピング・診断・構造
        scrapingData: rawData.scrapingData || { pages: [], meta: null, totalPages: 0 },
        diagnosisData: rawData.diagnosisData || null,
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
 * プロンプトは functions/src/prompts/templates.js で一元管理されています
 */
async function generatePrompt(db, pageType, startDate, endDate, metrics, options = {}) {
  const period = `${startDate}から${endDate}までの期間`;
  console.log(`[generatePrompt] ページタイプ「${pageType}」のプロンプトを取得`);

  const prompt = getPromptTemplate(pageType, period, metrics, startDate, endDate, options);
  console.log(`[generatePrompt] プロンプト取得完了 (${prompt.length}文字)`);
  
  return prompt;
}

