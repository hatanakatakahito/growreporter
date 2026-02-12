import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { logger } from 'firebase-functions/v2';
import { logActivity } from '../../utils/activityLogger.js';

/**
 * 管理者を追加
 * 
 * @param {Object} data - リクエストパラメータ
 * @param {string} data.email - 追加する管理者のメールアドレス
 * @param {string} data.role - ロール (admin/editor/viewer)
 * @param {string} data.reason - 追加理由
 * @returns {Object} 追加結果
 */
export const addAdminCallable = async (request) => {
  const uid = request.auth?.uid;

  if (!uid) {
    throw new HttpsError('unauthenticated', 'ユーザー認証が必要です');
  }

  const {
    email,
    role = 'viewer',
    reason = '',
  } = request.data || {};

  if (!email) {
    throw new HttpsError('invalid-argument', 'メールアドレスが必要です');
  }

  if (!['admin', 'editor', 'viewer'].includes(role)) {
    throw new HttpsError('invalid-argument', '有効なロールを指定してください');
  }

  try {
    const db = getFirestore();
    const auth = getAuth();
    
    // 実行者の管理者権限チェック（adminロールのみ許可）
    const executorAdminDoc = await db.collection('adminUsers').doc(uid).get();
    if (!executorAdminDoc.exists || executorAdminDoc.data()?.role !== 'admin') {
      throw new HttpsError('permission-denied', 'この操作は管理者ロールのみ実行可能です');
    }

    // メールアドレスからユーザーを検索
    let targetUser;
    try {
      targetUser = await auth.getUserByEmail(email);
    } catch (error) {
      throw new HttpsError('not-found', 'このメールアドレスのユーザーは存在しません');
    }

    // 既に管理者として登録されているかチェック
    const existingAdminDoc = await db.collection('adminUsers').doc(targetUser.uid).get();
    if (existingAdminDoc.exists) {
      throw new HttpsError('already-exists', 'このユーザーは既に管理者として登録されています');
    }

    // 実行者情報を取得
    const executorData = executorAdminDoc.data();
    const executorName = (executorData.lastName && executorData.firstName) 
      ? `${executorData.lastName} ${executorData.firstName}` 
      : (executorData.displayName || executorData.email || 'Admin');

    // usersコレクションからユーザー情報を取得
    const userDoc = await db.collection('users').doc(targetUser.uid).get();
    const userData = userDoc.exists ? userDoc.data() : {};

    const targetName = (userData.lastName && userData.firstName) 
      ? `${userData.lastName} ${userData.firstName}` 
      : (userData.displayName || targetUser.displayName || email);

    // 管理者として追加
    await db.collection('adminUsers').doc(targetUser.uid).set({
      email: targetUser.email,
      displayName: targetUser.displayName || '',
      firstName: userData.firstName || '',
      lastName: userData.lastName || '',
      photoURL: targetUser.photoURL || '',
      role: role,
      createdAt: FieldValue.serverTimestamp(),
      createdBy: uid,
      updatedAt: FieldValue.serverTimestamp(),
    });

    logger.info('管理者追加完了', { 
      executorId: uid,
      newAdminId: targetUser.uid,
      email,
      role,
    });

    // アクティビティログに記録
    await logActivity(db, {
      adminId: uid,
      adminName: executorName,
      action: 'admin_added',
      targetType: 'admin',
      targetId: targetUser.uid,
      details: {
        targetName,
        email,
        role,
        reason,
      },
    });

    return {
      success: true,
      message: `${targetName}さんを管理者として追加しました`,
    };

  } catch (error) {
    logger.error('管理者追加エラー', { 
      error: error.message,
      executorId: uid,
      email,
    });

    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError('internal', '管理者の追加に失敗しました');
  }
};

