import { useMemo } from 'react';
import { Download } from 'lucide-react';
import { Button } from '../ui/button';
import { exportRevenueSummaryToExcel } from '../../utils/exportRevenueSummaryToExcel';

const PRICE_BUSINESS = 49800;
const PRICE_EXTRA_SITE = 15000;

function formatYen(value) {
  if (value === null || value === undefined) return '-';
  return `¥${Number(value).toLocaleString()}`;
}

function MetricCard({ title, value, subtitle, tooltip }) {
  return (
    <div
      className="rounded-lg border border-stroke bg-white p-5 shadow-sm dark:border-dark-3 dark:bg-dark-2"
      title={tooltip || ''}
    >
      <p className="mb-2 text-xs font-medium text-body-color dark:text-dark-6">{title}</p>
      <h3 className="text-2xl font-bold text-dark dark:text-white">{value}</h3>
      {subtitle && (
        <p className="mt-1 text-xs text-body-color dark:text-dark-6">{subtitle}</p>
      )}
    </div>
  );
}

export default function RevenueSummarySection({ revenue, contractTrend, fetchedAt }) {
  const safeRevenue = revenue || { mrr: 0, arr: 0, activeBusinessContracts: 0, totalExtras: 0, arpu: 0 };
  const safeTrend = useMemo(
    () => (Array.isArray(contractTrend) ? contractTrend : []),
    [contractTrend]
  );

  const thisMonth = safeTrend.length > 0 ? safeTrend[safeTrend.length - 1] : { newContracts: 0, churnedContracts: 0, netNew: 0 };

  const maxBarValue = useMemo(() => {
    let max = 0;
    for (const b of safeTrend) {
      if ((b.newContracts || 0) > max) max = b.newContracts;
      if ((b.churnedContracts || 0) > max) max = b.churnedContracts;
    }
    return max;
  }, [safeTrend]);

  const fetchedTime = fetchedAt
    ? new Date(fetchedAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div className="mb-6">
      <div className="rounded-lg border border-stroke bg-white p-6 shadow-sm dark:border-dark-3 dark:bg-dark-2">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-dark dark:text-white">
              契約・売上サマリー
            </h3>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-body-color dark:bg-dark-3 dark:text-dark-6">
              税別表記
            </span>
          </div>
          <div className="flex items-center gap-3">
            {fetchedTime && (
              <span className="text-xs text-body-color dark:text-dark-6">
                最終更新: {fetchedTime}
              </span>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => exportRevenueSummaryToExcel({ revenue: safeRevenue, contractTrend: safeTrend, fetchedAt })}
            >
              <Download data-slot="icon" />
              Excel エクスポート
            </Button>
          </div>
        </div>

        {/* 上段 4 カード: MRR / ARR / アクティブ契約 / 追加サイト */}
        <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="月次売上高"
            value={formatYen(safeRevenue.mrr)}
            subtitle="毎月の定常的な売上"
            tooltip={`月次売上高 = アクティブ Business 契約 × ¥${PRICE_BUSINESS.toLocaleString()} + 有効な追加サイト × ¥${PRICE_EXTRA_SITE.toLocaleString()}`}
          />
          <MetricCard
            title="年次売上高"
            value={formatYen(safeRevenue.arr)}
            subtitle="月次売上高 × 12"
            tooltip="年次売上高 = 月次売上高 × 12"
          />
          <MetricCard
            title="アクティブ契約数"
            value={`${safeRevenue.activeBusinessContracts.toLocaleString()} 契約`}
            subtitle="Business プランの契約数"
            tooltip="users.plan=business で memberRole=owner のアカウント数"
          />
          <MetricCard
            title="追加サイト数合計"
            value={`${safeRevenue.totalExtras.toLocaleString()} サイト`}
            subtitle="有効期限内の extras 合計"
            tooltip="extraSitesValidUntil 期限切れは除外"
          />
        </div>

        {/* 中段 3 カード: 当月新規 / 当月解約 / ARPU */}
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <MetricCard
            title="当月の新規契約"
            value={`+${(thisMonth.newContracts || 0).toLocaleString()}`}
            subtitle={`純増 ${thisMonth.netNew >= 0 ? '+' : ''}${thisMonth.netNew}`}
            tooltip="今月 active 化された new_business inquiry 件数"
          />
          <MetricCard
            title="当月の解約"
            value={`-${(thisMonth.churnedContracts || 0).toLocaleString()}`}
            subtitle="今月 cancelled 化された件数"
            tooltip="今月 cancelled 化された new_business inquiry 件数"
          />
          <MetricCard
            title="ARPU (1 契約あたり)"
            value={formatYen(safeRevenue.arpu)}
            subtitle="月次売上高 / 契約数"
            tooltip="ARPU = 月次売上高 ÷ アクティブ契約数 (税別)"
          />
        </div>

        {/* 契約数推移 (過去 12 ヶ月) */}
        <div>
          <h4 className="mb-3 text-sm font-semibold text-dark dark:text-white">
            契約数推移 (過去 12 ヶ月)
          </h4>
          {safeTrend.length === 0 ? (
            <p className="text-sm text-body-color dark:text-dark-6">データがありません</p>
          ) : (
            <>
              <div className="flex items-end justify-between gap-2" style={{ height: '160px' }}>
                {safeTrend.map((item, index) => {
                  const newH = maxBarValue > 0 ? (item.newContracts / maxBarValue) * 120 : 0;
                  const churnH = maxBarValue > 0 ? (item.churnedContracts / maxBarValue) * 120 : 0;
                  const monthLabel = item.month ? item.month.slice(5) : '-';
                  return (
                    <div key={index} className="flex flex-1 flex-col items-center">
                      <div className="flex w-full flex-1 items-end justify-center gap-1">
                        <div
                          className="w-3 rounded-t bg-green-500 transition-all hover:bg-green-600"
                          style={{ height: `${newH}px`, minHeight: item.newContracts > 0 ? '4px' : '0' }}
                          title={`新規: ${item.newContracts}`}
                        />
                        <div
                          className="w-3 rounded-t bg-red-400 transition-all hover:bg-red-500"
                          style={{ height: `${churnH}px`, minHeight: item.churnedContracts > 0 ? '4px' : '0' }}
                          title={`解約: ${item.churnedContracts}`}
                        />
                      </div>
                      <span className="mt-2 text-[10px] text-body-color dark:text-dark-6">
                        {monthLabel}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 flex items-center justify-center gap-4 text-xs text-body-color dark:text-dark-6">
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded bg-green-500" /> 新規契約
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded bg-red-400" /> 解約
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
