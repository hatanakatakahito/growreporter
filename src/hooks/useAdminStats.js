import { useState, useEffect } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';

/**
 * 管理者統計データ取得フック
 * @returns {Object} { stats, loading, error, refetch }
 */
export function useAdminStats() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);

    try {
      const getAdminStats = httpsCallable(functions, 'getAdminStats');
      const result = await getAdminStats();

      if (result.data.success) {
        setStats(result.data.data);
      } else {
        throw new Error('統計データの取得に失敗しました');
      }
    } catch (err) {
      console.error('統計データ取得エラー:', err);
      setError(err.message || '統計データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return { stats, loading, error, refetch: fetchStats };
}

