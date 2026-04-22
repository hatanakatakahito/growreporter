import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

/**
 * 手動で特定サイトのタクソノミー V2 を修正するスクリプト
 *
 * 用途: AI自動判定が明らかに誤っているケースで、人手で正しい分類に上書きする
 *
 * 今回の対象:
 *   - dgFrro8OlPHakKmDs2XA (Grow Group 3件目): it_communication/その他 → it_communication/Web制作・ホームページ制作
 *     理由: 同じ URL の他の Grow Group サイトは Web制作 と判定されており整合させるべき
 *   - gaP6cXRKhsFqbzSuAsn6 (ドーミー関西): education/学校・大学・専門学校 → realestate_construction/不動産賃貸・管理
 *     理由: ドーミーは学生寮事業で、他のドーミー系(ドーミーBiz・ドーミー名古屋)と整合させるべき
 */

initializeApp();

const FIXES = [
  {
    siteId: 'dgFrro8OlPHakKmDs2XA',
    label: 'Grow Group (3件目)',
    businessModel: 'b2b',
    industryMajor: 'it_communication',
    industryMinor: 'Web制作・ホームページ制作',
    siteRole: 'corporate',
  },
  {
    siteId: 'gaP6cXRKhsFqbzSuAsn6',
    label: 'ドーミー関西',
    businessModel: 'b2c',
    industryMajor: 'realestate_construction',
    industryMinor: '不動産賃貸・管理',
    siteRole: 'service_product',
  },
  {
    siteId: 'E33hs8oB6dihy3Di8Jqh',
    label: 'GB-Navi',
    businessModel: 'b2b',
    industryMajor: 'consulting_professional',
    industryMinor: 'シンクタンク・リサーチ',
    siteRole: 'service_product',
  },
];

async function fixAll() {
  const db = getFirestore();

  for (const fix of FIXES) {
    try {
      const siteRef = db.collection('sites').doc(fix.siteId);
      const before = (await siteRef.get()).data() || {};
      console.log(`[fix] ${fix.label} (${fix.siteId})`);
      console.log(`  before: bm=${before.businessModel} major=${before.industryMajor} minor=${before.industryMinor} role=${before.siteRole}`);

      await siteRef.update({
        businessModel: fix.businessModel,
        industryMajor: fix.industryMajor,
        industryMinor: fix.industryMinor,
        siteRole: fix.siteRole,
        taxonomyVersion: 2,
        needsManualReclassify: false,
        taxonomyConfirmedAt: FieldValue.serverTimestamp(),
        taxonomyConfirmedBy: 'admin_script_manual_fix',
        taxonomyInferenceSource: 'manual_fix',
      });

      console.log(`  after : bm=${fix.businessModel} major=${fix.industryMajor} minor=${fix.industryMinor} role=${fix.siteRole} ✓`);
    } catch (e) {
      console.error(`  ERROR: ${e.message}`);
    }
  }

  console.log('\n[fixAll] 完了');
}

fixAll()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal:', err);
    process.exit(1);
  });
