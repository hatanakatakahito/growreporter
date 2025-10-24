import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { fetchGA4Data } from './ga4/fetchGA4Data.js';
import { fetchGSCData } from './gsc/fetchGSCData.js';
import { refreshGA4Token } from './ga4/refreshToken.js';
import { refreshGSCToken } from './gsc/refreshToken.js';

// Firebase Admin初期化
initializeApp();
const db = getFirestore();

/**
 * 日次データ取得（スケジュール実行）
 * 毎日午前3時（JST）に実行
 */
export const dailyDataFetch = onSchedule({
  schedule: 'every day 03:00',
  timeZone: 'Asia/Tokyo',
  memory: '512MiB',
  timeoutSeconds: 540,
}, async (event) => {
  console.log('[dailyDataFetch] 開始');

  try {
    // すべてのサイトを取得
    const sitesSnapshot = await db.collection('sites')
      .where('setupCompleted', '==', true)
      .get();

    console.log(`[dailyDataFetch] ${sitesSnapshot.size}件のサイトを処理`);

    const promises = [];

    for (const siteDoc of sitesSnapshot.docs) {
      const siteData = siteDoc.data();
      const siteId = siteDoc.id;

      console.log(`[dailyDataFetch] サイト処理開始: ${siteData.siteName} (${siteId})`);

      // GA4データ取得
      if (siteData.ga4PropertyId && siteData.ga4OauthTokenId) {
        promises.push(
          fetchGA4Data(siteId, siteData)
            .catch(err => {
              console.error(`[dailyDataFetch] GA4データ取得エラー (${siteId}):`, err);
            })
        );
      }

      // GSCデータ取得
      if (siteData.gscSiteUrl && siteData.gscOauthTokenId) {
        promises.push(
          fetchGSCData(siteId, siteData)
            .catch(err => {
              console.error(`[dailyDataFetch] GSCデータ取得エラー (${siteId}):`, err);
            })
        );
      }
    }

    await Promise.all(promises);
    console.log('[dailyDataFetch] 完了');
  } catch (error) {
    console.error('[dailyDataFetch] エラー:', error);
    throw error;
  }
});

/**
 * 手動データ取得（HTTPSトリガー）
 */
export const manualDataFetch = onCall({
  memory: '512MiB',
  timeoutSeconds: 300,
}, async (request) => {
  const { siteId } = request.data;

  if (!siteId) {
    throw new HttpsError('invalid-argument', 'siteId is required');
  }

  console.log(`[manualDataFetch] サイトID: ${siteId}`);

  try {
    const siteDoc = await db.collection('sites').doc(siteId).get();

    if (!siteDoc.exists) {
      throw new HttpsError('not-found', 'Site not found');
    }

    const siteData = siteDoc.data();

    // ユーザー認証チェック
    if (request.auth && siteData.userId !== request.auth.uid) {
      throw new HttpsError('permission-denied', 'Not authorized to access this site');
    }

    const results = {
      ga4: null,
      gsc: null,
    };

    // GA4データ取得
    if (siteData.ga4PropertyId && siteData.ga4OauthTokenId) {
      try {
        results.ga4 = await fetchGA4Data(siteId, siteData);
      } catch (err) {
        console.error('[manualDataFetch] GA4エラー:', err);
        results.ga4 = { error: err.message };
      }
    }

    // GSCデータ取得
    if (siteData.gscSiteUrl && siteData.gscOauthTokenId) {
      try {
        results.gsc = await fetchGSCData(siteId, siteData);
      } catch (err) {
        console.error('[manualDataFetch] GSCエラー:', err);
        results.gsc = { error: err.message };
      }
    }

    return {
      success: true,
      results,
    };
  } catch (error) {
    console.error('[manualDataFetch] エラー:', error);
    throw new HttpsError('internal', error.message);
  }
});

/**
 * トークン更新（HTTPSトリガー）
 */
export const refreshTokens = onCall({
  memory: '256MiB',
  timeoutSeconds: 60,
}, async (request) => {
  const { tokenId, type } = request.data;

  if (!tokenId || !type) {
    throw new HttpsError('invalid-argument', 'tokenId and type are required');
  }

  console.log(`[refreshTokens] トークンID: ${tokenId}, タイプ: ${type}`);

  try {
    if (type === 'ga4') {
      await refreshGA4Token(tokenId);
    } else if (type === 'gsc') {
      await refreshGSCToken(tokenId);
    } else {
      throw new HttpsError('invalid-argument', 'Invalid type');
    }

    return {
      success: true,
      message: 'Token refreshed successfully',
    };
  } catch (error) {
    console.error('[refreshTokens] エラー:', error);
    throw new HttpsError('internal', error.message);
  }
});

