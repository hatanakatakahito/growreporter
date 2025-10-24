import React from 'react';

export default function CompleteSummary({ siteData }) {
  const getSiteTypeLabel = (type) => {
    const types = {
      corporate: 'コーポレートサイト',
      ec: 'ECサイト',
      media: 'メディアサイト',
      service: 'サービスサイト',
      lp: 'ランディングページ',
      other: 'その他',
    };
    return types[type] || type;
  };

  const getBusinessTypeLabel = (type) => {
    const types = {
      btob: 'BtoB',
      btoc: 'BtoC',
      both: 'BtoB & BtoC',
    };
    return types[type] || type;
  };

  return (
    <div className="mb-8 rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
      <h2 className="mb-4 text-xl font-semibold text-dark dark:text-white">
        登録内容のサマリー
      </h2>

      <div className="space-y-4">
        {/* 基本情報 */}
        <div>
          <div className="mb-2 text-sm font-medium text-body-color">基本情報</div>
          <div className="space-y-2 rounded-md bg-gray-50 p-4 dark:bg-dark-3">
            <div className="flex justify-between">
              <span className="text-body-color">サイト名:</span>
              <span className="font-medium text-dark dark:text-white">{siteData.siteName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-body-color">URL:</span>
              <span className="font-medium text-dark dark:text-white">{siteData.siteUrl}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-body-color">サイト種別:</span>
              <span className="font-medium text-dark dark:text-white">
                {getSiteTypeLabel(siteData.siteType)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-body-color">ビジネス形態:</span>
              <span className="font-medium text-dark dark:text-white">
                {getBusinessTypeLabel(siteData.businessType)}
              </span>
            </div>
          </div>
        </div>

        {/* GA4連携 */}
        {siteData.ga4PropertyId && (
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-body-color">
              <svg className="h-5 w-5 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              GA4連携: 完了
            </div>
            <div className="space-y-2 rounded-md bg-gray-50 p-4 dark:bg-dark-3">
              <div className="flex justify-between">
                <span className="text-body-color">プロパティ:</span>
                <span className="font-medium text-dark dark:text-white">{siteData.ga4PropertyName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-body-color">アカウント:</span>
                <span className="font-medium text-dark dark:text-white">{siteData.ga4GoogleAccount}</span>
              </div>
            </div>
          </div>
        )}

        {/* GSC連携 */}
        {siteData.gscSiteUrl && (
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-body-color">
              <svg className="h-5 w-5 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Search Console連携: 完了
            </div>
            <div className="space-y-2 rounded-md bg-gray-50 p-4 dark:bg-dark-3">
              <div className="flex justify-between">
                <span className="text-body-color">サイト:</span>
                <span className="font-medium text-dark dark:text-white">{siteData.gscSiteUrl}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-body-color">アカウント:</span>
                <span className="font-medium text-dark dark:text-white">{siteData.gscGoogleAccount}</span>
              </div>
            </div>
          </div>
        )}

        {/* コンバージョン設定 */}
        {siteData.conversionEvents && siteData.conversionEvents.length > 0 && (
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-body-color">
              <svg className="h-5 w-5 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
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

        {/* KPI設定 */}
        {siteData.kpiSettings && siteData.kpiSettings.kpiList && siteData.kpiSettings.kpiList.length > 0 && (
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-body-color">
              <svg className="h-5 w-5 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              KPI設定: {siteData.kpiSettings.kpiList.length}件
            </div>
            <div className="space-y-1 rounded-md bg-gray-50 p-4 dark:bg-dark-3">
              {siteData.kpiSettings.kpiList.slice(0, 5).map((kpi, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span className="text-body-color">- {kpi.label}:</span>
                  <span className="font-medium text-dark dark:text-white">{kpi.target.toLocaleString()}/月</span>
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

