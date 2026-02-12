import { useState, useEffect, useCallback } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';

/**
 * 管理者管理フック
 */
export function useAdminManagement() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * 管理者一覧を取得
   */
  const fetchAdmins = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const getAdminsFunc = httpsCallable(functions, 'getAdminList');
      const result = await getAdminsFunc();

      if (result.data.success) {
        setAdmins(result.data.admins || []);
      } else {
        throw new Error('管理者一覧の取得に失敗しました');
      }
    } catch (err) {
      console.error('[useAdminManagement] エラー:', err);
      setError(err.message || '管理者一覧の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 管理者のロールを変更
   */
  const updateRole = useCallback(async (adminId, newRole, reason) => {
    try {
      const updateRoleFunc = httpsCallable(functions, 'updateAdminRole');
      const result = await updateRoleFunc({
        adminId,
        newRole,
        reason,
      });

      if (!result.data.success) {
        throw new Error('ロールの変更に失敗しました');
      }

      return result.data;
    } catch (err) {
      console.error('[useAdminManagement] ロール変更エラー:', err);
      throw err;
    }
  }, []);

  /**
   * 管理者を追加
   */
  const addAdmin = useCallback(async (email, role, reason) => {
    try {
      const addAdminFunc = httpsCallable(functions, 'addAdmin');
      const result = await addAdminFunc({
        email,
        role,
        reason,
      });

      if (!result.data.success) {
        throw new Error('管理者の追加に失敗しました');
      }

      return result.data;
    } catch (err) {
      console.error('[useAdminManagement] 管理者追加エラー:', err);
      throw err;
    }
  }, []);

  /**
   * 管理者を削除
   */
  const deleteAdmin = useCallback(async (adminId, reason) => {
    try {
      const deleteAdminFunc = httpsCallable(functions, 'deleteAdmin');
      const result = await deleteAdminFunc({
        adminId,
        reason,
      });

      if (!result.data.success) {
        throw new Error('管理者の削除に失敗しました');
      }

      return result.data;
    } catch (err) {
      console.error('[useAdminManagement] 管理者削除エラー:', err);
      throw err;
    }
  }, []);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  return {
    admins,
    loading,
    error,
    refetch: fetchAdmins,
    updateRole,
    addAdmin,
    deleteAdmin,
  };
}

