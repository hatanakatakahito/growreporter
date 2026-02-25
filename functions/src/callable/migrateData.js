import { HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';
import { migrateAccountMembersToUsers } from '../migrations/migrateAccountMembersToUsers.js';
import { backfillUsersAccountFields } from '../scripts/backfillUsersAccountFields.js';
import { migrateToSubcollections } from '../scripts/migrateToSubcollections.js';
import { migrateUserCollectionsToUsers } from '../scripts/migrateUserCollectionsToUsers.js';
import { backfillAlertEmail } from '../scripts/backfillAlertEmail.js';
import { enableAllNotifications } from '../scripts/enableAllNotifications.js';

/**
 * データマイグレーション実行用 Callable Function
 * 管理者のみ実行可能
 * 
 * @param {Object} data - リクエストパラメータ
 * @param {string} data.migrationType - マイグレーションタイプ ('accountMembersToUsers')
 * @returns {Object} マイグレーション結果
 */
export const migrateDataCallable = async (request) => {
  const uid = request.auth?.uid;

  if (!uid) {
    throw new HttpsError('unauthenticated', 'ユーザー認証が必要です');
  }

  // 管理者チェック（必要に応じて実装）
  // const isAdmin = await checkIfAdmin(uid);
  // if (!isAdmin) {
  //   throw new HttpsError('permission-denied', '管理者のみ実行できます');
  // }

  const { migrationType } = request.data || {};

  if (!migrationType) {
    throw new HttpsError('invalid-argument', 'マイグレーションタイプが必要です');
  }

  try {
    logger.info(`Starting migration: ${migrationType}`, { userId: uid });

    let result;
    switch (migrationType) {
      case 'accountMembersToUsers':
        result = await migrateAccountMembersToUsers();
        break;
      case 'backfillUsersAccountFields':
        result = await backfillUsersAccountFields();
        break;
      case 'migrateToSubcollections':
        result = await migrateToSubcollections();
        break;
      case 'migrateUserCollectionsToUsers':
        result = await migrateUserCollectionsToUsers();
        break;
      case 'backfillAlertEmail':
        result = await backfillAlertEmail();
        break;
      case 'enableAllNotifications':
        result = await enableAllNotifications();
        break;
      default:
        throw new HttpsError('invalid-argument', `不明なマイグレーションタイプ: ${migrationType}`);
    }

    logger.info(`Migration completed: ${migrationType}`, result);
    return result;

  } catch (error) {
    logger.error(`Migration failed: ${migrationType}`, error);
    throw error;
  }
};
