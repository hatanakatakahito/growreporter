// PSI snapshot rescue の E2E 検証
// 1. 既存 /recruit/ スクショを削除
// 2. captureAndStoreBeforeScreenshot 呼出
// 3. 救済が発動したか・full-page 取得できたか確認
// 4. expandManualImprovement で Before スクショが multimodal 入力に流れるか確認
import admin from 'firebase-admin';

admin.initializeApp({
  projectId: 'growgroupreporter',
  storageBucket: 'growgroupreporter.firebasestorage.app',
});

const siteId = 'CZYomSqeTRAnIWgD8Km4';
const targetUrl = 'https://grow-group.jp/recruit/';
const uid = 'MmvJRYa8GTafpodTY5YcOBTKEjS2';

const db = admin.firestore();
const ssCol = db.collection(`sites/${siteId}/pageScreenshots`);

function normalize(u) {
  try { const x = new URL(u); x.hostname = x.hostname.toLowerCase(); if (!x.pathname.endsWith('/') && !x.pathname.includes('.')) x.pathname += '/'; return x.toString(); } catch { return u; }
}

console.log('=== STEP 1: 既存スクショをクリア ===');
const beforeSnap = await ssCol.get();
const target = normalize(targetUrl);
let cleared = 0;
for (const d of beforeSnap.docs) {
  if (d.id === '_meta') continue;
  const data = d.data();
  if (data.url && normalize(data.url) === target) {
    await d.ref.delete();
    cleared++;
  }
}
console.log(`削除: ${cleared} 件\n`);

console.log('=== STEP 2: captureAndStoreBeforeScreenshot 呼出 (rescue 期待) ===');
const { captureAndStoreBeforeScreenshot } = await import('../src/utils/captureAndStoreBeforeScreenshot.js');
const t0 = Date.now();
const result = await captureAndStoreBeforeScreenshot({ siteId, targetPageUrl: targetUrl });
console.log(`(${Date.now() - t0}ms)`);
console.log(JSON.stringify(result, null, 2));

if (!result?.success) {
  console.error('❌ 撮影失敗');
  process.exit(1);
}

console.log('\n=== STEP 3: pageScreenshots に保存されたか確認 ===');
const afterSnap = await ssCol.get();
let foundDoc = null;
for (const d of afterSnap.docs) {
  if (d.id === '_meta') continue;
  const data = d.data();
  if (data.url && normalize(data.url) === target) {
    foundDoc = { id: d.id, ...data };
    break;
  }
}
if (!foundDoc) { console.error('❌ 保存されていません'); process.exit(1); }
console.log(`docId: ${foundDoc.id}`);
console.log(`screenshotType: ${foundDoc.screenshotType}`);
console.log(`imageSize: ${foundDoc.imageSize} bytes`);

console.log('\n=== STEP 4: 取得画像のサイズ・密度を確認 ===');
const res = await fetch(foundDoc.screenshotUrl);
const buf = Buffer.from(await res.arrayBuffer());
let dim = null;
for (let i = 2; i < buf.length - 9 && !dim; i++) {
  if (buf[i] === 0xff && buf[i+1] >= 0xc0 && buf[i+1] <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(buf[i+1])) {
    dim = { h: buf.readUInt16BE(i+5), w: buf.readUInt16BE(i+7) };
  }
}
const density = dim ? ((buf.length / (dim.w * dim.h)) * 1000).toFixed(2) : '?';
console.log(`画像: ${dim?.w} × ${dim?.h} px, ${buf.length} bytes, 密度 ${density} B/Kpx`);
console.log(`screenshotUrl: ${foundDoc.screenshotUrl}`);

if (dim?.w >= 1200 && Number(density) >= 10) {
  console.log('✅ PC 幅 + 中身あり (rescue 成功想定)');
} else {
  console.log('⚠️ 期待値と異なる');
}

console.log('\n=== STEP 5: expandManualImprovement (Before スクショ multimodal 込み) ===');
const { expandManualImprovementCallable } = await import('../src/callable/expandManualImprovement.js');
const req = {
  auth: { uid },
  data: {
    siteId,
    targetType: 'existing_single',
    targetPageUrl: targetUrl,
    userIntent: '採用 TOP のヒーロー直下に「数字でわかる職場」セクションを追加し応募意欲を高めたい',
  },
};
const t1 = Date.now();
const expansion = await expandManualImprovementCallable(req);
console.log(`(${Date.now() - t1}ms)`);
console.log(`title: ${expansion.title}`);
console.log(`category: ${expansion.category} / priority: ${expansion.priority}`);
console.log(`description: ${(expansion.description || '').substring(0, 120)}...`);
console.log('\n🎉 E2E 完了');
