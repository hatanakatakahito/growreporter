/**
 * 問題検出サービス
 * データから改善すべき問題を自動検出
 */

import { DetectedIssue, IssueType, Priority } from './types';
import { KPISetting } from '@/lib/kpi/kpiService';

interface AnalyticsData {
  // 月次データ
  currentMonth: {
    cvr: number;
    conversions: number;
    sessions: number;
    screenPageViews: number;
    bounceRate: number;
  };
  lastMonth: {
    cvr: number;
    conversions: number;
    sessions: number;
  };
  
  // デバイス別
  mobileCVR: number;
  desktopCVR: number;
  
  // ファネルデータ
  funnelData?: {
    formToConversionRate: number;
    totalToFormRate: number;
  };
  
  // KPI設定
  kpiSettings?: KPISetting[];
  kpiAchievement?: {
    [metric: string]: {
      current: number;
      target: number;
      achievementRate: number;
    };
  };
}

export class ImprovementDetectionService {
  
  /**
   * 問題を検出
   */
  static async detectIssues(userId: string, data: AnalyticsData): Promise<DetectedIssue[]> {
    const issues: DetectedIssue[] = [];
    
    // 1. KPI未達チェック
    const kpiIssues = this.checkKPIAchievement(data);
    issues.push(...kpiIssues);
    
    // 2. フォーム離脱チェック
    const formIssue = this.checkFormAbandonment(data);
    if (formIssue) issues.push(formIssue);
    
    // 3. モバイルCVRチェック
    const mobileIssue = this.checkMobileCVR(data);
    if (mobileIssue) issues.push(mobileIssue);
    
    // 4. 直帰率チェック
    const bounceIssue = this.checkBounceRate(data);
    if (bounceIssue) issues.push(bounceIssue);
    
    // 5. 前月比チェック
    const comparisonIssues = this.checkMonthlyComparison(data);
    issues.push(...comparisonIssues);
    
    // 優先度順にソート
    return issues.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }
  
  /**
   * KPI未達をチェック
   */
  private static checkKPIAchievement(data: AnalyticsData): DetectedIssue[] {
    const issues: DetectedIssue[] = [];
    
    if (!data.kpiAchievement) return issues;
    
    Object.entries(data.kpiAchievement).forEach(([metric, achievement]) => {
      if (achievement.achievementRate < 0.8) { // 80%未満
        const priority: Priority = achievement.achievementRate < 0.6 ? 'high' : 'medium';
        
        issues.push({
          type: 'kpi_not_achieved',
          priority,
          title: `${this.getMetricDisplayName(metric)}が目標未達`,
          description: `目標の${Math.round(achievement.achievementRate * 100)}%しか達成できていません`,
          currentData: {
            metric,
            value: achievement.current,
            benchmark: achievement.target
          },
          detectedAt: new Date()
        });
      }
    });
    
    return issues;
  }
  
  /**
   * フォーム離脱をチェック
   */
  private static checkFormAbandonment(data: AnalyticsData): DetectedIssue | null {
    if (!data.funnelData) return null;
    
    const { formToConversionRate } = data.funnelData;
    
    // 業界平均: 40-50%
    if (formToConversionRate < 0.3) {
      return {
        type: 'high_form_abandonment',
        priority: 'high',
        title: 'フォームからの離脱が多い',
        description: `フォーム到達者の${Math.round((1 - formToConversionRate) * 100)}%が離脱しています`,
        currentData: {
          metric: 'formToConversionRate',
          value: formToConversionRate,
          benchmark: 0.45 // 業界平均
        },
        detectedAt: new Date()
      };
    }
    
    return null;
  }
  
  /**
   * モバイルCVRをチェック
   */
  private static checkMobileCVR(data: AnalyticsData): DetectedIssue | null {
    const { mobileCVR, desktopCVR } = data;
    
    if (!mobileCVR || !desktopCVR) return null;
    
    // モバイルがPCの60%未満
    if (mobileCVR < desktopCVR * 0.6) {
      return {
        type: 'low_mobile_cvr',
        priority: 'medium',
        title: 'モバイルのCVRが低い',
        description: `モバイル(${(mobileCVR * 100).toFixed(1)}%)がPC(${(desktopCVR * 100).toFixed(1)}%)より大幅に低いです`,
        currentData: {
          metric: 'mobileCVR',
          value: mobileCVR,
          benchmark: desktopCVR
        },
        detectedAt: new Date()
      };
    }
    
    return null;
  }
  
  /**
   * 直帰率をチェック
   */
  private static checkBounceRate(data: AnalyticsData): DetectedIssue | null {
    const { bounceRate } = data.currentMonth;
    
    if (!bounceRate) return null;
    
    // 70%以上
    if (bounceRate > 0.7) {
      return {
        type: 'high_bounce_rate',
        priority: 'medium',
        title: '直帰率が高い',
        description: `訪問者の${Math.round(bounceRate * 100)}%が1ページだけ見て離脱しています`,
        currentData: {
          metric: 'bounceRate',
          value: bounceRate,
          benchmark: 0.5 // 一般的な目安
        },
        detectedAt: new Date()
      };
    }
    
    return null;
  }
  
  /**
   * 前月比をチェック
   */
  private static checkMonthlyComparison(data: AnalyticsData): DetectedIssue[] {
    const issues: DetectedIssue[] = [];
    const { currentMonth, lastMonth } = data;
    
    if (!lastMonth) return issues;
    
    // セッション数の減少
    if (lastMonth.sessions > 0) {
      const sessionChange = (currentMonth.sessions - lastMonth.sessions) / lastMonth.sessions;
      
      if (sessionChange < -0.1) { // 10%以上減少
        issues.push({
          type: 'traffic_decrease',
          priority: sessionChange < -0.2 ? 'high' : 'medium',
          title: '訪問数が減少している',
          description: `前月比${Math.abs(Math.round(sessionChange * 100))}%減少しています`,
          currentData: {
            metric: 'sessions',
            value: currentMonth.sessions,
            previousValue: lastMonth.sessions
          },
          detectedAt: new Date()
        });
      }
    }
    
    // CV数の減少
    if (lastMonth.conversions > 0) {
      const conversionChange = (currentMonth.conversions - lastMonth.conversions) / lastMonth.conversions;
      
      if (conversionChange < -0.1) { // 10%以上減少
        issues.push({
          type: 'conversion_decrease',
          priority: conversionChange < -0.2 ? 'high' : 'medium',
          title: 'コンバージョン数が減少している',
          description: `前月比${Math.abs(Math.round(conversionChange * 100))}%減少しています`,
          currentData: {
            metric: 'conversions',
            value: currentMonth.conversions,
            previousValue: lastMonth.conversions
          },
          detectedAt: new Date()
        });
      }
    }
    
    return issues;
  }
  
  /**
   * メトリクス名を表示用に変換
   */
  private static getMetricDisplayName(metric: string): string {
    // conversion_ プレフィックスの場合は、イベント名をそのまま返す
    if (metric.startsWith('conversion_')) {
      return metric.replace('conversion_', '');
    }
    
    const displayNames: Record<string, string> = {
      'sessions': 'セッション数',
      'pageviews': 'ページビュー数',
      'users': 'ユーザー数',
      'conversions': 'コンバージョン数',
      'cvr': 'CVR',
      'engagementRate': 'エンゲージメント率'
    };
    
    return displayNames[metric] || metric;
  }
}

