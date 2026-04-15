import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { User, CreditCard, Globe, Mail, Users, Check, Zap, ClipboardCheck, Download, UserPlus, MessageCircle } from 'lucide-react';
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
import DotWaveSpinner from '@/components/common/DotWaveSpinner';
import { useOnboarding } from '../hooks/useOnboarding';

const TABS = [
  { id: 'profile', label: 'プロフィール', icon: User },
  { id: 'plan', label: 'プラン確認', icon: CreditCard },
  { id: 'sites', label: '登録サイト', icon: Globe },
  { id: 'email', label: 'メール通知', icon: Mail },
  { id: 'members', label: 'メンバー管理', icon: Users },
];

/**
 * アカウント設定画面（タブ式）
 * URL パラメータ `?tab=profile|plan|sites|email|members` でタブを切替
 */
export default function AccountSettings() {
  useEffect(() => { setPageTitle('アカウント設定'); }, []);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { markStep } = useOnboarding();
  const { userProfile, currentUser, logout } = useAuth();
  const { sites } = useSite();
  const { plan } = usePlan();
  const { activeMemberCount } = useAccountMembers();

  const activeTab = useMemo(() => {
    const t = searchParams.get('tab');
    return TABS.some((x) => x.id === t) ? t : 'profile';
  }, [searchParams]);

  // メール通知タブを開いたときにオンボーディングのステップを完了
  useEffect(() => {
    if (activeTab === 'email') markStep('notificationsConfigured');
  }, [activeTab, markStep]);

  const handleTabChange = (tabId) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', tabId);
    setSearchParams(next, { replace: false });
  };

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
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">アカウント設定</h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-dark-6">
              プロフィール・プラン・通知などアカウント全般を管理します
            </p>
          </div>
          <Button
            outline
            type="button"
            className="bg-white"
            onClick={handleLogout}
          >
            <svg data-slot="icon" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            ログアウト
          </Button>
        </div>

        {/* タブナビ */}
        <div className="mb-6 rounded-lg border border-stroke bg-white dark:border-dark-3 dark:bg-dark-2">
          <nav className="flex overflow-x-auto" aria-label="Tabs">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
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
                <Link
                  to="/account/profile"
                  className="inline-flex items-center px-4 py-2 rounded-lg border border-stroke bg-white text-sm font-medium text-dark hover:bg-gray-50 dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:hover:bg-dark-3"
                >
                  編集する
                </Link>
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
        {activeTab === 'plan' && (() => {
          const isFreePlan = (plan?.id || 'free') === 'free';
          const sitesUsed = sites?.length || 0;
          const sitePct = maxSites > 0 ? Math.min(100, (sitesUsed / maxSites) * 100) : 0;
          const memberPct = maxMembers >= 999999
            ? Math.min(100, (activeMemberCount / 20) * 100)
            : Math.min(100, (activeMemberCount / maxMembers) * 100);
          const priceLabel = isFreePlan ? '¥0' : '¥54,780';
          const priceSuffix = isFreePlan ? '月額' : '月額（税込）';
          const headerBg = isFreePlan
            ? 'bg-gradient-to-r from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-900/10'
            : 'bg-gradient-to-r from-pink-50 via-red-50 to-orange-50 dark:from-pink-900/20 dark:via-red-900/10 dark:to-orange-900/10';

          const upgradeItems = [
            {
              icon: Zap,
              title: 'AI分析・AIチャット・改善提案',
              desc: 'GA4/GSC データを AI が日本語で解説。質問にも回答し、改善ポイントを自動提案します。',
              badge: '無制限',
            },
            {
              icon: ClipboardCheck,
              title: '改善タスク管理 & 効果測定',
              desc: 'AI 提案をタスク化し、実施後の効果を自動で計測・評価レポート化します。',
              badge: '追加',
            },
            {
              icon: Download,
              title: 'Excel / PowerPoint エクスポート',
              desc: '全15種類以上の分析レポートを Excel / PPTX 形式でダウンロード。クライアント報告書作成に。',
              badge: '無制限',
            },
            {
              icon: UserPlus,
              title: 'サイト・メンバー枠拡大',
              desc: 'サイト最大3件まで、メンバー無制限で招待可能。チーム全体でデータ共有できます。',
              badge: '3サイト',
            },
            {
              icon: MessageCircle,
              title: 'メール・Web会議サポート',
              desc: '使い方のご質問や導入支援を専任担当がフォロー。',
              badge: '専任',
            },
          ];

          const freeFeatures = [
            '15種類以上のアクセス分析ビュー',
            '週次・月次レポートメール',
            'アラート通知',
            'データ保持期間 無制限',
          ];
          const businessFeatures = [
            '15種類以上のアクセス分析',
            'AI分析・AIチャット（無制限）',
            '改善提案・タスク管理',
            '評価機能',
            'Excel / PPTX エクスポート',
            'メール・Web会議サポート',
          ];

          return (
            <div className="space-y-6">
              {/* 現在のプラン情報カード */}
              <div className="overflow-hidden rounded-lg border border-stroke bg-white shadow-sm dark:border-dark-3 dark:bg-dark-2">
                {/* ヘッダー帯 */}
                <div className={`flex items-center justify-between border-b border-stroke px-6 py-5 dark:border-dark-3 ${headerBg}`}>
                  <div>
                    <p className="text-xs text-body-color">現在のプラン</p>
                    <p className="text-lg font-bold text-dark dark:text-white">{plan?.displayName ?? '無料プラン'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-body-color">{priceSuffix}</p>
                    <p className="text-xl font-bold text-dark dark:text-white">
                      {priceLabel}
                      <span className="ml-1 text-xs font-normal text-body-color">/ 月</span>
                    </p>
                  </div>
                </div>

                {/* 利用状況 */}
                <div className="px-6 py-5">
                  <p className="mb-4 text-sm font-semibold text-dark dark:text-white">ご利用状況</p>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="rounded-lg border border-stroke p-4 dark:border-dark-3">
                      <p className="text-xs font-medium text-body-color">サイト登録数</p>
                      <p className="mt-1 text-2xl font-bold text-dark dark:text-white">
                        {sitesUsed}
                        <span className="text-sm font-normal text-body-color"> / {maxSites}</span>
                      </p>
                      <div className="mt-2 h-1.5 w-full rounded-full bg-stroke dark:bg-dark-3">
                        <div className="h-1.5 rounded-full bg-primary transition-all" style={{ width: `${sitePct}%` }} />
                      </div>
                    </div>
                    <div className="rounded-lg border border-stroke p-4 dark:border-dark-3">
                      <p className="text-xs font-medium text-body-color">メンバー数</p>
                      <p className="mt-1 text-2xl font-bold text-dark dark:text-white">
                        {activeMemberCount}
                        <span className="text-sm font-normal text-body-color"> / {maxMembers >= 999999 ? '無制限' : `${maxMembers}人`}</span>
                      </p>
                      <div className="mt-2 h-1.5 w-full rounded-full bg-stroke dark:bg-dark-3">
                        <div className="h-1.5 rounded-full bg-primary transition-all" style={{ width: `${memberPct}%` }} />
                      </div>
                    </div>
                    <div className="rounded-lg border border-stroke p-4 dark:border-dark-3">
                      <p className="text-xs font-medium text-body-color">AI機能</p>
                      {isFreePlan ? (
                        <>
                          <p className="mt-1 text-2xl font-bold text-gray-400">—</p>
                          <p className="mt-2 text-xs text-body-color">Businessプラン以降</p>
                        </>
                      ) : (
                        <>
                          <p className="mt-1 text-2xl font-bold text-dark dark:text-white">無制限</p>
                          <p className="mt-2 text-xs text-primary">利用可能</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* 含まれる機能 */}
                <div className="border-t border-stroke px-6 py-5 dark:border-dark-3">
                  <p className="mb-3 text-sm font-semibold text-dark dark:text-white">
                    {isFreePlan ? '現プランに含まれる機能' : 'ご利用中の機能'}
                  </p>
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    {(isFreePlan ? freeFeatures : businessFeatures).map((f) => (
                      <div key={f} className="flex items-center gap-2 text-sm text-dark dark:text-white">
                        <Check className="h-4 w-4 shrink-0 text-primary" strokeWidth={2.5} />
                        {f}
                      </div>
                    ))}
                  </div>
                  {!isFreePlan && userProfile?.memberRole === 'owner' && (
                    <div className="mt-5 flex items-center justify-end">
                      <Link to="/account/plan" className="text-sm text-primary hover:underline">
                        プラン詳細・変更 →
                      </Link>
                    </div>
                  )}
                </div>
              </div>

              {/* アップグレード訴求カード（Freeのみ） */}
              {isFreePlan && userProfile?.memberRole === 'owner' && (
                <div className="overflow-hidden rounded-lg border-2 border-primary shadow-lg dark:border-primary/70">
                  <div className="bg-gradient-to-r from-primary via-purple-500 to-pink-500 px-6 py-5">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <span className="inline-block rounded-full bg-white/20 px-3 py-0.5 text-[11px] font-semibold text-white">おすすめ</span>
                        <h3 className="mt-2 text-xl font-bold text-white">ビジネスプランにアップグレード</h3>
                        <p className="mt-1 text-sm text-white/90">AIの力でサイト改善を本格的に推進</p>
                      </div>
                      <div className="text-right text-white">
                        <p className="text-xs opacity-90">月額（税別）</p>
                        <p className="text-3xl font-bold">¥49,800</p>
                        <p className="text-[11px] opacity-90">税込 ¥54,780 / 月</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white px-6 py-5 dark:bg-dark-2">
                    <p className="mb-4 text-sm font-semibold text-dark dark:text-white">無料プランとの違い</p>
                    <div className="space-y-3">
                      {upgradeItems.map((item) => {
                        const Icon = item.icon;
                        return (
                          <div key={item.title} className="flex items-start gap-3 rounded-lg bg-primary/[0.04] p-3 dark:bg-primary/10">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                              <Icon className="h-4 w-4 text-primary" strokeWidth={2} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-dark dark:text-white">{item.title}</p>
                              <p className="mt-0.5 text-xs text-body-color">{item.desc}</p>
                            </div>
                            <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-white">
                              {item.badge}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-6 flex flex-col gap-3 border-t border-stroke pt-5 dark:border-dark-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="text-xs text-body-color">
                        <p>※ 価格は税別。月額・年額どちらも対応。</p>
                        <p>※ 導入時の初期設定・ヒアリングは無料で承ります。</p>
                      </div>
                      <Link
                        to="/account/plan"
                        className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-primary to-purple-600 px-6 py-2.5 text-sm font-bold text-white shadow hover:opacity-90"
                      >
                        アップグレードする →
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* ========== 登録サイト ========== */}
        {activeTab === 'sites' && (
          <div className="space-y-6">
            <div className="rounded-lg border border-stroke bg-white p-6 shadow-sm dark:border-dark-3 dark:bg-dark-2">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">登録しているサイト</h2>
                  <p className="mt-0.5 text-sm text-gray-600 dark:text-dark-6">クリックでサイト詳細・設定編集へ</p>
                </div>
                <Link
                  to="/sites/new"
                  className="inline-flex items-center px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  サイトを追加
                </Link>
              </div>
              {sites && sites.length > 0 ? (
                <ul className="space-y-3">
                  {sites.map((site) => (
                    <li key={site.id}>
                      <Link
                        to={`/sites/${site.id}`}
                        className="block p-4 rounded-lg border border-gray-200 hover:border-primary/40 hover:bg-gray-50/80 transition-colors group dark:border-dark-3 dark:hover:bg-dark-3"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white group-hover:text-primary">
                              {site.siteName || '名称未設定'}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-dark-6 mt-0.5">{site.siteUrl || '-'}</p>
                          </div>
                          <span className="text-sm text-primary font-medium">管理へ</span>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-6 text-center dark:border-dark-3 dark:bg-dark-3">
                  <p className="text-sm text-gray-600 dark:text-dark-6 mb-4">サイトがありません</p>
                  <div className="flex flex-wrap justify-center gap-3">
                    <Link
                      to="/sites/list"
                      className="inline-flex items-center px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 dark:border-dark-3 dark:text-white"
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
              <div className="mt-4 text-right">
                <Link to="/sites/list" className="text-xs text-primary hover:underline">
                  すべてのサイトを管理 →
                </Link>
              </div>
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
                <Link
                  to="/members"
                  className="flex-shrink-0 px-6 py-3 bg-primary text-white rounded-lg hover:opacity-90 transition-opacity font-medium"
                >
                  メンバー管理を開く
                </Link>
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
