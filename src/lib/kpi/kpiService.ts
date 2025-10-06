/**
 * 📊 カスタムKPI管理サービス
 * Firestore CRUD操作とKPI計算エンジン
 */

import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  Timestamp,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase/config';
import {
  CustomKPI,
  CreateKPIRequest,
  UpdateKPIRequest,
  KPIFilterOptions,
  KPICalculationResult,
  KPIHistoryEntry,
  KPIMetricType,
  KPIGoalStatus,
  KPI_METRIC_DEFINITIONS
} from '@/types/kpi';
import { AlertService } from './alertService';

/**
 * KPIサービスクラス
 */
export class KPIService {
  
  /**
   * 新しいKPIを作成
   */
  static async createKPI(userId: string, request: CreateKPIRequest): Promise<string> {
    try {
      console.log('🎯 KPI作成開始:', { userId, kpiName: request.name });
      
      const kpiId = `kpi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const metricDef = KPI_METRIC_DEFINITIONS[request.metricType];
      
      // goal オブジェクトを構築（deadline は存在する場合のみ含める）
      const goal: CustomKPI['goal'] = {
        target: request.targetValue,
        operator: request.operator,
      };
      if (request.deadline) {
        goal.deadline = Timestamp.fromDate(request.deadline);
      }
      
      // dataSource オブジェクトを構築（undefined フィールドを除外）
      const dataSource: CustomKPI['dataSource'] = {};
      if (request.ga4PropertyId) {
        dataSource.ga4PropertyId = request.ga4PropertyId;
      }
      if (request.gscSiteUrl) {
        dataSource.gscSiteUrl = request.gscSiteUrl;
      }
      
      const newKPI: CustomKPI = {
        id: kpiId,
        userId,
        name: request.name,
        description: request.description,
        category: request.category || 'その他',
        
        metric: {
          type: request.metricType,
          source: metricDef.source,
          unit: metricDef.unit,
        },
        
        goal,
        
        period: {
          type: request.periodType,
        },
        
        current: {
          value: 0,
          lastUpdated: Timestamp.now(),
          progress: 0,
          status: 'not_started',
        },
        
        dataSource,
        
        alerts: {
          enabled: true,
          thresholds: {
            warning: 70,  // 目標の70%達成で警告
            critical: 50, // 50%未満で緊急
          },
          notifyEmail: false,
          notifyInApp: true,
        },
        
        display: {
          color: this.getDefaultColorForMetric(request.metricType),
          icon: metricDef.icon,
          order: 0,
          showOnDashboard: true,
        },
        
        status: 'active',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        createdBy: userId,
        
        history: [],
      };
      
      const kpiRef = doc(firestore, `users/${userId}/customKPIs/${kpiId}`);
      await setDoc(kpiRef, newKPI);
      
      console.log('✅ KPI作成完了:', kpiId);
      return kpiId;
      
    } catch (error) {
      console.error('❌ KPI作成エラー:', error);
      throw error;
    }
  }
  
  /**
   * KPIを取得
   */
  static async getKPI(userId: string, kpiId: string): Promise<CustomKPI | null> {
    try {
      const kpiRef = doc(firestore, `users/${userId}/customKPIs/${kpiId}`);
      const kpiDoc = await getDoc(kpiRef);
      
      if (!kpiDoc.exists()) {
        return null;
      }
      
      return kpiDoc.data() as CustomKPI;
      
    } catch (error) {
      console.error('❌ KPI取得エラー:', error);
      throw error;
    }
  }
  
  /**
   * ユーザーの全KPIを取得
   */
  static async getAllKPIs(userId: string, filters?: KPIFilterOptions): Promise<CustomKPI[]> {
    try {
      console.log('📊 KPI一覧取得開始:', { userId, filters });
      
      const kpisRef = collection(firestore, `users/${userId}/customKPIs`);
      let q = query(kpisRef, orderBy('createdAt', 'desc'));
      
      // フィルター適用
      if (filters) {
        if (filters.status && filters.status.length > 0) {
          q = query(q, where('status', 'in', filters.status));
        }
        if (filters.showOnDashboard !== undefined) {
          q = query(q, where('display.showOnDashboard', '==', filters.showOnDashboard));
        }
      }
      
      const snapshot = await getDocs(q);
      const kpis = snapshot.docs.map(doc => doc.data() as CustomKPI);
      
      // クライアントサイドフィルタリング（Firestoreの制限回避）
      let filteredKPIs = kpis;
      
      if (filters?.category && filters.category.length > 0) {
        filteredKPIs = filteredKPIs.filter(kpi => 
          filters.category?.includes(kpi.category || '')
        );
      }
      
      if (filters?.metricType && filters.metricType.length > 0) {
        filteredKPIs = filteredKPIs.filter(kpi => 
          filters.metricType?.includes(kpi.metric.type)
        );
      }
      
      if (filters?.goalStatus && filters.goalStatus.length > 0) {
        filteredKPIs = filteredKPIs.filter(kpi => 
          filters.goalStatus?.includes(kpi.current.status)
        );
      }
      
      console.log('✅ KPI一覧取得完了:', filteredKPIs.length);
      return filteredKPIs;
      
    } catch (error) {
      console.error('❌ KPI一覧取得エラー:', error);
      throw error;
    }
  }
  
  /**
   * KPIを更新
   */
  static async updateKPI(
    userId: string, 
    kpiId: string, 
    updates: UpdateKPIRequest
  ): Promise<void> {
    try {
      console.log('🔧 KPI更新開始:', { userId, kpiId, updates });
      
      const kpiRef = doc(firestore, `users/${userId}/customKPIs/${kpiId}`);
      const updateData: any = {
        updatedAt: Timestamp.now(),
      };
      
      if (updates.name) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.category) updateData.category = updates.category;
      if (updates.targetValue) updateData['goal.target'] = updates.targetValue;
      if (updates.operator) updateData['goal.operator'] = updates.operator;
      if (updates.deadline) updateData['goal.deadline'] = Timestamp.fromDate(updates.deadline);
      if (updates.status) updateData.status = updates.status;
      if (updates.showOnDashboard !== undefined) {
        updateData['display.showOnDashboard'] = updates.showOnDashboard;
      }
      
      await updateDoc(kpiRef, updateData);
      
      console.log('✅ KPI更新完了');
      
    } catch (error) {
      console.error('❌ KPI更新エラー:', error);
      throw error;
    }
  }
  
  /**
   * KPIを削除
   */
  static async deleteKPI(userId: string, kpiId: string): Promise<void> {
    try {
      console.log('🗑️ KPI削除開始:', { userId, kpiId });
      
      const kpiRef = doc(firestore, `users/${userId}/customKPIs/${kpiId}`);
      await deleteDoc(kpiRef);
      
      console.log('✅ KPI削除完了');
      
    } catch (error) {
      console.error('❌ KPI削除エラー:', error);
      throw error;
    }
  }
  
  /**
   * KPIの現在値を計算・更新
   */
  static async calculateKPI(
    userId: string, 
    kpiId: string,
    ga4Data?: any,
    gscData?: any
  ): Promise<KPICalculationResult> {
    try {
      console.log('🧮 KPI計算開始:', { userId, kpiId });
      
      const kpi = await this.getKPI(userId, kpiId);
      if (!kpi) {
        throw new Error('KPI not found');
      }
      
      // メトリクスタイプに応じて値を計算
      const currentValue = this.calculateMetricValue(kpi, ga4Data, gscData);
      const previousValue = kpi.current.value;
      const change = currentValue - previousValue;
      const changePercent = previousValue > 0 ? (change / previousValue) * 100 : 0;
      
      // 進捗率を計算
      const progress = this.calculateProgress(kpi, currentValue);
      
      // 目標達成状態を判定
      const status = this.determineGoalStatus(kpi, currentValue, progress);
      
      // 前回のステータスを保存
      const previousStatus = kpi.current.status;
      
      // KPIを更新
      await updateDoc(doc(firestore, `users/${userId}/customKPIs/${kpiId}`), {
        'current.value': currentValue,
        'current.lastUpdated': Timestamp.now(),
        'current.progress': progress,
        'current.status': status,
        lastCalculatedAt: Timestamp.now(),
      });
      
      // 更新されたKPIを取得
      const updatedKPI = await this.getKPI(userId, kpiId);
      
      // アラートを生成
      if (updatedKPI) {
        await AlertService.generateAlert(userId, updatedKPI, previousStatus);
      }
      
      // 履歴に追加
      const historyEntry: KPIHistoryEntry = {
        date: new Date().toISOString().split('T')[0],
        value: currentValue,
        progress,
        status,
        timestamp: Timestamp.now(),
      };
      
      await this.addHistoryEntry(userId, kpiId, historyEntry);
      
      const result: KPICalculationResult = {
        kpiId,
        value: currentValue,
        previousValue,
        change,
        changePercent,
        progress,
        status,
        calculatedAt: Timestamp.now(),
        dataPoints: 1,
        confidence: 'high',
      };
      
      console.log('✅ KPI計算完了:', result);
      return result;
      
    } catch (error) {
      console.error('❌ KPI計算エラー:', error);
      throw error;
    }
  }
  
  /**
   * メトリクス値を計算
   */
  private static calculateMetricValue(
    kpi: CustomKPI, 
    ga4Data?: any, 
    gscData?: any
  ): number {
    switch (kpi.metric.type) {
      // GA4メトリクス
      case 'ga4_sessions':
        return ga4Data?.totalSessions || 0;
      case 'ga4_users':
        return ga4Data?.totalUsers || 0;
      case 'ga4_pageviews':
        return ga4Data?.totalPageViews || 0;
      case 'ga4_bounce_rate':
        return ga4Data?.avgBounceRate || 0;
      case 'ga4_avg_session_duration':
        return ga4Data?.avgSessionDuration || 0;
      case 'ga4_conversions':
        return ga4Data?.totalConversions || 0;
      case 'ga4_conversion_rate':
        return ga4Data?.conversionRate || 0;
      
      // GSCメトリクス
      case 'gsc_clicks':
        return gscData?.totalClicks || 0;
      case 'gsc_impressions':
        return gscData?.totalImpressions || 0;
      case 'gsc_ctr':
        return gscData?.avgCTR || 0;
      case 'gsc_position':
        return gscData?.avgPosition || 0;
      
      // カスタム計算式
      case 'custom_formula':
        // TODO: カスタム計算式の実装
        return 0;
      
      default:
        return 0;
    }
  }
  
  /**
   * 進捗率を計算
   */
  private static calculateProgress(kpi: CustomKPI, currentValue: number): number {
    const target = kpi.goal.target;
    if (target === 0) return 0;
    
    const progress = (currentValue / target) * 100;
    return Math.min(Math.max(progress, 0), 100); // 0-100の範囲に制限
  }
  
  /**
   * 目標達成状態を判定
   */
  private static determineGoalStatus(
    kpi: CustomKPI, 
    currentValue: number, 
    progress: number
  ): KPIGoalStatus {
    const { operator, target, minValue, maxValue } = kpi.goal;
    
    // 目標達成チェック
    let isAchieved = false;
    switch (operator) {
      case 'greater_than':
        isAchieved = currentValue > target;
        break;
      case 'less_than':
        isAchieved = currentValue < target;
        break;
      case 'equal_to':
        isAchieved = currentValue === target;
        break;
      case 'greater_or_equal':
        isAchieved = currentValue >= target;
        break;
      case 'less_or_equal':
        isAchieved = currentValue <= target;
        break;
      case 'between':
        isAchieved = currentValue >= (minValue || 0) && currentValue <= (maxValue || target);
        break;
    }
    
    if (isAchieved) return 'achieved';
    
    // 進捗状況による判定
    if (progress === 0) return 'not_started';
    if (progress >= kpi.alerts.thresholds.warning) return 'on_track';
    if (progress >= kpi.alerts.thresholds.critical) return 'at_risk';
    return 'off_track';
  }
  
  /**
   * 履歴エントリを追加
   */
  private static async addHistoryEntry(
    userId: string, 
    kpiId: string, 
    entry: KPIHistoryEntry
  ): Promise<void> {
    try {
      const kpiRef = doc(firestore, `users/${userId}/customKPIs/${kpiId}`);
      const kpi = await this.getKPI(userId, kpiId);
      
      if (!kpi) return;
      
      const history = kpi.history || [];
      history.push(entry);
      
      // 最新100件のみ保持
      const trimmedHistory = history.slice(-100);
      
      await updateDoc(kpiRef, {
        history: trimmedHistory,
      });
      
    } catch (error) {
      console.error('❌ 履歴追加エラー:', error);
    }
  }
  
  /**
   * KPIをリアルタイム監視
   */
  static subscribeToKPIs(
    userId: string, 
    callback: (kpis: CustomKPI[]) => void
  ): Unsubscribe {
    const kpisRef = collection(firestore, `users/${userId}/customKPIs`);
    const q = query(kpisRef, orderBy('createdAt', 'desc'));
    
    return onSnapshot(q, (snapshot) => {
      const kpis = snapshot.docs.map(doc => doc.data() as CustomKPI);
      callback(kpis);
    }, (error) => {
      console.error('❌ KPIリアルタイム監視エラー:', error);
    });
  }
  
  /**
   * メトリクスタイプに応じたデフォルトカラーを取得
   */
  private static getDefaultColorForMetric(metricType: KPIMetricType): string {
    const colorMap: Record<string, string> = {
      ga4_sessions: '#2196f3',
      ga4_users: '#1976d2',
      ga4_pageviews: '#64b5f6',
      ga4_bounce_rate: '#ff9800',
      ga4_conversions: '#4caf50',
      ga4_conversion_rate: '#66bb6a',
      gsc_clicks: '#00bcd4',
      gsc_impressions: '#0097a7',
      gsc_ctr: '#26c6da',
      gsc_position: '#ffc107',
      custom_formula: '#9c27b0',
    };
    
    return colorMap[metricType] || '#757575';
  }
}

