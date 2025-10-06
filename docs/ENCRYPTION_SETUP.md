# 🔐 OAuth トークン暗号化セットアップガイド

## 概要

GrowReporterでは、OAuthトークン（アクセストークン・リフレッシュトークン）を **AES-256-GCM** 暗号化方式でFirestoreに保存しています。

---

## セットアップ手順

### 1. 暗号化キーの追加

`.env.local` ファイルに以下の環境変数を追加してください：

```bash
# OAuth Token Encryption Key (AES-256-GCM)
ENCRYPTION_KEY=ZmvyxjvxXRxfTrmpo2XCnjAOhpralCwOo5fCuNpwgos=
```

> **⚠️ 重要:** 
> - この暗号化キーは **本番環境で必ず変更** してください
> - キーを紛失すると、既存のトークンが復号化できなくなります
> - キーは **Git リポジトリにコミットしないでください**

---

### 2. 新しい暗号化キーの生成（オプション）

新しい暗号化キーを生成する場合は、以下のコマンドを実行してください：

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

生成されたキーを`.env.local`の`ENCRYPTION_KEY`に設定してください。

---

## 暗号化の仕組み

### 暗号化アルゴリズム
- **方式**: AES-256-GCM (Galois/Counter Mode)
- **キー長**: 256ビット（32バイト）
- **IV長**: 128ビット（16バイト）- ランダム生成
- **認証タグ**: 128ビット（16バイト）- 完全性検証用

### データフロー

#### 保存時（暗号化）
```
平文トークン
  ↓
[encrypt関数]
  ↓
暗号化されたトークン (Base64)
  ↓
Firestoreに保存
```

#### 取得時（復号化）
```
Firestoreから取得
  ↓
暗号化されたトークン (Base64)
  ↓
[decrypt関数]
  ↓
平文トークン
  ↓
アプリケーションで使用
```

---

## 実装詳細

### 暗号化サービス
- **ファイル**: `src/lib/security/encryption.ts`
- **主要関数**:
  - `encrypt(plainText: string): string` - データを暗号化
  - `decrypt(encryptedData: string): string` - データを復号化
  - `encryptTokens(tokens)` - OAuthトークンを暗号化
  - `decryptTokens(encryptedTokens)` - OAuthトークンを復号化
  - `isEncrypted(data)` - データが暗号化されているか確認

### 統合箇所

#### サーバーサイド（保存時）
- **ファイル**: `src/lib/firebase/adminFirestore.ts`
- **関数**:
  - `saveOAuthTokens()` - 新規トークン保存時に暗号化
  - `updateAccessToken()` - アクセストークン更新時に暗号化

#### クライアントサイド（取得時）
- **ファイル**: `src/lib/firebase/firestoreService.ts`
- **関数**:
  - `getOAuthTokens()` - トークン取得時に復号化

---

## セキュリティ上の注意事項

### ✅ 推奨事項
1. **環境変数の管理**
   - `.env.local` は `.gitignore` に含まれていることを確認
   - Firebase App Hosting の環境変数に本番用キーを設定

2. **キーローテーション**
   - 定期的に暗号化キーを変更（推奨: 6ヶ月ごと）
   - キー変更時は既存トークンの再暗号化が必要

3. **バックアップ**
   - 暗号化キーを安全な場所にバックアップ
   - キー管理サービス（AWS KMS, Google Cloud KMSなど）の使用を検討

### ❌ 禁止事項
1. 暗号化キーをコードにハードコーディング
2. 暗号化キーをGitにコミット
3. 暗号化キーをログに出力
4. 暗号化キーをクライアントサイドで使用

---

## トラブルシューティング

### エラー: "ENCRYPTION_KEY environment variable is not set"

**原因**: `.env.local` に `ENCRYPTION_KEY` が設定されていない

**解決策**:
1. `.env.local` ファイルを開く
2. `ENCRYPTION_KEY=<生成したキー>` を追加
3. サーバーを再起動

---

### エラー: "Failed to decrypt data"

**原因**: 
- 暗号化キーが変更された
- データが破損している
- 暗号化されていないデータを復号化しようとした

**解決策**:
1. 暗号化キーが正しいか確認
2. ユーザーに再度OAuth認証を依頼
3. 古いトークンを削除して新規に取得

---

### 後方互換性

既存の平文トークンがある場合、以下の動作をします：

1. **取得時**: 
   - 暗号化フラグ（`encrypted: true`）がない場合、平文として処理
   - エラーログに警告を出力

2. **保存時**:
   - 新規保存・更新はすべて暗号化
   - 既存の平文トークンは上書きされる

---

## テスト

暗号化・復号化が正常に動作するかテストするには：

```typescript
import { testEncryption } from '@/lib/security/encryption';

const result = testEncryption();
console.log('暗号化テスト:', result ? '成功 ✅' : '失敗 ❌');
```

---

## 参考資料

- [AES-256-GCM暗号化について](https://en.wikipedia.org/wiki/Galois/Counter_Mode)
- [Node.js Crypto Module](https://nodejs.org/api/crypto.html)
- [OWASP Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)

---

## サポート

質問や問題がある場合は、開発チームにお問い合わせください。





