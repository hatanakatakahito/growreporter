import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';

/**
 * アクティビティログ一覧を取得
 * 
 * @param {Object} data - リクエストパラメータ
 * @param {string} data.actionFilter - アクションフィルタ（任意）
 * @param {string} data.adminFilter - 管理者フィルタ（任意）
 * @param {number} data.page - ページ番号（デフォルト: 1）
 * @param {number} data.limit - 1ページあたりの件数（デフォルト: 50）
 * @returns {Object} アクティビティログ一覧とページネーション情報
 */
export const getActivityLogsCallable = async (request) => {
  const uid = request.auth?.uid;

  if (!uid) {
    throw new HttpsError('unauthenticated', 'ユーザー認証が必要です');
  }

  const {
    actionFilter = 'all',
    adminFilter = 'all',
    page = 1,
    limit = 50,
  } = request.data || {};

  try {
    const db = getFirestore();
    
    // 管理者権限チェック
    const adminDoc = await db.collection('adminUsers').doc(uid).get();
    if (!adminDoc.exists || !['admin', 'editor', 'viewer'].includes(adminDoc.data()?.role)) {
      throw new HttpsError('permission-denied', '管理者権限がありません');
    }

    logger.info('アクティビティログ取得開始', { 
      adminId: uid,
      actionFilter,
      adminFilter,
      page,
      limit,
    });

    // クエリ構築
    let query = db.collection('adminActivityLogs');

    // アクションフィルタ
    if (actionFilter && actionFilter !== 'all') {
      query = query.where('action', '==', actionFilter);
    }

    // 管理者フィルタ
    if (adminFilter && adminFilter !== 'all') {
      query = query.where('adminId', '==', adminFilter);
    }

    // 日付降順でソート
    query = query.orderBy('createdAt', 'desc');

    // 総件数を取得
    const countSnapshot = await query.count().get();
    const totalCount = countSnapshot.data().count;

    // ページネーション
    const offset = (page - 1) * limit;
    query = query.limit(limit).offset(offset);

    // データ取得
    const snapshot = await query.get();

    const logs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.().toISOString() || null,
    }));

    const pagination = {
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
      totalCount,
      limit,
      hasNextPage: page < Math.ceil(totalCount / limit),
      hasPrevPage: page > 1,
    };

    logger.info('アクティビティログ取得完了', { 
      adminId: uid,
      count: logs.length,
      totalCount,
    });

    return {
      success: true,
      data: {
        logs,
        pagination,
      },
    };

  } catch (error) {
    logger.error('アクティビティログ取得エラー', { 
      error: error.message,
      adminId: uid,
    });

    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError('internal', 'アクティビティログの取得に失敗しました');
  }
};

