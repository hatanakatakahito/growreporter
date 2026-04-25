# シークレットローテ：ユーザー側 TODO リスト

このファイルは **私（AI）が実行できないコンソール作業** のチェックリストです。
コード側の修正は完了しています（Phase 1-4 / 1-4b / 1-4c）。
以下の手順を順に実行してから本番デプロイすると、Phase 1 セキュリティ強化が完了します。

> **重要**: 本番デプロイの前に必ず `docs/PRE_DEPLOY_CHECKLIST.md` の項目をすべて満たしてください。
> 各手順の前後で git tag を打つことを推奨します（例: `git tag pre-rotate-cf-20260425-1500`）。

---

## 🔴 1. Cloudflare Worker Proxy Secret のローテ（Phase 1-4）

### 1-1. 新しい乱数を生成
ローカルで:
```bash
# Mac/Linux
openssl rand -base64 32

# Windows PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```
出力された文字列をメモしておく（後で使う）。

### 1-2. Cloudflare Worker 側に新しい Secret を登録
```bash
cd workers/fetch-proxy

# wrangler login がまだなら:
wrangler login

# Secret 設定（プロンプトで上記の値を貼り付け）
wrangler secret put PROXY_SECRET

# 動作確認: 認証ヘッダ無しでアクセスして 401 が返ること
curl -X POST https://growreporter-fetch-proxy.hatanaka-a1e.workers.dev \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com"}'
# → 401 Unauthorized が返れば OK
```

### 1-3. Firebase Secret Manager 側にも同じ値を登録
```bash
cd c:/Users/hatan/GrowReporterFinal
firebase functions:secrets:set CF_PROXY_SECRET
# プロンプトで同じ値を貼り付け
```

### 1-4. Worker のコード変更（CORS + URL allowlist）をデプロイ
```bash
cd workers/fetch-proxy
wrangler deploy
```

### 1-5. Functions をデプロイ
```bash
cd c:/Users/hatan/GrowReporterFinal
firebase deploy --only functions
```

### 1-6. 動作確認
- ステージング Emulator または本番のサイト登録画面で URL メタデータ取得が動作すること
- スクレイピング機能（手動「スクレイピング開始」）が動作すること
- 改善モックアップ生成が動作すること

---

## 🔴 2. Google OAuth Client Secret のローテ（Phase 1-4c）

旧値: `[REDACTED-OAUTH-CLIENT-SECRET]`（git 履歴 4 コミットに残存・即時無効化が必要）

### 2-1. GCP Console で新しい Secret を発行
1. https://console.cloud.google.com/apis/credentials?project=growgroupreporter にアクセス
2. OAuth 2.0 クライアント ID `1014499109379-d1q6usk8brl70epqcu0atfk6khpi74cj.apps.googleusercontent.com` を開く
3. **「シークレットをリセット」** ボタンをクリック → 新しい値が発行される（旧値は即座に無効化される）
4. 新しい値をメモしておく

### 2-2. Firebase Secret Manager に登録
```bash
firebase functions:secrets:set GOOGLE_CLIENT_SECRET
# プロンプトで新しい値を貼り付け
```

### 2-3. Functions をデプロイ
```bash
firebase deploy --only functions
```

### 2-4. 動作確認
- 既存ユーザーが GA4 データ閲覧できること（自動リフレッシュトークン更新が動作するか）
- 新規 OAuth フロー（サイト登録画面の Google 連携）が動作すること

> **注意**: 旧 OAuth Client Secret は git 履歴に残存しているため、
> Phase 4-A-7（git filter-repo で履歴クリーン）で別途対応します。
> ただし、ローテ済みなので「漏えいしても無効」状態になっています。

---

## 🟠 3. AWS SES SMTP 認証情報のローテ（Phase 1-4b）

旧値: `[REDACTED-AWS-ACCESS-KEY]` + パスワード（gitignored、git 履歴クリーン）

### 3-1. AWS IAM で新しい Access Key を発行
1. https://console.aws.amazon.com/iam にアクセス
2. SES 用 IAM ユーザー（Access Key `[REDACTED-AWS-ACCESS-KEY]` を持つユーザー）を開く
3. 「セキュリティ認証情報」タブ → 「アクセスキーを作成」
4. SES SMTP 用の認証情報を生成（**SMTP Password は通常の Secret Access Key とは別物**。SES Console で発行する場合は https://console.aws.amazon.com/ses/home#smtp-settings: で「SMTP credentials を作成」）
5. 新しい SMTP_USER / SMTP_PASSWORD をメモ

### 3-2. Firebase Secret Manager に登録
```bash
firebase functions:secrets:set SES_SMTP_USER
# プロンプトで新しい SMTP USER を貼り付け

firebase functions:secrets:set SES_SMTP_PASSWORD
# プロンプトで新しい SMTP PASSWORD を貼り付け
```

### 3-3. Functions をデプロイ
```bash
firebase deploy --only functions
```

### 3-4. テストメール送信で動作確認
管理画面 > 設定 > メール通知 > テストメール送信、または:
```bash
# Cloud Functions Shell で
firebase functions:shell
# > sendTestReportEmail({ data: { recipientEmail: 'info@grow-reporter.com', reportType: 'weekly' }, auth: { uid: '<admin-uid>' } })
```

### 3-5. 旧キーを Inactive 化
新キー動作確認後、AWS IAM Console で旧 Access Key (`[REDACTED-AWS-ACCESS-KEY]`) を **Inactive** に変更（即削除しない、24h 以上経過後に削除）。

---

## 🟢 4. ローカル Emulator 用環境変数の設定

ローカル開発時は Firebase Secret Manager の値が読まれないため、`.env.local` でローカル値を指定します。

### 4-1. 開発用ダミー値を作成
```bash
cd c:/Users/hatan/GrowReporterFinal/functions
cp .env .env.local
```

### 4-2. `.env.local` に実値を記入
- `GOOGLE_CLIENT_SECRET` = 上記 2-1 で発行した新値
- `CF_PROXY_SECRET` = 上記 1-1 で生成した値
- `SES_SMTP_USER` / `SES_SMTP_PASSWORD` = 上記 3-1 の値（メール送信をテストする場合のみ）

`.env.local` は gitignore されているので commit されません。

### 4-3. Emulator で動作確認
```bash
cd c:/Users/hatan/GrowReporterFinal
npm run dev:emulator
```

---

## ✅ 完了確認チェックリスト

ローテ完了後、すべてチェックがついたら Phase 1 完了:

- [ ] Cloudflare Worker の新 PROXY_SECRET 登録完了
- [ ] Firebase Secret Manager に CF_PROXY_SECRET 登録完了
- [ ] GCP Console で Google OAuth Client Secret リセット完了（旧値無効化済）
- [ ] Firebase Secret Manager に GOOGLE_CLIENT_SECRET 登録完了
- [ ] AWS IAM で新 SES Access Key 発行完了
- [ ] Firebase Secret Manager に SES_SMTP_USER / SES_SMTP_PASSWORD 登録完了
- [ ] `firebase deploy --only functions` で本番デプロイ完了
- [ ] 本番でサイト登録 / メタデータ取得 / GA4 取得 / メール送信 が動作することを目視確認
- [ ] 旧 AWS Access Key を Inactive 化（24h 後に削除）
- [ ] git tag `prod-phase1-rotation-{YYYYMMDD-HHmm}` 打って push

---

## 緊急時のロールバック

新シークレットで動作不良が発生した場合:

1. **CF Proxy**: Worker の前バージョンに `wrangler rollback` で戻す。同時に Firebase Functions も `git revert` 後に `firebase deploy --only functions`
2. **OAuth**: GCP Console > OAuth 2.0 設定で「シークレットを再発行」する選択肢があるが、**旧シークレット復活はできない**ため、新シークレットでデプロイをやり直す
3. **SES**: 新キーが動かない場合、旧キーがまだ Inactive 化されていなければ `firebase functions:secrets:set SES_SMTP_USER` で旧値に戻す

詳細は `docs/ROLLBACK_PROCEDURES.md`。
