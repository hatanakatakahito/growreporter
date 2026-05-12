import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { User, CreditCard, Mail, Users, Check, X } from 'lucide-react';
import { PLANS, PLAN_TYPES, isUnlimited, getPlanBadgeColor, EXTRA_SITE_UNIT_PRICE } from '../constants/plans';
import UpgradeModal from '../components/common/UpgradeModal';
import { useAuth } from '../contexts/AuthContext';
import { useSite } from '../contexts/SiteContext';
import { usePlan } from '../hooks/usePlan';
import { useAccountMembers } from '../hooks/useAccountMembers';
// Plan comparison table features
const PLAN_FEATURES = [
  {
    label: '登録サイト数',
    getValue: (p) => {
      const base = `${p.features.maxSites}サイト`;
      // Business のみ追加オプション併記
      if (p.id === PLAN_TYPES.BUSINESS) {
        return `${base}（追加 +¥${EXTRA_SITE_UNIT_PRICE.toLocaleString()}/サイト/月）`;
      }
      return base;
    },
  },
  { label: 'メンバー招待', getValue: (p) => isUnlimited(p.features.maxMembers) ? '無制限' : `${p.features.maxMembers}人` },
  { label: 'AI分析サマリー', getValue: (p) => p.features.aiSummaryMonthly === 0 ? '不可' : (isUnlimited(p.features.aiSummaryMonthly) ? '無制限' : `${p.features.aiSummaryMonthly}回`) },
  { label: 'AI改善提案', getValue: (p) => p.features.aiImprovementMonthly === 0 ? '不可' : (isUnlimited(p.features.aiImprovementMonthly) ? '無制限' : `${p.features.aiImprovementMonthly}回`) },
  { label: 'AIチャット', getValue: (p) => p.features.aiChatMonthly === 0 ? '不可' : (isUnlimited(p.features.aiChatMonthly) ? '無制限' : `${p.features.aiChatMonthly}回`) },
  { label: '改善タスク管理', getValue: (p) => p.features.improvementTask ? '可能' : '不可' },
  { label: '効果測定（評価する）', getValue: (p) => p.features.reportEvaluation ? '可能' : '不可' },
  { label: 'Excel / PPTXエクスポート', getValue: (p) => p.features.excelExportMonthly === 0 ? '不可' : (isUnlimited(p.features.excelExportMonthly) ? '無制限' : `${p.features.excelExportMonthly}回`) },
];
import { doc, updateDoc } from 'firebase/firestore';
import { db, functions } from '../config/firebase';
import { Switch } from '../components/ui/switch';
import { setPageTitle } from '../utils/pageTitle';
import { Button } from '@/components/ui/button';
import DotWaveSpinner from '@/components/common/DotWaveSpinner';
import { useAutoTour } from '../hooks/useAutoTour';
import { useOnboarding } from '../hooks/useOnboarding';
import TourHelpButton from '../components/Onboarding/TourHelpButton';

const ALL_TABS = [
  { id: 'profile', label: 'プロフィール', icon: User },
  { id: 'plan', label: 'プラン確認', icon: CreditCard },
  { id: 'email', label: 'メール通知', icon: Mail },
  { id: 'members', label: 'メンバー管理', icon: Users },
];

// viewer は plan / members タブを非表示
const VIEWER_TABS = ALL_TABS.filter((t) => !['plan', 'members'].includes(t.id));

/**
 * アカウント設定画面（タブ式）
 * URL パラメータ `?tab=profile|plan|email|members` でタブを切替
 * 登録サイトの一覧・管理は /sites/list（サイト管理）に集約
 */
export default function AccountSettings() {
  useEffect(() => { setPageTitle('アカウント設定'); }, []);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { seenTours, tourGuideEnabled } = useOnboarding();
  // ツアー未表示＆ガイドON なら email タブに切替（通知設定のツアーターゲットを描画するため）
  useEffect(() => {
    if (tourGuideEnabled && !seenTours.accountSettings) {
      const t = searchParams.get('tab');
      if (t !== 'email') {
        const next = new URLSearchParams(searchParams);
        next.set('tab', 'email');
        setSearchParams(next, { replace: true });
      }
    }
  }, [tourGuideEnabled, seenTours.accountSettings]); // eslint-disable-line react-hooks/exhaustive-deps
  useAutoTour('accountSettings');
  const { userProfile, currentUser, logout } = useAuth();
  const { sites } = useSite();
  const { plan, effectiveMaxSites } = usePlan();
  const { activeMemberCount } = useAccountMembers();

  const isViewer = userProfile?.memberRole === 'viewer';
  const TABS = useMemo(() => (isViewer ? VIEWER_TABS : ALL_TABS), [isViewer]);

  const activeTab = useMemo(() => {
    const t = searchParams.get('tab');
    return TABS.some((x) => x.id === t) ? t : 'profile';
  }, [searchParams, TABS]);

  const handleTabChange = (tabId) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', tabId);
    setSearchParams(next, { replace: false });
  };

  const [weeklyReportEmail, setWeeklyReportEmail] = useState(false);
  const [monthlyReportEmail, setMonthlyReportEmail] = useState(false);
  const [alertEmail, setAlertEmail] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isAddonModalOpen, setIsAddonModalOpen] = useState(false);
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
      <div className="w-full !max-w-[1100px] mx-auto px-3 sm:px-6 py-6 sm:py-10 box-border" style={{ maxWidth: '1100px' }}>
        {/* ヘッダー */}
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">アカウント設定</h1>
              <TourHelpButton tourId="accountSettings" />
            </div>
            <p className="mt-2 text-sm text-gray-600 dark:text-dark-6">
              プロフィール・プラン・通知などアカウント全般を管理します
            </p>
          </div>
          <Button
            variant="secondary"
            type="button"
            onClick={handleLogout}
          >
            <svg data-slot="icon" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            ログアウト
          </Button>
        </div>

        {/* タブナビ */}
        <div data-tour="account-tabs" className="mb-6 rounded-lg border border-stroke bg-white dark:border-dark-3 dark:bg-dark-2">
          <nav className="flex overflow-x-auto" aria-label="Tabs">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  data-tour={tab.id === 'email' ? 'account-email-tab' : undefined}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-5 py-4 text-sm transition-colors ${
                    isActive
                      ? 'border-primary font-semibold text-primary'
                      : 'border-transparent text-body-color hover:text-dark dark:hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* ========== プロフィール ========== */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            <div className="rounded-lg border border-stroke bg-white p-6 shadow-sm dark:border-dark-3 dark:bg-dark-2">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">プロフィール</h2>
                <Button variant="secondary" href="/account/profile">
                  編集する
                </Button>
              </div>
              <dl className="divide-y divide-gray-100 dark:divide-dark-3">
                <div className="grid grid-cols-3 gap-4 py-3">
                  <dt className="text-sm text-gray-500 dark:text-dark-6">組織名</dt>
                  <dd className="col-span-2 text-sm text-gray-900 dark:text-white">{userProfile.company}</dd>
                </div>
                <div className="grid grid-cols-3 gap-4 py-3">
                  <dt className="text-sm text-gray-500 dark:text-dark-6">部署名</dt>
                  <dd className="col-span-2 text-sm text-gray-900 dark:text-white">{userProfile.department}</dd>
                </div>
                <div className="grid grid-cols-3 gap-4 py-3">
                  <dt className="text-sm text-gray-500 dark:text-dark-6">姓</dt>
                  <dd className="col-span-2 text-sm text-gray-900 dark:text-white">{userProfile.lastName}</dd>
                </div>
                <div className="grid grid-cols-3 gap-4 py-3">
                  <dt className="text-sm text-gray-500 dark:text-dark-6">名</dt>
                  <dd className="col-span-2 text-sm text-gray-900 dark:text-white">{userProfile.firstName}</dd>
                </div>
                <div className="grid grid-cols-3 gap-4 py-3">
                  <dt className="text-sm text-gray-500 dark:text-dark-6">メールアドレス</dt>
                  <dd className="col-span-2 text-sm text-gray-900 dark:text-white">{userProfile.email}</dd>
                </div>
                <div className="grid grid-cols-3 gap-4 py-3">
                  <dt className="text-sm text-gray-500 dark:text-dark-6">電話番号</dt>
                  <dd className="col-span-2 text-sm text-gray-900 dark:text-white">{userProfile.phoneNumber}</dd>
                </div>
                <div className="grid grid-cols-3 gap-4 py-3">
                  <dt className="text-sm text-gray-500 dark:text-dark-6">郵便番号</dt>
                  <dd className="col-span-2 text-sm text-gray-900 dark:text-white">{userProfile.zipCode}</dd>
                </div>
                <div className="grid grid-cols-3 gap-4 py-3">
                  <dt className="text-sm text-gray-500 dark:text-dark-6">都道府県</dt>
                  <dd className="col-span-2 text-sm text-gray-900 dark:text-white">{userProfile.prefecture}</dd>
                </div>
                <div className="grid grid-cols-3 gap-4 py-3">
                  <dt className="text-sm text-gray-500 dark:text-dark-6">市区町村</dt>
                  <dd className="col-span-2 text-sm text-gray-900 dark:text-white">{userProfile.city}</dd>
                </div>
                <div className="grid grid-cols-3 gap-4 py-3">
                  <dt className="text-sm text-gray-500 dark:text-dark-6">建物名・部屋番号</dt>
                  <dd className="col-span-2 text-sm text-gray-900 dark:text-white">{userProfile.building}</dd>
                </div>
              </dl>
            </div>
          </div>
        )}

        {/* ========== プラン確認 ========== */}
        {activeTab === 'plan' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">現在のプラン</h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-dark-6">
                現在のあなたのプランと各プランの機能比較
              </p>
            </div>

            {/* サイト追加オプション（Business + オーナーのみ表示） */}
            {plan?.id === PLAN_TYPES.BUSINESS && userProfile?.memberRole === 'owner' && (() => {
              const extra = effectiveMaxSites - (plan?.features?.maxSites || 0);
              return (
                <div className="mx-auto max-w-3xl rounded-xl border border-stroke bg-white p-5 dark:border-dark-3 dark:bg-dark-2">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">サイト追加オプション</h3>
                      <p className="mt-1 text-xs text-gray-500 dark:text-dark-6">
                        基本3サイトに加え、1サイトあたり ¥{EXTRA_SITE_UNIT_PRICE.toLocaleString()}/月（税別）で追加できます。
                      </p>
                      <p className="mt-2 text-xs text-gray-700 dark:text-gray-300">
                        現在: 基本{plan?.features?.maxSites || 3}サイト
                        {extra > 0 ? ` + 追加${extra}サイト = 合計${effectiveMaxSites}サイト` : '（追加なし）'}
                      </p>
                    </div>
                    <Button variant="upgrade" type="button" onClick={() => setIsAddonModalOpen(true)}>
                      サイト追加を申し込む
                    </Button>
                  </div>
                </div>
              );
            })()}

            {/* プラン比較カード */}
            <div className="mx-auto grid max-w-3xl grid-cols-1 gap-6 md:grid-cols-2">
              {[PLANS[PLAN_TYPES.FREE], PLANS[PLAN_TYPES.BUSINESS]].map((p) => {
                const isCurrent = p.id === (plan?.id || 'free');
                return (
                  <div
                    key={p.id}
                    className={`relative rounded-xl border-2 bg-white p-6 transition dark:bg-dark-2 ${
                      isCurrent
                        ? 'border-primary shadow-lg ring-2 ring-primary/20'
                        : 'border-gray-200 dark:border-dark-3'
                    }`}
                  >
                    {isCurrent && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className="rounded-full bg-primary px-4 py-1 text-xs font-semibold text-white shadow">
                          現在のプラン
                        </span>
                      </div>
                    )}

                    <div className="mb-4 pt-2 text-center">
                      <span className={`inline-block rounded-full px-4 py-1.5 text-sm font-semibold ${getPlanBadgeColor(p.id)}`}>
                        {p.displayName}
                      </span>
                    </div>

                    <div className="mb-6 text-center">
                      {p.price === 0 ? (
                        <span className="text-3xl font-bold text-gray-900 dark:text-white">無料</span>
                      ) : (
                        <>
                          <span className="text-3xl font-bold text-gray-900 dark:text-white">
                            ¥{p.price.toLocaleString()}
                          </span>
                          <span className="text-sm text-gray-500"> / 月（税別）</span>
                        </>
                      )}
                    </div>

                    <ul className="space-y-3">
                      {PLAN_FEATURES.map((feature) => {
                        const val = feature.getValue(p);
                        const isDisabled = val === '不可';
                        return (
                          <li key={feature.label} className={`flex items-start gap-2.5 text-sm ${isDisabled ? 'opacity-50' : ''}`}>
                            {isDisabled
                              ? <X className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
                              : <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
                            }
                            <span className="text-gray-700 dark:text-gray-300">
                              <span className="text-gray-500 dark:text-gray-400">{feature.label}: </span>
                              <span className="font-medium text-gray-900 dark:text-white">{val}</span>
                            </span>
                          </li>
                        );
                      })}
                    </ul>

                    <div className="mt-6">
                      {isCurrent ? (
                        <div className="rounded-lg bg-gray-100 py-2.5 text-center text-sm font-medium text-gray-500 dark:bg-dark-3 dark:text-gray-400">
                          ご利用中
                        </div>
                      ) : p.price > (plan?.price || 0) ? (
                        userProfile?.memberRole === 'owner' ? (
                          <Button
                            variant="upgrade"
                            type="button"
                            onClick={() => setIsUpgradeModalOpen(true)}
                            className="w-full"
                          >
                            アップグレード
                          </Button>
                        ) : (
                          <div className="rounded-lg border border-gray-200 py-2.5 text-center text-xs text-gray-500 dark:border-dark-3">
                            オーナーのみ変更可能
                          </div>
                        )
                      ) : (
                        <div className="rounded-lg border border-gray-200 py-2.5 text-center text-sm text-gray-400 dark:border-dark-3">
                          —
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        )}

        {/* ========== メール通知 ========== */}
        {activeTab === 'email' && (
          <div className="space-y-6">
            <div data-tour="account-notifications" className="rounded-lg border border-stroke bg-white p-6 shadow-sm dark:border-dark-3 dark:bg-dark-2">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">メール通知</h2>
              <p className="text-sm text-gray-600 dark:text-dark-6 mb-4">
                週次・月次レポートやアラート通知をそれぞれオン・オフできます
              </p>
              <div className="space-y-4">
                <div data-tour="notification-weekly" className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-dark-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">週次レポート</p>
                    <p className="text-xs text-gray-500 dark:text-dark-6 mt-0.5">毎週のレポートをメールで受け取ります</p>
                  </div>
                  <Switch
                    color="blue"
                    checked={weeklyReportEmail}
                    onChange={handleToggleWeeklyReport}
                    disabled={isSaving}
                  />
                </div>
                <div data-tour="notification-monthly" className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-dark-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">月次レポート</p>
                    <p className="text-xs text-gray-500 dark:text-dark-6 mt-0.5">毎月のレポートをメールで受け取ります</p>
                  </div>
                  <Switch
                    color="blue"
                    checked={monthlyReportEmail}
                    onChange={handleToggleMonthlyReport}
                    disabled={isSaving}
                  />
                </div>
                <div data-tour="notification-alert" className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">アラート通知</p>
                    <p className="text-xs text-gray-500 dark:text-dark-6 mt-0.5">急な数値変化があったときにメールで通知します</p>
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
        )}

        {/* ========== メンバー管理 ========== */}
        {activeTab === 'members' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-primary/5 to-primary/10 border-2 border-primary/20 rounded-lg p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <svg className="h-6 w-6 text-primary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">メンバー管理</h2>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-dark-6 mb-4">
                    アカウントのメンバーを招待・管理できます
                  </p>
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <span className="text-gray-700 dark:text-dark-6">
                      <span className="font-semibold text-gray-900 dark:text-white">{activeMemberCount}</span>
                      <span> / {maxMembers >= 999999 ? '無制限' : `${maxMembers}人`}使用中</span>
                    </span>
                    <span className="inline-flex items-center px-2 py-1 rounded-full bg-primary/20 text-primary text-xs font-medium">
                      あなたの権限: {userProfile?.memberRole === 'owner' ? 'オーナー' : userProfile?.memberRole === 'editor' ? '編集者' : '閲覧者'}
                    </span>
                  </div>
                </div>
                <Button variant="primary" size="lg" href="/members" className="flex-shrink-0">
                  メンバー管理を開く
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* アカウント削除 & 法的リンク（全タブ共通フッター） */}
        <div className="mt-8 border-t border-gray-200 dark:border-dark-3 pt-6 flex flex-wrap items-center justify-between gap-y-2">
          <button
            onClick={() => setShowDeleteAccount(true)}
            className="text-sm text-gray-400 hover:text-red-500 transition"
          >
            アカウントを削除する
          </button>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
            <a href="/terms" target="_blank" rel="noopener noreferrer" className="hover:text-gray-500 hover:underline">利用規約</a>
            <a href="/privacy" target="_blank" rel="noopener noreferrer" className="hover:text-gray-500 hover:underline">プライバシーポリシー</a>
            <a href="/commercial-transaction" target="_blank" rel="noopener noreferrer" className="hover:text-gray-500 hover:underline">特定商取引法に基づく表記</a>
          </div>
        </div>
      </div>

      {/* アップグレードモーダル */}
      {/* サイト追加オプション専用モーダル（オーナーのみが Business 状態で開ける） */}
      <UpgradeModal
        isOpen={isAddonModalOpen}
        onClose={() => setIsAddonModalOpen(false)}
        mode="addon"
      />

      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        initialStep="form"
      />

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
                variant="ghost"
                onClick={() => { setShowDeleteAccount(false); setDeleteError(null); }}
                disabled={deleteLoading}
                className="flex-1"
              >
                キャンセル
              </Button>
              <Button
                variant="danger"
                onClick={handleDeleteAccount}
                disabled={deleteLoading}
                className="flex-1"
              >
                {deleteLoading ? (
                  <>
                    <DotWaveSpinner size="xs" variant="white" />
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
