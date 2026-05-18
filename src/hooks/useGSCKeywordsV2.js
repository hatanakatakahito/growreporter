import { useQuery, useQueryClient } from '@tanstack/react-query';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';

/**
 * GSC 流入キーワード V2 データを取得するカスタムフック
 * fetchGSCKeywordsV2Data callable を呼び、ファネル / クラスタ / CV 貢献 など全タブで使う統合データを返す
 *
 * @param {string} siteId
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate - YYYY-MM-DD
 * @param {object|null} comparisonRange - { startDate, endDate } or null
 * @param {boolean} hasGSCConnection
 * @param {object} options - TanStack Query options
 */
export function useGSCKeywordsV2(siteId, startDate, endDate, comparisonRange = null, hasGSCConnection = true, options = {}) {
  return useQuery({
    queryKey: [
      'gsc-kw-v2',
      siteId,
      startDate,
      endDate,
      comparisonRange?.startDate || null,
      comparisonRange?.endDate || null,
    ],
    queryFn: async () => {
      console.log(`[useGSCKeywordsV2] Fetching: siteId=${siteId}, ${startDate}-${endDate}`);
      const fetchFn = httpsCallable(functions, 'fetchGSCKeywordsV2Data');
      const result = await fetchFn({ siteId, startDate, endDate, comparisonRange });
      return result.data;
    },
    enabled: !!siteId && !!startDate && !!endDate && !!hasGSCConnection,
    staleTime: 5 * 60 * 1000, // 5 分
    ...options,
  });
}

/**
 * AI 再分類リクエスト
 */
export function useReclassifyKeywordsV2(siteId) {
  const queryClient = useQueryClient();
  return async () => {
    const fn = httpsCallable(functions, 'classifyKeywordsV2');
    const result = await fn({ siteId });
    // 関連クエリを invalidate（次回取得時に新分類が反映される）
    await queryClient.invalidateQueries({ queryKey: ['gsc-kw-v2', siteId] });
    return result.data;
  };
}

/**
 * Title / Description 改善案を生成
 */
export async function generateKeywordTitleSuggestions(siteId, kw) {
  const fn = httpsCallable(functions, 'generateKeywordTitleSuggestionsV2');
  const result = await fn({
    siteId,
    query: kw.query,
    topPage: kw.topPage,
    kwMetrics: {
      clicks: kw.clicks,
      impressions: kw.impressions,
      ctr: kw.ctr,
      position: kw.position,
    },
  });
  return result.data;
}
