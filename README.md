# GrowReporter - 統合Web分析プラットフォーム

## 📋 プロジェクト概要

**GrowReporter**は、Google Analytics 4、Search Console、Microsoft Clarityを統合し、AI分析による実行可能な改善提案を提供するWebサイト分析プラットフォームです。

### 基本情報
- **開発会社**: GrowGroup株式会社
- **開発期間**: 16-17週間（約4ヶ月）
- **推定運用コスト**: 月額¥8,000-30,000
- **対象ユーザー**: GrowGroup顧客 → 一般ユーザーへ展開

## 🚀 クイックスタート

### 環境構築
```bash
# 1. リポジトリクローン
git clone <repository-url>
cd growreporter

# 2. 依存関係インストール
npm install

# 3. 環境変数設定
cp .env.example .env.local
# 必要な環境変数を設定

# 4. Firebase Emulator 起動
firebase emulators:start

# 5. 開発サーバー起動
npm run dev
```

### 主要コマンド
```bash
npm run dev              # 開発サーバー起動
npm run dev:mock         # モックデータ使用開発
npm run build            # プロダクションビルド
npm run test             # テスト実行
firebase deploy          # デプロイ
```

## 📚 ドキュメント

### 開発ドキュメント
- [📖 開発ガイド](./docs/DEVELOPMENT_GUIDE.md) - 開発手順・ルール
- [🏗️ アーキテクチャ](./docs/ARCHITECTURE.md) - システム構成
- [🔑 SSO実装ガイド](./docs/SSO_IMPLEMENTATION.md) - 認証システム実装
- [🎨 UI/UXガイドライン](./docs/UI_GUIDELINES.md) - デザイン原則
- [🔒 セキュリティガイド](./docs/SECURITY.md) - セキュリティ対策

### API・技術仕様
- [📡 API仕様書](./docs/API_SPECIFICATION.md) - API設計・仕様
- [🗄️ データベース設計](./docs/DATABASE_DESIGN.md) - DB構造・スキーマ
- [🤖 AI分析仕様](./docs/AI_ANALYSIS.md) - AI機能・プロンプト設計

### 運用・管理
- [⚙️ デプロイガイド](./docs/DEPLOYMENT.md) - デプロイ手順
- [📊 監視・ログ](./docs/MONITORING.md) - 監視・ログ管理
- [🛠️ トラブルシューティング](./docs/TROUBLESHOOTING.md) - 問題解決

## 🛠️ 技術スタック

### フロントエンド
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **UI Library**: Material Design for Bootstrap v5
- **Styling**: ライトモードのみ（素人向けUI）

### バックエンド
- **Platform**: Firebase App Hosting
- **Functions**: Firebase Cloud Functions
- **Runtime**: Node.js 18 + TypeScript

### データベース・認証
- **Primary DB**: Firestore
- **Cache**: Firebase Realtime Database
- **Authentication**: Firebase Authentication + OAuth 2.0

### AI・セキュリティ
- **AI Model**: Google Gemini API
- **Framework**: LangChain
- **Security**: ユーザー個別セッション管理

## 📅 開発スケジュール

### Phase 1: SSO基盤構築（Week 1-2）
- Firebase Authentication + マルチプロバイダー
- Google OAuth (GA4 + Search Console)
- Microsoft OAuth (Clarity)

### Phase 2: API統合確認（Week 3）
- 実際のAPI呼び出しテスト
- データ取得・正規化処理
- エラーハンドリング・セキュリティ対策

### Phase 3: 機能実装（Week 4-17）
- ダッシュボード実装
- AI分析機能
- カスタムKPI管理
- レポート共有機能
- 管理者パネル

## 🎯 現在の開発状況

### 完了済み
- ✅ 要件定義・技術選定
- ✅ アーキテクチャ設計
- ✅ 開発ドキュメント作成

### 進行中
- 🔄 SSO基盤構築（Phase 1）

### 予定
- ⏳ API統合確認（Phase 2）
- ⏳ 機能実装（Phase 3）

## 🤝 開発ルール

### コミット規約
```
feat: 新機能追加
fix: バグ修正
docs: ドキュメント更新
style: コードスタイル修正
refactor: リファクタリング
test: テスト追加・修正
chore: その他の変更
```

### ブランチ戦略
```
main          # 本番環境
staging       # ステージング環境
develop       # 開発統合
feature/*     # 機能開発
hotfix/*      # 緊急修正
```

## 📞 サポート・連絡先

開発に関する質問や問題がある場合は、以下を参照してください：

1. [トラブルシューティング](./docs/TROUBLESHOOTING.md)
2. [開発ガイド](./docs/DEVELOPMENT_GUIDE.md)
3. プロジェクトチームへの連絡

---

**最終更新**: 2024年12月
**バージョン**: 1.0.0
