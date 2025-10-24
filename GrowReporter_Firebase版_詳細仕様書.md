# GrowReporter Firebase版 詳細仕様書

## 1. アプリケーション概要

**GrowReporter**は、Firebaseをバックエンドとして使用する包括的なウェブサイト分析・改善管理システムです。Google Analytics 4（GA4）とGoogle Search Console（GSC）のデータを統合し、AIを活用した分析と改善提案を提供するWebアプリケーションです。

## 2. 技術スタック

### 2.1 フロントエンド
- **React 19.0.0**: メインのUIフレームワーク
- **Vite 6.2.0**: ビルドツールと開発サーバー
- **React Router DOM 7.2.0**: ルーティング管理
- **TanStack Query**: データフェッチングとキャッシュ管理
- **Tailwind CSS 4.0.9**: スタイリング
- **TailGrids React Pro**: プロフェッショナルなUIコンポーネントライブラリ
- **ApexCharts 3.40.0**: 高度なデータ可視化
- **React ApexCharts 1.4.0**: ApexChartsのReactラッパー
- **Swiper 9.3.2**: スライダー・カルーセル
- **NoUISlider 15.7.0**: レンジスライダー
- **JSVectorMap 1.5.3**: 地図可視化
- **React Hook Form 7.54.2**: フォーム管理
- **Zod**: スキーマバリデーション

### 2.2 バックエンド・インフラ
- **Firebase Authentication**: ユーザー認証システム
- **Firebase Firestore**: NoSQLデータベース
- **Firebase Functions**: サーバーレス関数
- **Firebase Storage**: ファイルストレージ
- **Google Analytics 4 API**: データ取得
- **Google Search Console API**: SEOデータ取得
- **Google Gemini API**: AI分析機能（gemini-2.5-flash）

### 2.3 開発ツール
- **ESLint**: コード品質管理
- **TypeScript**: 型安全性
- **PostCSS**: CSS処理
- **Autoprefixer**: ブラウザ互換性
- **Prettier**: コードフォーマッター
- **Prettier Plugin TailwindCSS**: Tailwind CSS用フォーマッター

## 3. 認証システム

### 3.1 ユーザー登録方式

#### 3.1.1 ログイン画面デザイン
**URL**: `/login`

**画面レイアウト:**
- **左パネル**: ブランディング・説明エリア
  - GROW REPORTERロゴ（青いGアイコン）
  - 説明文: "GA4、Search Console、Clarityのデータを統合分析し、ビジネス成長をサポートします。"
  - イラストレーション: スマートフォンとユーザーの図解

- **右パネル**: ログインフォーム
  - タブ切り替え: "ログイン" / "新規ユーザー登録"（新規登録は `/register` へリンク）
  - ネイティブログイン:
    - メールアドレス（封筒アイコン付き）
    - パスワード（目アイコン付き）
    - "ログイン"ボタン
  - Google SSO:
    - Googleロゴ付き"Googleでログイン"ボタン

#### 3.1.2 新規ユーザー登録画面デザイン
**URL**: `/register`

**画面レイアウト:**
- **左パネル**: ブランディング・説明エリア（ログイン画面と同様）

- **右パネル**: 登録フォーム
  - タブ切り替え: "ログイン"（`/login` へリンク） / "新規ユーザー登録"
  - 必須項目（赤ラベル）:
    - 組織名（必須）
    - 姓（必須）
    - 名（必須）
    - 電話番号（必須）
    - 業界・業種（ドロップダウン選択、11の選択肢）
    - メールアドレス（必須、封筒アイコン付き）
    - パスワード（必須、6文字以上・大文字1つ、目アイコン付き）
  - 登録ボタン: "アカウントを作成"

#### 3.1.3 GoogleアカウントSSO
- **Firebase Auth Google Provider**: Googleアカウントでの認証
- **自動プロフィール取得**: 名前、メールアドレス、プロフィール画像の自動取得
- **情報補完フォーム**: Googleから取得できない情報の入力
  - 組織名（必須）
  - 電話番号（必須）
  - 業界・業種（選択式、11の選択肢）
  - その他の追加情報
- **リダイレクト**: 情報補完後は `/register/complete` へ遷移

#### 3.1.4 ネイティブ登録
- **メール/パスワード認証**: Firebase Auth Email/Password
- **バリデーション**: 強力なパスワード要件
- **メール確認**: 登録時のメール確認機能
- **リダイレクト**: 登録完了後は `/register/complete` へ遷移

### 3.1.5 ルーティング設計

#### 3.1.5.1 認証関連URL
```typescript
const authRoutes = {
  login: '/login',
  register: '/register',
  registerComplete: '/register/complete',
  profileComplete: '/profile/complete',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',
  emailVerification: '/email-verification'
};
```

#### 3.1.5.2 ナビゲーション設計
- **ログイン画面** (`/login`):
  - 新規登録へのリンク: "新規ユーザー登録" → `/register`
  - パスワード忘れリンク: "パスワードを忘れた方" → `/forgot-password`

- **登録画面** (`/register`):
  - ログインへのリンク: "ログイン" → `/login`
  - 登録完了後: `/register/complete` → サイト登録画面へ

- **情報補完画面** (`/register/complete`):
  - Google SSO後の情報補完
  - 完了後: サイト登録画面へ遷移

### 3.1.6 既存コードの活用

#### 3.1.6.1 GitHub v0.3.0からの移植
- **ログイン画面**: v0.3.0の実装をベースにFirebase認証に適応
- **ユーザー登録画面**: v0.3.0のフォーム構造をベースにGROW REPORTER仕様にカスタマイズ
- **認証フロー**: 既存の認証ロジックをFirebase Authに移植
- **フォームバリデーション**: 既存のバリデーション機能を活用

#### 3.1.6.2 カスタマイズポイント
- **GROW REPORTERブランディング**: ロゴとカラーテーマの適用
- **業界・業種選択**: 11の選択肢への更新
- **必須項目**: 組織名、電話番号の追加
- **Firebase統合**: Firebase Auth、Firestoreとの連携

### 3.2 ユーザー情報管理

#### 3.2.1 ユーザープロフィール構造
```typescript
interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  firstName: string;
  lastName: string;
  company: string; // 組織名（必須）
  position?: string;
  phoneNumber: string; // 電話番号（必須）
  industry: string; // 業界・業種（必須）
  createdAt: Timestamp;
  updatedAt: Timestamp;
  isProfileComplete: boolean;
  onboardingCompleted: boolean;
}
```

#### 3.2.2 情報補完フロー
1. **SSO認証後**: 不足情報の確認
2. **補完フォーム表示** (`/register/complete`): 必須項目の入力
   - 組織名（必須）
   - 電話番号（必須）
   - 業界・業種（選択式）
3. **バリデーション**: 入力内容の検証
4. **プロフィール保存**: Firestoreへの保存
5. **サイト登録画面へ遷移**: 次のステップへ

#### 3.2.3 業界・業種選択肢
```typescript
const industryOptions = [
  { value: '', label: '選択してください' },
  { value: 'internet', label: 'インターネット、通信事業' },
  { value: 'manufacturing', label: '製造業' },
  { value: 'retail', label: '小売業' },
  { value: 'finance', label: '金融・保険業' },
  { value: 'real_estate', label: '不動産業' },
  { value: 'food_hospitality', label: '飲食・宿泊業' },
  { value: 'medical_welfare', label: '医療・福祉' },
  { value: 'education', label: '教育' },
  { value: 'service', label: 'サービス業' },
  { value: 'other', label: 'その他' }
];
```

## 4. サイト登録システム（5ステップ）

### 4.1 STEP 1: サイト情報入力

#### 4.1.1 基本情報
```typescript
interface SiteBasicInfo {
  siteName: string;
  siteUrl: string;
  siteType: 'corporate' | 'ecommerce' | 'blog' | 'portfolio' | 'other';
  businessType: 'b2b' | 'b2c' | 'b2b2c' | 'nonprofit';
  industry: string;
  description?: string;
}
```

#### 4.1.2 バリデーション
- **サイトURL**: 有効なURL形式の確認
- **サイト名**: 必須項目、重複チェック
- **サイトタイプ**: 選択必須
- **ビジネスタイプ**: 選択必須

### 4.2 STEP 2: GA4連携

#### 4.2.1 OAuth認証フロー
```typescript
interface GA4Connection {
  propertyId: string;
  propertyName: string;
  accountId: string;
  accountName: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Timestamp;
  scopes: string[];
}
```

#### 4.2.2 認証手順
1. **Google OAuth認証**: GA4アカウントでの認証
2. **プロパティ選択**: 複数プロパティがある場合の選択
3. **権限確認**: 必要な権限の確認
4. **トークン保存**: 暗号化してFirestoreに保存

#### 4.2.3 複数サイト対応
- **サイト別トークン管理**: 各サイトごとの認証情報
- **トークン更新**: 自動的なリフレッシュトークン更新
- **権限分離**: サイト間でのデータアクセス制御

### 4.3 STEP 3: Search Console連携

#### 4.3.1 GSC認証フロー
```typescript
interface GSCConnection {
  siteUrl: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Timestamp;
  scopes: string[];
}
```

#### 4.3.2 認証手順
1. **Google OAuth認証**: GSCアカウントでの認証
2. **サイト選択**: 登録済みサイトの選択
3. **権限確認**: Search Console API権限の確認
4. **トークン保存**: 暗号化してFirestoreに保存

### 4.4 STEP 4: コンバージョン設定（任意）

#### 4.4.1 コンバージョンイベント設定
```typescript
interface ConversionEvent {
  eventName: string;
  displayName: string;
  description?: string;
  category: 'purchase' | 'lead' | 'engagement' | 'custom';
  isActive: boolean;
  createdAt: Timestamp;
}
```

#### 4.4.2 設定手順
1. **イベント一覧取得**: GA4から利用可能なイベントを取得
2. **カスタムイベント追加**: ユーザー定義のイベント
3. **表示名設定**: 分かりやすい名前の設定
4. **カテゴリ分類**: イベントの分類

### 4.5 STEP 5: KPI設定（任意）

#### 4.5.1 KPI設定構造
```typescript
interface KPISettings {
  targetSessions: number;
  targetUsers: number;
  targetConversions: number;
  targetConversionRate: number;
  kpiList: Array<{
    id: string;
    metric: string;
    label: string;
    target: number;
    period: 'monthly' | 'quarterly' | 'yearly';
    isActive: boolean;
  }>;
}
```

#### 4.5.2 設定手順
1. **基本KPI設定**: セッション、ユーザー、コンバージョン目標
2. **カスタムKPI追加**: ユーザー定義の指標
3. **期間設定**: 目標達成期間の設定
4. **優先度設定**: KPIの重要度設定

## 5. データ構造

### 5.1 Firestoreコレクション設計

#### 5.1.1 users コレクション
```typescript
interface UserDocument {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  firstName: string;
  lastName: string;
  company?: string;
  position?: string;
  phoneNumber?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  isProfileComplete: boolean;
  onboardingCompleted: boolean;
  subscription?: {
    plan: 'free' | 'pro' | 'enterprise';
    status: 'active' | 'inactive' | 'cancelled';
    expiresAt: Timestamp;
  };
}
```

#### 5.1.2 sites コレクション
```typescript
interface SiteDocument {
  id: string;
  userId: string;
  siteName: string;
  siteUrl: string;
  siteType: string;
  businessType: string;
  industry: string;
  description?: string;
  metaTitle?: string;
  metaDescription?: string;
  pcScreenshotUrl?: string;
  mobileScreenshotUrl?: string;
  
  // GA4連携情報
  ga4Connection?: {
    propertyId: string;
    propertyName: string;
    accountId: string;
    accountName: string;
    accessToken: string; // 暗号化
    refreshToken: string; // 暗号化
    expiresAt: Timestamp;
    scopes: string[];
    isActive: boolean;
  };
  
  // GSC連携情報
  gscConnection?: {
    siteUrl: string;
    accessToken: string; // 暗号化
    refreshToken: string; // 暗号化
    expiresAt: Timestamp;
    scopes: string[];
    isActive: boolean;
  };
  
  // コンバージョン設定
  conversionEvents: ConversionEvent[];
  
  // KPI設定
  kpiSettings: KPISettings;
  
  // 設定状況
  setupStep: number;
  setupCompleted: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### 5.1.3 improvements コレクション
```typescript
interface ImprovementDocument {
  id: string;
  siteId: string;
  userId: string;
  title: string;
  description: string;
  category: 'acquisition' | 'content' | 'design' | 'feature' | 'other';
  priority: 'high' | 'medium' | 'low';
  status: 'draft' | 'in_progress' | 'completed';
  expectedImpact?: string;
  actualImpact?: string;
  completedAt?: Timestamp;
  evaluationData?: {
    beforeMetrics: Record<string, number>;
    afterMetrics: Record<string, number>;
    improvementRate: number;
    notes?: string;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 5.2 セキュリティルール

#### 5.2.1 Firestore Security Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // ユーザー情報のアクセス制御
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // サイト情報のアクセス制御
    match /sites/{siteId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == resource.data.userId;
    }
    
    // 改善課題のアクセス制御
    match /improvements/{improvementId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == resource.data.userId;
    }
  }
}
```

## 6. UI/UX設計

### 6.1 デザインシステム
- **TailGrids React Pro**: プロフェッショナルなUIコンポーネントライブラリ
- **GROW REPORTERブランディング**: 青いGアイコンとモダンなロゴデザイン
- **カラーパレット**: ブルー系を基調としたモダンなデザイン
- **タイポグラフィ**: 読みやすいフォントサイズと行間
- **レスポンシブ**: モバイル・タブレット・デスクトップ対応
- **ダークモード**: 完全なダークモード対応
- **2パネルレイアウト**: 左パネル（ブランディング）・右パネル（フォーム）の構成

### 6.2 ナビゲーション
- **サイドバー**: 階層的なメニュー構造（VerticalNavbar）
- **ドロップダウンメニュー**: 直感的なサブメニュー
- **ブレッドクラム**: 現在位置の明確化
- **クイックアクション**: 主要機能への直接アクセス

### 6.3 データ可視化
- **ApexCharts**: 高度なインタラクティブチャート
- **データ統計カード**: 指標の分かりやすい表示（DataStats）
- **テーブル**: ソート・フィルタ機能付き（TableStack）
- **プログレスバー**: KPI達成率の視覚化
- **地図可視化**: JSVectorMapによる地理的データ表示

### 6.4 利用可能なコンポーネント

#### 6.4.1 ダッシュボードコンポーネント
- **DataStats**: データ統計カード（売上、ユーザー数、注文数など）
- **Chart**: ApexChartsによる高度なグラフ
- **TableStack**: ユーザーリストやデータテーブル
- **VerticalNavbar**: サイドバーナビゲーション
- **Calendar**: カレンダー機能
- **ChatBox/ChatList**: チャット機能
- **Profile**: ユーザープロフィール
- **SettingsPage**: 設定ページ

#### 6.4.2 アプリケーションコンポーネント
- **Signin**: ログイン・認証フォーム（GROW REPORTER専用デザイン）
- **Card**: 各種カードコンポーネント
- **Modal**: モーダルダイアログ
- **Table**: データテーブル
- **Contact**: お問い合わせフォーム
- **Blog**: ブログ関連コンポーネント

#### 6.4.3 コアコンポーネント
- **Buttons**: 各種ボタンコンポーネント（GROW REPORTER専用スタイル）
- **Forms**: フォーム要素（必須ラベル、アイコン付き入力フィールド）
- **Alerts**: アラート・通知
- **Badges**: バッジ・タグ
- **Progress**: プログレスバー
- **Spinners**: ローディングスピナー
- **Toast**: トースト通知
- **Tooltip**: ツールチップ
- **Input Fields**: 封筒アイコン、目アイコン付きの入力フィールド
- **Dropdown**: 業界・業種選択用ドロップダウン（11の選択肢）

#### 6.4.4 マーケティングコンポーネント
- **Hero**: ヒーローセクション
- **About**: 会社概要
- **Services**: サービス紹介
- **Pricing**: 料金プラン
- **Testimonials**: お客様の声
- **Newsletter**: ニュースレター登録

## 7. 主要機能

### 7.1 ダッシュボード機能

#### 7.1.1 サイト選択
- **複数サイト対応**: ユーザーが管理する全サイトの表示
- **サイト切り替え**: ドロップダウンでの簡単切り替え
- **設定状況表示**: 各サイトの設定完了状況

#### 7.1.2 期間選択
- **カレンダーUI**: 直感的な期間選択
- **プリセット期間**: 過去30日、90日、1年など
- **カスタム期間**: 任意の期間設定

#### 7.1.3 主要指標表示
- **セッション数**: 期間内のセッション総数
- **ユーザー数**: ユニークユーザー数
- **ページビュー数**: 総ページビュー数
- **エンゲージメント率**: エンゲージしたセッションの割合
- **コンバージョン数**: 設定されたイベントの発生数
- **コンバージョン率**: セッションに対するコンバージョン率

### 7.2 分析機能

#### 7.2.1 全体サマリー
- **主要指標サマリ**: 6つの重要指標の表示
- **前期間比較**: 前月、前年同月との比較
- **トレンド表示**: 期間内の推移グラフ
- **AI分析**: Gemini 2.5 Flashによる自動分析レポート

#### 7.2.2 時系列分析
- **日別分析**: 日単位での詳細なデータ表示
- **曜日別分析**: 曜日パターンの分析
- **時間帯別分析**: 時間帯ごとのアクセス傾向

#### 7.2.3 集客分析
- **集客チャネル**: トラフィックソース別の分析
- **キーワード分析**: 検索流入キーワードの分析
- **被リンク元**: リファラルサイトの分析

#### 7.2.4 エンゲージメント分析
- **ページ別分析**: 個別ページのパフォーマンス
- **ページ分類別**: カテゴリ別の分析
- **ランディングページ**: 入口ページの分析
- **ファイルダウンロード**: ダウンロード行動の追跡
- **外部リンククリック**: 外部リンクのクリック分析

#### 7.2.5 コンバージョン分析
- **コンバージョン一覧**: 設定されたイベントの詳細
- **逆算フロー**: コンバージョンまでの経路分析
- **ファネル分析**: コンバージョン経路の可視化

#### 7.2.6 SEO分析
- **Search Console連携**: 検索パフォーマンスの分析
- **キーワードランキング**: 検索順位の追跡
- **クリック率分析**: CTRの改善提案

### 7.3 改善管理機能

#### 7.3.1 改善課題管理
- **カンバンボード**: 起案・対応中・完了の3段階管理
- **ドラッグ&ドロップ**: 直感的なステータス変更
- **カテゴリ分類**: 集客・コンテンツ・デザイン・機能・その他
- **優先度設定**: 高・中・低の優先度管理

#### 7.3.2 AI改善案生成（Gemini 2.5 Flash）
- **自動生成**: サイトデータに基づく改善提案
- **手動追加**: ユーザーによる改善課題の追加
- **評価機能**: 完了後の効果測定
- **コンテキスト理解**: サイトの特性に応じた提案
- **継続学習**: 過去の改善結果からの学習

### 7.4 レポート機能

#### 7.4.1 レポート生成（Gemini 2.5 Flash）
- **PDF出力**: 高品質なPDFレポート
- **Excel出力**: データ分析用のExcelファイル
- **カスタムレポート**: ユーザー定義のレポート
- **AI要約**: データの自動要約とインサイト抽出
- **多言語レポート**: 日本語・英語でのレポート生成

#### 7.4.2 スケジュール配信
- **定期レポート**: 週次・月次の自動配信
- **メール配信**: 指定されたメールアドレスへの送信
- **ダッシュボード共有**: チームメンバーとの共有

## 8. AI分析機能

### 8.1 AI分析エンジン（Gemini 2.5 Flash）

#### 8.1.1 データ分析
- **パターン認識**: ユーザー行動のパターン分析
- **異常検知**: 通常と異なるデータの検出
- **トレンド分析**: 長期的な傾向の分析
- **マルチモーダル分析**: テキスト・数値・画像データの統合分析

#### 8.1.2 改善提案生成
- **データ駆動提案**: 実際のデータに基づく提案
- **優先度付け**: 効果の高い改善案の優先表示
- **実装難易度**: 実装の容易さの評価
- **ROI予測**: 改善案の投資対効果予測

### 8.2 自然言語処理（Gemini 2.5 Flash）

#### 8.2.1 レポート生成
- **自動要約**: データの自動要約生成
- **インサイト抽出**: 重要な発見の抽出
- **アクションプラン**: 具体的な改善アクションの提案
- **多言語対応**: 日本語・英語でのレポート生成

#### 8.2.2 高度な分析機能
- **センチメント分析**: ユーザーフィードバックの感情分析
- **トピックモデリング**: コンテンツのトピック分類
- **要約生成**: 長文データの簡潔な要約
- **質問応答**: データに関する自然言語での質問応答

## 9. セキュリティ・プライバシー

### 9.1 データ保護

#### 9.1.1 暗号化
- **保存時暗号化**: Firestoreでのデータ暗号化
- **転送時暗号化**: HTTPS通信の強制
- **トークン暗号化**: OAuthトークンの暗号化保存

#### 9.1.2 アクセス制御
- **ユーザー認証**: Firebase Authentication
- **データ分離**: ユーザー別のデータアクセス制御
- **権限管理**: 最小権限の原則

### 9.2 プライバシー対応

#### 9.2.1 データ最小化
- **必要最小限のデータ収集**: 分析に必要なデータのみ
- **匿名化**: 個人を特定できない形でのデータ処理
- **データ保持期間**: 明確なデータ保持期間の設定

#### 9.2.2 ユーザー権利
- **データ削除権**: ユーザーデータの削除機能
- **データエクスポート**: ユーザーデータのエクスポート機能
- **同意管理**: データ利用に関する同意の管理

## 10. パフォーマンス最適化

### 10.1 フロントエンド最適化

#### 10.1.1 コード分割
- **ページ単位分割**: 各ページの遅延読み込み
- **コンポーネント分割**: 再利用可能なコンポーネント
- **動的インポート**: 必要時のみのモジュール読み込み

#### 10.1.2 キャッシュ戦略
- **TanStack Query**: 効率的なデータキャッシュ
- **ブラウザキャッシュ**: 静的リソースのキャッシュ
- **Service Worker**: オフライン対応

### 10.2 バックエンド最適化

#### 10.2.1 Firestore最適化
- **インデックス設計**: 効率的なクエリのためのインデックス
- **バッチ処理**: 複数操作の一括処理
- **リアルタイム更新**: 必要な部分のみの更新

#### 10.2.2 API最適化
- **並列処理**: 複数APIの同時呼び出し
- **エラーハンドリング**: 適切なエラー処理とリトライ
- **レート制限**: API制限の考慮

## 11. 運用・監視

### 11.1 監視システム

#### 11.1.1 アプリケーション監視
- **Firebase Performance**: アプリケーション性能監視
- **Firebase Crashlytics**: クラッシュレポート
- **Google Analytics**: ユーザー行動分析

#### 11.1.2 インフラ監視
- **Firebase Monitoring**: インフラストラクチャ監視
- **アラート設定**: 異常値検知と通知
- **ログ管理**: 構造化ログの管理

### 11.2 バックアップ・復旧

#### 11.2.1 データバックアップ
- **自動バックアップ**: Firestoreの自動バックアップ
- **クロスリージョン**: 複数リージョンでのバックアップ
- **復旧テスト**: 定期的な復旧テスト

#### 11.2.2 災害復旧
- **RTO/RPO**: 復旧時間とデータ損失の目標設定
- **復旧手順**: 明確な復旧手順の文書化
- **訓練**: 定期的な災害復旧訓練

## 12. 開発・デプロイ

### 12.1 開発環境

#### 12.1.1 ローカル開発
- **Firebase Emulator**: ローカルでのFirebase機能テスト
- **Hot Reload**: 開発時の高速リロード
- **デバッグツール**: 開発者向けデバッグ機能

#### 12.1.2 テスト環境
- **Staging環境**: 本番前のテスト環境
- **自動テスト**: CI/CDパイプラインでの自動テスト
- **E2Eテスト**: エンドツーエンドテスト

### 12.1.3 既存コードの活用戦略

#### 12.1.3.1 GitHub v0.3.0からの移植
- **認証画面**: ログイン・登録画面の既存実装をベースに使用
- **フォーム構造**: 既存のフォームコンポーネントを活用
- **バリデーション**: 既存のバリデーションロジックを移植
- **UI/UX**: 既存のデザインパターンをベースにカスタマイズ

#### 12.1.3.2 開発効率の向上
- **実装時間短縮**: 認証部分の開発時間を大幅短縮
- **品質確保**: 既存のテスト済みコードの活用
- **カスタマイズ**: GROW REPORTER仕様への適応に集中

### 12.2 デプロイメント

#### 12.2.1 CI/CD
- **GitHub Actions**: 自動デプロイメント
- **環境分離**: 開発・ステージング・本番環境の分離
- **ロールバック**: 問題発生時の迅速なロールバック

#### 12.2.2 リリース管理
- **バージョン管理**: セマンティックバージョニング
- **変更ログ**: リリースノートの管理
- **段階的リリース**: 段階的な機能リリース

## 13. 今後の拡張予定

### 13.1 機能拡張

#### 13.1.1 高度な分析機能（Gemini 2.5 Flash）
- **予測分析**: 機械学習による予測機能
- **セグメント分析**: ユーザーセグメント別の分析
- **コホート分析**: ユーザーコホートの追跡
- **自然言語クエリ**: データに対する自然言語での質問
- **自動インサイト**: データから自動的に重要な発見を抽出

#### 13.1.2 統合機能
- **サードパーティ連携**: 他のツールとの連携
- **API提供**: 外部システムとの連携API
- **Webhook**: リアルタイムデータ連携

### 13.2 技術改善

#### 13.2.1 パフォーマンス向上
- **CDN活用**: コンテンツ配信の最適化
- **キャッシュ戦略**: より効率的なキャッシュ
- **データ圧縮**: 転送データの最適化

#### 13.2.2 開発効率向上
- **TypeScript完全移行**: 型安全性の向上
- **テスト自動化**: 包括的なテスト自動化
- **ドキュメント自動生成**: API仕様の自動生成

## 14. 環境設定・デプロイメント

### 14.1 環境変数設定

#### 14.1.1 Firebase設定
```bash
# Firebase設定
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

#### 14.1.2 Google API設定
```bash
# Google Analytics 4 API
VITE_GA4_CLIENT_ID=your_ga4_client_id
VITE_GA4_CLIENT_SECRET=your_ga4_client_secret
VITE_GA4_REDIRECT_URI=http://localhost:3000/auth/ga4/callback

# Google Search Console API
VITE_GSC_CLIENT_ID=your_gsc_client_id
VITE_GSC_CLIENT_SECRET=your_gsc_client_secret
VITE_GSC_REDIRECT_URI=http://localhost:3000/auth/gsc/callback
```

#### 14.1.3 AI API設定
```bash
# Google Gemini API
VITE_GEMINI_API_KEY=your_gemini_api_key
VITE_GEMINI_MODEL=gemini-2.5-flash
```

### 14.2 ビルド設定

#### 14.2.1 Vite設定
```javascript
// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: true,
    port: 3000
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    extensions: ['.mjs', '.js', '.jsx', '.ts', '.tsx', '.json']
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu']
        }
      }
    }
  }
})
```

#### 14.2.2 Tailwind設定
```javascript
// tailwind.config.js
module.exports = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        // ... 既存のカラー設定
      }
    }
  },
  plugins: [require("tailwindcss-animate")],
}
```

### 14.3 Firebase設定

#### 14.3.1 Firebase初期化
```javascript
// src/lib/firebase.js
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import { getFunctions } from 'firebase/functions'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)
export const functions = getFunctions(app)
export default app
```

#### 14.3.2 Firestore Security Rules
```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // ユーザー情報のアクセス制御
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // サイト情報のアクセス制御
    match /sites/{siteId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == resource.data.userId;
    }
    
    // 改善課題のアクセス制御
    match /improvements/{improvementId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == resource.data.userId;
    }
    
    // OAuthトークンのアクセス制御
    match /oauth_tokens/{tokenId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == resource.data.userId;
    }
  }
}
```

### 14.4 デプロイメント設定

#### 14.4.1 Firebase Hosting設定
```json
// firebase.json
{
  "hosting": {
    "public": "dist",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "**/*.@(js|css)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "max-age=31536000"
          }
        ]
      }
    ]
  },
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "functions": {
    "source": "functions",
    "runtime": "nodejs18"
  }
}
```

#### 14.4.2 GitHub Actions設定
```yaml
# .github/workflows/deploy.yml
name: Deploy to Firebase

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Build
      run: npm run build
      env:
        VITE_FIREBASE_API_KEY: ${{ secrets.VITE_FIREBASE_API_KEY }}
        VITE_FIREBASE_AUTH_DOMAIN: ${{ secrets.VITE_FIREBASE_AUTH_DOMAIN }}
        VITE_FIREBASE_PROJECT_ID: ${{ secrets.VITE_FIREBASE_PROJECT_ID }}
        VITE_FIREBASE_STORAGE_BUCKET: ${{ secrets.VITE_FIREBASE_STORAGE_BUCKET }}
        VITE_FIREBASE_MESSAGING_SENDER_ID: ${{ secrets.VITE_FIREBASE_MESSAGING_SENDER_ID }}
        VITE_FIREBASE_APP_ID: ${{ secrets.VITE_FIREBASE_APP_ID }}
        VITE_FIREBASE_MEASUREMENT_ID: ${{ secrets.VITE_FIREBASE_MEASUREMENT_ID }}
        VITE_GEMINI_API_KEY: ${{ secrets.VITE_GEMINI_API_KEY }}
        VITE_GEMINI_MODEL: ${{ secrets.VITE_GEMINI_MODEL }}
    
    - name: Deploy to Firebase
      uses: FirebaseExtended/action-hosting-deploy@v0
      with:
        repoToken: '${{ secrets.GITHUB_TOKEN }}'
        firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
        channelId: live
        projectId: your-project-id
```

### 14.5 開発環境設定

#### 14.5.1 ESLint設定
```javascript
// eslint.config.js
import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

export default [
  { ignores: ['dist'] },
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    settings: { react: { version: '18.3' } },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,
      'react/jsx-no-target-blank': 'off',
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },
]
```

#### 14.5.2 PostCSS設定
```javascript
// postcss.config.js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

## 15. まとめ

GrowReporter Firebase版は、Firebaseの強力な機能を活用した包括的なウェブサイト分析・改善管理システムです。認証、データベース、ストレージ、関数実行など、Firebaseの全機能を統合的に活用することで、スケーラブルで安全なアプリケーションを実現します。

特に、複数サイトの管理とOAuth認証の複雑さを適切に処理し、ユーザーフレンドリーなインターフェースを提供することで、実際のビジネス改善に直結する価値を提供することを目指しています。

技術的には、React + Firebase + Gemini 2.5 Flashの組み合わせにより、開発効率とパフォーマンスの両立を図り、継続的な改善と拡張が可能なアーキテクチャを構築しています。

AI分析機能では、Google Gemini 2.5 Flashモデルを活用し、高度な自然言語処理とデータ分析を実現します。これにより、ユーザーは複雑なデータを直感的に理解し、効果的な改善アクションを実行できます。

環境設定については、Vite、Tailwind CSS、ESLint、PostCSSなどの最新の開発ツールを活用し、効率的な開発環境を構築します。Firebase HostingとGitHub Actionsを組み合わせた自動デプロイメントにより、継続的な開発とデプロイメントを実現します。
