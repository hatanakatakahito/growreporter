import { useState, useEffect, useCallback } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';

/**
 * プラン設定管理フック
 */
export function usePlanConfig() {
  const [planConfig, setPlanConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * プラン設定を取得
   */
  const fetchPlanConfig = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const getPlanConfigFunc = httpsCallable(functions, 'getPlanConfig');
      const result = await getPlanConfigFunc();

      if (result.data.success) {
        setPlanConfig(result.data.config || {});
      } else {
        throw new Error('プラン設定の取得に失敗しました');
      }
    } catch (err) {
      console.error('[usePlanConfig] エラー:', err);
      setError(err.message || 'プラン設定の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * プラン設定を更新
   */
  const updateConfig = useCallback(async (newConfig, reason) => {
    try {
      const updatePlanConfigFunc = httpsCallable(functions, 'updatePlanConfig');
      const result = await updatePlanConfigFunc({
        config: newConfig,
        reason,
      });

      if (!result.data.success) {
        throw new Error('プラン設定の更新に失敗しました');
      }

      return result.data;
    } catch (err) {
      console.error('[usePlanConfig] 更新エラー:', err);
      throw err;
    }
  }, []);

  useEffect(() => {
    fetchPlanConfig();
  }, [fetchPlanConfig]);

  return {
    planConfig,
    loading,
    error,
    refetch: fetchPlanConfig,
    updateConfig,
  };
}

