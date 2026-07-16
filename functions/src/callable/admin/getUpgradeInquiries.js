import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
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

/** 送付忘れ警告レベルを計算 */
function getAlertLevel(status, statusUpdatedAt) {
  if (status !== 'estimate_created' || !statusUpdatedAt) return null;
  const updatedDate = statusUpdatedAt.toDate ? statusUpdatedAt.toDate() : new Date(statusUpdatedAt);
  const daysSince = Math.floor((Date.now() - updatedDate.getTime()) / (1000 * 60 * 60 * 24));
  if (daysSince >= 7) return 'danger';
  if (daysSince >= 3) return 'warning';
  return null;
}

/** 契約更新警告を判定 */
function getRenewalAlert(status, contractEndDate) {
  if (status !== 'active' || !contractEndDate) return false;
  const endDate = new Date(contractEndDate);
  const twoMonthsFromNow = new Date();
  twoMonthsFromNow.setMonth(twoMonthsFromNow.getMonth() + 2);
  return endDate <= twoMonthsFromNow;
}

/**
 * 管理者用アップグレード問い合わせ一覧取得
 */
export const getUpgradeInquiriesCallable = async (request) => {
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
      statusFilter = 'all',
      page = 1,
      limit = 20,
    } = request.data || {};

    // 全件取得してメモリ内フィルタ（getAdminUsersと同じパターン）
    const snapshot = await db.collection('upgradeInquiries').get();
    let inquiries = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: toISOString(data.createdAt),
        statusUpdatedAt: toISOString(data.statusUpdatedAt),
        alertLevel: getAlertLevel(data.status, data.statusUpdatedAt || data.createdAt),
        renewalAlert: getRenewalAlert(data.status, data.contractEndDate),
      };
    });

    // merged（統合済み）は除外
    inquiries = inquiries.filter(i => i.status !== 'merged');

    // ステータスフィルタ
    if (statusFilter && statusFilter !== 'all') {
      inquiries = inquiries.filter(i => i.status === statusFilter);
    }

    // 検索フィルタ（組織名、担当者名、メール）
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      inquiries = inquiries.filter(i =>
        (i.companyName || '').toLowerCase().includes(q) ||
        (i.lastName || '').toLowerCase().includes(q) ||
        (i.firstName || '').toLowerCase().includes(q) ||
        (i.email || '').toLowerCase().includes(q)
      );
    }

    // ソート（新しい順）
    inquiries.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });

    // 統計
    const allInquiries = snapshot.docs.map(d => d.data()).filter(d => d.status !== 'merged');
    const needsAction = allInquiries.filter(i => {
      const level = getAlertLevel(i.status, i.statusUpdatedAt || i.createdAt);
      return level === 'warning' || level === 'danger';
    }).length;
    const renewalSoon = allInquiries.filter(i =>
      getRenewalAlert(i.status, i.contractEndDate)
    ).length;

    // ステータス別件数
    const statusCounts = {
      new: 0,
      estimate_created: 0,
      contract_sent: 0,
      active: 0,
      cancelled: 0,
      inquiry_cancelled: 0,
    };
    for (const i of allInquiries) {
      if (Object.prototype.hasOwnProperty.call(statusCounts, i.status)) {
        statusCounts[i.status]++;
      }
    }

    // 直近 30 日 board 取込件数
    const thirtyDaysAgoMs = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recentImportCount = allInquiries.filter(i => {
      if (i.source !== 'board_import') return false;
      const createdAt = i.createdAt?.toDate ? i.createdAt.toDate() : (i.createdAt ? new Date(i.createdAt) : null);
      if (!createdAt || Number.isNaN(createdAt.getTime())) return false;
      return createdAt.getTime() >= thirtyDaysAgoMs;
    }).length;

    // uid 未紐付け件数 (board_import で uid 空)
    const unlinkedCount = allInquiries.filter(i =>
      i.source === 'board_import' && (!i.uid || i.uid === '')
    ).length;

    // ページネーション
    const totalCount = inquiries.length;
    const totalPages = Math.ceil(totalCount / limit);
    const startIndex = (page - 1) * limit;
    const paginatedInquiries = inquiries.slice(startIndex, startIndex + limit);

    return {
      success: true,
      data: {
        inquiries: paginatedInquiries,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
        stats: {
          needsAction,
          renewalSoon,
          statusCounts,
          recentImportCount,
          unlinkedCount,
        },
      },
    };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    logger.error('getUpgradeInquiries error:', { error: error.message });
    throw new HttpsError('internal', '問い合わせ一覧の取得に失敗しました');
  }
};
