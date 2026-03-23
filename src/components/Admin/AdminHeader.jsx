import { useAuth } from '../../contexts/AuthContext';
import { useAdmin } from '../../hooks/useAdmin';
import { getAdminRoleLabel } from '../../constants/adminRoles';
import { Shield } from 'lucide-react';

/**
 * アドミン画面のヘッダー
 * メインアプリのHeader.jsx に合わせたデザイン
 */
export default function AdminHeader() {
  const { currentUser, userProfile } = useAuth();
  const { adminRole } = useAdmin();

  const getUserName = () => {
    if (userProfile?.lastName && userProfile?.firstName) {
      return `${userProfile.lastName} ${userProfile.firstName}`;
    }
    return currentUser?.displayName || '管理者';
  };

  const userInitial = getUserName().charAt(0);

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-600';
      case 'editor':
        return 'bg-blue-100 text-blue-600';
      case 'viewer':
        return 'bg-gray-100 text-body-color';
      default:
        return 'bg-gray-100 text-body-color';
    }
  };

  return (
    <div className="bg-white border-b border-gray-200 h-20 glass-header sticky top-0 z-40">
      <div className="mx-auto max-w-content px-6 h-full flex items-center">
        <div className="flex items-center justify-between w-full">
          {/* タイトル */}
          <div>
            <h1 className="text-xl font-bold text-dark">
              管理画面
            </h1>
          </div>

          {/* 右側メニュー */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              {currentUser?.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt="Profile"
                  className="h-10 w-10 rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white text-sm font-semibold">
                  {userInitial}
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-dark">
                  {getUserName()}
                </p>
                {adminRole && (
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${getRoleBadgeColor(adminRole)}`}>
                    <Shield className="h-2.5 w-2.5" />
                    {getAdminRoleLabel(adminRole)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
