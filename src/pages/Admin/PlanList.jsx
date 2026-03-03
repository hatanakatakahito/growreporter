import React, { useEffect } from 'react';
import { PLANS, PLAN_TYPES, getPlanBadgeColor, isUnlimited, canRegenerate } from '../../constants/plans';
import { setPageTitle } from '../../utils/pageTitle';

/**
 * 管理者画面 — プラン一覧（読み取り専用）
 * 各プランの制限値をテーブル表示する
 */
export default function PlanList() {
  useEffect(() => { setPageTitle('プラン一覧'); }, []);

  const plans = [
    PLANS[PLAN_TYPES.FREE],
    PLANS[PLAN_TYPES.STANDARD],
    PLANS[PLAN_TYPES.PREMIUM],
  ];

  const fmt = (v) => (isUnlimited(v) ? '無制限' : v);

  const rows = [
    { label: '登録サイト数', key: 'maxSites' },
    { label: 'メンバー数', key: 'maxMembers' },
    {
      label: 'AI分析（自動生成）',
      render: (f, plan) =>
        plan.id === PLAN_TYPES.FREE
          ? '各画面 月1回'
          : fmt(f.aiSummaryMonthly),
    },
    {
      label: 'AI分析（再分析）',
      render: (_f, plan) => (canRegenerate(plan.id) ? '可能' : '不可'),
    },
    {
      label: 'AI改善案 / 月',
      render: (f) => fmt(f.aiImprovementMonthly),
    },
    {
      label: 'サイト診断 / 月',
      render: (f) => fmt(f.diagnosisMonthly),
    },
    { label: 'データ保持期間', key: 'dataRetention' },
    {
      label: 'Excel エクスポート / 月',
      render: (f) => fmt(f.excelExportMonthly),
    },
    {
      label: 'PowerPoint エクスポート / 月',
      render: (f) => fmt(f.pptxExportMonthly),
    },
    { label: 'サポート', key: 'support' },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-dark dark:text-white">
        プラン一覧
      </h1>

      <div className="overflow-x-auto rounded-lg border border-stroke bg-white shadow-sm dark:border-dark-3 dark:bg-dark-2">
        <table className="w-full table-fixed text-sm">
          <thead>
            <tr className="border-b border-stroke dark:border-dark-3">
              <th className="w-1/4 px-4 py-3 text-left font-medium text-body-color dark:text-dark-6">
                項目
              </th>
              {plans.map((plan) => (
                <th key={plan.id} className="w-1/4 px-4 py-3 text-center">
                  <span
                    className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${getPlanBadgeColor(plan.id)}`}
                  >
                    {plan.displayName}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={row.label}
                className={
                  i % 2 === 0
                    ? 'bg-gray-1 dark:bg-dark'
                    : 'bg-white dark:bg-dark-2'
                }
              >
                <td className="px-4 py-3 font-medium text-dark dark:text-white">
                  {row.label}
                </td>
                {plans.map((plan) => (
                  <td
                    key={plan.id}
                    className="px-4 py-3 text-center text-body-color dark:text-dark-6"
                  >
                    {row.render
                      ? row.render(plan.features, plan)
                      : plan.features[row.key]}
                  </td>
                ))}
              </tr>
            ))}
            {/* 価格行 */}
            <tr className="border-t border-stroke dark:border-dark-3">
              <td className="px-4 py-3 font-medium text-dark dark:text-white">
                月額料金（税別）
              </td>
              {plans.map((plan) => (
                <td
                  key={plan.id}
                  className="px-4 py-3 text-center font-semibold text-dark dark:text-white"
                >
                  {plan.price === 0
                    ? '¥0'
                    : `¥${plan.price.toLocaleString()}`}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-body-color dark:text-dark-6">
        ※ プラン制限値はソースコード（src/constants/plans.js）で管理されています。変更する場合はコードを直接編集してください。
      </p>
    </div>
  );
}
