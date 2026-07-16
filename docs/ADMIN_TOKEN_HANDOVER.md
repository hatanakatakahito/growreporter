# 管理者 OAuth トークン引き継ぎ手順書

## 概要

GrowReporter では「管理者 (admin) が顧客サイトを代行作成し、所有権だけ顧客に引き渡し、OAuth トークンは admin で保持」という運用パターンが採用されている (`adminTransferSiteOwnership` callable)。

このため **admin (例: hatanaka) が退職や Google アカウント削除などで使えなくなる場合、その admin が `ga4TokenOwner` / `gscTokenOwner` として保持しているサイト群の GA4/GSC データ取得が停止する**。

本書は、admin の引退・交代時に行うべき OAuth トークン引き継ぎ手順をまとめる。

## 前提

- 引き継ぎ対象 admin: `hatanaka@grow-group.jp` 等
- 引き継ぎ先候補: 他の admin role ユーザー or 顧客本人
- 該当する sites: `sites.ga4TokenOwner === 退職 admin uid` または `sites.gscTokenOwner === 退職 admin uid`

## 影響範囲確認

### サイト一覧の抽出 (Firestore コンソール or 1 回限りスクリプト)

```
sites where ga4TokenOwner == "退職 admin uid"
sites where gscTokenOwner == "退職 admin uid"
```

これらのサイト数を把握。多数の場合は段階的引き継ぎを計画する。

## 選択肢

### Option A: 顧客本人に切替えてもらう (推奨・スケーラブル)

各顧客に「自分の Google アカウントで再連携」してもらう。

1. 顧客に通知メール (テンプレートは別途準備、退職前 1 ヶ月の予告期間を確保)
2. 顧客が以下を実施:
   - GrowReporter にログイン
   - アカウント設定で GA4 / Search Console を OAuth 連携
   - サイト詳細画面 (`/sites/{siteId}`) → 「OAuth 連携: 当社代行運用中」バッジ → 「GA4 / GSC を自分の Google で再連携」ボタン
   - `claimSiteTokenOwnership` callable が実行され、`ga4TokenOwner` / `gscTokenOwner` が顧客 uid に切替わる

メリット: 永続的に顧客側で運用、admin 削除しても OK
デメリット: 顧客の協力が必要、未対応の顧客が残るリスク

### Option B: 別の admin に引き継ぐ (緊急対応)

退職前に別の admin (例: 後任の社員) のアカウントで GA4 / Search Console を OAuth 連携した上で、Firestore で一括更新する。

1. 後任 admin が GrowReporter にログイン → アカウント設定で GA4 / GSC を OAuth 連携
2. 後任 admin の `users/{後任 uid}/oauth_tokens` に有効なトークンが保存されたことを確認
3. 後任 admin の token doc id を取得
4. Firestore コンソール or 一括更新スクリプトで以下を実行:

```javascript
// 一括更新スクリプト例 (Firebase Admin SDK)
const sites = await db.collection('sites')
  .where('ga4TokenOwner', '==', '退職 admin uid')
  .get();

const batch = db.batch();
for (const siteDoc of sites.docs) {
  batch.update(siteDoc.ref, {
    ga4TokenOwner: '後任 admin uid',
    ga4OauthTokenId: '後任の GA4 token doc id',
  });
}
await batch.commit();

// GSC も同様
```

メリット: 顧客に手間をかけない、即座に切替可能
デメリット: GA4 / Search Console の Google 側で「後任 admin に閲覧権限を付与」してもらう必要がある (顧客とのコミュニケーション必要)、後任もまた退職リスクあり

### Option C: admin → 顧客に「完全移管」(OAuth も含む)

`adminReverseSiteOwnership` で admin が一旦取り戻した後、`ga4TokenOwner` / `gscTokenOwner` を顧客 uid にセットして再移管。実質 Option A と同じだが手作業。

非推奨 (Option A の自動化された UI で済むため)。

## 推奨フロー

1. **退職 1 ヶ月前**: 全顧客に「OAuth 連携を自分のアカウントで再連携してください」案内メール送信
2. **退職 2 週間前**: 未対応顧客にリマインド送信 + 個別フォローアップ
3. **退職前**: 残った未対応サイトを Option B (後任 admin に引き継ぎ) で処理
4. **退職後**: `users/{退職 admin uid}` および `adminUsers/{退職 admin uid}` を削除前に、`sites where ga4TokenOwner==退職uid` および `gscTokenOwner==退職uid` がゼロになっていることを確認
5. **削除実行**: 確認後に `deleteUser` callable で削除 (退職 admin が `_transferredFromUid` として残っているサイトは自動逆移管されるが、ga4TokenOwner / gscTokenOwner として残っていると次回フェッチでエラーになる)

## モニタリング

### 退職 admin がトークン保持しているサイト数の確認

```bash
# Cloud Functions ログで「token failed」を集計
firebase functions:log --only fetchGA4Data | grep "tokenOwnerId.*退職uid"
```

または admin ダッシュボードで「OAuth 連携: 当社代行運用中」サイト数を可視化 (将来の機能拡張)。

## 関連ファイル

- `functions/src/utils/tokenManager.js` — OAuth トークン取得層
- `functions/src/callable/fetchGA4Data.js:88` — `siteData.ga4TokenOwner || siteData.userId` フォールバック
- `functions/src/callable/claimSiteTokenOwnership.js` — 顧客側トークン切替 callable
- `functions/src/callable/admin/adminTransferSiteOwnership.js` — 引き渡し時のトークン保持
- `functions/src/callable/admin/adminReverseSiteOwnership.js` — 取り戻し時のトークン保持
- `src/pages/SiteDetail.jsx` — 顧客側 OAuth 代行運用バッジ + 切替ボタン

## 履歴

- 2026-05-04: 初版 (v5.17.0 サイト所有権移管機能リリース時に作成)
