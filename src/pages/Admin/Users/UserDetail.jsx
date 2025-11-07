import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { setPageTitle } from '../../../utils/pageTitle';
import { useAdminUserDetail } from '../../../hooks/useAdminUserDetail';
import { getPlanDisplayName } from '../../../constants/plans';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import ErrorAlert from '../../../components/common/ErrorAlert';
import PlanChangeModal from '../../../components/Admin/PlanChangeModal';
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Calendar, 
  TrendingUp,
  Globe,
  BarChart3,
  Sparkles,
  Edit2,
  Clock
} from 'lucide-react';

/**
 * ユーザー詳細画面
 */
export default function UserDetail() {
  const { uid } = useParams();
  const navigate = useNavigate();
  const { userDetail, loading, error, refetch } = useAdminUserDetail(uid);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    setPageTitle('ユーザー詳細');
  }, []);

  // プラン変更成功
  const handlePlanChangeSuccess = (message) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 5000);
    refetch(); // データを再取得
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

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return <ErrorAlert message={error} onRetry={refetch} />;
  }

  if (!userDetail) {
    return (
      <div className="rounded-lg border border-stroke bg-white p-12 text-center dark:border-dark-3 dark:bg-dark-2">
        <p className="text-body-color dark:text-dark-6">ユーザー情報が見つかりません</p>
      </div>
    );
  }

  return (
    <div>
      {/* ヘッダー */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/admin/users')}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-stroke bg-white transition hover:bg-gray-2 dark:border-dark-3 dark:bg-dark-2 dark:hover:bg-dark-3"
          >
            <ArrowLeft className="h-5 w-5 text-dark dark:text-white" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-dark dark:text-white">
              ユーザー詳細
            </h2>
            <p className="mt-1 text-sm text-body-color dark:text-dark-6">
              {userDetail.displayName || userDetail.email}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowPlanModal(true)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary/90"
        >
          <Edit2 className="h-4 w-4" />
          プラン変更
        </button>
      </div>

      {/* 成功メッセージ */}
      {successMessage && (
        <div className="mb-4 rounded-lg bg-green-50 p-4 text-sm text-green-600 dark:bg-green-900/20">
          {successMessage}
        </div>
      )}

      {/* 基本情報 */}
      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* プロフィール */}
        <div className="rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
          <div className="mb-4 flex items-center gap-4">
            {userDetail.photoURL ? (
              <img
                src={userDetail.photoURL}
                alt={userDetail.displayName}
                className="h-16 w-16 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-2xl font-semibold text-primary">
                {userDetail.displayName?.charAt(0) || userDetail.email?.charAt(0) || 'U'}
              </div>
            )}
            <div>
              <h3 className="text-lg font-semibold text-dark dark:text-white">
                {userDetail.displayName || 'Unknown'}
              </h3>
              <p className="text-sm text-body-color dark:text-dark-6">
                {userDetail.email}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-body-color dark:text-dark-6">
              <Mail className="h-4 w-4" />
              <span>{userDetail.email}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-body-color dark:text-dark-6">
              <Calendar className="h-4 w-4" />
              <span>
                登録日: {userDetail.createdAt ? new Date(userDetail.createdAt).toLocaleDateString('ja-JP') : '-'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-body-color dark:text-dark-6">
              <Clock className="h-4 w-4" />
              <span>
                最終ログイン: {userDetail.lastLoginAt ? new Date(userDetail.lastLoginAt).toLocaleDateString('ja-JP') : '-'}
              </span>
            </div>
          </div>
        </div>

        {/* プラン情報 */}
        <div className="rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-dark dark:text-white">現在のプラン</h3>
            <span className={`inline-block rounded-full px-3 py-1 text-sm font-semibold ${getPlanBadgeColor(userDetail.plan)}`}>
              {getPlanDisplayName(userDetail.plan)}
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="text-body-color dark:text-dark-6">サイト登録数</span>
                <span className="font-semibold text-dark dark:text-white">
                  {userDetail.usage.sites}
                </span>
              </div>
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="text-body-color dark:text-dark-6">AI分析使用</span>
                <span className="font-semibold text-dark dark:text-white">
                  {userDetail.usage.aiSummaryUsage} / {userDetail.usage.aiSummaryLimit || '無制限'}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-dark-3">
                <div
                  className="h-full rounded-full bg-purple-500"
                  style={{
                    width: userDetail.usage.aiSummaryLimit > 0
                      ? `${Math.min((userDetail.usage.aiSummaryUsage / userDetail.usage.aiSummaryLimit) * 100, 100)}%`
                      : '0%'
                  }}
                />
              </div>
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="text-body-color dark:text-dark-6">AI改善使用</span>
                <span className="font-semibold text-dark dark:text-white">
                  {userDetail.usage.aiImprovementUsage} / {userDetail.usage.aiImprovementLimit || '無制限'}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-dark-3">
                <div
                  className="h-full rounded-full bg-orange-500"
                  style={{
                    width: userDetail.usage.aiImprovementLimit > 0
                      ? `${Math.min((userDetail.usage.aiImprovementUsage / userDetail.usage.aiImprovementLimit) * 100, 100)}%`
                      : '0%'
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 今月のAI使用状況 */}
        <div className="rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
          <h3 className="mb-4 text-lg font-semibold text-dark dark:text-white">今月のAI使用</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg bg-purple-50 p-4 dark:bg-purple-900/20">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/10">
                  <BarChart3 className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-xs text-body-color dark:text-dark-6">分析サマリー</p>
                  <p className="text-sm font-medium text-dark dark:text-white">AI分析回数</p>
                </div>
              </div>
              <span className="text-2xl font-bold text-dark dark:text-white">
                {userDetail.aiUsageThisMonth?.analysisCount || 0}
              </span>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-orange-50 p-4 dark:bg-orange-900/20">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500/10">
                  <Sparkles className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-xs text-body-color dark:text-dark-6">改善提案</p>
                  <p className="text-sm font-medium text-dark dark:text-white">AI改善案生成回数</p>
                </div>
              </div>
              <span className="text-2xl font-bold text-dark dark:text-white">
                {userDetail.aiUsageThisMonth?.improvementCount || 0}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* サイト一覧 */}
      <div className="mb-6 rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
        <h3 className="mb-4 text-lg font-semibold text-dark dark:text-white">登録サイト一覧</h3>
        
        {userDetail.sites && userDetail.sites.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {userDetail.sites.map((site) => (
              <div
                key={site.id}
                className="rounded-lg border border-stroke bg-gray-50 p-4 transition hover:shadow-md dark:border-dark-3 dark:bg-dark-3"
              >
                <div className="mb-2 flex items-center gap-2">
                  <Globe className="h-5 w-5 text-primary" />
                  <h4 className="font-medium text-dark dark:text-white">{site.siteName || site.url}</h4>
                </div>
                <p className="mb-2 text-sm text-body-color dark:text-dark-6">{site.url}</p>
                <div className="flex items-center justify-between text-xs text-body-color dark:text-dark-6">
                  <span>登録: {site.createdAt ? new Date(site.createdAt).toLocaleDateString('ja-JP') : '-'}</span>
                  <span className={`rounded-full px-2 py-1 ${site.setupCompleted ? 'bg-green-100 text-green-600 dark:bg-green-900/20' : 'bg-orange-100 text-orange-600 dark:bg-orange-900/20'}`}>
                    {site.setupCompleted ? '完了' : '設定中'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-body-color dark:text-dark-6">登録されているサイトがありません</p>
        )}
      </div>

      {/* プラン変更履歴 */}
      <div className="rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
        <h3 className="mb-4 text-lg font-semibold text-dark dark:text-white">プラン変更履歴</h3>
        
        {userDetail.planChangeHistory && userDetail.planChangeHistory.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-stroke bg-gray-50 dark:border-dark-3 dark:bg-dark-3">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-dark dark:text-white">
                    変更日時
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-dark dark:text-white">
                    変更前
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-dark dark:text-white">
                    変更後
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-dark dark:text-white">
                    理由
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-dark dark:text-white">
                    変更者
                  </th>
                </tr>
              </thead>
              <tbody>
                {userDetail.planChangeHistory.map((history, index) => (
                  <tr key={history.id || index} className="border-b border-stroke dark:border-dark-3">
                    <td className="px-4 py-3 text-sm text-body-color dark:text-dark-6">
                      {history.changedAt ? new Date(history.changedAt).toLocaleString('ja-JP') : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2 py-1 text-xs font-semibold ${getPlanBadgeColor(history.oldPlan)}`}>
                        {getPlanDisplayName(history.oldPlan)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2 py-1 text-xs font-semibold ${getPlanBadgeColor(history.newPlan)}`}>
                        {getPlanDisplayName(history.newPlan)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-body-color dark:text-dark-6">
                      {history.reason || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-body-color dark:text-dark-6">
                      {history.changedByEmail || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center text-body-color dark:text-dark-6">プラン変更履歴がありません</p>
        )}
      </div>

      {/* プラン変更モーダル */}
      {showPlanModal && (
        <PlanChangeModal
          user={userDetail}
          onClose={() => setShowPlanModal(false)}
          onSuccess={handlePlanChangeSuccess}
        />
      )}
    </div>
  );
}

