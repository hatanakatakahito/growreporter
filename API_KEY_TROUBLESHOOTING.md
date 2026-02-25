# Gemini APIキー トラブルシューティング

## 現在の状況
- 新しいAPIキー: `AIzaSyAUBSORn3sei8n7n0pJC8RkBLC10iMd_sg`
- エラー: **404 Not Found**
- テストしたモデル: `gemini-1.5-flash`, `gemini-2.5-flash-lite` 両方とも404

## 404エラーの原因

404エラーは通常、以下のいずれかが原因です：

1. **Generative Language APIが有効化されていない**
2. **APIキーが正しく作成されていない**
3. **APIキーに必要な権限が付与されていない**

## 解決手順

### 手順1: Google Cloud Consoleでの確認

1. **Google Cloud Consoleにアクセス**
   - https://console.cloud.google.com/
   - プロジェクト `projects/1014499109379` を選択

2. **APIとサービス → ライブラリ**
   - 左メニューから「APIとサービス」→「ライブラリ」を選択
   - 検索ボックスに「Generative Language API」と入力
   - 「Generative Language API」をクリック
   - **「有効にする」ボタンが表示されている場合はクリック**
   - すでに「管理」と表示されている場合は有効化済み

3. **APIとサービス → 認証情報**
   - 左メニューから「APIとサービス」→「認証情報」を選択
   - 作成したAPIキー `AIzaSyAUBSORn3sei8n7n0pJC8RkBLC10iMd_sg` を探す
   - APIキーの右側の「編集」（鉛筆アイコン）をクリック

4. **APIキーの制限を確認**
   - 「APIの制限」セクションを確認
   - 「キーを制限しない」または「Generative Language API」が選択されていることを確認
   - もし他のAPIのみが選択されている場合は、「Generative Language API」を追加
   - 「保存」をクリック

### 手順2: Google AI Studioでの確認（推奨）

Google AI Studioで新しいAPIキーを作成し直すのが最も簡単です：

1. **Google AI Studioにアクセス**
   - https://aistudio.google.com/app/apikey
   - Googleアカウントでログイン

2. **新しいAPIキーを作成**
   - 「Create API Key」ボタンをクリック
   - プロジェクト `growgroupreporter` (ID: 1014499109379) を選択
   - APIキーが生成されます

3. **生成されたAPIキーをコピー**
   - 表示されたAPIキーをコピー（1回しか表示されません）

4. **APIキーをテスト**
   - 以下のコマンドで動作確認：

```powershell
$apiKey = "新しいAPIキー"
$url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=$apiKey"
$body = '{"contents":[{"parts":[{"text":"Hello"}]}]}' | ConvertFrom-Json | ConvertTo-Json -Depth 10
Invoke-RestMethod -Uri $url -Method Post -Body $body -ContentType "application/json"
```

### 手順3: 環境変数の更新

新しいAPIキーが動作したら、以下のファイルを更新：

1. `.env` ファイル
```
VITE_GEMINI_API_KEY=新しいAPIキー
```

2. `functions/.env` ファイル
```
GEMINI_API_KEY=新しいAPIキー
```

3. 開発サーバーとエミュレーターを再起動

## よくある問題

### 問題1: APIキーが無効
**症状**: 403 Forbidden エラー
**解決**: 新しいAPIキーを作成

### 問題2: APIが有効化されていない
**症状**: 404 Not Found エラー（現在の状況）
**解決**: Generative Language APIを有効化

### 問題3: APIキーの制限
**症状**: 403 Forbidden エラー
**解決**: APIキーの制限設定を確認・修正

### 問題4: プロジェクトの課金設定
**症状**: 429 Too Many Requests エラー
**解決**: Google Cloud Consoleで課金を有効化

## 次のステップ

1. **まず**: Google Cloud Consoleで「Generative Language API」が有効化されているか確認
2. **それでも動かない場合**: Google AI Studioで新しいAPIキーを作成
3. **新しいAPIキーで動作確認**: PowerShellスクリプトでテスト
4. **成功したら**: `.env`と`functions/.env`を更新してサーバー再起動

## サポート

それでも解決しない場合は、以下を確認してください：

- Google Cloud Consoleのプロジェクト設定
- 課金アカウントの有効化状態
- APIの利用制限・クォータ設定
