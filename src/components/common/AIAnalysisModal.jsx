import { X, RefreshCw, Sparkles } from 'lucide-react';
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
 * AI分析結果を表示するサイドシート（シート型UI）
 */
export default function AIAnalysisModal({ pageType, metrics, period, onClose, onLimitExceeded }) {
  const { selectedSiteId, selectedSite } = useSite();
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
      
      // コンバージョン定義をmetricsに追加
      const enrichedMetrics = {
        ...metrics,
        conversionEvents: selectedSite?.conversionEvents || [],
      };
      
      // デバッグ: コンバージョンデータを確認
      console.log('[AIAnalysisModal] selectedSite.conversionEvents:', selectedSite?.conversionEvents);
      console.log('[AIAnalysisModal] metrics.conversions:', metrics.conversions);
      console.log('[AIAnalysisModal] enrichedMetrics:', enrichedMetrics);
      
      const result = await generateAISummary({
        siteId: selectedSiteId,
        pageType,
        metrics: enrichedMetrics,
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
    <>
      {/* オーバーレイ */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-[9998] transition-opacity"
        onClick={onClose}
      />

      {/* サイドシート */}
      <div className="fixed top-0 right-0 h-full w-full max-w-2xl bg-white dark:bg-dark shadow-xl z-[9999] transform transition-transform duration-300 ease-in-out overflow-y-auto">
        {/* ヘッダー */}
        <div className="sticky top-0 bg-white dark:bg-dark border-b border-stroke dark:border-dark-3 px-6 py-4 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-xl font-semibold text-dark dark:text-white">
                <Sparkles className="h-5 w-5 text-primary" />
                AI分析
              </h2>
              <p className="text-sm text-body-color mt-1">
                {getPageTypeLabel()}
              </p>
              {period && (
                <p className="text-xs text-body-color mt-1">
                  {format(new Date(period.startDate), 'yyyy年MM月dd日')} 〜 {format(new Date(period.endDate), 'yyyy年MM月dd日')}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-dark dark:text-white hover:text-primary transition-colors"
              aria-label="閉じる"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* コンテンツ */}
        <div className="px-6 py-6">
          {/* ローディング */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12">
              <LoadingSpinner size="lg" />
              <p className="mt-4 text-dark dark:text-white">
                AI分析を生成しています...
              </p>
              <p className="mt-2 text-sm text-body-color">
                10秒ほどお待ちください
              </p>
            </div>
          )}

          {/* エラー */}
          {error && !isLoading && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-start">
                <svg
                  className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-red-800 dark:text-red-300">
                    エラーが発生しました
                  </h3>
                  <p className="mt-1 text-sm text-red-700 dark:text-red-400">
                    {error}
                  </p>
                  <button
                    onClick={() => loadAnalysis(false)}
                    className="mt-3 text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-medium"
                  >
                    再試行
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* AI要約 */}
          {summary && !isLoading && (
            <>
              {/* キャッシュ表示 */}
              {fromCache && (
                <div className="mb-4 flex items-center text-xs text-dark dark:text-white bg-gray-50 dark:bg-dark-2 rounded px-3 py-2">
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                      clipRule="evenodd"
                    />
                  </svg>
                  キャッシュ済みの分析結果を表示しています
                  {generatedAt && ` (生成: ${format(generatedAt, 'yyyy/MM/dd HH:mm')})`}
                </div>
              )}

              {/* Markdown表示 */}
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown
                  components={{
                    h1: ({ node, ...props }) => (
                      <h1 className="text-2xl font-bold text-dark dark:text-white mt-6 mb-4" {...props} />
                    ),
                    h2: ({ node, ...props }) => (
                      <h2 className="text-xl font-semibold text-dark dark:text-white mt-5 mb-3" {...props} />
                    ),
                    h3: ({ node, ...props }) => (
                      <h3 className="text-lg font-semibold text-dark dark:text-white mt-4 mb-2" {...props} />
                    ),
                    h4: ({ node, ...props }) => (
                      <h4 className="text-base font-semibold text-dark dark:text-white mt-3 mb-2" {...props} />
                    ),
                    p: ({ node, ...props }) => (
                      <p className="text-sm text-dark dark:text-white leading-relaxed mb-3" {...props} />
                    ),
                    ul: ({ node, ...props }) => (
                      <ul className="list-disc list-inside text-dark dark:text-white space-y-1 mb-3 text-sm" {...props} />
                    ),
                    ol: ({ node, ...props }) => (
                      <ol className="list-decimal list-inside text-dark dark:text-white space-y-1 mb-3 text-sm" {...props} />
                    ),
                    li: ({ node, ...props }) => (
                      <li className="text-sm text-dark dark:text-white ml-2" {...props} />
                    ),
                    strong: ({ node, ...props }) => (
                      <strong className="font-semibold text-dark dark:text-white" {...props} />
                    ),
                    em: ({ node, ...props }) => (
                      <em className="italic text-dark dark:text-white" {...props} />
                    ),
                    code: ({ node, ...props }) => (
                      <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-xs font-mono" {...props} />
                    ),
                  }}
                >
                  {summary}
                </ReactMarkdown>
              </div>

              {/* 推奨アクション */}
              {recommendations && recommendations.length > 0 && (
                <div className="mt-6 pt-6 border-t border-stroke dark:border-dark-3">
                  <h4 className="text-base font-semibold text-dark dark:text-white mb-4 flex items-center gap-2">
                    <span>💡</span>
                    <span>おすすめの改善タスク</span>
                  </h4>
                  <div className="space-y-3">
                    {recommendations.map((rec, index) => (
                      <div key={index} className="rounded-lg bg-gray-50 dark:bg-dark-2 hover:bg-gray-100 dark:hover:bg-dark-3 transition-colors overflow-hidden">
                        {/* 上段: タスク名 */}
                        <div className="flex items-start gap-3 p-3 pb-2 border-b border-gray-200 dark:border-dark-3">
                          <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">{index + 1}.</span>
                          <p className="flex-1 text-sm font-semibold text-dark dark:text-white">{rec.title || rec.recommendation}</p>
                        </div>
                        
                        {/* 下段: 説明文とボタン */}
                        <div className="p-3 pt-2">
                          {rec.description && (
                            <p className="text-xs text-body-color leading-relaxed mb-3">{rec.description}</p>
                          )}
                          <button
                            onClick={() => {
                              onClose();
                              navigate(`/improve?action=add&title=${encodeURIComponent(rec.title || rec.recommendation)}&description=${encodeURIComponent(rec.description || '')}&category=${rec.category || 'other'}&priority=${rec.priority || 'medium'}`);
                            }}
                            className="inline-flex px-3 py-1.5 text-xs font-medium text-white bg-primary rounded hover:bg-opacity-90 transition-colors"
                          >
                            タスク追加
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 再生成ボタン */}
              <div className="mt-6 flex items-center justify-between pt-4 border-t border-stroke dark:border-dark-3">
                <span className="text-xs text-body-color">
                  {generatedAt && `最終生成: ${format(generatedAt, 'yyyy/MM/dd HH:mm')}`}
                </span>
                <button
                  onClick={() => loadAnalysis(true)}
                  disabled={isLoading}
                  className="inline-flex items-center gap-2 rounded-lg border border-stroke px-4 py-2 text-sm font-medium text-dark transition hover:bg-gray-2 disabled:opacity-50 dark:border-dark-3 dark:text-white dark:hover:bg-dark-3"
                >
                  <RefreshCw className="h-4 w-4" />
                  再分析
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
