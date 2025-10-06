/**
 * 🔐 管理者パネル型定義
 */

import { Timestamp } from 'firebase/firestore';

/**
 * システム統計
 */
export interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  totalReports: number;
  totalKPIs: number;
  totalAnalyses: number;
  storageUsed: number; // MB
  apiCallsToday: number;
  lastUpdated: Timestamp;
}

/**
 * ユーザーリスト項目
 */
export interface AdminUserListItem {
  uid: string;
  email: string;
  displayName: string | null;
  createdAt: Timestamp;
  lastLoginAt: Timestamp;
  subscription: {
    plan: 'free' | 'basic' | 'pro';
    status: 'active' | 'inactive';
  };
  stats: {
    totalReports: number;
    totalKPIs: number;
  };
}

/**
 * アクティビティログ
 */
export interface SystemActivityLog {
  id: string;
  timestamp: Timestamp;
  userId: string;
  userEmail: string;
  action: string;
  details: string;
  ipAddress: string | null;
}





