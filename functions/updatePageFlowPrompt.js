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

const pageFlowPromptTemplate = `あなたはページ導線最適化の専門家です。\${period}の特定ページ「\${metrics.pagePath || '対象ページ'}」への流入元を分析し、**サイト内導線の改善とページへの流入増加に役立つビジネスインサイト**を含む日本語の要約を**必ず800文字以内**で生成してください。

【画面表示データ】\${pageFlowText}\${inboundText}\${trafficBreakdownText}

【要求事項】
- **800文字以内で簡潔にまとめる**（これは厳守してください）
- Markdownの見出し記法（##, ###）を使用して構造化
- **サイト内の流入元ページの特徴を分析**：
  - 主要な流入元ページ（Top 3-5）を特定
  - それぞれの流入元ページの役割・特性を考察
  - 流入割合から導線の強さを評価
- **流入パターンの評価**：「なぜそのページから流入が多いのか」を推測
  - 内部リンクの配置状況
  - コンテンツの関連性
  - ユーザーの自然な行動フロー
- **ランディングページと遷移の割合を評価**：
  - ランディングページ（セッション最初）の割合
  - サイト内遷移の割合
  - 外部・直接アクセスの割合
- **具体的なアクションを1-3点提案**：
  - 【サイト内導線強化】：主要流入元ページからのリンク改善、関連ページへの内部リンク追加
  - 【流入増加施策】：流入が少ないが関連性の高いページからの導線追加
  - 【ページ改善】：流入元ページからのユーザー期待に応える情報充実
  - 各提案の優先順位と期待効果を明示
- 数値の羅列ではなく、「どこから、どう流入を増やすか」を具体的に記述

【禁止事項】
- ❌ 画面に表示されていない情報（離脱率、セッション数など）について言及する
- ❌ 離脱改善について提案する（このページでは離脱データを扱わない）
- ❌ 数値の羅列のみで終わる
- ❌ 抽象的な表現（「多い」「少ない」など）のみで数値を示さない
`;

async function updatePageFlowPrompt() {
  console.log('🚀 ページフロープロンプトを更新します...');
  const docId = `pageFlow_default_v1`;
  const docRef = db.collection('promptTemplates').doc(docId);

  try {
    await docRef.set({
      pageType: 'pageFlow',
      version: '1.0',
      isActive: true,
      isDefault: true,
      title: 'ページフロー - デフォルト',
      description: 'ページ導線最適化の専門家、サイト内流入元分析・導線強化施策を提案',
      template: pageFlowPromptTemplate,
      createdBy: 'system',
      usageCount: 0,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    }, { merge: true });
    console.log(`✅ ページフロープロンプトを更新しました`);
    console.log(`   タイトル: ページフロー - デフォルト`);
    console.log(`   説明: ページ導線最適化の専門家、サイト内流入元分析・導線強化施策を提案`);
  } catch (error) {
    console.error(`❌ エラー発生 (ページフロープロンプト):`, error);
  }
  console.log(`\n✨ 完了しました！`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  updatePageFlowPrompt().catch(console.error);
}


