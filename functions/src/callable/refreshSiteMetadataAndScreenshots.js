import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { fetchMetadataCallable } from './fetchMetadata.js';
import { captureScreenshotCallable } from './captureScreenshot.js';
import { canEditSite } from '../utils/permissionHelper.js';

/**
 * メタデータ・スクリーンショットを再取得して sites を更新する
 * メタデータ: fetchMetadata（素fetch→Puppeteerフォールバック）
 * スクリーンショット: captureScreenshot（Puppeteer→PSIフォールバック）
 */
export const refreshSiteMetadataAndScreenshotsCallable = async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'ログインが必要です');
  }

  const { siteId } = request.data || {};
  if (!siteId) {
    throw new HttpsError('invalid-argument', 'siteIdが必要です');
  }

  const db = getFirestore();
  const siteRef = db.collection('sites').doc(siteId);
  const siteDoc = await siteRef.get();
  if (!siteDoc.exists) {
    throw new HttpsError('not-found', 'サイトが見つかりません');
  }

  const site = siteDoc.data();
  const siteUrl = site?.siteUrl;
  if (!siteUrl) {
    throw new HttpsError('invalid-argument', 'サイトにURLが設定されていません');
  }

  const canEdit = await canEditSite(uid, siteId);
  if (!canEdit) {
    throw new HttpsError('permission-denied', 'このサイトのメタデータを取得する権限がありません');
  }

  const updateData = {};

  // メタデータ: fetchMetadata（素fetch → Puppeteerフォールバック）
  try {
    const metadataResult = await fetchMetadataCallable({ data: { siteUrl } });
    const metadata = metadataResult?.metadata;
    if (metadata?.title || metadata?.ogTitle) {
      updateData.metaTitle = metadata.title || metadata.ogTitle;
    }
    if (metadata?.description || metadata?.ogDescription) {
      updateData.metaDescription = metadata.description || metadata.ogDescription;
    }
    logger.info('[refreshSiteMetadataAndScreenshots] メタデータ取得完了', {
      siteId, title: !!updateData.metaTitle, desc: !!updateData.metaDescription,
    });
  } catch (e) {
    logger.warn('[refreshSiteMetadataAndScreenshots] メタデータ取得エラー', { siteId, error: e.message });
  }

  // スクリーンショット: captureScreenshot（Puppeteer → PSIフォールバック）
  try {
    const pcResult = await captureScreenshotCallable({
      data: { siteUrl, deviceType: 'pc' },
      auth: request.auth,
    });
    if (pcResult?.imageUrl) updateData.pcScreenshotUrl = pcResult.imageUrl;
  } catch (e) {
    logger.warn('[refreshSiteMetadataAndScreenshots] PCスクショ取得エラー', { siteId, error: e.message });
  }

  try {
    const mobileResult = await captureScreenshotCallable({
      data: { siteUrl, deviceType: 'mobile' },
      auth: request.auth,
    });
    if (mobileResult?.imageUrl) updateData.mobileScreenshotUrl = mobileResult.imageUrl;
  } catch (e) {
    logger.warn('[refreshSiteMetadataAndScreenshots] モバイルスクショ取得エラー', { siteId, error: e.message });
  }

  if (Object.keys(updateData).length > 0) {
    await siteRef.update(updateData);
    logger.info('[refreshSiteMetadataAndScreenshots] 更新完了', { siteId, fields: Object.keys(updateData) });
  }

  return { success: true, updatedFields: Object.keys(updateData) };
};

export const refreshSiteMetadataAndScreenshotsCallableWithCatch = async (request) => {
  try {
    return await refreshSiteMetadataAndScreenshotsCallable(request);
  } catch (e) {
    if (e?.code && e?.message && typeof e.code === 'string') {
      throw e;
    }
    logger.error('[refreshSiteMetadataAndScreenshots] 未処理エラー', { error: e?.message, stack: e?.stack });
    throw new HttpsError('internal', e?.message || 'メタデータ・スクリーンショットの取得に失敗しました');
  }
};
