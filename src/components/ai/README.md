# AI要約セクション共通コンポーネント

## 概要
`AISummarySection`は、全てのページで統一されたAI要約表示を提供する共通コンポーネントです。

## 特徴
- ✅ **自動キャッシュ管理**: 同じ条件の要約はキャッシュから取得
- ✅ **再生成機能**: ボタンクリックで要約を再生成可能
- ✅ **Markdown対応**: Markdownフォーマットを自動でHTMLに変換
- ✅ **ローディング表示**: 生成中は視覚的なフィードバックを提供
- ✅ **統一デザイン**: 全ページで一貫したUI/UX

## 使用方法

### 基本的な使い方

```typescript
import AISummarySection from '@/components/ai/AISummarySection';

// ページコンポーネント内で使用
<AISummarySection
  userId={user.uid}
  pageType="acquisition"
  startDate="2025-09-01"  // YYYY-MM-DD形式
  endDate="2025-09-30"    // YYYY-MM-DD形式
  contextData={{
    totalUsers: 1234,
    sessions: 5678,
    // ... その他のコンテキストデータ
  }}
/>
```

### Props

| プロパティ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `userId` | `string` | ✅ | ユーザーID（Firebase Auth） |
| `pageType` | `'summary' \| 'users' \| 'acquisition' \| 'engagement'` | ✅ | ページタイプ（キャッシュキーに使用） |
| `startDate` | `string` | ✅ | 開始日（YYYY-MM-DD形式） |
| `endDate` | `string` | ✅ | 終了日（YYYY-MM-DD形式） |
| `contextData` | `any` | ✅ | AI要約生成に必要なコンテキストデータ |
| `propertyId` | `string` | ❌ | GA4プロパティID（オプション） |
| `autoLoad` | `boolean` | ❌ | 自動ロード有効化（デフォルト: `true`） |
| `className` | `string` | ❌ | 追加のCSSクラス |

### ページタイプごとの使用例

#### 1. 全体サマリーページ
```typescript
<AISummarySection
  userId={user.uid}
  pageType="summary"
  startDate={startDate}
  endDate={endDate}
  contextData={{
    totalUsers: stats.totalUsers,
    sessions: stats.sessions,
    engagementRate: stats.engagementRate,
    keyEvents: stats.keyEvents
  }}
/>
```

#### 2. 集客ページ
```typescript
<AISummarySection
  userId={user.uid}
  pageType="acquisition"
  startDate={startDate}
  endDate={endDate}
  contextData={{
    totalChannels: channels.length,
    topChannels: channels.slice(0, 5).map(c => ({
      channel: c.channelName,
      users: c.users
    }))
  }}
/>
```

#### 3. エンゲージメントページ
```typescript
<AISummarySection
  userId={user.uid}
  pageType="engagement"
  startDate={startDate}
  endDate={endDate}
  contextData={{
    totalPages: pages.length,
    topPages: pages.slice(0, 5).map(p => ({
      pagePath: p.pagePath,
      pageviews: p.screenPageViews
    }))
  }}
/>
```

#### 4. ファイルダウンロードページ
```typescript
<AISummarySection
  userId={user.uid}
  pageType="engagement"
  startDate={startDate}
  endDate={endDate}
  contextData={{
    totalDownloads: downloads.length,
    topDownloads: downloads.slice(0, 5).map(d => ({
      filePath: d.filePath,
      clicks: d.clicks
    }))
  }}
/>
```

## コンテキストデータの設計

`contextData`には、AI要約生成に必要な情報を含めます：

### 推奨フォーマット
```typescript
{
  // 合計値
  total[Category]: number,
  
  // トップN件のデータ
  top[Category]: Array<{
    [key]: string | number,
    [value]: number
  }>
}
```

### 実例
```typescript
// ファイルダウンロードの場合
contextData={{
  totalDownloads: 42,
  topDownloads: [
    { filePath: '/pdf/guide.pdf', clicks: 150 },
    { filePath: '/pdf/catalog.pdf', clicks: 89 },
    // ...
  ]
}}
```

## 日付フォーマット

### 重要: YYYY-MM-DD形式を使用
コンポーネントに渡す日付は必ず`YYYY-MM-DD`形式にしてください。

```typescript
// ✅ 正しい
startDate="2025-09-01"
endDate="2025-09-30"

// ❌ 間違い
startDate="20250901"  // YYYYMMDD形式はNG
endDate="2025/09/30"  // スラッシュ区切りはNG
```

### YYYYMMDD形式からの変換
多くのページでは内部的に`YYYYMMDD`形式を使用しているため、変換が必要です：

```typescript
// YYYYMMDD → YYYY-MM-DD に変換
const formatDate = (date: string) => {
  if (date.length === 8) {
    return `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`;
  }
  return date;
};

const formattedStart = formatDate(startDate);
const formattedEnd = formatDate(endDate);

<AISummarySection
  startDate={formattedStart}
  endDate={formattedEnd}
  // ...
/>
```

## 動作フロー

1. **マウント時**: `autoLoad=true`の場合、データが揃ったら自動的にAI要約を取得
2. **キャッシュチェック**: まずFirestoreで既存の要約をチェック
3. **キャッシュヒット**: あれば即座に表示
4. **キャッシュミス**: Gemini APIで新規生成し、Firestoreに保存
5. **再生成**: 「再生成」ボタンでキャッシュを無視して新規生成

## トラブルシューティング

### AI要約が表示されない
- `contextData`が`null`または`undefined`になっていないか確認
- `startDate`と`endDate`が`YYYY-MM-DD`形式か確認
- コンソールログで`⚠️ AI要約取得スキップ`メッセージを確認

### 日付が正しくない
- `YYYYMMDD`形式の場合は必ず`YYYY-MM-DD`に変換してください
- DashboardLayoutから受け取る日付は既に`YYYY-MM-DD`形式です

### 無限ループが発生する
- `contextData`をuseEffectの外で定義するか、`useMemo`でメモ化してください
- `contextData`が毎回新しいオブジェクトとして生成されると無限ループになります

```typescript
// ❌ 悪い例
<AISummarySection
  contextData={{
    total: data.length  // 毎回新しいオブジェクト
  }}
/>

// ✅ 良い例
const contextData = useMemo(() => ({
  total: data.length
}), [data.length]);

<AISummarySection
  contextData={contextData}
/>
```

## 今後の拡張

### 新しいページタイプの追加
`pageType`に新しい値を追加する場合：

1. `src/components/ai/AISummarySection.tsx`の型定義を更新
```typescript
pageType: 'summary' | 'users' | 'acquisition' | 'engagement' | 'newtype'
```

2. `src/lib/ai/summaryService.ts`で新しいページタイプに対応したプロンプトを追加

### カスタマイズ
追加のスタイリングが必要な場合は`className` propsを使用：

```typescript
<AISummarySection
  className="mb-8 shadow-lg"
  // ...
/>
```

## 関連ファイル
- `src/components/ai/AISummarySection.tsx` - コンポーネント本体
- `src/lib/ai/summaryService.ts` - AI要約サービス
- `src/lib/firebase/adminFirestore.ts` - Firestoreアクセス


