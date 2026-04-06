import { useState, useEffect, useCallback } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';

/**
 * 管理者用問い合わせ一覧取得フック
 */
export function useAdminInquiries(initialParams = {}) {
  const [inquiries, setInquiries] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [stats, setStats] = useState({ needsAction: 0, renewalSoon: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [params, setParams] = useState({
    searchQuery: '',
    statusFilter: 'all',
    page: 1,
    limit: 20,
    ...initialParams,
  });

  const fetchInquiries = useCallback(async (queryParams) => {
    setLoading(true);
    setError(null);

    try {
      const getUpgradeInquiries = httpsCallable(functions, 'getUpgradeInquiries');
      const result = await getUpgradeInquiries(queryParams);

      if (result.data.success) {
        setInquiries(result.data.data.inquiries);
        setPagination(result.data.data.pagination);
        setStats(result.data.data.stats || { needsAction: 0, renewalSoon: 0 });
      } else {
        throw new Error('問い合わせ一覧の取得に失敗しました');
      }
    } catch (err) {
      console.error('問い合わせ一覧取得エラー:', err);
      const message = err.details ?? err.message ?? '問い合わせ一覧の取得に失敗しました';
      setError(typeof message === 'string' ? message : '問い合わせ一覧の取得に失敗しました');
      setInquiries([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInquiries(params);
  }, [params, fetchInquiries]);

  const refetch = useCallback(() => {
    fetchInquiries(params);
  }, [params, fetchInquiries]);

  const updateParams = useCallback((newParams) => {
    setParams((prev) => ({ ...prev, ...newParams }));
  }, []);

  return {
    inquiries,
    pagination,
    stats,
    loading,
    error,
    refetch,
    setParams: updateParams,
    currentParams: params,
  };
}
