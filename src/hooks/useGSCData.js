import { useQuery } from '@tanstack/react-query';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';

/**
 * GSCデータを取得するカスタムフック
 * @param {string} siteId - サイトID
 * @param {string} startDate - 開始日 (YYYY-MM-DD)
 * @param {string} endDate - 終了日 (YYYY-MM-DD)
 * @param {boolean} hasGSCConnection - GSC連携の有無
 * @param {object} options - TanStack Query のオプション
 * @returns {object} - Query結果
 */
export function useGSCData(siteId, startDate, endDate, hasGSCConnection = true, pathFilter = null, options = {}) {
  return useQuery({
    queryKey: ['gsc-data', siteId, startDate, endDate, pathFilter],
    queryFn: async () => {
      console.log(`[useGSCData] Fetching data: siteId=${siteId}, period=${startDate} to ${endDate}${pathFilter ? `, pathFilter=${pathFilter}` : ''}`);

      const fetchGSC = httpsCallable(functions, 'fetchGSCData');
      const result = await fetchGSC({ siteId, startDate, endDate, pathFilter });

      console.log('[useGSCData] Data fetched successfully');
      return result.data;
    },
    enabled: !!siteId && !!startDate && !!endDate && !!hasGSCConnection,
    ...options,
  });
}




