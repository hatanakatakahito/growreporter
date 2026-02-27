import { HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';
import { checkCanGenerate, incrementGenerationCount } from '../utils/planManager.js';

/**
 * エクスポート使用回数をインクリメント
 * フロントエンドからエクスポート成功後に呼び出される
 */
export async function incrementExportUsageCallable(req) {
  // 認証チェック
  if (!req.auth?.uid) {
    throw new HttpsError('unauthenticated', '認証が必要です');
  }

  const { type } = req.data || {};

  if (!type || !['excel', 'pptx'].includes(type)) {
    throw new HttpsError('invalid-argument', 'type は "excel" または "pptx" を指定してください');
  }

  const userId = req.auth.uid;
  const usageType = type === 'excel' ? 'excelExport' : 'pptxExport';

  try {
    // 制限チェック
    const canExport = await checkCanGenerate(userId, usageType);
    if (!canExport) {
      throw new HttpsError(
        'resource-exhausted',
        '今月のエクスポート上限に達しました。有料プランにアップグレードしてください。'
      );
    }

    // インクリメント
    await incrementGenerationCount(userId, usageType);

    logger.info(`[incrementExportUsage] エクスポート使用回数をインクリメント: ${userId}, タイプ: ${type}`);

    return { success: true };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    logger.error('[incrementExportUsage] エラー:', error);
    throw new HttpsError('internal', 'エクスポート使用回数の更新に失敗しました');
  }
}
