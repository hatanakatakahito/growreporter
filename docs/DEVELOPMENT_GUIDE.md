# 📖 GrowReporter 開発ガイド

## 目次
1. [開発環境セットアップ](#1-開発環境セットアップ)
2. [SSO優先実装戦略](#2-sso優先実装戦略)
3. [開発フロー](#3-開発フロー)
4. [コーディング規約](#4-コーディング規約)
5. [テスト戦略](#5-テスト戦略)

---

## 1. 開発環境セットアップ

### 1.1 前提条件
- Node.js 18以上
- npm または yarn
- Firebase CLI
- Git

### 1.2 初期セットアップ

```bash
# 1. Firebase プロジェクト作成
firebase login
firebase projects:create growreporter-prod

# 2. リポジトリクローン
git clone <repository-url>
cd growreporter

# 3. 依存関係インストール
npm install

# 4. Firebase 初期化
firebase init hosting:github
firebase init emulators

# 5. 環境変数設定
cp .env.example .env.local
```

### 1.3 環境変数設定

```bash
# .env.local
NEXT_PUBLIC_FIREBASE_PROJECT_ID=growreporter-prod
NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true
NEXT_PUBLIC_USE_MOCK_API=true

# Firebase Functions 環境変数
firebase functions:config:set \
  google.analytics_client_id="your_client_id" \
  google.analytics_client_secret="your_client_secret" \
  microsoft.client_id="your_microsoft_id" \
  gemini.api_key="your_gemini_key"
```

### 1.4 開発サーバー起動

```bash
# ローカル開発（推奨）
npm run dev:mock

# Firebase Emulator 使用
firebase emulators:start
npm run dev

# 本番環境テスト
npm run build
firebase deploy --only hosting:dev
```

---

## 2. SSO優先実装戦略

### 2.1 実装優先順位

```
🔑 Phase 1: SSO基盤構築（最優先）
├── Firebase Authentication
├── Google OAuth (GA4 + Search Console)
└── セキュリティ対策

📊 Phase 2: API統合確認
├── 実API呼び出しテスト
├── データ取得・正規化
├── エラーハンドリング
└── 統合テスト

🏗️ Phase 3: 機能実装
├── ダッシュボード
├── AI分析
├── カスタムKPI
└── その他機能
```

### 2.2 SSO実装チェックリスト

#### Week 1: 基本認証
```bash
□ Firebase Authentication 設定
□ Google OAuth 2.0 設定
□ Microsoft OAuth 2.0 設定
□ マルチプロバイダー認証実装
□ ユーザー登録・ログインフロー
□ セッション管理実装
```

#### Week 2: API連携
```bash
□ GA4 API スコープ設定・接続テスト
□ Search Console API スコープ設定・接続テスト
□ 認証情報暗号化保存
□ トークンリフレッシュ機構
□ セキュリティ対策実装
```

---

## 3. 開発フロー

### 3.1 ハイブリッド開発戦略

```bash
🏠 ローカル開発 (90%の時間)
├── Next.js dev server (即座にリロード)
├── Firebase Emulator (オフライン)
├── モックデータ使用
└── 高速な試行錯誤

🌐 本番環境確認 (10%の時間)
├── 週1-2回の統合確認
├── 実API・実データでテスト
├── パフォーマンス・セキュリティ確認
└── ステークホルダーデモ
```

### 3.2 日常的な開発サイクル

```bash
# 1. 機能開発開始
git checkout -b feature/new-feature

# 2. ローカル開発
npm run dev:mock  # 高速開発

# 3. 機能完成後、本番確認
git push origin feature/new-feature
# → Firebase App Hosting プレビューで確認

# 4. レビュー・マージ
# プルリクエスト作成 → レビュー → マージ

# 5. 統合確認
develop → staging → main の順でリリース
```

### 3.3 ブランチ戦略

```bash
main (本番)
├── staging (ステージング・レビュー用)
├── develop (開発統合)
├── feature/auth-system (機能開発)
├── feature/dashboard (機能開発)
└── feature/ai-analysis (機能開発)

# Firebase App Hosting 自動デプロイ
main → https://growreporter.com
staging → https://staging-growreporter.web.app
develop → https://dev-growreporter.web.app
feature/* → https://pr-123-growreporter.web.app
```

---

## 4. コーディング規約

### 4.1 TypeScript 規約

```typescript
// ✅ 良い例
interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  createdAt: Date;
}

const fetchUserProfile = async (userId: string): Promise<UserProfile> => {
  // 実装
};

// ❌ 悪い例
const fetchUser = async (id: any) => {
  // any型の使用は避ける
};
```

### 4.2 React コンポーネント規約

```typescript
// ✅ 良い例
interface DashboardProps {
  userId: string;
  siteId: string;
}

export function Dashboard({ userId, siteId }: DashboardProps) {
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    // 副作用処理
  }, [userId, siteId]);
  
  return (
    <MDBContainer>
      {/* JSX */}
    </MDBContainer>
  );
}

// ❌ 悪い例
export default function Dashboard(props: any) {
  // propsの型定義なし、default export
}
```

### 4.3 ファイル・フォルダ命名規約

```bash
# ファイル命名
components/auth/SignInForm.tsx        # PascalCase
lib/auth/google-oauth.ts             # kebab-case
types/auth.ts                        # lowercase
constants/api-endpoints.ts           # kebab-case

# フォルダ命名
src/components/dashboard/            # lowercase
src/lib/api-clients/                # kebab-case
```

### 4.4 設計原則の遵守

```typescript
// constants/design-principles.ts
export const DESIGN_PRINCIPLES = {
  UI: {
    LIGHT_MODE_ONLY: true,           // ダークモード禁止
    HIGH_CONTRAST: true,             // 高コントラスト必須
    LARGE_FONTS: true,               // 大きめフォント
    GENEROUS_SPACING: true           // 豊富な余白
  },
  
  UX: {
    TARGET_USERS: 'non-technical users',  // 素人向け
    SIMPLICITY_OVER_FEATURES: true,       // シンプル重視
    CLEAR_NAVIGATION: true,               // 明確なナビゲーション
    HELPFUL_TOOLTIPS: true                // 親切なツールチップ
  }
} as const;

// 使用例
if (!DESIGN_PRINCIPLES.UI.LIGHT_MODE_ONLY) {
  throw new Error('ダークモードは実装しない方針です');
}
```

---

## 5. テスト戦略

### 5.1 テスト種別

```bash
# ユニットテスト
src/__tests__/components/           # コンポーネントテスト
src/__tests__/lib/                  # ビジネスロジックテスト
src/__tests__/utils/                # ユーティリティテスト

# 統合テスト
tests/integration/                  # API統合テスト
tests/e2e/                         # E2Eテスト

# テスト実行
npm run test                       # 全テスト実行
npm run test:watch                 # ウォッチモード
npm run test:coverage              # カバレッジ測定
```

### 5.2 SSO テスト

```typescript
// __tests__/auth/google-oauth.test.ts
describe('Google OAuth', () => {
  test('should connect to GA4 API successfully', async () => {
    const mockCredentials = {
      accessToken: 'mock_token',
      refreshToken: 'mock_refresh_token'
    };
    
    const result = await googleOAuthManager.connectGoogleAPIs('user123');
    
    expect(result.connected).toBe(true);
    expect(result.email).toBeDefined();
  });
  
  test('should handle API connection failure', async () => {
    // エラーケースのテスト
  });
});
```

### 5.3 API統合テスト

```typescript
// tests/integration/api-integration.test.ts
describe('API Integration', () => {
  test('should fetch real GA4 data', async () => {
    const apiClient = new ProductionAPIClient();
    const data = await apiClient.getGA4Data('property123', dateRange);
    
    expect(data.sessions).toBeGreaterThan(0);
    expect(data.users).toBeGreaterThan(0);
  });
});
```

---

## 📋 開発チェックリスト

### 機能開発前
```bash
□ 要件・仕様の確認
□ 設計原則の確認
□ 既存コードの理解
□ テスト計画の策定
```

### 開発中
```bash
□ TypeScript 型定義の適切な使用
□ コンポーネントの適切な分割
□ エラーハンドリングの実装
□ ユニットテストの作成
```

### 開発完了後
```bash
□ コードレビューの実施
□ 統合テストの実行
□ パフォーマンステスト
□ セキュリティチェック
□ ドキュメントの更新
```

---

**最終更新**: 2024年12月
**バージョン**: 1.0.0
