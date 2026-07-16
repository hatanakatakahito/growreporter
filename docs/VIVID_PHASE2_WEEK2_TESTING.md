# vivid Phase 2 Week 2 テスト準備手順書

最終更新: 2026-05-06
対象: Week 1 実装完了後の Week 2 テスト着手

## Week 1 までに完了したもの

### 実装済 Code（6ファイル）
- ✅ [functions/src/index.js](../functions/src/index.js) — clearAllAICache を lazyCallable 登録
- ✅ [functions/src/utils/serverComprehensiveDataFetcher.js](../functions/src/utils/serverComprehensiveDataFetcher.js) — siteContext 抽出 + improvementKnowledge クエリ + 4段階フォールバック
- ✅ [functions/src/utils/featureFlags.js](../functions/src/utils/featureFlags.js) — Feature flag 読み出しユーティリティ
- ✅ [functions/src/prompts/templates.js](../functions/src/prompts/templates.js) — RAG 注入ブロック（バイアス防止7原則）
- ✅ [firestore.indexes.json](../firestore.indexes.json) — 複合インデックス 4本追加
- ✅ [functions/src/scripts/testRagInjection.mjs](../functions/src/scripts/testRagInjection.mjs) — ドライランテスト
- ✅ [functions/src/scripts/seedTestImprovementKnowledge.mjs](../functions/src/scripts/seedTestImprovementKnowledge.mjs) — Emulator シーダー

### 検証済
- ✅ 全ファイル `node --check` パス
- ✅ ドライランテスト 4/4 pass（注入ブロック生成、siteContext フォールバック、空データ処理）

### 設計書
- ✅ [VIVID_PHASE2_DEPLOY.md](./VIVID_PHASE2_DEPLOY.md) — 本番デプロイ手順
- ✅ [VIVID_PHASE2_AB_TEST_RUBRIC.md](./VIVID_PHASE2_AB_TEST_RUBRIC.md) — A/B テスト評価ルーブリック

---

## Week 2 タスク全体像

| Day | タスク | 担当 | 工数 |
|---|---|---|---|
| Day 6 | テストサイト 5件選定 + Set A (注入OFF) 出力収集 | ユーザー | 半日 |
| Day 7 | Set B (注入ON) 出力収集 + 比較レビュー（前半） | ユーザー + Claude | 半日 |
| Day 8 | バイアス検出時のプロンプト微調整 | Claude | 半日〜1日 |
| Day 9 | デプロイ手順書の最終確認 + ロールバック手順テスト | ユーザー + Claude | 半日 |
| Day 10 | 本番デプロイ | ユーザー（admin） | 1〜2時間 |

---

## Day 6 の準備手順

### Step 1: テストサイト 5件を選定

[VIVID_PHASE2_AB_TEST_RUBRIC.md](./VIVID_PHASE2_AB_TEST_RUBRIC.md) の選定基準に従い、5件を決定。

**選定チェックリスト**:
- [ ] サイト 1（不動産・建設）: ___________________
  - businessModel/industryMajor/siteRole が設定済か確認
  - 直近30日のセッション > 100 か確認
  - 既存改善案件が 5件以上あるか確認
- [ ] サイト 2（メーカー）: ___________________
- [ ] サイト 3（IT・通信）: ___________________
- [ ] サイト 4（医療・介護）: ___________________
- [ ] サイト 5（コンサル・士業 or その他）: ___________________

> **注**: コンサル・士業サイトは improvementKnowledge データが少なく、Step 2-3 にフォールバックする想定。フォールバック動作の検証用として有用。

### Step 2: improvementKnowledge にテストデータを投入

#### Pattern A: 本番に既存データがある場合
本番の improvementKnowledge コレクションを Emulator にエクスポート → インポート、または直接本番でテスト（推奨せず）

#### Pattern B: テスト用データを投入（推奨）

```sh
# 1. Firestore Emulator 起動（別ターミナル）
cd c:\Users\hatan\GrowReporterFinal\functions
npm run serve

# 2. seeder スクリプト実行（PowerShell）
cd c:\Users\hatan\GrowReporterFinal\functions
$env:FIRESTORE_EMULATOR_HOST="127.0.0.1:8080"
node src/scripts/seedTestImprovementKnowledge.mjs
```

**期待結果**:
- 12件のサンプルデータ投入（不動産3、メーカー3、IT2、医療2、コンサル1、フード1）
- うち11件は exceeded/met（RAG 取得対象）、1件は not_met（除外確認用）
- featureFlags ドキュメント自動作成（improvementKnowledgeRagInjection.enabled=true）

### Step 3: ドライラン再確認

```sh
cd c:\Users\hatan\GrowReporterFinal\functions
node src/scripts/testRagInjection.mjs
```

→ 4/4 pass を再確認

### Step 4: Set A (注入 OFF) の出力収集

#### 4-1. Feature flag を OFF に設定

Firebase Emulator UI (http://127.0.0.1:4000/firestore) で:
- `systemSettings/featureFlags.improvementKnowledgeRagInjection.enabled` → `false`

#### 4-2. キャッシュクリア（emulator では aiAnalysisCache が空でも問題ないが念のため）

#### 4-3. 5サイトで改善提案生成

各サイトで GrowReporter UI から「改善案 AI 生成」を実行（10件目安）。

**保存形式**: 
- スクリーンショット or テキストコピー
- ファイル名規約: `set-A-OFF_<sitename>_<timestamp>.txt`

### Step 5: Set B (注入 ON) の出力収集

#### 5-1. Feature flag を ON に切り替え

Emulator UI で:
- `systemSettings/featureFlags.improvementKnowledgeRagInjection.enabled` → `true`
- 60秒待機（featureFlags キャッシュ TTL）

#### 5-2. Cloud Functions ログで動作確認

```sh
firebase emulators:exec "cat" --only functions
```
or Functions Emulator UI でログ監視

期待ログ:
```
[improvementKnowledge] Step 1 (BM×industry×role×success) { fetched: 3, total: 3 }
[improvementKnowledge] Step 2 (BM×industry×success) { fetched: 0, total: 3 }
[serverDataFetcher] 完了: XXXms { improvementKnowledgeCount: 3 }
```

#### 5-3. 5サイトで改善提案生成

同じ要領で生成、ファイル名は `set-B-ON_<sitename>_<timestamp>.txt`

---

## Day 7-8: 比較レビュー

### CSV 形式の評価入力

[VIVID_PHASE2_AB_TEST_RUBRIC.md](./VIVID_PHASE2_AB_TEST_RUBRIC.md) のサンプル CSV 形式に従い、各提案を採点。

合計 100件 × 評価項目 9個 = 900セルの入力。

**効率化のヒント**:
- 1サイトずつ Set A → Set B を続けて評価（コンテキスト維持）
- まずバイアス検出 (B1-B5) のみを全 100件に対して走査
- B1-B3 が 1件でも検出されたら、一旦止めて Day 8 のプロンプト調整へ

### バイアス検出時のプロンプト調整（Day 8）

検出パターン別の対処:

| 検出 | 修正箇所 | 修正方針 |
|---|---|---|
| B1 業界平均の目標化 | templates.js の利用ルール 6 | 「業界実績を目標値として提示しない」を強調、複数表現に重複させる |
| B2 生の統計値出力 | 利用ルール 4 | 「達成度・%・件数を出力に含めない」を最初に持ってくる |
| B3 責任転嫁 | 利用ルール全般 | 「業界全体の傾向を理由に改善不要としない」追加 |
| B4 業界横断的強要 | 利用ルール 3 | 「本サイトの状況に応用可能なものに限定」を明示 |
| B5 ネガティブトーン過多 | 利用ルール冒頭 | 「建設的・前向きな表現を優先」追加 |

修正後は再度 5サイトで Set B のみ生成 → バイアス再検出ゼロを確認 → 全項目評価へ進む。

---

## Day 9-10: デプロイ準備と実行

### Day 9: 最終確認
- [ ] [VIVID_PHASE2_DEPLOY.md](./VIVID_PHASE2_DEPLOY.md) の手順を最後に通読
- [ ] ロールバック手順（featureFlags OFF）を Emulator で実機テスト
- [ ] admin 権限で `clearAllAICache` callable を実行できる経路を確認
- [ ] Firebase Console > Firestore で `systemSettings/featureFlags` 作成権限を確認

### Day 10: 本番デプロイ実行

[VIVID_PHASE2_DEPLOY.md](./VIVID_PHASE2_DEPLOY.md) の Step 1〜7 を順に実行。

合格判定後の手順:
1. firestore:indexes デプロイ（先行）
2. featureFlags ドキュメント作成（enabled: false）
3. functions デプロイ
4. clearAllAICache 実行
5. featureFlags を enabled: true に切替
6. 動作確認
7. 24時間監視

---

## Week 2 完了基準（Phase B 着手の判定）

[binary-stargazing-aho.md](C:\Users\hatan\.claude\plans\binary-stargazing-aho.md) v1.1 の「Phase 2 完了基準」を全て満たす:

- [ ] 5サイトで改善生成 → 過去施策が生成提案に反映されている
- [ ] 4段階フォールバックが各 step で正しく動く
- [ ] 複合インデックスが効いている（クエリレイテンシ < 500ms）
- [ ] aiAnalysisCache が空、新規生成が新プロンプトで動作
- [ ] siteContext が確実に渡っている
- [ ] **Feature flag で OFF にすると注入されない**
- [ ] **バイアス防止 A/B テストで負例 0件、正例多数**
- [ ] Jaccard 重複排除との衝突なし
- [ ] 異常な出力（空文字、JSON 崩れ等）が出ない

→ 全項目 pass で Phase B（vivid Phase 3 = `/admin/improvement-knowledge` 管理画面）の実装に進める

---

## トラブルシューティング

### Q: emulator でテストデータを投入したが templates.js の出力に反映されない

A: `FIRESTORE_EMULATOR_HOST` 環境変数が設定されていない可能性。bash/PowerShell でそれぞれ以下を確認：
```sh
# bash
echo $FIRESTORE_EMULATOR_HOST  # 127.0.0.1:8080 が出ること

# PowerShell
$env:FIRESTORE_EMULATOR_HOST  # 同上
```

### Q: Set B で `improvementKnowledgeCount: 0` が頻発

A: 以下を確認:
1. featureFlags.improvementKnowledgeRagInjection.enabled === true か
2. テストサイトの businessModel/industryMajor/siteRole が設定されているか
3. seeder で投入したテストデータと同じ業種にサイトがマッチしているか
4. 60秒のキャッシュ TTL を待ったか（feature flag 切替後）

### Q: 評価担当者が 1名しかいない

A: 1名でも実施可。ただし主観バイアス入る可能性があるため、Day 8 のプロンプト調整時に他者レビューを依頼するなど、最終判定は複数視点で。

### Q: 5業種揃わない

A: 4業種でも可。少なくとも以下の業種カバーは推奨:
- 不動産・建設（多データ）
- IT・通信 or メーカー（中データ）
- コンサル・士業 or 公共・団体（少データ、フォールバック検証用）
