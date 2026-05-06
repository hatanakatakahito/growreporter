import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { logUserActivity, ACTIVITY_ACTIONS } from '../../utils/userActivityLogger.js';
import {
  requireDocId,
  requireString,
  requireUrl,
  optionalString,
  optionalDisplayName,
  MAX_COMPANY_LEN,
  MAX_NAME_LEN,
  MAX_URL_LEN,
} from '../../utils/validators.js';

/**
 * 管理者が対象ユーザーに代わってサイトを登録（タクソノミー V2 対応）
 * Firestoreにサイトドキュメントを作成し、onSiteChangedトリガーでメタデータ・スクショを自動取得。
 * 業種・サイト役割・ビジネスモデルはサイト登録後のスクレイピング完了時に AI が自動判定する。
 *
 * @param {string} data.targetUserId - サイトを所有するユーザーID（必須）
 * @param {string} data.siteName - サイト名（必須）
 * @param {string} data.siteUrl - サイトURL（必須）
 * @param {string} data.businessModel - ビジネスモデル（任意・未指定ならスクレイピング後にAI自動判定）
 * @param {string} data.industryMajor - 業種大分類（任意・同上）
 * @param {string} data.industryMinor - 業種小分類（任意・同上）
 * @param {string} data.siteRole - サイト役割（任意・同上）
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

  const rawData = request.data || {};

  // 入力検証 (Phase 4-B-7)
  const targetUserId = requireDocId(rawData.targetUserId, 'targetUserId');
  const siteName = requireString(rawData.siteName, 'siteName', { maxLen: MAX_COMPANY_LEN });
  const siteUrl = requireUrl(rawData.siteUrl, 'siteUrl');
  // タクソノミー V2 は任意（明示指定されない場合は後続スクレイピングで AI 自動判定）
  const businessModel = optionalDisplayName(rawData.businessModel, 'businessModel');
  const industryMajor = optionalDisplayName(rawData.industryMajor, 'industryMajor');
  const industryMinor = optionalDisplayName(rawData.industryMinor, 'industryMinor');
  const siteRole = optionalDisplayName(rawData.siteRole, 'siteRole');
  const metaTitle = optionalString(rawData.metaTitle, 'metaTitle', { maxLen: 500 });
  const metaDescription = optionalString(rawData.metaDescription, 'metaDescription', { maxLen: 1000 });
  const pcScreenshotUrl = optionalString(rawData.pcScreenshotUrl, 'pcScreenshotUrl', { maxLen: MAX_URL_LEN });
  const mobileScreenshotUrl = optionalString(rawData.mobileScreenshotUrl, 'mobileScreenshotUrl', { maxLen: MAX_URL_LEN });

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

    // サイトドキュメント作成（V2 スキーマ）
    // タクソノミー系が明示指定されていない場合は、スクレイピング完了時の AI 自動判定に委ねる
    const now = FieldValue.serverTimestamp();
    const siteDocData = {
      siteName,
      siteUrl,
      // タクソノミー V2 は明示指定された場合のみ書き込む（空のフィールドを撒かない）
      ...(businessModel ? { businessModel } : {}),
      ...(industryMajor ? { industryMajor } : {}),
      ...(industryMinor ? { industryMinor } : {}),
      ...(siteRole ? { siteRole } : {}),
      taxonomyVersion: 2,
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
