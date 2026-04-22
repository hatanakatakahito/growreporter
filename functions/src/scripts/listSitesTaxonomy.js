import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

/**
 * 全サイトのタクソノミー V2 判定結果を一覧表示
 */

initializeApp();

async function listSitesTaxonomy() {
  const db = getFirestore();
  const snapshot = await db
    .collection('sites')
    .where('setupCompleted', '==', true)
    .get();

  console.log(`[listSitesTaxonomy] 対象サイト: ${snapshot.size}件\n`);

  const rows = [];
  snapshot.forEach((doc) => {
    const d = doc.data() || {};
    rows.push({
      siteId: doc.id,
      siteName: d.siteName || '(no name)',
      siteUrl: d.siteUrl || '(no url)',
      businessModel: d.businessModel || '-',
      industryMajor: d.industryMajor || '-',
      industryMinor: d.industryMinor || '-',
      siteRole: d.siteRole || '-',
      taxonomyConfidence: d.taxonomyConfidence || '-',
      needsManualReclassify: d.needsManualReclassify === true ? 'yes' : 'no',
      inferredAt: d.taxonomyInferredAt?.toDate?.()?.toISOString?.() || '-',
    });
  });

  rows.sort((a, b) => a.siteName.localeCompare(b.siteName, 'ja'));

  console.log('サイト名                                            | bModel | industryMajor            | industryMinor                   | siteRole         | conf   | manual | 判定日時');
  console.log('-'.repeat(200));
  for (const r of rows) {
    const line = [
      r.siteName.padEnd(50, ' ').slice(0, 50),
      r.businessModel.padEnd(6, ' '),
      r.industryMajor.padEnd(24, ' '),
      r.industryMinor.padEnd(31, ' '),
      r.siteRole.padEnd(16, ' '),
      r.taxonomyConfidence.padEnd(6, ' '),
      r.needsManualReclassify.padEnd(6, ' '),
      r.inferredAt,
    ].join(' | ');
    console.log(line);
  }
}

listSitesTaxonomy()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal:', err);
    process.exit(1);
  });
