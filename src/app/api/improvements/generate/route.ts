import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ImprovementPrompts } from '@/lib/ai/improvementPrompts';
import { AIImprovementRequest, AIImprovementResponse } from '@/lib/improvements/types';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'ユーザーIDが必要です' },
        { status: 401 }
      );
    }
    
    const body: AIImprovementRequest = await request.json();
    const { issue, siteInfo, analyticsData, feedbackData } = body;
    
    if (!issue || !siteInfo) {
      return NextResponse.json(
        { error: '必要なデータが不足しています' },
        { status: 400 }
      );
    }
    
    // プロンプトを生成
    const prompt = ImprovementPrompts.generateImprovementPrompt({
      issue,
      siteInfo,
      analyticsData,
      feedbackData
    });
    
    console.log('🤖 AI提案生成開始:', {
      issue: issue.title,
      siteType: siteInfo.siteType,
      businessType: siteInfo.businessType
    });
    
    // Gemini APIを呼び出し
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log('✅ AI提案生成完了');
    console.log('レスポンス長:', text.length);
    
    // レスポンスをパース（簡易版 - 実際はもっと堅牢なパースが必要）
    const suggestions = parseAIResponse(text);
    
    return NextResponse.json({
      success: true,
      suggestions,
      rawResponse: text
    });
    
  } catch (error) {
    console.error('AI提案生成エラー:', error);
    return NextResponse.json(
      { error: 'AI提案の生成に失敗しました' },
      { status: 500 }
    );
  }
}

/**
 * AIレスポンスをパース
 */
function parseAIResponse(text: string): AIImprovementResponse['suggestions'] {
  const suggestions: AIImprovementResponse['suggestions'] = [];
  
  try {
    // マークダウン形式のレスポンスをパース
    // 簡易実装 - 実際はもっと堅牢に
    
    const sections = text.split('###').filter(s => s.trim());
    
    let currentSuggestion: any = {};
    
    sections.forEach(section => {
      const lines = section.trim().split('\n').filter(l => l.trim());
      if (lines.length === 0) return;
      
      const title = lines[0].replace(/^\d+\.\s*/, '').trim();
      
      // 新しい提案の開始
      if (title && !title.includes(':')) {
        if (currentSuggestion.title) {
          suggestions.push(currentSuggestion);
        }
        currentSuggestion = {
          title,
          description: '',
          actions: [],
          expectedEffect: {},
          difficulty: 'medium',
          estimatedTime: '2週間',
          estimatedCost: 'medium',
          requiresVendor: false
        };
      }
      
      // 各フィールドのパース
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (line.startsWith('- ') || line.startsWith('* ')) {
          const content = line.substring(2).trim();
          
          if (content.includes('CVR:')) {
            currentSuggestion.expectedEffect.cvr = content.replace('CVR:', '').trim();
          } else if (content.includes('CV') || content.includes('コンバージョン')) {
            currentSuggestion.expectedEffect.conversions = content;
          } else if (currentSuggestion.actions) {
            currentSuggestion.actions.push(content);
          }
        } else if (line.toLowerCase().includes('難易度')) {
          if (line.includes('low') || line.includes('低')) currentSuggestion.difficulty = 'low';
          if (line.includes('medium') || line.includes('中')) currentSuggestion.difficulty = 'medium';
          if (line.includes('high') || line.includes('高')) currentSuggestion.difficulty = 'high';
        } else if (line.includes('期間') || line.includes('実施期間')) {
          currentSuggestion.estimatedTime = line.split(':').pop()?.trim() || '2週間';
        } else if (line.toLowerCase().includes('コスト')) {
          if (line.includes('low') || line.includes('低')) currentSuggestion.estimatedCost = 'low';
          if (line.includes('medium') || line.includes('中')) currentSuggestion.estimatedCost = 'medium';
          if (line.includes('high') || line.includes('高')) currentSuggestion.estimatedCost = 'high';
        } else if (line.includes('業者')) {
          currentSuggestion.requiresVendor = line.includes('true') || line.includes('必要');
        } else if (!currentSuggestion.description && line.length > 10) {
          currentSuggestion.description = line;
        }
      }
    });
    
    // 最後の提案を追加
    if (currentSuggestion.title) {
      suggestions.push(currentSuggestion);
    }
    
    // 最低でも1つは返す
    if (suggestions.length === 0) {
      suggestions.push({
        title: 'フォーム項目を削減する',
        description: 'ユーザーの入力負担を減らして離脱を防ぎます',
        actions: [
          '現在のフォーム項目を確認',
          '必須項目と任意項目を見直し',
          '項目を10個→5個に削減'
        ],
        expectedEffect: {
          cvr: '+0.3〜0.5%',
          conversions: '+10〜15件/月'
        },
        difficulty: 'low',
        estimatedTime: '1週間',
        estimatedCost: 'low',
        requiresVendor: false
      });
    }
    
  } catch (error) {
    console.error('AIレスポンスのパースエラー:', error);
  }
  
  return suggestions;
}

