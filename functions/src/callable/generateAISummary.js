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
    const summary = data.candidates?.[0]?.content?.parts?.[0]?.text || 'AI要約を生成できませんでした。';

    console.log('[generateAISummary] Summary generated successfully');

    // 5. Firestoreに保存
    const now = new Date();
    const summaryDoc = {
      userId,
      pageType,
      startDate,
      endDate,
      summary,
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
以下はWebサイトの全体サマリーデータです。${period}のデータを分析し、ビジネスインサイトを含む日本語の要約を**必ず400文字以内**で生成してください。

【現在期間のデータ】
- 総ユーザー数: ${metrics.users?.toLocaleString() || metrics.totalUsers?.toLocaleString() || 0}人
- セッション数: ${metrics.sessions?.toLocaleString() || 0}回
- ページビュー数: ${metrics.pageViews?.toLocaleString() || metrics.screenPageViews?.toLocaleString() || 0}回
- エンゲージメント率: ${((metrics.engagementRate || 0) * 100).toFixed(1)}%
- コンバージョン数: ${metrics.conversions?.toLocaleString() || 0}件${monthlyTrendText}

【要求事項】
- **400文字以内で簡潔にまとめる**（これは厳守してください）
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
以下はWebサイトの日別分析データです。${period}のデータを分析し、ビジネスインサイトを含む日本語の要約を**必ず400文字以内**で生成してください。

【期間全体のデータ】
- 総セッション数: ${metrics.sessions?.toLocaleString() || 0}回
- 総コンバージョン数: ${metrics.conversions?.toLocaleString() || 0}件${dailyTrendText}

【要求事項】
- **400文字以内で簡潔にまとめる**（これは厳守してください）
- Markdownの見出し記法（##, ###）を使用して構造化
- 日別のトレンドや特徴的な日を分析
- 曜日パターンや特定日の変動要因を考察
- 改善提案を1-2点含める
`;
  }

  if (pageType === 'week') {
    return `
以下はWebサイトの曜日別分析データです。${period}のデータを分析し、ビジネスインサイトを含む日本語の要約を**必ず400文字以内**で生成してください。

【データ】
- 最大セッション数: ${metrics.sessions?.toLocaleString() || 0}回
- 最大コンバージョン数: ${metrics.conversions?.toLocaleString() || 0}件
- 曜日×時間帯のヒートマップデータあり

【要求事項】
- **400文字以内で簡潔にまとめる**（これは厳守してください）
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
以下はWebサイトの時間帯別分析データです。${period}のデータを分析し、ビジネスインサイトを含む日本語の要約を**必ず400文字以内**で生成してください。

【期間全体のデータ】
- 総セッション数: ${metrics.sessions?.toLocaleString() || 0}回
- 総コンバージョン数: ${metrics.conversions?.toLocaleString() || 0}件${peakHours}

【要求事項】
- **400文字以内で簡潔にまとめる**（これは厳守してください）
- Markdownの見出し記法（##, ###）を使用して構造化
- アクセスが集中する時間帯を特定
- コンバージョンが発生しやすい時間帯を分析
- コンテンツ投稿や広告配信の最適な時間帯を提案
`;
  }

  // その他のページタイプ用のデフォルト
  return `
${period}のデータを分析し、**必ず400文字以内**で日本語の要約を生成してください。

【データ】
${JSON.stringify(metrics, null, 2)}

【要求事項】
- **400文字以内で簡潔にまとめる**（これは厳守してください）
- Markdownの見出し記法（##, ###）を使用して構造化
- 主要なポイントを3-5点にまとめる
- 改善提案を含める
`;
}


