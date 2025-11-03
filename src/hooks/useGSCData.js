import { useQuery } from '@tanstack/react-query';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';
import { useSite } from '../contexts/SiteContext';

/**
 * GSCデータを取得するカスタムフック
 * @param {string} siteId - サイトID
 * @param {string} startDate - 開始日 (YYYY-MM-DD)
 * @param {string} endDate - 終了日 (YYYY-MM-DD)
 * @param {object} options - TanStack Query のオプション
 * @returns {object} - Query結果
 */
export function useGSCData(siteId, startDate, endDate, options = {}) {
  const { selectedSite } = useSite();
  
  // Search Console未連携の場合はクエリを無効化
  const hasGSCConnection = selectedSite?.gscSiteUrl && selectedSite?.gscOauthTokenId;
  
  return useQuery({
    queryKey: ['gsc-data', siteId, startDate, endDate],
    queryFn: async () => {
      console.log(`[useGSCData] Fetching data: siteId=${siteId}, period=${startDate} to ${endDate}`);
      
      const fetchGSC = httpsCallable(functions, 'fetchGSCData');
      const result = await fetchGSC({ siteId, startDate, endDate });
      
      console.log('[useGSCData] Data fetched successfully');
      return result.data;
    },
    enabled: !!siteId && !!startDate && !!endDate && hasGSCConnection,
    ...options,
  });
}




