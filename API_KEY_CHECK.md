# Gemini APIキーの確認手順

## 問題
新しく発行したAPIキー `AIzaSyAUBSORn3sei8n7n0pJC8RkBLC10iMd_sg` でも404/400エラーが発生しています。

## 原因
APIキーに **Generative Language API (Gemini API)** へのアクセス権限が付与されていない可能性があります。

## 解決手順

### 1. Google Cloud ConsoleでAPIを有効化

1. **Google Cloud Console**にアクセス
   https://console.cloud.google.com/

2. **プロジェクトを選択**
   - プロジェクトID: `1014499109379` または `growgroupreporter`

3. **APIとサービス** → **ライブラリ**に移動

4. **"Generative Language API"** を検索

5. **「有効にする」**をクリック
   - すでに有効になっている場合は「管理」と表示されます

### 2. APIキーの制限を確認

1. **APIとサービス** → **認証情報**

2. 作成したAPIキーをクリック

3. **APIの制限**セクションを確認
   - 「キーを制限しない」または
   - 「キーを制限」→ **Generative Language API** にチェックが入っているか確認

4. 制限がかかっている場合は、**Generative Language API**を追加して保存

### 3. 別の方法：Google AI Studioで直接確認

1. **Google AI Studio**にアクセス
   https://aistudio.google.com/

2. 左メニューの **「Get API key」** をクリック

3. 既存のAPIキーが表示されるか確認

4. **「Create API key」**で新しいキーを作成
   - 既存のGoogle Cloudプロジェクトを選択
   - または新規プロジェクトを作成

5. 生成されたAPIキーをコピー

### 4. APIキーのテスト

PowerShellで以下のコマンドを実行してテスト：

```powershell
$apiKey = "新しいAPIキー"
$url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=$apiKey"
$body = @{ contents = @( @{ parts = @( @{ text = "Hello" } ) } ) } | ConvertTo-Json -Depth 10
Invoke-RestMethod -Uri $url -Method Post -Body $body -ContentType "application/json"
```

成功すると、AIからの応答が返ってきます。

## よくあるエラーと対処法

### 404 Not Found
- **原因**: モデル名が間違っているか、APIが有効化されていない
- **対処**: Generative Language APIを有効化

### 403 Forbidden
- **原因**: APIキーが無効、または権限がない
- **対処**: 新しいAPIキーを作成、またはAPIの制限を確認

### 400 Bad Request
- **原因**: リクエストの形式が不正、またはAPIキーに問題がある
- **対処**: APIキーを再確認、リクエストボディを確認

## 推奨される利用可能なモデル（2026年2月時点）

テストで成功したモデルを使用してください：

- `gemini-1.5-flash` - 安定版の高速モデル（推奨）
- `gemini-1.5-pro` - より高性能なモデル
- `gemini-pro` - 旧バージョン（非推奨）

**注意**: `gemini-2.5-flash-lite` や `gemini-2.0-flash-exp` などの実験的なモデルは、APIキーによってはアクセスできない場合があります。

## 次のステップ

1. Google Cloud ConsoleでGenerative Language APIを有効化
2. Google AI Studioで新しいAPIキーを作成
3. 作成したAPIキーで `gemini-1.5-flash` モデルをテスト
4. 成功したら、`.env` と `functions/.env` を更新
