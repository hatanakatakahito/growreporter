import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { logger } from 'firebase-functions/v2';

/** タイムスタンプを安全に ISO 文字列に変換 */
function toISOString(value) {
  if (!value) return null;
  try {
    if (value && typeof value.toDate === 'function') return value.toDate().toISOString();
    if (value && value._seconds != null) return new Date(value._seconds * 1000).toISOString();
    if (typeof value === 'string') return new Date(value).toISOString();
    return null;
  } catch {
    return null;
  }
}

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
export const getAdminUsersCallable = async (request) => {
  const uid = request.auth?.uid;

  if (!uid) {
    throw new HttpsError('unauthenticated', 'ユーザー認証が必要です');
  }

  try {
    const db = getFirestore();
    
    // 管理者権限チェック
    const adminDoc = await db.collection('adminUsers').doc(uid).get();
    const adminData = adminDoc.exists ? adminDoc.data() : null;
    const adminRole = adminData && adminData.role;
    if (!adminDoc.exists || !['admin', 'editor'].includes(adminRole)) {
      logger.warn('getAdminUsers: permission denied', { uid, hasDoc: adminDoc.exists, role: adminRole });
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

    // 全ユーザーを取得（フィルタ・ソートはメモリ内で実行）
    const snapshot = await db.collection('users').get();

    let users = [];
    const ownerPlanCache = {}; // オーナーのプランをキャッシュ
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      // ユーザー名を name 優先、lastName + firstName フォールバック
      const userName = data.name || (data.lastName && data.firstName
        ? `${data.lastName} ${data.firstName}`
        : '') || data.displayName || '';
      
      // メンバーシップをチェック（招待ユーザー = 自分以外のアカウントのメンバー）
      const memberships = data.memberships || {};
      const accountOwnerIds = Object.keys(memberships);
      const isMember = accountOwnerIds.some((ownerId) => ownerId !== doc.id);
      const accountOwnerId = isMember ? accountOwnerIds.find((id) => id !== doc.id) ?? accountOwnerIds[0] : null;
      
      users.push({
        uid: doc.id,
        displayName: userName,
        name: data.name || userName,
        email: data.email || '',
        company: data.company || '',
        photoURL: data.photoURL || null,
        plan: data.plan || 'free',
        isMember,
        accountOwnerId,
        memberRole: data.memberRole || 'owner',
        createdAt: toISOString(data.createdAt) || null,
        lastLoginAt: toISOString(data.lastLoginAt) || null,
        // 使用状況（後で取得）
        aiSummaryUsage: 0,
        aiImprovementUsage: 0,
        // サイト数（後で取得）
        siteCount: 0,
      });
    });

    // Firestore に photoURL が無い場合、Firebase Auth（SSO）の写真を補完
    if (users.length > 0) {
      try {
        const auth = getAuth();
        const BATCH_SIZE = 100;
        const authPhotoByUid = {};
        for (let i = 0; i < users.length; i += BATCH_SIZE) {
          const batch = users.slice(i, i + BATCH_SIZE);
          const identifiers = batch.map((u) => ({ uid: u.uid }));
          const result = await auth.getUsers(identifiers);
          for (const authUser of result.users || []) {
            if (authUser.photoURL) authPhotoByUid[authUser.uid] = authUser.photoURL;
          }
        }
        for (const user of users) {
          if (!user.photoURL && authPhotoByUid[user.uid]) {
            user.photoURL = authPhotoByUid[user.uid];
          }
        }
      } catch (authErr) {
        logger.warn('getAdminUsers: Auth photoURL 補完でエラー（一覧は継続）', { error: authErr.message });
      }
    }

    // メンバーの場合、オーナーのプランを取得
    for (const user of users) {
      if (user.isMember && user.accountOwnerId) {
        // キャッシュにあればそれを使用
        if (ownerPlanCache[user.accountOwnerId]) {
          user.plan = ownerPlanCache[user.accountOwnerId];
        } else {
          // オーナーのプランを取得
          const ownerDoc = await db.collection('users').doc(user.accountOwnerId).get();
          if (ownerDoc.exists) {
            const ownerPlan = ownerDoc.data().plan || 'free';
            ownerPlanCache[user.accountOwnerId] = ownerPlan;
            user.plan = ownerPlan;
          }
        }
      }
    }

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

    // 各ユーザーのサイト数とAI使用状況を取得
    const userUids = users.map(u => u.uid);
    if (userUids.length > 0) {
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // バッチでサイト数を取得（最大10件まで一度に）
      const batchSize = 10;
      for (let i = 0; i < userUids.length; i += batchSize) {
        const batch = userUids.slice(i, i + batchSize);
        
        // サイト数を取得
        const sitesSnapshot = await db
          .collection('sites')
          .where('userId', 'in', batch)
          .get();

        const siteCounts = {};
        sitesSnapshot.forEach((doc) => {
          const data = doc.data();
          const userId = data.userId;
          if (userId) {
            siteCounts[userId] = (siteCounts[userId] || 0) + 1;
          }
        });

        // AI使用状況を取得（今月分）
        const aiCacheSnapshot = await db
          .collectionGroup('aiAnalysisCache')
          .where('userId', 'in', batch)
          .where('generatedAt', '>=', Timestamp.fromDate(firstDayOfMonth))
          .get();

        const aiSummaryCounts = {};
        const aiImprovementCounts = {};
        aiCacheSnapshot.forEach((doc) => {
          const data = doc.data();
          const userId = data.userId;
          const pageType = data.pageType;
          
          if (userId) {
            if (pageType === 'comprehensive_improvement') {
              aiImprovementCounts[userId] = (aiImprovementCounts[userId] || 0) + 1;
            } else {
              aiSummaryCounts[userId] = (aiSummaryCounts[userId] || 0) + 1;
            }
          }
        });

        // ユーザーデータに反映
        users.forEach((user) => {
          if (batch.includes(user.uid)) {
            user.siteCount = siteCounts[user.uid] || 0;
            user.aiSummaryUsage = aiSummaryCounts[user.uid] || 0;
            user.aiImprovementUsage = aiImprovementCounts[user.uid] || 0;
          }
        });
      }
    }

    // プランフィルタ（メモリ内）
    if (planFilter && planFilter !== 'all') {
      users = users.filter((user) => user.plan === planFilter);
    }

    // ソート（メモリ内）
    const sortField = sortBy || 'createdAt';
    const order = sortOrder === 'asc' ? 'asc' : 'desc';
    users.sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      // 日付フィールドの場合、ISO文字列として比較
      if (sortField === 'createdAt' || sortField === 'lastLoginAt') {
        aValue = aValue || '';
        bValue = bValue || '';
      }
      // 数値フィールドの場合
      else if (sortField === 'siteCount' || sortField === 'aiSummaryUsage' || sortField === 'aiImprovementUsage') {
        aValue = aValue || 0;
        bValue = bValue || 0;
      }
      // 文字列フィールドの場合
      else {
        aValue = (aValue || '').toLowerCase();
        bValue = (bValue || '').toLowerCase();
      }

      if (aValue < bValue) return order === 'asc' ? -1 : 1;
      if (aValue > bValue) return order === 'asc' ? 1 : -1;
      return 0;
    });

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
      stack: error.stack,
      adminId: uid,
    });

    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError('internal', error.message || 'ユーザー一覧の取得に失敗しました');
  }
};

