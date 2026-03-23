import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Globe,
  FileText,
  Settings,
  Mail,
  CreditCard
} from 'lucide-react';
import logoImg from '../../assets/img/logo.svg';

/**
 * アドミン画面のサイドバー
 * メインアプリのSidebar (white theme) に合わせたデザイン
 */
export default function AdminSidebar() {
  const location = useLocation();

  const menuItems = [
    {
      icon: LayoutDashboard,
      label: 'ダッシュボード',
      path: '/admin/dashboard',
    },
    {
      icon: Users,
      label: 'ユーザー管理',
      path: '/admin/users',
    },
    {
      icon: Globe,
      label: 'サイト管理',
      path: '/admin/sites',
    },
    {
      icon: CreditCard,
      label: 'プラン一覧',
      path: '/admin/plans',
    },
    {
      icon: FileText,
      label: 'ログ',
      path: '/admin/logs',
    },
    {
      icon: Mail,
      label: 'メール通知設定',
      path: '/admin/mail',
    },
    {
      icon: Settings,
      label: '管理者設定',
      path: '/admin/settings',
    },
  ];

  const isActive = (path) => {
    if (location.pathname === path) {
      return true;
    }
    return location.pathname.startsWith(path + '/');
  };

  return (
    <aside className="flex h-screen w-64 flex-shrink-0 flex-col border-r border-stroke/60 bg-white">
      {/* ロゴ */}
      <div className="flex h-20 items-center justify-center px-6">
        <Link to="/admin/dashboard" className="flex items-center gap-2">
          <img
            src={logoImg}
            alt="GROW REPORTER"
            className="h-10 w-auto"
          />
        </Link>
      </div>

      {/* ナビゲーション */}
      <nav className="flex-1 overflow-y-auto px-4 py-4">
        <ul className="space-y-2">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <li key={index}>
                <Link
                  to={item.path}
                  className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200 ${
                    isActive(item.path)
                      ? 'sidebar-active-white text-primary font-semibold'
                      : 'text-slate-700 hover:bg-[rgba(55,88,249,0.05)]'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>

        {/* 通常画面へ戻る */}
        <div className="mt-8 border-t border-stroke/60 pt-4">
          <Link
            to="/dashboard"
            className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-slate-400 transition hover:bg-[rgba(55,88,249,0.05)] hover:text-slate-600"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>通常画面へ戻る</span>
          </Link>
        </div>
      </nav>
    </aside>
  );
}
