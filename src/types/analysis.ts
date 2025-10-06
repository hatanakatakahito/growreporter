/**
 * 📊 分析結果型定義
 * GrowReporter 分析データ管理システム
 */

import { Timestamp } from 'firebase/firestore';

/**
 * 分析レポート
 */
export interface AnalysisReport {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  
  // 分析対象
  target: {
    ga4PropertyId: string | null;
    ga4PropertyName: string | null;
    gscSiteUrl: string | null;
  };
  
  // 期間設定
  dateRange: {
    type: 'preset' | 'custom';
    startDate: string; // YYYY-MM-DD or '7daysAgo'
    endDate: string;   // YYYY-MM-DD or 'today'
    actualStartDate: Timestamp; // 実際の開始日
    actualEndDate: Timestamp;   // 実際の終了日
  };
  
  // GA4データ
  ga4Data: {
    fetched: boolean;
    timestamp: Timestamp | null;
    metrics: {
      sessions: number;
      users: number;
      pageViews: number;
      bounceRate: number;
      avgSessionDuration: number;
    };
    rawData: any; // 元のAPIレスポンス
  };
  
  // GSCデータ
  gscData: {
    fetched: boolean;
    timestamp: Timestamp | null;
    metrics: {
      clicks: number;
      impressions: number;
      ctr: number;
      position: number;
    };
    rawData: any; // 元のAPIレスポンス
  };
  
  // AI分析結果
  aiAnalysis: {
    executed: boolean;
    timestamp: Timestamp | null;
    result: string | null;
    model: string | null;
    tokenCount: number | null;
  };
  
  // KPI更新結果
  kpiUpdates: {
    count: number;
    kpiIds: string[];
    timestamp: Timestamp | null;
  };
  
  // メタデータ
  metadata: {
    createdAt: Timestamp;
    updatedAt: Timestamp;
    version: string; // レポートバージョン
    tags: string[];
    isFavorite: boolean;
    isArchived: boolean;
  };
  
  // 共有設定
  sharing: {
    enabled: boolean;
    shareId: string | null;
    shareUrl: string | null;
    password: string | null;
    allowedViewers: string[];
    expiresAt: Timestamp | null;
    viewCount: number;
    lastViewedAt: Timestamp | null;
    createdAt: Timestamp | null;
  };
}

/**
 * 分析レポート作成リクエスト
 */
export interface CreateAnalysisReportRequest {
  title?: string;
  description?: string;
  ga4PropertyId?: string;
  ga4PropertyName?: string;
  gscSiteUrl?: string;
  dateRangeType: 'preset' | 'custom';
  startDate: string;
  endDate: string;
}

/**
 * 分析レポート更新リクエスト
 */
export interface UpdateAnalysisReportRequest {
  title?: string;
  description?: string;
  tags?: string[];
  isFavorite?: boolean;
  isArchived?: boolean;
}

/**
 * GA4データ保存リクエスト
 */
export interface SaveGA4DataRequest {
  metrics: {
    sessions: number;
    users: number;
    pageViews: number;
    bounceRate: number;
    avgSessionDuration: number;
  };
  rawData: any;
}

/**
 * GSCデータ保存リクエスト
 */
export interface SaveGSCDataRequest {
  metrics: {
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  };
  rawData: any;
}

/**
 * AI分析結果保存リクエスト
 */
export interface SaveAIAnalysisRequest {
  result: string;
  model: string;
  tokenCount?: number;
}

/**
 * 分析レポートフィルターオプション
 */
export interface AnalysisReportFilterOptions {
  dateFrom?: Timestamp;
  dateTo?: Timestamp;
  ga4PropertyId?: string;
  gscSiteUrl?: string;
  tags?: string[];
  isFavorite?: boolean;
  isArchived?: boolean;
  hasAIAnalysis?: boolean;
}

/**
 * 分析サマリー（統計情報）
 */
export interface AnalysisSummary {
  totalReports: number;
  reportsThisMonth: number;
  reportsThisWeek: number;
  favoriteReports: number;
  ga4ReportsCount: number;
  gscReportsCount: number;
  aiAnalysisCount: number;
  lastAnalysisDate: Timestamp | null;
}

/**
 * デフォルト分析レポート値
 */
export const DEFAULT_ANALYSIS_REPORT = {
  target: {
    ga4PropertyId: null,
    ga4PropertyName: null,
    gscSiteUrl: null,
  },
  ga4Data: {
    fetched: false,
    timestamp: null,
    metrics: {
      sessions: 0,
      users: 0,
      pageViews: 0,
      bounceRate: 0,
      avgSessionDuration: 0,
    },
    rawData: null,
  },
  gscData: {
    fetched: false,
    timestamp: null,
    metrics: {
      clicks: 0,
      impressions: 0,
      ctr: 0,
      position: 0,
    },
    rawData: null,
  },
  aiAnalysis: {
    executed: false,
    timestamp: null,
    result: null,
    model: null,
    tokenCount: null,
  },
  kpiUpdates: {
    count: 0,
    kpiIds: [],
    timestamp: null,
  },
  metadata: {
    version: '1.0',
    tags: [],
    isFavorite: false,
    isArchived: false,
  },
  sharing: {
    enabled: false,
    shareId: null,
    shareUrl: null,
    password: null,
    allowedViewers: [],
    expiresAt: null,
    viewCount: 0,
    lastViewedAt: null,
    createdAt: null,
  },
};

/**
 * 分析レポートのステータス
 */
export type AnalysisReportStatus = 
  | 'draft'        // 下書き
  | 'in_progress'  // 分析中
  | 'completed'    // 完了
  | 'failed'       // 失敗
  | 'archived';    // アーカイブ済み

/**
 * 分析レポートのステータスラベル
 */
export const ANALYSIS_REPORT_STATUS_LABELS: Record<AnalysisReportStatus, string> = {
  draft: '下書き',
  in_progress: '分析中',
  completed: '完了',
  failed: '失敗',
  archived: 'アーカイブ済み',
};

/**
 * 🔗 レポート共有設定
 */
export interface ReportSharingSettings {
  enabled: boolean;
  shareId: string; // 共有用のユニークID
  shareUrl: string; // 完全な共有URL
  expiresAt: Timestamp | null; // 有効期限（nullは無期限）
  password: string | null; // アクセスパスワード（nullはパスワード不要）
  allowedViewers: string[]; // 許可されたメールアドレスのリスト（空は誰でもアクセス可能）
  viewCount: number; // 閲覧回数
  lastViewedAt: Timestamp | null; // 最後に閲覧された日時
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * 📊 共有レポートアクセスログ
 */
export interface SharedReportAccessLog {
  id: string;
  shareId: string;
  reportId: string;
  accessedAt: Timestamp;
  ipAddress: string | null;
  userAgent: string | null;
  viewerEmail: string | null; // 認証済みの場合
}

/**
 * 🔐 共有レポート検証結果
 */
export interface ShareValidationResult {
  valid: boolean;
  report: AnalysisReport | null;
  error?: string;
  requiresPassword?: boolean;
}

/**
 * 共有リンク作成リクエスト
 */
export interface CreateShareLinkRequest {
  reportId: string;
  expiresInDays?: number | null; // 有効期限（日数、nullは無期限）
  password?: string | null;
  allowedViewers?: string[];
}

/**
 * 共有リンク更新リクエスト
 */
export interface UpdateShareLinkRequest {
  enabled?: boolean;
  expiresInDays?: number | null;
  password?: string | null;
  allowedViewers?: string[];
}

