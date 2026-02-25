# メール通知機能 実装完了

## 実装内容

### Phase 1 & 2 の実装が完了しました

✅ **完了項目:**

1. **管理者パネル（`/admin/settings/notifications`）**
   - 週次レポート設定（有効/無効、配信曜日、配信時刻）
   - 月次レポート設定（有効/無効、配信日、配信時刻）
   - 8つの固定指標（訪問者数、ユーザー数、表示回数、平均PV、ENG率、CV数、CVR、直帰率）
   - 管理者テスト送信ボタン

2. **ユーザー設定（`/account/settings`）**
   - 「メール通知を受け取る」チェックボックス
   - 全レポートの一括ON/OFF制御

3. **Firestore データ構造**
   - `systemSettings/emailNotifications`: 管理者の全体設定
   - `users/{userId}.notificationSettings.emailNotifications`: ユーザーの受信設定

4. **Firebase Functions**
   - `sendWeeklyReports`: 週次レポート自動送信
   - `sendMonthlyReports`: 月次レポート自動送信
   - `sendTestReportEmail`: テストメール送信（管理者用）

5. **メールテンプレート**
   - HTMLメール（グラデーションヘッダー、レスポンシブデザイン）
   - テキストメール（HTML非対応環境用）
   - 前週比/前月比の増減表示

6. **Firestore Security Rules**
   - `systemSettings`コレクションへの管理者アクセス権限

## セットアップ手順

### 1. SendGridのセットアップ

詳細は `functions/EMAIL_NOTIFICATION_SETUP.md` を参照してください。

1. SendGridアカウント作成
2. API Key取得
3. Firebase環境変数設定:
   ```bash
   firebase functions:config:set sendgrid.api_key="YOUR_API_KEY"
   firebase functions:config:set sendgrid.from_email="noreply@grow-reporter.com"
   firebase functions:config:set sendgrid.from_name="GROW REPORTER"
   ```

### 2. パッケージインストール

```bash
cd functions
npm install
```

新しい依存関係:
- `@sendgrid/mail`: SendGrid SDK
- `@google-cloud/scheduler`: Cloud Scheduler SDK（動的スケジュール更新用、Phase 3）

### 3. Firestore Rulesのデプロイ

```bash
firebase deploy --only firestore:rules
```

### 4. Firebase Functionsのデプロイ

```bash
firebase deploy --only functions
```

新規追加された関数:
- `sendWeeklyReports` (Scheduled)
- `sendMonthlyReports` (Scheduled)
- `sendTestReportEmail` (Callable)

### 5. Cloud Schedulerの設定

#### 週次レポート（毎週月曜日 9:00 JST）

Firebase Consoleまたは`gcloud`コマンドで設定:

```bash
gcloud scheduler jobs create pubsub weekly-report-job \
  --location=asia-northeast1 \
  --schedule="0 9 * * 1" \
  --time-zone="Asia/Tokyo" \
  --topic=firebase-schedule-sendWeeklyReports-asia-northeast1 \
  --message-body="{}"
```

#### 月次レポート（毎月1日 9:00 JST）

```bash
gcloud scheduler jobs create pubsub monthly-report-job \
  --location=asia-northeast1 \
  --schedule="0 9 1 * *" \
  --time-zone="Asia/Tokyo" \
  --topic=firebase-schedule-sendMonthlyReports-asia-northeast1 \
  --message-body="{}"
```

**重要**: 管理画面で設定した曜日・時刻に合わせて、Cloud Schedulerのcron式を手動で調整してください。

### 6. テスト

1. 管理画面 `http://localhost:3000/admin/settings/notifications` にアクセス
2. 週次・月次レポートの設定を入力
3. 「設定を保存」をクリック
4. 「管理者にテスト送信」をクリック
5. 管理者のメールアドレスにテストメールが届くか確認

## ファイル構成

```
src/
├── pages/
│   ├── Admin/
│   │   └── Settings/
│   │       └── EmailNotifications.jsx     // 管理画面
│   └── AccountSettings.jsx                 // ユーザー設定（更新済み）
├── components/
│   └── Admin/
│       └── AdminSidebar.jsx                // サイドバーにメニュー追加
└── App.jsx                                 // ルーティング追加

functions/
├── src/
│   ├── callable/
│   │   └── sendTestReportEmail.js          // テスト送信
│   ├── scheduled/
│   │   ├── sendWeeklyReports.js            // 週次レポート
│   │   └── sendMonthlyReports.js           // 月次レポート
│   ├── utils/
│   │   └── emailTemplates.js               // メールテンプレート・送信
│   └── index.js                            // エクスポート
├── package.json                            // 依存関係更新
└── EMAIL_NOTIFICATION_SETUP.md             // セットアップガイド

firestore.rules                             // セキュリティルール更新
```

## 今後の拡張（Phase 3以降）

- [ ] Cloud Schedulerの動的更新（管理画面から直接スケジュール変更）
- [ ] GA4 API連携でリアルメトリクスを取得
- [ ] 複数サイトの横断レポート
- [ ] カスタムメトリクス選択機能
- [ ] メール配信履歴の記録・閲覧
- [ ] PDFレポート添付
- [ ] アラートメール（CV数急減など異常検知）

## 注意事項

1. **SendGrid API Key**: 必ず環境変数に設定してください。コードにハードコーディングしないこと。
2. **Cloud Scheduler**: 管理画面の設定を変更した場合、現時点では手動でCloud Schedulerのcron式も更新する必要があります（Phase 3で自動化予定）。
3. **メトリクス取得**: 現在はモックデータを返しています。本番環境では`fetchWeeklyMetrics`と`fetchMonthlyMetrics`関数を実装し、GA4 APIまたはFirestoreキャッシュからデータを取得してください。
4. **コスト**: SendGrid無料プランは月間12,000通まで。ユーザー数×サイト数×レポート頻度を考慮してください。

## サポート

質問や問題がある場合:
1. `functions/EMAIL_NOTIFICATION_SETUP.md` を確認
2. Firebase Console → Functions → Logs でエラーログ確認
3. SendGrid Dashboard → Activity でメール配信状況確認

---

**実装完了日**: 2026年2月13日
