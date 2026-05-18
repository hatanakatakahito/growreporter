import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { logUserActivity, ACTIVITY_ACTIONS } from '../../utils/userActivityLogger.js';

/**
 * 管理者が以前移管したサイトを顧客から取り戻す (誤操作 / 顧客退会対応 / サポート)。
 *
 * 制約:
 * - admin role のみ実行可能
 * - 取り戻し対象: sites._transferredFromUid === request.auth.uid (元の admin が実行者)
 * - 他 admin が引き渡したサイトは取り戻せない (skip)
 * - sites.userId を sites._transferredFromUid に戻す
 * - ga4TokenOwner / gscTokenOwner は元から admin uid なので変更不要
 * - _transferredAt / _transferredFromUid / _transferredByAdminUid をクリア
 * - _reversedAt = serverTimestamp() 履歴用
 * - 顧客側の editor/viewer メンバーの allowedSiteIds から除去
 * - 監査ログ: ADMIN_SITE_OWNERSHIP_REVERSED
 *
 * @param {string[]} data.siteIds - 取り戻し対象のサイト ID 配列
 * @returns {{ success: boolean, reversedCount: number, failedSites: { siteId, reason }[] }}
 */
export const adminReverseSiteOwnershipCallable = async (request) => {
  const uid = request.auth?.uid;

  if (!uid) {
    throw new HttpsError('unauthenticated', 'ユーザー認証が必要です');
  }

  const { siteIds } = request.data || {};

  if (!Array.isArray(siteIds) || siteIds.length === 0) {
    throw new HttpsError('invalid-argument', 'siteIds は 1 件以上の配列である必要があります');
  }

  try {
    const db = getFirestore();

    // 管理者権限チェック (admin only)
    const adminDoc = await db.collection('adminUsers').doc(uid).get();
    if (!adminDoc.exists || adminDoc.data()?.role !== 'admin') {
      throw new HttpsError('permission-denied', 'この操作は admin ロールのみ実行できます');
    }

    // siteIds 全件で sites._transferredFromUid === uid をチェック
    const failedSites = [];
    const reversableSites = [];
    const affectedCustomerUids = new Set(); // allowedSiteIds 整理用

    for (const siteId of siteIds) {
      try {
        const siteDoc = await db.collection('sites').doc(siteId).get();
        if (!siteDoc.exists) {
          failedSites.push({ siteId, reason: 'サイトが見つかりません' });
          continue;
        }
        const siteData = siteDoc.data();
        if (!siteData._transferredFromUid) {
          failedSites.push({ siteId, reason: '移管されていないサイトです' });
          continue;
        }
        if (siteData._transferredFromUid !== uid) {
          failedSites.push({ siteId, reason: '別の admin が移管したサイトのため取り戻せません' });
          continue;
        }
        reversableSites.push({ siteId, siteData });
        if (siteData.userId) affectedCustomerUids.add(siteData.userId);
      } catch (err) {
        failedSites.push({ siteId, reason: err.message });
      }
    }

    if (reversableSites.length === 0) {
      return { success: false, reversedCount: 0, failedSites };
    }

    // batch update (chunked)
    const CHUNK = 450;
    const reversedSiteIds = [];
    const now = FieldValue.serverTimestamp();

    for (let i = 0; i < reversableSites.length; i += CHUNK) {
      const batch = db.batch();
      const slice = reversableSites.slice(i, i + CHUNK);
      for (const { siteId, siteData } of slice) {
        const updateData = {
          userId: siteData._transferredFromUid, // 元の admin に戻す
          _transferredAt: FieldValue.delete(),
          _transferredFromUid: FieldValue.delete(),
          _transferredByAdminUid: FieldValue.delete(),
          _reversedAt: now,
          _reversedByAdminUid: uid,
          updatedAt: now,
        };
        batch.update(db.collection('sites').doc(siteId), updateData);
        reversedSiteIds.push(siteId);
      }
      await batch.commit();
    }

    // 顧客アカウント (旧オーナー) の editor/viewer メンバーの allowedSiteIds から除去
    try {
      for (const customerUid of affectedCustomerUids) {
        const membersSnap = await db.collection('users')
          .where('accountOwnerId', '==', customerUid)
          .where('memberRole', 'in', ['editor', 'viewer'])
          .get();
        for (const memberDoc of membersSnap.docs) {
          const allowedSiteIds = memberDoc.data().allowedSiteIds || [];
          const filtered = allowedSiteIds.filter(id => !reversedSiteIds.includes(id));
          if (filtered.length !== allowedSiteIds.length) {
            await memberDoc.ref.update({ allowedSiteIds: filtered, updatedAt: now });
          }
        }
      }
    } catch (membersErr) {
      logger.warn('[adminReverseSiteOwnership] メンバー allowedSiteIds 更新でエラー (取り戻し自体は完了)', {
        error: membersErr.message,
      });
    }

    // 監査ログ
    const adminData = adminDoc.data();
    const adminName = adminData.name
      || (adminData.lastName && adminData.firstName
        ? `${adminData.lastName} ${adminData.firstName}`
        : '')
      || adminData.displayName
      || adminData.email
      || 'Admin';

    await logUserActivity({
      userId: uid,
      userEmail: adminData.email || '',
      userName: adminName,
      action: ACTIVITY_ACTIONS.ADMIN_SITE_OWNERSHIP_REVERSED,
      details: {
        adminUid: uid,
        siteIds: reversedSiteIds,
        siteCount: reversedSiteIds.length,
        affectedCustomerUids: Array.from(affectedCustomerUids),
        failedCount: failedSites.length,
      },
    });

    logger.info('[adminReverseSiteOwnership] 取り戻し完了', {
      adminUid: uid,
      reversedCount: reversedSiteIds.length,
      failedCount: failedSites.length,
    });

    return {
      success: true,
      reversedCount: reversedSiteIds.length,
      failedSites,
    };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    logger.error('[adminReverseSiteOwnership] エラー', {
      error: error.message,
      stack: error.stack,
      adminUid: uid,
    });
    throw new HttpsError('internal', `サイト所有権取り戻しに失敗: ${error.message}`);
  }
};
