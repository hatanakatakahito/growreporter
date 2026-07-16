/**
 * vivid Phase 2 RAG 注入のドライランテスト（Firestore 不使用）
 *
 * templates.js の getComprehensiveImprovementPrompt をモックデータで直接呼び出し、
 * RAG 注入ブロックが期待通りに生成されるか目視確認するためのスクリプト。
 *
 * 使い方:
 *   cd functions
 *   node --experimental-vm-modules src/scripts/testRagInjection.mjs
 *
 * 出力:
 *   各テストケースのプロンプト末尾（注入ブロック周辺）を console に出力。
 *   全文を見たい場合は --full フラグ。
 *
 * 検証観点:
 *   1. improvementKnowledge が空の時 → 注入ブロックなし
 *   2. improvementKnowledge があるとき → 注入ブロックあり、件数表示が正しい
 *   3. siteContext (*Text labels) → 日本語ラベル表示
 *   4. siteContext (raw values) → raw value 表示（フォールバック）
 *   5. siteContext なし → デフォルト文字列フォールバック
 *   6. バイアス防止 7原則がプロンプトに含まれている
 *   7. 優先順位「本サイト固有データ > vivid > 一般知識 > lively」が含まれている
 */

import { getPromptTemplate } from '../prompts/templates.js';

const args = process.argv.slice(2);
const showFull = args.includes('--full');

// ============================================================================
// モックデータ
// ============================================================================

const baseMetrics = {
  summary: {
    metrics: {
      totalUsers: 12345,
      sessions: 23456,
      screenPageViews: 45678,
      engagementRate: 0.62,
      totalConversions: 89,
      conversions: { 'お問い合わせ': 45, '資料請求': 44 },
    },
  },
  monthlyTrend: { monthlyData: [
    { month: '2025-12', users: 11000, sessions: 21000, conversions: 80 },
    { month: '2026-01', users: 12345, sessions: 23456, conversions: 89 },
  ] },
  channels: [
    { channel: 'Organic Search', sessions: 15000, conversions: 50 },
    { channel: 'Direct', sessions: 5000, conversions: 25 },
  ],
  keywords: [
    { query: '不動産投資', clicks: 230, impressions: 5400, ctr: 0.042, position: 6.3 },
  ],
  pages: [
    { path: '/services/', pageViews: 5000, users: 3000, conversions: 30 },
  ],
  landingPages: [
    { page: '/', sessions: 12000, engagementRate: 0.65, conversions: 50 },
  ],
};

// テストケース 1: improvementKnowledge が空
const case1 = {
  name: 'TC1: improvementKnowledge 空',
  metrics: { ...baseMetrics, improvementKnowledge: [] },
  options: {
    siteContext: {
      siteName: 'テスト不動産株式会社',
      industryMajorText: '不動産・建設',
      siteRoleText: 'コーポレート',
      businessModelText: 'B2B（法人向け）',
    },
  },
  expectInjection: false,
};

// テストケース 2: improvementKnowledge 3件、siteContext (*Text labels)
const case2 = {
  name: 'TC2: improvementKnowledge 3件 + *Text ラベル',
  metrics: {
    ...baseMetrics,
    improvementKnowledge: [
      {
        category: 'content',
        improvementSummary: '料金プランの3階層化と Before/After 訴求強化',
        metrics: {
          primaryMetric: 'conversionRate',
          changePercent: 35,
          overallScore: 4.5,
          achievementLevel: 'exceeded',
        },
      },
      {
        category: 'feature',
        improvementSummary: 'フォーム項目を9→4に削減 + 段階入力UI',
        metrics: {
          primaryMetric: 'conversionRate',
          changePercent: 28,
          overallScore: 4.0,
          achievementLevel: 'exceeded',
        },
      },
      {
        category: 'design',
        improvementSummary: 'ファーストビューのCTA強化',
        metrics: {
          primaryMetric: 'engagementRate',
          changePercent: 15,
          overallScore: 3.0,
          achievementLevel: 'met',
        },
      },
    ],
  },
  options: {
    siteContext: {
      siteName: 'テスト不動産株式会社',
      industryMajorText: '不動産・建設',
      siteRoleText: 'コーポレート',
      businessModelText: 'B2B（法人向け）',
    },
  },
  expectInjection: true,
};

// テストケース 3: improvementKnowledge 1件、siteContext (raw values only) フォールバック
const case3 = {
  name: 'TC3: improvementKnowledge 1件 + raw values のみ',
  metrics: {
    ...baseMetrics,
    improvementKnowledge: [
      {
        category: 'acquisition',
        improvementSummary: 'GSCキーワード上位記事のメタディスクリプション最適化',
        metrics: {
          primaryMetric: 'sessions',
          changePercent: 22,
          overallScore: 3.5,
          achievementLevel: 'met',
        },
      },
    ],
    siteContext: {
      industryMajor: 'realestate_construction',
      siteRole: 'corporate',
      businessModel: 'b2b',
    },
  },
  options: {}, // siteContext は metrics.siteContext (raw values) からフォールバック
  expectInjection: true,
};

// テストケース 4: improvementKnowledge 1件、siteContext 未設定（デフォルト文字列）
const case4 = {
  name: 'TC4: improvementKnowledge あり + siteContext 完全欠損',
  metrics: {
    ...baseMetrics,
    improvementKnowledge: [
      {
        category: 'other',
        improvementSummary: '画像最適化と alt 属性整備',
        metrics: { primaryMetric: 'pageLoadTime', changePercent: -45, overallScore: 3.0, achievementLevel: 'met' },
      },
    ],
  },
  options: {}, // siteContext なし
  expectInjection: true,
};

// テストケース 5: lively industryBenchmark のみ（improvementKnowledge なし）
const case5 = {
  name: 'TC5: industryBenchmark のみ（lively のみ注入）',
  metrics: {
    ...baseMetrics,
    improvementKnowledge: [],
    industryBenchmark: {
      period: '2026-04',
      industryMajor: 'realestate_construction',
      siteRole: 'corporate',
      N: 32,
      metrics: {
        bounceRate: { count: 32, median: 0.53, p25: 0.42, p75: 0.61 },
        engagementRate: { count: 32, median: 0.47, p25: 0.39, p75: 0.59 },
        averageSessionDuration: { count: 32, median: 106, p25: 57, p75: 175 },
      },
      gsc: {
        ctr: { count: 31, median: 0.041, p25: 0.015, p75: 0.057 },
        position: { count: 31, median: 8.93, p25: 7.38, p75: 10.71 },
      },
    },
  },
  options: {
    siteContext: {
      industryMajorText: '不動産・建設',
      siteRoleText: 'コーポレート',
      businessModelText: 'B2B（法人向け）',
    },
  },
  expectInjection: false,        // improvementKnowledge ブロック
  expectBenchmarkBlock: true,    // industryBenchmark ブロック
};

// テストケース 6: 両方注入される（vivid + lively）
const case6 = {
  name: 'TC6: vivid + lively 両方注入（優先順位確認）',
  metrics: {
    ...baseMetrics,
    improvementKnowledge: [
      {
        category: 'content',
        improvementSummary: '料金プランを3階層化',
        metrics: { primaryMetric: 'conversionRate', changePercent: 35, overallScore: 4.5, achievementLevel: 'exceeded' },
      },
    ],
    industryBenchmark: case5.metrics.industryBenchmark,
  },
  options: case5.options,
  expectInjection: true,
  expectBenchmarkBlock: true,
};

const cases = [case1, case2, case3, case4, case5, case6];

// ============================================================================
// 実行
// ============================================================================

console.log('='.repeat(80));
console.log('vivid Phase 2 RAG 注入 ドライランテスト');
console.log('='.repeat(80));

let passed = 0;
let failed = 0;

for (const tc of cases) {
  console.log(`\n${'─'.repeat(80)}`);
  console.log(`▶ ${tc.name}`);
  console.log('─'.repeat(80));

  let prompt;
  try {
    prompt = getPromptTemplate(
      'comprehensive_improvement',
      '2026-01-01から2026-01-30までの期間',
      tc.metrics,
      '2026-01-01',
      '2026-01-30',
      tc.options
    );
  } catch (err) {
    console.error(`❌ エラー発生: ${err.message}`);
    failed++;
    continue;
  }

  // 注入ブロックの存在確認
  const hasInjection = prompt.includes('【同業界の過去成功施策');
  const hasRulesBlock = prompt.includes('【RAGデータ利用ルール（厳守）】');
  const hasPriorityBlock = prompt.includes('【他のRAG情報との優先順位');
  const hasBenchmarkBlock = prompt.includes('【業界対比情報（参考データ・本サイトのデータが主役）】');
  const hasBenchmarkRules = prompt.includes('【業界対比情報の利用ルール（厳守）】');

  console.log(`  improvementKnowledge ブロック: ${hasInjection ? '✅ あり' : '❌ なし'}`);
  console.log(`  improvementKnowledge ルール: ${hasRulesBlock ? '✅ あり' : '❌ なし'}`);
  console.log(`  improvementKnowledge 優先順位: ${hasPriorityBlock ? '✅ あり' : '❌ なし'}`);
  console.log(`  industryBenchmark ブロック: ${hasBenchmarkBlock ? '✅ あり' : '❌ なし'}`);
  console.log(`  industryBenchmark ルール: ${hasBenchmarkRules ? '✅ あり' : '❌ なし'}`);

  // 期待値との一致確認
  const ragOk = tc.expectInjection === hasInjection;
  const benchOk = tc.expectBenchmarkBlock === undefined || tc.expectBenchmarkBlock === hasBenchmarkBlock;
  if (ragOk && benchOk) {
    console.log(`  期待値一致: ✅`);
    passed++;
  } else {
    console.log(`  期待値不一致: ❌（improvementKnowledge: 期待=${tc.expectInjection}, 実際=${hasInjection} / benchmark: 期待=${tc.expectBenchmarkBlock ?? '未指定'}, 実際=${hasBenchmarkBlock}）`);
    failed++;
  }

  // 注入ブロックがある場合、その部分を抽出して表示
  if (hasInjection) {
    const startIdx = prompt.indexOf('【同業界の過去成功施策');
    const endMarker = '【他のRAG情報との優先順位';
    const endIdx = prompt.indexOf(endMarker, startIdx);
    // 優先順位ブロックの末尾まで含める
    const blockEnd = endIdx > 0 ? prompt.indexOf('\n\n', endIdx + 100) : -1;
    const block = blockEnd > 0
      ? prompt.substring(startIdx, blockEnd)
      : prompt.substring(startIdx, Math.min(prompt.length, startIdx + 2500));
    console.log('\n  ── 注入ブロック内容 ──');
    console.log(block.split('\n').map(l => `  ${l}`).join('\n'));
  }

  if (showFull) {
    console.log('\n  ── プロンプト全文 ──');
    console.log(prompt.split('\n').map(l => `  ${l}`).join('\n'));
  }
}

console.log(`\n${'='.repeat(80)}`);
console.log(`テスト結果: ${passed} passed / ${failed} failed`);
console.log('='.repeat(80));

if (failed > 0) process.exit(1);
