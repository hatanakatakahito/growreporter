import { HttpsError } from 'firebase-functions/v2/https';
import { sendUpgradeInquiryEmail } from '../utils/emailSender.js';

/**
 * プランアップグレードお問い合わせ送信
 * 宛先: info@grow-reporter.com
 *
 * @param {Object} request.data
 * @param {string} request.data.selectedPlan - 希望プラン（standard / premium）
 * @param {string} [request.data.companyName] - 組織名
 * @param {string} [request.data.userName] - 氏名
 * @param {string} [request.data.email] - メールアドレス
 * @param {string} [request.data.message] - 追加メッセージ（任意）
 */
export const submitUpgradeInquiryCallable = async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'ログインが必要です');
  }

  const {
    selectedPlan = '',
    companyName = '',
    userName = '',
    email = '',
    message = '',
  } = request.data || {};
  const authEmail = request.auth.token.email || '';

  if (!selectedPlan || !['standard', 'premium'].includes(selectedPlan)) {
    throw new HttpsError('invalid-argument', '希望プランを選択してください');
  }

  const result = await sendUpgradeInquiryEmail({
    selectedPlan: String(selectedPlan).trim(),
    companyName: String(companyName).trim(),
    userName: String(userName).trim(),
    userEmail: String(email).trim() || authEmail,
    message: String(message).trim(),
  });

  if (!result.success) {
    throw new HttpsError('internal', result.error || '送信に失敗しました');
  }

  return { success: true };
};
