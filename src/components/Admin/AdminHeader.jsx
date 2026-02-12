import { useAuth } from '../../contexts/AuthContext';
import { Bell } from 'lucide-react';

/**
 * アドミン画面のヘッダー
 */
export default function AdminHeader() {
  const { currentUser, userProfile } = useAuth();

  // ユーザー名を取得（lastName + firstName 優先、なければdisplayName）
  const getUserName = () => {
    if (userProfile?.lastName && userProfile?.firstName) {
      return `${userProfile.lastName} ${userProfile.firstName}`;
    }
    return currentUser?.displayName || '管理者';
  };

  const userInitial = getUserName().charAt(0);

  return (
    <header className="sticky top-0 z-40 border-b border-stroke bg-white dark:border-dark-3 dark:bg-dark-2">
      <div className="flex h-20 items-center justify-between px-6">
        {/* タイトル */}
        <div>
          <h1 className="text-2xl font-bold text-dark dark:text-white">
            管理画面
          </h1>
          <p className="text-sm text-body-color dark:text-dark-6">
            システム全体の管理と監視
          </p>
        </div>

        {/* 右側メニュー */}
        <div className="flex items-center gap-4">
          {/* 通知アイコン */}
          <button className="relative rounded-full p-2 text-body-color transition hover:bg-gray-2 dark:hover:bg-dark-3">
            <Bell className="h-5 w-5" />
            {/* 通知バッジ（将来実装） */}
            {/* <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500"></span> */}
          </button>

          {/* ユーザー情報 */}
          <div className="flex items-center gap-3">
            {currentUser?.photoURL ? (
              <img 
                src={currentUser.photoURL} 
                alt="Profile" 
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white text-sm font-semibold">
                {userInitial}
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-dark dark:text-white">
                {getUserName()}
              </p>
              <p className="text-xs text-body-color">
                Administrator
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

