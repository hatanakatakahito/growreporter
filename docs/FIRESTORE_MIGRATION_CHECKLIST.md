# Firestore 構造整理 — 実施手順・目視チェックリスト

デプロイ後、以下の順で実施し、各項目を目視で確認してください。

---

## 手順概要（バックアップなしで進める場合）

1. **マイグレーション実行**（ローカルで一括実行）
2. **デプロイ**（Firestore ルール・インデックス・Functions）
3. **目視チェック**（下記チェックリスト）

---

## ユーザー関連を users 配下へ移行（案A）

**順序**: マイグレーション → デプロイ → 旧ルート削除

1. **マイグレーション**（デプロイの前に実行）  
   `cd functions && node src/scripts/runUserMigrations.js`  
   → oauth_tokens, planChangeHistory, memoReadStatus, userAlertReads, reports, customLimits を `users/{uid}/...` にコピー
2. **デプロイ**  
   `firebase deploy --only firestore:rules,functions`（およびクライアント）
3. **旧ルート削除**（デプロイ直後）  
   `cd functions && node src/scripts/deleteOldUserRootCollections.js`  
   → 上記 6 コレクションのルートドキュメントを削除

- [ ] migrateUserCollectionsToUsers を実行した
- [ ] デプロイした
- [ ] deleteOldUserRootCollections を実行した

---

## 1. マイグレーション実行（サイト関連・既存）

**ローカルで一括実行（推奨）**

```bash
cd functions
node src/scripts/runMigrations.js
```

- 実行内容: **backfillUsersAccountFields** → **migrateToSubcollections** の順
- 前提: `firebase login` 済み、または `GOOGLE_APPLICATION_CREDENTIALS` 設定済み

**Callable で実行する場合**

- 先に Functions をデプロイしてから、`migrateData` を `migrationType: 'backfillUsersAccountFields'` / `'migrateToSubcollections'` でそれぞれ呼び出す。
- （任意）`migrationType: 'backfillAlertEmail'` でアラートメール設定を一括反映。

- [ ] **backfillUsersAccountFields** を実行した
- [ ] **migrateToSubcollections** を実行した

---

## 2. デプロイ

- [ ] `firebase deploy --only firestore:rules,firestore:indexes,functions` を実行した（Functions は別途 `firebase deploy --only functions` でも可）
- [ ] デプロイエラーがなく、ルール・インデックス・Functions が反映された

※ 今回の実施では **バックアップは取得していません**。必要であれば次回以降、事前に Firestore エクスポートを取得してください。

---

## 3. 目視チェック（フェーズ1: メンバー）

- [ ] **メンバー一覧**  
  設定 or メンバー画面で、オーナー・メンバーが一覧表示される
- [ ] **招待 → 承認**  
  新規招待を送り、招待リンクから承認するとメンバー一覧に追加される
- [ ] **権限変更**  
  メンバーのロール（編集者/閲覧者）を変更できる
- [ ] **メンバー削除**  
  メンバーを削除すると一覧から消える
- [ ] **オーナー譲渡**  
  （利用する場合）オーナー譲渡が完了する

---

## 4. 目視チェック（ユーザー関連: users 配下）

- [ ] **GA4/GSC 接続**  
  サイト設定で既存トークンが表示される。オーナー・編集者どちらで開いてもトークンが読める
- [ ] **メモ既読**  
  分析画面でメモ既読状態が更新・表示される
- [ ] **アラート既読**  
  ダッシュボードのアラートを既読にできる
- [ ] **管理者: ユーザー詳細**  
  プラン変更履歴・個別制限が表示される。ユーザー削除で該当ユーザーのサブコレも削除される

---

## 5. 目視チェック（フェーズ2: サイト別データ）

- [ ] **改善する（improvements）**  
  - 改善課題一覧が表示される  
  - 新規追加・編集・削除・ステータス変更ができる  
  - AI 提案からタスク追加ができる
- [ ] **ページメモ（pageNotes）**  
  - 分析画面などでメモの投稿・履歴表示・削除ができる
- [ ] **スクレイピング**  
  - サイト詳細でスクレイピング状況（メタ/進捗）が表示される  
  - 「スクレイピング開始」でジョブが動き、完了後に結果が反映される
- [ ] **AI 分析・要約**  
  - AI 分析・改善提案の生成ができ、結果が表示される  
  - キャッシュ利用時も問題なく表示される
- [ ] **管理者**  
  - 管理者の「ユーザー一覧」「サイト一覧」「AI使用状況」などが表示される  
  - ユーザー削除時、該当サイトのサブコレデータが削除される挙動で問題ない

---

## 6. 問題があった場合

- **フェーズ1（メンバー）で不具合**  
  → 計画どおり、コードを戻して一時的に accountMembers を再参照するロールバックを検討
- **フェーズ2（サブコレ）で不具合**  
  → 既に `migrateToSubcollections` でコピー済みなら、旧ルートのデータは残っているため、読み取りを旧パスに戻すロールバックが可能
- **ルールエラー**  
  → Firebase Console の「Firestore」→「ルール」でエラー内容を確認し、該当 match を修正

---

## 7. 移行確認後（任意）

- [ ] しばらく運用して問題がないことを確認した
- [ ] **旧ルートコレクションのデータ削除**  
  計画方針どおり「移行確認後に削除」する場合、別スクリプトまたは手動で以下を削除  
  - improvements（ルート）  
  - pageNotes（ルート）  
  - pageScrapingData, pageScrapingMeta, scrapingProgress, scrapingErrors（ルート）  
  - aiAnalysisCache, aiSummaries（ルート）  
  ※ 削除前に必ずサブコレ側にデータがあることを確認すること

---

## 参照

- 計画書: `.cursor/plans/` 内の Firestore 構造整理計画
- マイグレーション: `functions/src/scripts/backfillUsersAccountFields.js`, `migrateToSubcollections.js`
- 呼び出し: `migrateData` Callable の `migrationType` で上記を指定
