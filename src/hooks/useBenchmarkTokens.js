import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';

/**
 * lively-aggregating-bobcat: ベンチマーク用 OAuth トークン管理フック
 *
 * - listBenchmarkTokens: 一覧取得
 * - getBenchmarkOAuthUrl: 認可URL生成（追加・再認証用）
 * - testBenchmarkToken: 疎通確認
 * - revokeBenchmarkToken: 無効化
 *
 * exchangeBenchmarkOAuthCode は OAuth callback ページで直接呼び出すため、
 * mutation hook は提供しない（直接 httpsCallable で呼ぶ）
 */

export function useBenchmarkTokens() {
  return useQuery({
    queryKey: ['benchmark-tokens'],
    queryFn: async () => {
      const callable = httpsCallable(functions, 'listBenchmarkTokens');
      const result = await callable();
      if (!result.data?.success) throw new Error('トークン一覧取得失敗');
      return result.data.tokens;
    },
    staleTime: 60 * 1000, // 1分（トークン状態は頻繁に refetch しない）
    refetchOnWindowFocus: false,
  });
}

export function useGetBenchmarkOAuthUrl() {
  return useMutation({
    mutationFn: async ({ redirectUri, email }) => {
      const callable = httpsCallable(functions, 'getBenchmarkOAuthUrl');
      const result = await callable({ redirectUri, email });
      if (!result.data?.authUrl) throw new Error('認可URL取得失敗');
      return result.data.authUrl;
    },
  });
}

export function useTestBenchmarkToken() {
  return useMutation({
    mutationFn: async (email) => {
      const callable = httpsCallable(functions, 'testBenchmarkToken');
      const result = await callable({ email });
      return result.data;
    },
  });
}

export function useRevokeBenchmarkToken() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (email) => {
      const callable = httpsCallable(functions, 'revokeBenchmarkToken');
      const result = await callable({ email });
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['benchmark-tokens'] });
    },
  });
}
