import { logger } from 'firebase-functions/v2';
import { sendUpgradeInquiryEmail } from '../utils/emailSender.js';

/**
 * upgradeInquiries ドキュメント作成時にメール送信
 */
export async function onUpgradeInquiryCreatedHandler(event) {
  const data = event.data?.data();
  if (!data) {
    logger.warn('upgradeInquiry データなし', { id: event.params?.inquiryId });
    return;
  }

  const { selectedPlan, companyName, userName, email, message } = data;

  try {
    await sendUpgradeInquiryEmail({
      selectedPlan: selectedPlan || '',
      companyName: companyName || '',
      userName: userName || '',
      userEmail: email || '',
      message: message || '',
    });
    logger.info('アップグレードお問い合わせメール送信完了', {
      inquiryId: event.params?.inquiryId,
      selectedPlan,
    });
  } catch (error) {
    logger.error('アップグレードお問い合わせメール送信エラー', {
      error: error.message,
      inquiryId: event.params?.inquiryId,
    });
  }
}
