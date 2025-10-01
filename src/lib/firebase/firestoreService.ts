import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  deleteDoc,
  collection,
  writeBatch,
  Timestamp,
  onSnapshot,
  DocumentSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { firestore } from './config';

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
  permissionLevel: 'siteFullUser' | 'siteOwner' | 'siteRestrictedUser';
}

export interface GA4PropertiesData {
  metadata: {
    totalCount: number;
    fetchedCount: number;
    lastFetched: Timestamp;
    lastUpdated: Timestamp;
  };
  properties: GA4Property[];
  selected: {
    propertyId: string | null;
    displayName: string | null;
    selectedAt: Timestamp | null;
  };
  cache: {
    isPartial: boolean;
    needsFullSync: boolean;
    nextSyncAt: Timestamp;
  };
}

export interface GSCSitesData {
  metadata: {
    totalCount: number;
    lastFetched: Timestamp;
    lastUpdated: Timestamp;
  };
  sites: GSCSite[];
  selected: {
    siteUrl: string | null;
    permissionLevel: string | null;
    selectedAt: Timestamp | null;
  };
}

export interface GoogleOAuthTokens {
  unified: {
    accessToken: string;
    refreshToken: string;
    expiresAt: Timestamp;
    scope: string[];
    grantedAt: Timestamp;
  };
  permissions: {
    ga4: {
      granted: boolean;
      scope: string[];
      lastVerified: Timestamp;
    };
    gsc: {
      granted: boolean;
      scope: string[];
      lastVerified: Timestamp;
    };
    profile: {
      granted: boolean;
      scope: string[];
      lastVerified: Timestamp;
    };
  };
  security: {
    encryptionKey: string;
    ipAddress: string;
    userAgent: string;
    lastRefresh: Timestamp;
  };
}

/**
 * 🔥 Firestore データ管理サービス
 * OAuth成功後のデータ永続化とリアルタイム同期を提供
 */
export class FirestoreService {
  
  /**
   * 🔑 OAuth トークンをFirestoreに保存
   */
  static async saveOAuthTokens(
    userId: string, 
    tokens: {
      accessToken: string;
      refreshToken: string | undefined;
      expiresIn: number;
      scope: string[];
    },
    permissions: {
      hasGA4: boolean;
      hasGSC: boolean;
      hasProfile: boolean;
    },
    clientInfo: {
      ipAddress: string;
      userAgent: string;
    }
  ): Promise<void> {
    try {
      console.log('🔧 Firestore OAuth トークン保存開始:', { userId, hasTokens: !!tokens.accessToken });
      
      // TODO: 本格実装時は暗号化を追加
      const encryptionKey = `temp_key_${userId}_${Date.now()}`;
      
      const oauthData: GoogleOAuthTokens = {
        unified: {
          accessToken: tokens.accessToken, // TODO: 暗号化
          refreshToken: tokens.refreshToken || '', // TODO: 暗号化
          expiresAt: Timestamp.fromMillis(Date.now() + (tokens.expiresIn * 1000)),
          scope: tokens.scope,
          grantedAt: Timestamp.now(),
        },
        permissions: {
          ga4: {
            granted: permissions.hasGA4,
            scope: tokens.scope.filter(s => s.includes('analytics')),
            lastVerified: Timestamp.now(),
          },
          gsc: {
            granted: permissions.hasGSC,
            scope: tokens.scope.filter(s => s.includes('webmasters')),
            lastVerified: Timestamp.now(),
          },
          profile: {
            granted: permissions.hasProfile,
            scope: tokens.scope.filter(s => s.includes('userinfo') || s.includes('openid')),
            lastVerified: Timestamp.now(),
          },
        },
        security: {
          encryptionKey,
          ipAddress: clientInfo.ipAddress,
          userAgent: clientInfo.userAgent,
          lastRefresh: Timestamp.now(),
        },
      };

      const tokenRef = doc(firestore, `users/${userId}/oauthTokens/google`);
      await setDoc(tokenRef, oauthData);
      
      console.log('✅ Firestore OAuth トークン保存完了');
    } catch (error) {
      console.error('❌ Firestore OAuth トークン保存エラー:', error);
      throw error;
    }
  }

  /**
   * 🔄 アクセストークンを更新（リフレッシュトークン使用）
   */
  static async updateAccessToken(
    userId: string,
    newAccessToken: string,
    expiresIn: number
  ): Promise<void> {
    try {
      console.log('🔧 Firestore アクセストークン更新開始:', { userId });
      
      const oauthRef = doc(firestore, `users/${userId}/oauthTokens/google`);
      
      await setDoc(oauthRef, {
        unified: {
          accessToken: newAccessToken, // TODO: 暗号化
          expiresAt: Timestamp.fromMillis(Date.now() + (expiresIn * 1000)),
        },
        security: {
          lastRefresh: Timestamp.now(),
        },
      }, { merge: true });
      
      console.log('✅ Firestore アクセストークン更新完了');
    } catch (error) {
      console.error('❌ Firestore アクセストークン更新エラー:', error);
      throw error;
    }
  }

  /**
   * 📊 GA4プロパティデータをFirestoreに保存
   */
  static async saveGA4Properties(
    userId: string,
    properties: GA4Property[],
    selectedPropertyId?: string | number
  ): Promise<void> {
    try {
      // selectedPropertyIdが数値の場合は、totalCountとして扱う（後方互換性）
      const totalCount = typeof selectedPropertyId === 'number' ? selectedPropertyId : properties.length;
      const actualSelectedId = typeof selectedPropertyId === 'string' ? selectedPropertyId : null;
      
      console.log('🔧 Firestore GA4プロパティ保存開始:', { 
        userId, 
        count: properties.length, 
        total: totalCount,
        selectedId: actualSelectedId 
      });
      
      // 選択されたプロパティ情報
      const selectedProperty = actualSelectedId 
        ? properties.find(p => p.name === actualSelectedId)
        : null;
      
      const ga4Data: GA4PropertiesData = {
        metadata: {
          totalCount,
          fetchedCount: properties.length,
          lastFetched: Timestamp.now(),
          lastUpdated: Timestamp.now(),
        },
        properties,
        selected: {
          propertyId: actualSelectedId,
          displayName: selectedProperty?.displayName || null,
          selectedAt: actualSelectedId ? Timestamp.now() : null,
        },
        cache: {
          isPartial: properties.length < totalCount,
          needsFullSync: properties.length < totalCount,
          nextSyncAt: Timestamp.now(),
        },
      };

      const ga4Ref = doc(firestore, `users/${userId}/connectedProperties/ga4Properties`);
      await setDoc(ga4Ref, ga4Data);
      
      console.log('✅ Firestore GA4プロパティ保存完了');
    } catch (error) {
      console.error('❌ Firestore GA4プロパティ保存エラー:', error);
      throw error;
    }
  }

  /**
   * 🔍 GSCサイトデータをFirestoreに保存
   */
  static async saveGSCSites(
    userId: string,
    sites: GSCSite[],
    selectedSiteUrl?: string
  ): Promise<void> {
    try {
      console.log('🔧 Firestore GSCサイト保存開始:', { 
        userId, 
        count: sites.length,
        selectedUrl: selectedSiteUrl 
      });
      
      // 選択されたサイト情報
      const selectedSite = selectedSiteUrl 
        ? sites.find(s => s.siteUrl === selectedSiteUrl)
        : null;
      
      const gscData: GSCSitesData = {
        metadata: {
          totalCount: sites.length,
          lastFetched: Timestamp.now(),
          lastUpdated: Timestamp.now(),
        },
        sites,
        selected: {
          siteUrl: selectedSiteUrl || null,
          permissionLevel: selectedSite?.permissionLevel || null,
          selectedAt: selectedSiteUrl ? Timestamp.now() : null,
        },
      };

      const gscRef = doc(firestore, `users/${userId}/connectedProperties/gscSites`);
      await setDoc(gscRef, gscData);
      
      console.log('✅ Firestore GSCサイト保存完了');
    } catch (error) {
      console.error('❌ Firestore GSCサイト保存エラー:', error);
      throw error;
    }
  }

  /**
   * 📖 GA4プロパティデータをFirestoreから読み取り
   */
  static async getGA4Properties(userId: string): Promise<GA4PropertiesData | null> {
    try {
      const ga4Ref = doc(firestore, `users/${userId}/connectedProperties/ga4Properties`);
      const ga4Snapshot = await getDoc(ga4Ref);
      
      if (ga4Snapshot.exists()) {
        return ga4Snapshot.data() as GA4PropertiesData;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Firestore GA4プロパティ読み取りエラー:', error);
      throw error;
    }
  }

  /**
   * 📖 GSCサイトデータをFirestoreから読み取り
   */
  static async getGSCSites(userId: string): Promise<GSCSitesData | null> {
    try {
      const gscRef = doc(firestore, `users/${userId}/connectedProperties/gscSites`);
      const gscSnapshot = await getDoc(gscRef);
      
      if (gscSnapshot.exists()) {
        return gscSnapshot.data() as GSCSitesData;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Firestore GSCサイト読み取りエラー:', error);
      throw error;
    }
  }

  /**
   * 🔑 OAuthトークンをFirestoreから取得
   */
  static async getOAuthTokens(userId: string): Promise<GoogleOAuthTokens | null> {
    try {
      const oauthRef = doc(firestore, `users/${userId}/oauthTokens/google`);
      const oauthSnapshot = await getDoc(oauthRef);
      
      if (oauthSnapshot.exists()) {
        return oauthSnapshot.data() as GoogleOAuthTokens;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Firestore OAuthトークン読み取りエラー:', error);
      throw error;
    }
  }

  /**
   * 🔄 GA4プロパティデータのリアルタイム監視
   */
  static subscribeToGA4Properties(
    userId: string,
    callback: (data: GA4PropertiesData | null) => void
  ): Unsubscribe {
    const ga4Ref = doc(firestore, `users/${userId}/connectedProperties/ga4Properties`);
    
    return onSnapshot(ga4Ref, (snapshot: DocumentSnapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data() as GA4PropertiesData);
      } else {
        callback(null);
      }
    }, (error) => {
      console.error('❌ GA4プロパティリアルタイム監視エラー:', error);
      callback(null);
    });
  }

  /**
   * 🔄 GSCサイトデータのリアルタイム監視
   */
  static subscribeToGSCSites(
    userId: string,
    callback: (data: GSCSitesData | null) => void
  ): Unsubscribe {
    const gscRef = doc(firestore, `users/${userId}/connectedProperties/gscSites`);
    
    return onSnapshot(gscRef, (snapshot: DocumentSnapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data() as GSCSitesData);
      } else {
        callback(null);
      }
    }, (error) => {
      console.error('❌ GSCサイトリアルタイム監視エラー:', error);
      callback(null);
    });
  }

  /**
   * 🗑️ ユーザーのOAuth接続データを削除
   */
  static async clearUserOAuthData(userId: string): Promise<void> {
    try {
      console.log('🔧 Firestore OAuth データクリア開始:', { userId });
      
      const batch = writeBatch(firestore);
      
      // OAuthトークンを削除
      const tokenRef = doc(firestore, `users/${userId}/oauthTokens/google`);
      batch.delete(tokenRef);
      
      // GA4プロパティデータを削除
      const ga4Ref = doc(firestore, `users/${userId}/connectedProperties/ga4Properties`);
      batch.delete(ga4Ref);
      
      // GSCサイトデータを削除
      const gscRef = doc(firestore, `users/${userId}/connectedProperties/gscSites`);
      batch.delete(gscRef);
      
      await batch.commit();
      
      console.log('✅ Firestore OAuth データクリア完了');
    } catch (error) {
      console.error('❌ Firestore OAuth データクリアエラー:', error);
      throw error;
    }
  }

  /**
   * 🔄 LocalStorageからFirestoreへの移行
   */
  static async migrateFaroDataFromLocalStorage(userId: string): Promise<boolean> {
    try {
      console.log('🔧 Faro LocalStorage → Firestore 移行開始:', { userId });
      
      // LocalStorageからデータを読み取り
      const faroData = localStorage.getItem('growreporter_faro_connections');
      if (!faroData) {
        console.log('📝 移行対象のLocalStorageデータが見つかりません');
        return false;
      }
      
      const parsedData = JSON.parse(faroData);
      console.log('🔧 移行データ確認:', {
        isConnected: parsedData.isUnifiedConnected,
        ga4Count: parsedData.ga4Properties?.length || 0,
        gscCount: parsedData.gscSites?.length || 0
      });
      
      if (!parsedData.isUnifiedConnected) {
        console.log('📝 接続状態ではないため移行をスキップ');
        return false;
      }
      
      const batch = writeBatch(firestore);
      
      // GA4プロパティデータの移行
      if (parsedData.ga4Properties && parsedData.ga4Properties.length > 0) {
        const ga4Data: GA4PropertiesData = {
          metadata: {
            totalCount: parsedData.totalGA4Count || parsedData.ga4Properties.length,
            fetchedCount: parsedData.ga4Properties.length,
            lastFetched: Timestamp.fromMillis(parsedData.timestamp || Date.now()),
            lastUpdated: Timestamp.now(),
          },
          properties: parsedData.ga4Properties,
          selected: {
            propertyId: null,
            displayName: null,
            selectedAt: null,
          },
          cache: {
            isPartial: parsedData.ga4Properties.length < (parsedData.totalGA4Count || 0),
            needsFullSync: true,
            nextSyncAt: Timestamp.now(),
          }
        };
        
        const ga4Ref = doc(firestore, `users/${userId}/connectedProperties/ga4Properties`);
        batch.set(ga4Ref, ga4Data);
      }
      
      // GSCサイトデータの移行
      if (parsedData.gscSites && parsedData.gscSites.length > 0) {
        const gscData: GSCSitesData = {
          metadata: {
            totalCount: parsedData.totalGSCCount || parsedData.gscSites.length,
            lastFetched: Timestamp.fromMillis(parsedData.timestamp || Date.now()),
            lastUpdated: Timestamp.now(),
          },
          sites: parsedData.gscSites,
          selected: {
            siteUrl: null,
            permissionLevel: null,
            selectedAt: null,
          }
        };
        
        const gscRef = doc(firestore, `users/${userId}/connectedProperties/gscSites`);
        batch.set(gscRef, gscData);
      }
      
      await batch.commit();
      
      // 移行完了後、LocalStorageをクリア
      localStorage.removeItem('growreporter_faro_connections');
      
      console.log('✅ Faro LocalStorage → Firestore 移行完了');
      return true;
      
    } catch (error) {
      console.error('❌ Faro移行エラー:', error);
      throw error;
    }
  }
}
