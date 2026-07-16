import { useQuery } from '@tanstack/react-query';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';

/**
 * ユーザージャーニーデータ取得 Hook
 *
 * 5層フロー: 流入元 → KW/参照元 → LP → 中間 → 結果
 *
 * Cloud Function `fetchGA4UserJourneyData` を呼び出して GA4 + GSC データを取得し、
 * 5層フロー用のノード/リンクデータに整形して返す。
 *
 * @param {string} siteId
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate - YYYY-MM-DD
 * @param {{ from: string, to: string } | null} comparisonRange - 比較期間（任意、ノードに前期比 change を付与）
 */
export function useUserJourney(siteId, startDate, endDate, comparisonRange = null) {
  const compStartDate = comparisonRange?.from || null;
  const compEndDate = comparisonRange?.to || null;

  return useQuery({
    queryKey: ['user-journey', siteId, startDate, endDate, compStartDate, compEndDate],
    queryFn: async () => {
      console.log('[useUserJourney] Fetching journey data...', { siteId, startDate, endDate, compStartDate, compEndDate });
      const fetchFn = httpsCallable(functions, 'fetchGA4UserJourneyData');
      const result = await fetchFn({
        siteId,
        startDate,
        endDate,
        compStartDate,
        compEndDate,
      });
      console.log('[useUserJourney] Data fetched:', {
        nodes: result.data.nodes?.length,
        links: result.data.links?.length,
        totalSessions: result.data.totalSessions,
        comparing: !!compStartDate,
      });
      return result.data;
    },
    enabled: !!siteId && !!startDate && !!endDate,
    staleTime: 5 * 60 * 1000, // 5分間キャッシュ
    retry: false,
  });
}
