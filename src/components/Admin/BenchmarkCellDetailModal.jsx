import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { INDUSTRY_MAJOR_LABELS } from '../../constants/industriesV2';
import { BUSINESS_MODEL_LABELS } from '../../constants/businessModels';
import { SITE_ROLE_LABELS } from '../../constants/siteRoles';
import { Dialog, DialogTitle, DialogBody, DialogActions } from '../ui/dialog';
import { Button } from '../ui/button';

/**
 * vivid Phase 3: 改善ナレッジ ベンチマークセル詳細モーダル
 *
 * 表示内容:
 *   - 該当セル（業種 × BM × 役割）のメタ情報
 *   - 集計値: N, median/avg changePercent, median/avg overallScore
 *   - achievementLevel 分布（横棒）
 *   - overallScore 分布ヒストグラム（recharts BarChart）
 *   - 改善案件一覧（overallScore 降順、最大50件）
 *
 * 匿名化:
 *   - 改善案件はサマリ + 数値のみ、サイト名/URL/特定可能な情報なし
 *   - 元データ（improvementKnowledge コレクション）には siteId 等の特定情報なし、
 *     measureImprovementEffects.js が anonymize して書き込んでいる
 *
 * @param {object} cell - BenchmarkCell オブジェクト
 * @param {function} onClose - モーダル閉じるコールバック
 */
export default function BenchmarkCellDetailModal({ cell, onClose }) {
  // overallScore のヒストグラムデータ生成（10刻みでビニング）
  const histogramData = useMemo(() => {
    if (!cell?.improvements) return [];
    const bins = [
      { range: '0-1', min: 0, max: 1, count: 0 },
      { range: '1-2', min: 1, max: 2, count: 0 },
      { range: '2-3', min: 2, max: 3, count: 0 },
      { range: '3-4', min: 3, max: 4, count: 0 },
      { range: '4-5', min: 4, max: 5.01, count: 0 },
    ];
    for (const imp of cell.improvements) {
      const s = imp.overallScore;
      if (typeof s !== 'number') continue;
      const bin = bins.find((b) => s >= b.min && s < b.max);
      if (bin) bin.count++;
    }
    return bins;
  }, [cell]);

  // achievementLevel 分布計算
  const achievementChart = useMemo(() => {
    const levels = cell?.achievementLevels || { exceeded: 0, met: 0, partial: 0, not_met: 0 };
    const total = levels.exceeded + levels.met + levels.partial + levels.not_met;
    if (total === 0) return [];
    return [
      { label: 'exceeded', count: levels.exceeded, pct: (levels.exceeded / total) * 100, color: 'bg-green-500' },
      { label: 'met', count: levels.met, pct: (levels.met / total) * 100, color: 'bg-blue-500' },
      { label: 'partial', count: levels.partial, pct: (levels.partial / total) * 100, color: 'bg-yellow-500' },
      { label: 'not_met', count: levels.not_met, pct: (levels.not_met / total) * 100, color: 'bg-red-400' },
    ];
  }, [cell]);

  if (!cell) return null;

  const industryLabel = INDUSTRY_MAJOR_LABELS[cell.industryMajor] || cell.industryMajor;
  const bmLabel = BUSINESS_MODEL_LABELS[cell.businessModel] || cell.businessModel;
  const roleLabel = SITE_ROLE_LABELS[cell.siteRole] || cell.siteRole;

  // N に応じたラベル
  const nLabel = cell.N >= 10 ? '安定値' : cell.N >= 3 ? '参考値' : 'データ不足';
  const nLabelClass = cell.N >= 10
    ? 'bg-green-100 text-green-800'
    : cell.N >= 3
    ? 'bg-yellow-100 text-yellow-800'
    : 'bg-gray-100 text-gray-700';

  return (
    <Dialog open={true} onClose={onClose} size="3xl">
      <DialogTitle>
        <div className="flex items-center gap-2 flex-wrap">
          <span>{industryLabel}</span>
          <span className="text-body-color">×</span>
          <span>{bmLabel}</span>
          <span className="text-body-color">×</span>
          <span>{roleLabel}</span>
          <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${nLabelClass}`}>
            N={cell.N} ({nLabel})
          </span>
        </div>
      </DialogTitle>
      <DialogBody>
        {/* 集計値 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatCard label="件数 (N)" value={cell.N} />
          <StatCard
            label="変化率 中央値"
            value={typeof cell.medianChangePercent === 'number'
              ? `${cell.medianChangePercent >= 0 ? '+' : ''}${cell.medianChangePercent.toFixed(0)}%`
              : '-'}
          />
          <StatCard
            label="変化率 平均"
            value={typeof cell.avgChangePercent === 'number'
              ? `${cell.avgChangePercent >= 0 ? '+' : ''}${cell.avgChangePercent.toFixed(1)}%`
              : '-'}
          />
          <StatCard
            label="overallScore 中央値"
            value={typeof cell.medianOverallScore === 'number'
              ? cell.medianOverallScore.toFixed(2)
              : '-'}
          />
        </div>

        {/* achievementLevel 分布 */}
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-dark dark:text-white mb-2">
            達成度分布 (achievementLevel)
          </h4>
          {achievementChart.length === 0 ? (
            <div className="text-sm text-body-color">データなし</div>
          ) : (
            <div className="space-y-2">
              {achievementChart.map((row) => (
                <div key={row.label} className="flex items-center gap-2 text-sm">
                  <span className="w-20 text-dark dark:text-white">{row.label}</span>
                  <div className="flex-1 bg-gray-100 dark:bg-dark-3 rounded h-5 relative overflow-hidden">
                    <div
                      className={`h-full ${row.color}`}
                      style={{ width: `${row.pct}%` }}
                    ></div>
                    <span className="absolute inset-0 flex items-center px-2 text-xs text-dark dark:text-white">
                      {row.count}件 ({row.pct.toFixed(0)}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* overallScore ヒストグラム */}
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-dark dark:text-white mb-2">
            overallScore 分布
          </h4>
          {histogramData.every((b) => b.count === 0) ? (
            <div className="text-sm text-body-color">スコアデータなし</div>
          ) : (
            <div style={{ width: '100%', height: 180 }}>
              <ResponsiveContainer>
                <BarChart data={histogramData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                  <XAxis dataKey="range" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3758F9" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* 改善案件一覧 */}
        <div>
          <h4 className="text-sm font-semibold text-dark dark:text-white mb-2">
            改善案件一覧（overallScore 降順、最大50件）
          </h4>
          {!cell.improvements || cell.improvements.length === 0 ? (
            <div className="text-sm text-body-color">該当する改善案件がありません</div>
          ) : (
            <div className="border border-stroke dark:border-dark-3 rounded max-h-96 overflow-y-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 dark:bg-dark-3 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left text-dark dark:text-white">#</th>
                    <th className="px-3 py-2 text-left text-dark dark:text-white">カテゴリ</th>
                    <th className="px-3 py-2 text-left text-dark dark:text-white">改善概要</th>
                    <th className="px-3 py-2 text-right text-dark dark:text-white">主指標</th>
                    <th className="px-3 py-2 text-right text-dark dark:text-white">変化率</th>
                    <th className="px-3 py-2 text-right text-dark dark:text-white">score</th>
                    <th className="px-3 py-2 text-center text-dark dark:text-white">達成度</th>
                  </tr>
                </thead>
                <tbody>
                  {cell.improvements.map((imp, i) => (
                    <tr key={imp.id || i} className="border-t border-stroke dark:border-dark-3">
                      <td className="px-3 py-2 text-body-color dark:text-dark-6">{i + 1}</td>
                      <td className="px-3 py-2 text-body-color dark:text-dark-6">
                        {imp.category || '-'}
                      </td>
                      <td className="px-3 py-2 text-dark dark:text-white">
                        {imp.summary || '(概要なし)'}
                      </td>
                      <td className="px-3 py-2 text-right text-body-color dark:text-dark-6 font-mono text-xs">
                        {imp.primaryMetric || '-'}
                      </td>
                      <td className="px-3 py-2 text-right text-body-color dark:text-dark-6">
                        {typeof imp.changePercent === 'number'
                          ? `${imp.changePercent >= 0 ? '+' : ''}${imp.changePercent.toFixed(0)}%`
                          : '-'}
                      </td>
                      <td className="px-3 py-2 text-right text-body-color dark:text-dark-6">
                        {typeof imp.overallScore === 'number'
                          ? imp.overallScore.toFixed(1)
                          : '-'}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <AchievementBadge level={imp.achievementLevel} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </DialogBody>
      <DialogActions>
        <Button variant="ghost" onClick={onClose}>閉じる</Button>
      </DialogActions>
    </Dialog>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="bg-gray-50 dark:bg-dark-3 rounded-lg p-3">
      <div className="text-xs text-body-color dark:text-dark-6">{label}</div>
      <div className="text-xl font-bold text-dark dark:text-white mt-1">{value}</div>
    </div>
  );
}

function AchievementBadge({ level }) {
  if (!level) return <span className="text-body-color">-</span>;
  const styles = {
    exceeded: 'bg-green-100 text-green-800',
    met: 'bg-blue-100 text-blue-800',
    partial: 'bg-yellow-100 text-yellow-800',
    not_met: 'bg-red-100 text-red-800',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs ${styles[level] || 'bg-gray-100 text-gray-700'}`}>
      {level}
    </span>
  );
}
