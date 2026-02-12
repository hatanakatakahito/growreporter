import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { appendOrUpdateRows, createRowData } from '../utils/sheetsManager.js';
import { fetchGA4MonthlyDataCallable } from '../callable/fetchGA4MonthlyData.js';
import { subMonths, format, startOfMonth, endOfMonth } from 'date-fns';

/**
 * サイト登録完了時のFirestoreトリガー
 * setupCompletedが false → true に変更された時に過去3ヶ月分のデータをGoogleスプレッドシートに自動エクスポート
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
    // setupCompletedが false → true に変わった時のみ実行
    const wasNotCompleted = !beforeData?.setupCompleted;
    const isNowCompleted = afterData?.setupCompleted === true;

    if (!wasNotCompleted || !isNowCompleted) {
      logger.info('[onSiteCreated] setupCompletedの変更がないためスキップ', {
        wasNotCompleted,
        isNowCompleted,
      });
      return null;
    }

    const siteData = afterData;

    // GA4連携が完了しているか確認
    if (!siteData.ga4PropertyId || !siteData.ga4OauthTokenId) {
      logger.warn('[onSiteCreated] GA4未連携のためスキップ', { siteId });
      return null;
    }

    logger.info('[onSiteCreated] 過去3ヶ月分のデータエクスポート開始');

    // 過去3ヶ月分のデータを取得してエクスポート
    const today = new Date();
    const rowsToExport = [];

    for (let i = 1; i <= 3; i++) {
      const targetMonth = subMonths(today, i);
      const startDate = format(startOfMonth(targetMonth), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(targetMonth), 'yyyy-MM-dd');
      const yearMonth = format(targetMonth, 'yyyy-MM');

      logger.info(`[onSiteCreated] ${yearMonth}のデータ取得開始`, {
        siteId,
        startDate,
        endDate,
      });

      try {
        // GA4月次データを取得（Callable関数を直接呼び出し）
        const monthlyResult = await fetchGA4MonthlyDataCallable({
          auth: { uid: siteData.userId }, // 認証コンテキストを模擬
          data: { siteId, startDate, endDate },
        });

        if (!monthlyResult?.monthlyData || monthlyResult.monthlyData.length === 0) {
          logger.warn(`[onSiteCreated] ${yearMonth}のデータが見つかりません`);
          continue;
        }

        // 月次データから該当月のデータを取得
        const monthData = monthlyResult.monthlyData[0];

        // スプレッドシート用の行データを作成
        const rowData = createRowData(
          {
            siteName: siteData.siteName,
            siteUrl: siteData.siteUrl,
            siteType: siteData.siteType,
            businessType: siteData.businessType,
          },
          {
            yearMonth,
            sessions: monthData.sessions || 0,
            newUsers: monthData.newUsers || 0,
            users: monthData.users || 0,
            pageViews: monthData.pageViews || 0,
            engagementRate: monthData.engagementRate || 0,
            conversions: monthData.conversions || 0,
          }
        );

        rowsToExport.push(rowData);
        logger.info(`[onSiteCreated] ${yearMonth}のデータ準備完了`);
      } catch (monthError) {
        logger.error(`[onSiteCreated] ${yearMonth}のデータ取得エラー:`, {
          error: monthError.message,
          stack: monthError.stack,
        });
        // エラーログをFirestoreに保存
        await db.collection('error_logs').add({
          type: 'sheets_export_error',
          function: 'onSiteCreated',
          siteId,
          yearMonth,
          error: monthError.message,
          stack: monthError.stack,
          timestamp: new Date(),
        });
      }
    }

    // データをスプレッドシートに書き込み
    if (rowsToExport.length > 0) {
      logger.info(`[onSiteCreated] ${rowsToExport.length}件のデータをスプレッドシートに書き込み開始`);
      
      const result = await appendOrUpdateRows(rowsToExport);
      
      logger.info('[onSiteCreated] スプレッドシートへの書き込み完了:', {
        inserted: result.inserted,
        updated: result.updated,
      });
    } else {
      logger.warn('[onSiteCreated] エクスポートするデータがありません');
    }

    return { success: true, rowsExported: rowsToExport.length };
  } catch (error) {
    logger.error('[onSiteCreated] エラー発生:', {
      error: error.message,
      stack: error.stack,
      siteId,
    });

    // エラーログをFirestoreに保存
    try {
      await db.collection('error_logs').add({
        type: 'sheets_export_error',
        function: 'onSiteCreated',
        siteId,
        error: error.message,
        stack: error.stack,
        timestamp: new Date(),
      });
    } catch (logError) {
      logger.error('[onSiteCreated] エラーログの保存に失敗:', logError);
    }

    // エラーをスローせずにnullを返す（トリガーの失敗を防ぐ）
    return null;
  }
}
