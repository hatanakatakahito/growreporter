import { QueryClient } from '@tanstack/react-query';

/**
 * TanStack Query の QueryClient 設定
 * 
 * キャッシュ戦略:
 * - staleTime: 1時間 - この時間内は再取得しない
 * - cacheTime: 24時間 - キャッシュを保持する時間
 * - refetchOnWindowFocus: false - ウィンドウフォーカス時に再取得しない
 * - refetchOnMount: false - マウント時に再取得しない
 * - retry: 2 - 失敗時に2回リトライ
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // キャッシュ設定
      staleTime: 60 * 60 * 1000, // 1時間
      cacheTime: 24 * 60 * 60 * 1000, // 24時間
      
      // 再取得設定
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
      
      // リトライ設定
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      
      // エラーハンドリング
      onError: (error) => {
        console.error('[QueryClient] Query error:', error);
      },
    },
    mutations: {
      // ミューテーションのリトライ設定
      retry: 1,
      
      // エラーハンドリング
      onError: (error) => {
        console.error('[QueryClient] Mutation error:', error);
      },
    },
  },
});




