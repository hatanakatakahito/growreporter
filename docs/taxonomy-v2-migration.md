# タクソノミー V2 移行オペレーション手順書

本ドキュメントは、サイト登録タクソノミー(業種・サイト種別・サイト目的)を V1 から V2 に切り替える運用手順をまとめたもの。詳細な背景・設計方針は `REQUIREMENTS.md` および `.claude/plans/vivid-swinging-alpaca.md` を参照。

## 用語定義

- **V1 フィールド**: `industry: string[]`, `siteType: string[]`, `sitePurpose: string[]`, `businessType`(廃止済) — 旧スキーマ
- **V2 フィールド**: `businessModel`, `siteRole`, `industryMajor`, `industryMinor`, `taxonomyVersion: 2`, `needsManualReclassify?: boolean` — 新スキーマ
- **マスター定数**:
  - フロント: `src/constants/businessModels.js` / `siteRoles.js` / `industriesV2.js` / `taxonomyMigration.js` / `improvementTags.js`
  - バックエンド: `functions/src/constants/siteOptionsV2.js`

## フェーズ1 (現在): 定数追加と二重定義解消 — 破壊的変更なし

### 実施済み
- 新マスター定数ファイルを追加(上記「マスター定数」)。まだ UI・Firestore・AIプロンプトからは参照されていない。
- `functions/src/utils/sheetsManager.js` のローカル `SITE_TYPE_LABELS` / `SITE_PURPOSE_LABELS` を削除し、`functions/src/constants/siteOptions.js`(既存V1マスター)の import に統一。ラベルの単一ソース化。

### 検証
- `npm run build` がエラーなく通ること
- 新規サイト登録・既存サイト編集・AI 生成・スプレッドシート自動出力がすべて従前通り動作すること(リグレッション無)

### ロールバック
- 影響範囲は `functions/src/utils/sheetsManager.js` のみ。revert で即復旧可能。

## フェーズ2 (未実施): UI 置換

`Step1BasicInfo.jsx` を V2 スキーマ(4フィールド単一選択)に置換する。以降、新規サイト登録は必ず V2 スキーマで保存される。

実装詳細は `.claude/plans/vivid-swinging-alpaca.md` のフェーズ2 セクション参照。

## フェーズ2.5 (未実施): URL ベース自動判定

`inferSiteTaxonomy` callable を追加し、URL を入力するだけで 4 軸を AI 推定 + プレフィルする UX を実装する。既存の `fetchMetadata` / `unifiedPageScraper` / Gemini API を再利用。

## フェーズ3 (未実施): バックエンド対応

- `generateAISummary.js` / `templates.js` の `siteContext` を V2 スキーマ参照に切替
- `sheetsManager.js` の列構成を A:O → A:P に拡張(業界・業種 D → ビジネスモデル / 業種大分類 E / 業種小分類 F / サイト役割 G に再編)
- `updateRowIfExists` と `appendOrUpdateRows` の 対象年月列参照の不整合バグを同時修正
- スプレッドシート側のヘッダー行を手動で書き換え(後述)

### スプレッドシート手動更新手順 (フェーズ3実施時)

対象スプレッドシート: ID `1Gn9XIvyEwKuYBIgckj_wDA4cTcOZXu03ibwuIvKutIY` / タブ `シート1`

1. **バックアップ**: スプレッドシートを「ファイル > コピーを作成」で `シート1_V1バックアップ_yyyymmdd` として保存
2. **ヘッダー行の書き換え**(1行目):

| 列 | 旧ヘッダー | 新ヘッダー |
|---|---|---|
| A | 登録日時 | 登録日時 |
| B | サイト名 | サイト名 |
| C | URL | URL |
| D | 業界・業種 | ビジネスモデル |
| E | サイト種別 | 業種大分類 |
| F | サイトの目的 | 業種小分類 |
| G | 対象年月 | サイト役割 |
| H | セッション数 | 対象年月 |
| I | 新規ユーザー | セッション数 |
| J | ユーザー数 | 新規ユーザー |
| K | ページビュー | ユーザー数 |
| L | 1セッションあたりPV | ページビュー |
| M | エンゲージメント率（%） | 1セッションあたりPV |
| N | コンバージョン数 | エンゲージメント率（%） |
| O | コンバージョン率（%） | コンバージョン数 |
| P | — | コンバージョン率（%） |

3. **既存データ行の列シフト**: フェーズ3デプロイ前に既存データを新構成に合わせる場合は別途バッチ対応が必要。運用判断で(a)データを全削除してフェーズ4移行後に再出力するか、(b)手動で移動するかを決定。

## フェーズ4 (未実施): データ移行

### 前提準備
- Firestore フルバックアップ: `gcloud firestore export gs://<backup-bucket>/taxonomy-v2-pre-migration-yyyymmdd`
- スプレッドシートのバックアップ取得(フェーズ3の手順と同様)

### 実行手順

```bash
# dry-run (推定結果をログ出力のみ、書き込みなし)
cd functions
node src/scripts/migrateTaxonomyV2.js --dry-run

# ログ確認: taxonomyMigrationLogs コレクションで全サイトの推定結果と confidence を確認
# サンプルを Grow Group 社内でレビューし、明らかな誤推定がないか確認

# 本番実行
node src/scripts/migrateTaxonomyV2.js
```

### 移行ロジック(現時点の仕様)

1. `sites` コレクションの `taxonomyVersion !== 2` ドキュメントが対象
2. 旧 `industry[0]` / `siteType[0]` / `sitePurpose[0]` から `taxonomyMigration.js` の推定関数で V2 四軸を決定
3. 推定揺れがある場合(複数値衝突 / 未知値)は `needsManualReclassify: true` フラグを立てる
4. `batch.update()` で新フィールド書き込み + 旧 `industry` / `siteType` / `sitePurpose` / `businessType` を `FieldValue.delete()` で同時削除
5. 結果を `taxonomyMigrationLogs` コレクションに記録

**重要**: 移行は破壊的で、旧フィールドは `legacy_*` 退避なしに即削除される。ロールバックは Firestore バックアップからの復元が唯一の手段。

### 移行後対応

- 管理画面 `/admin/sites` に「要再分類」フィルタを追加(フェーズ3で実装済)
- `needsManualReclassify === true` のサイトを `TaxonomyReclassifyModal` で Grow Group 担当が1件ずつ確定
- 全サイトが `needsManualReclassify === false` になるまでがゴール

## フェーズ5 (未実施): クリーンアップ

- `improvements` コレクションに `tags: []` / `tagCategory: ''` デフォルト付与
- `firestore.indexes.json` に `improvements (tagCategory, createdAt)` 複合インデックス追加
- `src/constants/industries.js` および `src/constants/siteOptions.js` の削除
- 旧マスター・旧フィールドへの import 残存を全プロジェクト grep で確認して一掃

## トラブルシューティング

### フェーズ1完了後に AI 生成や表示が壊れた
- フェーズ1は純粋追加のみで既存ロジックには触れていない。起きるとすればラベル import エラー。
- 対応: `functions/src/utils/sheetsManager.js` の冒頭 import 文が正しく `../constants/siteOptions.js` から参照しているか確認。

### フェーズ4 dry-run で推定が "other" に偏る
- 既存サイトの `industry` / `siteType` / `sitePurpose` が空配列または未知値になっている可能性。
- 対応: `taxonomyMigration.js` の `INDUSTRY_V1_TO_V2` マップを見直し、不足している旧ラベルがあれば追加。または `needsManualReclassify: true` で人手確定に回す。

### スプレッドシート列ずれ
- フェーズ3デプロイ直後にヘッダー手動更新を忘れると、自動追記される行と既存データの列が1つずれる。
- 対応: 即時ロールバック(revert)してデータ整合性を戻し、ヘッダー更新後に再デプロイ。
