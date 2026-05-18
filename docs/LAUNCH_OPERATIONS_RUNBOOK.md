# launch 後の運用ランブック（業界ベンチマーク + 改善ナレッジ）

最終更新: 2026-05-06
対象: Phase A-C 本番稼働後の継続運用

---

## 監視対象

### 1. Cloud Functions ログ（Firebase Console > Functions > ログ）

#### 月次バッチ（最重要）

`benchmarkAggregator` — 毎月 1 日 02:00 JST 自動実行。

ログプレフィックス: `[benchmarkAggregator]`

| 確認項目 | 正常値 | 異常時の対応 |
|---|---|---|
| `sourceTokensActive` | 4 | 1〜3 → トークン期限切れ。`/admin/industry-benchmarks/tokens` で「再認証」 |
| `sourceTokensFailed` | 0 | >0 → 該当アカウント名と error メッセージを確認、必要なら再認証 |
| `metricsActive` | 数百件 | 0 → API 巡回失敗、上記トークン状況 + Firebase Functions ログでエラー詳細確認 |
| `benchmarksWritten` | 30〜50 件 | 0 → 集計ロジックの異常、Slack 通知で開発側に共有 |
| `errors` | 空配列 | 非空 → 内容に応じて対応 |
| `durationSeconds` | 200〜600 | >1800 → タイムアウトリスク、ドメイン数増加に伴うチューニング検討 |

#### AI 注入関連（毎日確認不要、月次で1度）

`generateImprovements` `generateAISummary` — ユーザー操作でオンデマンド実行。

ログプレフィックス: `[improvementKnowledge]` `[industryBenchmark]`

| 確認項目 | 健全な動き |
|---|---|
| `improvementKnowledge` クエリ件数 | サイト数の蓄積に応じて増加（launch 時点 0件、月次 +5〜20 件想定） |
| `industryBenchmark` 注入有無 | 業種が判定済みのサイトでは大半が注入される |
| Feature flag による skip ログ | `improvementKnowledgeRagInjection: OFF` 等の skip が予期せず発生していないか |

### 2. Firestore コレクション

| コレクション | 月次確認内容 |
|---|---|
| `industryBenchmarks` | period ごとに 30〜50 ドキュメント生成。古い period（24ヶ月超）は自動削除されるか確認 |
| `benchmarkSourceSites` | ドメイン数の月次推移。来月 1 日後に新規ドメイン数の `newDomainsThisMonth` が反映されるはず |
| `benchmarkBatchLogs` | 直近 12 件が `/admin/industry-benchmarks` に表示。エラー件数 0 が継続しているか |
| `improvementKnowledge` | ユーザー側で評価フローを通すたびに増加。launch 後 1ヶ月で初の数件が登録されるか確認 |
| `serviceTokens` | 4 アカウント `status: active` 維持。`updatedAt` が 30 日以上停滞しているとトークン未使用を疑う |
| `aiAnalysisCache` `aiSummaries` | 7 日 TTL で自然回転。異常蓄積（数千件超）があれば手動クリア検討 |

### 3. featureFlags の現状確認（管理画面 or Firestore Console）

`systemSettings/featureFlags`:

```json
{
  "improvementKnowledgeRagInjection": { "enabled": true },
  "industryBenchmarkInjection": { "enabled": true },
  "benchmarkAggregation": { "enabled": true }
}
```

すべて true で稼働中。**緊急時にいずれかを false にすれば該当機能だけ即時停止可能**（60秒以内、フェイルオープン）。

---

## 月次定例タスク（毎月 2 日 朝、所要 8〜15 分）

1. `/admin/industry-benchmarks` ダッシュボードを開く
2. 「最新ベンチマーク」カードの period が前月分（例: 2026-06）に更新されているか
3. 「バッチ実行履歴」最上段（前月 1 日分）の値を確認
   - エラー列が緑のチェック、または「-」
   - アクティブ/失敗が `4/0`
   - 書込件数が前月と大きく乖離していない
4. 異常があれば下記「異常時の対応」セクションへ
5. 完了したら、Notion なり Slack なりに「{月} ベンチマークバッチ正常完了」と一行記録（後日の問い合わせ対応用）

---

## 異常時の対応

### ケース A: バッチ未実行（バッチ履歴に最新月分が出てこない）

1. Firebase Console > Functions > `benchmarkAggregator` のログ確認
2. エラーメッセージから原因特定:
   - **OAuth トークン全滅**: `/admin/industry-benchmarks/tokens` で各アカウントを「再認証」
   - **API rate limit**: 翌日まで待って手動実行
   - **その他**: ログ全文を開発側へエスカレーション
3. 復旧後、`/admin/industry-benchmarks` ダッシュボードの「バッチ手動実行」で即時集計

### ケース B: バッチは動くがベンチマーク件数が激減

1. `metricsActive` が極端に減っていないか確認
2. `sourceTokensFailed` が 0 でないか
3. 該当 OAuth アカウントを「テスト」ボタンで疎通確認 → 失敗なら「再認証」

### ケース C: AI 出力にバイアス（B1〜B5）が混入し始めた

[VIVID_PHASE2_AB_TEST_RUBRIC.md](./VIVID_PHASE2_AB_TEST_RUBRIC.md) の B 項目に該当する出力が観測された場合：

1. **即時ロールバック**: Firestore Console で `systemSettings/featureFlags.industryBenchmarkInjection.enabled: false`（または `improvementKnowledgeRagInjection.enabled: false`）
2. 該当 AI 出力のサイト ID・出力テキスト・タイミングを記録
3. `/admin/industry-benchmarks` の「AI キャッシュ全削除」を実行（旧バイアス出力を破棄）
4. 開発側でプロンプト調整 → 再度 A/B テスト → 合格後に flag を true に戻す

### ケース D: 顧客からオプトアウト請求があった

1. Firestore コンソールで `benchmarkSourceSites/{domain}` を開く
2. 以下のフィールドを更新:
   ```
   optedOut: true
   optedOutAt: <現在のタイムスタンプ>
   optedOutReason: "顧客請求 (担当者名 / 連絡日)"
   optedOutBy: <admin email>
   ```
3. 翌月のバッチから自動的にベンチマーク母集団から除外される
4. 過去ベンチマーク値の再計算は行わない（設計仕様）

### ケース E: industryBenchmarks の N が小さくなりすぎ業種が偏った

長期傾向として、ベンチマーク母集団のドメイン数が減って N≥10 業種が大幅に減少した場合：

1. `benchmarkSourceSites` で `excludedFromBenchmark: false` のドメイン数推移を確認
2. 4 OAuth アカウントの GA4/GSC アクセス権が失われていないか確認
3. 必要に応じて 5 本目のアカウント追加を検討（管理画面「+ アカウント追加」）

---

## 緊急連絡先

| 種別 | 連絡先 |
|---|---|
| Firebase / GCP インシデント | [GCP Status](https://status.cloud.google.com/) |
| Google API 障害（GA4/GSC） | [Google Workspace Status Dashboard](https://www.google.com/appsstatus/) |
| グローレポーター開発側 | （社内エンジニア / Slack `#growreporter-dev` 想定） |

---

## ロールバック早見表

| 影響範囲 | ロールバック手段 | 復旧時間 |
|---|---|---|
| AI 出力に問題 | featureFlags の該当 enabled を false | 60 秒以内 |
| バッチが暴走 | featureFlags の `benchmarkAggregation.enabled: false` | 翌月のバッチで停止 |
| 全体的に怪しい | featureFlags 3 つすべて false | 60 秒以内、launch 前の状態に戻る |
| 個別顧客の除外 | `benchmarkSourceSites/{domain}.optedOut: true` | 翌月のバッチで反映 |
| トークン失効 | `/admin/industry-benchmarks/tokens` から再認証 | 数分 |

詳細手順は [ROLLBACK_PROCEDURES.md](./ROLLBACK_PROCEDURES.md) も参照。

---

## 推奨運用カレンダー

| 頻度 | タスク |
|---|---|
| **毎月 2 日** | バッチ完了確認（必須・8〜15 分） |
| **四半期ごと** | improvementKnowledge 蓄積件数の傾向確認、N≥10 業種カバレッジ確認 |
| **半期ごと** | プロンプト品質の抜き打ち確認（A/B テストの簡易版を 1〜2 サイトで） |
| **年次** | Grow Group 運用 OAuth アカウントのアクセス権棚卸し、利用規約条文の見直し |
