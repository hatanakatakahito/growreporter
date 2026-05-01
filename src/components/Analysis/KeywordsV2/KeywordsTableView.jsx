import React, { useMemo } from 'react';
import ColumnToggle from '../../common/ColumnToggle';
import { useTableColumns } from '../../../hooks/useTableColumns';

const LAYER_LABELS_JA = {
  branded: '指名',
  pureIntent: '純顕在',
  intent: '顕在',
  latent: '潜在',
  noise: '無関係',
};

const COLUMNS = [
  { key: 'query', label: 'キーワード', required: true },
  { key: 'layer', label: '層分類' },
  { key: 'impressions', label: '表示回数' },
  { key: 'clicks', label: 'クリック' },
  { key: 'ctr', label: 'CTR' },
  { key: 'position', label: '順位' },
  { key: 'estimatedCV', label: '推定 CV' },
  { key: 'topPage', label: 'ランディング' },
];

export default function KeywordsTableView({ data }) {
  const keywords = data?.keywords || [];
  const colState = useTableColumns('analysis:keywords-v2:table', COLUMNS);

  const sorted = useMemo(() => {
    return [...keywords].sort((a, b) => b.clicks - a.clicks);
  }, [keywords]);

  const renderCell = (col, kw) => {
    switch (col.key) {
      case 'query':
        return <span className="font-medium text-dark dark:text-white">{kw.query}</span>;
      case 'layer':
        return <span className="rounded bg-slate-100 dark:bg-dark-3 px-1.5 py-0.5 text-[11px]">{LAYER_LABELS_JA[kw.layer] || '-'}</span>;
      case 'impressions':
        return <span className="font-mono">{kw.impressions.toLocaleString()}</span>;
      case 'clicks':
        return <span className="font-mono">{kw.clicks.toLocaleString()}</span>;
      case 'ctr':
        return <span>{((kw.ctr || 0) * 100).toFixed(2)}%</span>;
      case 'position':
        return <span className="font-mono text-dark dark:text-white">{(kw.position || 0).toFixed(1)} 位</span>;
      case 'estimatedCV':
        return <span className={kw.estimatedCV > 0 ? 'text-emerald-600 font-semibold' : 'text-body-color'}>{kw.estimatedCV}</span>;
      case 'topPage':
        return (
          <span className="text-xs text-primary truncate max-w-xs inline-block" title={kw.topPage}>
            {kw.topPage || '-'}
          </span>
        );
      default:
        return null;
    }
  };

  const cellAlign = (col) => (['impressions', 'clicks', 'ctr', 'position', 'estimatedCV'].includes(col.key) ? 'text-right' : 'text-left');

  if (sorted.length === 0) {
    return (
      <div className="rounded-lg border border-stroke bg-white p-12 text-center dark:border-dark-3 dark:bg-dark-2">
        <p className="text-body-color">表示するデータがありません。</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-dark dark:text-white">表形式</h3>
        <div data-tour="analysis-column-toggle">
          <ColumnToggle
            columns={COLUMNS}
            visibleColumns={colState.visibleColumns}
            columnOrder={colState.columnOrder}
            onToggleColumn={colState.toggleColumn}
            onMoveColumn={colState.moveColumn}
            onResetColumns={colState.resetToDefault}
          />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-stroke dark:border-dark-3 text-xs text-body-color">
              {colState.orderedVisibleColumns
                .map((key) => COLUMNS.find((c) => c.key === key))
                .filter(Boolean)
                .map((col) => (
                  <th
                    key={col.key}
                    className={`whitespace-nowrap px-3 py-2 font-semibold text-dark dark:text-white ${cellAlign(col)}`}
                  >
                    {col.label}
                  </th>
                ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-stroke dark:divide-dark-3 text-sm">
            {sorted.slice(0, 50).map((kw) => (
              <tr key={kw.query} className="hover:bg-blue-50/30 dark:hover:bg-dark-3/30">
                {colState.orderedVisibleColumns
                  .map((key) => COLUMNS.find((c) => c.key === key))
                  .filter(Boolean)
                  .map((col) => (
                    <td key={col.key} className={`whitespace-nowrap px-3 py-2.5 ${cellAlign(col)}`}>
                      {renderCell(col, kw)}
                    </td>
                  ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {sorted.length > 50 && (
        <p className="text-xs text-body-color text-center mt-3">
          上位 50 件を表示中（全 {sorted.length.toLocaleString()} 件）
        </p>
      )}
    </div>
  );
}

