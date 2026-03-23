import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../../config/firebase';
import { setPageTitle } from '../../../utils/pageTitle';
import { useAdminSites } from '../../../hooks/useAdminSites';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import ErrorAlert from '../../../components/common/ErrorAlert';
import { Search, Download, ChevronLeft, ChevronRight, Globe, AlertTriangle, CheckCircle, XCircle, BarChart3, Trash2, AlertCircle } from 'lucide-react';
import { SITE_PURPOSES } from '../../../constants/siteOptions';

/**
 * サイト管理一覧
 */
export default function AdminSiteList() {
  const navigate = useNavigate();
  const { sites, pagination, stats, loading, error, refetch, setParams, currentParams } = useAdminSites();
  const [searchInput, setSearchInput] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

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

    const csvHeaders = ['サイトID', 'サイト名', 'URL', 'ユーザー名', 'メールアドレス', '業界・業種', 'サイト種別', 'サイトの目的', 'GA4', 'GSC', '登録日'];
    const csvRows = sites.map((site) => {
      const industryStr = Array.isArray(site.industry) && site.industry.length > 0 ? site.industry.join('、') : (site.userIndustry || '');
      const purposeStr = Array.isArray(site.sitePurpose) && site.sitePurpose.length > 0
        ? site.sitePurpose.map((v) => SITE_PURPOSES.find((p) => p.value === v)?.label ?? v).join('、')
        : '';
      return [
        site.siteId,
        site.siteName || '',
        site.siteUrl || '',
        site.userName || '',
        site.userEmail || '',
        industryStr,
        site.siteType || '',
        purposeStr,
        site.hasGA4 ? '設定済' : '未設定',
        site.hasGSC ? '設定済' : '未設定',
        site.createdAt ? new Date(site.createdAt).toLocaleDateString('ja-JP') : '',
      ];
    });

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

  // サイト削除実行
  const handleDeleteSite = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    setDeleteError(null);

    try {
      const adminDeleteSite = httpsCallable(functions, 'adminDeleteSite');
      const result = await adminDeleteSite({ siteId: deleteTarget.siteId });

      if (result.data.success) {
        setSuccessMessage(result.data.message);
        setTimeout(() => setSuccessMessage(''), 5000);
        setDeleteTarget(null);
        refetch();
      }
    } catch (err) {
      console.error('サイト削除エラー:', err);
      setDeleteError(err.message || 'サイトの削除に失敗しました');
    } finally {
      setDeleteLoading(false);
    }
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

      {/* 成功メッセージ */}
      {successMessage && (
        <div className="mb-4 rounded-lg bg-green-50 p-4 text-sm text-green-600 dark:bg-green-900/20">
          {successMessage}
        </div>
      )}

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
                className="w-full rounded-lg border border-stroke bg-white py-2 pl-10 pr-4 text-sm transition-all duration-200 focus:border-primary-mid focus:outline-none focus:ring-2 focus:ring-primary-mid/20 dark:border-dark-3 dark:bg-dark dark:text-white"
              />
            </div>
            <button
              onClick={handleSearch}
              className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-white transition hover:bg-opacity-90"
            >
              検索
            </button>
          </div>

          {/* CSVエクスポート */}
          <button
            onClick={handleExportCSV}
            disabled={!sites || sites.length === 0}
            className="flex items-center gap-2 rounded-lg border border-stroke bg-white px-4 py-2 text-sm font-medium text-dark transition hover:bg-gray-100 disabled:opacity-50 dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:hover:bg-dark-3"
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
                  <tr className="border-b-2 border-primary-mid/20 bg-gradient-to-r from-primary-blue/5 to-primary-purple/5">
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
                    <th className="px-4 py-4 text-center text-sm font-semibold text-dark dark:text-white">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sites.map((site) => (
                    <tr
                      key={site.siteId}
                      className="border-b border-stroke transition hover:bg-gray-1 dark:border-dark-3 dark:hover:bg-dark-3"
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
                          {site.userCompany && (
                            <div className="text-xs font-medium text-primary">
                              {site.userCompany}
                            </div>
                          )}
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
                      <td className="px-4 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSiteClick(site.siteId);
                            }}
                            className="rounded-lg border border-stroke bg-white px-3 py-1.5 text-xs font-medium text-dark transition hover:bg-gray-100 dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:hover:bg-dark-3"
                            title="サイト詳細"
                          >
                            詳細
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTarget(site);
                            }}
                            className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-500 transition hover:bg-red-50 dark:border-red-900/50 dark:bg-dark-2 dark:hover:bg-red-900/20"
                            title="サイト削除"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                          {!site.isOrphan && (() => {
                            // GA4とGSCの未設定状況を確認
                            const needsGA4 = !site.hasGA4;
                            const needsGSC = !site.hasGSC;
                            
                            // 両方設定済みならダッシュボードへ、未設定があればサイト設定へ
                            if (needsGA4 || needsGSC) {
                              // 未設定がある場合はサイト設定画面へ（STEP2またはSTEP3）
                              const step = needsGA4 ? 2 : 3;
                              return (
                                <Link
                                  to={`/sites/${site.siteId}/edit?step=${step}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white transition hover:bg-opacity-90"
                                  title="サイト設定"
                                >
                                  <BarChart3 className="h-3 w-3" />
                                  開く
                                </Link>
                              );
                            } else {
                              // 設定済みの場合はダッシュボードへ
                              return (
                                <Link
                                  to={`/dashboard?siteId=${site.siteId}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white transition hover:bg-opacity-90"
                                  title="ダッシュボードを開く"
                                >
                                  <BarChart3 className="h-3 w-3" />
                                  開く
                                </Link>
                              );
                            }
                          })()}
                        </div>
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
                    className="flex items-center gap-1 rounded-lg border border-stroke bg-white px-3 py-2 text-sm font-medium text-dark transition hover:bg-gray-100 disabled:opacity-50 dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:hover:bg-dark-3"
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
                    className="flex items-center gap-1 rounded-lg border border-stroke bg-white px-3 py-2 text-sm font-medium text-dark transition hover:bg-gray-100 disabled:opacity-50 dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:hover:bg-dark-3"
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

      {/* 削除確認モーダル */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-dark-2">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                <AlertCircle className="h-6 w-6 text-red-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-dark dark:text-white">
                  サイト削除の確認
                </h3>
                <p className="text-sm text-body-color dark:text-dark-6">
                  この操作は取り消せません
                </p>
              </div>
            </div>

            <div className="mb-6 space-y-3 rounded-lg bg-gray-50 p-4 dark:bg-dark-3">
              <div>
                <p className="text-xs text-body-color dark:text-dark-6">サイト名</p>
                <p className="text-sm font-medium text-dark dark:text-white">
                  {deleteTarget.siteName || '名称未設定'}
                </p>
              </div>
              <div>
                <p className="text-xs text-body-color dark:text-dark-6">URL</p>
                <p className="text-sm text-dark dark:text-white">{deleteTarget.siteUrl}</p>
              </div>
              <div>
                <p className="text-xs text-body-color dark:text-dark-6">ユーザー</p>
                <p className="text-sm text-dark dark:text-white">
                  {deleteTarget.userName} ({deleteTarget.userEmail})
                </p>
              </div>
            </div>

            <p className="mb-4 text-sm text-red-500">
              サイトに紐づくすべてのデータ（分析キャッシュ、メモ、アラート、改善提案等）も削除されます。
            </p>

            {deleteError && (
              <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20">
                {deleteError}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setDeleteTarget(null); setDeleteError(null); }}
                disabled={deleteLoading}
                className="flex-1 rounded-lg border border-stroke bg-white px-4 py-2 text-sm font-medium text-dark transition hover:bg-gray-100 disabled:opacity-50 dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:hover:bg-dark-3"
              >
                キャンセル
              </button>
              <button
                onClick={handleDeleteSite}
                disabled={deleteLoading}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-600 disabled:opacity-50"
              >
                {deleteLoading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
                    削除中...
                  </>
                ) : (
                  '削除する'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
