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
      const getSiteDetail = httpsCallable(functions, 'getSiteDetail');
      const result = await getSiteDetail({ siteId });

      if (result.data.success) {
        const data = result.data.data;
        if (process.env.NODE_ENV !== 'production') {
          console.log('[useAdminSiteDetail] API返却', {
            industry: data?.industry,
            sitePurpose: data?.sitePurpose,
            rawDataKeys: data ? Object.keys(data) : [],
          });
        }
        setSiteDetail(data);
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
    fetchSiteDetail({ silent: true });
  }, [fetchSiteDetail]);

  return {
    siteDetail,
    loading,
    error,
    refetch,
  };
}

