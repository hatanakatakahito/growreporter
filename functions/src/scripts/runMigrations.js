/**
 * Firestore 構造整理用マイグレーションを順に実行するランナー
 * 実行: cd functions && node src/scripts/runMigrations.js
 * 前提: Firebase の認証（firebase login または GOOGLE_APPLICATION_CREDENTIALS）
 */
import { initializeApp } from 'firebase-admin/app';
import { backfillUsersAccountFields } from './backfillUsersAccountFields.js';
import { migrateToSubcollections } from './migrateToSubcollections.js';

initializeApp();

async function main() {
  console.log('=== 1. backfillUsersAccountFields ===');
  const r1 = await backfillUsersAccountFields();
  console.log('結果:', r1);

  console.log('\n=== 2. migrateToSubcollections ===');
  const r2 = await migrateToSubcollections();
  console.log('結果:', r2);

  console.log('\nマイグレーション完了');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
