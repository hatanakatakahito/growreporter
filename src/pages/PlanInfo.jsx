import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePlan } from '../hooks/usePlan';
import { PLANS, PLAN_TYPES, getPlanBadgeColor, isUnlimited } from '../constants/plans';
import { Check, ArrowLeft } from 'lucide-react';
import UpgradeModal from '../components/common/UpgradeModal';
import { setPageTitle } from '../utils/pageTitle';

/**
 * プラン情報・プラン変更案内ページ（オーナーのみアクセス可）
 */
export default function PlanInfo() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const { plan, planId } = usePlan();
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  useEffect(() => { setPageTitle('プラン情報'); }, []);

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

  const role = userProfile?.memberRole || 'owner';
  if (role !== 'owner') {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="text-gray-600">リダイレクト中...</div>
      </div>
    );
  }

  const allPlans = [PLANS[PLAN_TYPES.FREE], PLANS[PLAN_TYPES.STANDARD], PLANS[PLAN_TYPES.PREMIUM]];
  const fmt = (v) => (isUnlimited(v) ? '無制限' : `${v}回`);

  const features = [
    { label: '登録サイト数', getValue: (p) => `${p.features.maxSites}サイト` },
    { label: 'メンバー数', getValue: (p) => `${p.features.maxMembers}人` },
    { label: 'AI分析（再分析）', getValue: (p) => p.id === 'free' ? '自動生成のみ' : '可能' },
    { label: 'AI改善案 / 月', getValue: (p) => fmt(p.features.aiImprovementMonthly) },
    { label: 'エクスポート / 月', getValue: (p) => fmt(p.features.excelExportMonthly) },
    { label: 'サポート', getValue: (p) => p.features.support || 'なし' },
  ];

  return (
    <div className="w-full min-w-0 flex justify-center">
      <div className="w-full max-w-[1100px] mx-auto px-6 py-10 box-border">
        {/* ヘッダー */}
        <div className="mb-8 flex items-center gap-4">
          <button
            onClick={() => navigate('/account/settings')}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-300 bg-white transition hover:bg-gray-50 dark:border-dark-3 dark:bg-dark-2 dark:hover:bg-dark-3"
          >
            <ArrowLeft className="h-5 w-5 text-gray-700 dark:text-white" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">現在のプラン</h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              現在のあなたのプランと各プランの機能比較
            </p>
          </div>
        </div>

        {/* プラン比較カード */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {allPlans.map((p) => {
            const isCurrent = p.id === planId;
            return (
              <div
                key={p.id}
                className={`relative rounded-xl border-2 bg-white p-6 transition dark:bg-dark-2 ${
                  isCurrent
                    ? 'border-primary shadow-lg ring-2 ring-primary/20'
                    : 'border-gray-200 dark:border-dark-3'
                }`}
              >
                {/* 現在のプランバッジ */}
                {isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="rounded-full bg-primary px-4 py-1 text-xs font-semibold text-white shadow">
                      現在のプラン
                    </span>
                  </div>
                )}

                {/* プラン名 */}
                <div className="mb-4 pt-2 text-center">
                  <span className={`inline-block rounded-full px-4 py-1.5 text-sm font-semibold ${getPlanBadgeColor(p.id)}`}>
                    {p.displayName}
                  </span>
                  {p.popular && !isCurrent && (
                    <span className="ml-2 inline-block rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-medium text-primary">
                      おすすめ
                    </span>
                  )}
                </div>

                {/* 価格 */}
                <div className="mb-6 text-center">
                  {p.price === 0 ? (
                    <span className="text-3xl font-bold text-gray-900 dark:text-white">無料</span>
                  ) : (
                    <>
                      <span className="text-3xl font-bold text-gray-900 dark:text-white">
                        ¥{p.price.toLocaleString()}
                      </span>
                      <span className="text-sm text-gray-500"> / 月（税別）</span>
                    </>
                  )}
                </div>

                {/* 機能一覧 */}
                <ul className="space-y-3">
                  {features.map((feature) => (
                    <li key={feature.label} className="flex items-start gap-2.5 text-sm">
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
                      <span className="text-gray-700 dark:text-gray-300">
                        <span className="text-gray-500 dark:text-gray-400">{feature.label}: </span>
                        <span className="font-medium text-gray-900 dark:text-white">{feature.getValue(p)}</span>
                      </span>
                    </li>
                  ))}
                </ul>

                {/* アクション */}
                <div className="mt-6">
                  {isCurrent ? (
                    <div className="rounded-lg bg-gray-100 py-2.5 text-center text-sm font-medium text-gray-500 dark:bg-dark-3 dark:text-gray-400">
                      ご利用中
                    </div>
                  ) : p.price > (plan?.price || 0) ? (
                    <button
                      onClick={() => setIsUpgradeModalOpen(true)}
                      className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-white transition hover:bg-primary/90"
                    >
                      アップグレード
                    </button>
                  ) : (
                    <div className="rounded-lg border border-gray-200 py-2.5 text-center text-sm text-gray-400 dark:border-dark-3">
                      —
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* 補足 */}
        <div className="mt-8 rounded-lg bg-blue-50 p-5 dark:bg-blue-900/20">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            プラン変更をご希望の場合は「アップグレード」ボタンからお問い合わせください。
            担当者より折り返しご連絡いたします。
          </p>
        </div>
      </div>

      {/* アップグレードモーダル */}
      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        initialStep="form"
      />
    </div>
  );
}
