/**
 * 🤖 Gemini AI分析API
 * GA4とGSCデータをGemini AIに送信して、インサイトと改善提案を生成
 */

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ga4Data, gscData, dateRange, propertyName, siteUrl } = body;

    // Gemini API Keyの確認
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      return NextResponse.json(
        { 
          error: 'Gemini API Key not configured',
          message: 'GEMINI_API_KEYを.env.localに設定してください。'
        },
        { status: 500 }
      );
    }

    console.log('🤖 Gemini AI分析開始:', {
      hasGA4Data: !!ga4Data,
      hasGSCData: !!gscData,
      dateRange
    });

    // Gemini AI初期化
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Google AI Studio API Key用のモデル名
    // 2025年最新: gemini-2.0-flash-exp が推奨
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    // プロンプト作成
    const prompt = `
あなたはWebマーケティングとSEOの専門家です。以下のGoogle Analytics 4とSearch Consoleのデータを分析し、日本語で具体的なインサイトと改善提案を提供してください。

## 分析対象
- **サイト名**: ${propertyName || 'Unknown'}
- **URL**: ${siteUrl || 'Unknown'}
- **期間**: ${dateRange?.startDate || 'N/A'} ～ ${dateRange?.endDate || 'N/A'}

## Google Analytics 4データ
${ga4Data ? `
- **総セッション数**: ${ga4Data.totalSessions || 0}
- **アクティブユーザー**: ${ga4Data.totalUsers || 0}
- **ページビュー**: ${ga4Data.totalPageViews || 0}
- **平均直帰率**: ${ga4Data.avgBounceRate || 0}%
- **データ行数**: ${ga4Data.rowCount || 0}
` : 'データなし'}

## Search Consoleデータ
${gscData ? `
- **総クリック数**: ${gscData.totalClicks || 0}
- **総インプレッション数**: ${gscData.totalImpressions || 0}
- **平均CTR**: ${gscData.avgCTR || 0}%
- **平均掲載順位**: ${gscData.avgPosition || 0}
- **データ行数**: ${gscData.rowCount || 0}
` : 'データなし'}

## 分析項目
以下の形式で分析結果を提供してください：

### 1. 📊 データ概要
- 全体的なトレンドと特徴

### 2. ✅ 強み
- 良好なパフォーマンスを示している指標
- 継続すべき施策

### 3. ⚠️ 課題
- 改善が必要な指標
- 問題点の具体的な説明

### 4. 💡 改善提案（優先度順）
1. **最優先**: [具体的な施策]
2. **中優先**: [具体的な施策]
3. **低優先**: [具体的な施策]

### 5. 🎯 期待される効果
- 各改善施策の期待される成果

---

**注意**: 具体的で実行可能な提案を、専門用語を適度に使いながらも分かりやすく説明してください。
`;

    // Gemini AIで分析
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const analysis = response.text();

    console.log('✅ Gemini AI分析完了');

    return NextResponse.json({
      success: true,
      analysis,
      metadata: {
        model: 'gemini-2.0-flash-exp',
        timestamp: new Date().toISOString(),
        inputData: {
          hasGA4: !!ga4Data,
          hasGSC: !!gscData
        }
      }
    });

  } catch (error) {
    console.error('❌ Gemini AI分析エラー:', error);
    
    return NextResponse.json(
      { 
        error: 'AI analysis failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: String(error)
      },
      { status: 500 }
    );
  }
}


