import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';

/**
 * 管理者一覧を取得
 * 
 * @returns {Object} 管理者一覧
 */
export const getAdminListCallable = async (request) => {
  const uid = request.auth?.uid;

  if (!uid) {
    throw new HttpsError('unauthenticated', 'ユーザー認証が必要です');
  }

  try {
    const db = getFirestore();
    
    // 管理者権限チェック
    const adminDoc = await db.collection('adminUsers').doc(uid).get();
    if (!adminDoc.exists) {
      throw new HttpsError('permission-denied', '管理者権限がありません');
    }

    const adminRole = adminDoc.data()?.role;
    if (!['admin', 'editor', 'viewer'].includes(adminRole)) {
      throw new HttpsError('permission-denied', '管理者権限がありません');
    }

    // 管理者一覧を取得
    const adminsSnapshot = await db.collection('adminUsers').orderBy('createdAt', 'desc').get();

    const admins = [];
    for (const doc of adminsSnapshot.docs) {
      const data = doc.data();
      
      // usersコレクションから追加情報を取得
      const userDoc = await db.collection('users').doc(doc.id).get();
      const userData = userDoc.exists ? userDoc.data() : {};

      admins.push({
        uid: doc.id,
        email: data.email || userData.email || '',
        displayName: (data.lastName && data.firstName) 
          ? `${data.lastName} ${data.firstName}`
          : (data.displayName || userData.displayName || ''),
        photoURL: data.photoURL || userData.photoURL || null,
        role: data.role || 'viewer',
        createdAt: data.createdAt?.toDate?.().toISOString() || null,
        updatedAt: data.updatedAt?.toDate?.().toISOString() || null,
      });
    }

    logger.info('管理者一覧取得完了', { 
      requesterId: uid,
      count: admins.length,
    });

    return {
      success: true,
      admins,
    };

  } catch (error) {
    logger.error('管理者一覧取得エラー', { 
      error: error.message,
      requesterId: uid,
    });

    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError('internal', '管理者一覧の取得に失敗しました');
  }
};

