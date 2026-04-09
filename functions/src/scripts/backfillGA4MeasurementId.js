import { getFirestore } from 'firebase-admin/firestore';
import { google } from 'googleapis';
import { getAndRefreshToken } from '../utils/tokenManager.js';
import { logger } from 'firebase-functions/v2';

/**
 * 全サイトのGA4測定ID（G-XXXXXXXXXX）を一括取得してFirestoreに保存
 * GA4 Admin API の dataStreams エンドポイントから取得
 */
export async function backfillGA4MeasurementId() {
  const db = getFirestore();
  const sitesSnap = await db.collection('sites').get();

  let updated = 0;
  let skipped = 0;
  let failed = 0;
  const errors = [];

  for (const siteDoc of sitesSnap.docs) {
    const site = siteDoc.data();
    const siteId = siteDoc.id;

    // 既に測定IDがあればスキップ
    if (site.ga4MeasurementId) {
      skipped++;
      continue;
    }

    // GA4プロパティIDがなければスキップ
    if (!site.ga4PropertyId) {
      skipped++;
      continue;
    }

    // トークン情報を取得
    const tokenOwnerId = site.ga4TokenOwner || site.ownerId;
    const tokenId = site.ga4OauthTokenId;
    if (!tokenOwnerId || !tokenId) {
      skipped++;
      continue;
    }

    try {
      // OAuth2クライアントを取得
      const { oauth2Client } = await getAndRefreshToken(tokenOwnerId, tokenId);

      // GA4 Admin API で Data Streams を取得
      const analyticsAdmin = google.analyticsadmin({ version: 'v1beta', auth: oauth2Client });
      const streamsRes = await analyticsAdmin.properties.dataStreams.list({
        parent: `properties/${site.ga4PropertyId}`,
      });

      const webStream = (streamsRes.data.dataStreams || []).find(s => s.type === 'WEB_DATA_STREAM');
      if (webStream?.webStreamData?.measurementId) {
        const measurementId = webStream.webStreamData.measurementId;
        await db.collection('sites').doc(siteId).update({ ga4MeasurementId: measurementId });
        logger.info(`[backfillGA4MeasurementId] ${siteId}: ${measurementId}`);
        updated++;
      } else {
        logger.warn(`[backfillGA4MeasurementId] ${siteId}: ウェブストリームが見つかりません`);
        skipped++;
      }
    } catch (err) {
      logger.error(`[backfillGA4MeasurementId] ${siteId}: エラー`, err.message);
      errors.push({ siteId, error: err.message });
      failed++;
    }
  }

  return {
    message: `GA4測定ID一括取得完了: 更新${updated}件, スキップ${skipped}件, 失敗${failed}件`,
    updated,
    skipped,
    failed,
    errors: errors.slice(0, 10),
  };
}
