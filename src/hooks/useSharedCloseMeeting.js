import { useQuery } from '@tanstack/react-query';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';

/**
 * 共有リンク用の公開データ取得（ログイン不要）。
 * getSharedCloseMeeting callable（認証チェックなし）を呼び、確定保存された snapshot を返す。
 */
export function useSharedCloseMeeting(token) {
  return useQuery({
    queryKey: ['shared-close-meeting', token],
    queryFn: async () => {
      const fn = httpsCallable(functions, 'getSharedCloseMeeting');
      const result = await fn({ token });
      return result.data;
    },
    enabled: !!token,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}
