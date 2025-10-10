/**
 * サイト改善機能の型定義
 */

// 問題の種類
export type IssueType = 
  | 'kpi_not_achieved'           // KPI未達
  | 'high_form_abandonment'      // フォーム離脱率高
  | 'low_mobile_cvr'             // モバイルCVR低
  | 'high_bounce_rate'           // 直帰率高
  | 'traffic_decrease'           // 流入減少
  | 'conversion_decrease';       // CV数減少

// 優先度
export type Priority = 'high' | 'medium' | 'low';

// 難易度
export type Difficulty = 'low' | 'medium' | 'high';

// コスト
export type Cost = 'low' | 'medium' | 'high';

// カテゴリ
export type Category = 
  | 'cvr_optimization'      // CVR改善
  | 'mobile_optimization'   // モバイル最適化
  | 'speed_improvement'     // 速度改善
  | 'design_improvement'    // デザイン改善
  | 'content_improvement'   // コンテンツ改善
  | 'seo_improvement';      // SEO改善

// 検出された問題
export interface DetectedIssue {
  type: IssueType;
  priority: Priority;
  title: string;
  description: string;
  currentData: {
    metric: string;
    value: number;
    benchmark?: number;
    previousValue?: number;
  };
  detectedAt: Date;
}

// 施策テンプレート
export interface ImprovementTemplate {
  id: string;
  category: Category;
  issueType: IssueType;
  
  // 基本情報
  title: string;
  description: string;
  
  // 実施内容
  actions: string[];
  
  // 期待効果
  expectedEffect: {
    cvr?: string;        // "+0.3〜0.5%"
    conversions?: string; // "+10〜15件/月"
  };
  
  // 実施情報
  difficulty: Difficulty;
  requiresVendor: boolean;
  estimatedTime: string;  // "1週間"
  estimatedCost: Cost;
  
  // 補足
  tips?: string[];
  
  // フィードバック集計（自動更新）
  feedbackSummary?: {
    goodCount: number;
    neutralCount: number;
    badCount: number;
    totalCount: number;
    score: number; // 0-100
    lastUpdated: Date;
  };
  
  // メタ情報
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  version: string;
}

// ユーザーの改善施策
export interface UserImprovement {
  id: string;
  userId: string;
  templateId: string; // テンプレートへの参照
  
  // 施策情報（スナップショット）
  title: string;
  category: Category;
  issueType: IssueType;
  expectedEffect: {
    cvr?: string;
    conversions?: string;
  };
  
  // ステータス
  status: 'suggested' | 'in_progress' | 'completed' | 'postponed';
  
  // TODO情報
  addedAt: Date;
  scheduledDate?: Date;
  startedAt?: Date;
  completedAt?: Date;
  
  // チェックリスト
  checklist?: {
    text: string;
    checked: boolean;
  }[];
  
  memo?: string;
  
  // 業者依頼情報
  vendorRequest?: {
    requestedAt: Date;
    selectedActions: string[];
    requestDocument: string;
    notes?: string;
  };
  
  // 効果測定
  result?: {
    measurementStartedAt: Date;
    beforeData: {
      startDate: string;
      endDate: string;
      cvr: number;
      conversions: number;
      sessions: number;
    };
    afterData: {
      startDate: string;
      endDate: string;
      cvr: number;
      conversions: number;
      sessions: number;
    };
    change: {
      cvr: string;         // "+25%"
      conversions: number; // +5
      sessions: string;    // "+2%"
    };
    achievedExpectation: boolean;
  };
  
  // 振り返り
  retrospective?: {
    memo: string;
    nextActions: string;
    tags: string[];
  };
}

// フィードバック
export interface TemplateFeedback {
  id: string;
  templateId: string;
  userId: string;
  
  // テンプレート情報（スナップショット）
  templateTitle: string;
  templateVersion: string;
  
  // サイト情報（集計用）
  businessType: string;
  siteType: string;
  
  // フィードバック
  rating: 'good' | 'neutral' | 'bad'; // ◯△×
  comment?: string;
  
  submittedAt: Date;
}

// サイトキャプチャ
export interface SiteScreenshot {
  url: string;
  mobile: {
    screenshot: string; // base64
    capturedAt: Date;
  };
  desktop: {
    screenshot: string; // base64
    capturedAt: Date;
  };
  lastUpdated: Date;
}

// AI提案リクエスト
export interface AIImprovementRequest {
  issue: DetectedIssue;
  siteInfo: {
    siteName: string;
    siteUrl: string;
    businessType: string;
    siteType: string;
  };
  analyticsData: any;
  feedbackData?: {
    templateId: string;
    title: string;
    goodCount: number;
    badCount: number;
    score: number;
  }[];
}

// AI提案レスポンス
export interface AIImprovementResponse {
  suggestions: {
    title: string;
    description: string;
    actions: string[];
    expectedEffect: {
      cvr?: string;
      conversions?: string;
    };
    difficulty: Difficulty;
    estimatedTime: string;
    estimatedCost: Cost;
    requiresVendor: boolean;
  }[];
}

// 依頼書生成オプション
export interface VendorRequestOptions {
  improvement: UserImprovement;
  siteInfo: {
    siteName: string;
    siteUrl: string;
    businessType: string;
  };
  selectedActions: string[];
  additionalNotes?: string;
}

