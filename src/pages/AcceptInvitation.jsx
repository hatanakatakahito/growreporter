import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';
import { setPageTitle } from '../utils/pageTitle';

/**
 * 招待承認画面
 */
export default function AcceptInvitation() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentUser } = useAuth();
  
  const [invitation, setInvitation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAccepting, setIsAccepting] = useState(false);

  const token = searchParams.get('token');

  useEffect(() => { setPageTitle('招待承認'); }, []);

  useEffect(() => {
    const fetchInvitation = async () => {
      if (!token) {
        setError('招待トークンが見つかりません');
        setLoading(false);
        return;
      }

      try {
        const getInvitationByToken = httpsCallable(functions, 'getInvitationByToken');
        const result = await getInvitationByToken({ token });
        const invitationData = result.data;

        if (!invitationData) {
          setError('招待が見つかりません。既に承認済み、取り消された、または期限切れの可能性があります。');
          setLoading(false);
          return;
        }

        setInvitation(invitationData);
      } catch (err) {
        console.error('Error fetching invitation:', err);
        const message = err.code === 'functions/not-found' || err.message?.includes('招待が見つかりません')
          ? '招待が見つかりません。既に承認済み、取り消された、または期限切れの可能性があります。'
          : err.code === 'functions/deadline-exceeded'
            ? '招待の有効期限が切れています'
            : '招待情報の取得に失敗しました';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchInvitation();
  }, [token]);

  /**
   * 招待を承認
   */
  const handleAccept = async () => {
    if (!currentUser) {
      alert('招待を承認するには、まずログインしてください');
      navigate(`/login?redirect=/accept-invitation?token=${token}`);
      return;
    }

    setIsAccepting(true);
    setError(null);

    try {
      const acceptInvitation = httpsCallable(functions, 'acceptInvitation');
      const result = await acceptInvitation({ token });

      if (result.data.success) {
        alert('招待を承認しました！ダッシュボードに移動します。');
        navigate('/');
      }
    } catch (err) {
      console.error('Error accepting invitation:', err);
      setError(err.message || '招待の承認に失敗しました');
      setIsAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">読み込み中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
            <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="mt-4 text-xl font-bold text-center text-gray-900">エラー</h2>
          <p className="mt-2 text-sm text-center text-gray-600">{error}</p>
          <div className="mt-6">
            <Link
              to="/"
              className="block w-full px-4 py-2 text-center bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              ダッシュボードに戻る
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!invitation) {
    return null;
  }

  const roleText = invitation.role === 'editor' ? '編集者' : '閲覧者';
  const expiresAt = invitation.expiresAt ? new Date(invitation.expiresAt) : null;
  const expiresAtText = expiresAt 
    ? expiresAt.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg overflow-hidden">
        {/* ヘッダー */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-800 px-8 py-6">
          <h1 className="text-2xl font-bold text-white">GROW REPORTER</h1>
          <p className="mt-1 text-purple-100">メンバー招待</p>
        </div>

        {/* コンテンツ */}
        <div className="px-8 py-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {invitation.invitedByName} さんから招待が届いています
          </h2>

          <p className="text-gray-600 mb-6">
            <strong className="text-gray-900">{invitation.accountOwnerName}</strong> のメンバーとして招待されました。
          </p>

          {/* 招待情報 */}
          <div className="bg-gray-50 border-l-4 border-purple-600 p-4 mb-6">
            <dl className="space-y-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">権限</dt>
                <dd className="text-sm text-gray-900">{roleText}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">有効期限</dt>
                <dd className="text-sm text-gray-900">{expiresAtText}</dd>
              </div>
            </dl>
          </div>

          <p className="text-sm text-gray-600 mb-6">
            招待を承認すると、{invitation.accountOwnerName} の全サイトのデータにアクセスできるようになります。
          </p>

          {/* 未登録ユーザーの場合 */}
          {!currentUser && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                アカウントをお持ちでない場合は、まず新規登録を行ってください。
              </p>
              <div className="mt-3 flex gap-3">
                <Link
                  to={`/register?redirect=/accept-invitation?token=${token}`}
                  className="flex-1 px-4 py-2 text-center bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  新規登録
                </Link>
                <Link
                  to={`/login?redirect=/accept-invitation?token=${token}`}
                  className="flex-1 px-4 py-2 text-center border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  ログイン
                </Link>
              </div>
            </div>
          )}

          {/* 登録済みユーザーの場合 */}
          {currentUser && (
            <div className="flex gap-3">
              <Link
                to="/"
                className="flex-1 px-4 py-2 text-center border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                キャンセル
              </Link>
              <Button
                onClick={handleAccept}
                disabled={isAccepting}
                color="blue"
                className="flex-1"
              >
                {isAccepting ? '承認中...' : '招待を承認する'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
