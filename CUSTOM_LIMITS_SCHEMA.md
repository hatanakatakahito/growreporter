# 個別制限のカスタマイズ - データ設計

## Firestoreコレクション構造

### `customLimits` コレクション

ユーザーごとの個別制限を保存するコレクション。
プラン制限よりも優先して適用される。

```javascript
{
  // ドキュメントID = userId
  userId: string,
  
  // 個別制限の内容
  limits: {
    maxSites: number | null,              // サイト登録数上限（null = プラン標準）
    aiSummaryMonthly: number | null,      // AI分析サマリー月間上限
    aiImprovementMonthly: number | null,  // AI改善提案月間上限
  },
  
  // 適用期間
  validFrom: Timestamp,    // 適用開始日時
  validUntil: Timestamp | null,  // 適用終了日時（null = 無期限）
  
  // メタ情報
  reason: string,          // 設定理由
  setBy: string,           // 設定した管理者のUID
  setByName: string,       // 設定した管理者の名前
  createdAt: Timestamp,    // 作成日時
  updatedAt: Timestamp,    // 更新日時
  
  // ステータス
  isActive: boolean,       // 有効/無効
}
```

## 適用ルール

### 優先順位
1. **個別制限（customLimits）** - 最優先
2. プラン制限（PLANS定数） - 個別制限がない場合

### チェックロジック
```javascript
function getEffectiveLimit(userId, limitType) {
  // 1. 個別制限を確認
  const customLimit = await getCustomLimits(userId);
  
  if (customLimit && customLimit.isActive) {
    // 有効期限チェック
    const now = new Date();
    if (!customLimit.validUntil || customLimit.validUntil > now) {
      // 個別制限が設定されている場合はそれを使用
      if (customLimit.limits[limitType] !== null) {
        return customLimit.limits[limitType];
      }
    }
  }
  
  // 2. プラン制限を使用
  const user = await getUser(userId);
  return PLANS[user.plan][limitType];
}
```

## 使用例

### 例1: VIPユーザーに無制限を付与
```javascript
{
  userId: "user123",
  limits: {
    maxSites: 999999,          // 実質無制限
    aiSummaryMonthly: 999999,
    aiImprovementMonthly: 999999,
  },
  validFrom: Timestamp.now(),
  validUntil: null,  // 無期限
  reason: "VIP契約により無制限",
  setBy: "admin_uid",
  setByName: "畑中 孝仁",
  isActive: true,
}
```

### 例2: トライアル延長
```javascript
{
  userId: "user456",
  limits: {
    maxSites: 3,
    aiSummaryMonthly: 100,
    aiImprovementMonthly: 20,
  },
  validFrom: Timestamp.now(),
  validUntil: Timestamp.fromDate(new Date('2025-12-31')),  // 年末まで
  reason: "トライアル延長",
  setBy: "admin_uid",
  setByName: "畑中 孝仁",
  isActive: true,
}
```

### 例3: テストユーザー
```javascript
{
  userId: "test_user",
  limits: {
    maxSites: 999999,
    aiSummaryMonthly: 999999,
    aiImprovementMonthly: 999999,
  },
  validFrom: Timestamp.now(),
  validUntil: null,
  reason: "開発・検証用アカウント",
  setBy: "admin_uid",
  setByName: "畑中 孝仁",
  isActive: true,
}
```

## Firestore Indexes

### 複合インデックス
```json
{
  "collectionGroup": "customLimits",
  "queryScope": "COLLECTION",
  "fields": [
    {
      "fieldPath": "isActive",
      "order": "ASCENDING"
    },
    {
      "fieldPath": "validUntil",
      "order": "ASCENDING"
    }
  ]
}
```

## Firestore Rules

```javascript
match /customLimits/{userId} {
  // 管理者のみ読み書き可能
  allow read, write: if request.auth != null && 
    exists(/databases/$(database)/documents/adminUsers/$(request.auth.uid)) &&
    get(/databases/$(database)/documents/adminUsers/$(request.auth.uid)).data.role in ['admin', 'editor'];
  
  // Cloud Functions からの書き込み
  allow write: if request.auth != null;
}
```

## 実装メモ

### 注意点
1. **有効期限の自動無効化**
   - Scheduled Functionで毎日チェック（オプション）
   - または、チェック時にリアルタイムで判定

2. **履歴管理**
   - 変更履歴は`adminActivityLogs`に記録
   - 過去の設定値は保持しない（シンプル化）

3. **パフォーマンス**
   - `getCustomLimits`を頻繁に呼ぶため、キャッシュ推奨
   - または、`users`コレクションに`hasCustomLimits: boolean`フラグを追加

4. **UI/UX**
   - nullと0の区別に注意
   - null = プラン標準、0 = 使用不可、-1 = 無制限

