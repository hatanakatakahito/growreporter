import { X, RefreshCw, Sparkles, ArrowRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useSite } from '../../contexts/SiteContext';
import { usePlan } from '../../hooks/usePlan';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../config/firebase';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import LoadingSpinner from './LoadingSpinner';

/**
 * AI分析結果を表示するモーダル
 */
export default function AIAnalysisModal({ pageType, metrics, period, onClose, onLimitExceeded }) {
  const { selectedSiteId } = useSite();
  const { checkCanGenerate } = usePlan();
  const navigate = useNavigate();

  const [summary, setSummary] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [generatedAt, setGeneratedAt] = useState(null);
  const [fromCache, setFromCache] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadAnalysis(false);
  }, []);

  /**
   * AI分析を読み込み
   */
  const loadAnalysis = async (forceRegenerate = false) => {
    setIsLoading(true);
    setError(null);

    try {
      // 再生成時のみプラン制限チェック
      if (forceRegenerate && !checkCanGenerate()) {
        onLimitExceeded();
        return;
      }

      const generateAISummary = httpsCallable(functions, 'generateAISummary');
      const result = await generateAISummary({
        siteId: selectedSiteId,
        pageType,
        metrics,
        startDate: period?.startDate,
        endDate: period?.endDate,
        forceRegenerate,
      });

      const data = result.data;
      setSummary(data.summary);
      setRecommendations(data.recommendations || []);
      setGeneratedAt(data.generatedAt ? new Date(data.generatedAt) : new Date());
      setFromCache(data.fromCache || false);
    } catch (err) {
      console.error('[AIAnalysisModal] AI分析エラー:', err);
      
      if (err.code === 'functions/resource-exhausted') {
        onLimitExceeded();
      } else {
        setError('AI分析の生成に失敗しました。しばらくしてから再度お試しください。');
      }
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 改善タスクを作成
   */
  const handleCreateTasks = () => {
    if (recommendations.length === 0) return;

    const tasksParam = encodeURIComponent(JSON.stringify(recommendations));
    navigate(`/improve?action=add-from-ai&tasks=${tasksParam}`);
    onClose();
  };

  /**
   * ページタイプのラベルを取得
   */
  const getPageTypeLabel = () => {
    const labels = {
      summary: '全体サマリー',
      users: 'ユーザー属性',
      day: '日別分析',
      week: '曜日別分析',
      hour: '時間帯別分析',
      channels: '集客チャネル',
      keywords: '流入キーワード',
      referrals: '被リンク元',
      pages: 'ページ別',
      pageCategories: 'ページ分類別',
      landingPages: 'ランディングページ',
      fileDownloads: 'ファイルダウンロード',
      externalLinks: '外部リンククリック',
      conversions: 'コンバージョン一覧',
      reverseFlow: '逆算フロー',
    };
    return labels[pageType] || 'データ分析';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-lg bg-white shadow-2xl dark:bg-dark-2">
        {/* ヘッダー */}
        <div className="flex items-center justify-between border-b border-stroke p-6 dark:border-dark-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-pink-500">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-dark dark:text-white">AI分析</h2>
              <p className="text-sm text-body-color">{getPageTypeLabel()}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-gray-2 dark:hover:bg-dark-3"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* コンテンツ */}
        <div className="max-h-[calc(90vh-200px)] overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <LoadingSpinner />
              <p className="mt-4 text-sm text-body-color">AI分析を生成中...</p>
              <p className="mt-2 text-xs text-body-color">10秒ほどお待ちください</p>
            </div>
          ) : error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
              <p className="font-medium">エラーが発生しました</p>
              <p className="mt-1 text-sm">{error}</p>
            </div>
          ) : (
            <>
              {/* 分析結果 */}
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <ReactMarkdown>{summary}</ReactMarkdown>
              </div>

              {/* 改善提案セクション */}
              {recommendations.length > 0 && (
                <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950">
                  <h3 className="mb-2 flex items-center gap-2 font-semibold text-blue-900 dark:text-blue-100">
                    💡 改善提案（{recommendations.length}件）
                  </h3>
                  <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
                    {recommendations.map((rec, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="font-medium text-blue-600 dark:text-blue-400">
                          {index + 1}.
                        </span>
                        <div>
                          <span className="font-medium">{rec.title}</span>
                          {rec.description && (
                            <p className="mt-1 text-xs opacity-80">{rec.description}</p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* メタ情報 */}
              {generatedAt && (
                <div className="mt-4 flex items-center gap-4 text-xs text-body-color">
                  <span>最終生成: {format(generatedAt, 'yyyy年MM月dd日 HH:mm')}</span>
                  {fromCache && (
                    <span className="rounded bg-green-100 px-2 py-1 text-green-700 dark:bg-green-900 dark:text-green-300">
                      キャッシュ
                    </span>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* フッター */}
        {!isLoading && !error && (
          <div className="flex items-center justify-between border-t border-stroke p-6 dark:border-dark-3">
            <button
              onClick={() => loadAnalysis(true)}
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-lg border border-stroke px-4 py-2 text-sm font-medium text-dark transition hover:bg-gray-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-dark-3 dark:text-white dark:hover:bg-dark-3"
            >
              <RefreshCw className="h-4 w-4" />
              再分析
            </button>

            <div className="flex gap-2">
              {recommendations.length > 0 && (
                <button
                  onClick={handleCreateTasks}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2 text-sm font-medium text-white transition hover:bg-primary/90"
                >
                  改善タスクを作成
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={onClose}
                className="rounded-lg border border-stroke px-6 py-2 text-sm font-medium text-dark hover:bg-gray-2 dark:border-dark-3 dark:text-white dark:hover:bg-dark-3"
              >
                閉じる
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

