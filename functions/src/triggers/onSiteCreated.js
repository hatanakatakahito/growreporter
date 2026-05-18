import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { sendEmailDirect } from '../utils/emailSender.js';
import { generateSiteRegistrationCompleteEmail } from '../utils/emailTemplates.js';

/**
 * サイト登録完了時のFirestoreトリガー
 * setupCompleted が false → true に変わったタイミングで、
 *   - 上位100ページスクレイピングジョブを投入
 *   - PC/モバイルのスクリーンショットを即時取得
 *   - サイト登録完了メールを送信
 */
export async function onSiteCreatedTrigger(event) {
  const siteId = event.params.siteId;
  const afterData = event.data.after?.data();
  const beforeData = event.data.before?.data();
  const db = getFirestore();

  logger.info('[onSiteCreated] トリガー開始:', {
    siteId,
    siteName: afterData?.siteName,
    beforeSetupCompleted: beforeData?.setupCompleted,
    afterSetupCompleted: afterData?.setupCompleted,
  });

  try {
    const wasNotCompleted = !beforeData?.setupCompleted;
    const isNowCompleted = afterData?.setupCompleted === true;

    if (!wasNotCompleted || !isNowCompleted) {
      return null;
    }

    const siteData = afterData;

    // 上位100ページスクレイピングをジョブキューに追加（手動「スクレイピング開始」と同じ経路）
    try {
      await db.collection('scrapingJobs').add({
        siteId,
        requestedBy: siteData.userId,
        forceRescrape: true,
        status: 'pending',
        requestedAt: FieldValue.serverTimestamp(),
        source: 'site_created',
      });
      logger.info('[onSiteCreated] スクレイピングジョブをキューに追加しました', { siteId });
    } catch (scrapingError) {
      logger.error('[onSiteCreated] スクレイピングジョブ追加エラー（サイト登録は成功）', {
        siteId,
        error: scrapingError.message,
      });
      await db.collection('error_logs').add({
        type: 'scraping_on_site_created_error',
        function: 'onSiteCreated',
        siteId,
        error: scrapingError.message,
        stack: scrapingError.stack,
        timestamp: new Date(),
      });
    }

    // スクリーンショット即時取得（ダッシュボード表示を早めるため）
    // CF Worker Browser Rendering 経由 viewport モードで PC + Mobile を 1 アクセスで同時取得
    if (siteData.siteUrl) {
      try {
        const { refreshSiteThumbnails } = await import('../utils/refreshSiteThumbnails.js');
        const result = await refreshSiteThumbnails({
          siteId,
          siteUrl: siteData.siteUrl,
          forceRefresh: false, // 24h cache を活用 (新規登録なので通常 cache hit しないが安全側)
        });
        if (result?.error) {
          logger.warn('[onSiteCreated] スクショ取得エラー', { siteId, error: result.error, message: result.message });
        } else if (result?.pcScreenshotUrl || result?.mobileScreenshotUrl) {
          logger.info('[onSiteCreated] スクショ保存完了', {
            siteId,
            pc: !!result.pcScreenshotUrl,
            mobile: !!result.mobileScreenshotUrl,
          });
        }
      } catch (importError) {
        logger.warn('[onSiteCreated] スクショモジュール読み込みエラー', { siteId, error: importError.message });
      }
    }

    // サイト登録完了メール送信
    try {
      const userDoc = await db.collection('users').doc(siteData.userId).get();
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const userEmail = userData.email;
        const userName = userData.lastName && userData.firstName
          ? `${userData.lastName} ${userData.firstName}`
          : userData.displayName || '';

        if (userEmail) {
          const { subject, html, text } = generateSiteRegistrationCompleteEmail({
            userName,
            siteName: siteData.siteName,
            siteUrl: siteData.siteUrl,
          });
          await sendEmailDirect({ to: userEmail, subject, html, text });
          logger.info('[onSiteCreated] サイト登録完了メール送信成功', { siteId, to: userEmail });
        }
      }
    } catch (emailError) {
      logger.warn('[onSiteCreated] サイト登録完了メール送信エラー（サイト登録は成功）', {
        siteId,
        error: emailError.message,
      });
    }

    return { success: true };
  } catch (error) {
    logger.error('[onSiteCreated] エラー発生:', {
      error: error.message,
      stack: error.stack,
      siteId,
    });

    try {
      await db.collection('error_logs').add({
        type: 'on_site_created_error',
        function: 'onSiteCreated',
        siteId,
        error: error.message,
        stack: error.stack,
        timestamp: new Date(),
      });
    } catch (logError) {
      logger.error('[onSiteCreated] エラーログの保存に失敗:', logError);
    }

    return null;
  }
}
