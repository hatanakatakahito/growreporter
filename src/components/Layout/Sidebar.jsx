import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useAdmin } from '../../hooks/useAdmin';
import { useSidebar } from '../../contexts/SidebarContext';
import { ChevronLeft, ChevronRight, Sun, Moon } from 'lucide-react';
import { getPlanBadgeColor, getPlanDisplayName } from '../../constants/plans';
import { usePlan } from '../../hooks/usePlan';
import UpgradeModal from '../common/UpgradeModal';
import { Badge } from '../ui/badge';
import { Avatar } from '../ui/avatar';
import logoImg from '../../assets/img/logo.svg';

// サイドバーテーマ設定
const SIDEBAR_THEMES = {
  dark: {
    aside: 'bg-gradient-to-b from-[#1a1d2e] via-[#1e2235] to-[#161925]',
    border: 'border-white/[0.06]',
    logoFilter: 'sidebar-logo-dark',
    menuText: 'text-slate-200',
    menuHover: 'hover:bg-white/[0.08]',
    activeClass: 'sidebar-active-dark text-white font-semibold',
    subText: 'text-slate-200',
    subBorder: 'border-white/[0.06]',
    subActiveClass: 'sidebar-active-dark text-white',
    subHover: 'hover:bg-white/[0.06]',
    chevron: 'text-slate-400',
    zoneLabel: 'text-slate-500',
    bottomBorder: 'border-white/[0.06]',
    bottomBg: '',
    popBg: 'bg-[#252a40]',
    popBorder: 'border-white/[0.08]',
    userName: 'text-white',
    userEmail: 'text-slate-500',
    userHover: 'hover:bg-white/[0.05]',
    logoutBtn: 'border-white/[0.06] bg-white/[0.04] text-slate-200 hover:bg-white/[0.08] hover:text-white',
    adminBtn: 'bg-primary text-white hover:bg-opacity-90',
    toggleBtnBg: 'border-white/10 bg-[#1e2235] hover:bg-[#252a40]',
    toggleBtnIcon: 'text-slate-400',
    themeBtn: 'text-slate-400 hover:bg-white/[0.08]',
  },
  white: {
    aside: 'bg-white',
    border: 'border-stroke/60',
    logoFilter: '',
    menuText: 'text-slate-700',
    menuHover: 'hover:bg-[rgba(55,88,249,0.05)]',
    activeClass: 'sidebar-active-white text-primary font-semibold',
    subText: 'text-slate-600',
    subBorder: 'border-slate-200',
    subActiveClass: 'sidebar-active-white text-primary',
    subHover: 'hover:bg-[rgba(55,88,249,0.05)]',
    chevron: 'text-slate-400',
    zoneLabel: 'text-slate-400',
    bottomBorder: 'border-stroke/60',
    bottomBg: 'bg-white',
    popBg: 'bg-white',
    popBorder: 'border-stroke/60',
    userName: 'text-slate-800',
    userEmail: 'text-slate-400',
    userHover: 'hover:bg-slate-50',
    logoutBtn: 'border-stroke/60 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900',
    adminBtn: 'bg-primary text-white hover:bg-opacity-90',
    toggleBtnBg: 'border-stroke bg-gray-100 hover:bg-gray-200',
    toggleBtnIcon: 'text-body-color',
    themeBtn: 'text-slate-400 hover:bg-[rgba(55,88,249,0.05)]',
  },
};

// 「分析する」サブメニュー（目的グループ式）。URL ルートは不変、表示ラベルのみ平易化。
// ・先頭に AI総合分析（ピン留め）／全体サマリー（直リンク・トグルなし）
// ・以下4つの「目的グループ」（クリックで開閉。各リーフに小さな説明文）
const ANALYSIS_SUBMENU = {
  ai: { label: 'AI総合分析', path: '/analysis/comprehensive', lockedForFree: true },
  summary: { label: '全体サマリー', desc: '主要指標をまとめて一覧', path: '/analysis/summary' },
  groups: [
    {
      id: 'g-user-time',
      name: 'ユーザー・日時',
      sub: '誰がいつ',
      items: [
        { label: 'ユーザー属性', desc: 'デバイス・地域・年代など', path: '/analysis/users' },
        { label: '月別', desc: '月ごとの推移・季節変動', path: '/analysis/month' },
        { label: '日別', desc: '日ごとの増減', path: '/analysis/day' },
        { label: '曜日別', desc: '平日と休日の差', path: '/analysis/week' },
        { label: '時間帯別', desc: '多い時間帯', path: '/analysis/hour' },
      ],
    },
    {
      id: 'g-acquisition',
      name: '集客',
      sub: 'どこから来たか',
      items: [
        { label: '集客チャネル', desc: '検索/SNS/広告/直接の内訳', path: '/analysis/channels' },
        { label: '検索キーワード', desc: 'Google検索で来たクエリ', path: '/analysis/keywords' },
        { label: '参照元サイト', desc: '他サイトのリンクから来た元', path: '/analysis/referrals' },
      ],
    },
    {
      id: 'g-page',
      name: 'ページ',
      sub: 'どのように見たか',
      zones: [
        {
          name: 'よく使う',
          items: [
            { label: 'ページ別', desc: '各ページのPV・滞在・直帰', path: '/analysis/pages' },
            { label: '入口ページ', desc: '最初に着地したページ', path: '/analysis/landing-pages' },
            { label: '資料ダウンロード', desc: 'PDF等のDL数', path: '/analysis/file-downloads' },
            { label: '外部リンククリック', desc: '外部リンクのクリック数', path: '/analysis/external-links' },
          ],
        },
        {
          name: '詳しく見る',
          items: [
            { label: 'コンテンツ分析', desc: '記事の読まれ方（興味度スコア）', path: '/analysis/content' },
            { label: 'ページ分類別', desc: 'カテゴリ単位の比較', path: '/analysis/page-categories' },
            { label: '次に見たページ', desc: 'ページ間の動き', path: '/analysis/page-flow' },
            { label: 'ユーザージャーニー', desc: '成約に至る典型ルート', path: '/analysis/user-journey', adminOnly: true },
          ],
        },
      ],
    },
    {
      id: 'g-conversion',
      name: '成果',
      sub: 'コンバージョン',
      items: [
        { label: 'コンバージョン一覧', desc: '問い合わせ・購入などの推移', path: '/analysis/conversions' },
        { label: '成果までの到達ステップ', desc: '入口→フォーム→完了の到達率', path: '/analysis/reverse-flow' },
      ],
    },
  ],
};

// グループ内の全リーフ（zones があれば flatten）
const groupLeaves = (g) => (g.zones ? g.zones.flatMap((z) => z.items) : g.items);
// path → group.id（自動展開・親グループ active 判定用）
const ANALYSIS_PATH_GROUP = (() => {
  const m = {};
  for (const g of ANALYSIS_SUBMENU.groups) for (const it of groupLeaves(g)) m[it.path] = g.id;
  return m;
})();

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, userProfile, logout, isGrowStaff } = useAuth();
  const { isAdmin } = useAdmin();
  const { isSidebarOpen, toggleSidebar, isDarkSidebar, toggleSidebarTheme } = useSidebar();
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
  const [isGrowInternalOpen, setIsGrowInternalOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState(() => new Set()); // 分析メニューの目的グループ（開いている group.id の集合）
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const { isFree, plan, planId } = usePlan();

  const isGroupOpen = (id) => openGroups.has(id);
  const toggleGroup = (id) =>
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // ユーザーメニュー（フッター）の外側クリックで閉じる
  useEffect(() => {
    if (!isUserMenuOpen) return;
    const onDoc = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setIsUserMenuOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [isUserMenuOpen]);

  // テーマオブジェクト
  const t = SIDEBAR_THEMES[isDarkSidebar ? 'dark' : 'white'];

  // ユーザー名を取得（name優先、後方互換でlastName+firstName、なければdisplayName）
  const getUserName = () => {
    if (userProfile?.name) return userProfile.name;
    if (userProfile?.lastName && userProfile?.firstName) return `${userProfile.lastName} ${userProfile.firstName}`;
    return currentUser?.displayName || 'ユーザー';
  };

  const userInitial = getUserName().charAt(0);

  // viewer/editor の場合は usePlan() がオーナーのプランを返すため、
  // userProfile.plan ではなく usePlan() の結果を使用する
  const userPlan = planId || 'free';
  const planBadgeColor = getPlanBadgeColor(userPlan);
  const planLabel = plan?.displayName || getPlanDisplayName(userPlan);

  // 現在のパスに基づいてメニューを開く
  useEffect(() => {
    const path = location.pathname;

    // 分析ページなら「分析する」アコーディオンを開く＋現在ページが属する目的グループも開く
    if (path.startsWith('/analysis')) {
      setIsAnalysisOpen(true);
      const gid = ANALYSIS_PATH_GROUP[path];
      if (gid) setOpenGroups((prev) => (prev.has(gid) ? prev : new Set(prev).add(gid)));
    }

    // GrowGroup 社内用
    if (path.startsWith('/grow-internal/')) {
      setIsGrowInternalOpen(true);
    }
  }, [location.pathname]);

  const isActive = (path) => {
    return location.pathname === path;
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('ログアウトエラー:', error);
    }
  };

  const menuItems = [
    {
      navId: 'nav-dashboard',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
      label: 'ダッシュボード',
      path: '/dashboard',
    },
    {
      navId: 'nav-aichat',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
      label: 'AIチャット',
      path: '/ai-chat',
      lockedForFree: true,
    },
    {
      navId: 'nav-analysis',
      tourTarget: 'sidebar-analysis',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      label: '分析する',
      path: '/analysis',
      hasSubmenu: true,
      analysis: ANALYSIS_SUBMENU,
    },
    {
      navId: 'nav-improve',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      label: '改善する',
      path: '/improve',
      lockedForFree: true,
    },
    {
      navId: 'nav-reports',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
      ),
      label: '評価する',
      path: '/reports',
      lockedForFree: true,
    },
  ];

  // 「管理」ゾーン（区切り線なし・小見出しだけ）。アカウント設定は左下のユーザーメニューへ移動。
  const manageItems = [
    {
      navId: 'nav-sites',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0V12a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 12V5.25" />
        </svg>
      ),
      label: 'サイト管理',
      path: '/sites/list',
    },
  ];

  return (
    <>
    <aside className={`fixed left-0 top-0 z-40 h-screen border-r ${t.border} ${t.aside} transition-all duration-300 hidden md:block ${
      isSidebarOpen ? 'w-64' : 'w-16'
    }`}>
      {/* ロゴ */}
      <div className="flex h-20 items-center justify-center px-6">
        {isSidebarOpen ? (
          <Link to="/dashboard" className="flex items-center gap-2">
            <img
              src={logoImg}
              alt="GROW REPORTER"
              className={`h-10 w-auto ${t.logoFilter}`}
            />
          </Link>
        ) : (
          <Link to="/dashboard" className="flex items-center justify-center">
            <img src="/favicon.ico" alt="GROW REPORTER" className={`h-8 w-8 object-contain ${t.logoFilter}`} />
          </Link>
        )}
      </div>

      {/* ナビゲーション */}
      <nav data-tour="sidebar-nav" className={`overflow-y-auto py-4 scrollbar-hide ${
        isSidebarOpen ? 'h-[calc(100vh-16rem)] px-4' : 'h-[calc(100vh-17rem)] px-2'
      }`} style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        <ul className="space-y-2">
          {menuItems.map((item, index) => (
            <li key={index}>
              {item.hasSubmenu ? (
                <>
                  <button
                    id={item.navId}
                    data-tour={item.tourTarget}
                    onClick={() => isSidebarOpen && setIsAnalysisOpen(!isAnalysisOpen)}
                    className={`flex w-full items-center rounded-lg px-4 py-3 text-sm font-medium transition ${
                      isSidebarOpen ? 'justify-between' : 'justify-center'
                    } ${location.pathname.startsWith('/analysis') ? t.activeClass : `${t.menuText} ${t.menuHover}`}`}
                    title={!isSidebarOpen ? item.label : ''}
                  >
                    <div className={`flex items-center ${isSidebarOpen ? 'gap-3' : ''}`}>
                      {item.icon}
                      {isSidebarOpen && <span>{item.label}</span>}
                    </div>
                    {isSidebarOpen && (
                      <svg className={`h-4 w-4 ${t.chevron} transition-transform ${isAnalysisOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    )}
                  </button>
                  {isAnalysisOpen && isSidebarOpen && (
                    <div className="ml-3 mt-2 space-y-1 pl-2">
                      {/* AI総合分析（先頭にピン留め） */}
                      {(() => {
                        const ai = item.analysis.ai;
                        const aiGrad = { background: 'linear-gradient(90deg,rgba(55,88,249,0.08),rgba(139,92,246,0.08),rgba(236,72,153,0.08))' };
                        const aiInner = (
                          <>
                            <svg className="h-4 w-4 shrink-0 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.456-2.456L14.25 6l1.035-.259a3.375 3.375 0 002.456-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" /></svg>
                            <span className={`truncate font-medium ${t.subText}`}>{ai.label}</span>
                            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-primary via-purple-500 to-pink-500 text-[8px] font-bold leading-none text-white">AI</span>
                            {isFree && <svg className="ml-auto h-3.5 w-3.5 shrink-0 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>}
                          </>
                        );
                        return isFree ? (
                          <button type="button" onClick={() => setShowUpgradeModal(true)} style={aiGrad} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition">{aiInner}</button>
                        ) : (
                          <Link to={ai.path} style={aiGrad} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition">{aiInner}</Link>
                        );
                      })()}

                      {/* 全体サマリー（直リンク・2段組み・トグルなし） */}
                      <Link to={item.analysis.summary.path} className={`block rounded-lg px-4 py-2 transition ${isActive(item.analysis.summary.path) ? t.subActiveClass : t.subHover}`}>
                        <span className={`block truncate text-sm ${isActive(item.analysis.summary.path) ? 'font-semibold' : t.subText}`}>{item.analysis.summary.label}</span>
                        <span className="block truncate text-[11px] leading-tight text-slate-400">{item.analysis.summary.desc}</span>
                      </Link>

                      {/* 目的グループ（クリックで開閉・各リーフは2段組み） */}
                      {item.analysis.groups.map((g) => {
                        const leaves = (g.zones ? g.zones.flatMap((z) => z.items) : g.items).filter((it) => !it.adminOnly || isAdmin);
                        const groupActive = leaves.some((it) => isActive(it.path));
                        const open = isGroupOpen(g.id);
                        const renderLeaf = (it) => (
                          <Link key={it.path} to={it.path} className={`block rounded-lg px-4 py-1.5 transition ${isActive(it.path) ? t.subActiveClass : t.subHover}`}>
                            <span className={`block truncate text-sm ${isActive(it.path) ? 'font-semibold' : t.subText}`}>
                              {it.label}
                              {it.adminOnly && <span className="ml-1 rounded bg-slate-100 px-1 py-0.5 align-middle text-[9px] font-semibold text-slate-500">管理者</span>}
                            </span>
                            <span className="block truncate text-[11px] leading-tight text-slate-400">{it.desc}</span>
                          </Link>
                        );
                        return (
                          <div key={g.id}>
                            <button type="button" onClick={() => toggleGroup(g.id)} className={`flex w-full items-center justify-between rounded-lg px-4 py-2 transition ${groupActive ? t.subActiveClass : t.subHover}`}>
                              <span className="text-left">
                                <span className={`block truncate text-sm ${groupActive ? 'font-semibold' : t.subText}`}>{g.name}</span>
                                <span className="block truncate text-[11px] leading-tight text-slate-400">{g.sub}</span>
                              </span>
                              <svg className={`h-3 w-3 shrink-0 ${t.chevron} transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            </button>
                            {open && (
                              <div className="ml-2 mt-1 space-y-1 pl-2">
                                {g.zones
                                  ? g.zones.map((z, zi) => {
                                      const zItems = z.items.filter((it) => !it.adminOnly || isAdmin);
                                      if (zItems.length === 0) return null;
                                      return (
                                        <React.Fragment key={zi}>
                                          {zi > 0 && <div className={`mx-3 border-t ${t.subBorder}`} />}
                                          <div className={`px-4 pb-0.5 pt-1 text-[10px] font-semibold tracking-wide ${t.zoneLabel}`}>{z.name}</div>
                                          {zItems.map((it) => renderLeaf(it))}
                                        </React.Fragment>
                                      );
                                    })
                                  : leaves.map((it) => renderLeaf(it))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              ) : item.lockedForFree && isFree ? (
                <button
                  id={item.navId}
                  onClick={() => setShowUpgradeModal(true)}
                  className={`flex w-full items-center rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200 ${
                    isSidebarOpen ? 'gap-3' : 'justify-center'
                  } ${t.menuText} ${t.menuHover} opacity-60`}
                  title={!isSidebarOpen ? item.label : ''}
                >
                  {item.icon}
                  {isSidebarOpen && <span>{item.label}</span>}
                  {isSidebarOpen && <svg className="ml-auto h-3.5 w-3.5 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>}
                </button>
              ) : (
                <Link
                  id={item.navId}
                  to={item.path}
                  className={`flex items-center rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200 ${
                    isSidebarOpen ? 'gap-3' : 'justify-center'
                  } ${
                    isActive(item.path)
                      ? t.activeClass
                      : `${t.menuText} ${t.menuHover}`
                  }`}
                  title={!isSidebarOpen ? item.label : ''}
                >
                  {item.icon}
                  {isSidebarOpen && <span>{item.label}</span>}
                </Link>
              )}
            </li>
          ))}


          {/* 管理ゾーン（区切り線なし・小見出しだけ） */}
          {isSidebarOpen && (
            <li className={`px-4 pt-3 pb-1 text-[11px] font-semibold tracking-wide ${t.zoneLabel}`}>管理</li>
          )}
          {manageItems.map((item, mIdx) => (
            <li key={`m-${mIdx}`}>
              <Link
                id={item.navId}
                to={item.path}
                className={`flex items-center rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200 ${
                  isSidebarOpen ? 'gap-3' : 'justify-center'
                } ${isActive(item.path) ? t.activeClass : `${t.menuText} ${t.menuHover}`}`}
                title={!isSidebarOpen ? item.label : ''}
              >
                {item.icon}
                {isSidebarOpen && <span>{item.label}</span>}
              </Link>
            </li>
          ))}

          {/* 社内ゾーン（@grow-group.jp のみ表示・最下部） */}
          {isGrowStaff && (
            <>
              {isSidebarOpen && (
                <li className={`px-4 pt-3 pb-1 text-[11px] font-semibold tracking-wide ${t.zoneLabel}`}>社内</li>
              )}
              <li>
                <button
                  id="nav-grow-internal"
                  onClick={() => (isSidebarOpen ? setIsGrowInternalOpen(!isGrowInternalOpen) : navigate('/grow-internal/close-meeting'))}
                  className={`flex w-full items-center rounded-lg px-4 py-3 text-sm font-medium ${t.menuText} transition ${t.menuHover} ${
                    isSidebarOpen ? 'justify-between' : 'justify-center'
                  } ${location.pathname.startsWith('/grow-internal/') ? t.activeClass : ''}`}
                  title={!isSidebarOpen ? 'GrowGroup社内用' : ''}
                >
                  <div className={`flex items-center ${isSidebarOpen ? 'gap-3' : ''}`}>
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
                    </svg>
                    {isSidebarOpen && <span>GrowGroup社内用</span>}
                  </div>
                  {isSidebarOpen && (
                    <svg
                      className={`h-4 w-4 ${t.chevron} transition-transform ${isGrowInternalOpen ? 'rotate-180' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                </button>
                {isGrowInternalOpen && isSidebarOpen && (
                  <ul className="ml-3 mt-2 space-y-1 pl-2">
                    <li>
                      <Link
                        to="/grow-internal/close-meeting"
                        className={`block rounded-lg px-4 py-2 text-sm transition-all duration-200 ${
                          isActive('/grow-internal/close-meeting') ? t.subActiveClass : `${t.subText} ${t.subHover}`
                        }`}
                      >
                        クローズミーティング
                      </Link>
                    </li>
                  </ul>
                )}
              </li>
            </>
          )}

        </ul>
      </nav>

      {/* ユーザー情報 */}
      <div className={`absolute bottom-0 left-0 right-0 ${t.bottomBg}`}>
        <div className={isSidebarOpen ? 'p-4' : 'p-2'}>
          {/* ダーク/ライトモード切替 */}
          <div data-tour="sidebar-theme-toggle" className="mb-3 flex justify-center">
            <button
              onClick={toggleSidebarTheme}
              className="group relative flex h-7 w-14 items-center rounded-full transition-colors duration-300"
              style={{ backgroundColor: isDarkSidebar ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)' }}
              title={isDarkSidebar ? 'ライトモードに切替' : 'ダークモードに切替'}
            >
              <span
                className={`absolute flex h-5 w-5 items-center justify-center rounded-full shadow-sm transition-all duration-300 ${
                  isDarkSidebar
                    ? 'left-[30px] bg-slate-700'
                    : 'left-[4px] bg-white'
                }`}
              >
                {isDarkSidebar
                  ? <Moon className="h-3 w-3 text-slate-300" />
                  : <Sun className="h-3 w-3 text-amber-500" />
                }
              </span>
            </button>
          </div>

          {isSidebarOpen ? (
            /* 展開時: ユーザー欄クリックで「アカウント設定 / 管理者画面 / ログアウト」のメニュー */
            <div className="relative" ref={userMenuRef}>
              {isUserMenuOpen && (
                <div className={`absolute bottom-full left-0 right-0 z-50 mb-2 rounded-lg border ${t.popBorder} ${t.popBg} p-1 shadow-lg`}>
                  <button
                    onClick={() => { setIsUserMenuOpen(false); navigate('/account/settings'); }}
                    className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm transition ${t.menuText} ${t.menuHover}`}
                  >
                    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998-3.5A7.5 7.5 0 0 1 19.5 19.5H4.5Z" />
                    </svg>
                    アカウント設定
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => { setIsUserMenuOpen(false); navigate('/admin/dashboard'); }}
                      className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm transition ${t.menuText} ${t.menuHover}`}
                    >
                      <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      管理者画面
                    </button>
                  )}
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-red-500 transition hover:bg-red-500/10"
                  >
                    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    ログアウト
                  </button>
                </div>
              )}
              <button
                data-tour="sidebar-user-info"
                onClick={() => setIsUserMenuOpen((o) => !o)}
                className={`flex w-full items-center gap-3 rounded-lg p-2 transition ${t.userHover}`}
              >
                <Avatar
                  src={currentUser?.photoURL || null}
                  initials={!currentUser?.photoURL ? userInitial : undefined}
                  alt={getUserName()}
                  className="size-10 bg-primary text-white"
                />
                <div className="flex-1 min-w-0 text-left">
                  <p className={`truncate text-sm font-medium ${t.userName}`}>{getUserName()}</p>
                  <span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${planBadgeColor}`}>{planLabel}</span>
                </div>
                <svg className={`h-4 w-4 shrink-0 ${t.chevron} transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </button>
            </div>
          ) : (
            /* 折りたたみ時: アバター→アカウント設定 ＋ ログアウト/管理者画面アイコン */
            <>
              <button
                onClick={() => navigate('/account/settings')}
                className={`w-full rounded-lg transition ${t.userHover}`}
                title="アカウント設定"
              >
                <div className="flex flex-col items-center gap-1 p-1">
                  <Avatar
                    src={currentUser?.photoURL || null}
                    initials={!currentUser?.photoURL ? userInitial : undefined}
                    alt={getUserName()}
                    className="size-8 bg-primary text-white"
                  />
                  <span className={`inline-block rounded-full px-2 py-0.5 text-[8px] font-semibold ${planBadgeColor}`}>{planLabel}</span>
                </div>
              </button>
              <div className="mt-2 flex flex-col gap-1.5">
                <button
                  onClick={handleLogout}
                  className={`flex items-center justify-center rounded-md border px-2 py-1.5 text-xs font-medium transition ${t.logoutBtn}`}
                  title="ログアウト"
                >
                  <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
                {isAdmin && (
                  <button
                    onClick={() => navigate('/admin/dashboard')}
                    className={`flex items-center justify-center rounded-md ${t.adminBtn} transition px-2 py-1.5 text-xs font-medium`}
                    title="管理者画面"
                  >
                    <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </aside>

    {/* サイドバー開閉ボタン（境界線の中央に円形で表示） - スマホ非表示 */}
    <button
      onClick={toggleSidebar}
      className={`fixed top-1/2 z-40 hidden md:flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border shadow-md transition-all duration-300 ${t.toggleBtnBg} ${
        isSidebarOpen ? 'left-64' : 'left-16'
      }`}
      title={isSidebarOpen ? 'サイドバーを閉じる' : 'サイドバーを開く'}
    >
      {isSidebarOpen ? (
        <ChevronLeft className={`h-4 w-4 ${t.toggleBtnIcon}`} />
      ) : (
        <ChevronRight className={`h-4 w-4 ${t.toggleBtnIcon}`} />
      )}
    </button>

    {showUpgradeModal && <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} />}
    </>
  );
}
