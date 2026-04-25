# ロールバック手順書

本番デプロイで異常を検知した際の、各モジュールの戻し方をまとめたものです。
**先に PRE_DEPLOY_CHECKLIST.md の git tag を打っていることが前提です。**

## 1. ロールバック判断基準

以下のいずれかが本番で発生したら **ただちにロールバック判断**:

| 症状 | 対応 |
|---|---|
| 主要画面（ログイン / ダッシュボード / `/improve`）が真っ白 | 即時ロールバック |
| 主要 Callable で `permission-denied` / `unauthenticated` が急増 | 即時ロールバック |
| Firestore rules deny エラーが Cloud Logging で 5 件/分超 | 即時ロールバック |
| OAuth 連携で再認証ループ | 即時ロールバック |
| 既存ユーザーがログインできない | 即時ロールバック |
| 個別機能の不具合（軽微） | 修正 forward fix を検討、ロールバックは様子見 |

## 2. モジュール別ロールバック

### 2-1. Cloud Functions のロールバック

**git revert 方式（推奨）**:
```bash
# 最後の動作確認済みタグを確認
git tag -l "prod-*" | tail -5

# 直前の本番タグへ戻す
git checkout main
git revert --no-commit <問題の commit>..HEAD
git commit -m "revert: rollback Phase X-Y due to <理由>"
git push origin main

# 再デプロイ（functions のみ）
firebase deploy --only functions
```

**Firebase Console 側の即時切替**:
1. https://console.firebase.google.com/project/growgroupreporter/functions/list
2. 該当関数の「ソース」タブから旧リビジョンを選択
3. 「ロールバック」ボタンで即座に旧コードへ切替

### 2-2. Firestore Rules のロールバック

```bash
# 直前の動作確認済みタグから rules を取り出す
git checkout <prod-tag> -- firestore.rules

# 即時デプロイ
firebase deploy --only firestore:rules

# 元のブランチ状態を維持しつつ rules だけ戻したい場合
git stash
git checkout <prod-tag> -- firestore.rules
firebase deploy --only firestore:rules
git checkout HEAD -- firestore.rules
git stash pop
```

**Firebase Console 側の rules 履歴**:
1. https://console.firebase.google.com/project/growgroupreporter/firestore/rules
2. 「履歴」タブから旧バージョンを選択
3. 「これをロールバック」ボタンで復元

### 2-3. Storage Rules のロールバック

```bash
git checkout <prod-tag> -- storage.rules
firebase deploy --only storage
```

Console: https://console.firebase.google.com/project/growgroupreporter/storage/rules

### 2-4. Hosting (フロントエンド) のロールバック

**Firebase CLI 即時ロールバック**:
```bash
firebase hosting:rollback
# 直前のリリースに戻る（最も簡単）
```

**特定リリースに戻す**:
```bash
firebase hosting:releases:list
# リリース ID を確認

firebase hosting:clone <source-version-id> live
```

### 2-5. Cloudflare Worker のロールバック

```bash
cd workers/fetch-proxy
wrangler deployments list
wrangler rollback <deployment-id>
```

## 3. シークレットローテ後のロールバック特例

シークレットを **ローテした後** にロールバックが必要になった場合:

1. **旧シークレット値を復元しない**（ローテ済みなので無効化されている）
2. 新シークレットを Secret Manager に登録した状態で、コードだけを旧バージョンに戻す
3. 旧バージョンが旧シークレット名を参照していれば、Secret Manager で旧名にも新値を登録（または旧バージョンの参照名を変更したコミットを作る）

## 4. データ migration のロールバック

KMS 暗号化 migration (Phase 3-1) のような **データ書き換え** を伴う migration の場合:

| 種類 | ロールバック可能性 |
|---|---|
| トークン暗号化（Phase 3-1） | 復号関数を残しておけば旧コードで読める。完了後に「平文 fallback」削除すると ロールバック不可 |
| `mockupHtml` フラグ立て（Phase 3-2） | 新フィールドを追加するだけなのでロールバック容易 |
| Firestore rules field allowlist（Phase 2-1） | rules を戻すだけ、データは変えない |

**KMS migration では「平文 fallback 残し」期間を最低 7 日確保** すること。

## 5. 緊急連絡フロー

1. **発見者** → Slack `#alerts` に「ROLLBACK 開始」と投稿
2. 上記手順で該当モジュールをロールバック
3. ロールバック完了後、Slack に「ROLLBACK 完了 (タグ: prod-XXX へ復帰)」を投稿
4. 1 時間以内に原因分析メモを `docs/incidents/YYYYMMDD-HHmm-rollback.md` に記録
5. 翌営業日に再発防止策を検討し、PRE_DEPLOY_CHECKLIST.md を更新

## 6. ロールバック手順の年次素振り

毎年 1 月に「無害な変更を当てて即座にロールバックする」素振りを 1 回実施し、手順書が陳腐化していないか確認する。
