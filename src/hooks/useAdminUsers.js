import { useState, useEffect, useCallback } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';

/**
 * 管理者用ユーザー一覧取得フック
 * @param {Object} params - クエリパラメータ
 * @returns {Object} { users, pagination, loading, error, refetch, setParams }
 */
export function useAdminUsers(initialParams = {}) {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [params, setParams] = useState({
    searchQuery: '',
    planFilter: 'all',
    page: 1,
    limit: 20,
    sortBy: 'createdAt',
    sortOrder: 'desc',
    ...initialParams,
  });

  const fetchUsers = useCallback(async (queryParams) => {
    setLoading(true);
    setError(null);

    try {
      const getAdminUsers = httpsCallable(functions, 'getAdminUsers');
      const result = await getAdminUsers(queryParams);

      if (result.data.success) {
        setUsers(result.data.data.users);
        setPagination(result.data.data.pagination);
      } else {
        throw new Error('ユーザー一覧の取得に失敗しました');
      }
    } catch (err) {
      console.error('ユーザー一覧取得エラー:', err);
      setError(err.message || 'ユーザー一覧の取得に失敗しました');
      setUsers([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers(params);
  }, [params, fetchUsers]);

  const refetch = useCallback(() => {
    fetchUsers(params);
  }, [params, fetchUsers]);

  const updateParams = useCallback((newParams) => {
    setParams((prev) => ({ ...prev, ...newParams }));
  }, []);

  return {
    users,
    pagination,
    loading,
    error,
    refetch,
    setParams: updateParams,
    currentParams: params,
  };
}

