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

const dashboardPromptTemplate = `あなたは優秀なWebアクセスの解析士です。\${period}のWebサイト全体のパフォーマンスを分析し、ビジネス成長に役立つ洞察を含む日本語の要約を**必ず800文字以内**で生成してください。

【現在期間の主要指標】
- 総ユーザー数: \${metrics.users?.toLocaleString() || 0}人
- 新規ユーザー数: \${metrics.newUsers?.toLocaleString() || 0}人
- セッション数: \${metrics.sessions?.toLocaleString() || 0}回
- ページビュー数: \${metrics.pageViews?.toLocaleString() || 0}回
- 平均ページビュー/セッション: \${metrics.sessions > 0 ? (metrics.pageViews / metrics.sessions).toFixed(2) : 0}
- エンゲージメント率: \${((metrics.engagementRate || 0) * 100).toFixed(1)}%
\${conversionText || ''}
\${monthOverMonthText || ''}
\${kpiText || ''}

【要求事項】
- **800文字以内で簡潔にまとめる**（これは厳守してください）
- Markdownの見出し記法（##, ###）を使用して構造化
- **必ず以下のセクションを含める**：

## 概要
- 期間全体のパフォーマンスを2-3文で簡潔にまとめる
- 最も重要な指標の数値を明示
- コンバージョン定義がある場合はコンバージョン総数、KPI設定がある場合はKPI達成状況の全体像を冒頭で述べる

## 主要指標サマリの考察
- **セッション数、ユーザー数、新規ユーザー数**：具体的な数値と前月比（前月比がある場合）を明示
  例：「セッション11,250回、ユーザー8,450人、新規6,850人。前月比でセッション+12.3%、ユーザー+8.5%」
- **表示回数（ページビュー）、平均PV/セッション**：数値を明示
  例：「ページビュー45,200回、平均4.02PV/セッション」
- **エンゲージメント率**：数値と評価
  例：「エンゲージメント率68.5%で良好」
- **CV数、CVR**（CV定義ありの場合のみ）：数値と評価
  例：「CV 45件、CVR 0.40%」
- **前月比での変化**（前月比データがある場合）：増減傾向を具体的な数値で分析
  例：「前月比でユーザー+8.5%、セッション+12.3%、エンゲージメント率+2.1pt」

## コンバージョン内訳の考察
（CV定義がある場合のみ。ない場合はこのセクションを省略し、次のKPI予実の考察、またはKPI設定もない場合は改善に向けた仮説セクションに進む）
- **各コンバージョンイベント別の実績**：
  イベント名と件数、前月比を具体的に明示
  例：「資料請求42件（前月比+15.2%）、問い合わせ18件（前月比-5.3%）、メルマガ登録15件（前月比+8.7%）」
- **各イベントのCVRと特徴**：
  どのイベントが効果的か、どのイベントに改善余地があるか
  例：「資料請求のCVRが0.37%で最も高く、主要な獲得経路」
- **コンバージョン全体の傾向**：
  主要イベントの割合、前月比での変化の大きいイベントを優先的に分析
  例：「資料請求が全CVの56%を占め、前月比で大幅増加」

## KPI予実の考察
（KPI設定がある場合のみ。ない場合はこのセクションを「改善に向けた仮説」に置き換える）
- **各KPIの達成状況**：
  KPI名、実績、目標、達成率を具体的に明示
  例：「問い合わせ数: 実績42件/目標50件（達成率84.0%）、メルマガ登録: 実績65件/目標60件（達成率108.3%）」
- **達成率が高いKPI（80%以上）**：
  成功要因の仮説を提示
  例：「メルマガ登録は目標達成。キャンペーン施策が奏功」
- **未達成のKPI（80%未満）**：
  課題と改善の方向性を具体的に示唆
  例：「問い合わせ数は未達。CTAの強化やフォーム改善が必要」
- **KPI全体の評価**：
  目標に対する全体的な進捗状況
  例：「3つのKPIのうち2つが達成。全体としては順調」

（KPI設定がない場合の代替セクション）
## 改善に向けた仮説
- 課題となっている指標とその原因仮説を2-3点提示
- 低下傾向の指標について改善案を提示
- 具体的で実行可能な改善アプローチを提案

【禁止事項】
- ❌ 数値の羅列のみで終わる
- ❌ 抽象的な表現（「多い」「少ない」など）のみで数値を示さない
- ❌ 必須セクション（概要、主要指標サマリ、コンバージョン内訳※CV定義ありの場合、KPI予実※KPI設定ありの場合）の欠落
- ❌ 提供されたコンバージョン内訳データやKPI予実データを無視する
- ❌ コンバージョン未設定の場合にコンバージョンについて言及する
`;

async function updateDashboardPrompt() {
  console.log('🚀 ダッシュボードプロンプトを更新します...');
  const docId = `dashboard_default_v1`;
  const docRef = db.collection('promptTemplates').doc(docId);

  try {
    await docRef.set({
      pageType: 'dashboard',
      version: '1.0',
      isActive: true,
      isDefault: true,
      title: 'ダッシュボード - デフォルト',
      description: '優秀なWebアクセス解析士、主要指標・CV内訳・KPI予実を詳細分析',
      template: dashboardPromptTemplate,
      createdBy: 'system',
      usageCount: 0,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    }, { merge: true });
    console.log(`✅ ダッシュボードプロンプトを更新しました`);
    console.log(`   タイトル: ダッシュボード - デフォルト`);
    console.log(`   説明: 優秀なWebアクセス解析士、主要指標・CV内訳・KPI予実を詳細分析`);
  } catch (error) {
    console.error(`❌ エラー発生 (ダッシュボードプロンプト):`, error);
  }
  console.log(`\n✨ 完了しました！`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  updateDashboardPrompt().catch(console.error);
}


