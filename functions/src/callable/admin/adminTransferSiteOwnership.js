import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { logUserActivity, ACTIVITY_ACTIONS } from '../../utils/userActivityLogger.js';
import { sendEmailDirect } from '../../utils/emailSender.js';
import { generateSiteTransferNotificationEmail } from '../../utils/emailTemplates.js';

/**
 * 管理者が代行作成したサイトの所有権を顧客 (新規 or 既存ユーザー) に移管する。
 *
 * - 移管元: 実行 admin 自身が所有するサイトのみ (sites.userId === request.auth.uid)
 * - 移管先: memberRole='owner' (or undefined = デフォルト owner) のユーザーのみ
 * - OAuth トークン保持: ga4TokenOwner / gscTokenOwner は admin uid のまま (retainTokenOwner=true がデフォルト)
 *   → fetchGA4Data 等は引き続き admin の OAuth でデータ取得
 * - 部分失敗ベストエフォート: 一部失敗しても成功分は反映、failedSites を返す
 * - 監査ログ: ADMIN_SITE_OWNERSHIP_TRANSFERRED
 * - 通知: 既存ユーザー宛てにメール送信 (新規ユーザーは sendAccountCredentialsEmail で別途通知される想定)
 *
 * @param {string[]} data.siteIds - 移管対象のサイト ID 配列
 * @param {string} data.newOwnerUid - 新オーナーの uid
 * @param {boolean} [data.retainTokenOwner=true] - OAuth トークン参照を admin に保持するか
 * @param {boolean} [data.notifyExistingUser=true] - 既存ユーザーへの通知メール送信
 * @returns {{ success: boolean, transferredCount: number, failedSites: { siteId, reason }[] }}
 */
export const adminTransferSiteOwnershipCallable = async (request) => {
  const uid = request.auth?.uid;

  if (!uid) {
    throw new HttpsError('unauthenticated', 'ユーザー認証が必要です');
  }

  const {
    siteIds,
    newOwnerUid,
    retainTokenOwner = true,
    notifyExistingUser = true,
  } = request.data || {};

  // バリデーション
  if (!Array.isArray(siteIds) || siteIds.length === 0) {
    throw new HttpsError('invalid-argument', 'siteIds は 1 件以上の配列である必要があります');
  }
  if (!newOwnerUid || typeof newOwnerUid !== 'string') {
    throw new HttpsError('invalid-argument', 'newOwnerUid は必須です');
  }
  if (newOwnerUid === uid) {
    throw new HttpsError('invalid-argument', '自分自身に移管することはできません');
  }

  try {
    const db = getFirestore();

    // 管理者権限チェック (admin only。editor/viewer は不可)
    const adminDoc = await db.collection('adminUsers').doc(uid).get();
    if (!adminDoc.exists || adminDoc.data()?.role !== 'admin') {
      throw new HttpsError('permission-denied', 'この操作は admin ロールのみ実行できます');
    }

    // 移管先ユーザー存在確認 + ロール検証
    const newOwnerDoc = await db.collection('users').doc(newOwnerUid).get();
    if (!newOwnerDoc.exists) {
      throw new HttpsError('not-found', '移管先ユーザーが見つかりません');
    }
    const newOwnerData = newOwnerDoc.data();
    const newOwnerRole = newOwnerData.memberRole; // undefined = owner デフォルト
    if (newOwnerRole && newOwnerRole !== 'owner') {
      throw new HttpsError(
        'failed-precondition',
        '移管先は owner ロールのユーザーのみです (editor/viewer 不可)'
      );
    }

    // siteIds 全件で sites.userId === uid (実行者本人) をチェック
    const failedSites = [];
    const transferableSites = [];
    for (const siteId of siteIds) {
      try {
        const siteDoc = await db.collection('sites').doc(siteId).get();
        if (!siteDoc.exists) {
          failedSites.push({ siteId, reason: 'サイトが見つかりません' });
          continue;
        }
        const siteData = siteDoc.data();
        if (siteData.userId !== uid) {
          failedSites.push({ siteId, reason: '実行 admin が所有していないサイトです' });
          continue;
        }
        transferableSites.push({ siteId, siteData });
      } catch (err) {
        failedSites.push({ siteId, reason: err.message });
      }
    }

    if (transferableSites.length === 0) {
      return { success: false, transferredCount: 0, failedSites };
    }

    // batch update (chunked、Firestore 上限 500 を考慮)
    const CHUNK = 450;
    const transferredSiteIds = [];
    const transferredSiteList = []; // メール通知用 (siteName + siteUrl)
    const now = FieldValue.serverTimestamp();

    for (let i = 0; i < transferableSites.length; i += CHUNK) {
      const batch = db.batch();
      const slice = transferableSites.slice(i, i + CHUNK);
      for (const { siteId, siteData } of slice) {
        const updateData = {
          userId: newOwnerUid,
          ga4TokenOwner: retainTokenOwner ? (siteData.ga4TokenOwner || siteData.userId) : newOwnerUid,
          gscTokenOwner: retainTokenOwner ? (siteData.gscTokenOwner || siteData.userId) : newOwnerUid,
          _transferredAt: now,
          _transferredFromUid: uid,
          _transferredByAdminUid: uid,
          updatedAt: now,
        };
        batch.update(db.collection('sites').doc(siteId), updateData);
        transferredSiteIds.push(siteId);
        transferredSiteList.push({
          siteName: siteData.siteName || siteId,
          siteUrl: siteData.siteUrl || '',
        });
      }
      await batch.commit();
    }

    // 旧オーナー (admin) アカウントの editor/viewer メンバーの allowedSiteIds から該当サイト除去
    // (admin に編集メンバーが居る運用は稀だが整合性のため)
    try {
      const membersSnap = await db.collection('users')
        .where('accountOwnerId', '==', uid)
        .where('memberRole', 'in', ['editor', 'viewer'])
        .get();
      for (const memberDoc of membersSnap.docs) {
        const allowedSiteIds = memberDoc.data().allowedSiteIds || [];
        const filtered = allowedSiteIds.filter(id => !transferredSiteIds.includes(id));
        if (filtered.length !== allowedSiteIds.length) {
          await memberDoc.ref.update({ allowedSiteIds: filtered, updatedAt: now });
        }
      }
    } catch (membersErr) {
      logger.warn('[adminTransferSiteOwnership] メンバー allowedSiteIds 更新でエラー (移管自体は完了)', {
        error: membersErr.message,
      });
    }

    // 既存ユーザーへの通知メール送信 (新規作成ユーザーは別途 sendAccountCredentialsEmail で通知される想定)
    // _createdByAdmin フラグや作成日時で「直近作成」かを判定するのは複雑なので、
    // notifyExistingUser フラグでフロント側から制御 (新規作成時は false にする)
    if (notifyExistingUser && newOwnerData.email) {
      try {
        const userName = newOwnerData.name
          || (newOwnerData.lastName && newOwnerData.firstName
            ? `${newOwnerData.lastName} ${newOwnerData.firstName}`
            : '')
          || newOwnerData.displayName
          || newOwnerData.email.split('@')[0];

        const dashboardUrl = (process.env.APP_URL || 'https://grow-reporter.com') + '/dashboard';
        const { subject, html, text } = generateSiteTransferNotificationEmail({
          userName,
          siteCount: transferredSiteList.length,
          siteList: transferredSiteList,
          dashboardUrl,
        });
        await sendEmailDirect({ to: newOwnerData.email, subject, html, text });
        logger.info('[adminTransferSiteOwnership] 通知メール送信完了', {
          to: newOwnerData.email, count: transferredSiteList.length,
        });
      } catch (mailErr) {
        logger.warn('[adminTransferSiteOwnership] 通知メール送信失敗 (移管自体は完了)', {
          error: mailErr.message,
        });
      }
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
      action: ACTIVITY_ACTIONS.ADMIN_SITE_OWNERSHIP_TRANSFERRED,
      details: {
        fromUid: uid,
        toUid: newOwnerUid,
        toEmail: newOwnerData.email,
        siteIds: transferredSiteIds,
        siteCount: transferredSiteIds.length,
        retainTokenOwner,
        failedCount: failedSites.length,
      },
    });

    logger.info('[adminTransferSiteOwnership] 移管完了', {
      adminUid: uid,
      newOwnerUid,
      transferredCount: transferredSiteIds.length,
      failedCount: failedSites.length,
    });

    return {
      success: true,
      transferredCount: transferredSiteIds.length,
      failedSites,
    };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    logger.error('[adminTransferSiteOwnership] エラー', {
      error: error.message,
      stack: error.stack,
      adminUid: uid,
    });
    throw new HttpsError('internal', `サイト所有権移管に失敗: ${error.message}`);
  }
};
