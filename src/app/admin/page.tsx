'use client';

/**
 * 🔐 管理者パネル
 * システム管理とユーザー管理
 */

import { useAuth } from '@/lib/auth/authContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { AdminService } from '@/lib/admin/adminService';
import type { AdminUserListItem } from '@/lib/admin/adminService';
import { UserActivityLog } from '@/types/user';
import { format } from 'date-fns';
import Loading from '@/components/common/Loading';
import TableWrapper, { TableCell } from '@/components/tailgrids/TableWrapper';
import { Button } from '@/components/ui/Button';

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [activeTab, setActiveTab] = useState('users');
  
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  
  const [activityLogs, setActivityLogs] = useState<(UserActivityLog & { userEmail: string })[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userLogs, setUserLogs] = useState<UserActivityLog[]>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
      return;
    }
    
    if (!user) return;
    
    checkAdminStatus();
  }, [user, authLoading, router]);

  const checkAdminStatus = async () => {
    if (!user) return;
    
    try {
      const adminStatus = await AdminService.isUserAdmin(user.uid);
      setIsAdmin(adminStatus);
      
      if (!adminStatus) {
        setError('管理者権限がありません');
      } else {
        await loadUsers();
        await loadActivityLogs();
      }
    } catch (err: any) {
      console.error('❌ 管理者権限確認エラー:', err);
      setError(err.message || '管理者権限の確認に失敗しました。');
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };
  
  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const usersData = await AdminService.getAllUsers();
      setUsers(usersData);
    } catch (err: any) {
      console.error('❌ ユーザー取得エラー:', err);
      setError(err.message || 'ユーザーリストの取得に失敗しました。');
    } finally {
      setLoadingUsers(false);
    }
  };
  
  const loadActivityLogs = async () => {
    setLoadingLogs(true);
    try {
      const logs = await AdminService.getAllRecentActivityLogs(100);
      setActivityLogs(logs);
    } catch (err: any) {
      console.error('❌ アクティビティログ取得エラー:', err);
      setError(err.message || 'アクティビティログの取得に失敗しました。');
    } finally {
      setLoadingLogs(false);
    }
  };
  
  const loadUserLogs = async (userId: string) => {
    try {
      const logs = await AdminService.getUserActivityLogs(userId, 50);
      setUserLogs(logs);
      setSelectedUserId(userId);
    } catch (err: any) {
      console.error('❌ ユーザーログ取得エラー:', err);
      alert(`エラー: ${err.message}`);
    }
  };
  
  const handleToggleAdminRole = async (userId: string, currentIsAdmin: boolean) => {
    const newStatus = !currentIsAdmin;
    if (!confirm(`管理者権限を${newStatus ? '付与' : '削除'}しますか？`)) return;
    
    try {
      await AdminService.updateUserAdminRole(userId, newStatus);
      alert(`管理者権限を${newStatus ? '付与' : '削除'}しました`);
      await loadUsers();
    } catch (err: any) {
      console.error('❌ 管理者権限更新エラー:', err);
      alert(`エラー: ${err.message}`);
    }
  };
  
  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-2 dark:bg-dark">
        <div className="text-center">
          <Loading size={64} />
          <p className="mt-4 text-body-color dark:text-dark-6">読み込み中...</p>
        </div>
      </div>
    );
  }
  
  if (!user || !isAdmin) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="max-w-md rounded-lg border border-stroke bg-white p-8 text-center dark:border-dark-3 dark:bg-dark-2">
            <svg className="mx-auto mb-4 h-16 w-16 text-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h4 className="mb-2 text-xl font-semibold text-dark dark:text-white">アクセス拒否</h4>
            <p className="mb-6 text-sm font-medium text-body-color dark:text-dark-6">このページにアクセスする権限がありません。</p>
            <button
              onClick={() => router.push('/dashboard')}
              className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-3 text-base font-medium text-white transition hover:bg-opacity-90"
            >
              ダッシュボードに戻る
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }
  
  return (
    <DashboardLayout>
      <div className="mx-auto max-w-screen-2xl p-4 md:p-6 2xl:p-10">
        {/* Page Header - Mega Template準拠 */}
        <div className="mb-9">
          <h2 className="mb-2 text-2xl font-semibold text-dark dark:text-white">
            管理者パネル
          </h2>
          <p className="text-sm font-medium text-body-color dark:text-dark-6">
            システム全体の管理機能
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-md border border-red-200 bg-red-50 p-3.5 dark:border-red-900/50 dark:bg-red-900/20">
            <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}
        
        {/* タブナビゲーション - Mega Template準拠 */}
        <div className="mb-6 flex gap-3 border-b border-stroke dark:border-dark-3">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-5 py-3 text-sm font-medium transition-colors ${
              activeTab === 'users'
                ? 'border-b-2 border-primary text-primary'
                : 'text-body-color hover:text-dark dark:text-dark-6 dark:hover:text-white'
            }`}
          >
            ユーザー管理
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-5 py-3 text-sm font-medium transition-colors ${
              activeTab === 'logs'
                ? 'border-b-2 border-primary text-primary'
                : 'text-body-color hover:text-dark dark:text-dark-6 dark:hover:text-white'
            }`}
          >
            アクティビティログ
          </button>
        </div>
          
        {/* ユーザー管理タブ - Mega Template準拠 */}
        {activeTab === 'users' && (
          <div className="rounded-lg border border-stroke bg-white dark:border-dark-3 dark:bg-dark-2">
            <div className="border-b border-stroke px-6 py-4 dark:border-dark-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-dark dark:text-white">
                  ユーザー一覧 ({users.length})
                </h3>
                <Button variant="primary" size="sm" onClick={loadUsers} loading={loadingUsers}>
                  🔄 再読み込み
                </Button>
              </div>
            </div>
            <div className="p-0">
              <TableWrapper
                headers={[
                  { name: 'ユーザー', styles: 'min-w-[200px]' },
                  { name: 'メール', styles: 'min-w-[200px]' },
                  { name: 'プラン', styles: 'min-w-[100px]' },
                  { name: 'ステータス', styles: 'min-w-[100px]' },
                  { name: '管理者', styles: 'min-w-[80px]' },
                  { name: '登録日', styles: 'min-w-[120px]' },
                  { name: '操作', styles: 'min-w-[100px]' },
                ]}
                data={users}
                renderRow={(user, index) => (
                  <tr key={user.uid}>
                    <td className="py-4 px-4 first:pl-6 last:pr-6">
                      <div className="flex items-center">
                        {user.photoURL ? (
                          <img src={user.photoURL} alt={user.displayName || ''} className="mr-3 h-10 w-10 rounded-full" />
                        ) : (
                          <div className="mr-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white">
                            {user.email[0].toUpperCase()}
                          </div>
                        )}
                        <span className="font-medium text-dark dark:text-white">{user.displayName || user.email}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 first:pl-6 last:pr-6">
                      <span className="text-body-color dark:text-dark-6">{user.email}</span>
                    </td>
                    <td className="py-4 px-4 first:pl-6 last:pr-6">
                      <span className="inline-block rounded-full bg-primary px-3 py-1 text-xs font-medium text-white">
                        {user.subscriptionPlan.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-4 px-4 first:pl-6 last:pr-6">
                      <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${
                        user.subscriptionStatus === 'active' 
                          ? 'bg-secondary text-white' 
                          : 'bg-[#F2994A] text-white'
                      }`}>
                        {user.subscriptionStatus}
                      </span>
                    </td>
                    <td className="py-4 px-4 first:pl-6 last:pr-6 text-center">
                      <button
                        onClick={() => handleToggleAdminRole(user.uid, user.isAdmin)}
                        className={`text-2xl transition-transform hover:scale-110 ${
                          user.isAdmin ? 'opacity-100' : 'opacity-30'
                        }`}
                      >
                        👑
                      </button>
                    </td>
                    <td className="py-4 px-4 first:pl-6 last:pr-6">
                      <span className="text-sm text-body-color dark:text-dark-6">
                        {user.createdAt?.toDate().toLocaleDateString('ja-JP') || 'N/A'}
                      </span>
                    </td>
                    <td className="py-4 px-4 first:pl-6 last:pr-6">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => loadUserLogs(user.uid)}
                      >
                        履歴
                      </Button>
                    </td>
                  </tr>
                )}
              />
            </div>
          </div>
        )}
          
          {/* アクティビティログタブ */}
          {activeTab === 'logs' && (
            <div className="rounded-lg border border-stroke bg-white dark:border-dark-3 dark:bg-dark-2">
              <div className="border-b border-stroke px-6 py-4 dark:border-dark-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-dark dark:text-white">
                    最近のアクティビティ ({activityLogs.length})
                  </h3>
                  <Button variant="primary" size="sm" onClick={loadActivityLogs} loading={loadingLogs}>
                    🔄 再読み込み
                  </Button>
                </div>
              </div>
              <div className="p-0">
                <TableWrapper
                  headers={[
                    { name: 'ユーザー', styles: 'min-w-[150px]' },
                    { name: 'タイプ', styles: 'min-w-[150px]' },
                    { name: '説明', styles: 'min-w-[300px]' },
                    { name: '日時', styles: 'min-w-[180px]' },
                  ]}
                  data={activityLogs}
                  renderRow={(log, index) => (
                    <tr key={index}>
                      <td className="py-4 px-4 first:pl-6 last:pr-6">
                        <span className="text-sm font-medium text-dark dark:text-white">{log.userEmail}</span>
                      </td>
                      <td className="py-4 px-4 first:pl-6 last:pr-6">
                        <span className="inline-block rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-dark dark:bg-dark-3 dark:text-white">
                          {log.type}
                        </span>
                      </td>
                      <td className="py-4 px-4 first:pl-6 last:pr-6">
                        <span className="text-sm text-body-color dark:text-dark-6">{log.description}</span>
                      </td>
                      <td className="py-4 px-4 first:pl-6 last:pr-6">
                        <span className="text-sm text-body-color dark:text-dark-6">
                          {log.timestamp?.toDate ? format(log.timestamp.toDate(), 'yyyy-MM-dd HH:mm:ss') : 'N/A'}
                        </span>
                      </td>
                    </tr>
                  )}
                />
              </div>
            </div>
          )}
          
          {/* ユーザー詳細ログモーダル */}
          {selectedUserId && userLogs.length > 0 && (
            <>
              <div
                className="fixed inset-0 z-40 bg-black/50"
                onClick={() => setSelectedUserId(null)}
              ></div>
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="w-full max-w-4xl max-h-[80vh] overflow-auto rounded-lg border border-stroke bg-white dark:border-dark-3 dark:bg-dark-2">
                  <div className="border-b border-stroke px-6 py-4 dark:border-dark-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-dark dark:text-white">
                        ユーザーアクティビティ履歴
                      </h3>
                      <button
                        onClick={() => setSelectedUserId(null)}
                        className="text-body-color hover:text-dark dark:text-dark-6 dark:hover:text-white"
                      >
                        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="p-0">
                    <TableWrapper
                      headers={[
                        { name: 'タイプ', styles: 'min-w-[150px]' },
                        { name: '説明', styles: 'min-w-[300px]' },
                        { name: '日時', styles: 'min-w-[180px]' },
                      ]}
                      data={userLogs}
                      renderRow={(log, index) => (
                        <tr key={index}>
                          <td className="py-4 px-4 first:pl-6 last:pr-6">
                            <span className="text-sm font-medium text-dark dark:text-white">{log.type}</span>
                          </td>
                          <td className="py-4 px-4 first:pl-6 last:pr-6">
                            <span className="text-sm text-body-color dark:text-dark-6">{log.description}</span>
                          </td>
                          <td className="py-4 px-4 first:pl-6 last:pr-6">
                            <span className="text-sm text-body-color dark:text-dark-6">
                              {log.timestamp?.toDate ? format(log.timestamp.toDate(), 'yyyy-MM-dd HH:mm:ss') : 'N/A'}
                            </span>
                          </td>
                        </tr>
                      )}
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </DashboardLayout>
    );
  }
