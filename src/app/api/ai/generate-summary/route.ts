/**
 * AI要約生成API
 * OpenAI GPT-4を使用してGA4データの要約を生成
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { pageType, startDate, endDate, metrics } = body;

    if (!pageType || !startDate || !endDate || !metrics) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    console.log('🤖 AI要約生成リクエスト:', { 
      pageType, 
      startDate, 
      endDate,
      metricsPreview: {
        totalUsers: metrics?.totalUsers,
        sessions: metrics?.sessions,
        conversions: metrics?.conversions
      }
    });

    // Gemini APIキーの確認
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      console.error('❌ GEMINI_API_KEY が設定されていません');
      return NextResponse.json(
        { error: 'Gemini API key is not configured' },
        { status: 500 }
      );
    }

    // プロンプトを生成
    const prompt = generatePrompt(pageType, startDate, endDate, metrics);

    // Gemini APIを呼び出し
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `あなたはGoogle Analytics 4のデータ分析の専門家です。データを分析し、ビジネスインサイトを提供する日本語の要約を生成してください。\n\n${prompt}`
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1500  // 日本語で約750-900文字程度
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Gemini API エラー:', errorText);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const summary = data.candidates?.[0]?.content?.parts?.[0]?.text || 'AI要約を生成できませんでした。';

    console.log('✅ AI要約生成成功');

    return NextResponse.json({ summary });

  } catch (error: any) {
    console.error('❌ AI要約生成エラー:', error);
    return NextResponse.json(
      { error: 'Failed to generate AI summary', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * ページタイプに応じたプロンプトを生成
 */
function generatePrompt(
  pageType: string,
  startDate: string,
  endDate: string,
  metrics: any
): string {
  const period = `${startDate}から${endDate}までの期間`;

  if (pageType === 'summary') {
    return `
以下はWebサイトの全体サマリーデータです。${period}のデータを分析し、ビジネスインサイトを含む日本語の要約を**必ず400文字以内**で生成してください。

【データ】
- 総ユーザー数: ${metrics.totalUsers?.toLocaleString() || 0}人
- 新規ユーザー数: ${metrics.newUsers?.toLocaleString() || 0}人
- セッション数: ${metrics.sessions?.toLocaleString() || 0}回
- ページビュー数: ${metrics.screenPageViews?.toLocaleString() || 0}回
- エンゲージメント率: ${metrics.engagementRate?.toFixed(1) || 0}%
- 平均エンゲージメント時間: ${metrics.averageSessionDuration?.toFixed(0) || 0}秒
- コンバージョン率: ${metrics.conversionRate?.toFixed(2) || 0}%
- コンバージョン数: ${metrics.conversions?.toLocaleString() || 0}件

【要求事項】
- **400文字以内で簡潔にまとめる**（これは厳守してください）
- Markdownの見出し記法（##, ###）を使用して構造化
- トレンドや特徴的な数値を指摘
- 改善提案を1-2点含める
- ビジネス的な観点から分析
`;
  }

  if (pageType === 'users') {
    return `
以下はWebサイトのユーザー属性データです。${period}のデータを分析し、ユーザー層の特徴とマーケティング提案を含む日本語の要約を**必ず400文字以内**で生成してください。

【データ】
新規vsリピーター: ${JSON.stringify(metrics.newVsReturning || [])}
性別分布: ${JSON.stringify(metrics.gender || [])}
年齢分布: ${JSON.stringify(metrics.age || [])}
デバイス分布: ${JSON.stringify(metrics.device || [])}
地域分布（上位）: ${JSON.stringify(metrics.region?.slice(0, 5) || [])}

【要求事項】
- **400文字以内で簡潔にまとめる**（これは厳守してください）
- Markdownの見出し記法（##, ###）を使用して構造化
- 主要なユーザー層を特定
- デバイスやエリアの傾向を分析
- ターゲティング提案を1-2点含める
`;
  }

  if (pageType === 'acquisition') {
    return `
以下はWebサイトの集客データです。${period}のデータを分析し、効果的なチャネルと改善提案を含む日本語の要約を**必ず400文字以内**で生成してください。

【データ】
チャネル別トラフィック: ${JSON.stringify(metrics.trafficData || [])}
合計データ: ${JSON.stringify(metrics.totalData || {})}

【要求事項】
- **400文字以内で簡潔にまとめる**（これは厳守してください）
- Markdownの見出し記法（##, ###）を使用して構造化
- 最も効果的なチャネルを特定
- パフォーマンスの傾向を分析
- 集客戦略の提案を1-2点含める
`;
  }

  if (pageType === 'engagement') {
    return `
以下はWebサイトのエンゲージメントデータです。${period}のデータを分析し、人気ページと改善提案を含む日本語の要約を**必ず400文字以内**で生成してください。

【データ】
ページ別データ（上位10件）: ${JSON.stringify(metrics.pages?.slice(0, 10) || [])}

【要求事項】
- **400文字以内で簡潔にまとめる**（これは厳守してください）
- Markdownの見出し記法（##, ###）を使用して構造化
- 最もパフォーマンスの高いページを特定
- ユーザー行動の傾向を分析
- コンテンツ改善の提案を1-2点含める
`;
  }

  if (pageType === 'landing-pages') {
    return `
以下はランディングページのパフォーマンスデータです。${period}のデータを分析し、効果的なランディングページと改善提案を含む日本語の要約を**必ず400文字以内**で生成してください。

【データ】
ランディングページ別データ（上位10件）: ${JSON.stringify(metrics.landingPages?.slice(0, 10) || [])}

【要求事項】
- **400文字以内で簡潔にまとめる**（これは厳守してください）
- Markdownの見出し記法（##, ###）を使用して構造化
- 最もコンバージョン率の高いページを特定
- ユーザー導線の傾向を分析
- ランディングページ最適化の提案を1-2点含める
`;
  }

  if (pageType === 'organic-keywords') {
    return `
以下はオーガニック検索キーワードのデータです。${period}のデータを分析し、効果的なキーワードとSEO提案を含む日本語の要約を**必ず400文字以内**で生成してください。

【データ】
キーワード別データ（上位10件）: ${JSON.stringify(metrics.queries?.slice(0, 10) || [])}

【要求事項】
- **400文字以内で簡潔にまとめる**（これは厳守してください）
- Markdownの見出し記法（##, ###）を使用して構造化
- 最もパフォーマンスの高いキーワードを特定
- CTRや掲載順位の傾向を分析
- SEO改善の提案を1-2点含める
`;
  }

  if (pageType === 'referrals') {
    return `
以下は参照元（リファラル）トラフィックのデータです。${period}のデータを分析し、効果的な参照元と外部連携提案を含む日本語の要約を**必ず400文字以内**で生成してください。

【データ】
参照元別データ（上位10件）: ${JSON.stringify(metrics.referrals?.slice(0, 10) || [])}

【要求事項】
- **400文字以内で簡潔にまとめる**（これは厳守してください）
- Markdownの見出し記法（##, ###）を使用して構造化
- 最も多くのトラフィックをもたらす参照元を特定
- リファラルトラフィックの傾向を分析
- 外部連携やパートナーシップの提案を1-2点含める
`;
  }

  if (pageType === 'conversion-events') {
    return `
以下はコンバージョンイベントのデータです。${period}のデータを分析し、重要なコンバージョンと最適化提案を含む日本語の要約を**必ず400文字以内**で生成してください。

【データ】
イベント別データ: ${JSON.stringify(metrics.events || [])}

【要求事項】
- **400文字以内で簡潔にまとめる**（これは厳守してください）
- Markdownの見出し記法（##, ###）を使用して構造化
- 最も重要なコンバージョンイベントを特定
- ユーザー行動の傾向を分析
- コンバージョン最適化の提案を1-2点含める
`;
  }

  if (pageType === 'file-downloads') {
    return `
以下はファイルダウンロードのデータです。${period}のデータを分析し、人気コンテンツと改善提案を含む日本語の要約を**必ず400文字以内**で生成してください。

【データ】
ファイル別ダウンロードデータ: ${JSON.stringify(metrics.downloads || [])}

【要求事項】
- **400文字以内で簡潔にまとめる**（これは厳守してください）
- Markdownの見出し記法（##, ###）を使用して構造化
- 最も人気のあるファイルを特定
- ダウンロード行動の傾向を分析
- コンテンツ戦略の提案を1-2点含める
`;
  }

  if (pageType === 'external-links') {
    return `
以下は外部リンククリックのデータです。${period}のデータを分析し、ユーザー行動と改善提案を含む日本語の要約を**必ず400文字以内**で生成してください。

【データ】
外部リンク別クリックデータ: ${JSON.stringify(metrics.externalLinks || [])}

【要求事項】
- **400文字以内で簡潔にまとめる**（これは厳守してください）
- Markdownの見出し記法（##, ###）を使用して構造化
- 最もクリックされる外部リンクを特定
- ユーザー離脱の傾向を分析
- ユーザー体験向上の提案を1-2点含める
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

