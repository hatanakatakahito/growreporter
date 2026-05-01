/**
 * 特定 site の improvement 状態を全件出力 (Before/After ローディング状態調査用)。
 */
import admin from 'firebase-admin';
admin.initializeApp({ projectId: 'growgroupreporter' });
const db = admin.firestore();

const siteId = process.argv[2] || 'CZYomSqeTRAnIWgD8Km4';

const snap = await db.collection('sites').doc(siteId).collection('improvements').get();
console.log(`=== siteId=${siteId}, improvements=${snap.size} ===\n`);

const issues = [];
for (const d of snap.docs) {
  const data = d.data();
  const url = data.targetPageUrl || '(empty)';
  const has = {
    mockupStorageUrl: !!(data.mockupStorageUrl && data.mockupStorageUrl.length),
    mockupHtml: !!(data.mockupHtml && data.mockupHtml.length),
    mockupGenerationError: !!data.mockupGenerationError,
    mockupSkipped: !!data.mockupSkipped,
    mockupGeneratedAt: !!data.mockupGeneratedAt,
  };
  console.log(`[${data.status || '?'}] ${(data.title || '').substring(0, 50)}`);
  console.log(`  url: ${url}`);
  console.log(`  mockup: storageUrl=${has.mockupStorageUrl}, html=${has.mockupHtml}, skipped=${has.mockupSkipped}, error=${has.mockupGenerationError}, generatedAt=${has.mockupGeneratedAt}`);
  if (data.mockupGenerationError) {
    console.log(`  ⚠️ error: ${String(data.mockupGenerationError).substring(0, 200)}`);
  }
  if (data.mockupSkipReason) {
    console.log(`  skipReason: ${data.mockupSkipReason}`);
  }
  console.log('');
}

// page-screenshots からの Before 状態
const ssSnap = await db.collection('sites').doc(siteId).collection('pageScreenshots').get();
console.log(`\n=== pageScreenshots (count=${ssSnap.size}) ===`);
const byUrl = {};
ssSnap.forEach(d => {
  if (d.id === '_meta') return;
  const dd = d.data();
  const u = dd.url || '(empty)';
  if (!byUrl[u]) byUrl[u] = { pc: false, mobile: false, source: dd.source };
  byUrl[u][dd.deviceType || 'pc'] = true;
});
for (const [u, info] of Object.entries(byUrl)) {
  const both = info.pc && info.mobile ? '✅' : (info.pc || info.mobile ? '⚠️ (片方のみ)' : '❌');
  console.log(`  ${both} ${u} — pc=${info.pc} mobile=${info.mobile} src=${info.source}`);
}

process.exit(0);
