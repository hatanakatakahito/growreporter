/**
 * Server-side Firestore operations using Client SDK
 * 開発環境用：クライアントSDKでサーバーサイド操作
 */

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { 
  doc, 
  setDoc, 
  deleteDoc,
  collection,
  Timestamp
} from 'firebase/firestore';

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
      
      await setDoc(oauthTokensRef, {
        unified: {
          accessToken: tokens.accessToken, // TODO: 暗号化
          refreshToken: tokens.refreshToken || '', // TODO: 暗号化
          expiresAt: new Date(Date.now() + (tokens.expiresIn * 1000)),
          scope: tokens.scope,
          grantedAt: new Date(),
        },
        permissions: {
          ga4: { granted: scopeValidation.hasGA4, scope: [], lastVerified: new Date() },
          gsc: { granted: scopeValidation.hasGSC, scope: [], lastVerified: new Date() },
          profile: { granted: scopeValidation.hasProfile, scope: [], lastVerified: new Date() },
        },
        security: {
          // encryptionKey: 'TODO: Implement encryption key management', // 暗号化は別途実装
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
    newAccessToken: string,
    expiresIn: number
  ): Promise<void> {
    try {
      console.log('🔧 Server Firestore アクセストークン更新開始:', { userId });
      
      const oauthTokensRef = doc(serverFirestore, 'users', userId, 'oauthTokens', 'google');
      
      await setDoc(oauthTokensRef, {
        unified: {
          accessToken: newAccessToken, // TODO: 暗号化
          expiresAt: new Date(Date.now() + (expiresIn * 1000)),
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
