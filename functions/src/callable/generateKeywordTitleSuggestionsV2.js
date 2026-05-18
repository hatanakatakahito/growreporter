/**
 * KW V2: Title / Description 改善案 3 パターン生成 Callable
 *
 * 「改善候補」タブで KW カードクリック時に呼ばれる。
 * 同じ KW で 30 日以内のキャッシュがあれば再利用、なければ AI 生成 → Firestore 保存。
 *
 * Firestore 保存先: sites/{siteId}/keywordSuggestions/{queryHash}
 */

import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import crypto from 'node:crypto';
import { canAccessSite } from '../utils/permissionHelper.js';
import { generateTitleSuggestions } from '../utils/keywordClassifier.js';

const SUGGESTION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 日

function hashQuery(query) {
  return crypto.createHash('sha1').update(query).digest('hex').slice(0, 24);
}

export async function generateKeywordTitleSuggestionsV2Callable(request) {
  const db = getFirestore();
  const { siteId, query, topPage, kwMetrics, forceRegenerate } = request.data || {};

  if (!siteId || !query) throw new HttpsError('invalid-argument', 'siteId, query are required');
  if (!request.auth) throw new HttpsError('unauthenticated', 'ユーザー認証が必要です');

  const userId = request.auth.uid;
  const hasAccess = await canAccessSite(userId, siteId);
  if (!hasAccess) throw new HttpsError('permission-denied', 'このサイトにアクセスする権限がありません');

  const queryHash = hashQuery(query);
  const cacheRef = db
    .collection('sites')
    .doc(siteId)
    .collection('keywordSuggestions')
    .doc(queryHash);

  console.log(`[generateKeywordTitleSuggestionsV2] query="${query}" siteId=${siteId} hash=${queryHash}`);

  try {
    // 1. キャッシュチェック
    if (!forceRegenerate) {
      const cached = await cacheRef.get();
      if (cached.exists) {
        const data = cached.data();
        const age = Date.now() - (data.generatedAt?.toMillis?.() || 0);
        if (age < SUGGESTION_TTL_MS && Array.isArray(data.suggestions) && data.suggestions.length) {
          console.log(`[generateKeywordTitleSuggestionsV2] cache hit (age ${Math.round(age / 86400000)}d)`);
          return {
            query,
            suggestions: data.suggestions,
            currentTitle: data.currentTitle || '',
            currentDescription: data.currentDescription || '',
            cached: true,
          };
        }
      }
    }

    // 2. サイト情報取得（context）
    const siteDoc = await db.collection('sites').doc(siteId).get();
    if (!siteDoc.exists) throw new HttpsError('not-found', 'サイトが見つかりません');
    const siteData = siteDoc.data();

    // 3. topPage の現在の Title / Description を pageScrapingData から取得（best effort）
    let currentTitle = '';
    let currentDescription = '';
    if (topPage) {
      try {
        const pagePathClean = topPage.replace(/^https?:\/\/[^/]+/, '') || '/';
        // pageScrapingData は path をキーにしている前提（既存実装に倣う）
        const pathHash = crypto.createHash('sha1').update(pagePathClean).digest('hex').slice(0, 24);
        const scrapingDoc = await db
          .collection('sites')
          .doc(siteId)
          .collection('pageScrapingData')
          .doc(pathHash)
          .get();
        if (scrapingDoc.exists) {
          const sd = scrapingDoc.data();
          currentTitle = sd.metaTitle || sd.title || '';
          currentDescription = sd.metaDescription || sd.description || '';
        }
      } catch (e) {
        console.warn('[generateKeywordTitleSuggestionsV2] page scraping fetch failed (non-fatal):', e.message);
      }
    }
    // フォールバック: サイト全体の metaTitle
    if (!currentTitle) currentTitle = siteData.metaTitle || '';
    if (!currentDescription) currentDescription = siteData.metaDescription || '';

    // 4. AI 提案生成
    const siteContext = {
      siteName: siteData.name || siteData.siteName,
      industry: siteData.industry,
      siteType: siteData.siteType,
      sitePurpose: siteData.sitePurpose,
      brandKeywords: siteData.brandKeywords || [],
    };
    const kwForAI = {
      query,
      clicks: kwMetrics?.clicks || 0,
      impressions: kwMetrics?.impressions || 0,
      ctr: kwMetrics?.ctr || 0,
      position: kwMetrics?.position || 0,
    };
    const suggestions = await generateTitleSuggestions(
      kwForAI,
      currentTitle,
      currentDescription,
      siteContext
    );

    if (!suggestions || suggestions.length === 0) {
      throw new HttpsError('internal', 'AI 提案の生成に失敗しました');
    }

    // 5. キャッシュ保存
    await cacheRef.set({
      query,
      queryHash,
      topPage: topPage || null,
      currentTitle,
      currentDescription,
      suggestions,
      generatedAt: FieldValue.serverTimestamp(),
      generatedBy: userId,
    });

    console.log(`[generateKeywordTitleSuggestionsV2] generated ${suggestions.length} suggestions`);

    return {
      query,
      suggestions,
      currentTitle,
      currentDescription,
      cached: false,
    };
  } catch (error) {
    console.error('[generateKeywordTitleSuggestionsV2] Error:', error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', '改善案生成に失敗しました: ' + error.message);
  }
}
