import { useState, useEffect, useCallback } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';

/**
 * 管理者用サイト一覧取得フック
 */
export function useAdminSites() {
  const [sites, setSites] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentParams, setCurrentParams] = useState({
    searchQuery: '',
    userFilter: '',
    page: 1,
    limit: 20,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  const fetchSites = useCallback(async (params) => {
    setLoading(true);
    setError(null);

    try {
      const getAdminSites = httpsCallable(functions, 'getAdminSites');
      const result = await getAdminSites(params);

      if (result.data.success) {
        setSites(result.data.data.sites);
        setPagination(result.data.data.pagination);
        setStats(result.data.data.stats);
      } else {
        throw new Error('サイト一覧の取得に失敗しました');
      }
    } catch (err) {
      console.error('[useAdminSites] エラー:', err);
      setError(err.message || 'サイト一覧の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, []);

  // パラメータ変更
  const setParams = useCallback((newParams) => {
    setCurrentParams((prev) => ({
      ...prev,
      ...newParams,
    }));
  }, []);

  // 初回 & パラメータ変更時にデータ取得
  useEffect(() => {
    fetchSites(currentParams);
  }, [currentParams, fetchSites]);

  // 手動リフレッシュ
  const refetch = useCallback(() => {
    fetchSites(currentParams);
  }, [currentParams, fetchSites]);

  return {
    sites,
    pagination,
    stats,
    loading,
    error,
    refetch,
    setParams,
    currentParams,
  };
}

