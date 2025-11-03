import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { appendOrUpdateRows, createRowData } from '../utils/sheetsManager.js';
import { fetchGA4MonthlyDataCallable } from '../callable/fetchGA4MonthlyData.js';
import { subMonths, format, startOfMonth, endOfMonth } from 'date-fns';

/**
 * Scheduled Function: 毎日午前4時に全サイトの前月データをGoogleスプレッドシートにエクスポート
 * 既存データがある場合は更新、ない場合は新規追加
 */
export async function exportToSheetsScheduled() {
  const db = getFirestore();
  
  logger.info('[exportToSheets] 定期エクスポート開始');

  try {
    // 前月の期間を計算
    const targetMonth = subMonths(new Date(), 1);
    const startDate = format(startOfMonth(targetMonth), 'yyyy-MM-dd');
    const endDate = format(endOfMonth(targetMonth), 'yyyy-MM-dd');
    const yearMonth = format(targetMonth, 'yyyy-MM');

    logger.info(`[exportToSheets] 対象月: ${yearMonth}`, { startDate, endDate });

    // GA4連携済みで、setupCompletedがtrueのサイトを全て取得
    const sitesSnapshot = await db
      .collection('sites')
      .where('setupCompleted', '==', true)
      .where('ga4PropertyId', '!=', null)
      .get();

    if (sitesSnapshot.empty) {
      logger.info('[exportToSheets] エクスポート対象のサイトが見つかりません');
      return null;
    }

    const sites = sitesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    logger.info(`[exportToSheets] ${sites.length}件のサイトを処理開始`);

    const rowsToExport = [];
    const errors = [];

    // 各サイトのデータを取得
    for (const site of sites) {
      try {
        logger.info(`[exportToSheets] サイト処理開始: ${site.siteName} (${site.id})`);

        // GA4月次データを取得（Callable関数を直接呼び出し）
        const monthlyResult = await fetchGA4MonthlyDataCallable({
          auth: { uid: site.userId }, // 認証コンテキストを模擬
          data: { siteId: site.id, startDate, endDate },
        });

        if (!monthlyResult?.monthlyData || monthlyResult.monthlyData.length === 0) {
          logger.warn(`[exportToSheets] ${site.siteName}のデータが見つかりません`);
          continue;
        }

        // 月次データから該当月のデータを取得
        const monthData = monthlyResult.monthlyData[0];

        // スプレッドシート用の行データを作成
        const rowData = createRowData(
          {
            siteName: site.siteName,
            siteUrl: site.siteUrl,
            siteType: site.siteType,
            businessType: site.businessType,
          },
          {
            yearMonth,
            sessions: monthData.sessions || 0,
            newUsers: monthData.newUsers || 0,
            users: monthData.totalUsers || 0,
            pageViews: monthData.screenPageViews || 0,
            engagementRate: monthData.engagementRate || 0,
            conversions: monthData.conversions || 0,
          }
        );

        rowsToExport.push(rowData);
        logger.info(`[exportToSheets] ${site.siteName}のデータ準備完了`);
      } catch (siteError) {
        logger.error(`[exportToSheets] ${site.siteName}の処理エラー:`, {
          siteId: site.id,
          error: siteError.message,
          stack: siteError.stack,
        });

        errors.push({
          siteId: site.id,
          siteName: site.siteName,
          error: siteError.message,
        });

        // エラーログをFirestoreに保存
        await db.collection('error_logs').add({
          type: 'sheets_export_error',
          function: 'exportToSheets',
          siteId: site.id,
          siteName: site.siteName,
          yearMonth,
          error: siteError.message,
          stack: siteError.stack,
          timestamp: new Date(),
        });
      }
    }

    // データをスプレッドシートに書き込み
    if (rowsToExport.length > 0) {
      logger.info(`[exportToSheets] ${rowsToExport.length}件のデータをスプレッドシートに書き込み開始`);
      
      const result = await appendOrUpdateRows(rowsToExport);
      
      logger.info('[exportToSheets] スプレッドシートへの書き込み完了:', {
        inserted: result.inserted,
        updated: result.updated,
        errors: errors.length,
      });

      // 実行履歴を保存
      await db.collection('export_history').add({
        type: 'scheduled_export',
        yearMonth,
        totalSites: sites.length,
        successCount: rowsToExport.length,
        errorCount: errors.length,
        inserted: result.inserted,
        updated: result.updated,
        errors: errors.length > 0 ? errors : null,
        timestamp: new Date(),
      });

      return {
        success: true,
        yearMonth,
        totalSites: sites.length,
        successCount: rowsToExport.length,
        errorCount: errors.length,
      };
    } else {
      logger.warn('[exportToSheets] エクスポートするデータがありません');
      return { success: false, message: 'No data to export' };
    }
  } catch (error) {
    logger.error('[exportToSheets] 致命的エラー:', {
      error: error.message,
      stack: error.stack,
    });

    // エラーログをFirestoreに保存
    try {
      await db.collection('error_logs').add({
        type: 'sheets_export_error',
        function: 'exportToSheets',
        error: error.message,
        stack: error.stack,
        timestamp: new Date(),
      });
    } catch (logError) {
      logger.error('[exportToSheets] エラーログの保存に失敗:', logError);
    }

    return null;
  }
}
