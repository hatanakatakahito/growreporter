import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { logUserActivity, ACTIVITY_ACTIONS } from '../../utils/userActivityLogger.js';

/**
 * 管理者が対象ユーザーに代わってサイトを登録
 * Firestoreにサイトドキュメントを作成し、onSiteChangedトリガーでメタデータ・スクショを自動取得
 *
 * @param {string} data.targetUserId - サイトを所有するユーザーID（必須）
 * @param {string} data.siteName - サイト名（必須）
 * @param {string} data.siteUrl - サイトURL（必須）
 * @param {string[]} data.industry - 業種（必須）
 * @param {string[]} data.siteType - サイトタイプ（必須）
 * @param {string[]} data.sitePurpose - サイト目的（必須）
 * @param {string} data.metaTitle - メタタイトル（任意）
 * @param {string} data.metaDescription - メタディスクリプション（任意）
 * @param {string} data.pcScreenshotUrl - PCスクリーンショットURL（任意）
 * @param {string} data.mobileScreenshotUrl - モバイルスクリーンショットURL（任意）
 * @returns {Object} 作成結果
 */
export const adminCreateSiteCallable = async (request) => {
  const uid = request.auth?.uid;

  if (!uid) {
    throw new HttpsError('unauthenticated', 'ユーザー認証が必要です');
  }

  const {
    targetUserId,
    siteName,
    siteUrl,
    industry = [],
    siteType = [],
    sitePurpose = [],
    metaTitle = '',
    metaDescription = '',
    pcScreenshotUrl = '',
    mobileScreenshotUrl = '',
  } = request.data || {};

  // バリデーション
  if (!targetUserId) {
    throw new HttpsError('invalid-argument', '対象ユーザーIDが必要です');
  }
  if (!siteName || !siteUrl) {
    throw new HttpsError('invalid-argument', 'サイト名とサイトURLは必須です');
  }
  if (!Array.isArray(industry) || industry.length === 0) {
    throw new HttpsError('invalid-argument', '業種を1つ以上選択してください');
  }
  if (!Array.isArray(siteType) || siteType.length === 0) {
    throw new HttpsError('invalid-argument', 'サイトタイプを1つ以上選択してください');
  }
  if (!Array.isArray(sitePurpose) || sitePurpose.length === 0) {
    throw new HttpsError('invalid-argument', 'サイト目的を1つ以上選択してください');
  }

  try {
    const db = getFirestore();

    // 管理者権限チェック（admin or editor）
    const executorAdminDoc = await db.collection('adminUsers').doc(uid).get();
    if (!executorAdminDoc.exists || !['admin', 'editor'].includes(executorAdminDoc.data()?.role)) {
      throw new HttpsError('permission-denied', 'この操作は管理者または編集者ロールが必要です');
    }

    // 対象ユーザー存在確認
    const userDoc = await db.collection('users').doc(targetUserId).get();
    if (!userDoc.exists) {
      throw new HttpsError('not-found', '対象のユーザーが見つかりません');
    }

    const userData = userDoc.data();
    const targetName = (userData.lastName && userData.firstName)
      ? `${userData.lastName} ${userData.firstName}`
      : (userData.displayName || userData.email || 'Unknown');

    // サイトドキュメント作成
    const now = FieldValue.serverTimestamp();
    const siteDocData = {
      siteName,
      siteUrl,
      industry,
      siteType,
      sitePurpose,
      metaTitle,
      metaDescription,
      pcScreenshotUrl,
      mobileScreenshotUrl,
      userId: targetUserId,
      setupStep: 1,
      setupCompleted: false, // ウィザードStep5完了時にtrueになる
      conversionEvents: [],
      kpiSettings: {
        targetSessions: 0,
        targetUsers: 0,
        targetConversions: 0,
        targetConversionRate: 0,
        kpiList: [],
      },
      _createdByAdmin: true,
      _createdByAdminId: uid,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await db.collection('sites').add(siteDocData);

    logger.info('管理者によるサイト作成完了', {
      executorId: uid,
      siteId: docRef.id,
      targetUserId,
      siteName,
      siteUrl,
    });

    // アクティビティログ
    await logUserActivity({
      userId: uid,
      userEmail: executorAdminDoc.data()?.email || '',
      userName: executorAdminDoc.data()?.displayName || '',
      action: ACTIVITY_ACTIONS.ADMIN_SITE_CREATED,
      details: {
        siteId: docRef.id,
        targetUserId,
        targetName,
        siteName,
        siteUrl,
      },
    });

    return {
      success: true,
      siteId: docRef.id,
      message: `${targetName}さんのサイト「${siteName}」を登録しました`,
    };

  } catch (error) {
    logger.error('管理者サイト作成エラー', {
      error: error.message,
      stack: error.stack,
      executorId: uid,
      targetUserId,
    });

    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError('internal', 'サイトの作成に失敗しました: ' + error.message);
  }
};
