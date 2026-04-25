# 本番デプロイ前チェックリスト

このチェックリストの **すべての項目を完了** してから本番デプロイを実行してください。
セキュリティ強化プラン (`C:\Users\hatan\.claude\plans\ok-distributed-forest.md`) の各 Phase で必須です。

## 1. ローカル検証

- [ ] `npm run dev:emulator` が正常起動し、`http://localhost:4000` で Emulator UI が緑表示
- [ ] `seedEmulator.js` のテストデータでログイン成功
- [ ] **以下の主要シナリオがすべて動作**:
  - [ ] 新規メール+パスワード登録
  - [ ] Google ログイン (Auth Emulator のテスト IdP)
  - [ ] プロフィール編集（会社名・電話）
  - [ ] 通知設定トグル ON/OFF
  - [ ] サイト追加 (URL 取得を含む)
  - [ ] メンバー招待→受領 (同一メール / 別メール両方)
  - [ ] 改善提案作成・編集・削除
  - [ ] ページメモ作成・削除
  - [ ] 相談 Excel 送信
- [ ] 想定外の `permission-denied` / `unauthenticated` エラーがブラウザコンソールに出ていない

## 2. ビルド・Lint

- [ ] `npm run build` が警告なしで成功
- [ ] `npm run lint` が警告ゼロ
- [ ] `npm run check-metrics` が成功（メトリクス整合性）
- [ ] dist サイズが想定範囲内（前回比 +10% 以内）

## 3. rules 変更がある場合

- [ ] [Firebase Console > Firestore > Rules > Playground](https://console.firebase.google.com/project/growgroupreporter/firestore/rules) で本番データに対し dry-run:
  - [ ] 一般ユーザーが自分の `users/{uid}` に `role: 'admin'` を書く → **拒否**確認
  - [ ] 一般ユーザーが自分の `users/{uid}` に `notificationSettings` を書く → **許可**確認
  - [ ] 別アカウントメンバーが他人の `oauth_tokens` を読む → **拒否**確認
  - [ ] 認証ユーザーが他人の `sites/{siteId}/screenshots/x.png` を読む → **拒否**確認
- [ ] rules deploy はコード deploy の **30 分後** に実施（コード先行ルール）

## 4. データ migration がある場合

- [ ] migration スクリプトを **read-only モード**で先に実行し、対象件数を把握
- [ ] dry-run 出力をレビューしてから write モード実行
- [ ] migration ログを Cloud Logging で保存

## 5. シークレットローテがある場合

- [ ] 旧シークレットの参照箇所がすべて新シークレット参照に置換済
- [ ] Secret Manager に新値を登録済
- [ ] Cloud Functions の deploy で `--secrets` フラグまたは `defineSecret` 経由で新値が注入されることを確認
- [ ] 旧キーは新キー検証完了後に Inactive 化（即削除しない）

## 6. UX 影響変更がある場合

- [ ] `docs/USER_COMMUNICATION_TEMPLATES.md` に従い、2 週間前にお知らせメール送信済
- [ ] アプリ内バナー表示の準備済
- [ ] サポート対応 FAQ を準備

## 7. git tag・PR

- [ ] PR description にロールバック手順を記載
- [ ] PR description に Phase 番号と該当 step を明記（例: `Phase 1-2 / Phase 1-5`）
- [ ] `git tag pre-deploy-{YYYYMMDD-HHmm}-{phase}-{step}` を打って `git push --tags` 完了
- [ ] main に merge 済（PR 経由）

## 8. デプロイ実行とモニタリング

- [ ] デプロイ前に Cloud Logging のエラーモニタを別タブで開いた
- [ ] Slack `#alerts` に「Phase X-Y デプロイ開始」を投稿
- [ ] `firebase deploy --only {対象}` を実行
- [ ] **デプロイ後 30 分は他作業せず張り付き**:
  - [ ] 5 分後: ログイン動作確認
  - [ ] 10 分後: ダッシュボード閲覧確認
  - [ ] 15 分後: GA4 データ取得確認
  - [ ] 30 分後: 他フローのスポットチェック
- [ ] Cloud Logging で `permission-denied` / `unauthenticated` / `internal` エラー急増がないことを確認

## 9. デプロイ後の確認

- [ ] 主要 3 シナリオ（ログイン・サイト追加・GA4 取得）を手動で実行
- [ ] [Securityheaders.com](https://securityheaders.com/?q=grow-reporter.com) でスコア確認
- [ ] `git tag prod-{YYYYMMDD-HHmm}-{phase}-{step}` を打って動作確認済マーク
- [ ] `git push --tags` で push
- [ ] Slack `#alerts` に「Phase X-Y デプロイ完了 (tag: prod-XXX)」を投稿

## 10. 異常検知時

`docs/ROLLBACK_PROCEDURES.md` に従い直ちにロールバック実施。
