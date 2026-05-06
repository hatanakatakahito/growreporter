import { HttpsError } from 'firebase-functions/v2/https';
import { sendUpgradeInquiryEmail } from '../utils/emailSender.js';
import { enforceRateLimit, DEFAULT_RATE_LIMITS } from '../utils/rateLimiter.js';
import { requireEnum, optionalString, optionalMessage, optionalCompanyName, optionalDisplayName, MAX_EMAIL_LEN } from '../utils/validators.js';

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

  // Phase 4-A-2: レート制限（プラン問合せスパム防止）
  await enforceRateLimit({ uid: request.auth.uid, ...DEFAULT_RATE_LIMITS.submitUpgradeInquiry });

  const rawData = request.data || {};

  // 入力検証 (Phase 4-B-7): プラン値・名前・メッセージの形式と長さを強制
  const selectedPlan = requireEnum(rawData.selectedPlan, 'selectedPlan', ['business', 'standard', 'premium']);
  const companyName = optionalCompanyName(rawData.companyName, 'companyName');
  const userName = optionalDisplayName(rawData.userName, 'userName');
  const email = optionalString(rawData.email, 'email', { maxLen: MAX_EMAIL_LEN });
  const message = optionalMessage(rawData.message, 'message');
  const authEmail = request.auth.token.email || '';

  const result = await sendUpgradeInquiryEmail({
    selectedPlan: selectedPlan.trim(),
    companyName: companyName.trim(),
    userName: userName.trim(),
    userEmail: email.trim() || authEmail,
    message: message.trim(),
  });

  if (!result.success) {
    throw new HttpsError('internal', result.error || '送信に失敗しました');
  }

  return { success: true };
};
