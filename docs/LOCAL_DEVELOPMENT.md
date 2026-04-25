# ローカル開発ガイド

GrowReporter のローカル開発環境（Firebase Emulator Suite）のセットアップと利用手順です。

## 前提条件

- Node.js 20 以上
- Firebase CLI (`npm install -g firebase-tools`)
- Java 11 以上 (Firestore / Storage Emulator が必要とする)

```bash
# Java バージョン確認
java -version

# Firebase CLI ログイン
firebase login

# プロジェクト確認
firebase projects:list
```

## 初回セットアップ

```bash
# ルートで依存インストール
npm install

# functions の依存インストール
cd functions
npm install
cd ..

# .env.local をテンプレからコピー
cp .env.local.example .env.local

# .env (本番 Firebase Web 設定) は別途用意
```

## Emulator Suite 起動

### 通常の開発（永続データあり）

```bash
npm run dev:emulator
```

- Vite (`http://localhost:5173`) と Firebase Emulator が同時起動
- 終了時 (`Ctrl+C`) に Firestore/Auth/Storage データを `firebase-export/` に保存
- 次回起動時は前回データを復元
- フロントエンドは自動的に Emulator に接続 (`VITE_USE_EMULATOR=true`)

### まっさらな状態で起動

```bash
npm run dev:emulator:fresh
```

- 毎回データなしから開始
- テストシナリオを毎回ゼロから検証したい場合に使用

### Emulator のみ起動（フロントは別ターミナルで起動したい場合）

```bash
npm run emulators        # 永続データあり
npm run emulators:fresh  # まっさら
```

別ターミナルで:
```bash
VITE_USE_EMULATOR=true npm run dev
```

## Emulator UI

起動後、ブラウザで `http://localhost:4000` を開くと:

- **Auth**: ユーザーの追加・編集・削除、テストユーザー作成
- **Firestore**: ドキュメントの直接閲覧・編集、Rules Playground
- **Storage**: アップロード済ファイル一覧
- **Functions**: 呼出ログ、エラー確認
- **Logs**: 全 Emulator のログ統合表示

## テストデータ投入 (seedEmulator)

```bash
cd functions
node src/scripts/seedEmulator.js
```

投入されるテストユーザー:

| 役割 | メール | パスワード | 説明 |
|---|---|---|---|
| Owner | owner@test.local | TestOwner123! | アカウントオーナー |
| Editor | editor@test.local | TestEditor123! | 編集者ロール |
| Viewer | viewer@test.local | TestViewer123! | 閲覧者ロール |
| Admin | admin@test.local | TestAdmin123! | システム管理者 |

加えて、サンプルサイト 1 件と improvement 数件が投入されます。

## Emulator と本番の差分

以下は Emulator では再現できないので、本番動作確認が必要:

- **scheduled functions (cron)**: 手動で `npm run shell` から呼出してテスト
- **OAuth ポップアップ (Google/Microsoft)**: 実際の Google/Microsoft アカウントが必要
- **Cloud KMS**: `KMS_MOCK=true` 環境変数でパススルー動作にする
- **メール送信 (SES)**: `EMAIL_MOCK=true` で送信せずログ出力のみ
- **Cloud Logging / Crashlytics**: ローカルでは `console.log` に出力
- **App Check (Phase 4-A-3 後)**: ローカルでは `FIREBASE_APPCHECK_DEBUG_TOKEN` を使用

## Firestore Rules のローカルテスト

```bash
# Emulator UI > Firestore > Rules タブ で書込シミュレート可能
# あるいは CLI から
firebase emulators:exec --only firestore "npm run test:rules"
```

## トラブルシューティング

### Emulator が起動しない

```bash
# ポート 9099, 5001, 8080, 9199, 5000, 8085, 4000 が使用中でないか確認
lsof -i :8080
# 該当プロセスを kill

# Java が見つからない
java -version
# 出ない場合は Java 11 以上をインストール
```

### Vite が Emulator に接続できない

`.env.local` の `VITE_USE_EMULATOR=true` を確認。
ブラウザのコンソールに `[firebase] Emulator Suite に接続しました` が出ることを確認。

### Emulator データが消えた

`npm run emulators:fresh` を使うと毎回データが消えます。永続化したい場合は `npm run emulators` （`--export-on-exit` 付き）を使用。
`firebase-export/` ディレクトリが gitignore されているのを確認。

## 開発フロー（推奨）

```
1. 機能ブランチを切る: git checkout -b feature/phase-N-step-X
2. ローカルで実装
3. npm run dev:emulator で動作確認
4. npm run lint && npm run build
5. PRE_DEPLOY_CHECKLIST.md の項目を全て満たす
6. PR 作成 → セルフレビュー → main マージ
7. git tag pre-deploy-{YYYYMMDD-HHmm}-{phase}-{step}
8. firebase deploy --only {対象}
9. 30 分張り付き動作確認
10. git tag prod-{YYYYMMDD-HHmm}-{phase}-{step}
```
