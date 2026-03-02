import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, getDocs, query, where, doc, getDoc, updateDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../config/firebase';
import toast from 'react-hot-toast';

/**
 * サイトのヒートマップページ一覧を取得
 * @param {string} siteId
 * @param {'pc'|'mobile'} device
 */
export function useHeatmapPages(siteId, device) {
  return useQuery({
    queryKey: ['heatmap-pages', siteId, device],
    queryFn: async () => {
      const ref = collection(db, 'sites', siteId, 'heatmapPages');
      const q = query(ref, where('device', '==', device));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
    },
    enabled: !!siteId && !!device,
    staleTime: 60 * 1000,
  });
}

/**
 * 特定ページのヒートマップデータを取得（ID 指定）
 * 親ドキュメント（累積データ + スクリーンショット情報）を返す
 * @param {string} siteId
 * @param {string} pageDocId - heatmapPages ドキュメント ID
 */
export function useHeatmapPageData(siteId, pageDocId) {
  return useQuery({
    queryKey: ['heatmap-page-data', siteId, pageDocId],
    queryFn: async () => {
      const docRef = doc(db, 'sites', siteId, 'heatmapPages', pageDocId);
      const snapshot = await getDoc(docRef);
      if (!snapshot.exists()) return null;
      return { id: snapshot.id, ...snapshot.data() };
    },
    enabled: !!siteId && !!pageDocId,
    staleTime: 60 * 1000,
  });
}

/**
 * 日付範囲でフィルタリングしたヒートマップデータを取得
 * daily サブコレクションを集約して返す
 * @param {string} siteId
 * @param {string} pageDocId
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate - YYYY-MM-DD
 */
export function useHeatmapDailyData(siteId, pageDocId, startDate, endDate) {
  return useQuery({
    queryKey: ['heatmap-daily-data', siteId, pageDocId, startDate, endDate],
    queryFn: async () => {
      const dailyRef = collection(db, 'sites', siteId, 'heatmapPages', pageDocId, 'daily');
      const q = query(
        dailyRef,
        where('date', '>=', startDate),
        where('date', '<=', endDate)
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) return null; // 日別データなし → 累積データにフォールバック

      // 日別データを集約
      const aggregated = {
        clickGrid: {},
        scrollReach: {},
        totalClicks: 0,
        totalSessions: 0,
        avgPageHeight: 0,
      };

      let pageHeightSum = 0;
      let pageHeightCount = 0;

      snapshot.docs.forEach((d) => {
        const data = d.data();

        // totalClicks / totalSessions を合算
        aggregated.totalClicks += data.totalClicks || 0;
        aggregated.totalSessions += data.totalSessions || 0;

        // avgPageHeight の加重平均用
        if (data.avgPageHeight) {
          pageHeightSum += data.avgPageHeight;
          pageHeightCount += 1;
        }

        // clickGrid を合算
        if (data.clickGrid) {
          for (const [key, val] of Object.entries(data.clickGrid)) {
            aggregated.clickGrid[key] = (aggregated.clickGrid[key] || 0) + val;
          }
        }

        // scrollReach を合算
        if (data.scrollReach) {
          for (const [key, val] of Object.entries(data.scrollReach)) {
            aggregated.scrollReach[key] = (aggregated.scrollReach[key] || 0) + val;
          }
        }
      });

      aggregated.avgPageHeight = pageHeightCount > 0
        ? Math.round(pageHeightSum / pageHeightCount)
        : 0;

      return aggregated;
    },
    enabled: !!siteId && !!pageDocId && !!startDate && !!endDate,
    staleTime: 60 * 1000,
  });
}

/**
 * サイトのヒートマップPV使用量を取得
 * @param {string} siteId
 */
export function useHeatmapPvUsage(siteId) {
  return useQuery({
    queryKey: ['heatmap-pv-usage', siteId],
    queryFn: async () => {
      const docRef = doc(db, 'sites', siteId);
      const snapshot = await getDoc(docRef);
      if (!snapshot.exists()) return { pvUsage: 0, samplingRate: 1.0 };
      const data = snapshot.data();
      return {
        pvUsage: data.heatmapPvUsage || 0,
        samplingRate: data.heatmapSamplingRate ?? 1.0,
      };
    },
    enabled: !!siteId,
    staleTime: 60 * 1000,
  });
}

/**
 * ヒートマップサンプリングレートを更新
 */
export function useUpdateHeatmapSamplingRate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ siteId, samplingRate }) => {
      const siteRef = doc(db, 'sites', siteId);
      await updateDoc(siteRef, { heatmapSamplingRate: samplingRate });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['heatmap-pv-usage', variables.siteId],
      });
      toast.success('サンプリングレートを更新しました');
    },
    onError: (err) => {
      toast.error(err.message || 'サンプリングレートの更新に失敗しました');
    },
  });
}

/**
 * ヒートマップ用スクリーンショットキャプチャ
 */
export function useCaptureHeatmapScreenshot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ siteId, pageUrl, deviceType }) => {
      const capture = httpsCallable(functions, 'captureHeatmapScreenshot', { timeout: 60_000 });
      const result = await capture({ siteId, pageUrl, deviceType });
      return result.data;
    },
    onSuccess: (_, variables) => {
      // キャプチャ後にページデータを再取得
      queryClient.invalidateQueries({
        queryKey: ['heatmap-pages', variables.siteId],
      });
      queryClient.invalidateQueries({
        queryKey: ['heatmap-page-data', variables.siteId],
      });
    },
  });
}
