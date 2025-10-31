import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore } from 'firebase-admin/firestore';
import { collectPreviousMonthData } from '../utils/benchmarkCollector.js';

/**
 * 毎月1日 01:00 (Asia/Tokyo) に実行されるスケジュール関数
 * 全サイトの前月データを収集してスプレッドシートに追加
 */
export const collectMonthlyBenchmark = onSchedule(
  {
    schedule: '0 1 1 * *', // 毎月1日 01:00 (cron形式: 分 時 日 月 曜日)
    timeZone: 'Asia/Tokyo',
    region: 'asia-northeast1',
    memory: '512MiB',
    timeoutSeconds: 540, // 9分（最大実行時間）
  },
  async (event) => {
    const db = getFirestore();

    console.log('[collectMonthlyBenchmark] 月次ベンチマークデータ収集開始');

    try {
      // 全サイトを取得
      const sitesSnapshot = await db.collection('sites').get();
      
      if (sitesSnapshot.empty) {
        console.log('[collectMonthlyBenchmark] 登録サイトなし');
        return;
      }

      console.log(`[collectMonthlyBenchmark] 対象サイト数: ${sitesSnapshot.size}`);

      let successCount = 0;
      let failCount = 0;

      // 各サイトの前月データを収集
      for (const doc of sitesSnapshot.docs) {
        const siteData = doc.data();
        const site = {
          id: doc.id,
          ...siteData,
        };

        try {
          await collectPreviousMonthData(site);
          successCount++;
        } catch (error) {
          console.error(`[collectMonthlyBenchmark] エラー: ${site.site_name}`, error);
          failCount++;
        }

        // レート制限対策: 各サイト間で1秒待機
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      console.log(`[collectMonthlyBenchmark] 完了: 成功=${successCount}, 失敗=${failCount}`);
    } catch (error) {
      console.error('[collectMonthlyBenchmark] エラー:', error);
      throw error;
    }
  }
);

