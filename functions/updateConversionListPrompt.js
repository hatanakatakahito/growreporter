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

const conversionsPromptTemplate = `あなたは優秀なWebアクセスの解析士です。\${period}のWebサイトのコンバージョン推移データを分析し、**成果最大化に役立つインサイト**を含む日本語の要約を**必ず800文字以内**で生成してください。

【コンバージョンデータ】
- データポイント数: \${metrics.monthlyDataPoints || 0}ヶ月分
- 総コンバージョン数: \${metrics.totalConversions?.toLocaleString() || 0}件

【コンバージョンイベント別の合計】
\${metrics.conversionSummaryText || 'データなし'}

【月次推移データ】
\${metrics.monthlyConversionTrendText || 'データなし'}

【要求事項】
- **800文字以内で簡潔にまとめる**（これは厳守してください）
- Markdownの見出し記法（##, ###）を使用して構造化
- **必ず以下の4つのセクションを含める**：

## 概要
- 対象期間のコンバージョン全体を2-3文で総括
- 総コンバージョン数、主要なコンバージョンイベントとその件数を数値で明示
- 月次推移の傾向を簡潔に記述
  例：「総コンバージョン1,250件。主要イベントは資料請求と問い合わせ。直近3ヶ月は増加傾向」

## 各コンバージョンごとの考察
- **主要コンバージョンイベントの分析**：
  上位3イベントを具体的な件数と割合で明示
  例：「資料請求 450件（36.0%）、問い合わせ 320件（25.6%）、購入完了 180件（14.4%）」
- **イベント間の比較**：
  各イベントの役割とビジネスへの貢献度を評価
  例：「資料請求はリード獲得、購入完了は直接売上に貢献」
- **なぜこのようなイベント構成になっているか**の仮説：
  サイトの目的、マーケティング施策、ユーザーの行動フェーズなど

## 月次推移の考察
- **期間内のトレンド分析**：
  月ごとの増減傾向を具体的な数値で明示
  例：「直近3ヶ月で総CVが前月比+15%増加。特に資料請求が大きく伸びている」
- **季節性・イベント性**：
  特定の月にCVが増減する要因を推測
  例：「年末商戦で購入完了が増加、新年度で資料請求が増加」
- **なぜこのような推移になったか**の仮説：
  キャンペーン実施、SEO強化、広告予算変更、季節要因など

## 改善点
- **優先改善課題**を2-3点挙げる：
  - 特定コンバージョンイベントの最適化
    例：「資料請求のフォーム改善でCVR向上、問い合わせの導線強化」
  - 全体コンバージョン数の増加
    例：「月次推移で減少傾向のイベントに対する施策強化」
  - ユーザー体験の向上
    例：「CVに至るまでのユーザー行動を分析し、ボトルネックを解消」
  - コンテンツ戦略の見直し
    例：「CVに繋がりやすいコンテンツの増産、CVに繋がらないコンテンツの改善」
- **なぜこのようなコンバージョン構成になっているか**の総合的な仮説：
  ビジネス戦略、マーケティング施策、サイトのUI/UX、ユーザーニーズなど

【禁止事項】
- ❌ コンバージョンイベント名の羅列のみで終わる
- ❌ 数値を示さない抽象的な表現
- ❌ 4つのセクション（概要、各コンバージョンごとの考察、月次推移の考察、改善点）の欠落
- ❌ 【コンバージョンイベント別の合計】に記載されていないイベント名や数値を使用する
- ❌ 架空のイベント名（入居のお申込完了、見学のお申込完了など）を推測して記載する
`;

async function updateConversionListPrompt() {
  console.log('🚀 コンバージョン一覧プロンプトを更新します...');
  const docId = `conversions_default_v1`;
  const docRef = db.collection('promptTemplates').doc(docId);

  try {
    await docRef.set({
      pageType: 'conversions',
      version: '1.0',
      isActive: true,
      isDefault: true,
      title: 'コンバージョン一覧 - デフォルト',
      description: '優秀なWebアクセス解析士、4軸構成（概要・各コンバージョンごと・月次推移・改善点）',
      template: conversionsPromptTemplate,
      createdBy: 'system',
      usageCount: 0,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    }, { merge: true });
    console.log(`✅ コンバージョン一覧プロンプトを更新しました`);
    console.log(`   タイトル: コンバージョン一覧 - デフォルト`);
    console.log(`   説明: 優秀なWebアクセス解析士、4軸構成（概要・各コンバージョンごと・月次推移・改善点）`);
  } catch (error) {
    console.error(`❌ エラー発生 (コンバージョン一覧プロンプト):`, error);
  }
  console.log(`\n✨ 完了しました！`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  updateConversionListPrompt().catch(console.error);
}

