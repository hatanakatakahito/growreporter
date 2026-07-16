import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

/**
 * 既存メンバー（editor / viewer）の allowedSiteIds 設定状況をスキャンするスクリプト（読み取り専用）
 *
 * 新仕様: editor / viewer 両方が allowedSiteIds でサイト指定式
 * 旧仕様: viewer は allowedSiteIds、editor は全サイト閲覧可だった
 *
 * 新仕様への移行で「allowedSiteIds なしの editor」が割当外サイトを見られなくなる問題を
 * 検出するため、両ロールのユーザーをスキャンする。
 *
 * 出力:
 *   - editor / viewer ユーザーの一覧
 *   - allowedSiteIds の有無と件数
 *   - accountOwnerId の解決状況
 *
 * 使い方:
 *   cd functions
 *   node src/scripts/scanLegacyViewers.js
 *
 * 注意: このスクリプトは何も書き込まない。発見したユーザーへの allowedSiteIds 補完は
 * オーナーが「権限を変更」モーダルから手動で実施する想定。
 */

initializeApp();

async function scanRole(db, role) {
  console.log(`\n=== ${role} ロール ユーザー スキャン ===`);

  const snap = await db
    .collection('users')
    .where('memberRole', '==', role)
    .get();

  if (snap.empty) {
    console.log(`${role} ロールのユーザーは見つかりませんでした。`);
    return { total: 0, withAllowed: 0, emptyAllowed: 0, withoutAllowed: 0 };
  }

  console.log(`${role} 数: ${snap.size}`);

  let withAllowed = 0;
  let withoutAllowed = 0;
  let emptyAllowed = 0;

  for (const doc of snap.docs) {
    const data = doc.data();
    const uid = doc.id;
    const email = data.email || '(メール無し)';
    const accountOwnerId = data.accountOwnerId || '(未設定)';
    const allowed = data.allowedSiteIds;
    const allowedKind = !Array.isArray(allowed)
      ? 'フィールド未設定'
      : allowed.length === 0
        ? '空配列（割当なし）'
        : `${allowed.length} サイト`;

    if (!Array.isArray(allowed)) withoutAllowed += 1;
    else if (allowed.length === 0) emptyAllowed += 1;
    else withAllowed += 1;

    console.log(`---`);
    console.log(`uid: ${uid}`);
    console.log(`  email: ${email}`);
    console.log(`  accountOwnerId: ${accountOwnerId}`);
    console.log(`  allowedSiteIds: ${allowedKind}`);
    if (Array.isArray(allowed) && allowed.length > 0) {
      console.log(`  ids: ${allowed.join(', ')}`);
    }
  }

  return { total: snap.size, withAllowed, emptyAllowed, withoutAllowed };
}

async function scan() {
  const db = getFirestore();

  const editorStats = await scanRole(db, 'editor');
  const viewerStats = await scanRole(db, 'viewer');

  console.log('\n=== サマリー ===');
  for (const [role, stats] of [['editor', editorStats], ['viewer', viewerStats]]) {
    if (stats.total === 0) continue;
    console.log(`\n[${role}] 合計: ${stats.total}`);
    console.log(`  割当あり: ${stats.withAllowed}`);
    console.log(`  空配列  : ${stats.emptyAllowed}`);
    console.log(`  未設定  : ${stats.withoutAllowed} ← 新仕様で割当外サイトを見られなくなるため要対応`);
  }
  console.log('\n※ 「未設定」のユーザーは旧仕様時のメンバー。');
  console.log('  → オーナーが /members の「権限を変更」モーダルから allowedSiteIds を割り当てれば解消');
}

scan()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('スキャンエラー:', err);
    process.exit(1);
  });
