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

// 注意：カスタムテンプレートでは hourlyStatsText と hourlyDetailText 変数が使用可能です
const hourPromptTemplate = `あなたは優秀なWebアクセスの解析士です。\${period}のWebサイトの時間帯別データを分析し、**時間帯ごとの変動パターンから実用的なインサイト**を含む日本語の要約を**必ず800文字以内**で生成してください。

【期間全体のデータ】
\${hourlyStatsText || ''}
\${hourlyDetailText || ''}

【要求事項】
- **800文字以内で簡潔にまとめる**（これは厳守してください）
- Markdownの見出し記法（##, ###）を使用して構造化
- **必ず以下のセクションを含める**：

## 概要
- 対象期間の時間帯別データ全体を2-3文で総括
- 統計情報（最大・最小・平均セッション）を数値で明示
- CV定義がある場合は、CV数と全体CVRも記載
  例：「最大20時1,450セッション、最小4時50セッション。CV 104件（全体CVR 0.92%）」

## セッションの考察
- **セッションが多い時間帯・少ない時間帯の対比**：
  具体的な時間帯と数値を必ず明示
  例：「最大は20時1,450セッション、最小は4時50セッション。差は29倍」
- **時間帯区分別の傾向**：
  朝・日中・夜・深夜の特徴を割合で示す
  例：「朝（6-9時）8%、日中（10-17時）42%、夜（18-23時）38%、深夜（0-5時）12%」
- **ピーク時間帯の特定**：
  トップ3の時間帯を具体的に
  例：「ピークは20時・21時・14時で、上位3時間で全体の35%を占める」
- **なぜセッションが変動したか**の仮説：
  通勤時間、昼休み、帰宅後、深夜などの生活パターンとの関連

## コンバージョンの考察
（CV定義がある場合のみ。ない場合はこのセクションを省略し、次の改善点セクションに進む）
- **コンバージョンが多い時間帯・少ない時間帯の対比**：
  具体的な時間帯と数値を明示
  例：「最大は21時18件、最小は4時0件」
- **CVRの変動分析**：
  CVRが高い時間帯/低い時間帯の特徴を数値で示す
  例：「CVRが高いのは14時1.8%、21時1.5%。低いのは7時0.3%」
- **セッション数とCVの相関**：
  セッションが多い時間帯にCVも多いか、独立しているかを評価
  例：「14時はセッション少ないがCVR高く、費用対効果が良好」
- **なぜコンバージョンが変動したか**の仮説：
  ユーザーの意思決定タイミング、購買行動の時間帯特性など

## 改善点
- **優先改善課題**を2-3点挙げる：
  - セッション獲得の最適化
    例：「セッションが少ない時間帯（早朝など）への施策強化（広告配信、SNS投稿の時間最適化）」
  - コンバージョン獲得の最適化（CV定義ありの場合）
    例：「CVRが高い時間帯（14時・21時）に広告予算を集中投下してROAS向上」
  - CVが少ない時間帯の対策（CV定義ありの場合）
    例：「早朝のCVR低下要因の特定と改善（配信時間の見直し、ターゲティング最適化）」
  - トラフィック増加施策（CV定義なしの場合）
    例：「全体的なトラフィック増加に向けた時間帯別の施策強化」
  - リソース配分の最適化
    例：「ピーク時間帯への人的リソース集中（カスタマーサポート、チャット対応）」

【禁止事項】
- ❌ 統計値の羅列のみで終わる
- ❌ 数値を示さない抽象的な表現（「多い」「少ない」だけ）
- ❌ 必須セクション（概要、セッション、コンバージョン※CV定義ありの場合、改善点）の欠落
- ❌ 対比（多い時間帯vs少ない時間帯）の具体的な時間帯・数値がない
- ❌ 時間帯別詳細データがあるのに活用しない
`;

async function updateHourPrompt() {
  console.log('🚀 時間帯別分析プロンプトを更新します...');
  const docId = `hour_default_v1`;
  const docRef = db.collection('promptTemplates').doc(docId);

  try {
    await docRef.set({
      pageType: 'hour',
      version: '1.0',
      isActive: true,
      isDefault: true,
      title: '時間帯別分析 - デフォルト',
      description: '優秀なWebアクセス解析士、時間帯ごとの変動パターンを全24時間データから分析',
      template: hourPromptTemplate,
      createdBy: 'system',
      usageCount: 0,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    }, { merge: true });
    console.log(`✅ 時間帯別分析プロンプトを更新しました`);
    console.log(`   タイトル: 時間帯別分析 - デフォルト`);
    console.log(`   説明: 優秀なWebアクセス解析士、時間帯ごとの変動パターンを全24時間データから分析`);
  } catch (error) {
    console.error(`❌ エラー発生 (時間帯別分析プロンプト):`, error);
  }
  console.log(`\n✨ 完了しました！`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  updateHourPrompt().catch(console.error);
}
