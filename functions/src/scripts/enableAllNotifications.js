/**
 * 全ユーザーの weeklyReportEmail / monthlyReportEmail を true に一括設定するスクリプト
 *
 * 実行: migrateData Callable で migrationType: 'enableAllNotifications' を呼ぶ
 */
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

export async function enableAllNotifications() {
  const db = getFirestore();
  const usersSnap = await db.collection('users').get();
  let updated = 0;
  let skipped = 0;

  for (const docSnap of usersSnap.docs) {
    const data = docSnap.data();
    const ns = data.notificationSettings || {};

    // 既に全てONなら更新不要
    if (ns.weeklyReportEmail === true && ns.monthlyReportEmail === true && ns.alertEmail === true) {
      skipped++;
      continue;
    }

    await docSnap.ref.update({
      'notificationSettings.weeklyReportEmail': true,
      'notificationSettings.monthlyReportEmail': true,
      'notificationSettings.alertEmail': true,
      'notificationSettings.emailNotifications': true,
      updatedAt: FieldValue.serverTimestamp(),
    });
    updated++;
  }

  return { updated, skipped, total: usersSnap.size };
}
