import { useEffect, useState } from 'react';
import { setPageTitle } from '../../utils/pageTitle';
import { useImprovementBenchmarks } from '../../hooks/useImprovementBenchmarks';
import BenchmarkMatrix from '../../components/Admin/BenchmarkMatrix';
import BenchmarkCellDetailModal from '../../components/Admin/BenchmarkCellDetailModal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorAlert from '../../components/common/ErrorAlert';
import { RefreshCw } from 'lucide-react';
import { Button } from '../../components/ui/button';

/**
 * vivid Phase 3: 改善ナレッジ業種別ベンチマーク管理画面
 *
 * `/admin/improvement-knowledge`
 *
 * - 業種大分類 × ビジネスモデル × サイト役割 のマトリクスで集計値を表示
 * - セルクリックで詳細モーダル（Day 11-13 で実装予定、現在は console.log のみ）
 * - 5分キャッシュ、refetch ボタンあり
 *
 * セキュリティ: getImprovementBenchmarks callable 側で adminUsers チェック済
 */
export default function ImprovementKnowledge() {
  const [periodMonths, setPeriodMonths] = useState(0); // 0 = 全期間
  const { data, isLoading, error, refetch, isFetching } = useImprovementBenchmarks(
    periodMonths > 0 ? { periodMonths } : {}
  );
  const [selectedCell, setSelectedCell] = useState(null);

  useEffect(() => {
    setPageTitle('改善ナレッジ ベンチマーク');
  }, []);

  const handleCellClick = (cell) => {
    setSelectedCell(cell);
  };

  return (
    <div>
      {/* ヘッダー */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-dark dark:text-white">
            改善ナレッジ ベンチマーク
          </h2>
          <p className="mt-1 text-sm text-body-color dark:text-dark-6">
            検品済みの改善実績を業種・BM・サイト役割で集計したマトリクス。
            AIプロンプトのRAG注入元と同じデータを管理者向けに可視化。
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* 期間切替 */}
          <div>
            <label className="text-sm font-medium text-dark dark:text-white mr-2">期間:</label>
            <select
              value={periodMonths}
              onChange={(e) => setPeriodMonths(Number(e.target.value))}
              className="border border-stroke dark:border-dark-3 rounded px-2 py-1 text-sm bg-white dark:bg-dark-2"
              disabled={isFetching}
            >
              <option value={0}>全期間</option>
              <option value={3}>直近3ヶ月</option>
              <option value={6}>直近6ヶ月</option>
              <option value={12}>直近1年</option>
              <option value={24}>直近2年</option>
            </select>
          </div>
          <Button
            variant="ghost"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} />
            再取得
          </Button>
        </div>
      </div>

      {/* 状態別表示 */}
      {isLoading && (
        <div className="flex min-h-[400px] items-center justify-center">
          <LoadingSpinner />
        </div>
      )}

      {error && !isLoading && (
        <div className="flex min-h-[400px] items-center justify-center">
          <ErrorAlert
            message={error.message || 'ベンチマーク取得失敗'}
            onRetry={() => refetch()}
          />
        </div>
      )}

      {!isLoading && !error && data && (
        <BenchmarkMatrix data={data} onCellClick={handleCellClick} />
      )}

      {/* セル詳細モーダル */}
      {selectedCell && (
        <BenchmarkCellDetailModal
          cell={selectedCell}
          onClose={() => setSelectedCell(null)}
        />
      )}

      {/* 取得日時 */}
      {data?.computedAt && (
        <div className="mt-4 text-xs text-body-color dark:text-dark-6 text-right">
          集計日時: {new Date(data.computedAt).toLocaleString('ja-JP')}
        </div>
      )}
    </div>
  );
}
