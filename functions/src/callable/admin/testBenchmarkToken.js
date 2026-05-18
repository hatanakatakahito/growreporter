import { HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';
import { getFirestore } from 'firebase-admin/firestore';
import { google } from 'googleapis';
import { createOAuth2Client, assertAdmin } from '../../utils/benchmarkOAuthHelpers.js';

/**
 * lively-aggregating-bobcat: 保存済みベンチマーク用 OAuth トークンの疎通確認
 *
 * 指定 email のトークンで実際に GA4 Admin API + GSC sites.list を呼び出し、
 * 取得できるプロパティ数・サイト数を返す。トークンが失効していれば失敗。
 *
 * @param {object} request.data
 * @param {string} request.data.email
 * @returns {Promise<{ success, ga4Properties, gscSites, error? }>}
 */
export async function testBenchmarkTokenCallable(request) {
  await assertAdmin(request.auth?.uid);

  const { email } = request.data || {};
  if (!email) throw new HttpsError('invalid-argument', 'email が必要です');

  const db = getFirestore();
  const tokenDoc = await db.collection('serviceTokens').doc(email).get();
  if (!tokenDoc.exists) {
    throw new HttpsError('not-found', `serviceTokens/${email} が見つかりません`);
  }
  const data = tokenDoc.data();
  if (!data.refresh_token) {
    throw new HttpsError('failed-precondition', 'refresh_token がありません');
  }

  // OAuth2 クライアント生成（redirect_uri は不要なので空でOK）
  const oauth2Client = createOAuth2Client('');
  oauth2Client.setCredentials({ refresh_token: data.refresh_token });

  try {
    // GA4 Admin API: account summaries を取得（プロパティ数カウント）
    const admin = google.analyticsadmin({ version: 'v1beta', auth: oauth2Client });
    const accountsRes = await admin.accountSummaries.list({ pageSize: 200 });
    let ga4Count = 0;
    for (const acc of accountsRes.data.accountSummaries || []) {
      ga4Count += (acc.propertySummaries || []).length;
    }

    // Search Console API: sites.list
    const sc = google.searchconsole({ version: 'v1', auth: oauth2Client });
    const sitesRes = await sc.sites.list();
    const gscCount = (sitesRes.data.siteEntry || []).length;

    logger.info('[testBenchmarkToken] 成功', {
      adminId: request.auth.uid,
      email,
      ga4Count,
      gscCount,
    });

    return {
      success: true,
      ga4Properties: ga4Count,
      gscSites: gscCount,
    };
  } catch (err) {
    logger.warn('[testBenchmarkToken] API 呼出失敗', { email, error: err.message });
    return {
      success: false,
      error: err.message,
      ga4Properties: 0,
      gscSites: 0,
    };
  }
}
