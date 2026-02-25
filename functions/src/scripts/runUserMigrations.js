/**
 * ユーザー関連コレクションを users/{uid}/... へ移行するランナー（案A: デプロイ前に実行）
 * 実行: cd functions && node src/scripts/runUserMigrations.js
 */
import { initializeApp } from 'firebase-admin/app';
import { migrateUserCollectionsToUsers } from './migrateUserCollectionsToUsers.js';

initializeApp();

async function main() {
  console.log('=== migrateUserCollectionsToUsers ===');
  const result = await migrateUserCollectionsToUsers();
  console.log('結果:', result);
  console.log('\n完了。続けてデプロイし、その後 deleteOldUserRootCollections.js で旧ルートを削除してください。');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
