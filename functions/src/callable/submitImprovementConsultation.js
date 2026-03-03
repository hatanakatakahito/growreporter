import { HttpsError } from 'firebase-functions/v2/https';
import { sendImprovementConsultationEmail } from '../utils/emailSender.js';

/**
 * サイト改善相談フォーム送信（制作会社へ相談する）
 * 宛先: info@grow-reporter.com
 *
 * @param {Object} request.data
 * @param {string} request.data.siteName - サイト名
 * @param {string} request.data.siteUrl - サイトURL
 * @param {string} [request.data.message] - 追加メッセージ（任意）
 */
export const submitImprovementConsultationCallable = async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'ログインが必要です');
  }

  const {
    siteName = '',
    siteUrl = '',
    message = '',
    userName = '',
    excelDownloadUrl = '',
    excelFileName = '',
  } = request.data || {};
  const userEmail = request.auth.token.email || '';

  const result = await sendImprovementConsultationEmail({
    siteName: String(siteName).trim(),
    siteUrl: String(siteUrl).trim(),
    userEmail,
    userName: String(userName).trim(),
    message: String(message).trim(),
    excelDownloadUrl: String(excelDownloadUrl).trim(),
    excelFileName: String(excelFileName).trim(),
  });

  if (!result.success) {
    throw new HttpsError('internal', result.error || '送信に失敗しました');
  }

  return { success: true };
};
