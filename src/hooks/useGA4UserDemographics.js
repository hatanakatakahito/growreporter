import { useQuery } from '@tanstack/react-query';
import { functions } from '../config/firebase';
import { httpsCallable } from 'firebase/functions';
import { format } from 'date-fns';

/**
 * GA4ユーザー属性データを取得するカスタムフック
 * @param {string} siteId - サイトID
 * @param {Date} from - 開始日
 * @param {Date} to - 終了日
 */
export const useGA4UserDemographics = (siteId, from, to) => {
  return useQuery({
    queryKey: ['ga4-user-demographics', siteId, from, to],
    queryFn: async () => {
      if (!siteId || !from || !to) {
        throw new Error('siteId, from, and to are required');
      }

      const fetchGA4UserDemographics = httpsCallable(functions, 'fetchGA4UserDemographics');
      
      const result = await fetchGA4UserDemographics({
        siteId,
        startDate: format(from, 'yyyy-MM-dd'),
        endDate: format(to, 'yyyy-MM-dd'),
      });

      if (!result.data.success) {
        throw new Error(result.data.error || 'Failed to fetch user demographics');
      }

      return result.data.data;
    },
    enabled: !!siteId && !!from && !!to,
    staleTime: 5 * 60 * 1000, // 5分間キャッシュ
    retry: 1,
  });
};


