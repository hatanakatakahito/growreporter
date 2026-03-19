import { useQuery } from '@tanstack/react-query';
import { functions } from '../config/firebase';
import { httpsCallable } from 'firebase/functions';

/**
 * GA4月次データを取得するカスタムフック
 * @param {string} siteId - サイトID
 * @param {string} startDate - 開始日（YYYY-MM-DD）
 * @param {string} endDate - 終了日（YYYY-MM-DD）
 * @returns {object} - { monthlyData, isLoading, isError, error }
 */
export function useGA4MonthlyData(siteId, startDate, endDate, dimensionFilter = null) {
  return useQuery({
    queryKey: ['ga4MonthlyData', siteId, startDate, endDate, dimensionFilter],
    queryFn: async () => {
      if (!siteId || !startDate || !endDate) {
        throw new Error('siteId, startDate, endDate are required');
      }

      const fetchGA4MonthlyData = httpsCallable(functions, 'fetchGA4MonthlyData');

      try {
        const result = await fetchGA4MonthlyData({
          siteId,
          startDate,
          endDate,
          dimensionFilter,
        });
        
        return result.data;
      } catch (error) {
        console.error('[useGA4MonthlyData] Error:', error);
        throw error;
      }
    },
    enabled: !!siteId && !!startDate && !!endDate,
    staleTime: 5 * 60 * 1000, // 5分間キャッシュ
    retry: 1,
  });
}

