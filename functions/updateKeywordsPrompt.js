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

const keywordsPromptTemplate = `あなたは優秀なWebアクセスの解析士です。\${period}のWebサイトの流入キーワードデータ（Search Console）を分析し、**検索流入の変動パターンから実用的なインサイト**を含む日本語の要約を**必ず800文字以内**で生成してください。

【流入キーワードデータ】
- 総クリック数: \${metrics.totalClicks?.toLocaleString() || 0}回
- 総表示回数: \${metrics.totalImpressions?.toLocaleString() || 0}回
- 平均クリック率: \${(metrics.avgCTR || 0).toFixed(2)}%
- 平均掲載順位: \${(metrics.avgPosition || 0).toFixed(1)}位
- キーワード数: \${metrics.keywordCount || 0}個

【キーワード別の内訳（上位10件）】
\${metrics.topKeywordsText || 'データなし'}

【要求事項】
- **800文字以内で簡潔にまとめる**（これは厳守してください）
- Markdownの見出し記法（##, ###）を使用して構造化
- **必ず以下の6つのセクションを含める**：

## 概要
- 対象期間のキーワード全体を2-3文で総括
- 総クリック数、総表示回数、平均クリック率、平均掲載順位を数値で明示
- キーワード数と主要キーワードを簡潔に記述
  例：「総クリック1,250回、表示回数25,800回、平均クリック率4.85%、平均掲載順位12.3位。120個のキーワードから流入」

## クリック数の考察
- **クリック数が多いキーワード・少ないキーワードの対比**：
  上位3キーワードと具体的な数値を明示
  例：「"キーワードA" 450クリック（36.0%）、"キーワードB" 320クリック（25.6%）、"キーワードC" 180クリック（14.4%）」
- **キーワードの集中度**：
  上位キーワードのシェアを評価
  例：「上位3キーワードで全体の76%を占める（高集中型）」
- **なぜこのようなクリック分布になったか**の仮説：
  ブランドキーワード vs 一般キーワード、ロングテールキーワードの割合、検索意図の違いなど

## 表示回数の考察
- **表示回数が多いキーワード・少ないキーワードの対比**：
  表示回数上位3キーワードと具体的な数値を明示
  例：「"キーワードD" 8,500表示、"キーワードE" 6,200表示、"キーワードF" 4,100表示」
- **表示回数とクリック数の関係**：
  表示回数が多いのにクリックが少ないキーワードの特定
  例：「"キーワードG"は表示回数7,800回だがクリック60回（CTR 0.77%）と低調」
- **なぜこのような表示回数分布になったか**の仮説：
  検索ボリューム、順位、競合状況など

## クリック率の考察
- **クリック率が高いキーワード・低いキーワードの対比**：
  CTR上位/下位キーワードと具体的な数値を明示
  例：「"キーワードH"はCTR 15.2%と高く、タイトルが魅力的。一方"キーワードI"はCTR 1.8%と低調」
- **順位とクリック率の関係**：
  順位が高い（1-3位）キーワードのCTRを分析
  例：「上位3位以内のキーワードは平均CTR 25%で、4-10位は8%、11位以降は2%」
- **なぜクリック率が変動したか**の仮説：
  タイトル・ディスクリプションの魅力度、リッチスニペット表示、競合の強さなど

## 平均掲載順位の考察
- **掲載順位が高いキーワード・低いキーワードの対比**：
  順位上位/下位キーワードと具体的な数値を明示
  例：「"キーワードJ"は2.1位で安定、"キーワードK"は18.5位で改善余地あり」
- **順位とクリック数の関係**：
  順位が高いキーワードがクリック数も多いかを評価
  例：「順位3位以内のキーワードは平均クリック120回/月、4-10位は40回/月」
- **なぜこのような順位分布になったか**の仮説：
  SEOコンテンツの質、被リンク、ドメインオーソリティ、競合の強さなど

## 改善点
- **優先改善課題**を2-3点挙げる：
  - クリック数増加施策
    例：「表示回数が多いがクリックが少ないキーワードのタイトル・ディスクリプション改善」
  - 掲載順位向上施策
    例：「4-10位のキーワードを3位以内に引き上げる（コンテンツ強化、内部リンク最適化）」
  - クリック率改善施策
    例：「CTRが低いキーワードのメタタグ見直し、リッチスニペット対応」
  - 新規キーワード獲得施策
    例：「ロングテールキーワードを狙った新規コンテンツ作成」
- **なぜこのようなキーワード構成になっているか**の総合的な仮説：
  現在のSEO戦略、コンテンツ資産、ブランド認知度、競合動向など

【禁止事項】
- ❌ キーワードの羅列のみで終わる
- ❌ 数値を示さない抽象的な表現
- ❌ 6つのセクション（概要、クリック数、表示回数、クリック率、平均掲載順位、改善点）の欠落
`;

async function updateKeywordsPrompt() {
  console.log('🚀 流入キーワードプロンプトを更新します...');
  const docId = `keywords_default_v1`;
  const docRef = db.collection('promptTemplates').doc(docId);

  try {
    await docRef.set({
      pageType: 'keywords',
      version: '1.0',
      isActive: true,
      isDefault: true,
      title: '流入キーワード - デフォルト',
      description: '優秀なWebアクセス解析士、6軸構成（概要・クリック数・表示回数・クリック率・平均掲載順位・改善点）',
      template: keywordsPromptTemplate,
      createdBy: 'system',
      usageCount: 0,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    }, { merge: true });
    console.log(`✅ 流入キーワードプロンプトを更新しました`);
    console.log(`   タイトル: 流入キーワード - デフォルト`);
    console.log(`   説明: 優秀なWebアクセス解析士、6軸構成（概要・クリック数・表示回数・クリック率・平均掲載順位・改善点）`);
  } catch (error) {
    console.error(`❌ エラー発生 (流入キーワードプロンプト):`, error);
  }
  console.log(`\n✨ 完了しました！`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  updateKeywordsPrompt().catch(console.error);
}



