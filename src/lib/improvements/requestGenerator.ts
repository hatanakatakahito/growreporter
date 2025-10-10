/**
 * 業者依頼書生成サービス
 */

import { VendorRequestOptions } from './types';

export class VendorRequestGenerator {
  
  /**
   * 依頼書を生成
   */
  static generate(options: VendorRequestOptions): string {
    const { improvement, siteInfo, selectedActions, additionalNotes } = options;
    
    const today = new Date().toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
　　　Webサイト改善依頼書
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

作成日: ${today}


■ サイト情報
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
サイト名: ${siteInfo.siteName}
URL: ${siteInfo.siteUrl}
業種: ${this.getBusinessTypeDisplay(siteInfo.businessType)}


■ 依頼内容
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【タイトル】
${improvement.title}

【背景・課題】
${this.generateBackground(improvement)}

【期待する効果】
${this.generateExpectedEffect(improvement.expectedEffect)}


■ 具体的な実施内容
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${selectedActions.map((action, index) => `${index + 1}. ${action}`).join('\n')}


■ スケジュール
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
希望納期: ${improvement.scheduledDate ? 
  new Date(improvement.scheduledDate).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) : 
  '相談の上決定'
}


■ 予算
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
想定予算: ${this.getCostDisplay(improvement)}
※上記予算内での対応が難しい場合はご相談ください


${additionalNotes ? `
■ 補足事項
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${additionalNotes}

` : ''}
■ 担当者情報
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
会社名: （ご記入ください）
担当者名: （ご記入ください）
メールアドレス: （ご記入ください）
電話番号: （ご記入ください）


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
以上、よろしくお願いいたします。
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


※本依頼書はGrowReporterで自動生成されました
`;
  }
  
  /**
   * 背景・課題を生成
   */
  private static generateBackground(improvement: any): string {
    const backgrounds: Record<string, string> = {
      'kpi_not_achieved': '設定したKPIに対して達成率が低く、目標達成に向けた改善が必要です。',
      'high_form_abandonment': 'フォームからの離脱率が高く、せっかくの見込み客を逃している状況です。',
      'low_mobile_cvr': 'モバイルデバイスからのコンバージョン率が低く、モバイルユーザー対応の改善が必要です。',
      'high_bounce_rate': '直帰率が高く、訪問者がサイト内を十分に回遊していない状況です。',
      'traffic_decrease': '訪問数が減少傾向にあり、集客力の強化が必要です。',
      'conversion_decrease': 'コンバージョン数が減少しており、早急な改善が必要です。'
    };
    
    return backgrounds[improvement.issueType] || 'サイトのパフォーマンス向上のため、改善が必要です。';
  }
  
  /**
   * 期待効果を生成
   */
  private static generateExpectedEffect(expectedEffect: any): string {
    const effects: string[] = [];
    
    if (expectedEffect.cvr) {
      effects.push(`・コンバージョン率: ${expectedEffect.cvr} の改善`);
    }
    
    if (expectedEffect.conversions) {
      effects.push(`・コンバージョン数: ${expectedEffect.conversions} の増加`);
    }
    
    if (effects.length === 0) {
      effects.push('・サイトパフォーマンスの向上');
    }
    
    return effects.join('\n');
  }
  
  /**
   * コスト表示を生成
   */
  private static getCostDisplay(improvement: any): string {
    const estimatedCost = improvement.estimatedCost || 'medium';
    
    const costMap: Record<string, string> = {
      low: '〜30万円程度',
      medium: '30〜100万円程度',
      high: '100万円〜'
    };
    
    return costMap[estimatedCost] || '要相談';
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
}

