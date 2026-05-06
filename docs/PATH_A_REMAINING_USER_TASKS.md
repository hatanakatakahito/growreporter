# Path A 残タスク一覧（ユーザー実行分）

最終更新: 2026-05-06（dashboard + 手動 trigger UI 追加）

## Code 実装状況

✅ **Phase A (vivid Phase 2 / RAG 注入)**: 全実装完了・syntax/lint クリア・ドライランテスト 4/4 pass
✅ **Phase B (vivid Phase 3 / 管理画面)**: 全実装完了・lint クリア
✅ **Phase C (lively Phase 1+2 / 業界平均ベンチマーク)**: 全実装完了・lint クリア
✅ **バグレビュー**: 4箇所修正済（aggregateMetrics 未使用変数、無効トークンフィルタ、空ドメイン除外、null安全性）
✅ **Firestore rules 互換性**: 既存ルール変更なし、4 collection 新規追加のみ
✅ **moat 保護**: industryBenchmarks の client 直接読取を admin のみに制限済

## ユーザー側でのみ実行可能な残タスク

以下はすべて **ユーザーのコマンド・操作** が必要なものです。Code レベルの不具合修正は完了しています。

### A. 本番デプロイ準備（必須）

#### A-1. GCP コンソールで OAuth クライアントの redirect URI 追加
[GCP Console > Credentials](https://console.cloud.google.com/apis/credentials) で既存の OAuth クライアント（GrowReporter 用）を編集し、Authorized redirect URIs に追加：

```
https://growgroupreporter.web.app/admin/industry-benchmarks/oauth-callback
http://localhost:3000/admin/industry-benchmarks/oauth-callback
```

→ Phase C の lively OAuth フローで使用する

#### A-2. Slack Webhook 準備（オプション、Phase C-D で必要）
`#growreporter-alerts` チャネル作成 + Webhook URL 取得（バッチ失敗通知用）。
現状実装ではログ出力のみで Slack 連携はしていない。必要なら別途追加実装。

#### A-3. 利用規約改訂（Phase D launch 前）
docs/VIVID_PHASE2_DEPLOY.md と lively-aggregating-bobcat.md v1.5「規約への追記が必要」セクション参照。
- 「弊社は受託管理サイトの匿名化集計データを業界平均値の算出に利用することがあります」
- 「集計利用を希望されない場合は、管理者経由で opt-out が可能です」

### B. デプロイ実行

#### B-1. Firestore rules + indexes デプロイ（先行推奨）
```sh
cd c:\Users\hatan\GrowReporterFinal
firebase deploy --only firestore:rules,firestore:indexes
```

→ インデックス構築は数分〜数十分かかる。先にデプロイしておくと B-2 デプロイ後の動作確認がスムーズ。

#### B-2. Functions デプロイ
```sh
firebase deploy --only functions
```

新規/変更される functions:
- `clearAllAICache` (Phase A 新規)
- `getImprovementBenchmarks` (Phase B 新規)
- `getBenchmarkOAuthUrl` / `exchangeBenchmarkOAuthCode` / `listBenchmarkTokens` / `testBenchmarkToken` / `revokeBenchmarkToken` (Phase C 新規)
- `triggerBenchmarkAggregator` / `migrateBenchmarkSourceSites` (Phase C 新規)
- `benchmarkAggregator` (Phase C scheduled、毎月1日 02:00 JST)
- `generateAISummary` / `generateImprovements` (templates.js 改修により再ビルド)

#### B-3. Hosting デプロイ（フロントエンド）
```sh
npm run build
firebase deploy --only hosting
```

### C. 初期データ投入

#### C-1. systemSettings/featureFlags 作成
Firebase Console > Firestore Database で手動作成、または admin UI からの初回アクセスで自動作成（fail-open 設計のため）。

ドキュメントID: `featureFlags`、コレクション: `systemSettings`

```json
{
  "improvementKnowledgeRagInjection": {
    "enabled": true,
    "enabledPrompts": ["comprehensiveImprovement"],
    "debug": { "logInjection": false }
  },
  "industryBenchmarkInjection": {
    "enabled": true
  },
  "benchmarkAggregation": {
    "enabled": true
  }
}
```

→ デプロイ直後は all `false` でも安全。動作確認後に true に切り替えるのが最もリスクが低い。

#### C-2. inspector データ移行
1. `c:\Users\hatan\ga4-gsc-inspector\` で以下を実行（再認証が必要な場合は先に setup）：
   ```sh
   npm run list
   npm run sample
   npm run classify
   ```
2. 生成された 3 ファイルを取得：
   - `output/ga4-properties.json`
   - `output/gsc-sites.json`
   - `output/taxonomy.json`
3. 管理画面 `/admin/industry-benchmarks/migrate` を開く
4. 各 JSON ファイルをアップロード
5. 「投入実行」ボタン

→ 結果サマリで「処理対象 / 新規 / スキップ」を確認

#### C-3. ベンチマーク用 OAuth アカウント追加
管理画面 `/admin/industry-benchmarks/tokens` で：
1. 「+ アカウント追加」ボタン
2. Google OAuth で webmaster@grow-group.jp を選択
3. 認証完了 → トークン保存
4. 同じく ads@、analytics@（解除後）、analytics-02@ も追加

→ 管理画面で 4アカウント全て status=active になる

#### C-4. Phase A デプロイ後のキャッシュクリア
**管理画面 `/admin/industry-benchmarks` → 「AI キャッシュ全削除」ボタンで実行可能**。

curl 等の追加コマンドは不要。同画面から「バッチ手動実行」も可能。

### D. テスト・検証

#### D-1. Phase A 動作確認
[VIVID_PHASE2_DEPLOY.md](./VIVID_PHASE2_DEPLOY.md) Step 6 参照。5サイトで改善生成 → ログ確認。

#### D-2. Phase A バイアス防止 A/B テスト
[VIVID_PHASE2_AB_TEST_RUBRIC.md](./VIVID_PHASE2_AB_TEST_RUBRIC.md) のルーブリックに従い、5サイト × 2セット = 10セット生成し評価。

合格基準:
- 必須条件 5項目すべて満たす（B1-B5 の負例 0件等）
- 望ましい条件 4項目で過半数達成

→ 不合格項目があればプロンプト調整（Claude に依頼）

#### D-3. Phase B 動作確認
管理画面 `/admin/improvement-knowledge` でマトリクス表示確認。
セルクリックで詳細モーダル表示確認。
期間切替・フィルタが動くか確認。

#### D-4. Phase C 動作確認
1. 管理画面 `/admin/industry-benchmarks` を開いてダッシュボードでサマリ確認
2. `/admin/industry-benchmarks/tokens` で「テスト」ボタン → 各アカウントで GA4/GSC API 疎通確認
3. ダッシュボードで「バッチ手動実行」ボタン → 5〜30分待機 → 完了通知
4. ダッシュボードに表示されるバッチ実行履歴で期間ごとの統計確認
5. Firestore コンソールで `industryBenchmarks` コレクションに集計済ドキュメントが生成されているか確認

### E. launch（Phase D）

D の検証が全て pass したら、launch 可能。

#### E-1. featureFlags を全て enable に
B-1 で false で先行作成していた場合、ここで true に切り替え。

#### E-2. ユーザーへの通知
利用規約改訂版を公開、必要なら既存ユーザーへメール通知。

#### E-3. 監視開始
- Cloud Functions ログで `[improvementKnowledge]` `[industryBenchmark]` `[benchmarkAggregator]` プレフィックスを定期確認
- 月次バッチ初回（毎月1日 02:00 JST 翌朝）に統計確認

---

## 不具合・バグはコードレベルでクリア

実装中に発見・修正したもの：

| # | 問題 | 修正 |
|---|---|---|
| 1 | `aggregateMetrics` で未使用変数 `targetKey` | 削除＋コメント追加 |
| 2 | benchmarkAggregator が `refresh_token` 欠落トークンを使用しようとする | 入力フィルタ追加 |
| 3 | `mergeDomainRows` が空ドメインを Map に追加 | `if (!row.domain) continue` 追加 |
| 4 | `BenchmarkCellDetailModal` で `cell.improvements` が undefined のとき `.length` でクラッシュ | null 安全性チェック追加 |
| 5 | `BenchmarkMatrix` で集約時に achievementLevels が累積されない | exceeded/met/partial/not_met を category 横断で合算 |
| 6 | `industryBenchmarks` を全認証ユーザーが読めると moat が漏洩 | rules を admin のみに変更 |
| 7 | `inferTaxonomyFromUrl` を呼び出す際 HTML/metadata が空で精度低下 | benchmarkAggregator 内で URL pre-fetch 追加 |

すべて修正済・syntax/lint クリア。

## 動作確認方法（コードレベルでの保証）

### Cloud Functions
```sh
cd c:\Users\hatan\GrowReporterFinal\functions
node --check src/index.js
node --check src/scheduled/benchmarkAggregator.js
# ... 全ファイル OK 確認済
```

### ドライランテスト（Firestore 不要）
```sh
cd c:\Users\hatan\GrowReporterFinal\functions
node src/scripts/testRagInjection.mjs
# テスト結果: 4 passed / 0 failed
```

### Frontend lint
```sh
cd c:\Users\hatan\GrowReporterFinal
npx eslint src/pages/Admin/ src/components/Admin/ src/hooks/
# error なし、warning は module-typeless のみ（無害）
```

---

## まとめ

**コードレベルの実装・バグ修正・syntax/lint チェックはすべて完了**。残るのは以下のユーザー側オペレーションのみ：

1. GCP / Firebase 設定変更（OAuth redirect URI、Slack Webhook 等）
2. デプロイ実行（firebase deploy）
3. 初期データ投入（featureFlags、inspector データ移行、OAuth アカウント追加）
4. テスト・検証（A/B test、業務動作確認）
5. launch 実行（規約改訂、featureFlags 切替）

私（Claude）側で対応可能な作業があれば、いつでもご指示ください。
