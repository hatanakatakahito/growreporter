import { useState, useEffect } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';

/**
 * ユーザー詳細を取得するカスタムフック
 * @param {string} uid - ユーザーID
 */
export function useAdminUserDetail(uid) {
  const [userDetail, setUserDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchUserDetail = async () => {
    if (!uid) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const getUserDetail = httpsCallable(functions, 'getUserDetail');
      const result = await getUserDetail({ uid });

      if (result.data.success) {
        setUserDetail(result.data.data);
      } else {
        throw new Error('ユーザー詳細の取得に失敗しました');
      }
    } catch (err) {
      console.error('ユーザー詳細取得エラー:', err);
      setError(err.message || 'ユーザー詳細の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserDetail();
  }, [uid]);

  return {
    userDetail,
    loading,
    error,
    refetch: fetchUserDetail,
  };
}

