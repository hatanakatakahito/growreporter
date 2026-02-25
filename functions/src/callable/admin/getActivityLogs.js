import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';

/**
 * アクティビティログ一覧を取得
 * ユーザー活動ログを管理者が閲覧する
 * 
 * @param {Object} data - リクエストパラメータ
 * @param {string} data.actionType - アクションフィルタ（任意）
 * @param {string} data.searchQuery - 検索クエリ（任意）
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
    actionType = 'all',
    searchQuery = '',
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
      actionType,
      searchQuery,
      page,
      limit,
    });

    // クエリ構築（activityLogsコレクションから取得）
    let query = db.collection('activityLogs');

    // アクションタイプフィルタ
    if (actionType && actionType !== 'all') {
      query = query.where('action', '==', actionType);
    }

    // 日付降順でソート
    query = query.orderBy('createdAt', 'desc');

    // データ取得
    const snapshot = await query.get();

    let logs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().createdAt?.toDate?.().toISOString() || null,
      createdAt: doc.data().createdAt?.toDate?.().toISOString() || null,
    }));

    // 検索クエリでフィルタリング（クライアントサイド）
    if (searchQuery && searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      logs = logs.filter(log => {
        const userName = (log.userName || '').toLowerCase();
        const userEmail = (log.userEmail || '').toLowerCase();
        const details = JSON.stringify(log.details || {}).toLowerCase();
        
        return userName.includes(query) || 
               userEmail.includes(query) ||
               details.includes(query);
      });
    }

    const totalCount = logs.length;

    // ページネーション
    const offset = (page - 1) * limit;
    const paginatedLogs = logs.slice(offset, offset + limit);

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
      count: paginatedLogs.length,
      totalCount,
    });

    return {
      success: true,
      logs: paginatedLogs,
      pagination,
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
