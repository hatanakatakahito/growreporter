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

// 注意：カスタムテンプレートでは weeklyStatsText と weeklyDetailText 変数が使用可能です
const weekPromptTemplate = `あなたは優秀なWebアクセスの解析士です。\${period}のWebサイトの曜日別データを分析し、**曜日ごとの変動パターンから実用的なインサイト**を含む日本語の要約を**必ず800文字以内**で生成してください。

【期間全体のデータ】
\${weeklyStatsText || ''}
\${weeklyDetailText || ''}

【要求事項】
- **800文字以内で簡潔にまとめる**（これは厳守してください）
- Markdownの見出し記法（##, ###）を使用して構造化
- **必ず以下のセクションを含める**：

## 概要
- 対象期間の曜日別データ全体を2-3文で総括
- 統計情報（最大・最小・平均セッション）を数値で明示
- CV定義がある場合は、CV数と全体CVRも記載
  例：「最大は金曜日1,812セッション、最小は火曜日1,413セッション。CV 104件（全体CVR 0.92%）」

## セッションの考察
- **セッションが多い曜日・少ない曜日の対比**：
  具体的な曜日と数値を必ず明示
  例：「最大は金曜日1,812セッション、最小は火曜日1,413セッション。差は399セッション（約1.3倍）」
- **平日vs週末の傾向**：
  平日と週末の平均を比較
  例：「平日平均1,650回/日、週末平均1,450回/日で平日が+13.8%多い」
- **曜日パターンの特徴**：
  週の前半・後半、特定曜日の特徴を分析
  例：「週末に向けて徐々に増加するパターン」または「火曜・木曜にピークがある」
- **なぜセッションが変動したか**の仮説：
  BtoB/BtoCの特性、ライフスタイル、イベント・キャンペーンの影響など

## コンバージョンの考察
（CV定義がある場合のみ。ない場合はこのセクションを省略し、次の改善点セクションに進む）
- **コンバージョンが多い曜日・少ない曜日の対比**：
  具体的な曜日と数値を明示
  例：「最大は水曜日18件、最小は日曜日10件。差は1.8倍」
- **CVRの変動分析**：
  CVRが高い曜日/低い曜日の特徴を数値で示す
  例：「CVRが高いのは水曜日1.2%、木曜日1.1%。低いのは日曜日0.6%」
- **セッション数とCVの相関**：
  セッションが多い曜日にCVも多いか、独立しているかを評価
  例：「セッション数とCV数に強い相関があり、セッションが多い日ほどCV獲得が期待できる」
- **なぜコンバージョンが変動したか**の仮説：
  ユーザーの検討・意思決定サイクル、曜日による購買意欲の違いなど

## 改善点
- **優先改善課題**を2-3点挙げる：
  - セッション獲得の最適化
    例：「セッションが少ない曜日（火曜日など）への施策強化（広告予算配分、SNS投稿）」
  - コンバージョン獲得の最適化（CV定義ありの場合）
    例：「CVRが高い曜日（水曜・木曜）に広告予算を集中投下してROAS向上」
  - CVが少ない曜日の対策（CV定義ありの場合）
    例：「週末のCVR低下要因の特定と改善（限定キャンペーン、週末対応の強化）」
  - トラフィック増加施策（CV定義なしの場合）
    例：「全体的なトラフィック増加に向けた曜日別の施策強化」
  - 曜日特性に応じた施策
    例：「平日・週末で異なるユーザー行動に合わせたコンテンツ・広告の出し分け」

【禁止事項】
- ❌ 統計値の羅列のみで終わる
- ❌ 数値を示さない抽象的な表現（「多い」「少ない」だけ）
- ❌ 必須セクション（概要、セッション、コンバージョン※CV定義ありの場合、改善点）の欠落
- ❌ 対比（多い曜日vs少ない曜日）の具体的な曜日・数値がない
- ❌ 曜日別詳細データがあるのに活用しない
`;

async function updateWeekPrompt() {
  console.log('🚀 曜日別分析プロンプトを更新します...');
  const docId = `week_default_v1`;
  const docRef = db.collection('promptTemplates').doc(docId);

  try {
    await docRef.set({
      pageType: 'week',
      version: '1.0',
      isActive: true,
      isDefault: true,
      title: '曜日別分析 - デフォルト',
      description: '優秀なWebアクセス解析士、曜日ごとの変動パターンを全7曜日データから分析',
      template: weekPromptTemplate,
      createdBy: 'system',
      usageCount: 0,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    }, { merge: true });
    console.log(`✅ 曜日別分析プロンプトを更新しました`);
    console.log(`   タイトル: 曜日別分析 - デフォルト`);
    console.log(`   説明: 優秀なWebアクセス解析士、曜日ごとの変動パターンを全7曜日データから分析`);
  } catch (error) {
    console.error(`❌ エラー発生 (曜日別分析プロンプト):`, error);
  }
  console.log(`\n✨ 完了しました！`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  updateWeekPrompt().catch(console.error);
}


