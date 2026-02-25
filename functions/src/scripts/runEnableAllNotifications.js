/**
 * 全ユーザーの通知設定を一括ONにするランナー
 * 実行: cd functions && node src/scripts/runEnableAllNotifications.js
 */
import { initializeApp } from 'firebase-admin/app';
import { enableAllNotifications } from './enableAllNotifications.js';

initializeApp();

async function main() {
  console.log('=== enableAllNotifications ===');
  const result = await enableAllNotifications();
  console.log('結果:', result);
  console.log('完了。');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
