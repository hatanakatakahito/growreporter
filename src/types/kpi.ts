/**
 * 📊 カスタムKPI型定義
 * GrowReporter カスタムKPI管理システム
 */

import { Timestamp } from 'firebase/firestore';

/**
 * KPIメトリクスタイプ
 */
export type KPIMetricType = 
  // GA4メトリクス
  | 'ga4_sessions'
  | 'ga4_users'
  | 'ga4_pageviews'
  | 'ga4_bounce_rate'
  | 'ga4_avg_session_duration'
  | 'ga4_conversions'
  | 'ga4_conversion_rate'
  // GSCメトリクス
  | 'gsc_clicks'
  | 'gsc_impressions'
  | 'gsc_ctr'
  | 'gsc_position'
  // カスタム計算メトリクス
  | 'custom_formula';

/**
 * KPI比較演算子
 */
export type KPIComparisonOperator = 
  | 'greater_than'      // より大きい
  | 'less_than'         // より小さい
  | 'equal_to'          // 等しい
  | 'greater_or_equal'  // 以上
  | 'less_or_equal'     // 以下
  | 'between';          // 範囲内

/**
 * KPI期間タイプ
 */
export type KPIPeriodType = 
  | 'daily'     // 日次
  | 'weekly'    // 週次
  | 'monthly'   // 月次
  | 'quarterly' // 四半期
  | 'yearly'    // 年次
  | 'custom';   // カスタム期間

/**
 * KPIステータス
 */
export type KPIStatus = 
  | 'active'      // アクティブ
  | 'paused'      // 一時停止
  | 'archived'    // アーカイブ
  | 'achieved';   // 達成済み

/**
 * KPI目標達成状態
 */
export type KPIGoalStatus = 
  | 'on_track'    // 順調
  | 'at_risk'     // 要注意
  | 'off_track'   // 遅延
  | 'achieved'    // 達成
  | 'not_started';// 未開始

/**
 * カスタムKPIインターフェース
 */
export interface CustomKPI {
  // 基本情報
  id: string;
  userId: string;
  name: string;
  description?: string;
  category?: string;           // 例: "トラフィック", "コンバージョン", "SEO"
  
  // メトリクス定義
  metric: {
    type: KPIMetricType;
    source: 'ga4' | 'gsc' | 'custom';
    formula?: string;          // カスタム計算式（custom_formulaの場合）
    unit?: string;             // 単位（%, 件, 円, など）
  };
  
  // 目標設定
  goal: {
    target: number;            // 目標値
    operator: KPIComparisonOperator;
    minValue?: number;         // between の場合の最小値
    maxValue?: number;         // between の場合の最大値
    deadline?: Timestamp;      // 目標達成期限
  };
  
  // 期間設定
  period: {
    type: KPIPeriodType;
    startDate?: string;        // YYYY-MM-DD
    endDate?: string;          // YYYY-MM-DD
  };
  
  // 現在の値
  current: {
    value: number;
    lastUpdated: Timestamp;
    progress: number;          // 進捗率 (0-100)
    status: KPIGoalStatus;
  };
  
  // データソース
  dataSource: {
    ga4PropertyId?: string;
    gscSiteUrl?: string;
    dimensions?: string[];     // GA4/GSCのディメンション
    filters?: any[];           // フィルター条件
  };
  
  // アラート設定
  alerts: {
    enabled: boolean;
    thresholds: {
      warning: number;         // 警告閾値（%）
      critical: number;        // 緊急閾値（%）
    };
    notifyEmail: boolean;
    notifyInApp: boolean;
  };
  
  // 表示設定
  display: {
    color?: string;            // チャート表示色
    icon?: string;             // アイコン
    order?: number;            // 表示順序
    showOnDashboard: boolean;  // ダッシュボード表示
  };
  
  // メタデータ
  status: KPIStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  lastCalculatedAt?: Timestamp;
  
  // 履歴トラッキング
  history?: KPIHistoryEntry[];
}

/**
 * KPI履歴エントリ
 */
export interface KPIHistoryEntry {
  date: string;              // YYYY-MM-DD
  value: number;
  progress: number;
  status: KPIGoalStatus;
  timestamp: Timestamp;
}

/**
 * KPI計算結果
 */
export interface KPICalculationResult {
  kpiId: string;
  value: number;
  previousValue?: number;
  change?: number;           // 変化量
  changePercent?: number;    // 変化率（%）
  progress: number;          // 進捗率（%）
  status: KPIGoalStatus;
  calculatedAt: Timestamp;
  dataPoints: number;        // データポイント数
  confidence: 'high' | 'medium' | 'low'; // 信頼度
}

/**
 * KPIダッシュボードウィジェット
 */
export interface KPIDashboardWidget {
  kpiId: string;
  kpi: CustomKPI;
  calculation: KPICalculationResult;
  trend: 'up' | 'down' | 'stable';
  alerts: KPIAlert[];
}

/**
 * KPIアラート
 */
export interface KPIAlert {
  id: string;
  userId: string;
  kpiId: string;
  kpiName: string;
  type: 'success' | 'warning' | 'danger' | 'info';
  level: 'high' | 'medium' | 'low';
  title: string;
  message: string;
  timestamp: Timestamp;
  acknowledged: boolean;
  acknowledgedAt?: Timestamp;
  actionRequired: boolean;
  suggestions?: string[];
  metadata: {
    current: number;
    target: number;
    progress: number;
    status: KPIGoalStatus;
    daysLeft?: number;
    requiredDailyRate?: number;
    gap?: number;
  };
}

/**
 * アラート生成結果
 */
export interface AlertGenerationResult {
  alert: KPIAlert | null;
  shouldNotify: boolean;
  previousStatus?: KPIGoalStatus;
}

/**
 * アラート設定
 */
export interface AlertSettings {
  enabled: boolean;
  thresholds: {
    warning: number;      // 警告閾値（デフォルト70%）
    critical: number;     // 緊急閾値（デフォルト50%）
  };
  notifyEmail: boolean;
  notifyInApp: boolean;
  notifyBrowser: boolean;
}

/**
 * KPI作成リクエスト
 */
export interface CreateKPIRequest {
  name: string;
  description?: string;
  category?: string;
  metricType: KPIMetricType;
  targetValue: number;
  operator: KPIComparisonOperator;
  periodType: KPIPeriodType;
  ga4PropertyId?: string;
  gscSiteUrl?: string;
  deadline?: Date;
}

/**
 * KPI更新リクエスト
 */
export interface UpdateKPIRequest {
  name?: string;
  description?: string;
  category?: string;
  targetValue?: number;
  operator?: KPIComparisonOperator;
  deadline?: Date;
  status?: KPIStatus;
  showOnDashboard?: boolean;
  goal?: {
    target: number;
    operator: KPIComparisonOperator;
    deadline?: Timestamp;
  };
  alerts?: {
    enabled: boolean;
    thresholds: {
      warning: number;
      critical: number;
    };
    notifyEmail: boolean;
    notifyInApp: boolean;
    notifyBrowser: boolean;
  };
}

/**
 * KPIフィルターオプション
 */
export interface KPIFilterOptions {
  status?: KPIStatus[];
  category?: string[];
  metricType?: KPIMetricType[];
  goalStatus?: KPIGoalStatus[];
  showOnDashboard?: boolean;
}

/**
 * KPIメトリクス定義
 */
export const KPI_METRIC_DEFINITIONS: Record<KPIMetricType, {
  label: string;
  description: string;
  source: 'ga4' | 'gsc' | 'custom';
  unit: string;
  icon: string;
}> = {
  // GA4メトリクス
  ga4_sessions: {
    label: 'セッション数',
    description: 'ウェブサイトへの訪問回数',
    source: 'ga4',
    unit: '回',
    icon: '👥'
  },
  ga4_users: {
    label: 'ユーザー数',
    description: 'アクティブユーザーの数',
    source: 'ga4',
    unit: '人',
    icon: '👤'
  },
  ga4_pageviews: {
    label: 'ページビュー数',
    description: 'ページが表示された回数',
    source: 'ga4',
    unit: '回',
    icon: '📄'
  },
  ga4_bounce_rate: {
    label: '直帰率',
    description: '1ページのみ閲覧して離脱した割合',
    source: 'ga4',
    unit: '%',
    icon: '⚠️'
  },
  ga4_avg_session_duration: {
    label: '平均セッション時間',
    description: '1セッションあたりの平均滞在時間',
    source: 'ga4',
    unit: '秒',
    icon: '⏱️'
  },
  ga4_conversions: {
    label: 'コンバージョン数',
    description: '目標達成回数',
    source: 'ga4',
    unit: '件',
    icon: '🎯'
  },
  ga4_conversion_rate: {
    label: 'コンバージョン率',
    description: 'セッションに対するコンバージョンの割合',
    source: 'ga4',
    unit: '%',
    icon: '📈'
  },
  // GSCメトリクス
  gsc_clicks: {
    label: 'クリック数',
    description: '検索結果からのクリック数',
    source: 'gsc',
    unit: '回',
    icon: '🖱️'
  },
  gsc_impressions: {
    label: 'インプレッション数',
    description: '検索結果での表示回数',
    source: 'gsc',
    unit: '回',
    icon: '👁️'
  },
  gsc_ctr: {
    label: 'クリック率（CTR）',
    description: 'インプレッションに対するクリックの割合',
    source: 'gsc',
    unit: '%',
    icon: '📊'
  },
  gsc_position: {
    label: '平均掲載順位',
    description: '検索結果での平均順位',
    source: 'gsc',
    unit: '位',
    icon: '🏆'
  },
  // カスタムメトリクス
  custom_formula: {
    label: 'カスタム計算式',
    description: '独自の計算式によるメトリクス',
    source: 'custom',
    unit: '',
    icon: '🔧'
  }
};

/**
 * KPI比較演算子ラベル
 */
export const KPI_OPERATOR_LABELS: Record<KPIComparisonOperator, string> = {
  greater_than: '〜より大きい',
  less_than: '〜より小さい',
  equal_to: '〜と等しい',
  greater_or_equal: '〜以上',
  less_or_equal: '〜以下',
  between: '〜の範囲内'
};

/**
 * KPI期間タイプラベル
 */
export const KPI_PERIOD_LABELS: Record<KPIPeriodType, string> = {
  daily: '日次',
  weekly: '週次',
  monthly: '月次',
  quarterly: '四半期',
  yearly: '年次',
  custom: 'カスタム期間'
};

/**
 * KPIステータスラベル
 */
export const KPI_STATUS_LABELS: Record<KPIStatus, string> = {
  active: 'アクティブ',
  paused: '一時停止',
  archived: 'アーカイブ',
  achieved: '達成済み'
};

/**
 * KPI目標達成状態ラベル
 */
export const KPI_GOAL_STATUS_LABELS: Record<KPIGoalStatus, string> = {
  on_track: '順調',
  at_risk: '要注意',
  off_track: '遅延',
  achieved: '達成',
  not_started: '未開始'
};

