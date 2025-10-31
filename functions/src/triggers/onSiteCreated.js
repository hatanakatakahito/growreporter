import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { collectHistoricalData } from '../utils/benchmarkCollector.js';

/**
 * 新規サイト登録時のトリガー
 * 過去3ヶ月分のベンチマークデータを自動収集
 */
export const onSiteCreated = onDocumentCreated(
  {
    document: 'sites/{siteId}',
    region: 'asia-northeast1',
  },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
      console.log('[onSiteCreated] スナップショットなし');
      return;
    }

    const siteData = snapshot.data();
    const siteId = event.params.siteId;

    console.log(`[onSiteCreated] 新規サイト登録: ${siteData.site_name} (${siteId})`);

    try {
      // サイト情報にIDを追加
      const site = {
        id: siteId,
        ...siteData,
      };

      // 過去3ヶ月分のデータを収集
      await collectHistoricalData(site, 3);

      console.log(`[onSiteCreated] 完了: ${siteData.site_name}`);
    } catch (error) {
      console.error(`[onSiteCreated] エラー: ${siteData.site_name}`, error);
      // エラーが発生してもサイト登録は継続させる
    }
  }
);

