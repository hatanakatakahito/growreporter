/**
 * デバッグ: tsubame-g.com の URL を含む improvement を持つ siteId を特定する。
 *
 * 1. 全 sites を列挙
 * 2. 各 site の improvements/* を見て targetPageUrl に tsubame-g を含むものを探す
 * 3. もし siteId=CZYomSqeTRAnIWgD8Km4 が含まれていればデータ汚染
 * 4. 他の siteId なら、別セッション/別ユーザーが操作中
 */
import admin from 'firebase-admin';
admin.initializeApp({ projectId: 'growgroupreporter' });
const db = admin.firestore();

const TARGET_SUBSTRING = 'tsubame-g';
const FOCUS_SITE_ID = 'CZYomSqeTRAnIWgD8Km4';

console.log(`=== Searching improvements with targetPageUrl containing "${TARGET_SUBSTRING}" ===\n`);

const sitesSnap = await db.collection('sites').get();
console.log(`Total sites: ${sitesSnap.size}\n`);

const matches = [];

for (const siteDoc of sitesSnap.docs) {
  const siteId = siteDoc.id;
  const siteData = siteDoc.data();
  const siteUrl = siteData.siteUrl || '';
  const siteName = siteData.siteName || '';

  const impSnap = await db.collection('sites').doc(siteId).collection('improvements').get();
  const matched = [];
  for (const imp of impSnap.docs) {
    const data = imp.data();
    const url = data.targetPageUrl || '';
    if (url.includes(TARGET_SUBSTRING)) {
      matched.push({
        improvementId: imp.id,
        targetPageUrl: url,
        title: (data.title || '').substring(0, 60),
        status: data.status,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || 'unknown',
      });
    }
  }
  if (matched.length > 0) {
    matches.push({ siteId, siteName, siteUrl, count: matched.length, samples: matched.slice(0, 3) });
  }
}

if (matches.length === 0) {
  console.log(`❌ No improvements found with targetPageUrl containing "${TARGET_SUBSTRING}"`);
} else {
  console.log(`✅ Found ${matches.length} site(s) with matching improvements:\n`);
  for (const m of matches) {
    const isFocus = m.siteId === FOCUS_SITE_ID ? ' ⚠️ ← user is testing on this site!' : '';
    console.log(`  siteId=${m.siteId}${isFocus}`);
    console.log(`    siteName=${m.siteName}`);
    console.log(`    siteUrl=${m.siteUrl}`);
    console.log(`    count=${m.count}`);
    console.log(`    samples:`);
    for (const s of m.samples) {
      console.log(`      - [${s.status}] "${s.title}" → ${s.targetPageUrl} (${s.createdAt})`);
    }
    console.log('');
  }
}

console.log(`\n=== Also checking: focused site improvements summary ===`);
const focusImpSnap = await db.collection('sites').doc(FOCUS_SITE_ID).collection('improvements').get();
console.log(`siteId=${FOCUS_SITE_ID}: ${focusImpSnap.size} improvements`);
const urls = new Set();
for (const imp of focusImpSnap.docs) {
  const url = imp.data().targetPageUrl || '(empty)';
  urls.add(url);
}
console.log(`Unique targetPageUrls (first 20):`);
[...urls].slice(0, 20).forEach(u => console.log(`  - ${u}`));

process.exit(0);
