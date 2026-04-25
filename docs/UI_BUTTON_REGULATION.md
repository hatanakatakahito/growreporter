# GrowReporter ボタンカラー レギュレーション

> このドキュメントは GrowReporter におけるボタンの **唯一の正規仕様** です。新規実装時はここを参照し、`<Button variant="...">` を使ってください。
>
> インラインの `bg-blue-*` / `from-* to-*` などの直書きは**原則禁止**です（このドキュメントで定義された7 variant でカバーできない場合のみ、レビュー時に個別判断）。

---

## 0. 視覚モック

実機に近い見た目で variant を比較したい場合は以下を開いてください:

- [docs/mockups/ai-button-color-candidates.html](mockups/ai-button-color-candidates.html)
  （ローカル: `file:///c:/Users/hatan/GrowReporterFinal/docs/mockups/ai-button-color-candidates.html`）

---

## 1. variant 一覧（迷ったらここを見る）

| variant | 色 | 用途 | 代表例 |
|---------|----|------|--------|
| `primary` | `bg-primary` (#3758F9) + `hover:bg-opacity-90` | メインCTA・確定アクション | 「保存」「次へ」「追加」「送信」「着手する」 |
| `secondary` | `bg-white` + `border-stroke` + `text-dark` | プライマリの隣に置くサブ操作 | 「保存して終了」「キャンセル代わりの代替案」 |
| `ghost` | 透明 + `text-body-color` | 取り消し・離脱・控えめな操作 | 「キャンセル」「戻る」「見送り」「あとで」 |
| `success` | `bg-green-600` + `hover:bg-green-700` | 完了・承認・成功確定 | 「完了にする」「登録を完了する」 |
| `danger` | `bg-red-600` + `hover:bg-red-700` | 破壊的操作 | 「削除」「アカウント削除」「メンバー解除」 |
| `danger-outline` | `bg-white` + `text-red-600` + `border-red-200` | 破壊的だが目立たせたくない | ダイアログ内の「削除」 |
| `ai` | `bg-gradient-ai`（青→紫→桃 3色） | AI機能を **使う** アクション | 「AI分析を生成」「AIに質問する」「再分析」「サイト改善案を生成する」「AIチャット送信」「タスクに追加（AI提案由来）」 |
| `upgrade` | `bg-gradient-business`（赤→桃 2色） | プランを **上げる／買う** アクション | 「ビジネスプランに申し込む」「プランを変更する」「制限を解除する」 |

### サイズ
| size | クラス | 用途 |
|------|------|------|
| `sm` | `px-3 py-1.5 text-xs` | テーブル行内・タグ並列・コンパクト |
| `md`（既定） | `px-4 py-2 text-sm` | 通常 |
| `lg` | `px-6 py-2.5 text-sm` | フォーム末尾・主要CTA・ヒーロー |

### 形状オプション
- 既定 `rounded-lg`
- `pill` prop で `rounded-full`（フローティングボタンや「おすすめ」バッジ的な装飾用）

### 状態
- `disabled` → `opacity-50` + `cursor-not-allowed`（自動付与）
- `loading` → 任意で children を `<DotWaveSpinner />` に差し替え

---

## 2. 使い方

### 基本
```jsx
import { Button } from '@/components/ui/button';

// 通常のCTA
<Button variant="primary">保存</Button>

// AI機能
<Button variant="ai" size="lg">
  <Sparkles data-slot="icon" />
  AI分析を生成
</Button>

// アップグレード
<Button variant="upgrade">ビジネスプランに申し込む</Button>

// 完了アクション
<Button variant="success" onClick={handleComplete}>完了にする</Button>

// 削除
<Button variant="danger">削除</Button>

// キャンセル
<Button variant="ghost">キャンセル</Button>
```

### サイズ
```jsx
<Button variant="primary" size="sm">保存</Button>
<Button variant="primary">保存</Button>           {/* size 省略 = md */}
<Button variant="primary" size="lg">保存</Button>
```

### フォーム送信
```jsx
<Button variant="primary" type="submit" form="my-form">送信</Button>
```

### 円形（pill）
```jsx
<Button variant="primary" pill size="sm">＋</Button>
```

### リンクボタン
```jsx
<Button variant="primary" href="/dashboard">ダッシュボードへ</Button>
```

### 後方互換（既存コード用、新規では使わない）
```jsx
<Button color="blue">保存</Button>   {/* deprecated: → variant="primary" */}
<Button outline>削除</Button>        {/* deprecated: → variant="secondary" or "danger-outline" */}
<Button plain>キャンセル</Button>    {/* deprecated: → variant="ghost" */}
```

---

## 3. variant 決定フローチャート

```
そのボタンを押すと何が起きる？
│
├─ データを保存／追加／送信する
│   → primary
│
├─ 完了・承認・登録を確定する
│   → success
│
├─ 削除する／取り消せない操作をする
│   → danger（または danger-outline）
│
├─ AI機能を使う（生成・分析・チャット）
│   → ai
│
├─ プランを上げる／課金する
│   → upgrade
│
├─ サブの選択肢として並べる（プライマリの隣）
│   → secondary
│
└─ キャンセル・閉じる・離脱
    → ghost
```

### よくある間違い
- ❌ AI機能の中で「タスクに追加」を `primary` にする → ✅ AI 文脈なら `ai`
- ❌ 「ビジネスプランに申し込む」を `ai` にする（AIが解放されるから）→ ✅ プラン購買は `upgrade`
- ❌ エラーの「再試行」を `danger` にする（赤いから）→ ✅ 復旧アクションは `primary`
- ❌ 「キャンセル」を `secondary` で目立たせる → ✅ キャンセルは `ghost`（控えめ）
- ❌ `<button className="bg-blue-500">` でインライン → ✅ `<Button variant="primary">`

---

## 4. 装飾要素（ボタンではないが同じトークンを使う）

| 要素 | クラス | 意味 |
|------|------|------|
| AI分析結果ボックス（薄背景） | `bg-gradient-ai-soft` | AI出力の可読性確保 |
| AI分析セクションの円形アイコン | `bg-gradient-ai` | AI機能を示すヘッダ装飾 |
| アップグレードモーダルのヘッダ帯 | `bg-gradient-business` | 課金訴求の装飾 |
| ロック画面のSparkleアイコン | `bg-gradient-business` | プラン制限を示す装飾 |
| 「おすすめ」小バッジ（Register/CompleteProfile） | `bg-gradient-business` | ビジネス推奨マーク |
| プラン制限の進捗バー | `bg-gradient-business` | 制限到達訴求 |
| 新規登録ヘッダ帯 | `bg-gradient-primary`（既存・例外） | オンボーディング装飾 |

---

## 5. レギュレーション対象外（変更しない）

以下はクリック可能なボタンではない・または機能要件で別色が必要なため、今回のレギュレーション対象外です。

### 状態バッジ・ステータス表示（クリック不能）
- [src/pages/Improve.jsx](../src/pages/Improve.jsx) の `categoryColors` / `priorityColors`
- [src/components/Improve/StatusActionCell.jsx](../src/components/Improve/StatusActionCell.jsx) の計測中／完了／エラー表示
- [src/components/Improve/EffectMeasurementPanel.jsx](../src/components/Improve/EffectMeasurementPanel.jsx) の効果計測バッジ

### プランバッジ（識別が機能要件）
- [src/constants/plans.js](../src/constants/plans.js) の `getPlanBadgeColor`
  - Free = `from-blue-500 to-blue-600`（青系）
  - Business = `from-red-400 to-pink-600`（赤桃系）

### Catalyst UI Kit のその他コンポーネント
- [src/components/ui/](../src/components/ui/) 配下の `dropdown.jsx` / `dialog.jsx` / `combobox.jsx` などは Catalyst のスタイルをそのまま使う（`data-focus:bg-blue-500` 等は維持）

### メール HTML 内の AI グラデ
- メールクライアントのレンダリング差異が大きいため、メール内では **AI グラデを使わない**（CTA は `#3758F9` 単色に統一）
- 例外: `getBusinessUpsellHtml()` の赤桃グラデは `bg-gradient-business` と HEX が一致しているため維持

---

## 6. 新規追加色トークン

[tailwind.config.js](../tailwind.config.js) に追加済み:

```js
backgroundImage: {
  'gradient-primary': 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',          // 既存（オンボーディング装飾）
  'gradient-ai': 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%)',  // 新規（AI variant）
  'gradient-ai-hover': 'linear-gradient(135deg, #2563eb 0%, #7c3aed 50%, #db2777 100%)',
  'gradient-ai-soft': 'linear-gradient(135deg, #dbeafe 0%, #ede9fe 50%, #fce7f3 100%)',
  'gradient-business': 'linear-gradient(135deg, #f87171 0%, #ec4899 100%)',         // 新規（upgrade variant）
  'gradient-business-hover': 'linear-gradient(135deg, #ef4444 0%, #db2777 100%)',
  'gradient-business-soft': 'linear-gradient(135deg, #fee2e2 0%, #fce7f3 100%)',
}
```

[src/index.css](../src/index.css) の `@theme` にも対応する CSS 変数を定義済み。

---

## 7. レビュー時のチェックリスト

PR レビュー時に以下を確認:

- [ ] 新規・変更したボタンが全て `<Button variant="...">` を使っているか
- [ ] インラインで `bg-blue-*` / `bg-red-*` / `bg-green-*` / `bg-pink-*` / `bg-primary` / `from-* to-*` などを直書きしていないか
- [ ] AI 機能のボタンが `variant="ai"` になっているか
- [ ] アップグレード CTA が `variant="upgrade"` になっているか（`ai` ではない）
- [ ] 削除ボタンが `variant="danger"`（または `danger-outline`）になっているか
- [ ] キャンセルが `variant="ghost"` になっているか（`secondary` ではない）
- [ ] 完了アクションが `variant="success"` になっているか
- [ ] サイズ指定（sm/md/lg）が周辺のボタンと整合しているか

---

## 8. 変更履歴

| 日付 | 変更 |
|------|------|
| 2026-04-25 | 初版策定 — 7 variant（primary / secondary / ghost / success / danger / ai / upgrade）+ danger-outline を確立。AI色 = 3色グラデ、Upgrade色 = ビジネスプラン色。フロント・メール HTML 全ファイルを統一移行。 |
