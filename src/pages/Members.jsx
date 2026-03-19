import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAccountMembers } from '../hooks/useAccountMembers';
import { usePlan } from '../hooks/usePlan';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';
import InviteMemberModal from '../components/Members/InviteMemberModal';
import TransferOwnershipModal from '../components/Members/TransferOwnershipModal';
import { Link } from 'react-router-dom';
import { setPageTitle } from '../utils/pageTitle';
import { Button } from '@/components/ui/button';

/**
 * メンバー管理画面
 */
export default function Members() {
  const { userProfile } = useAuth();
  const { 
    combinedList, 
    activeMemberCount, 
    myRole, 
    isOwner, 
    loading,
    refetch,
  } = useAccountMembers();
  const { plan, checkCanInviteMember, getMaxMembers } = usePlan();
  
  useEffect(() => { setPageTitle('メンバー管理'); }, []);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const maxMembers = getMaxMembers();
  const canInvite = checkCanInviteMember(activeMemberCount);

  /**
   * 招待を再送信
   */
  const handleResendInvitation = async (invitationId) => {
    if (!confirm('招待メールを再送信しますか？')) return;
    
    setIsProcessing(true);
    try {
      const resendInvitation = httpsCallable(functions, 'resendInvitation');
      const result = await resendInvitation({ invitationId });
      
      if (result.data.success) {
        alert('招待メールを再送信しました');
        refetch?.();
      }
    } catch (error) {
      console.error('Error resending invitation:', error);
      alert(`エラー: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * 招待を取り消し（削除）
   */
  const handleCancelInvitation = async (invitationId, email) => {
    if (!confirm(`${email} への招待を取り消しますか？\n取り消すと、招待リンクは無効になります。`)) return;
    
    setIsProcessing(true);
    try {
      const cancelInvitation = httpsCallable(functions, 'cancelInvitation');
      const result = await cancelInvitation({ invitationId });
      
      if (result.data.success) {
        alert('招待を取り消しました');
        refetch?.();
      }
    } catch (error) {
      console.error('Error cancelling invitation:', error);
      alert(`エラー: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * メンバーを削除
   */
  const handleRemoveMember = async (memberId, memberName) => {
    if (!confirm(`${memberName} さんをメンバーから削除しますか？`)) return;
    
    setIsProcessing(true);
    try {
      const removeMember = httpsCallable(functions, 'removeMember');
      const result = await removeMember({ userId: memberId });
      
      if (result.data.success) {
        alert('メンバーを削除しました');
        refetch?.();
      }
    } catch (error) {
      console.error('Error removing member:', error);
      alert(`エラー: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };


  /**
   * オーナー譲渡モーダルを開く
   */
  const handleOpenTransferModal = (member) => {
    setSelectedMember(member);
    setShowTransferModal(true);
  };

  /**
   * 権限のバッジ色を取得
   */
  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'owner':
        return 'bg-primary/20 text-primary';
      case 'editor':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  /**
   * 権限の表示名を取得
   */
  const getRoleDisplayName = (role) => {
    switch (role) {
      case 'owner':
        return 'オーナー';
      case 'editor':
        return '編集者';
      case 'viewer':
        return '閲覧者';
      default:
        return role;
    }
  };

  /**
   * ステータスのバッジ色を取得
   */
  const getStatusBadgeColor = (item) => {
    if (item.type === 'member') {
      return 'bg-green-100 text-green-800';
    }
    if (item.isExpired) {
      return 'bg-gray-100 text-gray-800';
    }
    return 'bg-yellow-100 text-yellow-800';
  };

  /**
   * ステータスの表示名を取得
   */
  const getStatusDisplayName = (item) => {
    if (item.type === 'member') {
      return 'アクティブ';
    }
    if (item.isExpired) {
      return '期限切れ';
    }
    return '保留中';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0">
      <div className="w-full !max-w-[1400px] mx-auto px-6 py-10 box-border" style={{ maxWidth: '1400px' }}>
      {/* ヘッダー */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">メンバー管理</h1>
            <p className="mt-2 text-sm text-gray-600">
              アカウントのメンバーを管理します
            </p>
          </div>
          
          {isOwner && (
            <Button
              color="blue"
              onClick={() => setShowInviteModal(true)}
              disabled={!canInvite || isProcessing}
            >
              メンバーを招待
            </Button>
          )}
        </div>

        {/* 自分の権限表示 */}
        <div className="mt-4 inline-flex items-center px-3 py-1 rounded-full bg-primary/10 border border-primary/30">
          <span className="text-sm text-primary">
            あなたの権限: <strong>{getRoleDisplayName(myRole)}</strong>
          </span>
        </div>

        {/* メンバー数表示 */}
        <div className="mt-4 flex items-center gap-4">
          <div className="text-sm text-gray-600">
            <span className="font-semibold text-gray-900">{activeMemberCount}</span>
            <span> / {maxMembers}人使用中</span>
          </div>
          
          {!canInvite && isOwner && (
            <Link
              to="/account/plan"
              className="text-sm text-primary hover:opacity-80 underline"
            >
              プランをアップグレード
            </Link>
          )}
        </div>
      </div>

      {/* メンバー一覧 */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                メンバー
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                権限
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ステータス
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                招待日時
              </th>
              {isOwner && (
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {combinedList.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 bg-primary/20 rounded-full flex items-center justify-center">
                      <span className="text-primary font-medium">
                        {item.displayName?.[0] || item.email?.[0] || '?'}
                      </span>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {item.displayName || item.email}
                        {item.userId === userProfile?.uid && (
                          <span className="ml-2 text-xs text-gray-500">(あなた)</span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">{item.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadgeColor(item.role)}`}>
                    {getRoleDisplayName(item.role)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(item)}`}>
                    {getStatusDisplayName(item)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {item.invitedAt?.toDate?.().toLocaleDateString('ja-JP') || '-'}
                </td>
                {isOwner && (
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      {/* 招待: 再送信・取り消し */}
                      {item.type === 'invitation' && !item.isExpired && (
                        <>
                          <button
                            onClick={() => handleResendInvitation(item.id)}
                            disabled={isProcessing}
                            className="text-primary hover:opacity-80 disabled:text-gray-400"
                          >
                            再送信
                          </button>
                          <span className="text-gray-300">|</span>
                          <button
                            onClick={() => handleCancelInvitation(item.id, item.email)}
                            disabled={isProcessing}
                            className="text-red-600 hover:text-red-800 disabled:text-gray-400"
                          >
                            招待を取り消す
                          </button>
                        </>
                      )}
                      
                      {/* オーナー譲渡ボタン */}
                      {item.type === 'member' && item.role !== 'owner' && (
                        <button
                          onClick={() => handleOpenTransferModal(item)}
                          disabled={isProcessing}
                          className="text-green-600 hover:text-green-900 disabled:text-gray-400"
                        >
                          オーナー譲渡
                        </button>
                      )}
                      
                      {/* 削除ボタン */}
                      {item.type === 'member' && item.role !== 'owner' && (
                        <button
                          onClick={() => handleRemoveMember(item.id, item.displayName)}
                          disabled={isProcessing}
                          className="text-red-600 hover:text-red-900 disabled:text-gray-400"
                        >
                          削除
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
            
            {combinedList.length === 0 && (
              <tr>
                <td colSpan={isOwner ? 5 : 4} className="px-6 py-8 text-center text-gray-500">
                  メンバーがいません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* プラン情報 */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-blue-800">
              現在のプラン: {plan.displayName}
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>最大メンバー数: {maxMembers}人（オーナー含む）</p>
              <p className="mt-1">AI生成回数はアカウント全体で共有されます</p>
              {combinedList.some((item) => item.type === 'invitation' && !item.isExpired) && (
                <p className="mt-2 pt-2 border-t border-blue-200">
                  承認メールが届かない場合は、迷惑メールフォルダをご確認いただくか、上記一覧の「再送信」から再度送信してください。
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* モーダル */}
      {showInviteModal && (
        <InviteMemberModal
          onClose={() => { setShowInviteModal(false); refetch?.(); }}
          currentMemberCount={activeMemberCount}
          maxMembers={maxMembers}
        />
      )}

      {showTransferModal && selectedMember && (
        <TransferOwnershipModal
          member={selectedMember}
          onClose={() => {
            setShowTransferModal(false);
            setSelectedMember(null);
            refetch?.();
          }}
        />
      )}
      </div>
    </div>
  );
}
