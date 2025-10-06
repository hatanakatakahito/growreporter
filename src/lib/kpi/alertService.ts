/**
 * 🔔 KPIアラート管理サービス
 * アラートの生成、保存、取得、既読処理
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp,
  onSnapshot,
  Unsubscribe,
  limit,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase/config';
import {
  CustomKPI,
  KPIAlert,
  AlertGenerationResult,
  KPIGoalStatus,
  KPI_METRIC_DEFINITIONS,
} from '@/types/kpi';

/**
 * アラートサービスクラス
 */
export class AlertService {
  
  /**
   * KPI更新時にアラートを生成
   */
  static async generateAlert(
    userId: string,
    kpi: CustomKPI,
    previousStatus?: KPIGoalStatus
  ): Promise<AlertGenerationResult> {
    try {
      // アラートが無効の場合はスキップ
      if (!kpi.alerts.enabled) {
        return { alert: null, shouldNotify: false };
      }
      
      const { current, goal, metric } = kpi;
      const shouldNotify = this.shouldGenerateAlert(kpi, previousStatus);
      
      if (!shouldNotify) {
        return { alert: null, shouldNotify: false, previousStatus };
      }
      
      // アラートタイプと内容を決定
      let alert: KPIAlert | null = null;
      
      // 🎉 目標達成アラート
      if (current.status === 'achieved' && previousStatus !== 'achieved') {
        alert = {
          id: this.generateAlertId(),
          userId,
          kpiId: kpi.id,
          kpiName: kpi.name,
          type: 'success',
          level: 'low',
          title: '🎉 目標達成！',
          message: `${kpi.name}が目標値 ${goal.target.toLocaleString()}${metric.unit} を達成しました！（現在値: ${current.value.toLocaleString()}${metric.unit}）`,
          timestamp: Timestamp.now(),
          acknowledged: false,
          actionRequired: false,
          metadata: {
            current: current.value,
            target: goal.target,
            progress: current.progress,
            status: current.status,
          },
        };
      }
      
      // 🚨 緊急アラート (50%未満)
      else if (current.status === 'off_track' && current.progress < kpi.alerts.thresholds.critical) {
        const gap = goal.target - current.value;
        const daysLeft = goal.deadline 
          ? Math.ceil((goal.deadline.toMillis() - Date.now()) / (1000 * 60 * 60 * 24))
          : undefined;
        const requiredDailyRate = daysLeft ? Math.ceil(gap / daysLeft) : undefined;
        
        alert = {
          id: this.generateAlertId(),
          userId,
          kpiId: kpi.id,
          kpiName: kpi.name,
          type: 'danger',
          level: 'high',
          title: '🚨 緊急：目標達成が困難',
          message: `${kpi.name}が大幅に遅れています（進捗${current.progress.toFixed(1)}%）。${daysLeft ? `残り${daysLeft}日で${gap.toLocaleString()}${metric.unit}の増加が必要です。` : '即座の対策が必要です。'}`,
          timestamp: Timestamp.now(),
          acknowledged: false,
          actionRequired: true,
          suggestions: this.getSuggestions(kpi, 'critical'),
          metadata: {
            current: current.value,
            target: goal.target,
            progress: current.progress,
            status: current.status,
            daysLeft,
            requiredDailyRate,
            gap,
          },
        };
      }
      
      // ⚠️ 要注意アラート (50-70%)
      else if (current.status === 'at_risk' || 
               (current.progress >= kpi.alerts.thresholds.critical && 
                current.progress < kpi.alerts.thresholds.warning)) {
        const gap = goal.target - current.value;
        const daysLeft = goal.deadline 
          ? Math.ceil((goal.deadline.toMillis() - Date.now()) / (1000 * 60 * 60 * 24))
          : undefined;
        const requiredDailyRate = daysLeft ? Math.ceil(gap / daysLeft) : undefined;
        
        alert = {
          id: this.generateAlertId(),
          userId,
          kpiId: kpi.id,
          kpiName: kpi.name,
          type: 'warning',
          level: 'medium',
          title: '⚠️ 要注意',
          message: `${kpi.name}の進捗が遅れています（${current.progress.toFixed(1)}%）。${daysLeft ? `残り${daysLeft}日で${gap.toLocaleString()}${metric.unit}の増加が必要です。` : '追加施策を検討してください。'}`,
          timestamp: Timestamp.now(),
          acknowledged: false,
          actionRequired: true,
          suggestions: this.getSuggestions(kpi, 'warning'),
          metadata: {
            current: current.value,
            target: goal.target,
            progress: current.progress,
            status: current.status,
            daysLeft,
            requiredDailyRate,
            gap,
          },
        };
      }
      
      // ✅ 順調アラート (70%以上)
      else if (current.status === 'on_track' && previousStatus && previousStatus !== 'on_track') {
        alert = {
          id: this.generateAlertId(),
          userId,
          kpiId: kpi.id,
          kpiName: kpi.name,
          type: 'info',
          level: 'low',
          title: '✅ 順調です',
          message: `${kpi.name}は目標に向けて順調に推移しています（${current.progress.toFixed(1)}%達成）`,
          timestamp: Timestamp.now(),
          acknowledged: false,
          actionRequired: false,
          metadata: {
            current: current.value,
            target: goal.target,
            progress: current.progress,
            status: current.status,
          },
        };
      }
      
      // アラートを保存
      if (alert) {
        await this.saveAlert(alert);
        console.log('✅ アラート生成・保存完了:', alert.title);
      }
      
      return {
        alert,
        shouldNotify: !!alert,
        previousStatus,
      };
      
    } catch (error) {
      console.error('❌ アラート生成エラー:', error);
      return { alert: null, shouldNotify: false };
    }
  }
  
  /**
   * アラートを生成すべきか判定
   */
  private static shouldGenerateAlert(kpi: CustomKPI, previousStatus?: KPIGoalStatus): boolean {
    const { current } = kpi;
    
    // 前回のステータスがない場合は生成しない（初回計算）
    if (!previousStatus) {
      return false;
    }
    
    // ステータスが変化した場合はアラート生成
    if (current.status !== previousStatus) {
      return true;
    }
    
    // 緊急・要注意状態で進捗が変化した場合
    if ((current.status === 'off_track' || current.status === 'at_risk') && 
        Math.abs(current.progress - (kpi.history?.[kpi.history.length - 2]?.progress || 0)) > 5) {
      return true;
    }
    
    return false;
  }
  
  /**
   * 改善提案を生成
   */
  private static getSuggestions(kpi: CustomKPI, severity: 'critical' | 'warning'): string[] {
    const metricDef = KPI_METRIC_DEFINITIONS[kpi.metric.type];
    const suggestions: string[] = [];
    
    if (severity === 'critical') {
      // 緊急時の提案
      if (kpi.metric.source === 'ga4') {
        suggestions.push(
          '🚨 緊急施策：広告キャンペーンの実施',
          '📢 SNS・メールマーケティングの強化',
          '🎁 期間限定キャンペーンの実施',
          '🔍 ユーザー行動分析と改善',
          '⚙️ 目標値の見直しを検討'
        );
      } else if (kpi.metric.source === 'gsc') {
        suggestions.push(
          '📝 コンテンツの緊急追加・更新',
          '🔗 バックリンク強化施策',
          '⚡ サイトパフォーマンス最適化',
          '🎯 ターゲットキーワードの見直し',
          '⚙️ 目標値の見直しを検討'
        );
      }
    } else {
      // 要注意時の提案
      if (kpi.metric.source === 'ga4') {
        suggestions.push(
          '📊 データ分析でボトルネック特定',
          '💡 コンテンツマーケティング強化',
          '🎯 ターゲット層の再検討',
          '📱 ユーザー体験（UX）の改善'
        );
      } else if (kpi.metric.source === 'gsc') {
        suggestions.push(
          '📈 SEO最適化の強化',
          '✍️ 高品質コンテンツの追加',
          '🔍 検索意図の再分析',
          '🌐 内部リンク構造の改善'
        );
      }
    }
    
    return suggestions;
  }
  
  /**
   * アラートを保存
   */
  static async saveAlert(alert: KPIAlert): Promise<void> {
    try {
      const alertRef = doc(firestore, `users/${alert.userId}/kpiAlerts/${alert.id}`);
      await setDoc(alertRef, alert);
    } catch (error) {
      console.error('❌ アラート保存エラー:', error);
      throw error;
    }
  }
  
  /**
   * ユーザーの全アラートを取得
   */
  static async getAlerts(
    userId: string,
    options?: {
      unacknowledgedOnly?: boolean;
      limitCount?: number;
    }
  ): Promise<KPIAlert[]> {
    try {
      const alertsRef = collection(firestore, `users/${userId}/kpiAlerts`);
      
      // インデックス不要なシンプルなクエリに変更
      const q = query(alertsRef, limit(options?.limitCount || 100));
      
      const snapshot = await getDocs(q);
      let alerts = snapshot.docs.map(doc => doc.data() as KPIAlert);
      
      // クライアント側でフィルタリングとソート
      if (options?.unacknowledgedOnly) {
        alerts = alerts.filter(a => !a.acknowledged);
      }
      
      // タイムスタンプで降順ソート
      alerts.sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis());
      
      // 制限がある場合は適用
      if (options?.limitCount) {
        alerts = alerts.slice(0, options.limitCount);
      }
      
      return alerts;
      
    } catch (error) {
      console.error('❌ アラート取得エラー:', error);
      return [];
    }
  }
  
  /**
   * 特定KPIのアラートを取得
   */
  static async getAlertsByKPI(userId: string, kpiId: string): Promise<KPIAlert[]> {
    try {
      const alertsRef = collection(firestore, `users/${userId}/kpiAlerts`);
      
      // インデックス不要なシンプルなクエリに変更
      const q = query(alertsRef, limit(100));
      
      const snapshot = await getDocs(q);
      let alerts = snapshot.docs.map(doc => doc.data() as KPIAlert);
      
      // クライアント側でフィルタリングとソート
      alerts = alerts.filter(a => a.kpiId === kpiId);
      alerts.sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis());
      
      // 最新10件に制限
      return alerts.slice(0, 10);
      
    } catch (error) {
      console.error('❌ KPI別アラート取得エラー:', error);
      return [];
    }
  }
  
  /**
   * アラートを既読にする
   */
  static async acknowledgeAlert(userId: string, alertId: string): Promise<void> {
    try {
      const alertRef = doc(firestore, `users/${userId}/kpiAlerts/${alertId}`);
      await updateDoc(alertRef, {
        acknowledged: true,
        acknowledgedAt: Timestamp.now(),
      });
      console.log('✅ アラート既読完了:', alertId);
    } catch (error) {
      console.error('❌ アラート既読エラー:', error);
      throw error;
    }
  }
  
  /**
   * 複数のアラートを一括既読
   */
  static async acknowledgeMultipleAlerts(userId: string, alertIds: string[]): Promise<void> {
    try {
      const promises = alertIds.map(alertId => 
        this.acknowledgeAlert(userId, alertId)
      );
      await Promise.all(promises);
      console.log(`✅ ${alertIds.length}件のアラートを既読にしました`);
    } catch (error) {
      console.error('❌ 一括既読エラー:', error);
      throw error;
    }
  }
  
  /**
   * アラートをリアルタイム監視
   */
  static subscribeToAlerts(
    userId: string,
    callback: (alerts: KPIAlert[]) => void,
    unacknowledgedOnly: boolean = false
  ): Unsubscribe {
    const alertsRef = collection(firestore, `users/${userId}/kpiAlerts`);
    
    // インデックス不要なシンプルなクエリに変更
    let q = query(alertsRef, limit(50));
    
    return onSnapshot(q, (snapshot) => {
      let alerts = snapshot.docs.map(doc => doc.data() as KPIAlert);
      
      // クライアント側でフィルタリングとソート
      if (unacknowledgedOnly) {
        alerts = alerts.filter(a => !a.acknowledged);
      }
      
      // タイムスタンプで降順ソート（最新が先頭）
      alerts.sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis());
      
      callback(alerts);
    }, (error) => {
      console.error('❌ アラートリアルタイム監視エラー:', error);
      // エラーが発生しても空配列を返して続行
      callback([]);
    });
  }
  
  /**
   * 未読アラート数を取得
   */
  static async getUnacknowledgedCount(userId: string): Promise<number> {
    try {
      const alerts = await this.getAlerts(userId, { unacknowledgedOnly: true });
      return alerts.length;
    } catch (error) {
      console.error('❌ 未読アラート数取得エラー:', error);
      return 0;
    }
  }
  
  /**
   * アラートIDを生成
   */
  private static generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

