/**
 * サンプル効果計測データ投入スクリプト
 *
 * 使い方:
 *   node scripts/insertSampleEffectMeasurement.js <siteId> [improvementId]
 *
 * siteIdのみ指定: 新規改善タスク3件（計測完了/計測待ち/エラー）を作成
 * improvementId指定: 既存タスクにeffectMeasurementデータを注入
 *
 * 前提: Firebase Admin SDKの認証情報が設定済み
 *   - GOOGLE_APPLICATION_CREDENTIALS 環境変数、または
 *   - Firebase Emulatorのデフォルト認証
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// Firebase Admin初期化
if (getApps().length === 0) {
  initializeApp({ projectId: 'growgroupreporter' });
}
const db = getFirestore();

const siteId = process.argv[2];
const specificId = process.argv[3];

if (!siteId) {
  console.error('Usage: node scripts/insertSampleEffectMeasurement.js <siteId> [improvementId]');
  process.exit(1);
}

async function main() {
  const improvementsRef = db.collection('sites').doc(siteId).collection('improvements');

  if (specificId) {
    // 既存タスクにデータ注入
    console.log(`Injecting sample data into existing improvement: ${specificId}`);
    await injectCompletedMeasurement(improvementsRef.doc(specificId));
    console.log('Done!');
    return;
  }

  // 新規3件作成
  console.log(`Creating 3 sample improvements in site: ${siteId}`);

  // 1. 計測完了（exceeded）
  const ref1 = improvementsRef.doc();
  await ref1.set(buildCompletedTask({
    title: 'お問い合わせフォームの項目を8→4に削減',
    description: 'フォーム離脱率が高いため、必須項目を最小限に絞り、任意項目は削除。名前・メール・電話・内容の4項目のみに。',
    category: 'feature',
    expectedImpact: 'お問い合わせ率（CVR）20%向上、フォーム離脱率30%改善',
    targetPageUrl: '/contact',
    overallScore: 42.5,
    achievementLevel: 'exceeded',
    sessions: { before: 1250, after: 1380 },
    conversions: { before: 15, after: 28 },
    engagementRate: { before: 0.62, after: 0.71 },
    bounceRate: { before: 0.45, after: 0.32 },
  }));
  console.log(`  Created [completed/exceeded]: ${ref1.id}`);

  // 2. 計測完了（partial）
  const ref2 = improvementsRef.doc();
  await ref2.set(buildCompletedTask({
    title: 'トップページのファーストビュー画像を最適化',
    description: '画像を次世代フォーマット（WebP）に変換し、読み込み速度を改善。メインビジュアルを訴求力の高いデザインに変更。',
    category: 'design',
    expectedImpact: '直帰率15%改善、エンゲージメント率10%向上',
    targetPageUrl: '/',
    overallScore: 5.2,
    achievementLevel: 'partial',
    sessions: { before: 3200, after: 3150 },
    conversions: { before: 42, after: 45 },
    engagementRate: { before: 0.55, after: 0.58 },
    bounceRate: { before: 0.48, after: 0.44 },
  }));
  console.log(`  Created [completed/partial]: ${ref2.id}`);

  // 3. 計測待ち（pending）
  const ref3 = improvementsRef.doc();
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() - 5);
  const effectiveDate3 = futureDate.toISOString().split('T')[0];
  const nextMeasure = new Date();
  nextMeasure.setDate(nextMeasure.getDate() + 9);

  await ref3.set({
    title: 'ブログ記事にCTAバナーを設置',
    description: '全ブログ記事の本文末尾にお問い合わせへの導線バナーを追加。記事コンテンツからのCV導線を強化。',
    category: 'content',
    priority: 'medium',
    expectedImpact: 'ブログ経由のCV数 月5件→15件',
    targetPageUrl: '/blog',
    status: 'completed',
    completedAt: futureDate.toISOString(),
    effectiveDate: effectiveDate3,
    createdAt: FieldValue.serverTimestamp(),
    effectMeasurement: {
      status: 'pending',
      nextMeasurementAt: nextMeasure.toISOString().split('T')[0],
      before: {
        period: `${addDays(effectiveDate3, -14)}_to_${addDays(effectiveDate3, -1)}`,
        sessions: 850,
        totalUsers: 620,
        newUsers: 410,
        pageViews: 2100,
        engagementRate: 0.48,
        bounceRate: 0.58,
        avgSessionDuration: 95,
        conversions: 5,
        conversionRate: 0.006,
      },
      createdAt: FieldValue.serverTimestamp(),
    },
    emStatus: 'pending',
    emNextMeasurementAt: nextMeasure.toISOString().split('T')[0],
  });
  console.log(`  Created [pending]: ${ref3.id}`);

  console.log('\nAll sample data inserted successfully!');
  console.log('Go to: https://growgroupreporter.web.app/reports to see the results.');
}

function buildCompletedTask({ title, description, category, expectedImpact, targetPageUrl, overallScore, achievementLevel, sessions, conversions, engagementRate, bounceRate }) {
  const effectiveDate = addDays(new Date().toISOString().split('T')[0], -30);
  const beforePeriod = `${addDays(effectiveDate, -14)}_to_${addDays(effectiveDate, -1)}`;
  const afterPeriod = `${addDays(effectiveDate, 1)}_to_${addDays(effectiveDate, 14)}`;

  const before = {
    period: beforePeriod,
    sessions: sessions.before,
    totalUsers: Math.round(sessions.before * 0.78),
    newUsers: Math.round(sessions.before * 0.52),
    pageViews: Math.round(sessions.before * 2.3),
    engagementRate: engagementRate.before,
    bounceRate: bounceRate.before,
    avgSessionDuration: 120,
    conversions: conversions.before,
    conversionRate: conversions.before / sessions.before,
  };

  const after = {
    period: afterPeriod,
    sessions: sessions.after,
    totalUsers: Math.round(sessions.after * 0.78),
    newUsers: Math.round(sessions.after * 0.52),
    pageViews: Math.round(sessions.after * 2.3),
    engagementRate: engagementRate.after,
    bounceRate: bounceRate.after,
    avgSessionDuration: 135,
    conversions: conversions.after,
    conversionRate: conversions.after / sessions.after,
  };

  const changes = {};
  for (const key of Object.keys(before)) {
    if (key === 'period') continue;
    if (before[key] && after[key]) {
      changes[key] = ((after[key] - before[key]) / before[key]) * 100;
    }
  }

  const aiEvaluation = {
    achievementLevel,
    summary: achievementLevel === 'exceeded'
      ? `改善効果は期待を大きく上回りました。コンバージョン数が${conversions.before}件→${conversions.after}件に増加（${((conversions.after - conversions.before) / conversions.before * 100).toFixed(0)}%増）し、目標の20%向上を大幅に超える成果が出ています。直帰率も改善しており、フォーム簡素化がユーザー体験の向上に直結した結果です。`
      : `一部の指標で改善が確認できますが、期待効果には達していません。エンゲージメント率は${(engagementRate.before * 100).toFixed(1)}%→${(engagementRate.after * 100).toFixed(1)}%に向上しましたが、訪問数は横ばいです。画像最適化による表示速度の改善がユーザー滞在に良い影響を与えていますが、コンバージョンへのインパクトは限定的です。`,
    analysis: achievementLevel === 'exceeded'
      ? '・フォーム項目削減により、フォーム完了率が大幅に向上しました\n・直帰率が45%→32%に改善し、ページ離脱の減少が確認できます\n・エンゲージメント率も62%→71%に上昇し、サイト全体の閲覧品質が向上\n・コンバージョン率が1.2%→2.0%に改善し、ビジネスKPIに直接貢献'
      : '・直帰率が48%→44%に改善し、ファーストビューの改善効果が一定程度確認できます\n・エンゲージメント率は微増（55%→58%）にとどまっています\n・訪問数は微減しており、画像変更による検索流入への影響は見られません\n・コンバージョン数は42→45件と小幅な増加です',
    nextActions: achievementLevel === 'exceeded'
      ? ['フォーム改善の成功パターンを他のフォーム（資料請求等）にも展開する', 'コンバージョン後のサンキューページを最適化し、追加アクションを促す', 'A/Bテストでさらなるフォーム最適化の余地を探る']
      : ['ファーストビューにCTAボタンを追加し、コンバージョン導線を強化する', 'ページ表示速度の計測を行い、Core Web Vitalsの改善状況を確認する', 'ヒートマップツールで実際のユーザー行動を分析し、次の改善ポイントを特定する'],
    generatedAt: new Date().toISOString(),
  };

  return {
    title,
    description,
    category,
    priority: 'high',
    expectedImpact,
    targetPageUrl,
    status: 'completed',
    completedAt: addDays(effectiveDate, 0) + 'T10:00:00.000Z',
    effectiveDate,
    createdAt: FieldValue.serverTimestamp(),
    effectMeasurement: {
      before,
      after,
      changes,
      overallScore,
      aiEvaluation,
      status: 'completed',
      completedAt: FieldValue.serverTimestamp(),
      measurementHistory: [{
        measuredAt: new Date().toISOString(),
        afterPeriod,
      }],
    },
    emStatus: 'completed',
    emNextMeasurementAt: null,
  };
}

async function injectCompletedMeasurement(docRef) {
  const docSnap = await docRef.get();
  if (!docSnap.exists) {
    console.error('Document not found');
    process.exit(1);
  }
  const data = docSnap.data();
  const effectiveDate = data.effectiveDate || addDays(new Date().toISOString().split('T')[0], -30);

  const before = {
    period: `${addDays(effectiveDate, -14)}_to_${addDays(effectiveDate, -1)}`,
    sessions: 1500, totalUsers: 1170, newUsers: 780, pageViews: 3450,
    engagementRate: 0.58, bounceRate: 0.42, avgSessionDuration: 110,
    conversions: 22, conversionRate: 0.0147,
  };
  const after = {
    period: `${addDays(effectiveDate, 1)}_to_${addDays(effectiveDate, 14)}`,
    sessions: 1680, totalUsers: 1310, newUsers: 874, pageViews: 3864,
    engagementRate: 0.64, bounceRate: 0.36, avgSessionDuration: 128,
    conversions: 31, conversionRate: 0.0185,
  };
  const changes = {};
  for (const key of Object.keys(before)) {
    if (key === 'period') continue;
    if (before[key] && after[key]) changes[key] = ((after[key] - before[key]) / before[key]) * 100;
  }

  await docRef.update({
    'effectMeasurement.before': before,
    'effectMeasurement.after': after,
    'effectMeasurement.changes': changes,
    'effectMeasurement.overallScore': 28.5,
    'effectMeasurement.status': 'completed',
    'effectMeasurement.completedAt': FieldValue.serverTimestamp(),
    'effectMeasurement.aiEvaluation': {
      achievementLevel: 'met',
      summary: '改善効果はおおむね期待通りの成果が出ています。訪問数が12%増加し、コンバージョン数も22件→31件に41%増加。エンゲージメント率・直帰率ともに改善しており、ユーザー体験の向上が数値に表れています。',
      analysis: '・訪問数が1,500→1,680に12%増加し、集客面での改善効果が確認できます\n・コンバージョン数が22→31件に41%増加し、ビジネス成果に直結しています\n・直帰率が42%→36%に改善し、ページの訴求力が向上しています\n・平均セッション時間も110秒→128秒に伸び、コンテンツの質的改善が示唆されます',
      nextActions: ['コンバージョン率の改善をさらに推進するため、CTAの文言やデザインを最適化する', '直帰率改善が顕著なので、同様の改善を他の主要ページにも展開する', '30日後に再計測を行い、効果の持続性を確認する'],
      generatedAt: new Date().toISOString(),
    },
    'effectMeasurement.measurementHistory': [{
      measuredAt: new Date().toISOString(),
      afterPeriod: after.period,
    }],
    emStatus: 'completed',
    emNextMeasurementAt: null,
  });

  console.log('Measurement data injected successfully');
}

function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
