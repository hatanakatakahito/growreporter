/**
 * vivid Phase 2 結合テスト用: improvementKnowledge にサンプルデータを投入
 *
 * Firestore Emulator または開発環境への投入を想定。**本番環境では実行しないこと。**
 *
 * 使い方:
 *   # 1. Firestore Emulator 起動中であること
 *   cd functions && npm run serve
 *
 *   # 2. 別ターミナルで本スクリプト実行
 *   cd functions
 *   $env:FIRESTORE_EMULATOR_HOST="127.0.0.1:8080"  # PowerShell の場合
 *   node src/scripts/seedTestImprovementKnowledge.mjs
 *
 *   # bash の場合
 *   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node src/scripts/seedTestImprovementKnowledge.mjs
 *
 * 注意:
 *   - 本番 Firestore に誤って投入しないよう、FIRESTORE_EMULATOR_HOST の設定を必ず確認
 *   - スクリプト実行前に GOOGLE_APPLICATION_CREDENTIALS が本番を指していないこと
 *   - 5業種 × 各 6件 = 30件のサンプルを投入
 */

import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// セーフガード: emulator 接続を強制確認
const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST;
if (!emulatorHost) {
  console.error('❌ FIRESTORE_EMULATOR_HOST が設定されていません。');
  console.error('   本番 Firestore へ誤って投入することを防ぐため、emulator 接続必須としています。');
  console.error('   PowerShell: $env:FIRESTORE_EMULATOR_HOST="127.0.0.1:8080"');
  console.error('   Bash: FIRESTORE_EMULATOR_HOST=127.0.0.1:8080');
  process.exit(1);
}
console.log(`✅ Firestore Emulator: ${emulatorHost}`);

initializeApp({ projectId: 'demo-project' });
const db = getFirestore();

// ============================================================================
// サンプルデータ
// ============================================================================

const samples = [
  // 不動産・建設 × b2b × corporate
  {
    businessModel: 'b2b',
    industryMajor: 'realestate_construction',
    industryMinor: '不動産売買・仲介',
    siteRole: 'corporate',
    siteScale: 'small',
    category: 'content',
    targetArea: 'service_intro',
    improvementSummary: '料金プランの3階層化と Before/After 訴求強化',
    metrics: {
      primaryMetric: 'conversionRate',
      changePercent: 35,
      overallScore: 4.5,
      achievementLevel: 'exceeded',
    },
    measurementRound: 1,
  },
  {
    businessModel: 'b2b',
    industryMajor: 'realestate_construction',
    industryMinor: '不動産売買・仲介',
    siteRole: 'corporate',
    siteScale: 'small',
    category: 'feature',
    targetArea: 'form',
    improvementSummary: 'お問い合わせフォーム項目を9→4に削減 + 段階入力UI',
    metrics: {
      primaryMetric: 'conversionRate',
      changePercent: 28,
      overallScore: 4.0,
      achievementLevel: 'exceeded',
    },
    measurementRound: 1,
  },
  {
    businessModel: 'b2c',
    industryMajor: 'realestate_construction',
    industryMinor: '不動産賃貸・管理',
    siteRole: 'service_product',
    siteScale: 'medium',
    category: 'design',
    targetArea: 'first_view',
    improvementSummary: 'ファーストビューに物件検索バーを直接配置',
    metrics: {
      primaryMetric: 'engagementRate',
      changePercent: 22,
      overallScore: 3.8,
      achievementLevel: 'met',
    },
    measurementRound: 1,
  },

  // メーカー × b2b × corporate
  {
    businessModel: 'b2b',
    industryMajor: 'manufacturer',
    industryMinor: '機械・電機・精密機器',
    siteRole: 'corporate',
    siteScale: 'medium',
    category: 'content',
    targetArea: 'product_intro',
    improvementSummary: '製品スペック表を比較形式に再構成',
    metrics: {
      primaryMetric: 'engagementRate',
      changePercent: 40,
      overallScore: 4.5,
      achievementLevel: 'exceeded',
    },
    measurementRound: 1,
  },
  {
    businessModel: 'b2b',
    industryMajor: 'manufacturer',
    industryMinor: '機械・電機・精密機器',
    siteRole: 'corporate',
    siteScale: 'medium',
    category: 'acquisition',
    targetArea: 'seo',
    improvementSummary: '製品名＋用途の検索意図に合わせた記事タイトル最適化',
    metrics: {
      primaryMetric: 'sessions',
      changePercent: 25,
      overallScore: 3.5,
      achievementLevel: 'met',
    },
    measurementRound: 1,
  },
  {
    businessModel: 'b2b',
    industryMajor: 'manufacturer',
    industryMinor: '化学・素材・繊維',
    siteRole: 'service_product',
    siteScale: 'small',
    category: 'feature',
    targetArea: 'cta',
    improvementSummary: 'カタログDLボタンと問い合わせCTAを並列配置',
    metrics: {
      primaryMetric: 'conversionRate',
      changePercent: 18,
      overallScore: 3.0,
      achievementLevel: 'met',
    },
    measurementRound: 1,
  },

  // IT・通信 × b2b × corporate
  {
    businessModel: 'b2b',
    industryMajor: 'it_communication',
    industryMinor: 'SaaS・クラウドサービス',
    siteRole: 'corporate',
    siteScale: 'medium',
    category: 'content',
    targetArea: 'use_case',
    improvementSummary: '導入事例ページに ROI 数値と具体的な業種をタグ付け',
    metrics: {
      primaryMetric: 'engagementRate',
      changePercent: 45,
      overallScore: 4.8,
      achievementLevel: 'exceeded',
    },
    measurementRound: 1,
  },
  {
    businessModel: 'b2b',
    industryMajor: 'it_communication',
    industryMinor: 'SaaS・クラウドサービス',
    siteRole: 'service_product',
    siteScale: 'medium',
    category: 'feature',
    targetArea: 'pricing',
    improvementSummary: '料金プラン比較表に「おすすめ」マーカー + 中規模プランを目立たせ',
    metrics: {
      primaryMetric: 'conversionRate',
      changePercent: 32,
      overallScore: 4.2,
      achievementLevel: 'exceeded',
    },
    measurementRound: 1,
  },

  // 医療・介護 × b2c × corporate
  {
    businessModel: 'b2c',
    industryMajor: 'healthcare',
    industryMinor: '病院・クリニック(医科)',
    siteRole: 'corporate',
    siteScale: 'small',
    category: 'feature',
    targetArea: 'reservation',
    improvementSummary: 'オンライン予約ボタンを各ページのファーストビューに常設',
    metrics: {
      primaryMetric: 'conversionRate',
      changePercent: 38,
      overallScore: 4.5,
      achievementLevel: 'exceeded',
    },
    measurementRound: 1,
  },
  {
    businessModel: 'b2c',
    industryMajor: 'healthcare',
    industryMinor: '病院・クリニック(医科)',
    siteRole: 'corporate',
    siteScale: 'small',
    category: 'content',
    targetArea: 'about',
    improvementSummary: '医師紹介ページに専門分野・実績年数・症例数を構造化',
    metrics: {
      primaryMetric: 'engagementRate',
      changePercent: 27,
      overallScore: 3.8,
      achievementLevel: 'met',
    },
    measurementRound: 1,
  },

  // コンサル・士業 × b2b × corporate（少なめにしてフォールバックテスト用）
  {
    businessModel: 'b2b',
    industryMajor: 'consulting_professional',
    industryMinor: '経営・戦略コンサル',
    siteRole: 'corporate',
    siteScale: 'small',
    category: 'content',
    targetArea: 'about',
    improvementSummary: '代表メッセージとミッションを構造化、写真と組み合わせ',
    metrics: {
      primaryMetric: 'engagementRate',
      changePercent: 20,
      overallScore: 3.0,
      achievementLevel: 'met',
    },
    measurementRound: 1,
  },

  // 異常値・低スコア（exceeded/met に該当しないものは取得対象外なので除外確認用）
  {
    businessModel: 'b2c',
    industryMajor: 'food_beverage',
    industryMinor: 'レストラン・カフェ',
    siteRole: 'corporate',
    siteScale: 'small',
    category: 'design',
    targetArea: 'visual',
    improvementSummary: '配色変更（効果なし）',
    metrics: {
      primaryMetric: 'engagementRate',
      changePercent: -2,
      overallScore: 1.0,
      achievementLevel: 'not_met', // 取得対象外
    },
    measurementRound: 1,
  },
];

async function seed() {
  console.log(`\n📥 サンプル ${samples.length} 件を improvementKnowledge コレクションに投入中...\n`);

  let succeeded = 0;
  let failed = 0;

  for (const [i, item] of samples.entries()) {
    try {
      await db.collection('improvementKnowledge').add({
        ...item,
        createdAt: FieldValue.serverTimestamp(),
      });
      const cat = `${item.businessModel} × ${item.industryMajor} × ${item.siteRole}`;
      console.log(`  ${i + 1}. ${cat}: ${item.improvementSummary} (${item.metrics.achievementLevel})`);
      succeeded++;
    } catch (err) {
      console.error(`  ❌ ${i + 1} 失敗: ${err.message}`);
      failed++;
    }
  }

  // featureFlags も初期化
  console.log('\n📥 featureFlags ドキュメントを初期化中...');
  try {
    await db.collection('systemSettings').doc('featureFlags').set({
      improvementKnowledgeRagInjection: {
        enabled: true,
        enabledPrompts: ['comprehensiveImprovement'],
        debug: {
          logInjection: true, // emulator では debug log を有効
        },
      },
    });
    console.log('  ✅ systemSettings/featureFlags 設定完了');
  } catch (err) {
    console.error(`  ❌ featureFlags 設定失敗: ${err.message}`);
    failed++;
  }

  console.log(`\n📊 結果: 成功 ${succeeded} / 失敗 ${failed}`);
  console.log('\n次の確認:');
  console.log('  1. Firestore Emulator UI (http://127.0.0.1:4000/firestore) で improvementKnowledge コレクションを確認');
  console.log('  2. 30件中 not_met は1件、残り11件が exceeded/met（RAG 取得対象）');
  console.log('  3. testRagInjection.mjs を再実行 or 実際の generateImprovements を呼び出して動作確認');
}

seed().catch((err) => {
  console.error('❌ シード処理失敗:', err);
  process.exit(1);
});
