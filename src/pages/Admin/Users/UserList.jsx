import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { setPageTitle } from '../../../utils/pageTitle';
import { useAdminUsers } from '../../../hooks/useAdminUsers';
import { getPlanDisplayName } from '../../../constants/plans';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import ErrorAlert from '../../../components/common/ErrorAlert';
import PlanChangeModal from '../../../components/Admin/PlanChangeModal';
import { Search, Download, ChevronLeft, ChevronRight, Edit2 } from 'lucide-react';

/**
 * ユーザー一覧
 */
export default function UserList() {
  const navigate = useNavigate();
  const { users, pagination, loading, error, refetch, setParams, currentParams } = useAdminUsers();
  const [searchInput, setSearchInput] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    setPageTitle('ユーザー管理');
  }, []);

  // 検索実行
  const handleSearch = () => {
    setParams({ searchQuery: searchInput, page: 1 });
  };

  // プランフィルタ変更
  const handlePlanFilter = (plan) => {
    setParams({ planFilter: plan, page: 1 });
  };

  // ページ変更
  const handlePageChange = (newPage) => {
    setParams({ page: newPage });
  };

  // CSVエクスポート
  const handleExportCSV = () => {
    if (!users || users.length === 0) return;

    const csvHeaders = ['UID', '名前', 'メールアドレス', 'プラン', '登録日', '最終ログイン', 'サイト数', 'AI分析使用', 'AI改善使用'];
    const csvRows = users.map((user) => [
      user.uid,
      user.displayName || '',
      user.email || '',
      getPlanDisplayName(user.plan),
      user.createdAt ? new Date(user.createdAt).toLocaleDateString('ja-JP') : '',
      user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString('ja-JP') : '',
      user.siteCount || 0,
      user.aiSummaryUsage || 0,
      user.aiImprovementUsage || 0,
    ]);

    const csvContent = [csvHeaders, ...csvRows]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');

    const bom = '\uFEFF';
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `users_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // ユーザー詳細へ遷移
  const handleUserClick = (uid) => {
    navigate(`/admin/users/${uid}`);
  };

  // プラン変更モーダルを開く
  const handleOpenPlanModal = (e, user) => {
    e.stopPropagation(); // 行クリックイベントを止める
    setSelectedUser(user);
    setShowPlanModal(true);
  };

  // プラン変更成功
  const handlePlanChangeSuccess = (message) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 5000);
    refetch(); // ユーザー一覧を再取得
  };

  // プランバッジの色
  const getPlanBadgeColor = (plan) => {
    switch (plan) {
      case 'free':
        return 'bg-gradient-to-r from-blue-400 to-blue-600 text-white shadow-md';
      case 'standard':
        return 'bg-gradient-to-r from-red-400 to-pink-600 text-white shadow-md';
      case 'premium':
        return 'bg-gradient-to-r from-amber-400 to-yellow-500 text-white shadow-md';
      default:
        return 'bg-gray-200 text-gray-700';
    }
  };

  return (
    <div>
      {/* ヘッダー */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-dark dark:text-white">ユーザー管理</h2>
        <p className="mt-1 text-sm text-body-color dark:text-dark-6">
          全ユーザーの管理と詳細確認
        </p>
      </div>

      {/* 成功メッセージ */}
      {successMessage && (
        <div className="mb-4 rounded-lg bg-green-50 p-4 text-sm text-green-600 dark:bg-green-900/20">
          {successMessage}
        </div>
      )}

      {/* 検索・フィルタ */}
      <div className="mb-6 rounded-lg border border-stroke bg-white p-4 dark:border-dark-3 dark:bg-dark-2">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          {/* 検索 */}
          <div className="flex flex-1 gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-body-color" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="名前、メール、UIDで検索..."
                className="w-full rounded-lg border border-stroke bg-white py-2 pl-10 pr-4 text-sm focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark dark:text-white"
              />
            </div>
            <button
              onClick={handleSearch}
              className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-white transition hover:bg-primary/90"
            >
              検索
            </button>
          </div>

          {/* プランフィルタ */}
          <div className="flex gap-2">
            {['all', 'free', 'standard', 'premium'].map((plan) => (
              <button
                key={plan}
                onClick={() => handlePlanFilter(plan)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                  currentParams.planFilter === plan
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-body-color hover:bg-gray-200 dark:bg-dark-3 dark:text-dark-6 dark:hover:bg-dark'
                }`}
              >
                {plan === 'all' ? 'すべて' : getPlanDisplayName(plan)}
              </button>
            ))}
          </div>

          {/* CSVエクスポート */}
          <button
            onClick={handleExportCSV}
            disabled={!users || users.length === 0}
            className="flex items-center gap-2 rounded-lg border border-stroke bg-white px-4 py-2 text-sm font-medium text-dark transition hover:bg-gray-2 disabled:opacity-50 dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:hover:bg-dark-3"
          >
            <Download className="h-4 w-4" />
            CSVエクスポート
          </button>
        </div>
      </div>

      {/* ユーザーテーブル */}
      {loading ? (
        <div className="flex min-h-[400px] items-center justify-center">
          <LoadingSpinner />
        </div>
      ) : error ? (
        <ErrorAlert message={error} onRetry={refetch} />
      ) : users && users.length > 0 ? (
        <>
          <div className="overflow-hidden rounded-lg border border-stroke bg-white shadow-sm dark:border-dark-3 dark:bg-dark-2">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-stroke bg-gray-50 dark:border-dark-3 dark:bg-dark-3">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-dark dark:text-white">
                      ユーザー
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-dark dark:text-white">
                      プラン
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-dark dark:text-white">
                      サイト数
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-dark dark:text-white">
                      AI使用
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-dark dark:text-white">
                      登録日
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-dark dark:text-white">
                      最終ログイン
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-dark dark:text-white">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr
                      key={user.uid}
                      onClick={() => handleUserClick(user.uid)}
                      className="cursor-pointer border-b border-stroke transition hover:bg-gray-50 dark:border-dark-3 dark:hover:bg-dark-3"
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          {user.photoURL ? (
                            <img
                              src={user.photoURL}
                              alt={user.displayName}
                              className="h-10 w-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                              {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-medium text-dark dark:text-white">
                              {user.displayName || 'Unknown'}
                            </p>
                            <p className="text-xs text-body-color dark:text-dark-6">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${getPlanBadgeColor(user.plan)}`}>
                          {getPlanDisplayName(user.plan)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center text-sm text-dark dark:text-white">
                        {user.siteCount || 0}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <div className="text-xs text-body-color dark:text-dark-6">
                          <div>分析: {user.aiSummaryUsage || 0}</div>
                          <div>改善: {user.aiImprovementUsage || 0}</div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-body-color dark:text-dark-6">
                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString('ja-JP') : '-'}
                      </td>
                      <td className="px-4 py-4 text-sm text-body-color dark:text-dark-6">
                        {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString('ja-JP') : '-'}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <button
                          onClick={(e) => handleOpenPlanModal(e, user)}
                          className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition hover:bg-primary/20"
                        >
                          <Edit2 className="h-3 w-3" />
                          プラン変更
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ページネーション */}
          {pagination && pagination.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between rounded-lg border border-stroke bg-white px-4 py-3 dark:border-dark-3 dark:bg-dark-2">
              <p className="text-sm text-body-color dark:text-dark-6">
                {pagination.totalCount}件中 {((pagination.currentPage - 1) * pagination.limit) + 1}
                〜{Math.min(pagination.currentPage * pagination.limit, pagination.totalCount)}件を表示
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                  disabled={!pagination.hasPrevPage}
                  className="flex items-center gap-1 rounded-lg border border-stroke bg-white px-3 py-2 text-sm font-medium text-dark transition hover:bg-gray-2 disabled:opacity-50 dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:hover:bg-dark-3"
                >
                  <ChevronLeft className="h-4 w-4" />
                  前へ
                </button>
                <span className="flex items-center px-3 text-sm text-body-color dark:text-dark-6">
                  {pagination.currentPage} / {pagination.totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                  disabled={!pagination.hasNextPage}
                  className="flex items-center gap-1 rounded-lg border border-stroke bg-white px-3 py-2 text-sm font-medium text-dark transition hover:bg-gray-2 disabled:opacity-50 dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:hover:bg-dark-3"
                >
                  次へ
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="rounded-lg border border-stroke bg-white p-12 text-center dark:border-dark-3 dark:bg-dark-2">
          <p className="text-body-color dark:text-dark-6">
            {searchInput || currentParams.planFilter !== 'all'
              ? '該当するユーザーが見つかりませんでした'
              : 'ユーザーが登録されていません'}
          </p>
        </div>
      )}

      {/* プラン変更モーダル */}
      {showPlanModal && selectedUser && (
        <PlanChangeModal
          user={selectedUser}
          onClose={() => {
            setShowPlanModal(false);
            setSelectedUser(null);
          }}
          onSuccess={handlePlanChangeSuccess}
        />
      )}
    </div>
  );
}

