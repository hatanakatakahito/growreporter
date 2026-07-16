/**
 * tsubame-g.com を含む site のアクセス権を持つアカウントを列挙する。
 * - sites/{siteId} のオーナー (userId)
 * - sites/{siteId}/accountMembers (もしくは accountMembers コレクション全体) のメンバー
 */
import admin from 'firebase-admin';
admin.initializeApp({ projectId: 'growgroupreporter' });
const db = admin.firestore();

const TARGET_SITE_IDS = ['szAWOMypb1tMR0abpeET', 'yweywfAnJVrvSayf7sMt'];

for (const siteId of TARGET_SITE_IDS) {
  const siteDoc = await db.collection('sites').doc(siteId).get();
  if (!siteDoc.exists) {
    console.log(`siteId=${siteId}: NOT FOUND`);
    continue;
  }
  const d = siteDoc.data();
  console.log(`\n=== siteId=${siteId} (${d.siteName || ''}) ===`);
  console.log(`  siteUrl: ${d.siteUrl}`);
  console.log(`  ownerUserId: ${d.userId}`);

  // owner user info
  if (d.userId) {
    try {
      const userDoc = await db.collection('users').doc(d.userId).get();
      if (userDoc.exists) {
        const u = userDoc.data();
        console.log(`  ownerEmail: ${u.email || '(unknown)'}`);
        console.log(`  ownerName: ${u.displayName || u.name || '(unknown)'}`);
      } else {
        console.log(`  ownerUser: NOT FOUND in users collection`);
      }
    } catch (e) {
      console.log(`  ownerUser fetch error: ${e.message}`);
    }
  }

  // accountMembers — look for entries where siteIds includes this siteId
  const memSnap = await db.collection('accountMembers').get();
  const members = [];
  memSnap.forEach(d => {
    const data = d.data();
    if (data.siteIds && Array.isArray(data.siteIds) && data.siteIds.includes(siteId)) {
      members.push({ id: d.id, ...data });
    }
  });
  console.log(`  accountMembers (count=${members.length}):`);
  for (const m of members) {
    console.log(`    - userId=${m.userId}, role=${m.role}, email=${m.email || '(?)'}`);
  }
}

process.exit(0);
