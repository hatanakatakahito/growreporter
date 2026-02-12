import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';

/**
 * 管理者用サイト一覧取得
 * 検索、フィルタ、ページネーション対応
 * 
 * @param {Object} data - リクエストパラメータ
 * @param {string} data.searchQuery - 検索クエリ（サイト名、URL）
 * @param {string} data.userFilter - ユーザーIDでフィルタ
 * @param {number} data.page - ページ番号（1始まり）
 * @param {number} data.limit - 1ページあたりの件数（デフォルト20）
 * @param {string} data.sortBy - ソート項目（createdAt/siteName/userId）
 * @param {string} data.sortOrder - ソート順（asc/desc）
 * @returns {Object} サイトリストとページネーション情報
 */
export const getAdminSitesCallable = async (request) => {
  const uid = request.auth?.uid;

  if (!uid) {
    throw new HttpsError('unauthenticated', 'ユーザー認証が必要です');
  }

  try {
    const db = getFirestore();
    
    // 管理者権限チェック
    const adminDoc = await db.collection('adminUsers').doc(uid).get();
    if (!adminDoc.exists || !['admin', 'editor', 'viewer'].includes(adminDoc.data()?.role)) {
      throw new HttpsError('permission-denied', '管理者権限がありません');
    }

    const {
      searchQuery = '',
      userFilter = '',
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = request.data || {};

    logger.info('サイト一覧取得開始', { 
      adminId: uid,
      searchQuery,
      userFilter,
      page,
      limit,
    });

    // 全サイトを取得（フィルタ・ソートはメモリ内で実行）
    const snapshot = await db.collection('sites').get();

    let sites = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      sites.push({
        siteId: doc.id,
        siteName: data.siteName || '',
        siteUrl: data.siteUrl || '',
        userId: data.userId || '',
        userName: '', // 後で取得
        userEmail: '', // 後で取得
        ga4PropertyId: data.ga4PropertyId || '',
        gscSiteUrl: data.gscSiteUrl || '',
        industry: data.industry || '',
        siteType: data.siteType || '',
        createdAt: data.createdAt?.toDate?.().toISOString() || null,
        updatedAt: data.updatedAt?.toDate?.().toISOString() || null,
        // データ収集状況
        hasGA4: !!data.ga4PropertyId,
        hasGSC: !!data.gscSiteUrl,
        isOrphan: false, // 後で判定
      });
    });

    // ユーザー情報を取得
    const userIds = [...new Set(sites.map(s => s.userId))].filter(Boolean);
    const userMap = {};
    
    if (userIds.length > 0) {
      const batchSize = 10;
      for (let i = 0; i < userIds.length; i += batchSize) {
        const batch = userIds.slice(i, i + batchSize);
        const usersSnapshot = await db
          .collection('users')
          .where('__name__', 'in', batch)
          .get();

        usersSnapshot.forEach((doc) => {
          const data = doc.data();
          // ユーザー名を lastName + firstName で構成
          const userName = (data.lastName && data.firstName) 
            ? `${data.lastName} ${data.firstName}` 
            : (data.displayName || '');
          
          userMap[doc.id] = {
            displayName: userName,
            email: data.email || '',
          };
        });
      }
    }

    // ユーザー情報を反映し、孤立サイトを判定
    sites = sites.map((site) => {
      const user = userMap[site.userId];
      return {
        ...site,
        userName: user?.displayName || '不明',
        userEmail: user?.email || '',
        isOrphan: !user, // ユーザーが見つからない場合は孤立サイト
      };
    });

    // 検索フィルタ
    if (searchQuery && searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase().trim();
      sites = sites.filter((site) => {
        return (
          site.siteName?.toLowerCase().includes(query) ||
          site.siteUrl?.toLowerCase().includes(query) ||
          site.userName?.toLowerCase().includes(query) ||
          site.userEmail?.toLowerCase().includes(query)
        );
      });
    }

    // ユーザーフィルタ
    if (userFilter && userFilter !== '') {
      sites = sites.filter((site) => site.userId === userFilter);
    }

    // ソート
    const sortField = sortBy || 'createdAt';
    const order = sortOrder === 'asc' ? 'asc' : 'desc';
    sites.sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      // 日付フィールドの場合
      if (sortField === 'createdAt' || sortField === 'updatedAt') {
        aValue = aValue || '';
        bValue = bValue || '';
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
    const totalCount = sites.length;
    const totalPages = Math.ceil(totalCount / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedSites = sites.slice(startIndex, endIndex);

    // 孤立サイト数をカウント
    const orphanCount = sites.filter(s => s.isOrphan).length;

    logger.info('サイト一覧取得完了', { 
      adminId: uid,
      totalCount,
      orphanCount,
      page,
      returnedCount: paginatedSites.length,
    });

    return {
      success: true,
      data: {
        sites: paginatedSites,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
        stats: {
          orphanCount,
        },
      },
    };

  } catch (error) {
    logger.error('サイト一覧取得エラー', { 
      error: error.message,
      adminId: uid,
    });

    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError('internal', 'サイト一覧の取得に失敗しました');
  }
};

