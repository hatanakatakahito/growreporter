import { logger } from 'firebase-functions/v2';
import { sendFeedbackEmail } from '../utils/emailSender.js';

/**
 * userFeedback ドキュメント作成時の処理
 * 管理者メール送信（info@grow-reporter.com）
 */
export async function onUserFeedbackCreatedHandler(event) {
  const data = event.data?.data();
  const feedbackId = event.params?.feedbackId;
  if (!data) {
    logger.warn('userFeedback データなし', { id: feedbackId });
    return;
  }

  try {
    await sendFeedbackEmail({
      categoryLabel: data.categoryLabel || '',
      companyName: data.companyName || '',
      lastName: data.lastName || '',
      firstName: data.firstName || '',
      userEmail: data.email || '',
      message: data.message || '',
      attachmentUrl: data.attachmentUrl || '',
      attachmentFileName: data.attachmentFileName || '',
      feedbackId: feedbackId || '',
    });
    logger.info('意見箱メール送信完了', { feedbackId, category: data.categoryLabel });
  } catch (error) {
    logger.error('意見箱メール送信エラー', { error: error.message, feedbackId });
  }
}
