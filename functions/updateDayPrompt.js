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

const dayPromptTemplate = `あなたは優秀なWebアクセスの解析士です。\${period}のWebサイトの日別データを分析し、**日々の変動パターンから実用的なインサイト**を含む日本語の要約を**必ず800文字以内**で生成してください。

【期間全体のデータ】
- 総セッション数: \${metrics.sessions?.toLocaleString() || 0}回
- 総コンバージョン数: \${metrics.conversions?.toLocaleString() || 0}件（CV定義ありの場合）
- データ日数: \${metrics.dailyDataCount || 0}日
\${dailyStatsText || ''}
\${dailyDetailText || ''}

【要求事項】
- **800文字以内で簡潔にまとめる**（これは厳守してください）
- Markdownの見出し記法（##, ###）を使用して構造化
- **必ず以下のセクションを含める**：

## 概要
- 対象期間の日別データ全体を2-3文で総括
- 総セッション数、1日平均、変動幅を数値で明示
- CV定義ありの場合は、総コンバージョン数と全体CVRも記載
  例：「総セッション数11,250回、1日平均375回。変動幅65%で比較的安定。総CV 45件（全体CVR 0.40%）」

## セッションの考察
- **セッションが多い日・少ない日の対比**：
  具体的な日付と数値を必ず明示
  例：「最大は9月18日（月）502セッション、最小は9月13日（水）320セッション。差は182セッション（約1.6倍）」
- **曜日による傾向**：
  各曜日の特徴を数値で示す
  例：「週末（土日）は平日比+28%で、平均で105セッション多い」
- **期間内のトレンド**：
  増加傾向/減少傾向/安定を評価
  例：「月初365回/日 → 月末420回/日と+15.1%の増加傾向」
- **なぜセッションが変動したか**の仮説：
  曜日効果、イベント・キャンペーン、広告配信の波など

## コンバージョンの考察
（CV定義がある場合のみ。ない場合はこのセクションを省略し、改善点で代替）
- **コンバージョンが多い日・少ない日の対比**：
  具体的な日付と数値を明示
  例：「最大は9月20日（水）8件、最小は9月5日（火）0件」
- **CVRの変動分析**：
  CVRが高い日/低い日の特徴を数値で示す
  例：「CVRが高い日は平均2.1%（水曜日に集中）、低い日は0.3%（日曜日に集中）」
- **セッション数とCVの相関**：
  セッションが多い日にCVも多いか、独立しているかを評価
  例：「セッション数とCV数の相関係数0.68で中程度の正の相関」
- **なぜコンバージョンが変動したか**の仮説：
  ユーザーの検討期間、曜日による購買意欲の違い、施策の効果など

## 改善点
- **優先改善課題**を2-3点挙げる：
  - セッションの安定化施策
    例：「変動が大きい場合、広告配信の平準化や継続的なコンテンツ更新」
  - コンバージョン獲得の最適化（CV定義ありの場合）
    例：「CVRが高い曜日・時間帯に広告予算を集中投下」
  - CVが少ない日の対策（CV定義ありの場合）
    例：「特定曜日のCVR低下要因の特定と改善（フォーム改善、CTA最適化）」
  - トラフィック増加施策（CV定義なしの場合）
    例：「セッションが少ない曜日への施策強化（SNS投稿、メルマガ配信）」
  - 曜日特性に応じた施策
    例：「平日・週末で異なるユーザー行動に合わせたコンテンツ・広告の出し分け」

【禁止事項】
- ❌ 統計値の羅列のみで終わる
- ❌ 数値を示さない抽象的な表現（「多い」「少ない」だけ）
- ❌ セクション（概要、セッション、コンバージョン※CV定義ありの場合、改善点）の欠落
- ❌ 対比（多い日vs少ない日）の具体的な日付・数値がない
- ❌ 日別詳細データがあるのに活用しない
`;

async function updateDayPrompt() {
  console.log('🚀 日別分析プロンプトを更新します...');
  const docId = `day_default_v1`;
  const docRef = db.collection('promptTemplates').doc(docId);

  try {
    await docRef.set({
      pageType: 'day',
      version: '1.0',
      isActive: true,
      isDefault: true,
      title: '日別分析 - デフォルト',
      description: '優秀なWebアクセス解析士、日々の変動パターンを全日付データから分析',
      template: dayPromptTemplate,
      createdBy: 'system',
      usageCount: 0,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    }, { merge: true });
    console.log(`✅ 日別分析プロンプトを更新しました`);
    console.log(`   タイトル: 日別分析 - デフォルト`);
    console.log(`   説明: 優秀なWebアクセス解析士、日々の変動パターンを全日付データから分析`);
  } catch (error) {
    console.error(`❌ エラー発生 (日別分析プロンプト):`, error);
  }
  console.log(`\n✨ 完了しました！`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  updateDayPrompt().catch(console.error);
}


