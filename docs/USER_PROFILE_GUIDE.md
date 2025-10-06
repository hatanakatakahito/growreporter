# 👤 ユーザープロファイル管理ガイド

## 概要

GrowReporterのユーザープロファイル管理システムは、ユーザーの基本情報、設定、権限、サブスクリプション情報を一元管理します。

---

## Firestoreスキーマ

### コレクション構造

```
users/{userId}/
  ├── profile/
  │   └── data (document)         # ユーザープロファイル本体
  ├── stats/
  │   └── summary (document)      # ユーザー統計情報
  ├── activityLogs/              # アクティビティログ (collection)
  │   └── {logId} (document)
  ├── oauthTokens/               # OAuth トークン
  ├── connectedProperties/       # 接続済みプロパティ
  └── customKPIs/                # カスタムKPI
```

---

## ユーザープロファイル (profile/data)

### データ構造

```typescript
{
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  
  profile: {
    firstName: string | null;
    lastName: string | null;
    company: string | null;
    position: string | null;
    phoneNumber: string | null;
    timezone: string;              // デフォルト: 'Asia/Tokyo'
    language: string;              // デフォルト: 'ja'
  };
  
  preferences: {
    theme: 'light' | 'dark' | 'auto';
    emailNotifications: boolean;
    browserNotifications: boolean;
    defaultDateRange: '7days' | '30days' | '90days' | 'custom';
    weekStartsOn: 0 | 1;           // 0: Sunday, 1: Monday
  };
  
  roles: {
    isAdmin: boolean;
    isEditor: boolean;
    isViewer: boolean;
  };
  
  subscription: {
    plan: 'free' | 'pro' | 'enterprise';
    status: 'active' | 'inactive' | 'cancelled' | 'trial';
    startDate: Timestamp | null;
    endDate: Timestamp | null;
    features: string[];
  };
  
  usage: {
    apiCallsThisMonth: number;
    storageUsedMB: number;
    lastLogin: Timestamp;
    loginCount: number;
  };
  
  metadata: {
    createdAt: Timestamp;
    updatedAt: Timestamp;
    emailVerified: boolean;
    onboardingCompleted: boolean;
    termsAcceptedAt: Timestamp | null;
    privacyPolicyAcceptedAt: Timestamp | null;
  };
}
```

---

## API使用例

### プロファイル作成（自動）

ユーザーが初めてログインすると、`authContext.tsx`が自動的にプロファイルを作成します。

```typescript
// 自動実行（authContext.tsx内）
await UserProfileService.createUserProfile({
  uid: user.uid,
  email: user.email,
  displayName: user.displayName,
  photoURL: user.photoURL,
});
```

---

### プロファイル取得

```typescript
import { UserProfileService } from '@/lib/user/userProfileService';

const profile = await UserProfileService.getUserProfile(userId);

if (profile) {
  console.log('ユーザー名:', profile.displayName);
  console.log('会社名:', profile.profile.company);
  console.log('言語:', profile.profile.language);
}
```

---

### プロファイル更新

```typescript
await UserProfileService.updateUserProfile(userId, {
  displayName: '山田 太郎',
  profile: {
    firstName: '太郎',
    lastName: '山田',
    company: '株式会社サンプル',
    position: 'マーケティングマネージャー',
    phoneNumber: '090-1234-5678',
    timezone: 'Asia/Tokyo',
    language: 'ja',
  },
  preferences: {
    theme: 'dark',
    emailNotifications: true,
    browserNotifications: false,
    defaultDateRange: '30days',
    weekStartsOn: 1,
  },
});
```

---

### リアルタイム監視

```typescript
const unsubscribe = UserProfileService.subscribeToUserProfile(
  userId,
  (profile) => {
    if (profile) {
      console.log('プロファイル更新:', profile);
      // UIを更新
    }
  }
);

// クリーンアップ
return () => unsubscribe();
```

---

### ユーザー統計取得

```typescript
const stats = await UserProfileService.getUserStats(userId);

console.log('総KPI数:', stats.totalKPIs);
console.log('達成KPI数:', stats.achievedKPIs);
console.log('接続済みGA4プロパティ:', stats.ga4PropertiesConnected);
```

---

### アクティビティログ記録

```typescript
await UserProfileService.logActivity(
  userId,
  'kpi_created',
  'kpi',
  { kpiName: '月間セッション数', targetValue: 10000 },
  '192.168.1.1',
  'Mozilla/5.0...'
);
```

---

## サブスクリプションプラン

### Free プラン
- **料金**: ¥0/月
- **機能**:
  - 基本アナリティクス
  - KPI管理（最大5個）
  - 月次レポート

### Pro プラン
- **料金**: ¥2,980/月
- **機能**:
  - 高度なアナリティクス
  - 無制限KPI
  - AI分析
  - カスタムレポート
  - API アクセス
  - 優先サポート

### Enterprise プラン
- **料金**: ¥9,800/月
- **機能**:
  - Proプランの全機能
  - カスタム統合
  - 専任サポート
  - SLA保証
  - チーム管理
  - ホワイトラベル

---

## Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      // プロファイル
      match /profile/data {
        allow read: if request.auth != null && request.auth.uid == userId;
        allow write: if request.auth != null && request.auth.uid == userId;
      }
      
      // 統計
      match /stats/summary {
        allow read: if request.auth != null && request.auth.uid == userId;
        allow write: if request.auth != null && request.auth.uid == userId;
      }
      
      // アクティビティログ
      match /activityLogs/{logId} {
        allow read: if request.auth != null && request.auth.uid == userId;
        allow create: if request.auth != null && request.auth.uid == userId;
        allow update, delete: if false; // ログは変更・削除不可
      }
    }
  }
}
```

---

## UI実装例

### プロファイル編集フォーム

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/authContext';
import { UserProfileService } from '@/lib/user/userProfileService';
import { UserProfile } from '@/types/user';

export default function ProfileEditPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (!user) return;
    
    const unsubscribe = UserProfileService.subscribeToUserProfile(
      user.uid,
      (updatedProfile) => {
        setProfile(updatedProfile);
        setLoading(false);
      }
    );
    
    return () => unsubscribe();
  }, [user]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;
    
    try {
      await UserProfileService.updateUserProfile(user.uid, {
        displayName: profile.displayName || '',
        profile: profile.profile,
        preferences: profile.preferences,
      });
      
      alert('プロファイルを更新しました！');
    } catch (error) {
      console.error(error);
      alert('更新に失敗しました');
    }
  };
  
  if (loading) return <div>読み込み中...</div>;
  if (!profile) return <div>プロファイルが見つかりません</div>;
  
  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={profile.displayName || ''}
        onChange={(e) => setProfile({
          ...profile,
          displayName: e.target.value
        })}
        placeholder="表示名"
      />
      
      {/* ... 他のフィールド ... */}
      
      <button type="submit">保存</button>
    </form>
  );
}
```

---

## トラブルシューティング

### エラー: "プロファイルが見つかりません"

**原因**: ユーザーが初回ログイン時にプロファイルが作成されていない

**解決策**:
1. `authContext.tsx`でプロファイル作成処理が実行されているか確認
2. 手動でプロファイルを作成:
   ```typescript
   await UserProfileService.createUserProfile({
     uid: user.uid,
     email: user.email,
   });
   ```

---

### プロファイル更新が反映されない

**原因**: Firestoreのリアルタイム監視が設定されていない

**解決策**:
- `subscribeToUserProfile()`を使用してリアルタイム監視を設定
- コンポーネントのクリーンアップで`unsubscribe()`を呼び出す

---

## 次のステップ

1. **プロファイル編集UIの実装** (`/settings/profile`)
2. **サブスクリプション管理機能**
3. **アクティビティログビューア**
4. **チーム管理機能** (Enterprise プラン)

---

## 参考資料

- [Firestoreデータモデリングベストプラクティス](https://firebase.google.com/docs/firestore/data-model)
- [Firebase Authentication](https://firebase.google.com/docs/auth)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)





