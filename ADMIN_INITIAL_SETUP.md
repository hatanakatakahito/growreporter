# アドミン画面 初期セットアップ手順

## 📋 初期管理者の設定

アドミン画面にアクセスするには、Firestoreに管理者情報を登録する必要があります。

### Step 1: Firebase Consoleにアクセス

1. https://console.firebase.google.com/ を開く
2. `growgroupreporter` プロジェクトを選択
3. 左メニューから「Firestore Database」をクリック

### Step 2: adminUsersコレクションを作成

1. 「コレクションを開始」をクリック（初回の場合）
2. コレクションID: `adminUsers` と入力
3. 「次へ」をクリック

### Step 3: 管理者ドキュメントを追加

#### ドキュメントID
```
MmvJRYa8GTafpodTY5YcOBTKEjS2
```
※これは畑中様のUID（現在ログイン中のユーザーID）です

#### フィールド

| フィールド名 | 型 | 値 |
|-------------|---|---|
| adminId | string | `MmvJRYa8GTafpodTY5YcOBTKEjS2` |
| email | string | `hatanaka@grow-group.jp` |
| displayName | string | `畑中 孝仁` |
| role | string | `admin` |
| createdAt | timestamp | （現在日時を選択） |
| lastLoginAt | timestamp | `null` |

#### role の種類
- **`admin`**: すべての操作が可能（推奨）
- **`editor`**: ユーザー管理とプラン変更が可能
- **`viewer`**: 閲覧のみ（将来実装）

### Step 4: 保存して確認

1. 「保存」をクリック
2. adminUsersコレクションに1件のドキュメントが作成されたことを確認

---

## ✅ 動作確認

### 1. 開発サーバーが起動していることを確認
```bash
npm run dev
```

### 2. ブラウザでアドミン画面にアクセス
```
http://localhost:3000/admin
```

### 3. 期待される動作
- ✅ ダッシュボードが表示される
- ✅ サイドバーにメニューが表示される
- ✅ ヘッダーにユーザー情報が表示される

### 4. エラーが出る場合
- 管理者権限がない場合 → ダッシュボード（`/dashboard`）にリダイレクトされます
- UID が正しくない場合 → Step 3のドキュメントIDを確認してください

---

## 🔒 セキュリティ注意事項

### Firestoreセキュリティルールの更新（重要）

現在のセキュリティルールを更新する必要があります：

```javascript
// firestore.rules に追加
match /adminUsers/{adminId} {
  // 自分自身の管理者情報のみ読み取り可能
  allow read: if request.auth != null && request.auth.uid == adminId;
  
  // 作成・更新・削除は禁止（手動で管理）
  allow write: if false;
}

match /adminLogs/{logId} {
  // 管理者のみ読み取り可能
  allow read: if request.auth != null && 
    exists(/databases/$(database)/documents/adminUsers/$(request.auth.uid));
  
  // Cloud Functionsからのみ書き込み可能
  allow write: if false;
}
```

### ルールのデプロイ
```bash
firebase deploy --only firestore:rules
```

---

## 👥 追加の管理者を登録する方法

他のユーザーを管理者にする場合：

### 1. ユーザーのUIDを取得

Firebase Console → Authentication → Users から対象ユーザーのUIDをコピー

### 2. adminUsersコレクションに追加

上記Step 2-3と同じ手順で、新しいドキュメントを追加

### 3. role の設定

- 完全な権限が必要な場合: `admin`
- 制限された権限の場合: `editor`

---

## 🚨 トラブルシューティング

### 問題1: アドミン画面にアクセスできない

**症状**: `/admin`にアクセスすると`/dashboard`にリダイレクトされる

**原因**: 管理者権限が設定されていない

**解決策**:
1. Firebase Consoleでadmin Usersコレクションを確認
2. ドキュメントIDが正しいUIDと一致しているか確認
3. roleフィールドが`admin`または`editor`になっているか確認

### 問題2: ローディングが終わらない

**症状**: ずっとローディング画面が表示される

**原因**: useAdmin hookでエラーが発生している可能性

**解決策**:
1. ブラウザのコンソール（F12）でエラーを確認
2. Firestoreのセキュリティルールを確認
3. Firebase接続を確認

### 問題3: 「Permission denied」エラー

**原因**: Firestoreのセキュリティルールが設定されていない

**解決策**:
上記の「セキュリティ注意事項」を参照してルールを設定

---

## 📝 次のステップ

初期セットアップが完了したら、次のタスクに進みます：

1. ✅ ダッシュボードの統計データ表示を実装
2. ✅ ユーザー一覧機能を実装
3. ✅ プラン変更機能を実装

---

**セットアップが完了したら、この手順書の内容を確認してアドミン画面にアクセスしてください！**

