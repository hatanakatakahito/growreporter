/**
 * Server-side Firestore operations using Client SDK
 * 開発環境用：クライアントSDKでサーバーサイド操作
 */

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { 
  doc, 
  getDoc,
  setDoc, 
  deleteDoc,
  collection,
  Timestamp
} from 'firebase/firestore';
import { encryptTokens, decryptTokens, isEncrypted, type EncryptedTokens } from '@/lib/security/encryption';

// Firebase Client SDK の初期化（サーバーサイド用）
function initializeServerFirebase() {
  const existingApp = getApps().find(app => app.name === 'server-firestore');
  if (existingApp) {
    return existingApp;
  }

  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: "1014499109379",
    appId: "1:1014499109379:web:9ad3d2d680ae363110fc36"
  };
  
  const app = initializeApp(firebaseConfig, 'server-firestore');
  return app;
}

// Server Firestore インスタンス
const serverApp = initializeServerFirebase();
export const serverFirestore = getFirestore(serverApp, 'ggreporter');

// 型定義
export interface GA4Property {
  name: string;
  displayName: string;
  createTime: string;
  updateTime: string;
  parent: string;
  currencyCode?: string;
  timeZone?: string;
  industryCategory?: string;
  propertyType?: string;
}

export interface GSCSite {
  siteUrl: string;
  permissionLevel: string;
}

/**
 * サーバーサイド用 Firestore サービス
 */
export class AdminFirestoreService {
  /**
   * OAuth トークンを保存
   */
  static async saveOAuthTokens(
    userId: string,
    tokens: {
      accessToken: string;
      refreshToken: string | undefined;
      expiresIn: number;
      scope: string[];
    },
    scopeValidation: { hasGA4: boolean; hasGSC: boolean; hasProfile: boolean },
    clientInfo: { ipAddress: string; userAgent: string }
  ) {
    try {
      console.log('🔧 Server Firestore OAuth トークン保存開始:', { userId, hasTokens: !!tokens.accessToken });
      
      const oauthTokensRef = doc(serverFirestore, 'users', userId, 'oauthTokens', 'google');
      
      // 🔐 トークンを暗号化
      const expiresAt = Date.now() + (tokens.expiresIn * 1000);
      const encryptedTokens = encryptTokens({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken || '',
        expiresAt: expiresAt,
      });
      
      console.log('✅ トークン暗号化完了（保存前）');
      
      await setDoc(oauthTokensRef, {
        unified: {
          accessToken: encryptedTokens.accessToken, // 🔐 暗号化済み
          refreshToken: encryptedTokens.refreshToken, // 🔐 暗号化済み
          expiresAt: new Date(expiresAt),
          scope: tokens.scope,
          grantedAt: new Date(),
          encrypted: true, // 暗号化フラグ
        },
        permissions: {
          ga4: { granted: scopeValidation.hasGA4, scope: [], lastVerified: new Date() },
          gsc: { granted: scopeValidation.hasGSC, scope: [], lastVerified: new Date() },
          profile: { granted: scopeValidation.hasProfile, scope: [], lastVerified: new Date() },
        },
        security: {
          encrypted: true, // 暗号化済み
          encryptionAlgorithm: 'AES-256-GCM',
          ipAddress: clientInfo.ipAddress,
          userAgent: clientInfo.userAgent,
          lastRefresh: new Date(),
        },
      }, { merge: true });
      
      console.log('✅ Server Firestore OAuth トークン保存完了');
    } catch (error) {
      console.error('❌ Server Firestore OAuth トークン保存エラー:', error);
      throw error;
    }
  }

  /**
   * GA4 プロパティを保存
   */
  static async saveGA4Properties(userId: string, properties: GA4Property[]) {
    try {
      console.log('🔧 Server Firestore GA4プロパティ保存開始:', { userId, count: properties.length });
      
      const connectedPropertiesRef = doc(serverFirestore, 'users', userId, 'connectedProperties', 'ga4Properties');
      
      await setDoc(connectedPropertiesRef, {
        metadata: {
          totalCount: properties.length,
          lastFetched: Timestamp.now(),
          lastUpdated: Timestamp.now(),
        },
        properties: properties,
        cache: {
          isPartial: false,
          nextPageToken: null,
          cachedAt: Timestamp.now(),
        },
        selected: {
          propertyId: null,
          displayName: null,
          selectedAt: null,
        },
      });
      
      console.log('✅ Server Firestore GA4プロパティ保存完了');
    } catch (error) {
      console.error('❌ Server Firestore GA4プロパティ保存エラー:', error);
      throw error;
    }
  }

  /**
   * GSC サイトを保存
   */
  static async saveGSCSites(userId: string, sites: GSCSite[]) {
    try {
      console.log('🔧 Server Firestore GSCサイト保存開始:', { userId, count: sites.length });
      
      const connectedPropertiesRef = doc(serverFirestore, 'users', userId, 'connectedProperties', 'gscSites');
      
      await setDoc(connectedPropertiesRef, {
        metadata: {
          totalCount: sites.length,
          lastFetched: Timestamp.now(),
          lastUpdated: Timestamp.now(),
        },
        sites: sites,
        selected: {
          siteUrl: null,
          permissionLevel: null,
          selectedAt: null,
        },
      });
      
      console.log('✅ Server Firestore GSCサイト保存完了');
    } catch (error) {
      console.error('❌ Server Firestore GSCサイト保存エラー:', error);
      throw error;
    }
  }

  /**
   * アクセストークンを更新（リフレッシュトークン使用）
   */
  static async updateAccessToken(
    userId: string,
    provider: string,
    newAccessToken: string,
    newExpiresAt: number
  ): Promise<void> {
    try {
      console.log('🔧 Server Firestore アクセストークン更新開始:', { userId, provider });
      
      const oauthTokensRef = doc(serverFirestore, 'users', userId, 'oauthTokens', provider);
      
      // 既存のトークン情報を取得
      const { getDoc } = await import('firebase/firestore');
      const snapshot = await getDoc(oauthTokensRef);
      
      if (!snapshot.exists()) {
        throw new Error('既存のトークン情報が見つかりません');
      }
      
      const existingData = snapshot.data();
      let existingRefreshToken = '';
      
      // 既存のリフレッシュトークンを取得
      if (existingData.unified?.encrypted && existingData.unified?.refreshToken) {
        const decrypted = decryptTokens(existingData.unified as any);
        existingRefreshToken = decrypted.refreshToken;
      } else if (existingData.unified?.refreshToken) {
        existingRefreshToken = existingData.unified.refreshToken;
      }
      
      // 🔐 新しいアクセストークンとリフレッシュトークンを暗号化
      const encryptedTokens = encryptTokens({
        accessToken: newAccessToken,
        refreshToken: existingRefreshToken,
        expiresAt: newExpiresAt,
      });
      
      console.log('✅ アクセストークン暗号化完了（更新）');
      
      await setDoc(oauthTokensRef, {
        unified: {
          accessToken: encryptedTokens.accessToken, // 🔐 暗号化済み
          refreshToken: encryptedTokens.refreshToken, // 🔐 暗号化済み（既存を保持）
          expiresAt: newExpiresAt,
          encrypted: true, // 暗号化フラグ
          encryptionAlgorithm: 'AES-256-GCM',
        },
        security: {
          lastRefresh: new Date(),
        },
      }, { merge: true });
      
      console.log('✅ Server Firestore アクセストークン更新完了');
    } catch (error) {
      console.error('❌ Server Firestore アクセストークン更新エラー:', error);
      throw error;
    }
  }

  /**
   * OAuth トークンを取得（暗号化されたまま）
   */
  static async getOAuthTokens(userId: string, provider: string = 'google') {
    try {
      const oauthTokensRef = doc(serverFirestore, 'users', userId, 'oauthTokens', provider);
      const snapshot = await getDoc(oauthTokensRef);
      
      if (!snapshot.exists()) {
        return null;
      }
      
      return snapshot.data();
    } catch (error) {
      console.error('❌ Server Firestore OAuthトークン取得エラー:', error);
      throw error;
    }
  }

  /**
   * GA4 プロパティを取得
   */
  static async getGA4Properties(userId: string): Promise<GA4Property[]> {
    try {
      const { getDoc } = await import('firebase/firestore');
      const ga4PropertiesRef = doc(serverFirestore, 'users', userId, 'connectedProperties', 'ga4Properties');
      const snapshot = await getDoc(ga4PropertiesRef);
      
      if (!snapshot.exists()) {
        return [];
      }
      
      const data = snapshot.data();
      return data.properties || [];
    } catch (error) {
      console.error('❌ Server Firestore GA4プロパティ取得エラー:', error);
      return [];
    }
  }

  /**
   * GSC サイトを取得
   */
  static async getGSCSites(userId: string): Promise<GSCSite[]> {
    try {
      const { getDoc } = await import('firebase/firestore');
      const gscSitesRef = doc(serverFirestore, 'users', userId, 'connectedProperties', 'gscSites');
      const snapshot = await getDoc(gscSitesRef);
      
      if (!snapshot.exists()) {
        return [];
      }
      
      const data = snapshot.data();
      return data.sites || [];
    } catch (error) {
      console.error('❌ Server Firestore GSCサイト取得エラー:', error);
      return [];
    }
  }

  /**
   * ユーザーのOAuthデータをクリア
   */
  static async clearUserOAuthData(userId: string) {
    try {
      console.log('🔧 Server Firestore ユーザーOAuthデータクリア開始:', { userId });
      
      // OAuth トークンを削除
      const oauthTokensRef = doc(serverFirestore, 'users', userId, 'oauthTokens', 'google');
      await deleteDoc(oauthTokensRef);
      
      // 接続プロパティを削除
      const ga4PropertiesRef = doc(serverFirestore, 'users', userId, 'connectedProperties', 'ga4Properties');
      const gscSitesRef = doc(serverFirestore, 'users', userId, 'connectedProperties', 'gscSites');
      await deleteDoc(ga4PropertiesRef);
      await deleteDoc(gscSitesRef);
      
      console.log('✅ Server Firestore ユーザーOAuthデータクリア完了');
    } catch (error) {
      console.error('❌ Server Firestore ユーザーOAuthデータクリアエラー:', error);
      // ドキュメントが存在しない場合はエラーを無視
      if ((error as any)?.code !== 'not-found') {
        throw error;
      }
    }
  }
}
