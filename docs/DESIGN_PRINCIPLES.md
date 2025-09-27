# 🎨 GrowReporter 設計原則

## 📋 目次
1. [基本設計原則](#1-基本設計原則)
2. [UI/UX設計原則](#2-uiux設計原則)
3. [技術設計原則](#3-技術設計原則)
4. [セキュリティ設計原則](#4-セキュリティ設計原則)
5. [実装時の注意事項](#5-実装時の注意事項)

---

## 1. 基本設計原則

### 1.1 🎯 プロジェクトの核心原則

```typescript
export const CORE_PRINCIPLES = {
  TARGET_USERS: 'non-technical users',     // 素人ユーザー向け
  SIMPLICITY_FIRST: true,                 // シンプルさ最優先
  DATA_ACCURACY: true,                    // データ精度重視
  SECURITY_FIRST: true,                   // セキュリティ最優先
  SCALABILITY: true                       // スケーラビリティ考慮
} as const;
```

### 1.2 📊 ビジネス価値の優先順位

1. **データの正確性**: 間違ったデータは価値がない
2. **使いやすさ**: 素人でも迷わず使える
3. **セキュリティ**: ユーザーデータの完全保護
4. **パフォーマンス**: ストレスのない操作感
5. **拡張性**: 将来の成長に対応

---

## 2. UI/UX設計原則

### 2.1 🎨 視覚デザイン原則

#### ✅ 必須原則
```typescript
export const UI_PRINCIPLES = {
  // 絶対に守るべき原則
  LIGHT_MODE_ONLY: true,        // ダークモード実装禁止
  HIGH_CONTRAST: true,          // 高コントラスト必須
  LARGE_FONTS: true,            // 大きめフォント（14px以上）
  GENEROUS_SPACING: true,       // 豊富な余白
  INTUITIVE_COLORS: true        // 直感的な色使い
} as const;
```

#### 🎨 色彩ルール
```scss
// 必須カラーパレット
$colors: (
  // 基本色（分かりやすい色合い）
  primary: #1976d2,      // 明るい青（信頼感）
  secondary: #424242,    // グレー（落ち着き）
  success: #4caf50,      // 緑（成功・良い状態）
  warning: #ff9800,      // オレンジ（注意）
  danger: #f44336,       // 赤（危険・悪い状態）
  info: #2196f3,         // 水色（情報）
  
  // 背景色
  background: #ffffff,   // 純白背景
  surface: #f8f9fa,      // 薄いグレー（カード背景）
  
  // テキスト色
  text-primary: #212529,   // 濃いグレー（メインテキスト）
  text-secondary: #6c757d, // 中間グレー（サブテキスト）
  text-muted: #adb5bd      // 薄いグレー（補助テキスト）
);

// データ可視化色
$chart-colors: (
  // トラフィック系（青系）
  sessions: #2196f3,
  users: #1976d2,
  pageviews: #64b5f6,
  
  // コンバージョン系（緑系）
  conversions: #4caf50,
  revenue: #66bb6a,
  
  // 問題・注意系（オレンジ・赤系）
  bounce-rate: #ff9800,
  errors: #f44336
);
```

#### 📏 タイポグラフィルール
```scss
// フォントサイズ（読みやすさ重視）
$font-sizes: (
  h1: 2.5rem,    // 40px
  h2: 2rem,      // 32px
  h3: 1.75rem,   // 28px
  h4: 1.5rem,    // 24px
  body: 1rem,    // 16px（最小サイズ）
  small: 0.875rem // 14px（最小許可サイズ）
);

// フォントウェイト
$font-weights: (
  light: 300,
  regular: 400,
  medium: 500,
  bold: 700
);
```

### 2.2 🧭 ナビゲーション原則

#### 直感的なナビゲーション
```typescript
// ナビゲーション構造
const NAVIGATION_STRUCTURE = {
  maxDepth: 3,              // 最大3階層まで
  breadcrumbs: true,        // パンくずナビ必須
  backButton: true,         // 戻るボタン必須
  clearLabels: true,        // 明確なラベル
  iconWithText: true        // アイコン＋テキスト
};

// メニュー項目の命名規則
const MENU_LABELS = {
  // ❌ 技術用語は避ける
  bad: ['Analytics', 'Metrics', 'KPI'],
  
  // ✅ 分かりやすい日本語
  good: ['サイト分析', '数値確認', '目標管理']
};
```

### 2.3 📱 レスポンシブデザイン原則

```scss
// ブレークポイント
$breakpoints: (
  xs: 0,
  sm: 576px,
  md: 768px,
  lg: 992px,
  xl: 1200px,
  xxl: 1400px
);

// モバイルファースト設計
.dashboard-card {
  // モバイル（デフォルト）
  padding: 1rem;
  font-size: 0.875rem;
  
  // タブレット以上
  @media (min-width: 768px) {
    padding: 1.5rem;
    font-size: 1rem;
  }
  
  // デスクトップ以上
  @media (min-width: 992px) {
    padding: 2rem;
    font-size: 1rem;
  }
}
```

---

## 3. 技術設計原則

### 3.1 🏗️ アーキテクチャ原則

```typescript
export const TECH_PRINCIPLES = {
  // 技術選択原則
  FIREBASE_FIRST: true,           // Firebase優先使用
  TYPESCRIPT_ONLY: true,          // TypeScript必須
  MCP_NOT_REQUIRED_PHASE1: true,  // Phase1ではMCP不使用
  USER_OAUTH_REQUIRED: true,      // ユーザー個別OAuth必須
  
  // パフォーマンス原則
  PAGE_LOAD_TIME: 3000,          // 3秒以内
  API_RESPONSE_TIME: 1000,       // 1秒以内
  CHART_RENDER_TIME: 2000,       // 2秒以内
  
  // スケーラビリティ原則
  STATELESS_DESIGN: true,        // ステートレス設計
  HORIZONTAL_SCALING: true,      // 水平スケーリング対応
  CACHE_STRATEGY: true           // キャッシュ戦略必須
} as const;
```

### 3.2 📝 コード品質原則

```typescript
// TypeScript 厳格設定
const TYPESCRIPT_RULES = {
  strict: true,                  // 厳格モード必須
  noImplicitAny: true,          // any型禁止
  noImplicitReturns: true,      // 戻り値必須
  noUnusedLocals: true,         // 未使用変数禁止
  noUnusedParameters: true      // 未使用パラメータ禁止
};

// 命名規則
const NAMING_CONVENTIONS = {
  components: 'PascalCase',      // UserProfile.tsx
  functions: 'camelCase',        // getUserProfile()
  constants: 'UPPER_SNAKE_CASE', // API_ENDPOINTS
  files: 'kebab-case',          // user-profile.ts
  folders: 'kebab-case'         // api-clients/
};
```

### 3.3 🔄 データフロー原則

```typescript
// データフロー設計
const DATA_FLOW_PRINCIPLES = {
  // 単方向データフロー
  unidirectional: true,
  
  // 状態管理
  stateManagement: {
    local: 'useState/useReducer',    // ローカル状態
    global: 'Context API',           // グローバル状態
    server: 'React Query',           // サーバー状態
    cache: 'Firebase Cache'          // キャッシュ
  },
  
  // エラーハンドリング
  errorBoundaries: true,           // エラー境界必須
  gracefulDegradation: true,       // 段階的劣化
  userFriendlyErrors: true         // ユーザーフレンドリーなエラー
};
```

---

## 4. セキュリティ設計原則

### 4.1 🔒 認証・認可原則

```typescript
export const SECURITY_PRINCIPLES = {
  // 認証原則
  MULTI_FACTOR_AUTH: false,        // Phase1では2FA不要
  USER_OAUTH_ONLY: true,           // ユーザー個別OAuth必須
  TOKEN_ENCRYPTION: true,          // トークン暗号化必須
  SESSION_TIMEOUT: 30 * 60 * 1000, // 30分でタイムアウト
  
  // データ保護原則
  DATA_ENCRYPTION_AT_REST: true,   // 保存時暗号化
  DATA_ENCRYPTION_IN_TRANSIT: true, // 転送時暗号化
  PII_PROTECTION: true,            // 個人情報保護
  GDPR_COMPLIANCE: true,           // GDPR対応
  
  // API セキュリティ
  RATE_LIMITING: true,             // レート制限
  INPUT_VALIDATION: true,          // 入力検証
  OUTPUT_SANITIZATION: true,       // 出力サニタイズ
  CSRF_PROTECTION: true            // CSRF対策
} as const;
```

### 4.2 🛡️ AI セキュリティ原則

```typescript
export const AI_SECURITY_PRINCIPLES = {
  // データ分離
  USER_DATA_ISOLATION: true,       // ユーザーデータ分離必須
  SESSION_BASED_CONTEXT: true,     // セッション単位コンテキスト
  NO_CROSS_USER_DATA: true,        // 他ユーザーデータ参照禁止
  
  // ハルシネーション対策
  FACT_BASED_ONLY: true,           // 事実ベース分析のみ
  NO_SPECULATION: true,            // 推測・憶測禁止
  DATA_SOURCE_CITATION: true,      // データソース明記必須
  
  // 監査・ログ
  AI_USAGE_LOGGING: true,          // AI利用ログ必須
  SECURITY_EVENT_MONITORING: true, // セキュリティイベント監視
  ANOMALY_DETECTION: true          // 異常検知
} as const;
```

---

## 5. 実装時の注意事項

### 5.1 ❌ 禁止事項

```typescript
// 絶対に実装してはいけない機能・設計
const FORBIDDEN_IMPLEMENTATIONS = {
  ui: [
    'ダークモード',
    '小さすぎるフォント（14px未満）',
    '低コントラスト配色',
    '複雑なアニメーション'
  ],
  
  technical: [
    'any型の使用',
    'console.log の本番残留',
    '未処理のPromise',
    'セキュリティホールのあるコード'
  ],
  
  ai: [
    '他ユーザーデータの参照',
    '推測・憶測による分析',
    '根拠のない改善提案',
    'ハルシネーション許容'
  ]
};
```

### 5.2 ✅ 推奨パターン

```typescript
// 推奨する実装パターン
const RECOMMENDED_PATTERNS = {
  // エラーハンドリング
  errorHandling: `
    try {
      const result = await apiCall();
      return { success: true, data: result };
    } catch (error) {
      console.error('API call failed:', error);
      return { 
        success: false, 
        error: 'データの取得に失敗しました。しばらく後でお試しください。' 
      };
    }
  `,
  
  // ローディング状態
  loadingState: `
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiCall();
        setData(data);
      } catch (err) {
        setError('データの読み込みに失敗しました');
      } finally {
        setLoading(false);
      }
    };
  `,
  
  // 型安全なAPI呼び出し
  typeSafeAPI: `
    interface APIResponse<T> {
      success: boolean;
      data?: T;
      error?: string;
    }
    
    async function fetchUserData(userId: string): Promise<APIResponse<UserData>> {
      // 実装
    }
  `
};
```

### 5.3 🔍 コードレビューチェックポイント

```bash
# 必須チェック項目
□ 設計原則の遵守確認
□ TypeScript型定義の適切性
□ エラーハンドリングの実装
□ セキュリティ要件の確認
□ パフォーマンスへの影響
□ ユーザビリティの確認
□ テストの実装
□ ドキュメントの更新

# UI/UX チェック項目
□ ライトモードのみ実装
□ 高コントラスト確認
□ フォントサイズ確認（14px以上）
□ レスポンシブ対応確認
□ 直感的な操作性確認

# セキュリティチェック項目
□ 認証・認可の適切な実装
□ 入力検証の実装
□ 出力サニタイズの実装
□ セキュリティヘッダーの設定
□ ログ・監査の実装
```

---

## 📋 設計原則チェックリスト

### 開発開始前
```bash
□ 対象ユーザー（素人）を意識した設計
□ シンプルさを最優先した機能設計
□ セキュリティ要件の確認
□ パフォーマンス要件の確認
```

### 実装中
```bash
□ UI/UX原則の遵守
□ 技術原則の遵守
□ セキュリティ原則の遵守
□ コード品質原則の遵守
```

### 実装完了後
```bash
□ 設計原則からの逸脱がないか確認
□ ユーザビリティテストの実施
□ セキュリティテストの実施
□ パフォーマンステストの実施
```

---

**重要**: この設計原則は開発中に常に参照し、すべての実装判断の基準とすること。

**最終更新**: 2024年12月
**バージョン**: 1.0.0
