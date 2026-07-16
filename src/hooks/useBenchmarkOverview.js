import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';

/**
 * lively-aggregating-bobcat: 業界ベンチマーク管理ダッシュボード用フック
 */

export function useBenchmarkOverview() {
  return useQuery({
    queryKey: ['benchmark-overview'],
    queryFn: async () => {
      const callable = httpsCallable(functions, 'getBenchmarkOverview');
      const result = await callable();
      if (!result.data?.success) throw new Error('概況取得失敗');
      return result.data;
    },
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

/**
 * benchmarkAggregator を手動実行（admin only）
 * 月次バッチを待たずに即実行する用途。
 */
export function useTriggerBenchmarkAggregator() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const callable = httpsCallable(functions, 'triggerBenchmarkAggregator');
      const result = await callable();
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['benchmark-overview'] });
      queryClient.invalidateQueries({ queryKey: ['benchmark-tokens'] });
      queryClient.invalidateQueries({ queryKey: ['improvement-benchmarks'] });
    },
  });
}

/**
 * aiAnalysisCache を全削除（vivid Phase 2 デプロイ後の混在解消用）
 */
export function useClearAllAICache() {
  return useMutation({
    mutationFn: async () => {
      const callable = httpsCallable(functions, 'clearAllAICache');
      const result = await callable();
      return result.data;
    },
  });
}
