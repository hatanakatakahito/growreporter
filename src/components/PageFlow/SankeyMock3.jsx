import React from 'react';
import { ExternalLink, Home, Globe } from 'lucide-react';

/**
 * 案3: カードベースのフロー図
 * 左側に流入元カード、右側に対象ページカードを配置し、中央に矢印で接続
 */
export default function SankeyMock3({ transitionData, selectedPage, selectedPageTitle, formatNumber }) {
  if (!transitionData) return null;

  const getIcon = (type) => {
    switch (type) {
      case 'internal':
      case 'internal-other':
        return <Home className="h-4 w-4" />;
      case 'external':
        return <Globe className="h-4 w-4" />;
      case 'direct':
        return <ExternalLink className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'internal':
        return 'サイト内ページ';
      case 'internal-other':
        return 'その他のサイト内';
      case 'external':
        return '外部サイト';
      case 'direct':
        return '直接アクセス';
      default:
        return '';
    }
  };

  const allSources = [
    ...(transitionData.inbound || []).map(item => ({
      name: item.page,
      title: item.title || null, // ページタイトル（あれば）
      pageViews: item.pageViews,
      type: 'internal',
      percentage: ((item.pageViews / transitionData.trafficBreakdown.total) * 100).toFixed(1)
    })),
  ];

  // その他のサイト内ページ
  const top10Total = (transitionData.inbound || []).reduce((sum, item) => sum + item.pageViews, 0);
  const otherInternal = (transitionData.trafficBreakdown?.internal.count || 0) - top10Total;
  if (otherInternal > 0) {
    allSources.push({
      name: 'その他のサイト内ページ',
      pageViews: otherInternal,
      type: 'internal-other',
      percentage: ((otherInternal / transitionData.trafficBreakdown.total) * 100).toFixed(1)
    });
  }

  // 外部サイト
  if (transitionData.trafficBreakdown?.external.count > 0) {
    allSources.push({
      name: '外部サイト',
      pageViews: transitionData.trafficBreakdown.external.count,
      type: 'external',
      percentage: ((transitionData.trafficBreakdown.external.count / transitionData.trafficBreakdown.total) * 100).toFixed(1)
    });
  }

  // 直接アクセス
  if (transitionData.trafficBreakdown?.direct.count > 0) {
    allSources.push({
      name: '直接アクセス',
      pageViews: transitionData.trafficBreakdown.direct.count,
      type: 'direct',
      percentage: ((transitionData.trafficBreakdown.direct.count / transitionData.trafficBreakdown.total) * 100).toFixed(1)
    });
  }

  return (
    <div className="relative">
      {/* タイトル行 */}
      <div className="mb-4 grid grid-cols-[1fr_auto_1fr] gap-8">
        <div className="text-center">
          <h4 className="text-sm font-semibold text-body-color">流入元</h4>
        </div>
        <div className="w-px" />
        <div className="text-center">
          <h4 className="text-sm font-semibold text-body-color">対象ページ</h4>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] gap-8">
        {/* 左側: 流入元カード */}
        <div className="space-y-2">
          {allSources.map((source, index) => (
            <div
              key={index}
              className="rounded-lg border-2 border-stroke bg-white p-3 transition-all hover:border-primary hover:shadow-md dark:border-dark-3 dark:bg-dark-2"
            >
              <div className="mb-1 flex items-center gap-2">
                {getIcon(source.type)}
                <div className="flex-1">
                  <div className="text-sm font-medium text-dark dark:text-white">
                    {source.name.length > 45 ? source.name.substring(0, 45) + '...' : source.name}
                  </div>
                  {/* サイト内ページの場合はページタイトル、外部・直接の場合は種別を表示 */}
                  {source.type === 'internal' && source.title && source.title !== source.name ? (
                    <div className="mt-0.5 text-xs text-body-color">
                      {source.title.length > 50 ? source.title.substring(0, 50) + '...' : source.title}
                    </div>
                  ) : source.type !== 'internal' && source.type !== 'internal-other' ? (
                    <div className="mt-0.5 text-xs text-body-color">
                      {getTypeLabel(source.type)}
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold text-primary">
                  {formatNumber(source.pageViews)}
                </span>
                <span className="text-sm text-body-color">
                  PV ({source.percentage}%)
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* 中央: 罫線 */}
        <div className="flex items-center">
          <div className="h-full w-px bg-stroke dark:bg-dark-3" />
        </div>

        {/* 右側: 対象ページカード（sticky） */}
        <div className="relative">
          <div className="sticky top-6">
            <div className="w-full rounded-xl border-4 border-primary bg-blue-50 p-6 shadow-lg dark:bg-blue-900/20">
              <div className="mb-4">
                <div className="text-base font-medium text-dark dark:text-white">
                  {selectedPage.length > 40 ? selectedPage.substring(0, 40) + '...' : selectedPage}
                </div>
                {selectedPageTitle && (
                  <div className="mt-1 text-xs text-body-color">
                    {selectedPageTitle.length > 50 ? selectedPageTitle.substring(0, 50) + '...' : selectedPageTitle}
                  </div>
                )}
              </div>
              <div className="rounded-lg bg-white p-4 dark:bg-dark-2">
                <div className="text-sm text-body-color">遷移元のあるページビュー</div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-primary">
                    {formatNumber(transitionData.trafficBreakdown?.total || 0)}
                  </span>
                  <span className="text-lg text-body-color">PV</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

