/**
 * スクリーンショット取得 Callable Function
 *
 * 実体は functions/src/utils/captureSingleScreenshot.js（PSI API 一元化）。
 * 本ファイルは Callable インタフェースを維持するための薄いラッパ。
 *
 * 入力:  { siteUrl: string, deviceType: 'pc'|'mobile' }
 * 出力:  { imageUrl: string }
 */
import { HttpsError } from 'firebase-functions/v2/https';
import { captureSingleScreenshot } from '../utils/captureSingleScreenshot.js';

export async function captureScreenshotCallable(request) {
  const { siteUrl, deviceType } = request.data;

  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'ユーザー認証が必要です');
  }
  if (!siteUrl || !deviceType) {
    throw new HttpsError('invalid-argument', 'siteUrl and deviceType are required');
  }
  if (!['pc', 'mobile'].includes(deviceType)) {
    throw new HttpsError('invalid-argument', 'deviceType must be "pc" or "mobile"');
  }

  const userId = request.auth.uid;

  const result = await captureSingleScreenshot({
    url: siteUrl,
    deviceType,
    userId,
    // 保存先はデフォルト（screenshots/{userId}/{deviceType}_{timestamp}.jpg）
  });

  if (!result?.imageUrl) {
    throw new HttpsError(
      'internal',
      'スクリーンショットの取得に失敗しました。しばらく経ってから再試行するか、手動で画像をアップロードしてください。'
    );
  }

  return { imageUrl: result.imageUrl };
}
