import { useEffect, useState } from 'react';
import { setPageTitle } from '../../../utils/pageTitle';
import { useAuth } from '../../../contexts/AuthContext';
import { useAdmin } from '../../../hooks/useAdmin';
import { useAdminManagement } from '../../../hooks/useAdminManagement';
import { getAdminRoleLabel, hasPermission } from '../../../constants/adminRoles';
import AdminRoleModal from '../../../components/Admin/AdminRoleModal';
import AddAdminModal from '../../../components/Admin/AddAdminModal';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import ErrorAlert from '../../../components/common/ErrorAlert';
import { Settings, UserPlus, Shield, Edit2, Trash2, AlertCircle } from 'lucide-react';

/**
 * 管理者一覧・管理画面
 */
export default function AdminSettings() {
  const { userProfile } = useAuth();
  const { adminRole } = useAdmin();
  const { admins, loading, error, refetch, updateRole, deleteAdmin } = useAdminManagement();
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    setPageTitle('管理者設定');
  }, []);

  // 権限チェック
  const canAddAdmin = hasPermission(adminRole, 'ADD_ADMIN');
  const canEditRole = hasPermission(adminRole, 'EDIT_ADMIN_ROLE');
  const canDeleteAdmin = hasPermission(adminRole, 'DELETE_ADMIN');

  // ロール変更
  const handleRoleChange = async (adminId, newRole, reason) => {
    try {
      await updateRole(adminId, newRole, reason);
      setSuccessMessage('管理者のロールを変更しました');
      setTimeout(() => setSuccessMessage(''), 5000);
      setShowRoleModal(false);
      refetch();
    } catch (err) {
      console.error('ロール変更エラー:', err);
    }
  };

  // 管理者削除
  const handleDelete = async (admin) => {
    if (!confirm(`${getAdminName(admin)}さんを管理者から削除してもよろしいですか？`)) {
      return;
    }

    try {
      await deleteAdmin(admin.uid, '管理者による削除');
      setSuccessMessage('管理者を削除しました');
      setTimeout(() => setSuccessMessage(''), 5000);
      refetch();
    } catch (err) {
      console.error('管理者削除エラー:', err);
    }
  };

  // 管理者追加成功
  const handleAddSuccess = (message) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 5000);
    setShowAddModal(false);
    refetch();
  };

  // ユーザー名を取得（lastName + firstName 優先、なければdisplayName）
  const getAdminName = (admin) => {
    if (admin.lastName && admin.firstName) {
      return `${admin.lastName} ${admin.firstName}`;
    }
    return admin.displayName || '名前未設定';
  };

  // ロールバッジの色
  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400';
      case 'editor':
        return 'bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400';
      case 'viewer':
        return 'bg-gray-100 text-gray-600 dark:bg-gray-900/20 dark:text-gray-400';
      default:
        return 'bg-gray-100 text-gray-600 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return <ErrorAlert message={error} />;
  }

  return (
    <div>
      {/* ヘッダー */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-dark dark:text-white">管理者設定</h2>
          <p className="mt-1 text-sm text-body-color dark:text-dark-6">
            管理者の追加・削除・権限管理
          </p>
        </div>
        {canAddAdmin && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary/90"
          >
            <UserPlus className="h-4 w-4" />
            管理者を追加
          </button>
        )}
      </div>

      {/* 成功メッセージ */}
      {successMessage && (
        <div className="mb-4 rounded-lg bg-green-50 p-4 text-sm text-green-600 dark:bg-green-900/20">
          {successMessage}
        </div>
      )}

      {/* 権限について */}
      {!canAddAdmin && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-orange-50 p-4 text-sm text-orange-600 dark:bg-orange-900/20">
          <AlertCircle className="h-5 w-5" />
          <span>管理者の追加・削除・権限変更は「管理者」ロールのみ可能です。</span>
        </div>
      )}

      {/* 管理者一覧 */}
      <div className="rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
        <div className="mb-4 flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-dark dark:text-white">
            管理者一覧 ({admins?.length || 0}名)
          </h3>
        </div>

        {admins && admins.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-stroke bg-gray-50 dark:border-dark-3 dark:bg-dark-3">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-dark dark:text-white">
                    管理者
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-dark dark:text-white">
                    メールアドレス
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-dark dark:text-white">
                    ロール
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-dark dark:text-white">
                    追加日
                  </th>
                  {(canEditRole || canDeleteAdmin) && (
                    <th className="px-4 py-3 text-right text-xs font-semibold text-dark dark:text-white">
                      操作
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {admins.map((admin) => (
                  <tr key={admin.uid} className="border-b border-stroke dark:border-dark-3">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {admin.photoURL ? (
                          <img
                            src={admin.photoURL}
                            alt={getAdminName(admin)}
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                            {getAdminName(admin).charAt(0)}
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-dark dark:text-white">
                            {getAdminName(admin)}
                          </div>
                          {admin.uid === userProfile?.uid && (
                            <span className="text-xs text-primary">(あなた)</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-body-color dark:text-dark-6">
                      {admin.email}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${getRoleBadgeColor(admin.role)}`}>
                        <Shield className="h-3 w-3" />
                        {getAdminRoleLabel(admin.role)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-body-color dark:text-dark-6">
                      {admin.createdAt ? new Date(admin.createdAt).toLocaleDateString('ja-JP') : '-'}
                    </td>
                    {(canEditRole || canDeleteAdmin) && (
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          {canEditRole && admin.uid !== userProfile?.uid && (
                            <button
                              onClick={() => {
                                setSelectedAdmin(admin);
                                setShowRoleModal(true);
                              }}
                              className="rounded-lg p-2 text-blue-600 transition hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
                              title="ロール変更"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                          )}
                          {canDeleteAdmin && admin.uid !== userProfile?.uid && (
                            <button
                              onClick={() => handleDelete(admin)}
                              className="rounded-lg p-2 text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                              title="削除"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center text-body-color dark:text-dark-6">管理者が登録されていません</p>
        )}
      </div>

      {/* ロール変更モーダル */}
      {showRoleModal && selectedAdmin && (
        <AdminRoleModal
          admin={selectedAdmin}
          onClose={() => {
            setShowRoleModal(false);
            setSelectedAdmin(null);
          }}
          onSave={handleRoleChange}
        />
      )}

      {/* 管理者追加モーダル */}
      {showAddModal && (
        <AddAdminModal
          onClose={() => setShowAddModal(false)}
          onSuccess={handleAddSuccess}
        />
      )}
    </div>
  );
}
