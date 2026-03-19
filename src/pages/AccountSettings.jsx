import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { useAuth } from '../contexts/AuthContext';
import { useSite } from '../contexts/SiteContext';
import { usePlan } from '../hooks/usePlan';
import { useAccountMembers } from '../hooks/useAccountMembers';
import { getPlanBadgeColor } from '../constants/plans';
import { doc, updateDoc } from 'firebase/firestore';
import { db, functions } from '../config/firebase';
import { Switch } from '../components/ui/switch';
import { setPageTitle } from '../utils/pageTitle';
import { Button } from '@/components/ui/button';

/**
 * アカウント設定画面
 */
export default function AccountSettings() {
  useEffect(() => { setPageTitle('アカウント設定'); }, []);
  const navigate = useNavigate();
  const { userProfile, currentUser, logout } = useAuth();
  const { sites } = useSite();
  const { plan } = usePlan();
  const { activeMemberCount } = useAccountMembers();
  const [weeklyReportEmail, setWeeklyReportEmail] = useState(false);
  const [monthlyReportEmail, setMonthlyReportEmail] = useState(false);
  const [alertEmail, setAlertEmail] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  // 通知設定を初期化（従来の emailNotifications があればそれでフォールバック）
  useEffect(() => {
    const ns = userProfile?.notificationSettings;
    if (!ns) return;
    const fallback = ns.emailNotifications || false;
    setWeeklyReportEmail(ns.weeklyReportEmail ?? fallback);
    setMonthlyReportEmail(ns.monthlyReportEmail ?? fallback);
    setAlertEmail(ns.alertEmail ?? true);
  }, [userProfile]);

  // 週次レポート通知のトグル
  const handleToggleWeeklyReport = async () => {
    if (!currentUser) return;
    setIsSaving(true);
    try {
      const newValue = !weeklyReportEmail;
      await updateDoc(doc(db, 'users', currentUser.uid), {
        'notificationSettings.weeklyReportEmail': newValue,
        'notificationSettings.emailNotifications': newValue || monthlyReportEmail || alertEmail,
        updatedAt: new Date()
      });
      setWeeklyReportEmail(newValue);
    } catch (error) {
      console.error('通知設定の更新エラー:', error);
      alert('設定の更新に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  // 月次レポート通知のトグル
  const handleToggleMonthlyReport = async () => {
    if (!currentUser) return;
    setIsSaving(true);
    try {
      const newValue = !monthlyReportEmail;
      await updateDoc(doc(db, 'users', currentUser.uid), {
        'notificationSettings.monthlyReportEmail': newValue,
        'notificationSettings.emailNotifications': weeklyReportEmail || newValue || alertEmail,
        updatedAt: new Date()
      });
      setMonthlyReportEmail(newValue);
    } catch (error) {
      console.error('通知設定の更新エラー:', error);
      alert('設定の更新に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  // アラート通知のトグル
  const handleToggleAlertEmail = async () => {
    if (!currentUser) return;
    setIsSaving(true);
    try {
      const newValue = !alertEmail;
      await updateDoc(doc(db, 'users', currentUser.uid), {
        'notificationSettings.alertEmail': newValue,
        'notificationSettings.emailNotifications': weeklyReportEmail || monthlyReportEmail || newValue,
        updatedAt: new Date()
      });
      setAlertEmail(newValue);
    } catch (error) {
      console.error('通知設定の更新エラー:', error);
      alert('設定の更新に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  if (!userProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">読み込み中...</div>
      </div>
    );
  }

  // オーナー・編集者・閲覧者とも同じ2カラムレイアウト（モック準拠）。権限による分岐は行わない。
  const maxSites = plan?.features?.maxSites ?? 1;
  const maxMembers = plan?.features?.maxMembers ?? 1;
  const aiSummaryMonthly = plan?.features?.aiSummaryMonthly ?? 0;

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      const deleteAccountFn = httpsCallable(functions, 'deleteAccount');
      const result = await deleteAccountFn();
      if (result.data.success) {
        // Auth削除済みなのでログイン画面へ
        window.location.href = '/login';
      }
    } catch (err) {
      console.error('アカウント削除エラー:', err);
      setDeleteError(err.message || 'アカウントの削除に失敗しました');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('ログアウトエラー:', err);
    }
  };

  return (
    <div className="w-full min-w-0" key="account-settings-layout">
      <div className="w-full !max-w-[1400px] mx-auto px-6 py-10 box-border" style={{ maxWidth: '1400px' }}>
      {/* ヘッダー */}
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">アカウント設定</h1>
          <p className="mt-2 text-sm text-gray-600">
            アカウント情報とメンバー管理
          </p>
        </div>
        <Button
          outline
          type="button"
          onClick={handleLogout}
        >
          <svg data-slot="icon" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          ログアウト
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ========== 左カラム（モックに合わせる） ========== */}
        <div className="space-y-6">
          {/* プロフィール */}
          <div className="bg-white shadow-sm rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">プロフィール</h2>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-gray-500">組織名</dt>
                <dd className="text-gray-900">{userProfile.company || '未設定'}</dd>
              </div>
              <div>
                <dt className="text-gray-500">担当者名</dt>
                <dd className="text-gray-900">
                  {userProfile.name || (userProfile.lastName && userProfile.firstName ? `${userProfile.lastName} ${userProfile.firstName}` : '未設定')}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">メールアドレス</dt>
                <dd className="text-gray-900">{userProfile.email}</dd>
              </div>
              <div>
                <dt className="text-gray-500">電話番号</dt>
                <dd className="text-gray-900">{userProfile.phoneNumber || '未設定'}</dd>
              </div>
            </dl>
            <div className="mt-4">
              <Link
                to="/account/profile"
                className="inline-flex items-center px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:opacity-90 transition-opacity"
              >
                プロフィールを編集
              </Link>
            </div>
          </div>

          {/* プラン */}
          <div className="bg-white shadow-sm rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">プラン</h2>
            <p className="text-sm text-gray-600 mb-2">現在のプラン</p>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getPlanBadgeColor(plan?.id || 'free')}`}>
              {plan?.displayName ?? '無料プラン'}
            </span>
            <p className="mt-2 text-xs text-gray-500">
              最大{maxSites}サイト・{maxMembers}人
              {aiSummaryMonthly >= 999999 ? '・AI無制限' : `・AI月${aiSummaryMonthly}回`}
            </p>
            {userProfile?.memberRole === 'owner' && (
              <div className="mt-4">
                <Link
                  to="/account/plan"
                  className="inline-flex items-center px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  プランを変更
                </Link>
              </div>
            )}
          </div>

          {/* メール通知 */}
          <div className="bg-white shadow-sm rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">メール通知</h2>
            <p className="text-sm text-gray-600 mb-4">
              週次・月次レポートをそれぞれオン・オフできます
            </p>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <div>
                  <p className="text-sm font-medium text-gray-900">週次レポート</p>
                  <p className="text-xs text-gray-500 mt-0.5">毎週のレポートをメールで受け取ります</p>
                </div>
                <Switch
                  color="blue"
                  checked={weeklyReportEmail}
                  onChange={handleToggleWeeklyReport}
                  disabled={isSaving}
                />
              </div>
              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <div>
                  <p className="text-sm font-medium text-gray-900">月次レポート</p>
                  <p className="text-xs text-gray-500 mt-0.5">毎月のレポートをメールで受け取ります</p>
                </div>
                <Switch
                  color="blue"
                  checked={monthlyReportEmail}
                  onChange={handleToggleMonthlyReport}
                  disabled={isSaving}
                />
              </div>
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">アラート通知</p>
                  <p className="text-xs text-gray-500 mt-0.5">急な数値変化があったときにメールで通知します</p>
                </div>
                <Switch
                  color="blue"
                  checked={alertEmail}
                  onChange={handleToggleAlertEmail}
                  disabled={isSaving}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ========== 右カラム ========== */}
        <div className="space-y-6">
          {/* 登録しているサイト */}
          <div className="bg-white shadow-sm rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">登録しているサイト</h2>
            <p className="text-sm text-gray-600 mb-4">クリックでサイト詳細へ</p>
            {sites && sites.length > 0 ? (
              <ul className="space-y-3">
                {sites.map((site) => (
                  <li key={site.id}>
                    <Link
                      to={`/sites/${site.id}`}
                      className="block p-4 rounded-lg border border-gray-200 hover:border-primary/40 hover:bg-gray-50/80 transition-colors group"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900 group-hover:text-primary">
                            {site.siteName || '名称未設定'}
                          </p>
                          <p className="text-sm text-gray-500 mt-0.5">{site.siteUrl || '-'}</p>
                        </div>
                        <span className="text-sm text-primary font-medium">管理へ</span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-6 text-center">
                <p className="text-sm text-gray-600 mb-4">サイトがありません</p>
                <div className="flex flex-wrap justify-center gap-3">
                  <Link
                    to="/sites/list"
                    className="inline-flex items-center px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
                  >
                    サイト一覧
                  </Link>
                  <Link
                    to="/sites/new"
                    className="inline-flex items-center px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:opacity-90 transition-opacity"
                  >
                    サイトを追加
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* メンバー管理 */}
          <div className="bg-gradient-to-br from-primary/5 to-primary/10 border-2 border-primary/20 rounded-lg p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <svg className="h-6 w-6 text-primary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <h2 className="text-xl font-semibold text-gray-900">メンバー管理</h2>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  アカウントのメンバーを招待・管理できます
                </p>
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="text-gray-700">
                    <span className="font-semibold text-gray-900">{activeMemberCount}</span>
                    <span> / {maxMembers}人使用中</span>
                  </span>
                  <span className="inline-flex items-center px-2 py-1 rounded-full bg-primary/20 text-primary text-xs font-medium">
                    あなたの権限: {userProfile?.memberRole === 'owner' ? 'オーナー' : userProfile?.memberRole === 'editor' ? '編集者' : '閲覧者'}
                  </span>
                </div>
              </div>
              <Link
                to="/members"
                className="flex-shrink-0 px-6 py-3 bg-primary text-white rounded-lg hover:opacity-90 transition-opacity font-medium"
              >
                メンバー管理を開く
              </Link>
            </div>
          </div>
        </div>

        {/* アカウント削除 */}
        <div className="mt-8 border-t border-gray-200 pt-6 lg:col-span-2">
          <button
            onClick={() => setShowDeleteAccount(true)}
            className="text-sm text-gray-400 hover:text-red-500 transition"
          >
            アカウントを削除する
          </button>
        </div>
      </div>
      </div>

      {/* アカウント削除確認モーダル */}
      {showDeleteAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-dark-2">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.27 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  アカウント削除の確認
                </h3>
                <p className="text-sm text-gray-500 dark:text-dark-6">
                  この操作は取り消せません
                </p>
              </div>
            </div>

            <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-600 dark:bg-red-900/20">
              <p className="font-medium mb-1">以下のデータがすべて削除されます：</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>アカウント情報</li>
                <li>登録している全サイト（{sites?.length || 0}件）</li>
                <li>分析データ、メモ、改善提案</li>
                <li>OAuth連携情報</li>
              </ul>
            </div>

            {deleteError && (
              <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20">
                {deleteError}
              </div>
            )}

            <div className="flex gap-3">
              <Button
                outline
                onClick={() => { setShowDeleteAccount(false); setDeleteError(null); }}
                disabled={deleteLoading}
                className="flex-1"
              >
                キャンセル
              </Button>
              <Button
                color="red"
                onClick={handleDeleteAccount}
                disabled={deleteLoading}
                className="flex-1"
              >
                {deleteLoading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
                    削除中...
                  </>
                ) : (
                  'アカウントを削除する'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
