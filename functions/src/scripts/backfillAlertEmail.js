/**
 * 既存ユーザーに notificationSettings.alertEmail を true に一括設定するスクリプト（一度きり実行用）
 *
 * 実行例（Firebase Admin が利用可能な環境で）:
 * cd functions && node --loader ./loader.mjs src/scripts/backfillAlertEmail.js
 * または Firebase Console から migrateData Callable で migrationType: 'backfillAlertEmail' を呼ぶ
 */
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

export async function backfillAlertEmail() {
  const db = getFirestore();
  const usersSnap = await db.collection('users').get();
  let updated = 0;
  let skipped = 0;
  for (const docSnap of usersSnap.docs) {
    const data = docSnap.data();
    const ns = data.notificationSettings || {};
    if (ns.alertEmail === true) {
      skipped++;
      continue;
    }
    await docSnap.ref.update({
      'notificationSettings.alertEmail': true,
      'notificationSettings.emailNotifications': ns.weeklyReportEmail || ns.monthlyReportEmail || true,
      updatedAt: FieldValue.serverTimestamp(),
    });
    updated++;
  }
  return { updated, skipped, total: usersSnap.size };
}
