/**
 * プロンプトテンプレート初期データ投入スクリプト
 * 
 * 実行方法:
 * node functions/src/migrations/seedPromptTemplates.js
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Firebase Admin初期化
const serviceAccount = JSON.parse(
  readFileSync(join(__dirname, '../../growgroupreporter-007e0991bce2.json'), 'utf8')
);

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

// 16画面分のデフォルトプロンプト
const defaultPrompts = [
  {
    id: 'dashboard_default_v1',
    pageType: 'dashboard',
    version: '1.0',
    isActive: true,
    isDefault: true,
    title: 'ダッシュボード - デフォルト',
    description: '優秀なWebアクセス解析士、4軸構成（概要・トレンド・評価・仮説）、CV内訳・KPI予実対応',
    template: `あなたは優秀なWebアクセスの解析士です。\${period}のWebサイト全体のパフォーマンスを分析し、ビジネス成長に役立つ洞察を含む日本語の要約を**必ず800文字以内**で生成してください。

【現在期間の主要指標】
- 総ユーザー数: \${metrics.users?.toLocaleString() || 0}人
- 新規ユーザー数: \${metrics.newUsers?.toLocaleString() || 0}人
- セッション数: \${metrics.sessions?.toLocaleString() || 0}回
- ページビュー数: \${metrics.pageViews?.toLocaleString() || 0}回
- エンゲージメント率: \${((metrics.engagementRate || 0) * 100).toFixed(1)}%
- 直帰率: \${((metrics.bounceRate || 0) * 100).toFixed(1)}%
- 平均セッション時間: \${metrics.avgSessionDuration ? \`\${Math.floor(metrics.avgSessionDuration / 60)}分\${Math.floor(metrics.avgSessionDuration % 60)}秒\` : '0秒'}\${conversionText}\${hasConversions ? \`\\n- コンバージョン率: \${((metrics.conversionRate || 0) * 100).toFixed(2)}%\` : ''}\${monthOverMonthText}\${kpiText}

【要求事項】
- **800文字以内で簡潔にまとめる**（これは厳守してください）
- Markdownの見出し記法（##, ###）を使用して構造化
- **必ず以下の4つのセクションを含める**：

## 概要
- 期間全体のパフォーマンスを2-3文で簡潔にまとめる
- 最も重要な指標（ユーザー、セッション、エンゲージメント率）の数値を明示
- \${hasConversions ? 'コンバージョン総数と主要イベントの概況' : ''}\${metrics.hasKpiSettings ? '、KPI達成状況の全体像' : ''}を冒頭で述べる

## 直近のトレンド
- 前月比データから増減傾向を具体的な数値で分析
- 特に変化の大きい指標（±10%以上）を優先的に取り上げる
- \${hasConversions ? 'コンバージョン内訳の各イベントの前月比を具体的に分析' : '基本指標の前月比を分析'}

## 評価できる点
- 成長している指標、改善している指標を2-3点挙げる
- 数値と前月比を明示（例：「ユーザー数が前月比+15.2%で5,000人に増加」）
- \${metrics.hasKpiSettings ? 'KPI予実で達成率が高い項目（達成率80%以上）を具体的に評価' : '改善傾向にある指標を評価'}

## 改善に向けた仮説
- 課題となっている指標とその原因仮説を2-3点提示
- \${metrics.hasKpiSettings ? 'KPI予実で未達成の項目（達成率80%未満）について、改善の方向性を具体的に示唆' : '低下傾向の指標について改善案を提示'}
- 具体的で実行可能な改善アプローチを提案

【禁止事項】
- ❌ 数値の羅列のみで終わる
- ❌ 抽象的な表現（「多い」「少ない」など）のみで数値を示さない
- ❌ 4つのセクション（概要、直近のトレンド、評価できる点、改善に向けた仮説）の欠落
- ❌ \${hasConversions ? '提供されたコンバージョン内訳データを無視する' : 'コンバージョンについて言及する（未設定のため）'}`,
    availableVariableSets: ['BASE_METRICS', 'SITE_CONFIG', 'COMPARISON_DATA', 'CONVERSION_DETAILS', 'KPI_FORECAST', 'TIMESERIES_DATA'],
    createdBy: 'system',
    usageCount: 0,
  },
  {
    id: 'summary_default_v1',
    pageType: 'summary',
    version: '1.0',
    isActive: true,
    isDefault: true,
    title: '全体サマリー - デフォルト',
    description: '13ヶ月推移分析、成長トレンド、季節性、今後3ヶ月戦略',
    template: `あなたは【データドリブンマーケティングの専門家】です。\${period}を含む過去13ヶ月のWebサイト全体の推移データを分析し、**成長戦略に役立つインサイト**を含む日本語の要約を**必ず800文字以内**で生成してください。

【分析期間の全体指標】
- 総ユーザー数: \${metrics.users?.toLocaleString() || 0}人
- セッション数: \${metrics.sessions?.toLocaleString() || 0}回
- ページビュー数: \${metrics.pageViews?.toLocaleString() || 0}回
- エンゲージメント率: \${((metrics.engagementRate || 0) * 100).toFixed(1)}%
- コンバージョン数: \${metrics.conversions?.toLocaleString() || 0}件

【13ヶ月推移データ】
- データポイント数: \${metrics.monthlyDataCount || 0}ヶ月分\${noDataNote}

【要求事項】
- **800文字以内で簡潔にまとめる**（これは厳守してください）
- Markdownの見出し記法（##, ###）を使用して構造化
- **必ず以下のセクションを含める**：成長トレンド、季節性パターン、主要な転換点、今後3ヶ月の戦略

【禁止事項】
- ❌ 月別数値の羅列のみで終わる
- ❌ トレンド分析なしの現状報告のみ
- ❌ 今後の戦略提言の欠落`,
    availableVariableSets: ['BASE_METRICS', 'SITE_CONFIG', 'COMPARISON_DATA', 'CONVERSION_DETAILS', 'TIMESERIES_DATA'],
    createdBy: 'system',
    usageCount: 0,
  },
  // 残り14画面分のプロンプトを後で追加
];

async function seedPromptTemplates() {
  console.log('🚀 プロンプトテンプレートの初期データ投入を開始します...\n');

  const now = Timestamp.now();
  let successCount = 0;
  let skipCount = 0;

  for (const promptData of defaultPrompts) {
    try {
      const docRef = db.collection('promptTemplates').doc(promptData.id);
      const doc = await docRef.get();

      if (doc.exists) {
        console.log(`⏭️  スキップ: ${promptData.id} (既に存在します)`);
        skipCount++;
        continue;
      }

      await docRef.set({
        ...promptData,
        createdAt: now,
        updatedAt: now,
        updatedBy: 'system',
        lastUsedAt: null,
      });

      console.log(`✅ 登録完了: ${promptData.id} - ${promptData.title}`);
      successCount++;

    } catch (error) {
      console.error(`❌ エラー: ${promptData.id}`, error);
    }
  }

  console.log(`\n📊 結果サマリ:`);
  console.log(`  - 成功: ${successCount}件`);
  console.log(`  - スキップ: ${skipCount}件`);
  console.log(`  - 合計: ${defaultPrompts.length}件`);
  console.log('\n✨ 完了しました！');

  process.exit(0);
}

// 実行
seedPromptTemplates().catch((error) => {
  console.error('❌ 致命的なエラー:', error);
  process.exit(1);
});

