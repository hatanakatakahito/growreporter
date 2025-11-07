import { useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { setPageTitle } from '../../../utils/pageTitle';
import { useAdminSiteDetail } from '../../../hooks/useAdminSiteDetail';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import ErrorAlert from '../../../components/common/ErrorAlert';
import { ArrowLeft, Globe, User, BarChart3, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

/**
 * サイト詳細画面（管理者用）
 */
export default function AdminSiteDetail() {
  const { siteId } = useParams();
  const navigate = useNavigate();
  const { siteDetail, loading, error, refetch } = useAdminSiteDetail(siteId);

  useEffect(() => {
    setPageTitle('サイト詳細');
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <button
          onClick={() => navigate('/admin/sites')}
          className="mb-4 flex items-center gap-2 text-sm text-body-color hover:text-primary dark:text-dark-6"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>サイト一覧に戻る</span>
        </button>
        <ErrorAlert message={error} onRetry={refetch} />
      </div>
    );
  }

  if (!siteDetail) {
    return null;
  }

  return (
    <div>
      {/* 戻るボタン */}
      <button
        onClick={() => navigate('/admin/sites')}
        className="mb-6 flex items-center gap-2 text-sm text-body-color hover:text-primary dark:text-dark-6"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>サイト一覧に戻る</span>
      </button>

      {/* ヘッダー */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-dark dark:text-white">
          {siteDetail.siteName || '名称未設定'}
        </h2>
        <a
          href={siteDetail.siteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 text-sm text-primary hover:underline"
        >
          {siteDetail.siteUrl}
        </a>
      </div>

      {/* 孤立サイト警告 */}
      {siteDetail.isOrphan && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-900/20">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertTriangle className="h-5 w-5" />
            <span className="font-medium">孤立サイト</span>
          </div>
          <p className="mt-1 text-sm text-red-600/80 dark:text-red-400/80">
            このサイトのユーザーは削除されています。サイトの削除を検討してください。
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* 基本情報 */}
        <div className="rounded-lg border border-stroke bg-white p-6 shadow-sm dark:border-dark-3 dark:bg-dark-2">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-dark dark:text-white">
            <Globe className="h-5 w-5" />
            基本情報
          </h3>
          <div className="space-y-3">
            <div>
              <div className="text-sm text-body-color dark:text-dark-6">サイトID</div>
              <div className="font-mono text-sm text-dark dark:text-white">{siteDetail.siteId}</div>
            </div>
            <div>
              <div className="text-sm text-body-color dark:text-dark-6">業種</div>
              <div className="text-dark dark:text-white">{siteDetail.industry || '-'}</div>
            </div>
            <div>
              <div className="text-sm text-body-color dark:text-dark-6">サイトタイプ</div>
              <div className="text-dark dark:text-white">{siteDetail.siteType || '-'}</div>
            </div>
            <div>
              <div className="text-sm text-body-color dark:text-dark-6">登録日</div>
              <div className="text-dark dark:text-white">
                {siteDetail.createdAt
                  ? new Date(siteDetail.createdAt).toLocaleString('ja-JP', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '-'}
              </div>
            </div>
          </div>
        </div>

        {/* ユーザー情報 */}
        <div className="rounded-lg border border-stroke bg-white p-6 shadow-sm dark:border-dark-3 dark:bg-dark-2">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-dark dark:text-white">
            <User className="h-5 w-5" />
            ユーザー情報
          </h3>
          {siteDetail.user ? (
            <div className="space-y-3">
              <div>
                <div className="text-sm text-body-color dark:text-dark-6">名前</div>
                <div className="text-dark dark:text-white">{siteDetail.user.displayName || '-'}</div>
              </div>
              <div>
                <div className="text-sm text-body-color dark:text-dark-6">メールアドレス</div>
                <div className="text-dark dark:text-white">{siteDetail.user.email || '-'}</div>
              </div>
              <div>
                <div className="text-sm text-body-color dark:text-dark-6">プラン</div>
                <div className="text-dark dark:text-white">
                  {siteDetail.user.plan === 'free' && '無料プラン'}
                  {siteDetail.user.plan === 'standard' && 'スタンダードプラン'}
                  {siteDetail.user.plan === 'premium' && 'プレミアムプラン'}
                  {!['free', 'standard', 'premium'].includes(siteDetail.user.plan) && siteDetail.user.plan}
                </div>
              </div>
              <div className="pt-3">
                <Link
                  to={`/admin/users/${siteDetail.user.uid}`}
                  className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  ユーザー詳細を見る →
                </Link>
              </div>
            </div>
          ) : (
            <div className="text-red-600 dark:text-red-400">
              ユーザー情報が見つかりません（孤立サイト）
            </div>
          )}
        </div>

        {/* データ収集設定 */}
        <div className="rounded-lg border border-stroke bg-white p-6 shadow-sm dark:border-dark-3 dark:bg-dark-2">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-dark dark:text-white">
            <BarChart3 className="h-5 w-5" />
            データ収集設定
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-dark dark:text-white">Google Analytics 4</div>
                <div className="text-sm text-body-color dark:text-dark-6">
                  {siteDetail.ga4PropertyId || '未設定'}
                </div>
              </div>
              {siteDetail.hasGA4 ? (
                <CheckCircle className="h-6 w-6 text-green-500" />
              ) : (
                <XCircle className="h-6 w-6 text-red-500" />
              )}
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-dark dark:text-white">Search Console</div>
                <div className="text-sm text-body-color dark:text-dark-6">
                  {siteDetail.gscSiteUrl || '未設定'}
                </div>
              </div>
              {siteDetail.hasGSC ? (
                <CheckCircle className="h-6 w-6 text-green-500" />
              ) : (
                <XCircle className="h-6 w-6 text-red-500" />
              )}
            </div>
          </div>
        </div>

        {/* AI使用状況 */}
        <div className="rounded-lg border border-stroke bg-white p-6 shadow-sm dark:border-dark-3 dark:bg-dark-2">
          <h3 className="mb-4 text-lg font-semibold text-dark dark:text-white">
            AI使用状況（今月）
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-body-color dark:text-dark-6">AI分析サマリー</span>
              <span className="font-semibold text-dark dark:text-white">
                {siteDetail.aiUsage?.analysisCount || 0}回
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-body-color dark:text-dark-6">AI改善提案</span>
              <span className="font-semibold text-dark dark:text-white">
                {siteDetail.aiUsage?.improvementCount || 0}回
              </span>
            </div>
            <div className="border-t border-stroke pt-3 dark:border-dark-3">
              <div className="flex justify-between">
                <span className="font-medium text-dark dark:text-white">合計</span>
                <span className="font-bold text-primary">
                  {siteDetail.aiUsage?.totalCount || 0}回
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* データ収集状況 */}
      <div className="mt-6 rounded-lg border border-stroke bg-white p-6 shadow-sm dark:border-dark-3 dark:bg-dark-2">
        <h3 className="mb-4 text-lg font-semibold text-dark dark:text-white">
          データ収集状況
        </h3>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="text-sm text-body-color dark:text-dark-6">ステータス</div>
            <div className="mt-1">
              {siteDetail.dataStatus?.status === 'active' && (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-3 py-1 text-sm font-medium text-green-600 dark:bg-green-900/20 dark:text-green-400">
                  <CheckCircle className="h-4 w-4" />
                  アクティブ
                </span>
              )}
              {siteDetail.dataStatus?.status === 'inactive' && (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-3 py-1 text-sm font-medium text-red-600 dark:bg-red-900/20 dark:text-red-400">
                  <XCircle className="h-4 w-4" />
                  非アクティブ
                </span>
              )}
              {siteDetail.dataStatus?.status === 'unknown' && (
                <span className="inline-flex rounded-full bg-gray-50 px-3 py-1 text-sm font-medium text-gray-600 dark:bg-gray-900/20 dark:text-gray-400">
                  不明
                </span>
              )}
            </div>
          </div>
          <div className="flex-1">
            <div className="text-sm text-body-color dark:text-dark-6">最終データ取得日</div>
            <div className="mt-1 text-dark dark:text-white">
              {siteDetail.dataStatus?.latestDataDate
                ? new Date(siteDetail.dataStatus.latestDataDate).toLocaleString('ja-JP', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '-'}
            </div>
          </div>
        </div>
      </div>

      {/* コンバージョンイベント */}
      {siteDetail.conversionEvents && siteDetail.conversionEvents.length > 0 && (
        <div className="mt-6 rounded-lg border border-stroke bg-white p-6 shadow-sm dark:border-dark-3 dark:bg-dark-2">
          <h3 className="mb-4 text-lg font-semibold text-dark dark:text-white">
            コンバージョンイベント
          </h3>
          <div className="space-y-2">
            {siteDetail.conversionEvents.map((event, index) => {
              // イベントが文字列かオブジェクトかを判定
              const eventName = typeof event === 'string' ? event : (event.eventName || event.displayName || 'Unknown');
              const eventDisplay = typeof event === 'string' ? event : (event.displayName || event.eventName || 'Unknown');
              
              return (
                <div
                  key={index}
                  className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 dark:bg-dark-3"
                >
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <div className="flex-1">
                    <span className="text-dark dark:text-white">{eventDisplay}</span>
                    {typeof event === 'object' && event.description && (
                      <div className="text-xs text-body-color dark:text-dark-6">
                        {event.description}
                      </div>
                    )}
                  </div>
                  {typeof event === 'object' && event.isActive !== undefined && (
                    <span className={`text-xs ${event.isActive ? 'text-green-600' : 'text-gray-400'}`}>
                      {event.isActive ? '有効' : '無効'}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

