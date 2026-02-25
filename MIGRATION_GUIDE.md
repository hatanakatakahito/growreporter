# データマイグレーションガイド

## 概要

`accountMembers` コレクションから `users.memberships` への移行が必要です。

## 実行方法

### 方法1: ブラウザコンソールから実行（推奨）

1. https://growgroupreporter.web.app にアクセス
2. ログイン
3. ブラウザの開発者ツールを開く（F12）
4. コンソールタブで以下を実行：

```javascript
const migrateData = firebase.functions().httpsCallable('migrateData');
const result = await migrateData({ migrationType: 'accountMembersToUsers' });
console.log('マイグレーション結果:', result.data);
```

### 方法2: 管理画面から実行

1. 管理画面にアクセス: https://growgroupreporter.web.app/admin
2. 「データ管理」セクションを開く
3. 「accountMembers → users.memberships マイグレーション」ボタンをクリック

## 確認方法

マイグレーション後、以下を確認してください：

1. **メンバー管理画面**: http://localhost:3000/members
   - オーナーを含む全メンバーが表示される
   
2. **Firestore コンソール**:
   - `users` コレクション内の各ユーザードキュメントに `memberships` フィールドが追加されている
   - 例: `memberships.{accountOwnerId}.role` = "owner" | "editor" | "viewer"

3. **招待されたメンバーのサイト表示**:
   - 招待されたメンバーでログインし、ダッシュボードでサイトが表示される

## トラブルシューティング

### エラー: "permission-denied"
- 管理者権限でログインしているか確認してください

### メンバーが表示されない
- ブラウザのキャッシュをクリアして再ログインしてください
- Firestore コンソールで `users` コレクションの `memberships` フィールドを確認してください

### サイトが表示されない
- `SiteContext.jsx` が最新版にデプロイされているか確認してください
- ブラウザのコンソールで `[SiteContext]` のログを確認してください
