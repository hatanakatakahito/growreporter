# Firebase セットアップガイド

## 1. Firebaseプロジェクトの作成

1. [Firebase Console](https://console.firebase.google.com/) にアクセス
2. 「プロジェクトを追加」をクリック
3. プロジェクト名を入力（例: grow-reporter）
4. Google Analyticsの設定（オプション）
5. プロジェクトを作成

## 2. Webアプリの追加

1. Firebaseプロジェクトのダッシュボードで「ウェブ」アイコン（</>）をクリック
2. アプリのニックネームを入力（例: GrowReporter Web）
3. 「このアプリのFirebase Hostingも設定します」はチェックしない
4. 「アプリを登録」をクリック
5. 表示される設定情報をコピー

## 3. 認証の有効化

1. Firebase Consoleで「Authentication」を選択
2. 「始める」をクリック
3. 「Sign-in method」タブを選択
4. 以下のプロバイダーを有効化：
   - **メール/パスワード**: 有効にする
   - **Google**: 有効にして、サポートメールを設定

## 4. Firestoreの有効化

1. Firebase Consoleで「Firestore Database」を選択
2. 「データベースの作成」をクリック
3. 「本番環境モード」を選択
4. ロケーションを選択（例: asia-northeast1 (Tokyo)）
5. 「有効にする」をクリック

## 5. Firestoreセキュリティルールの設定

Firestoreの「ルール」タブで以下のルールを設定：

\`\`\`
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // ユーザーコレクション
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // サイトコレクション
    match /sites/{siteId} {
      allow read: if request.auth != null && resource.data.userId == request.auth.uid;
      allow write: if request.auth != null && request.resource.data.userId == request.auth.uid;
    }
  }
}
\`\`\`

## 6. 環境変数の設定

プロジェクトルートに `.env` ファイルを作成し、以下の内容を記入：

\`\`\`env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Google Gemini API
VITE_GEMINI_API_KEY=your_gemini_api_key_here
VITE_GEMINI_MODEL=gemini-2.5-flash
\`\`\`

### Firebase設定値の取得方法

Firebase Consoleの「プロジェクトの設定」→「全般」→「マイアプリ」から以下の値をコピー：

- `apiKey` → `VITE_FIREBASE_API_KEY`
- `authDomain` → `VITE_FIREBASE_AUTH_DOMAIN`
- `projectId` → `VITE_FIREBASE_PROJECT_ID`
- `storageBucket` → `VITE_FIREBASE_STORAGE_BUCKET`
- `messagingSenderId` → `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `appId` → `VITE_FIREBASE_APP_ID`

## 7. 開発サーバーの起動

\`\`\`bash
npm run dev
\`\`\`

## 8. 動作確認

1. `http://localhost:3000/register` にアクセス
2. ユーザー登録を実行
3. ログイン画面でログイン
4. ダッシュボードが表示されることを確認

## トラブルシューティング

### エラー: "Firebase: Error (auth/configuration-not-found)"
- `.env` ファイルが正しく作成されているか確認
- 環境変数の名前が `VITE_` で始まっているか確認
- サーバーを再起動（`Ctrl+C` → `npm run dev`）

### エラー: "Firebase: Error (auth/unauthorized-domain)"
- Firebase Consoleの「Authentication」→「Settings」→「Authorized domains」
- `localhost` が追加されているか確認

### Google認証のポップアップがブロックされる
- ブラウザのポップアップブロック設定を確認
- `localhost` を許可リストに追加

## 次のステップ

Firebase認証が正常に動作したら、次の機能を実装します：

1. ✅ Firebase認証の実装（完了）
2. 📝 ユーザー情報補完画面（SSO後）
3. 🌐 サイト登録画面（STEP 1～5）
4. 📊 GA4・Search Console連携
5. 🤖 Gemini AI分析機能

