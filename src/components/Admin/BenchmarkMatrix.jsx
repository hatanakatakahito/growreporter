import { useMemo, useState } from 'react';
import { INDUSTRY_MAJOR_LABELS } from '../../constants/industriesV2';
import { BUSINESS_MODEL_LABELS } from '../../constants/businessModels';
import { SITE_ROLE_LABELS } from '../../constants/siteRoles';

/**
 * vivid Phase 3: 改善ナレッジ業種別ベンチマーク マトリクス UI
 *
 * 行: 業種大分類（17）
 * 列: ビジネスモデル（B2B / B2C / B2B2C / other）× サイト役割（コーポレート / サービスLP）
 *     → 簡略化のため、初期版は「業種 × BM × 役割」の3次元を「業種 × (BM-Role)」の2次元に折りたたむ
 *
 * セル: 該当データの N（件数）と median スコア
 *   - N >= 10: 安定値、緑
 *   - 3 <= N < 10: 参考値、黄
 *   - N < 3: データ不足、グレー
 *
 * セルクリック: 詳細モーダル表示（Day 11-13 で実装）
 *
 * @param {object} data - useImprovementBenchmarks の返り値
 * @param {function} onCellClick - セルクリック時のコールバック (cell) => void
 */
export default function BenchmarkMatrix({ data, onCellClick }) {
  // フィルター: 表示する BM × Role の組み合わせを選択
  const [selectedBM, setSelectedBM] = useState('all');
  const [selectedRole, setSelectedRole] = useState('all');

  // セルを業種 × (businessModel × siteRole) でグループ化（カテゴリ別は集約）
  const matrix = useMemo(() => {
    if (!data?.cells) return new Map();
    const grouped = new Map(); // industryMajor -> { bmRoleKey -> aggregatedCell }
    for (const cell of data.cells) {
      // フィルタ
      if (selectedBM !== 'all' && cell.businessModel !== selectedBM) continue;
      if (selectedRole !== 'all' && cell.siteRole !== selectedRole) continue;
      const ind = cell.industryMajor;
      const bmRoleKey = `${cell.businessModel}__${cell.siteRole}`;
      if (!grouped.has(ind)) grouped.set(ind, new Map());
      const indMap = grouped.get(ind);
      if (!indMap.has(bmRoleKey)) {
        indMap.set(bmRoleKey, {
          industryMajor: ind,
          businessModel: cell.businessModel,
          siteRole: cell.siteRole,
          N: 0,
          changePercents: [],
          overallScores: [],
          improvements: [],
          categories: new Set(),
          achievementLevels: { exceeded: 0, met: 0, partial: 0, not_met: 0 },
        });
      }
      const agg = indMap.get(bmRoleKey);
      agg.N += cell.N;
      // achievementLevels を category 横断で合算
      const levels = cell.achievementLevels || {};
      for (const k of ['exceeded', 'met', 'partial', 'not_met']) {
        agg.achievementLevels[k] += Number(levels[k] || 0);
      }
      // 元のセルから個別 improvement を取り出して再集計
      for (const imp of cell.improvements) {
        agg.improvements.push({ ...imp, category: cell.category });
        if (typeof imp.changePercent === 'number') agg.changePercents.push(imp.changePercent);
        if (typeof imp.overallScore === 'number') agg.overallScores.push(imp.overallScore);
      }
      agg.categories.add(cell.category);
    }
    // median 計算
    const median = (arr) => {
      if (arr.length === 0) return null;
      const sorted = [...arr].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
    };
    for (const indMap of grouped.values()) {
      for (const agg of indMap.values()) {
        agg.medianChangePercent = median(agg.changePercents);
        agg.medianOverallScore = median(agg.overallScores);
      }
    }
    return grouped;
  }, [data, selectedBM, selectedRole]);

  // 列ヘッダー候補: フィルタに応じて変動
  const columns = useMemo(() => {
    const cols = [];
    const bms = selectedBM === 'all' ? Object.keys(BUSINESS_MODEL_LABELS) : [selectedBM];
    const roles = selectedRole === 'all' ? Object.keys(SITE_ROLE_LABELS) : [selectedRole];
    for (const bm of bms) {
      for (const role of roles) {
        cols.push({
          bmRoleKey: `${bm}__${role}`,
          bm,
          role,
          label: `${BUSINESS_MODEL_LABELS[bm] || bm}\n${SITE_ROLE_LABELS[role] || role}`,
        });
      }
    }
    return cols;
  }, [selectedBM, selectedRole]);

  // 業種行のソート: N の合計が多い順
  const industryRows = useMemo(() => {
    const rows = [];
    for (const [ind, indMap] of matrix.entries()) {
      let totalN = 0;
      for (const cell of indMap.values()) totalN += cell.N;
      rows.push({ industryMajor: ind, totalN, indMap });
    }
    rows.sort((a, b) => b.totalN - a.totalN);
    return rows;
  }, [matrix]);

  if (!data || !data.cells) return null;

  return (
    <div className="space-y-4">
      {/* フィルター */}
      <div className="flex gap-4 items-center flex-wrap">
        <div>
          <label className="text-sm font-medium text-dark dark:text-white mr-2">ビジネスモデル:</label>
          <select
            value={selectedBM}
            onChange={(e) => setSelectedBM(e.target.value)}
            className="border border-stroke dark:border-dark-3 rounded px-2 py-1 text-sm bg-white dark:bg-dark-2"
          >
            <option value="all">全て</option>
            {Object.entries(BUSINESS_MODEL_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-dark dark:text-white mr-2">サイト役割:</label>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="border border-stroke dark:border-dark-3 rounded px-2 py-1 text-sm bg-white dark:bg-dark-2"
          >
            <option value="all">全て</option>
            {Object.entries(SITE_ROLE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
        <div className="text-sm text-body-color dark:text-dark-6 ml-auto">
          総レコード数: {data.totalDocs}件 / セル分類: {data.cells.length}通り
        </div>
      </div>

      {/* マトリクス本体 */}
      <div className="overflow-x-auto border border-stroke dark:border-dark-3 rounded-lg">
        <table className="min-w-full bg-white dark:bg-dark-2">
          <thead>
            <tr className="bg-gray-50 dark:bg-dark-3 border-b border-stroke dark:border-dark-3">
              <th className="sticky left-0 bg-gray-50 dark:bg-dark-3 text-left px-4 py-3 text-sm font-semibold text-dark dark:text-white border-r border-stroke dark:border-dark-3 min-w-[180px]">
                業種大分類
              </th>
              {columns.map((col) => (
                <th
                  key={col.bmRoleKey}
                  className="text-center px-3 py-3 text-xs font-semibold text-dark dark:text-white border-r border-stroke dark:border-dark-3 min-w-[120px] whitespace-pre-line"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {industryRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="text-center py-8 text-body-color dark:text-dark-6">
                  データがありません
                </td>
              </tr>
            ) : (
              industryRows.map(({ industryMajor, indMap }) => (
                <tr
                  key={industryMajor}
                  className="border-b border-stroke dark:border-dark-3 hover:bg-gray-50 dark:hover:bg-dark-3"
                >
                  <td className="sticky left-0 bg-white dark:bg-dark-2 px-4 py-3 text-sm font-medium text-dark dark:text-white border-r border-stroke dark:border-dark-3">
                    {INDUSTRY_MAJOR_LABELS[industryMajor] || industryMajor}
                  </td>
                  {columns.map((col) => {
                    const cell = indMap.get(col.bmRoleKey);
                    return (
                      <CellView
                        key={col.bmRoleKey}
                        cell={cell}
                        onClick={() => cell && cell.N > 0 && onCellClick?.(cell)}
                      />
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 凡例 */}
      <div className="flex gap-4 text-xs text-body-color dark:text-dark-6">
        <span><span className="inline-block w-3 h-3 bg-green-100 border border-green-400 rounded mr-1"></span>N ≥ 10（安定値）</span>
        <span><span className="inline-block w-3 h-3 bg-yellow-100 border border-yellow-400 rounded mr-1"></span>3 ≤ N &lt; 10（参考値）</span>
        <span><span className="inline-block w-3 h-3 bg-gray-100 border border-gray-300 rounded mr-1"></span>N &lt; 3（データ不足）</span>
      </div>
    </div>
  );
}

/**
 * 個別セル表示
 */
function CellView({ cell, onClick }) {
  if (!cell || cell.N === 0) {
    return (
      <td className="text-center px-2 py-3 text-xs text-gray-400 dark:text-dark-6 border-r border-stroke dark:border-dark-3">
        —
      </td>
    );
  }

  const N = cell.N;
  const score = cell.medianOverallScore;
  const change = cell.medianChangePercent;

  let bgClass = 'bg-gray-50 dark:bg-dark-3';
  let label = 'データ不足';
  if (N >= 10) {
    bgClass = 'bg-green-50 dark:bg-green-900/20';
    label = '安定値';
  } else if (N >= 3) {
    bgClass = 'bg-yellow-50 dark:bg-yellow-900/20';
    label = '参考値';
  }

  const showStats = N >= 3;
  const interactive = N > 0;

  return (
    <td
      onClick={onClick}
      className={`text-center px-2 py-3 text-xs border-r border-stroke dark:border-dark-3 ${bgClass} ${
        interactive ? 'cursor-pointer hover:opacity-80' : ''
      }`}
      title={interactive ? `クリックで詳細表示（${label}）` : ''}
    >
      <div className="font-semibold text-dark dark:text-white">N={N}</div>
      {showStats && (
        <>
          <div className="text-body-color dark:text-dark-6 mt-1">
            {typeof score === 'number' ? `score ${score.toFixed(1)}` : '-'}
          </div>
          <div className="text-body-color dark:text-dark-6">
            {typeof change === 'number' ? `${change >= 0 ? '+' : ''}${change.toFixed(0)}%` : '-'}
          </div>
        </>
      )}
    </td>
  );
}
