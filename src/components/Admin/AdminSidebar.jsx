import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Globe, 
  FileText, 
  Settings,
  CreditCard
} from 'lucide-react';
import logoImg from '../../assets/img/logo.svg';

/**
 * アドミン画面のサイドバー
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
      icon: FileText,
      label: 'ログ',
      path: '/admin/logs',
    },
    {
      icon: CreditCard,
      label: 'プラン設定',
      path: '/admin/settings/plans',
    },
    {
      icon: Settings,
      label: '管理者設定',
      path: '/admin/settings',
    },
  ];

  const isActive = (path) => {
    // 完全一致をチェック
    if (location.pathname === path) {
      return true;
    }
    
    // /admin/settings は完全一致のみアクティブ（子パス /admin/settings/plans を除外）
    if (path === '/admin/settings') {
      return false;
    }
    
    // その他のパスは子パスもアクティブ
    return location.pathname.startsWith(path + '/');
  };

  return (
    <aside className="flex h-screen w-64 flex-shrink-0 flex-col border-r border-stroke bg-white dark:border-dark-3 dark:bg-dark-2">
      {/* ロゴ */}
      <div className="flex h-20 flex-shrink-0 items-center justify-center border-b border-stroke px-6 dark:border-dark-3">
        <Link to="/admin/dashboard" className="flex items-center gap-2">
          <img 
            src={logoImg} 
            alt="GROW REPORTER" 
            className="h-10 w-auto"
          />
          <span className="text-sm font-medium text-primary">Admin</span>
        </Link>
      </div>

      {/* ナビゲーション */}
      <nav className="flex-1 overflow-y-auto px-4 py-6">
        <ul className="space-y-2">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <li key={index}>
                <Link
                  to={item.path}
                  className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition ${
                    isActive(item.path)
                      ? 'bg-primary text-white'
                      : 'text-dark hover:bg-gray-2 dark:text-white dark:hover:bg-dark-3'
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
        <div className="mt-8 border-t border-stroke pt-4 dark:border-dark-3">
          <Link
            to="/dashboard"
            className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-body-color transition hover:bg-gray-2 dark:hover:bg-dark-3"
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


