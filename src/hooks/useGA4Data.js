import { useQuery } from '@tanstack/react-query';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';

/**
 * GA4データを取得するカスタムフック
 * @param {string} siteId - サイトID
 * @param {string} startDate - 開始日 (YYYY-MM-DD)
 * @param {string} endDate - 終了日 (YYYY-MM-DD)
 * @param {array} metrics - 取得するメトリクス配列 (例: ['sessions', 'users'])
 * @param {array} dimensions - 取得するディメンション配列 (例: ['date', 'deviceCategory'])
 * @param {string} dimensionFilter - ディメンションフィルター (オプション)
 * @param {object} options - TanStack Query のオプション
 * @returns {object} - Query結果
 */
export function useGA4Data(
  siteId,
  startDate,
  endDate,
  metrics = [],
  dimensions = [],
  dimensionFilter = null,
  options = {}
) {
  return useQuery({
    queryKey: ['ga4-data', siteId, startDate, endDate, metrics, dimensions, dimensionFilter],
    queryFn: async () => {
      console.log(
        `[useGA4Data] Fetching data: siteId=${siteId}, period=${startDate} to ${endDate}, metrics=${metrics.join(
          ','
        )}, dimensions=${dimensions.join(',')}`
      );

      const fetchGA4 = httpsCallable(functions, 'fetchGA4Data');
      const result = await fetchGA4({
        siteId,
        startDate,
        endDate,
        metrics,
        dimensions,
        dimensionFilter,
      });

      console.log('[useGA4Data] Data fetched successfully');
      return result.data;
    },
    enabled: !!siteId && !!startDate && !!endDate,
    staleTime: 5 * 60 * 1000, // 5分間キャッシュ
    ...options,
  });
}

