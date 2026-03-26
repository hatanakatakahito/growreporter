import { useState, useEffect, useCallback } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';

/**
 * ユーザー用サイト詳細取得フック（オーナーまたは同一アカウントメンバー）
 */
export function useSiteDetail(siteId) {
  const [siteDetail, setSiteDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSiteDetail = useCallback(async ({ silent = false } = {}) => {
    if (!siteId) {
      setLoading(false);
      return;
    }

    if (!silent) {
      setLoading(true);
    }
    setError(null);

    try {
      const getMySiteDetail = httpsCallable(functions, 'getMySiteDetail');
      const result = await getMySiteDetail({ siteId });

      if (result.data.success) {
        setSiteDetail(result.data.data);
      } else {
        throw new Error('サイト詳細の取得に失敗しました');
      }
    } catch (err) {
      console.error('[useSiteDetail] エラー:', err);
      setError(err.message || 'サイト詳細の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [siteId]);

  useEffect(() => {
    fetchSiteDetail();
  }, [fetchSiteDetail]);

  const refetch = useCallback(() => {
    fetchSiteDetail({ silent: true });
  }, [fetchSiteDetail]);

  return {
    siteDetail,
    loading,
    error,
    refetch,
  };
}
