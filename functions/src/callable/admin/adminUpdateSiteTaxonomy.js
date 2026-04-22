import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { logUserActivity, ACTIVITY_ACTIONS } from '../../utils/userActivityLogger.js';
import {
  BUSINESS_MODELS,
  SITE_ROLES,
  INDUSTRY_MAJOR,
  isMinorValidForMajor,
} from '../../constants/siteOptionsV2.js';

/**
 * 管理者が既存サイトのタクソノミー V2 4 軸を手動で確定する Callable。
 *
 * 移行スクリプト後に `needsManualReclassify: true` が残ったサイトを、
 * 管理画面 TaxonomyReclassifyModal から1件ずつ確定するためのエンドポイント。
 *
 * @param {Object} request.data
 * @param {string} request.data.siteId - 対象サイトID
 * @param {string} request.data.businessModel
 * @param {string} request.data.industryMajor
 * @param {string} request.data.industryMinor
 * @param {string} request.data.siteRole
 */
export const adminUpdateSiteTaxonomyCallable = async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'ユーザー認証が必要です');
  }

  const {
    siteId,
    businessModel,
    industryMajor,
    industryMinor,
    siteRole,
  } = request.data || {};

  if (!siteId) {
    throw new HttpsError('invalid-argument', 'siteId が必要です');
  }

  // バリデーション: 各値がマスターに存在するか
  if (!BUSINESS_MODELS.some((m) => m.value === businessModel)) {
    throw new HttpsError('invalid-argument', 'businessModel の値が不正です');
  }
  if (!SITE_ROLES.some((r) => r.value === siteRole)) {
    throw new HttpsError('invalid-argument', 'siteRole の値が不正です');
  }
  if (!INDUSTRY_MAJOR.some((i) => i.value === industryMajor)) {
    throw new HttpsError('invalid-argument', 'industryMajor の値が不正です');
  }
  if (!industryMinor || !isMinorValidForMajor(industryMajor, industryMinor)) {
    throw new HttpsError('invalid-argument', 'industryMinor が industryMajor に属していません');
  }

  const db = getFirestore();

  // 管理者権限チェック（admin or editor）
  const executorAdminDoc = await db.collection('adminUsers').doc(uid).get();
  if (
    !executorAdminDoc.exists ||
    !['admin', 'editor'].includes(executorAdminDoc.data()?.role)
  ) {
    throw new HttpsError('permission-denied', 'この操作は管理者または編集者ロールが必要です');
  }

  // サイト存在確認
  const siteRef = db.collection('sites').doc(siteId);
  const siteDoc = await siteRef.get();
  if (!siteDoc.exists) {
    throw new HttpsError('not-found', 'サイトが見つかりません');
  }

  try {
    await siteRef.update({
      businessModel,
      industryMajor,
      industryMinor,
      siteRole,
      taxonomyVersion: 2,
      needsManualReclassify: false,
      // 旧フィールドがまだ残っていれば同時削除
      industry: FieldValue.delete(),
      siteType: FieldValue.delete(),
      sitePurpose: FieldValue.delete(),
      businessType: FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp(),
      taxonomyConfirmedAt: FieldValue.serverTimestamp(),
      taxonomyConfirmedBy: uid,
    });

    logger.info('[adminUpdateSiteTaxonomy] 再分類完了', {
      adminId: uid,
      siteId,
      businessModel,
      industryMajor,
      industryMinor,
      siteRole,
    });

    // アクティビティログ
    await logUserActivity({
      userId: uid,
      userEmail: executorAdminDoc.data()?.email || '',
      userName: executorAdminDoc.data()?.displayName || '',
      action: ACTIVITY_ACTIONS.ADMIN_TAXONOMY_UPDATED || 'admin_taxonomy_updated',
      details: {
        siteId,
        siteName: siteDoc.data()?.siteName || '',
        businessModel,
        industryMajor,
        industryMinor,
        siteRole,
      },
    });

    return { success: true };
  } catch (error) {
    logger.error('[adminUpdateSiteTaxonomy] エラー', {
      adminId: uid,
      siteId,
      error: error.message,
    });
    if (error instanceof HttpsError) throw error;
    throw new HttpsError(
      'internal',
      `タクソノミー更新に失敗しました: ${error.message}`
    );
  }
};
