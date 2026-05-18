import { HttpsError } from 'firebase-functions/v2/https';
import { sendImprovementConsultationEmail } from '../utils/emailSender.js';
import { enforceRateLimit, DEFAULT_RATE_LIMITS } from '../utils/rateLimiter.js';
import { optionalString, optionalMessage, MAX_NAME_LEN, MAX_COMPANY_LEN, MAX_URL_LEN } from '../utils/validators.js';

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

  // Phase 4-A-2: レート制限（フォーム送信スパム防止）
  await enforceRateLimit({ uid: request.auth.uid, ...DEFAULT_RATE_LIMITS.submitImprovementConsultation });

  const rawData = request.data || {};

  // 入力検証 (Phase 4-B-7): フォーム値の長さ・型を強制
  const siteName = optionalString(rawData.siteName, 'siteName', { maxLen: MAX_COMPANY_LEN });
  const siteUrl = optionalString(rawData.siteUrl, 'siteUrl', { maxLen: MAX_URL_LEN });
  const userName = optionalString(rawData.userName, 'userName', { maxLen: MAX_NAME_LEN });
  const message = optionalMessage(rawData.message, 'message');
  const excelDownloadUrl = optionalString(rawData.excelDownloadUrl, 'excelDownloadUrl', { maxLen: MAX_URL_LEN });
  const excelFileName = optionalString(rawData.excelFileName, 'excelFileName', { maxLen: 255 });
  const userEmail = request.auth.token.email || '';

  const result = await sendImprovementConsultationEmail({
    siteName: siteName.trim(),
    siteUrl: siteUrl.trim(),
    userEmail,
    userName: userName.trim(),
    message: message.trim(),
    excelDownloadUrl: excelDownloadUrl.trim(),
    excelFileName: excelFileName.trim(),
  });

  if (!result.success) {
    throw new HttpsError('internal', result.error || '送信に失敗しました');
  }

  return { success: true };
};
