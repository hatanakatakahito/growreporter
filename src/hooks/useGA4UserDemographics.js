import { useQuery } from '@tanstack/react-query';
import { functions } from '../config/firebase';
import { httpsCallable } from 'firebase/functions';
import { format } from 'date-fns';

/**
 * GA4ユーザー属性データを取得するカスタムフック
 * @param {string} siteId - サイトID
 * @param {string|Date} from - 開始日 (YYYY-MM-DD形式の文字列またはDateオブジェクト)
 * @param {string|Date} to - 終了日 (YYYY-MM-DD形式の文字列またはDateオブジェクト)
 */
export const useGA4UserDemographics = (siteId, from, to) => {
  // 文字列形式に統一（既に文字列の場合はそのまま、Dateオブジェクトの場合はフォーマット）
  const startDate = typeof from === 'string' ? from : format(from, 'yyyy-MM-dd');
  const endDate = typeof to === 'string' ? to : format(to, 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['ga4-user-demographics', siteId, startDate, endDate],
    queryFn: async () => {
      if (!siteId || !startDate || !endDate) {
        throw new Error('siteId, from, and to are required');
      }

      const fetchGA4UserDemographics = httpsCallable(functions, 'fetchGA4UserDemographics');
      
      const result = await fetchGA4UserDemographics({
        siteId,
        startDate,
        endDate,
      });

      if (!result.data.success) {
        throw new Error(result.data.error || 'Failed to fetch user demographics');
      }

      return result.data.data;
    },
    enabled: !!siteId && !!startDate && !!endDate,
    staleTime: 5 * 60 * 1000, // 5分間キャッシュ
    retry: 1,
  });
};




