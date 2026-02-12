import { QueryClient } from '@tanstack/react-query';

/**
 * TanStack Query の QueryClient 設定
 * 
 * キャッシュ戦略（パフォーマンス最適化）:
 * - staleTime: 5分 - GA4/GSCデータは頻繁に変わらないため5分キャッシュ
 * - cacheTime: 30分 - メモリ効率とパフォーマンスのバランス
 * - refetchOnWindowFocus: false - タブ切り替え時の不要な再取得を防止
 * - refetchOnMount: false - マウント時の不要な再取得を防止
 * - retry: 2 - ネットワークエラー時に2回リトライ
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // キャッシュ設定（最適化済み）
      staleTime: 5 * 60 * 1000, // 5分（GA4/GSCデータは頻繁に変わらない）
      cacheTime: 30 * 60 * 1000, // 30分（メモリ効率重視）
      
      // 再取得設定（パフォーマンス優先）
      refetchOnWindowFocus: false, // タブ切り替え時に再取得しない
      refetchOnMount: false, // マウント時に再取得しない（キャッシュ優先）
      refetchOnReconnect: false, // 再接続時に再取得しない
      
      // リトライ設定（安定性向上）
      retry: 2, // 2回リトライ
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // 指数バックオフ
      
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




