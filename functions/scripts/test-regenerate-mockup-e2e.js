// 既存の /recruit/ 改善案でモックアップを再生成し、整形済 snapshot が反映されているか E2E 検証
import admin from 'firebase-admin';

admin.initializeApp({
  projectId: 'growgroupreporter',
  storageBucket: 'growgroupreporter.firebasestorage.app',
});

const siteId = 'CZYomSqeTRAnIWgD8Km4';

const db = admin.firestore();
const bucket = admin.storage().bucket();

console.log(`=== STEP 1: 検証用テスト改善案を作成 ===`);
const newDocRef = db.collection(`sites/${siteId}/improvements`).doc();
await newDocRef.set({
  title: '【検証用】採用ページのファーストビュー直下に「数字で見る」セクション追加',
  description: '【現状の問題】採用 TOP では数字でみる仕事の魅力が表現されていない。\n【提案内容】\n①ファーストビュー直下に「数字でみる GrowGroup」セクションを追加\n②中途・新卒の比率、勤続年数、昇給率の 3 カードを表示\n③数値部分は大きなフォントで強調\n【なぜ効くか】客観データで信頼度向上、応募意欲を高める',
  status: 'draft',
  expectedImpact: '採用応募率 +0.5pt',
  targetPageUrl: 'https://grow-group.jp/recruit/',
  category: 'content',
  priority: 'high',
  estimatedLaborHours: 6,
  source: 'test_e2e_lazyload_fix',
  order: Date.now(),
  createdAt: admin.firestore.FieldValue.serverTimestamp(),
  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
});
const improvementId = newDocRef.id;
const ref = newDocRef;
console.log(`作成: ${improvementId}\n`);

console.log(`=== STEP 2: generateImprovementMockup を直接実行 ===`);
const t0 = Date.now();
const { generateImprovementMockupCallable } = await import('../src/callable/generateImprovementMockup.js');
const req = {
  auth: { uid: 'MmvJRYa8GTafpodTY5YcOBTKEjS2' },
  data: { siteId, improvementId },
};
const result = await generateImprovementMockupCallable(req);
const elapsed = Date.now() - t0;
console.log(`完了 (${elapsed}ms): ${JSON.stringify(result)}\n`);

console.log(`=== STEP 3: 生成された mockup HTML を確認 ===`);
const after = (await ref.get()).data();
const mockupPath = after.mockupStoragePath;
console.log(`mockupStoragePath: ${mockupPath}`);
console.log(`mockupStorageUrl: ${after.mockupStorageUrl}\n`);

const [buf] = await bucket.file(mockupPath).download();
const html = buf.toString('utf-8');

const checks = [
  { name: 'lazyload クラス残存',           re: /class\s*=\s*["'][^"']*\blazyload\b/gi, expectZero: true },
  { name: 'data:image/svg+xml in style',  re: /style\s*=\s*["'][^"']*data:image\/svg/gi, expectZero: true },
  { name: '__snapshot-render-fix style',  re: /<style[^>]*id=["']__snapshot-render-fix["']/i, expectZero: false },
  { name: 'main-visual-recruit__image',   re: /<div[^>]*c-main-visual-recruit__image[^>]*>/i, expectZero: false },
];

let allPass = true;
for (const c of checks) {
  const m = html.match(c.re) || [];
  const ok = c.expectZero ? m.length === 0 : m.length > 0;
  console.log(`  ${ok ? '✅' : '❌'} ${c.name.padEnd(35)} ${m.length} 件`);
  if (!ok) allPass = false;
}

// キービジュアル要素の style を出力
const kv = html.match(/<div[^>]*c-main-visual-recruit__image[^>]*>/i);
if (kv) {
  console.log(`\nキービジュアル要素:`);
  console.log(`  ${kv[0]}`);
}

if (allPass) {
  console.log(`\n🎉 E2E 成功 — モックアップ HTML に整形が反映されています`);
  console.log(`\nブラウザ確認用 URL:`);
  console.log(`  ${after.mockupStorageUrl}`);
} else {
  console.log(`\n❌ 一部失敗`);
  process.exit(1);
}
