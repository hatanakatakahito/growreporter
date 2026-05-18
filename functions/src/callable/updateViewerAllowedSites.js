import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';

/**
 * viewer の allowedSiteIds を更新する
 *
 * セキュリティ方針:
 *  - アカウントオーナーのみ実行可能
 *  - 対象ユーザーは同一アカウントの viewer に限定
 *  - allowedSiteIds は実際にオーナーが所有しているサイトのみ受け付ける
 *
 * @param {Object} data - リクエストパラメータ
 * @param {string} data.targetUserId - 対象 viewer の UID
 * @param {string[]} data.allowedSiteIds - 閲覧を許可するサイト ID 配列
 * @returns {Object} 更新結果
 */
export const updateViewerAllowedSitesCallable = async (request) => {
  const uid = request.auth?.uid;

  if (!uid) {
    throw new HttpsError('unauthenticated', 'ユーザー認証が必要です');
  }

  const { targetUserId, allowedSiteIds } = request.data || {};

  if (!targetUserId || typeof targetUserId !== 'string') {
    throw new HttpsError('invalid-argument', '対象ユーザーの ID が必要です');
  }

  if (!Array.isArray(allowedSiteIds)) {
    throw new HttpsError('invalid-argument', 'allowedSiteIds は配列である必要があります');
  }

  try {
    const db = getFirestore();

    // 1. 実行者がアカウントオーナーであることを確認
    const ownerDoc = await db.collection('users').doc(uid).get();
    if (!ownerDoc.exists) {
      throw new HttpsError('not-found', 'ユーザーが見つかりません');
    }
    const ownerData = ownerDoc.data();
    const ownerRole = ownerData.memberRole || 'owner';
    if (ownerRole !== 'owner') {
      throw new HttpsError('permission-denied', 'オーナーのみ実行できます');
    }
    const accountOwnerId = ownerData.accountOwnerId || uid;

    // 2. 対象ユーザーが同一アカウントの viewer であることを確認
    const targetDoc = await db.collection('users').doc(targetUserId).get();
    if (!targetDoc.exists) {
      throw new HttpsError('not-found', '対象ユーザーが見つかりません');
    }
    const targetData = targetDoc.data();
    if (targetData.accountOwnerId !== accountOwnerId) {
      throw new HttpsError('permission-denied', 'このアカウントのメンバーではありません');
    }
    // editor / viewer どちらもサイト割当を変更可能（オーナーは対象外）
    if (targetData.memberRole !== 'editor' && targetData.memberRole !== 'viewer') {
      throw new HttpsError('failed-precondition', '対象ユーザーはメンバー（編集者/閲覧者）ではありません');
    }

    // 3. 重複除去 + サイト所有権の検証
    const uniqueSiteIds = [...new Set(allowedSiteIds.filter((s) => typeof s === 'string' && s.length > 0))];
    let validatedSiteIds = [];
    if (uniqueSiteIds.length > 0) {
      const siteSnaps = await Promise.all(
        uniqueSiteIds.map((sid) => db.collection('sites').doc(sid).get())
      );
      validatedSiteIds = siteSnaps
        .filter((s) => s.exists && s.data().userId === accountOwnerId)
        .map((s) => s.id);
      if (validatedSiteIds.length !== uniqueSiteIds.length) {
        throw new HttpsError('invalid-argument', '指定したサイトの一部があなたのアカウントに存在しません');
      }
    }

    // 4. 書き込み
    await db.collection('users').doc(targetUserId).update({
      allowedSiteIds: validatedSiteIds,
      updatedAt: FieldValue.serverTimestamp(),
    });

    logger.info('Viewer allowedSiteIds updated', {
      accountOwnerId,
      targetUserId,
      siteCount: validatedSiteIds.length,
    });

    return {
      success: true,
      message: '閲覧サイトを更新しました',
      allowedSiteIds: validatedSiteIds,
    };
  } catch (error) {
    logger.error('Error updating viewer allowedSiteIds:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', error?.message || '更新中にエラーが発生しました');
  }
};
