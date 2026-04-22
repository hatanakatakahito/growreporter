import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { inferTaxonomyFromUrl } from '../utils/taxonomyInferenceHelper.js';

/**
 * URL からタクソノミー V2 を Gemini で自動判定する Callable。
 *
 * 新規サイト登録時の入力補助、および既存サイトの移行補助として利用する。
 * プラン制限の月次カウントは消費しないが、悪用防止のため簡易レート制限
 * （1ユーザーあたり1時間 5 回）を siteRegistrationRateLimit/{uid} ドキュメントで管理。
 *
 * @param {Object} request.data
 * @param {string} request.data.siteUrl - サイトURL（必須、https/http）
 * @param {string} [request.data.siteName] - サイト名（任意）
 * @param {string} [request.data.siteId] - 既存サイトID（指定時は pageScrapingData を優先利用）
 * @returns {Promise<{ businessModel, industryMajor, industryMinor, siteRole, confidence, reasoning, needsManualReclassify }>}
 */
export const inferSiteTaxonomyCallable = async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'ユーザー認証が必要です');
  }

  const { siteUrl = '', siteName = '', siteId = '' } = request.data || {};

  if (!siteUrl || typeof siteUrl !== 'string') {
    throw new HttpsError('invalid-argument', 'siteUrl が必要です');
  }

  const normalizedUrl = siteUrl.startsWith('http') ? siteUrl : `https://${siteUrl}`;
  try {
    new URL(normalizedUrl); // 形式チェック
  } catch (_) {
    throw new HttpsError('invalid-argument', 'サイトURLの形式が正しくありません');
  }

  const db = getFirestore();

  // --- 簡易レート制限（1時間あたり5回） ---
  await enforceRateLimit(db, uid);

  try {
    // 1. 既存サイトのスクレイピング結果を再利用できるなら優先
    let html = '';
    let metadata = {};

    if (siteId) {
      const { html: existingHtml, metadata: existingMeta } = await fetchExistingSiteData(
        db,
        siteId
      );
      if (existingHtml) html = existingHtml;
      if (existingMeta) metadata = existingMeta;
      if (html) logger.info('[inferSiteTaxonomy] 既存スクレイピングを再利用', { siteId });
    }

    // 2. なければ fetchMetadata + HTML 本文を取得
    if (!html) {
      const result = await fetchMetadataAndHtml(normalizedUrl);
      html = result.html;
      metadata = result.metadata;
    }

    // 3. Gemini に推定させる
    const inference = await inferTaxonomyFromUrl({
      siteUrl: normalizedUrl,
      siteName,
      metadata,
      html,
    });

    return {
      success: true,
      ...inference,
      // 信頼度が low なら呼び出し側で needsManualReclassify=true を推奨
      needsManualReclassify: inference.confidence === 'low',
    };
  } catch (error) {
    logger.error('[inferSiteTaxonomy] 推定エラー', {
      uid,
      siteUrl: normalizedUrl,
      error: error.message,
    });
    if (error instanceof HttpsError) throw error;
    throw new HttpsError(
      'internal',
      `自動判定に失敗しました: ${error.message || '不明なエラー'}`
    );
  }
};

/**
 * レート制限: siteRegistrationRateLimit/{uid}
 * 1時間ウィンドウで最大 5 回まで。超過で resource-exhausted エラー。
 */
async function enforceRateLimit(db, uid) {
  const ref = db.collection('siteRegistrationRateLimit').doc(uid);
  const doc = await ref.get();
  const now = Date.now();
  const windowMs = 60 * 60 * 1000; // 1h
  const maxCalls = 5;

  if (doc.exists) {
    const data = doc.data() || {};
    const windowStart = data.windowStart?.toMillis?.() || 0;
    const count = Number(data.count || 0);
    if (now - windowStart < windowMs && count >= maxCalls) {
      throw new HttpsError(
        'resource-exhausted',
        `自動判定の回数上限に達しました（1時間あたり${maxCalls}回）。少し時間を置いてから再度お試しください。`
      );
    }
    if (now - windowStart < windowMs) {
      await ref.update({
        count: FieldValue.increment(1),
        lastCallAt: FieldValue.serverTimestamp(),
      });
    } else {
      // ウィンドウリセット
      await ref.set({
        windowStart: FieldValue.serverTimestamp(),
        count: 1,
        lastCallAt: FieldValue.serverTimestamp(),
      });
    }
  } else {
    await ref.set({
      windowStart: FieldValue.serverTimestamp(),
      count: 1,
      lastCallAt: FieldValue.serverTimestamp(),
    });
  }
}

/**
 * Firestore から既存サイトのメタデータとスクレイピング済み HTML を取得
 */
async function fetchExistingSiteData(db, siteId) {
  const result = { html: '', metadata: {} };
  try {
    const siteDoc = await db.collection('sites').doc(siteId).get();
    if (siteDoc.exists) {
      const data = siteDoc.data() || {};
      result.metadata = {
        title: data.metaTitle || '',
        description: data.metaDescription || '',
        ogTitle: data.ogTitle || '',
        ogDescription: data.ogDescription || '',
      };
    }
    // pageScrapingData の先頭ドキュメント（トップページなど）から HTML 断片を取得
    const scrapingSnap = await db
      .collection('sites')
      .doc(siteId)
      .collection('pageScrapingData')
      .orderBy('pageViews', 'desc')
      .limit(1)
      .get();
    if (!scrapingSnap.empty) {
      const top = scrapingSnap.docs[0].data() || {};
      result.html = top.bodyText || top.mainText || top.html || '';
    }
  } catch (error) {
    logger.warn('[inferSiteTaxonomy] 既存サイトデータ取得失敗（無視して新規取得）', {
      siteId,
      error: error.message,
    });
  }
  return result;
}

/**
 * URL から HTML + メタデータを取得（軽量版）
 * タイムアウトは短め（20秒）、失敗時は例外
 */
async function fetchMetadataAndHtml(url) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept':
          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
      },
      redirect: 'follow',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    const metadata = extractMetadata(html);

    return { html, metadata };
  } catch (error) {
    clearTimeout(timeoutId);
    throw new Error(
      `URL取得に失敗しました（${error.name === 'AbortError' ? 'タイムアウト' : error.message}）。` +
        '会員制サイトや認証必須ページは自動判定できないため、手入力で設定してください。'
    );
  }
}

/**
 * HTMLからメタデータを抽出（fetchMetadata.js の実装と同等）
 */
function extractMetadata(html) {
  const metadata = { title: '', description: '', ogTitle: '', ogDescription: '' };
  try {
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) metadata.title = decodeHtmlEntities(titleMatch[1].trim());

    const descMatch =
      html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i);
    if (descMatch) metadata.description = decodeHtmlEntities(descMatch[1].trim());

    const ogTitleMatch =
      html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i);
    if (ogTitleMatch) metadata.ogTitle = decodeHtmlEntities(ogTitleMatch[1].trim());

    const ogDescMatch =
      html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:description["']/i);
    if (ogDescMatch) metadata.ogDescription = decodeHtmlEntities(ogDescMatch[1].trim());
  } catch (_) {
    // swallow
  }
  return metadata;
}

function decodeHtmlEntities(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ');
}
