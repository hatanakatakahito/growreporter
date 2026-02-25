import { useState, useEffect } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';

/**
 * アクティビティログ取得フック
 */
export function useActivityLogs() {
  const [logs, setLogs] = useState(null);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [params, setParams] = useState({
    page: 1,
    limit: 50,
    searchQuery: '',
    actionType: undefined,
  });
  const [triggerFetch, setTriggerFetch] = useState(0);

  useEffect(() => {
    let mounted = true;

    const fetchLogs = async () => {
      setLoading(true);
      setError(null);

      try {
        const getActivityLogs = httpsCallable(functions, 'getActivityLogs');
        
        const result = await getActivityLogs({
          page: params.page,
          limit: params.limit,
          searchQuery: params.searchQuery || undefined,
          actionType: params.actionType,
        });

        if (!mounted) return;

        if (result.data.success) {
          setLogs(result.data.logs);
          setPagination(result.data.pagination);
        } else {
          setError(result.data.message || 'ログの取得に失敗しました');
        }
      } catch (err) {
        if (!mounted) return;
        console.error('Activity logs fetch error:', err);
        setError(err.message || 'ログの取得に失敗しました');
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchLogs();

    return () => {
      mounted = false;
    };
  }, [params.page, params.limit, params.searchQuery, params.actionType, triggerFetch]);

  const refetch = () => {
    setTriggerFetch(prev => prev + 1);
  };

  const updateParams = (newParams) => {
    setParams(prev => ({ ...prev, ...newParams }));
  };

  return {
    logs,
    pagination,
    loading,
    error,
    refetch,
    setParams: updateParams,
    currentParams: params,
  };
}
