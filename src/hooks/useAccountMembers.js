import { useState, useEffect, useCallback } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';

/**
 * アカウントメンバー管理のカスタムフック
 * onSnapshot は Firestore SDK の内部状態エラーを招くことがあるため、getDocs + refetch で取得
 *
 * @returns {Object} メンバー情報と操作関数
 */
export function useAccountMembers() {
  const { userProfile } = useAuth();
  const [members, setMembers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMembersAndInvitations = useCallback(async () => {
    if (!userProfile) {
      setMembers([]);
      setInvitations([]);
      setLoading(false);
      return;
    }

    setError(null);
    setLoading(true);

    try {
      // Cloud Function を呼び出してメンバー一覧を取得
      const getAccountMembersFunc = httpsCallable(functions, 'getAccountMembers');
      const result = await getAccountMembersFunc();
      
      if (result.data.success) {
        // Timestamp を Date に変換
        const membersData = result.data.members.map(member => ({
          ...member,
          joinedAt: member.joinedAt ? new Date(member.joinedAt._seconds * 1000) : null
        }));
        
        const invitationsData = result.data.invitations.map(invitation => ({
          ...invitation,
          createdAt: invitation.createdAt ? new Date(invitation.createdAt._seconds * 1000) : null,
          expiresAt: invitation.expiresAt ? new Date(invitation.expiresAt._seconds * 1000) : null
        }));
        
        setMembers(membersData);
        setInvitations(invitationsData);
      } else {
        throw new Error(result.data.message || 'メンバー情報の取得に失敗しました');
      }
    } catch (err) {
      console.error('Error fetching members/invitations:', err);
      setError(err.message || 'メンバー情報の取得に失敗しました');
      setMembers([]);
      setInvitations([]);
    } finally {
      setLoading(false);
    }
  }, [userProfile]);

  useEffect(() => {
    fetchMembersAndInvitations();
  }, [fetchMembersAndInvitations]);

  /**
   * メンバーと招待を統合したリストを取得
   * @returns {Array} 統合リスト
   */
  const getCombinedList = () => {
    return [...members, ...invitations].sort((a, b) => {
      if (a.role === 'owner') return -1;
      if (b.role === 'owner') return 1;
      if (a.type === 'member' && b.type === 'invitation') return -1;
      if (a.type === 'invitation' && b.type === 'member') return 1;
      const aTime = a.createdAt?.toDate?.() || new Date(0);
      const bTime = b.createdAt?.toDate?.() || new Date(0);
      return bTime - aTime;
    });
  };

  const getActiveMemberCount = () => members.length;
  const getPendingInvitationCount = () => invitations.filter((inv) => !inv.isExpired).length;
  const getMyRole = () => {
    if (!userProfile) return 'owner';
    const myUid = userProfile.uid;
    const accountOwnerId = userProfile.accountOwnerId;

    // accountOwnerId が自分以外 → 招待メンバー: memberships から正確な権限を取得
    if (accountOwnerId && accountOwnerId !== myUid) {
      const memberships = userProfile.memberships || {};
      if (memberships[accountOwnerId]?.role) {
        return memberships[accountOwnerId].role;
      }
      return userProfile.memberRole || 'viewer';
    }

    return 'owner';
  };
  const isOwner = () => getMyRole() === 'owner';
  const isEditor = () => getMyRole() === 'editor';
  const isViewer = () => getMyRole() === 'viewer';

  return {
    members,
    invitations,
    combinedList: getCombinedList(),
    activeMemberCount: getActiveMemberCount(),
    pendingInvitationCount: getPendingInvitationCount(),
    myRole: getMyRole(),
    isOwner: isOwner(),
    isEditor: isEditor(),
    isViewer: isViewer(),
    loading,
    error,
    refetch: fetchMembersAndInvitations,
  };
}
