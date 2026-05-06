import { useQuery } from '@tanstack/react-query';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';

/**
 * vivid Phase 3: 改善ナレッジ業種別ベンチマーク取得フック
 *
 * `getImprovementBenchmarks` callable を呼び出し、
 * `industryMajor × businessModel × siteRole × category` セル単位の集計データを取得する。
 *
 * 管理画面 /admin/improvement-knowledge のマトリクス表示で使用。
 *
 * 全件読取（10,000件未満）なので、5分キャッシュで Firestore reads を抑える。
 *
 * @param {object} [filter] - 期間フィルタ
 * @param {number} [filter.periodMonths] - 直近Nヶ月のデータのみ集計（例: 6, 12, 24）
 * @param {string} [filter.startDate] - 開始日（ISO文字列、periodMonths と排他）
 * @param {string} [filter.endDate] - 終了日（ISO文字列、periodMonths と排他）
 * @param {object} [options] - TanStack Query のオプション
 * @returns {object} { data, isLoading, error, refetch, isFetching }
 *
 *  data: {
 *    cells: Array<BenchmarkCell>,
 *    totalDocs: number,
 *    computedAt: string (ISO),
 *    filter: { periodMonths, startDate, endDate }
 *  }
 *
 *  BenchmarkCell: {
 *    industryMajor: string,
 *    businessModel: string,
 *    siteRole: string,
 *    category: string,
 *    N: number,
 *    avgChangePercent: number | null,
 *    medianChangePercent: number | null,
 *    avgOverallScore: number | null,
 *    medianOverallScore: number | null,
 *    achievementLevels: { exceeded, met, partial, not_met },
 *    improvements: Array<{ id, summary, primaryMetric, changePercent, overallScore, achievementLevel }>
 *  }
 */
export function useImprovementBenchmarks(filter = {}, options = {}) {
  const { periodMonths, startDate, endDate } = filter;
  return useQuery({
    queryKey: ['improvement-benchmarks', periodMonths, startDate, endDate],
    queryFn: async () => {
      const callable = httpsCallable(functions, 'getImprovementBenchmarks');
      const payload = {};
      if (typeof periodMonths === 'number' && periodMonths > 0) {
        payload.periodMonths = periodMonths;
      } else if (startDate && endDate) {
        payload.startDate = startDate;
        payload.endDate = endDate;
      }
      const result = await callable(payload);
      if (!result.data?.success) {
        throw new Error('改善ナレッジベンチマーク取得失敗');
      }
      return result.data;
    },
    staleTime: 5 * 60 * 1000, // 5分（管理画面で頻繁に refetch しない）
    cacheTime: 30 * 60 * 1000, // 30分
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    ...options,
  });
}
