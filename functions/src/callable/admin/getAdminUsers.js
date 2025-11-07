import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';

/**
 * 管理者用ユーザー一覧取得
 * 検索、フィルタ、ページネーション対応
 * 
 * @param {Object} data - リクエストパラメータ
 * @param {string} data.searchQuery - 検索クエリ（名前、メール）
 * @param {string} data.planFilter - プランフィルタ（free/standard/premium/all）
 * @param {number} data.page - ページ番号（1始まり）
 * @param {number} data.limit - 1ページあたりの件数（デフォルト20）
 * @param {string} data.sortBy - ソート項目（createdAt/displayName/lastLoginAt）
 * @param {string} data.sortOrder - ソート順（asc/desc）
 * @returns {Object} ユーザーリストとページネーション情報
 */
export const getAdminUsersCallable = onCall(async (request) => {
  const uid = request.auth?.uid;

  if (!uid) {
    throw new HttpsError('unauthenticated', 'ユーザー認証が必要です');
  }

  try {
    const db = getFirestore();
    
    // 管理者権限チェック
    const adminDoc = await db.collection('adminUsers').doc(uid).get();
    if (!adminDoc.exists || !['admin', 'editor'].includes(adminDoc.data()?.role)) {
      throw new HttpsError('permission-denied', '管理者権限がありません');
    }

    const {
      searchQuery = '',
      planFilter = 'all',
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = request.data || {};

    logger.info('ユーザー一覧取得開始', { 
      adminId: uid,
      searchQuery,
      planFilter,
      page,
      limit,
    });

    // Firestoreクエリ構築
    let query = db.collection('userProfiles');

    // プランフィルタ
    if (planFilter && planFilter !== 'all') {
      query = query.where('plan', '==', planFilter);
    }

    // ソート
    const sortField = sortBy || 'createdAt';
    const order = sortOrder === 'asc' ? 'asc' : 'desc';
    query = query.orderBy(sortField, order);

    // 全件取得（クライアント側でフィルタ）
    // Firestoreの制限により、複合検索はクライアント側で実施
    const snapshot = await query.get();

    let users = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      users.push({
        uid: doc.id,
        displayName: data.displayName || '',
        email: data.email || '',
        photoURL: data.photoURL || null,
        plan: data.plan || 'free',
        createdAt: data.createdAt?.toDate?.().toISOString() || null,
        lastLoginAt: data.lastLoginAt?.toDate?.().toISOString() || null,
        // 使用状況
        aiSummaryUsage: data.aiSummaryUsage || 0,
        aiImprovementUsage: data.aiImprovementUsage || 0,
        // サイト数（後で取得）
        siteCount: 0,
      });
    });

    // 検索フィルタ（クライアント側）
    if (searchQuery && searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase().trim();
      users = users.filter((user) => {
        return (
          user.displayName?.toLowerCase().includes(query) ||
          user.email?.toLowerCase().includes(query) ||
          user.uid?.toLowerCase().includes(query)
        );
      });
    }

    // 各ユーザーのサイト数を取得
    const userUids = users.map(u => u.uid);
    if (userUids.length > 0) {
      // バッチでサイト数を取得（最大10件まで一度に）
      const batchSize = 10;
      for (let i = 0; i < userUids.length; i += batchSize) {
        const batch = userUids.slice(i, i + batchSize);
        const sitesSnapshot = await db
          .collection('sites')
          .where('userId', 'in', batch)
          .select()
          .get();

        // サイト数をカウント
        const siteCounts = {};
        sitesSnapshot.forEach((doc) => {
          const userId = doc.data().userId;
          siteCounts[userId] = (siteCounts[userId] || 0) + 1;
        });

        // ユーザーデータに反映
        users.forEach((user) => {
          if (batch.includes(user.uid)) {
            user.siteCount = siteCounts[user.uid] || 0;
          }
        });
      }
    }

    // ページネーション
    const totalCount = users.length;
    const totalPages = Math.ceil(totalCount / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedUsers = users.slice(startIndex, endIndex);

    logger.info('ユーザー一覧取得完了', { 
      adminId: uid,
      totalCount,
      page,
      returnedCount: paginatedUsers.length,
    });

    return {
      success: true,
      data: {
        users: paginatedUsers,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
    };

  } catch (error) {
    logger.error('ユーザー一覧取得エラー', { 
      error: error.message,
      adminId: uid,
    });

    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError('internal', 'ユーザー一覧の取得に失敗しました');
  }
});

