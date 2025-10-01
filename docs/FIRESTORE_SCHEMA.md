# 🗄️ Firestore データベーススキーマ設計

## 📋 目次
1. [コレクション構造](#1-コレクション構造)
2. [ユーザーデータモデル](#2-ユーザーデータモデル)
3. [OAuth認証データ](#3-oauth認証データ)
4. [プロパティ・サイトデータ](#4-プロパティサイトデータ)
5. [分析結果データ](#5-分析結果データ)
6. [セキュリティルール](#6-セキュリティルール)

---

## 1. コレクション構造

### 📊 Firestore Collections Overview

```
📁 users/
├── {userId}/
│   ├── profile (document)
│   ├── 📁 oauthTokens/
│   │   ├── google (document)
│   │   └── microsoft (document)
│   ├── 📁 connectedProperties/
│   │   ├── ga4Properties (document)
│   │   └── gscSites (document)
│   ├── 📁 selectedTargets/
│   │   └── current (document)
│   ├── 📁 analysisResults/
│   │   ├── {analysisId} (document)
│   │   └── ...
│   └── 📁 customKPIs/
│       ├── {kpiId} (document)
│       └── ...
```

---

## 2. ユーザーデータモデル

### 👤 users/{userId}/profile

```typescript
interface UserProfile {
  // Firebase Authentication基本情報
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  
  // GrowReporter固有情報
  role: 'user' | 'admin';
  organizationId?: string;
  createdAt: Timestamp;
  lastLoginAt: Timestamp;
  
  // 設定情報
  preferences: {
    timezone: string;
    language: 'ja' | 'en';
    emailNotifications: boolean;
    dashboardLayout?: 'compact' | 'detailed';
  };
  
  // 使用統計
  usage: {
    totalAnalyses: number;
    lastAnalysisAt?: Timestamp;
    currentPlan: 'free' | 'basic' | 'premium';
  };
}
```

---

## 3. OAuth認証データ

### 🔑 users/{userId}/oauthTokens/google

```typescript
interface GoogleOAuthTokens {
  // 統合OAuth（Faro方式）
  unified: {
    accessToken: string;        // 暗号化必須
    refreshToken: string;       // 暗号化必須
    expiresAt: Timestamp;
    scope: string[];
    grantedAt: Timestamp;
  };
  
  // スコープ別権限
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
  
  // セキュリティ情報
  security: {
    encryptionKey: string;      // トークン暗号化キー
    ipAddress: string;          // 認証時のIPアドレス
    userAgent: string;          // 認証時のUser-Agent
    lastRefresh: Timestamp;
  };
}
```

### 🔑 users/{userId}/oauthTokens/microsoft

```typescript
interface MicrosoftOAuthTokens {
  // 将来のMicrosoft統合用（現在は未使用）
  clarity: {
    accessToken?: string;       // 暗号化必須
    refreshToken?: string;      // 暗号化必須
    expiresAt?: Timestamp;
    scope?: string[];
    grantedAt?: Timestamp;
  };
  
  // 認証状態
  status: 'not_connected' | 'connected' | 'expired' | 'revoked';
}
```

---

## 4. プロパティ・サイトデータ

### 📊 users/{userId}/connectedProperties/ga4Properties

```typescript
interface GA4PropertiesData {
  // メタデータ
  metadata: {
    totalCount: number;         // 全プロパティ数（146個など）
    fetchedCount: number;       // 取得済みプロパティ数（50個など）
    lastFetched: Timestamp;
    lastUpdated: Timestamp;
  };
  
  // プロパティリスト（最初の50個など）
  properties: GA4Property[];
  
  // 選択状態
  selected: {
    propertyId: string | null;
    displayName: string | null;
    selectedAt: Timestamp | null;
  };
  
  // キャッシュ情報
  cache: {
    isPartial: boolean;         // 部分的なデータかどうか
    needsFullSync: boolean;     // 完全同期が必要かどうか
    nextSyncAt: Timestamp;
  };
}

interface GA4Property {
  name: string;                 // "properties/123456789"
  displayName: string;
  createTime: string;
  updateTime: string;
  parent: string;               // "accounts/123456"
  currencyCode?: string;
  timeZone?: string;
  industryCategory?: string;
  propertyType?: string;
}
```

### 🔍 users/{userId}/connectedProperties/gscSites

```typescript
interface GSCSitesData {
  // メタデータ
  metadata: {
    totalCount: number;         // 全サイト数（47個など）
    lastFetched: Timestamp;
    lastUpdated: Timestamp;
  };
  
  // サイトリスト
  sites: GSCSite[];
  
  // 選択状態
  selected: {
    siteUrl: string | null;
    permissionLevel: string | null;
    selectedAt: Timestamp | null;
  };
}

interface GSCSite {
  siteUrl: string;
  permissionLevel: 'siteFullUser' | 'siteOwner' | 'siteRestrictedUser';
}
```

---

## 5. 分析結果データ

### 📈 users/{userId}/analysisResults/{analysisId}

```typescript
interface AnalysisResult {
  // 基本情報
  id: string;
  userId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  
  // 分析対象
  targets: {
    ga4Property: {
      propertyId: string;
      displayName: string;
    } | null;
    gscSite: {
      siteUrl: string;
    } | null;
    dateRange: {
      startDate: string;        // YYYY-MM-DD
      endDate: string;          // YYYY-MM-DD
    };
  };
  
  // 分析結果
  results: {
    ga4Data?: any;              // GA4分析結果
    gscData?: any;              // GSC分析結果
    aiInsights?: {
      summary: string;
      recommendations: string[];
      score: number;            // 0-100
      generatedAt: Timestamp;
    };
  };
  
  // 共有設定
  sharing: {
    isShared: boolean;
    shareId?: string;           // 共有用UUID
    expiresAt?: Timestamp;
    accessCount: number;
  };
  
  // ステータス
  status: 'processing' | 'completed' | 'failed' | 'shared';
}
```

---

## 6. セキュリティルール

### 🔒 Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // ユーザーデータ：自分のデータのみアクセス可能
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      // サブコレクションも同様の制限
      match /{document=**} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
    
    // 共有分析結果：共有IDでの読み取り専用アクセス
    match /users/{userId}/analysisResults/{analysisId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow read: if resource.data.sharing.isShared == true 
                    && resource.data.sharing.expiresAt > request.time;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // 管理者のみアクセス可能なコレクション
    match /admin/{document=**} {
      allow read, write: if request.auth != null 
                           && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // その他のドキュメントは拒否
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

---

## 7. 暗号化戦略

### 🔐 データ暗号化

```typescript
// トークン暗号化サービス
class TokenEncryption {
  private static readonly ALGORITHM = 'AES-256-GCM';
  
  // OAuth トークンの暗号化
  static encryptToken(token: string, userKey: string): string {
    // AES-256-GCM による暗号化
    // 実装詳細は別途セキュリティドキュメント参照
  }
  
  // OAuth トークンの復号化
  static decryptToken(encryptedToken: string, userKey: string): string {
    // 対応する復号化処理
  }
}

// Firestore保存時の暗号化例
const saveOAuthTokens = async (userId: string, tokens: GoogleOAuthTokens) => {
  const userKey = generateUserEncryptionKey(userId);
  
  const encryptedTokens = {
    ...tokens,
    unified: {
      ...tokens.unified,
      accessToken: TokenEncryption.encryptToken(tokens.unified.accessToken, userKey),
      refreshToken: TokenEncryption.encryptToken(tokens.unified.refreshToken, userKey),
    }
  };
  
  await firestore
    .collection('users')
    .doc(userId)
    .collection('oauthTokens')
    .doc('google')
    .set(encryptedTokens);
};
```

---

## 8. 移行戦略

### 🔄 LocalStorage → Firestore 移行

```typescript
// 移行サービス
class LocalStorageToFirestoreMigration {
  
  // Faro方式LocalStorageデータの移行
  static async migrateFaroData(userId: string): Promise<void> {
    try {
      // LocalStorageからデータを読み取り
      const faroData = localStorage.getItem('growreporter_faro_connections');
      if (!faroData) return;
      
      const parsedData = JSON.parse(faroData);
      
      // Firestoreに保存
      const batch = writeBatch(firestore);
      
      // プロパティデータの移行
      if (parsedData.ga4Properties) {
        const ga4PropertiesRef = doc(firestore, `users/${userId}/connectedProperties/ga4Properties`);
        batch.set(ga4PropertiesRef, {
          metadata: {
            totalCount: parsedData.totalGA4Count || parsedData.ga4Properties.length,
            fetchedCount: parsedData.ga4Properties.length,
            lastFetched: Timestamp.fromMillis(parsedData.timestamp),
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
        });
      }
      
      // GSCデータの移行
      if (parsedData.gscSites) {
        const gscSitesRef = doc(firestore, `users/${userId}/connectedProperties/gscSites`);
        batch.set(gscSitesRef, {
          metadata: {
            totalCount: parsedData.totalGSCCount || parsedData.gscSites.length,
            lastFetched: Timestamp.fromMillis(parsedData.timestamp),
            lastUpdated: Timestamp.now(),
          },
          sites: parsedData.gscSites,
          selected: {
            siteUrl: null,
            permissionLevel: null,
            selectedAt: null,
          }
        });
      }
      
      await batch.commit();
      
      // 移行完了後、LocalStorageをクリア
      localStorage.removeItem('growreporter_faro_connections');
      
      console.log('✅ LocalStorage → Firestore 移行完了');
      
    } catch (error) {
      console.error('❌ 移行エラー:', error);
      throw error;
    }
  }
}
```

---

## 9. 実装優先順位

### 📋 Phase 3 実装計画

1. **🔑 基本Firestoreセットアップ** (Week 4)
   - セキュリティルール設定
   - 基本コレクション構造作成

2. **👤 ユーザープロファイル管理** (Week 5)
   - ユーザーデータモデル実装
   - Firebase Authentication連携

3. **🔐 OAuth トークン暗号化保存** (Week 6)
   - トークン暗号化サービス実装
   - 安全なトークン管理システム

4. **📊 プロパティデータ永続化** (Week 7)
   - GA4/GSCデータのFirestore保存
   - LocalStorageからの移行機能

5. **🔄 データ同期システム** (Week 8)
   - リアルタイム同期
   - オフライン対応

**現在のLocalStorage実装は、Firestore統合までの一時的な実装として位置づけられています。**



