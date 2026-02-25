import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePlan } from '../hooks/usePlan';
import { getPlanBadgeColor } from '../constants/plans';

/**
 * プラン情報・プラン変更案内ページ（オーナーのみアクセス可）
 */
export default function PlanInfo() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const { plan } = usePlan();

  // 編集者・閲覧者はプラン変更不可のためアカウント設定へリダイレクト
  useEffect(() => {
    if (!userProfile) return;
    const role = userProfile.memberRole || 'owner';
    if (role !== 'owner') {
      navigate('/account/settings', { replace: true });
    }
  }, [userProfile, navigate]);

  if (!plan) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="text-gray-600">読み込み中...</div>
      </div>
    );
  }

  // オーナー以外はリダイレクトするため表示しない
  const role = userProfile?.memberRole || 'owner';
  if (role !== 'owner') {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="text-gray-600">リダイレクト中...</div>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 flex justify-center">
      <div className="w-full max-w-[900px] mx-auto px-6 py-10 box-border">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">プランについて</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            現在のプランと制限をご確認いただけます
          </p>
        </div>

        <div className="bg-white dark:bg-dark-2 shadow-sm rounded-lg p-6 w-full space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">現在のプラン</h2>
            <p className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getPlanBadgeColor(plan.id)}`}>
              {plan.displayName}
            </p>
          </div>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">最大サイト数</dt>
              <dd className="text-sm text-gray-900 dark:text-white">{plan.features.maxSites}サイト</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">最大メンバー数</dt>
              <dd className="text-sm text-gray-900 dark:text-white">{plan.features.maxMembers}人</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">AI要約生成</dt>
              <dd className="text-sm text-gray-900 dark:text-white">
                {plan.features.aiSummaryMonthly >= 999999
                  ? '無制限'
                  : `月${plan.features.aiSummaryMonthly}回`}
              </dd>
            </div>
          </dl>
          <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              プラン変更をご希望の場合は、運営までお問い合わせください。
              現在は手動でのプラン変更に対応しています。
            </p>
          </div>
          <div>
            <Link
              to="/account/settings"
              className="inline-block px-4 py-2 rounded-lg border border-gray-300 dark:border-dark-3 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-3"
            >
              アカウント設定に戻る
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
