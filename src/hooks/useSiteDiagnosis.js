import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';

/**
 * サイト診断データを管理するカスタムフック
 * - キャッシュ確認（自動、cacheOnly: true）
 * - 診断実行（ユーザー操作、cacheOnly: false）
 */
export function useSiteDiagnosis(siteId) {
  const queryClient = useQueryClient();

  // キャッシュ確認用Query（ページ表示時に自動実行）
  const cachedQuery = useQuery({
    queryKey: ['site-diagnosis-cache', siteId],
    queryFn: async () => {
      const runDiagnosis = httpsCallable(functions, 'runSiteDiagnosis');
      const result = await runDiagnosis({ siteId, cacheOnly: true });
      // cached: false の場合はnullとして扱う
      if (result.data?.cached === false) return null;
      return result.data;
    },
    enabled: !!siteId,
    staleTime: 24 * 60 * 60 * 1000, // 24時間
  });

  // 診断実行Mutation（ユーザー操作で発火）
  const runMutation = useMutation({
    mutationFn: async ({ forceRefresh = false } = {}) => {
      const runDiagnosis = httpsCallable(functions, 'runSiteDiagnosis');
      const result = await runDiagnosis({ siteId, cacheOnly: false, forceRefresh });
      return result.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['site-diagnosis-cache', siteId], data);
    },
  });

  return {
    data: cachedQuery.data,
    isLoading: cachedQuery.isLoading,
    runDiagnosis: runMutation.mutate,
    isRunning: runMutation.isPending,
    runError: runMutation.error,
  };
}
