# メール通知機能 セットアップガイド

## 概要
GROW REPORTERのメール通知機能は、週次・月次レポートをユーザーに自動送信します。SendGridを使用してメール配信を行います。

## 1. SendGridのセットアップ

### 1.1 SendGridアカウント作成
1. [SendGrid](https://sendgrid.com/)にアクセス
2. 無料アカウントを作成（月間12,000通まで無料）
3. Sender Authenticationを設定

### 1.2 API Keyの作成
1. SendGridダッシュボードで「Settings」→「API Keys」
2. 「Create API Key」をクリック
3. 名前: `GROW_REPORTER_Email_Notifications`
4. アクセス権限: `Full Access` または `Mail Send` のみ
5. API Keyをコピー（一度しか表示されません）

### 1.3 Firebase Functionsに環境変数を設定

#### 開発環境（ローカル）
`.env`ファイルを`functions/`フォルダに作成:

```bash
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=noreply@grow-reporter.com
SENDGRID_FROM_NAME=GROW REPORTER
```

#### 本番環境
Firebase CLIで設定:

```bash
# SendGrid API Key
firebase functions:config:set sendgrid.api_key="SG.xxxxxxxxxxxxxxxxxxxxx"

# 送信元メールアドレス
firebase functions:config:set sendgrid.from_email="noreply@grow-reporter.com"

# 送信元名
firebase functions:config:set sendgrid.from_name="GROW REPORTER"

# 設定確認
firebase functions:config:get

# デプロイ
firebase deploy --only functions
```

## 2. SendGrid SDKのインストール

`functions/`フォルダで以下を実行:

```bash
cd functions
npm install @sendgrid/mail
```

## 3. メール送信関数の有効化

### 3.1 `emailTemplates.js`を更新
`functions/src/utils/emailTemplates.js`の`sendEmail`関数で、SendGrid SDKを有効化:

```javascript
import sgMail from '@sendgrid/mail';

export async function sendEmail(to, subject, html, text) {
  if (process.env.FUNCTIONS_EMULATOR === 'true') {
    console.log('[メール送信（エミュレーター）]');
    console.log('To:', to);
    console.log('Subject:', subject);
    return { success: true, messageId: 'emulator-test-id' };
  }

  try {
    const apiKey = functions.config().sendgrid?.api_key || process.env.SENDGRID_API_KEY;
    const fromEmail = functions.config().sendgrid?.from_email || process.env.SENDGRID_FROM_EMAIL;
    const fromName = functions.config().sendgrid?.from_name || process.env.SENDGRID_FROM_NAME || 'GROW REPORTER';

    if (!apiKey) {
      throw new Error('SendGrid API key not configured');
    }

    sgMail.setApiKey(apiKey);

    const msg = {
      to,
      from: {
        email: fromEmail,
        name: fromName,
      },
      subject,
      text,
      html,
    };

    const response = await sgMail.send(msg);
    return {
      success: true,
      messageId: response[0].headers['x-message-id'],
    };
  } catch (error) {
    console.error('SendGridメール送信エラー:', error);
    throw error;
  }
}
```

## 4. Cloud Schedulerの設定

週次・月次レポートは、Cloud Schedulerで自動実行されます。

### 4.1 週次レポートのスケジュール設定

Firebase Consoleで設定（または`gcloud`コマンド）:

```bash
# 毎週月曜日 9:00 JST に実行
gcloud scheduler jobs create pubsub weekly-report-job \
  --location=asia-northeast1 \
  --schedule="0 9 * * 1" \
  --time-zone="Asia/Tokyo" \
  --topic=firebase-schedule-sendWeeklyReports-asia-northeast1 \
  --message-body="{}"
```

### 4.2 月次レポートのスケジュール設定

```bash
# 毎月1日 9:00 JST に実行
gcloud scheduler jobs create pubsub monthly-report-job \
  --location=asia-northeast1 \
  --schedule="0 9 1 * *" \
  --time-zone="Asia/Tokyo" \
  --topic=firebase-schedule-sendMonthlyReports-asia-northeast1 \
  --message-body="{}"
```

### 4.3 管理画面から動的に変更する方法（Phase 2）

管理画面の設定を反映するため、Cloud Schedulerジョブを動的に更新するCloud Functionを追加:

```javascript
// functions/src/callable/admin/updateEmailSchedule.js
import * as functions from 'firebase-functions';
import { CloudSchedulerClient } from '@google-cloud/scheduler';

const client = new CloudSchedulerClient();

export const updateEmailSchedule = functions
  .region('asia-northeast1')
  .https.onCall(async (data, context) => {
    // 管理者権限チェック
    // ...

    const { reportType, dayOfWeek, hour } = data;
    
    // Cron式を生成
    const cronExpression = reportType === 'weekly'
      ? `0 ${hour} * * ${dayOfWeek}`
      : `0 ${hour} ${data.dayOfMonth} * *`;

    // Cloud Schedulerジョブを更新
    const jobName = reportType === 'weekly' ? 'weekly-report-job' : 'monthly-report-job';
    const jobPath = client.jobPath(
      'YOUR_PROJECT_ID',
      'asia-northeast1',
      jobName
    );

    await client.updateJob({
      job: {
        name: jobPath,
        schedule: cronExpression,
        timeZone: 'Asia/Tokyo',
      },
    });

    return { success: true };
  });
```

## 5. Firestore Security Rulesの更新

`systemSettings/emailNotifications`への管理者アクセスを許可:

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // システム設定（管理者のみ読み書き可能）
    match /systemSettings/{docId} {
      allow read: if request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
      allow write: if request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
```

## 6. テスト

### 6.1 ローカルエミュレーターでテスト

```bash
cd functions
npm run serve

# 別のターミナルで
firebase emulators:start
```

管理画面 (`http://localhost:3000/admin/settings/notifications`) から「管理者にテスト送信」をクリック。

### 6.2 本番環境でテスト

```bash
firebase deploy --only functions
```

管理画面から「管理者にテスト送信」をクリックし、実際にメールが届くか確認。

## 7. モニタリング

### 7.1 Firebase Consoleでログ確認

Firebase Console → Functions → Logs

### 7.2 SendGridダッシュボード

SendGrid Dashboard → Activity でメール配信状況を確認

### 7.3 エラーハンドリング

- メール送信失敗時は、Firestore の `emailLogs` コレクションに記録
- 管理者に通知（オプション）

## 8. トラブルシューティング

### API Keyが認識されない
```bash
firebase functions:config:get
# 設定が空の場合は再設定
firebase functions:config:set sendgrid.api_key="YOUR_KEY"
firebase deploy --only functions
```

### メールが届かない
1. SendGridダッシュボードでActivity確認
2. スパムフォルダ確認
3. Sender Authenticationが正しく設定されているか確認

### スケジュールが実行されない
1. Cloud Schedulerのジョブが有効か確認
2. Pub/Subトピックが正しく設定されているか確認
3. Firebase Consoleのログでエラー確認

## 9. コスト試算

### SendGrid
- 無料プラン: 月間12,000通まで無料
- Essentialsプラン: $19.95/月（月間50,000通まで）

### Cloud Scheduler
- 無料枠: 月間3ジョブまで無料
- 超過分: $0.10/ジョブ/月

### Cloud Functions
- 呼び出し: 月間200万回まで無料
- メモリ・CPU: 週次+月次で月間数百円程度（ユーザー数による）

## 10. 今後の拡張案（Phase 3以降）

- [ ] メール配信履歴の記録・閲覧機能
- [ ] 送信失敗時の自動リトライ
- [ ] メール開封率・クリック率のトラッキング
- [ ] カスタムメールテンプレート（ユーザーごと）
- [ ] アラートメール（CV数急減など）
- [ ] PDFレポート添付
- [ ] 複数サイト横断レポート

---

## サポート

質問や問題がある場合は、開発チームにご連絡ください。
