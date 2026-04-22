import React from 'react';
import { BUSINESS_MODEL_LABELS } from '../../../constants/businessModels';
import { SITE_ROLE_LABELS } from '../../../constants/siteRoles';
import { INDUSTRY_MAJOR_LABELS } from '../../../constants/industriesV2';

export default function CompleteSummary({ siteData }) {
  const businessModelLabel = siteData.businessModel
    ? BUSINESS_MODEL_LABELS[siteData.businessModel] || siteData.businessModel
    : '未選択';

  const industryLabel = (() => {
    const majorLabel = siteData.industryMajor
      ? INDUSTRY_MAJOR_LABELS[siteData.industryMajor] || siteData.industryMajor
      : '';
    const minorLabel = siteData.industryMinor || '';
    if (!majorLabel && !minorLabel) return '未選択';
    if (majorLabel && minorLabel) return `${majorLabel}／${minorLabel}`;
    return majorLabel || minorLabel;
  })();

  const siteRoleLabel = siteData.siteRole
    ? SITE_ROLE_LABELS[siteData.siteRole] || siteData.siteRole
    : '未選択';

  return (
    <div className="mb-8 rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
      <h2 className="mb-4 text-xl font-semibold text-dark dark:text-white">登録内容のサマリー</h2>

      <div className="space-y-4">
        {/* 基本情報 */}
        <div>
          <div className="mb-2 text-sm font-medium text-body-color">基本情報</div>
          <div className="space-y-2 rounded-md bg-gray-50 p-4 dark:bg-dark-3">
            <div className="flex gap-2">
              <span className="shrink-0 text-body-color">サイト名:</span>
              <span className="font-medium text-dark dark:text-white">{siteData.siteName}</span>
            </div>
            <div className="flex gap-2">
              <span className="shrink-0 text-body-color">URL:</span>
              <span className="font-medium text-dark dark:text-white break-all">
                {siteData.siteUrl}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="shrink-0 text-body-color">ビジネスモデル:</span>
              <span className="font-medium text-dark dark:text-white">{businessModelLabel}</span>
            </div>
            <div className="flex gap-2">
              <span className="shrink-0 text-body-color">業種:</span>
              <span className="font-medium text-dark dark:text-white">{industryLabel}</span>
            </div>
            <div className="flex gap-2">
              <span className="shrink-0 text-body-color">サイト役割:</span>
              <span className="font-medium text-dark dark:text-white">{siteRoleLabel}</span>
            </div>
          </div>
        </div>

        {/* GA4連携 */}
        {siteData.ga4PropertyId && (
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-body-color">
              <svg
                className="h-5 w-5 text-green-600 dark:text-green-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              GA4連携: 完了
            </div>
            <div className="space-y-2 rounded-md bg-gray-50 p-4 dark:bg-dark-3">
              <div className="flex gap-2">
                <span className="shrink-0 text-body-color">プロパティ:</span>
                <span className="font-medium text-dark dark:text-white">
                  {siteData.ga4PropertyName}
                </span>
              </div>
              <div className="flex gap-2">
                <span className="shrink-0 text-body-color">アカウント:</span>
                <span className="font-medium text-dark dark:text-white">
                  {siteData.ga4GoogleAccount}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* GSC連携 */}
        {siteData.gscSiteUrl && (
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-body-color">
              <svg
                className="h-5 w-5 text-green-600 dark:text-green-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              Search Console連携: 完了
            </div>
            <div className="space-y-2 rounded-md bg-gray-50 p-4 dark:bg-dark-3">
              <div className="flex gap-2">
                <span className="shrink-0 text-body-color">サイト:</span>
                <span className="font-medium text-dark dark:text-white break-all">
                  {siteData.gscSiteUrl}
                </span>
              </div>
              <div className="flex gap-2">
                <span className="shrink-0 text-body-color">アカウント:</span>
                <span className="font-medium text-dark dark:text-white">
                  {siteData.gscGoogleAccount}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* コンバージョン設定 */}
        {siteData.conversionEvents && siteData.conversionEvents.length > 0 && (
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-body-color">
              <svg
                className="h-5 w-5 text-green-600 dark:text-green-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              コンバージョン設定: {siteData.conversionEvents.length}件
            </div>
            <div className="space-y-1 rounded-md bg-gray-50 p-4 dark:bg-dark-3">
              {siteData.conversionEvents.map((event, index) => (
                <div key={index} className="text-sm text-dark dark:text-white">
                  - {event.displayName}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 目標設定 */}
        {siteData.kpiSettings &&
          siteData.kpiSettings.kpiList &&
          siteData.kpiSettings.kpiList.length > 0 && (
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-body-color">
                <svg
                  className="h-5 w-5 text-green-600 dark:text-green-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                目標設定: {siteData.kpiSettings.kpiList.length}件
              </div>
              <div className="space-y-1 rounded-md bg-gray-50 p-4 dark:bg-dark-3">
                {siteData.kpiSettings.kpiList.slice(0, 5).map((kpi, index) => (
                  <div key={index} className="flex gap-2 text-sm">
                    <span className="shrink-0 text-body-color">- {kpi.label}:</span>
                    <span className="font-medium text-dark dark:text-white">
                      {kpi.target.toLocaleString()}/月
                    </span>
                  </div>
                ))}
                {siteData.kpiSettings.kpiList.length > 5 && (
                  <div className="text-sm text-body-color">
                    他 {siteData.kpiSettings.kpiList.length - 5}件
                  </div>
                )}
              </div>
            </div>
          )}
      </div>
    </div>
  );
}
