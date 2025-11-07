import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { setPageTitle } from '../../../utils/pageTitle';
import { useAdminSites } from '../../../hooks/useAdminSites';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import ErrorAlert from '../../../components/common/ErrorAlert';
import { Search, Download, ChevronLeft, ChevronRight, Globe, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

/**
 * サイト管理一覧
 */
export default function AdminSiteList() {
  const navigate = useNavigate();
  const { sites, pagination, stats, loading, error, refetch, setParams, currentParams } = useAdminSites();
  const [searchInput, setSearchInput] = useState('');

  useEffect(() => {
    setPageTitle('サイト管理');
  }, []);

  // 検索実行
  const handleSearch = () => {
    setParams({ searchQuery: searchInput, page: 1 });
  };

  // ページ変更
  const handlePageChange = (newPage) => {
    setParams({ page: newPage });
  };

  // CSVエクスポート
  const handleExportCSV = () => {
    if (!sites || sites.length === 0) return;

    const csvHeaders = ['サイトID', 'サイト名', 'URL', 'ユーザー名', 'メールアドレス', '業種', 'サイトタイプ', 'GA4', 'GSC', '登録日'];
    const csvRows = sites.map((site) => [
      site.siteId,
      site.siteName || '',
      site.siteUrl || '',
      site.userName || '',
      site.userEmail || '',
      site.industry || '',
      site.siteType || '',
      site.hasGA4 ? '設定済' : '未設定',
      site.hasGSC ? '設定済' : '未設定',
      site.createdAt ? new Date(site.createdAt).toLocaleDateString('ja-JP') : '',
    ]);

    const csvContent = [csvHeaders, ...csvRows]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');

    const bom = '\uFEFF';
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sites_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // サイト詳細へ遷移
  const handleSiteClick = (siteId) => {
    navigate(`/admin/sites/${siteId}`);
  };

  if (loading && !sites) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div>
      {/* ヘッダー */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-dark dark:text-white">サイト管理</h2>
        <p className="mt-1 text-sm text-body-color dark:text-dark-6">
          全サイトの管理と詳細確認
        </p>
      </div>

      {error && (
        <div className="mb-6">
          <ErrorAlert message={error} onRetry={refetch} />
        </div>
      )}

      {/* 統計情報 */}
      {stats && stats.orphanCount > 0 && (
        <div className="mb-6 rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-900/50 dark:bg-orange-900/20">
          <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
            <AlertTriangle className="h-5 w-5" />
            <span className="font-medium">
              孤立サイト {stats.orphanCount}件が見つかりました
            </span>
          </div>
          <p className="mt-1 text-sm text-orange-600/80 dark:text-orange-400/80">
            ユーザーが削除されたサイトです。確認して削除してください。
          </p>
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
                placeholder="サイト名、URL、ユーザー名で検索..."
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

          {/* CSVエクスポート */}
          <button
            onClick={handleExportCSV}
            disabled={!sites || sites.length === 0}
            className="flex items-center gap-2 rounded-lg border border-stroke bg-white px-4 py-2 text-sm font-medium text-dark transition hover:bg-gray-2 disabled:opacity-50 dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:hover:bg-dark-3"
          >
            <Download className="h-4 w-4" />
            <span>CSVエクスポート</span>
          </button>
        </div>
      </div>

      {/* サイト一覧テーブル */}
      <div className="rounded-lg border border-stroke bg-white shadow-sm dark:border-dark-3 dark:bg-dark-2">
        {loading ? (
          <div className="flex min-h-[400px] items-center justify-center">
            <LoadingSpinner />
          </div>
        ) : sites && sites.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-stroke bg-gray-2 dark:border-dark-3 dark:bg-dark-3">
                    <th className="px-4 py-4 text-left text-sm font-semibold text-dark dark:text-white">
                      サイト情報
                    </th>
                    <th className="px-4 py-4 text-left text-sm font-semibold text-dark dark:text-white">
                      ユーザー
                    </th>
                    <th className="px-4 py-4 text-center text-sm font-semibold text-dark dark:text-white">
                      データ収集
                    </th>
                    <th className="px-4 py-4 text-left text-sm font-semibold text-dark dark:text-white">
                      登録日
                    </th>
                    <th className="px-4 py-4 text-center text-sm font-semibold text-dark dark:text-white">
                      ステータス
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sites.map((site) => (
                    <tr
                      key={site.siteId}
                      onClick={() => handleSiteClick(site.siteId)}
                      className="cursor-pointer border-b border-stroke transition hover:bg-gray-1 dark:border-dark-3 dark:hover:bg-dark-3"
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                            <Globe className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <div className="font-medium text-dark dark:text-white">
                              {site.siteName || '名称未設定'}
                            </div>
                            <div className="text-xs text-body-color dark:text-dark-6">
                              {site.siteUrl}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div>
                          <div className="text-sm text-dark dark:text-white">
                            {site.userName}
                          </div>
                          <div className="text-xs text-body-color dark:text-dark-6">
                            {site.userEmail}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex justify-center gap-2">
                          {site.hasGA4 ? (
                            <CheckCircle className="h-5 w-5 text-green-500" title="GA4設定済" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-500" title="GA4未設定" />
                          )}
                          {site.hasGSC ? (
                            <CheckCircle className="h-5 w-5 text-green-500" title="GSC設定済" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-500" title="GSC未設定" />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-body-color dark:text-dark-6">
                        {site.createdAt
                          ? new Date(site.createdAt).toLocaleString('ja-JP', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '-'}
                      </td>
                      <td className="px-4 py-4 text-center">
                        {site.isOrphan ? (
                          <span className="inline-flex rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-600 dark:bg-red-900/20 dark:text-red-400">
                            孤立
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-600 dark:bg-green-900/20 dark:text-green-400">
                            正常
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ページネーション */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-stroke p-4 dark:border-dark-3">
                <div className="text-sm text-body-color dark:text-dark-6">
                  {pagination.totalCount}件中 {(pagination.currentPage - 1) * pagination.limit + 1}-
                  {Math.min(pagination.currentPage * pagination.limit, pagination.totalCount)}件を表示
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePageChange(pagination.currentPage - 1)}
                    disabled={!pagination.hasPrevPage}
                    className="flex items-center gap-1 rounded-lg border border-stroke bg-white px-3 py-2 text-sm font-medium text-dark transition hover:bg-gray-2 disabled:opacity-50 dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:hover:bg-dark-3"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span>前へ</span>
                  </button>
                  <div className="text-sm text-body-color dark:text-dark-6">
                    {pagination.currentPage} / {pagination.totalPages}
                  </div>
                  <button
                    onClick={() => handlePageChange(pagination.currentPage + 1)}
                    disabled={!pagination.hasNextPage}
                    className="flex items-center gap-1 rounded-lg border border-stroke bg-white px-3 py-2 text-sm font-medium text-dark transition hover:bg-gray-2 disabled:opacity-50 dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:hover:bg-dark-3"
                  >
                    <span>次へ</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex min-h-[400px] items-center justify-center p-12">
            <div className="text-center">
              <Globe className="mx-auto mb-4 h-12 w-12 text-body-color/50" />
              <p className="text-body-color dark:text-dark-6">サイトが見つかりませんでした</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
