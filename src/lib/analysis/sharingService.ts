/**
 * 🔗 レポート共有サービス
 * レポートの共有機能を提供
 */

import { AdminFirestoreService } from '@/lib/firebase/adminFirestore';

export interface ShareConfig {
  id: string;
  userId: string;
  reportId: string;
  shareToken: string;
  expiresAt: Date;
  password?: string;
  allowedViewers?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export class SharingService {
  private static instance: SharingService;
  private firestore: AdminFirestoreService;

  constructor() {
    this.firestore = new AdminFirestoreService();
  }

  static getInstance(): SharingService {
    if (!SharingService.instance) {
      SharingService.instance = new SharingService();
    }
    return SharingService.instance;
  }

  /**
   * 共有リンクを生成
   */
  async createShareLink(
    userId: string,
    reportId: string,
    expiresInDays: number = 30,
    password?: string,
    allowedViewers?: string[]
  ): Promise<ShareConfig> {
    const shareToken = this.generateShareToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    const shareConfig: Omit<ShareConfig, 'id'> = {
      userId,
      reportId,
      shareToken,
      expiresAt,
      password,
      allowedViewers,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = await this.firestore.addDocument('shareConfigs', shareConfig);
    
    return {
      id: docRef.id,
      ...shareConfig,
    };
  }

  /**
   * 共有設定を更新
   */
  async updateShareConfig(
    shareId: string,
    updates: Partial<Pick<ShareConfig, 'expiresAt' | 'password' | 'allowedViewers'>>
  ): Promise<void> {
    await this.firestore.updateDocument('shareConfigs', shareId, {
      ...updates,
      updatedAt: new Date(),
    });
  }

  /**
   * 共有を無効化
   */
  async revokeShare(shareId: string): Promise<void> {
    await this.firestore.deleteDocument('shareConfigs', shareId);
  }

  /**
   * 共有設定を取得
   */
  async getShareConfig(shareToken: string): Promise<ShareConfig | null> {
    const configs = await this.firestore.getDocuments('shareConfigs', [
      ['shareToken', '==', shareToken],
    ]);

    if (configs.length === 0) {
      return null;
    }

    const config = configs[0];
    
    // 有効期限チェック
    if (config.expiresAt && new Date() > config.expiresAt.toDate()) {
      return null;
    }

    return {
      id: config.id,
      userId: config.userId,
      reportId: config.reportId,
      shareToken: config.shareToken,
      expiresAt: config.expiresAt.toDate(),
      password: config.password,
      allowedViewers: config.allowedViewers,
      createdAt: config.createdAt.toDate(),
      updatedAt: config.updatedAt.toDate(),
    };
  }

  /**
   * ユーザーの共有設定一覧を取得
   */
  async getUserShareConfigs(userId: string): Promise<ShareConfig[]> {
    const configs = await this.firestore.getDocuments('shareConfigs', [
      ['userId', '==', userId],
    ]);

    return configs.map(config => ({
      id: config.id,
      userId: config.userId,
      reportId: config.reportId,
      shareToken: config.shareToken,
      expiresAt: config.expiresAt.toDate(),
      password: config.password,
      allowedViewers: config.allowedViewers,
      createdAt: config.createdAt.toDate(),
      updatedAt: config.updatedAt.toDate(),
    }));
  }

  /**
   * 共有トークンを生成
   */
  private generateShareToken(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}

