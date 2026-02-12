import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

// Firebase Admin初期化
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const serviceAccount = JSON.parse(
  readFileSync(join(__dirname, 'growgroupreporter-007e0991bce2.json'), 'utf8')
);

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

const channelsPromptTemplate = `あなたは優秀なWebアクセスの解析士です。\${period}のWebサイトの集客チャネルデータを分析し、**チャネルごとの変動パターンから実用的なインサイト**を含む日本語の要約を**必ず800文字以内**で生成してください。

【流入チャネルデータ】
- 総セッション数: \${metrics.totalSessions?.toLocaleString() || 0}回
- 総ユーザー数: \${metrics.totalUsers?.toLocaleString() || 0}人
- 総コンバージョン数: \${metrics.totalConversions?.toLocaleString() || 0}件（CV定義ありの場合）
- チャネル数: \${metrics.channelCount || 0}個

【チャネル別の内訳】
\${channelsText || 'データなし'}

【要求事項】
- **800文字以内で簡潔にまとめる**（これは厳守してください）
- Markdownの見出し記法（##, ###）を使用して構造化
- **必ず以下のセクションを含める**：

## 概要
- 対象期間の集客チャネル全体を2-3文で総括
- 総セッション数、総ユーザー数、総コンバージョン数（CV定義ありの場合）を数値で明示
- チャネル数と主要チャネルを簡潔に記述
  例：「総セッション数11,255回、5つのチャネルから集客。Organic Searchが最大」

## セッションの考察
- **セッションが多いチャネル・少ないチャネルの対比**：
  上位3チャネルと具体的な数値を明示
  例：「Organic Search 4,250セッション（37.8%）、Direct 2,890セッション（25.7%）、Paid Search 1,680セッション（14.9%）」
- **チャネルの集中度**：
  上位チャネルのシェアを評価
  例：「上位3チャネルで全体の78.4%を占める（集中型）」
- **各チャネルの特徴**：
  - Organic Search: SEOの成果、ブランド認知度の指標
  - Paid Search/Display: 広告投資の直接的な成果
  - Direct: ブランド力、リピーター、ブックマークの指標
  - Social: SNS施策の効果
  - Referral: 外部サイトからの被リンク効果
- **なぜこのようなセッション分布になったか**の仮説：
  SEO対策の成果、広告予算配分、ブランド力、SNS活動など

## コンバージョンの考察
（CV定義がある場合のみ。ない場合はこのセクションを省略し、改善点で代替）
- **コンバージョンが多いチャネル・少ないチャネルの対比**：
  各チャネルのCV数と具体的な数値を明示
  例：「Organic Search 42件（CVR 0.99%）、Paid Search 28件（CVR 1.67%）、Direct 18件（CVR 0.62%）」
- **CVRの比較分析**：
  CVRが高いチャネル/低いチャネルの特徴を数値で示す
  例：「Paid SearchはCVR 1.67%と最も高く、セッション数は少ないが質が高い」
- **セッション数とCVの相関**：
  セッションが多いチャネルにCVも多いか、独立しているかを評価
  例：「Organic Searchはセッション数・CV数ともに最大で、安定した獲得チャネル」
- **なぜチャネルごとにCVRが異なるか**の仮説：
  - Paid Search: 広告でターゲティングされた質の高いユーザー
  - Organic Search: 能動的に検索した購買意欲の高いユーザー
  - Direct: リピーターが多く、サイトへの信頼度が高い
  - Social: 認知段階のユーザーが多く、CVRは低め

## 改善点
- **優先改善課題**を2-3点挙げる：
  - セッション獲得の最適化
    例：「セッションが少ないチャネルへの施策強化（SEO強化、SNS活動、広告予算配分）」
  - コンバージョン獲得の最適化（CV定義ありの場合）
    例：「CVRが高いチャネル（Paid Searchなど）に広告予算を集中投下してROAS向上」
  - CVRが低いチャネルの対策（CV定義ありの場合）
    例：「Directチャネルの離脱率改善、ランディングページ最適化」
  - トラフィック増加施策（CV定義なしの場合）
    例：「全体的なトラフィック増加に向けたチャネル別の施策強化」
  - チャネル依存度のリスク管理
    例：「特定チャネルへの過度な依存を避け、複数チャネルへの分散投資」
- **なぜこのようなチャネル構成になっているか**の総合的な仮説：
  現在のマーケティング戦略、ブランド認知度、コンテンツ戦略の成果、競合動向など

【禁止事項】
- ❌ チャネル名の羅列のみで終わる
- ❌ 数値を示さない抽象的な表現
- ❌ CV定義ありの場合: 4つのセクション（概要、セッション、コンバージョン、改善点）の欠落
- ❌ CV定義なしの場合: 3つのセクション（概要、セッション、改善点）の欠落
`;

async function updateChannelsPrompt() {
  console.log('🚀 集客チャネルプロンプトを更新します...');
  const docId = `channels_default_v1`;
  const docRef = db.collection('promptTemplates').doc(docId);

  try {
    await docRef.set({
      pageType: 'channels',
      version: '1.0',
      isActive: true,
      isDefault: true,
      title: '集客チャネル - デフォルト',
      description: '優秀なWebアクセス解析士、4軸構成（概要・セッション・コンバージョン・改善点）',
      template: channelsPromptTemplate,
      createdBy: 'system',
      usageCount: 0,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    }, { merge: true });
    console.log(`✅ 集客チャネルプロンプトを更新しました`);
    console.log(`   タイトル: 集客チャネル - デフォルト`);
    console.log(`   説明: 優秀なWebアクセス解析士、4軸構成（概要・セッション・コンバージョン・改善点）`);
  } catch (error) {
    console.error(`❌ エラー発生 (集客チャネルプロンプト):`, error);
  }
  console.log(`\n✨ 完了しました！`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  updateChannelsPrompt().catch(console.error);
}

