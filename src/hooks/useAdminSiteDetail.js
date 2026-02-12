import { useState, useEffect, useCallback } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';

/**
 * 管理者用サイト詳細取得フック
 */
export function useAdminSiteDetail(siteId) {
  const [siteDetail, setSiteDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSiteDetail = useCallback(async () => {
    if (!siteId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const getSiteDetail = httpsCallable(functions, 'getSiteDetail');
      const result = await getSiteDetail({ siteId });

      if (result.data.success) {
        setSiteDetail(result.data.data);
      } else {
        throw new Error('サイト詳細の取得に失敗しました');
      }
    } catch (err) {
      console.error('[useAdminSiteDetail] エラー:', err);
      setError(err.message || 'サイト詳細の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [siteId]);

  useEffect(() => {
    fetchSiteDetail();
  }, [fetchSiteDetail]);

  const refetch = useCallback(() => {
    fetchSiteDetail();
  }, [fetchSiteDetail]);

  return {
    siteDetail,
    loading,
    error,
    refetch,
  };
}

