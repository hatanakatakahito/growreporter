# 📡 API設計ガイドライン

## 🔑 SSO & API統合

### Google APIs
- **GA4 API**: `https://analyticsdata.googleapis.com/v1beta/`
- **Search Console API**: `https://searchconsole.googleapis.com/webmasters/v3/`
- **必須スコープ**: `analytics.readonly`, `webmasters.readonly`


### AI API
- **Gemini API**: `https://generativelanguage.googleapis.com/v1/`
- **モデル**: `gemini-pro`

## 🛡️ セキュリティ要件
- ユーザー個別OAuth必須
- 認証情報暗号化保存
- レート制限対策
- エラーハンドリング必須

## 📊 レスポンス形式
```typescript
interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
}
```
