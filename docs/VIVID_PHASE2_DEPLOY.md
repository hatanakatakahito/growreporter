# vivid Phase 2（improvementKnowledge RAG 注入）デプロイ手順書

最終更新: 2026-05-06

## 概要

vivid-swinging-alpaca のフェーズ2 を本番デプロイする手順。AI 改善提案に同業界の過去成功施策を RAG で注入し、提案品質を向上させる。

**関連設計**:
- [vivid-swinging-alpaca.md](C:\Users\hatan\.claude\plans\vivid-swinging-alpaca.md) v1.1 — vivid 全体設計
- [binary-stargazing-aho.md](C:\Users\hatan\.claude\plans\binary-stargazing-aho.md) v1.1 — Phase 2 着手プラン

## 変更ファイル一覧

| ファイル | 内容 |
|---|---|
| `functions/src/index.js` | clearAllAICache を lazyCallable 登録 |
| `functions/src/utils/serverComprehensiveDataFetcher.js` | siteContext 抽出 + improvementKnowledge を rawData に追加 + 4段階フォールバックヘルパー新設 |
| `functions/src/utils/featureFlags.js` | **新規** Feature flag 読み出しユーティリティ |
| `functions/src/prompts/templates.js` | improvementKnowledge 注入ブロック追加（バイアス防止7原則） |
| `firestore.indexes.json` | improvementKnowledge 用複合インデックス 4本追加 |
| `functions/src/scripts/testRagInjection.mjs` | **新規** RAG 注入の単体テスト（Firestore 不使用） |

---

## デプロイ前検証

### 1. ドライランテスト（Firestore 不使用、即実行可）

```sh
cd c:\Users\hatan\GrowReporterFinal\functions
node src/scripts/testRagInjection.mjs
```

**期待結果**: 全 4テストケース pass、注入ブロックの内容が目視で問題なし

### 2. Emulator 結合テスト（Firestore 必要）

#### 2-1. Firestore Emulator + テストデータ準備

```sh
cd c:\Users\hatan\GrowReporterFinal\functions
npm run serve
```

別ターミナルで Firestore Emulator UI を開き、以下のテストデータを投入：

**`systemSettings/featureFlags`** ドキュメント:
```json
{
  "improvementKnowledgeRagInjection": {
    "enabled": true
  }
}
```

**`improvementKnowledge`** コレクションにサンプル 5-10件:
```json
{
  "businessModel": "b2b",
  "industryMajor": "realestate_construction",
  "industryMinor": "不動産売買・仲介",
  "siteRole": "corporate",
  "siteScale": "small",
  "category": "content",
  "improvementSummary": "料金プランの3階層化と Before/After 訴求強化",
  "metrics": {
    "primaryMetric": "conversionRate",
    "changePercent": 35,
    "overallScore": 4.5,
    "achievementLevel": "exceeded"
  }
}
```

#### 2-2. generateImprovements を呼び出して動作確認

任意の認証済みアカウントで `/improve` 画面から「AI 改善案生成」を実行。

**確認項目**:
- [ ] Cloud Functions ログで `[improvementKnowledge] Step 1` 等のログが出力されている
- [ ] `improvementKnowledgeCount` が 1以上（=データが取れている）
- [ ] ログ抜粋例:
  ```
  [improvementKnowledge] Step 1 (BM×industry×role×success) { fetched: 3, total: 3 }
  [improvementKnowledge] Step 2 (BM×industry×success) { fetched: 5, total: 8 }
  [serverDataFetcher] 完了: 5234ms { improvementKnowledgeCount: 8 }
  ```

#### 2-3. Feature flag OFF テスト

`systemSettings/featureFlags.improvementKnowledgeRagInjection.enabled` を `false` に変更（Emulator UI で）。

→ 改善案生成を再実行 → ログに `[improvementKnowledge] Feature flag OFF, skip RAG injection` が出ること

→ `improvementKnowledgeCount: 0` になること

#### 2-4. siteContext 欠損テスト

テストサイトの `industryMajor` を空にして改善案生成 → ログに `siteContext incomplete, skip RAG injection` が出ること

#### 2-5. フォールバックテスト

サイトの industry/businessModel/siteRole を、improvementKnowledge データが少ない組み合わせに設定 → Step 1 で 0件 → Step 2-4 で fallback されること

ログ抜粋例:
```
[improvementKnowledge] Step 1 (BM×industry×role×success) { fetched: 0, total: 0 }
[improvementKnowledge] Step 2 (BM×industry×success) { fetched: 2, total: 2 }
[improvementKnowledge] Step 3 (BM×success) { fetched: 5, total: 7 }
```

---

## 本番デプロイ手順

**目安所要時間**: 30〜60 分（インデックス構築待ち含む）

### Step 1: Firestore インデックスをデプロイ（先行実施推奨）

```sh
cd c:\Users\hatan\GrowReporterFinal
firebase deploy --only firestore:indexes
```

→ Firestore Console でインデックス構築状況を確認、構築完了まで待機（数分〜数十分）

### Step 2: featureFlags ドキュメント作成（先行作成、enabled: false で開始）

Firebase Console > Firestore Database で以下を手動作成:

- コレクション: `systemSettings`
- ドキュメント ID: `featureFlags`
- フィールド:
  ```
  improvementKnowledgeRagInjection (map):
    enabled: false
  ```

→ 一旦 false で先行作成。Step 4 で true に切り替える

### Step 3: Functions デプロイ

```sh
cd c:\Users\hatan\GrowReporterFinal
firebase deploy --only functions
```

**変更される functions**:
- `clearAllAICache` (新規)
- `generateAISummary` (templates.js 改修により再ビルド)
- `generateImprovements` (serverComprehensiveDataFetcher.js 改修により再ビルド)
- 他、共通 utility 経由の影響あり

### Step 4: aiAnalysisCache 強制全削除

admin 権限を持つユーザーでログインし、ブラウザ console から以下を実行:

```js
const { httpsCallable } = await import('firebase/functions');
const { functions } = window.app; // または適切な参照
const result = await httpsCallable(functions, 'clearAllAICache')();
console.log(result);
```

または直接 Firebase Console > Firestore で `aiAnalysisCache` コレクションを手動削除。

### Step 5: featureFlags を ON に切り替え

Firebase Console > Firestore で:
```
systemSettings/featureFlags.improvementKnowledgeRagInjection.enabled: true
```

featureFlags のキャッシュは 60秒なので、最大 60秒後から有効化。

### Step 6: 動作確認（5サイト × 3生成）

業種多様性のあるサイト 5件で改善案生成を実行：
- 不動産・建設
- メーカー
- IT・通信
- 医療・介護・福祉
- コンサル・士業

各サイトで生成された改善案を目視レビュー：
- [ ] 「同業他社で〜」「業界の成功パターンとして」のような定性表現が含まれている
- [ ] 「業界平均 X%」「N=10」のような生の数値が含まれていない
- [ ] 業界実績を「目標値」として提示していない
- [ ] サイト固有の課題が分析の主軸になっている
- [ ] 業界別に異なる結果が出ている

### Step 7: 監視（24時間）

Cloud Functions ログで以下を監視:
- `[improvementKnowledge]` プレフィックスのログ
- エラー率 < 5%
- クエリレイテンシ < 500ms（Step 1 で）
- `improvementKnowledgeCount` の分布（多くのサイトで 1 以上）

---

## ロールバック手順

### Pattern A: featureFlags で即時無効化（**推奨・最速**）

Firebase Console で:
```
systemSettings/featureFlags.improvementKnowledgeRagInjection.enabled: false
```

→ 60秒以内に全ての RAG 注入が停止、AI出力は元通り

### Pattern B: コードロールバック

```sh
git revert <commit-hash>
firebase deploy --only functions
```

### Pattern C: 段階的（プロンプト個別）

featureFlags の `enabledPrompts` 配列を空にする → 全プロンプトで OFF

---

## 監視・アラート

### 重要メトリクス

| メトリクス | 閾値 | 対処 |
|---|---|---|
| `improvementKnowledgeCount = 0` 比率 | > 30% | siteContext 欠損サイト増加の可能性、調査 |
| Step 1 クエリレイテンシ | > 1000ms | インデックス構築未完了の可能性 |
| 「Feature flag OFF」ログ頻発 | 想定外 | featureFlags ドキュメント確認 |
| Step 4（最終fallback）到達率 | > 50% | improvementKnowledge データ不足の可能性、当面は仕方ない |

### ログ確認コマンド例

```sh
firebase functions:log --only generateAISummary --limit 100 | grep improvementKnowledge
```

---

## 既知の制約

1. **データ蓄積待ち**: improvementKnowledge は現状 5-20 件レベル。Step 1 で十分な件数が取れるサイトは少ない
2. **Pro fallback 未実装**: vivid Phase 2 では Pro モデルでの再判定はしない（Phase 3 検討）
3. **キャッシュ TTL 60秒**: Feature flag 切替の反映に最大 60秒かかる
4. **Free プラン**: AI 生成自体が不可なので、RAG 注入の恩恵を受けない（仕様）

---

## トラブルシューティング

### Q: improvementKnowledge が常に空（count = 0）

A: 以下を確認:
1. featureFlags が enabled になっているか
2. サイトの industryMajor/businessModel/siteRole が設定されているか
3. improvementKnowledge コレクションにデータがあるか
4. インデックス構築が完了しているか

### Q: クエリエラー「FAILED_PRECONDITION」

A: 複合インデックスが構築されていない。`firestore.indexes.json` をデプロイし直す。

### Q: AI 出力に「業界平均 X%」のような生数値が出る

A: バイアス防止原則の効きが弱い。プロンプト微調整が必要。templates.js の `improvementKnowledgeText` ブロック内の利用ルールを強化する。

### Q: Jaccard 重複排除が想定外に効く

A: AI が過去成功施策を再提案 → 自サイトの既存改善と類似 → Jaccard で除外。これは正しい挙動（同じ改善を二重提案しない）。
