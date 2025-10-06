/**
 * 🔗 レポート共有サービス
 * 分析レポートの共有リンク生成と管理
 */

import { firestore } from '@/lib/firebase/config';
import {
  doc,
  getDoc,
  updateDoc,
  setDoc,
  Timestamp,
  collection,
  addDoc,
} from 'firebase/firestore';
import {
  AnalysisReport,
  CreateShareLinkRequest,
  UpdateShareLinkRequest,
  ShareValidationResult,
  SharedReportAccessLog,
} from '@/types/analysis';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

export class SharingService {
  /**
   * 共有リンクを生成
   */
  static async createShareLink(
    userId: string,
    request: CreateShareLinkRequest
  ): Promise<string> {
    try {
      const { reportId, expiresInDays, password, allowedViewers } = request;
      
      // レポートを取得
      const reportRef = doc(firestore, `users/${userId}/analysisReports/${reportId}`);
      const reportSnap = await getDoc(reportRef);
      
      if (!reportSnap.exists()) {
        throw new Error('レポートが見つかりません');
      }
      
      // 共有IDを生成
      const shareId = uuidv4();
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
      const shareUrl = `${baseUrl}/shared/${shareId}`;
      
      // 有効期限を計算
      let expiresAt: Timestamp | null = null;
      if (expiresInDays !== null && expiresInDays !== undefined) {
        const expiresDate = new Date();
        expiresDate.setDate(expiresDate.getDate() + expiresInDays);
        expiresAt = Timestamp.fromDate(expiresDate);
      }
      
      // パスワードをハッシュ化
      let hashedPassword: string | null = null;
      if (password) {
        hashedPassword = await bcrypt.hash(password, 10);
      }
      
      const now = Timestamp.now();
      
      // レポートを更新
      await updateDoc(reportRef, {
        'sharing.enabled': true,
        'sharing.shareId': shareId,
        'sharing.shareUrl': shareUrl,
        'sharing.password': hashedPassword,
        'sharing.allowedViewers': allowedViewers || [],
        'sharing.expiresAt': expiresAt,
        'sharing.viewCount': 0,
        'sharing.lastViewedAt': null,
        'sharing.createdAt': now,
        'metadata.updatedAt': now,
      });
      
      console.log('✅ 共有リンク生成完了:', shareUrl);
      
      return shareUrl;
      
    } catch (error) {
      console.error('❌ 共有リンク生成エラー:', error);
      throw error;
    }
  }
  
  /**
   * 共有リンクを更新
   */
  static async updateShareLink(
    userId: string,
    reportId: string,
    request: UpdateShareLinkRequest
  ): Promise<void> {
    try {
      const reportRef = doc(firestore, `users/${userId}/analysisReports/${reportId}`);
      const reportSnap = await getDoc(reportRef);
      
      if (!reportSnap.exists()) {
        throw new Error('レポートが見つかりません');
      }
      
      const updateData: any = {
        'metadata.updatedAt': Timestamp.now(),
      };
      
      if (request.enabled !== undefined) {
        updateData['sharing.enabled'] = request.enabled;
      }
      
      if (request.expiresInDays !== undefined) {
        if (request.expiresInDays === null) {
          updateData['sharing.expiresAt'] = null;
        } else {
          const expiresDate = new Date();
          expiresDate.setDate(expiresDate.getDate() + request.expiresInDays);
          updateData['sharing.expiresAt'] = Timestamp.fromDate(expiresDate);
        }
      }
      
      if (request.password !== undefined) {
        if (request.password === null) {
          updateData['sharing.password'] = null;
        } else {
          updateData['sharing.password'] = await bcrypt.hash(request.password, 10);
        }
      }
      
      if (request.allowedViewers !== undefined) {
        updateData['sharing.allowedViewers'] = request.allowedViewers;
      }
      
      await updateDoc(reportRef, updateData);
      
      console.log('✅ 共有リンク更新完了:', reportId);
      
    } catch (error) {
      console.error('❌ 共有リンク更新エラー:', error);
      throw error;
    }
  }
  
  /**
   * 共有リンクを削除（無効化）
   */
  static async revokeShareLink(
    userId: string,
    reportId: string
  ): Promise<void> {
    try {
      const reportRef = doc(firestore, `users/${userId}/analysisReports/${reportId}`);
      
      await updateDoc(reportRef, {
        'sharing.enabled': false,
        'metadata.updatedAt': Timestamp.now(),
      });
      
      console.log('✅ 共有リンク無効化完了:', reportId);
      
    } catch (error) {
      console.error('❌ 共有リンク無効化エラー:', error);
      throw error;
    }
  }
  
  /**
   * 共有IDからレポートを取得（パスワード検証なし）
   */
  static async getSharedReport(
    shareId: string,
    password?: string
  ): Promise<ShareValidationResult> {
    try {
      // 全ユーザーの全レポートから検索（非効率だが、シンプル）
      // 本番環境では専用の共有レポートコレクションを作成すべき
      
      // TODO: より効率的な実装
      // 現時点では、共有IDをキーとした専用コレクションを作成する方が良い
      
      return {
        valid: false,
        report: null,
        error: 'この機能は実装中です。サーバーサイドAPIを使用してください。',
      };
      
    } catch (error) {
      console.error('❌ 共有レポート取得エラー:', error);
      return {
        valid: false,
        report: null,
        error: 'レポートの取得に失敗しました',
      };
    }
  }
  
  /**
   * アクセスログを記録
   */
  static async logAccess(
    userId: string,
    reportId: string,
    shareId: string,
    ipAddress?: string,
    userAgent?: string,
    viewerEmail?: string
  ): Promise<void> {
    try {
      const logsRef = collection(firestore, `users/${userId}/sharedReportLogs`);
      
      const log: Omit<SharedReportAccessLog, 'id'> = {
        shareId,
        reportId,
        accessedAt: Timestamp.now(),
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        viewerEmail: viewerEmail || null,
      };
      
      await addDoc(logsRef, log);
      
      // 閲覧回数を更新
      const reportRef = doc(firestore, `users/${userId}/analysisReports/${reportId}`);
      const reportSnap = await getDoc(reportRef);
      
      if (reportSnap.exists()) {
        const currentViewCount = reportSnap.data().sharing?.viewCount || 0;
        await updateDoc(reportRef, {
          'sharing.viewCount': currentViewCount + 1,
          'sharing.lastViewedAt': Timestamp.now(),
        });
      }
      
      console.log('✅ アクセスログ記録完了:', shareId);
      
    } catch (error) {
      console.error('❌ アクセスログ記録エラー:', error);
      // ログ記録のエラーは重要ではないので、スローしない
    }
  }
  
  /**
   * パスワード検証
   */
  static async verifyPassword(
    hashedPassword: string,
    inputPassword: string
  ): Promise<boolean> {
    try {
      return await bcrypt.compare(inputPassword, hashedPassword);
    } catch (error) {
      console.error('❌ パスワード検証エラー:', error);
      return false;
    }
  }
}





