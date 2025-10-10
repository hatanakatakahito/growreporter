/**
 * AI改善提案のプロンプトテンプレート
 */

import { DetectedIssue, AIImprovementRequest } from '@/lib/improvements/types';

export class ImprovementPrompts {
  
  /**
   * 改善提案生成のメインプロンプト
   */
  static generateImprovementPrompt(request: AIImprovementRequest): string {
    const { issue, siteInfo, analyticsData, feedbackData } = request;
    
    return `
あなたはWebサイト改善の専門家です。以下のデータに基づいて、具体的で実行可能な改善案を提案してください。

# サイト情報
- サイト名: ${siteInfo.siteName}
- 業種: ${this.getBusinessTypeDisplay(siteInfo.businessType)}
- サイトタイプ: ${this.getSiteTypeDisplay(siteInfo.siteType)}
- URL: ${siteInfo.siteUrl}

# 現在の問題
${issue.title}

${issue.description}

【データ】
- ${issue.currentData.metric}: ${this.formatMetricValue(issue.currentData.value)}
${issue.currentData.benchmark ? `- 業界平均/目標: ${this.formatMetricValue(issue.currentData.benchmark)}` : ''}
${issue.currentData.previousValue ? `- 前月: ${this.formatMetricValue(issue.currentData.previousValue)}` : ''}

${this.generateAnalyticsContext(analyticsData)}

${feedbackData && feedbackData.length > 0 ? this.generateFeedbackContext(feedbackData) : ''}

# 依頼
上記の問題に対して、以下の形式で改善案を**3つ**提案してください。

## 形式
各改善案について：

### 1. タイトル
（簡潔で分かりやすいタイトル）

### 説明
（なぜこの施策が有効なのか、1-2文で）

### 具体的なアクション
- アクション1
- アクション2
- アクション3
（3-5個の具体的な実施内容）

### 期待効果
- CVR: +X〜Y%
- 月間CV数: +X〜Y件
（具体的な数値で）

### 難易度
low / medium / high のいずれか

### 実施期間
（例: 1週間、2週間）

### コスト
low / medium / high のいずれか

### 業者必要
true / false

---

**重要な注意点**:
- ${siteInfo.businessType === 'btob' ? 'BtoBサイト' : 'BtoCサイト'}の特性を考慮してください
- 実行可能で具体的な提案にしてください
- 難易度は現実的に判断してください
${feedbackData && feedbackData.length > 0 ? '- 過去に好評だった施策の要素を取り入れてください' : ''}
- 3つの提案は難易度のバランスを取ってください（低・中・高 など）
`;
  }
  
  /**
   * アナリティクスデータのコンテキスト生成
   */
  private static generateAnalyticsContext(data: any): string {
    if (!data) return '';
    
    const parts: string[] = [];
    
    if (data.currentMonth) {
      parts.push('【現在のパフォーマンス】');
      if (data.currentMonth.sessions) {
        parts.push(`- 月間訪問数: ${data.currentMonth.sessions.toLocaleString()}件`);
      }
      if (data.currentMonth.cvr) {
        parts.push(`- CVR: ${(data.currentMonth.cvr * 100).toFixed(2)}%`);
      }
      if (data.currentMonth.conversions) {
        parts.push(`- 月間CV数: ${data.currentMonth.conversions}件`);
      }
    }
    
    if (data.funnelData) {
      parts.push('\n【ファネルデータ】');
      if (data.funnelData.totalToFormRate) {
        parts.push(`- フォーム到達率: ${(data.funnelData.totalToFormRate * 100).toFixed(1)}%`);
      }
      if (data.funnelData.formToConversionRate) {
        parts.push(`- フォーム送信完了率: ${(data.funnelData.formToConversionRate * 100).toFixed(1)}%`);
      }
    }
    
    if (data.mobileCVR && data.desktopCVR) {
      parts.push('\n【デバイス別】');
      parts.push(`- モバイルCVR: ${(data.mobileCVR * 100).toFixed(2)}%`);
      parts.push(`- PCCVR: ${(data.desktopCVR * 100).toFixed(2)}%`);
    }
    
    return parts.length > 0 ? '\n' + parts.join('\n') : '';
  }
  
  /**
   * フィードバックデータのコンテキスト生成
   */
  private static generateFeedbackContext(feedbackData: any[]): string {
    const parts: string[] = ['\n# 過去の施策とユーザー評価'];
    parts.push('（以下の施策は実際のユーザーから評価を受けたものです）\n');
    
    feedbackData.forEach(fb => {
      const status = fb.goodCount > fb.badCount ? '✅ 好評' : '⚠️ 不評';
      parts.push(`### ${fb.title}`);
      parts.push(`評価: 👍 ${fb.goodCount}件 | 👎 ${fb.badCount}件`);
      parts.push(`スコア: ${fb.score}/100 ${status}`);
      parts.push('');
    });
    
    parts.push('上記の評価を参考に、好評だった施策の要素を取り入れつつ、不評だった施策は避けてください。');
    
    return parts.join('\n');
  }
  
  /**
   * メトリクス値をフォーマット
   */
  private static formatMetricValue(value: number): string {
    // パーセンテージっぽい値（0-1の範囲）
    if (value >= 0 && value <= 1) {
      return `${(value * 100).toFixed(2)}%`;
    }
    
    // 整数
    return value.toLocaleString();
  }
  
  /**
   * ビジネスタイプを表示用に変換
   */
  private static getBusinessTypeDisplay(type: string): string {
    const map: Record<string, string> = {
      'btob': 'BtoB',
      'btoc': 'BtoC',
      'btobtoc': 'BtoBtoC',
      'personal': '個人'
    };
    return map[type] || type;
  }
  
  /**
   * サイトタイプを表示用に変換
   */
  private static getSiteTypeDisplay(type: string): string {
    const map: Record<string, string> = {
      'corporate': 'コーポレートサイト',
      'product': '製品サイト',
      'service': 'サービスサイト',
      'lp': 'LP（ランディングページ）',
      'media': 'オウンドメディア',
      'ec': 'ECサイト',
      'other': 'その他'
    };
    return map[type] || type;
  }
}

