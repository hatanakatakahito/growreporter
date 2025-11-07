import { useState, useCallback } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';

/**
 * 個別制限管理フック
 */
export function useCustomLimits() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * 個別制限を取得
   */
  const getCustomLimits = useCallback(async (userId) => {
    setLoading(true);
    setError(null);

    try {
      const getCustomLimitsFunc = httpsCallable(functions, 'getCustomLimits');
      const result = await getCustomLimitsFunc({ userId });

      if (result.data.success) {
        return result.data.data;
      } else {
        throw new Error('個別制限の取得に失敗しました');
      }
    } catch (err) {
      console.error('[useCustomLimits] エラー:', err);
      setError(err.message || '個別制限の取得に失敗しました');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 個別制限を設定
   */
  const setCustomLimits = useCallback(async (userId, limits, validUntil, reason) => {
    setLoading(true);
    setError(null);

    try {
      const setCustomLimitsFunc = httpsCallable(functions, 'setCustomLimits');
      const result = await setCustomLimitsFunc({
        userId,
        limits,
        validUntil,
        reason,
      });

      if (result.data.success) {
        return result.data;
      } else {
        throw new Error('個別制限の設定に失敗しました');
      }
    } catch (err) {
      console.error('[useCustomLimits] エラー:', err);
      setError(err.message || '個別制限の設定に失敗しました');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 個別制限を削除
   */
  const removeCustomLimits = useCallback(async (userId, reason) => {
    setLoading(true);
    setError(null);

    try {
      const removeCustomLimitsFunc = httpsCallable(functions, 'removeCustomLimits');
      const result = await removeCustomLimitsFunc({
        userId,
        reason,
      });

      if (result.data.success) {
        return result.data;
      } else {
        throw new Error('個別制限の削除に失敗しました');
      }
    } catch (err) {
      console.error('[useCustomLimits] エラー:', err);
      setError(err.message || '個別制限の削除に失敗しました');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    getCustomLimits,
    setCustomLimits,
    removeCustomLimits,
  };
}

