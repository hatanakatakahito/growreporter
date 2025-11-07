import { useState, useEffect } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';

/**
 * アクティビティログを取得するカスタムフック
 * @param {Object} params - フィルタとページネーション設定
 */
export function useActivityLogs(params = {}) {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentParams, setCurrentParams] = useState({
    actionFilter: 'all',
    adminFilter: 'all',
    page: 1,
    limit: 50,
    ...params,
  });

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);

      const getActivityLogs = httpsCallable(functions, 'getActivityLogs');
      const result = await getActivityLogs(currentParams);

      if (result.data.success) {
        setLogs(result.data.data.logs);
        setPagination(result.data.data.pagination);
      } else {
        throw new Error('アクティビティログの取得に失敗しました');
      }
    } catch (err) {
      console.error('アクティビティログ取得エラー:', err);
      setError(err.message || 'アクティビティログの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [currentParams]);

  const setParams = (newParams) => {
    setCurrentParams(prev => ({
      ...prev,
      ...newParams,
    }));
  };

  return {
    logs,
    pagination,
    loading,
    error,
    refetch: fetchLogs,
    setParams,
    currentParams,
  };
}

