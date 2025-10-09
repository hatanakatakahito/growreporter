/**
 * 👤 ユーザープロファイル型定義
 * GrowReporter ユーザー管理システム
 */

import { Timestamp } from 'firebase/firestore';

/**
 * ユーザープロファイル
 */
export interface UserProfile {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  
  // 基本情報
  profile: {
    firstName: string | null;
    lastName: string | null;
    company: string | null;
    position: string | null;
    phoneNumber: string | null;
    timezone: string;
    language: string;
    // サイト情報
    siteName?: string | null;
    siteUrl?: string | null;
    siteType?: string | null;
    businessType?: string | null;
  };
  
  // 設定
  preferences: {
    theme: 'light' | 'dark' | 'auto';
    emailNotifications: boolean;
    browserNotifications: boolean;
    defaultDateRange: '7days' | '30days' | '90days' | 'custom';
    weekStartsOn: 0 | 1; // 0: Sunday, 1: Monday
  };
  
  // 権限とロール
  roles: {
    isAdmin: boolean;
    isEditor: boolean;
    isViewer: boolean;
  };
  
  // サブスクリプション情報
  subscription: {
    plan: 'free' | 'pro' | 'enterprise';
    status: 'active' | 'inactive' | 'cancelled' | 'trial';
    startDate: Timestamp | null;
    endDate: Timestamp | null;
    features: string[];
  };
  
  // 使用状況
  usage: {
    apiCallsThisMonth: number;
    storageUsedMB: number;
    lastLogin: Timestamp;
    loginCount: number;
  };
  
  // メタデータ
  metadata: {
    createdAt: Timestamp;
    updatedAt: Timestamp;
    emailVerified: boolean;
    onboardingCompleted: boolean;
    termsAcceptedAt: Timestamp | null;
    privacyPolicyAcceptedAt: Timestamp | null;
  };
}

/**
 * ユーザープロファイル作成リクエスト
 */
export interface CreateUserProfileRequest {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  firstName?: string;
  lastName?: string;
  company?: string;
}

/**
 * ユーザープロファイル更新リクエスト
 */
export interface UpdateUserProfileRequest {
  displayName?: string;
  photoURL?: string;
  profile?: {
    firstName?: string;
    lastName?: string;
    company?: string;
    position?: string;
    phoneNumber?: string;
    timezone?: string;
    language?: string;
  };
  preferences?: {
    theme?: 'light' | 'dark' | 'auto';
    emailNotifications?: boolean;
    browserNotifications?: boolean;
    defaultDateRange?: '7days' | '30days' | '90days' | 'custom';
    weekStartsOn?: 0 | 1;
  };
}

/**
 * ユーザーアクティビティログ
 */
export interface UserActivityLog {
  id: string;
  userId: string;
  action: string;
  category: 'auth' | 'data' | 'kpi' | 'report' | 'settings' | 'admin';
  details: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  timestamp: Timestamp;
}

/**
 * ユーザー統計
 */
export interface UserStats {
  totalKPIs: number;
  activeKPIs: number;
  achievedKPIs: number;
  totalReports: number;
  ga4PropertiesConnected: number;
  gscSitesConnected: number;
  lastAnalysisDate: Timestamp | null;
}

/**
 * デフォルトユーザープロファイル値
 */
export const DEFAULT_USER_PROFILE = {
  profile: {
    firstName: null,
    lastName: null,
    company: null,
    position: null,
    phoneNumber: null,
    timezone: 'Asia/Tokyo',
    language: 'ja',
  },
  preferences: {
    theme: 'light' as const,
    emailNotifications: true,
    browserNotifications: false,
    defaultDateRange: '30days' as const,
    weekStartsOn: 1 as const, // Monday
  },
  roles: {
    isAdmin: false,
    isEditor: true,
    isViewer: true,
  },
  subscription: {
    plan: 'free' as const,
    status: 'active' as const,
    startDate: null,
    endDate: null,
    features: ['basic_analytics', 'kpi_management'],
  },
  usage: {
    apiCallsThisMonth: 0,
    storageUsedMB: 0,
    loginCount: 0,
  },
  metadata: {
    emailVerified: false,
    onboardingCompleted: false,
    termsAcceptedAt: null,
    privacyPolicyAcceptedAt: null,
  },
};

/**
 * タイムゾーンリスト
 */
export const TIMEZONES = [
  { value: 'Asia/Tokyo', label: '日本 (JST)' },
  { value: 'America/New_York', label: 'ニューヨーク (EST/EDT)' },
  { value: 'America/Los_Angeles', label: 'ロサンゼルス (PST/PDT)' },
  { value: 'Europe/London', label: 'ロンドン (GMT/BST)' },
  { value: 'Europe/Paris', label: 'パリ (CET/CEST)' },
  { value: 'Asia/Shanghai', label: '上海 (CST)' },
  { value: 'Australia/Sydney', label: 'シドニー (AEDT/AEST)' },
];

/**
 * 言語リスト
 */
export const LANGUAGES = [
  { value: 'ja', label: '日本語' },
  { value: 'en', label: 'English' },
  { value: 'zh', label: '中文' },
  { value: 'ko', label: '한국어' },
];

/**
 * サブスクリプションプラン
 */
export const SUBSCRIPTION_PLANS = {
  free: {
    name: 'Free',
    price: 0,
    features: [
      'basic_analytics',
      'kpi_management',
      'max_5_kpis',
      'monthly_reports',
    ],
  },
  pro: {
    name: 'Pro',
    price: 2980,
    features: [
      'advanced_analytics',
      'unlimited_kpis',
      'ai_insights',
      'custom_reports',
      'api_access',
      'priority_support',
    ],
  },
  enterprise: {
    name: 'Enterprise',
    price: 9800,
    features: [
      'all_pro_features',
      'custom_integration',
      'dedicated_support',
      'sla_guarantee',
      'team_management',
      'white_label',
    ],
  },
};





