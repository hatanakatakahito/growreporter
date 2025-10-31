import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../config/firebase';
import { Sparkles } from 'lucide-react';
import LoadingSpinner from '../common/LoadingSpinner';

/**
 * AI分析サイドシートコンポーネント
 * @param {object} props
 * @param {boolean} props.isOpen - シートの開閉状態
 * @param {function} props.onClose - シートを閉じる関数
 * @param {string} props.pageType - ページタイプ（summary, timeSeriesなど）
 * @param {string} props.startDate - 開始日
 * @param {string} props.endDate - 終了日
 * @param {object} props.metrics - 分析対象のメトリクスデータ
 */
export default function AISummarySheet({ 
  isOpen, 
  onClose, 
  pageType = 'summary',
  startDate,
  endDate,
  metrics 
}) {
  const navigate = useNavigate();
  const [summary, setSummary] = useState('');
  const [recommendations, setRecommendations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isCached, setIsCached] = useState(false);
  const [generatedAt, setGeneratedAt] = useState('');

  // AI要約を生成
  const generateSummary = async () => {
    if (!startDate || !endDate || !metrics) {
      setError('データが不足しています。日付範囲とメトリクスを選択してください。');
      return;
    }

    setIsLoading(true);
    setError('');
    setSummary('');

    try {
      const generateAISummary = httpsCallable(functions, 'generateAISummary');
      const result = await generateAISummary({
        pageType,
        startDate,
        endDate,
        metrics,
      });

      setSummary(result.data.summary);
      setRecommendations(result.data.recommendations || []);
      setIsCached(result.data.cached);
      setGeneratedAt(result.data.generatedAt);
    } catch (err) {
      console.error('AI分析エラー:', err);
      setError(err.message || 'AI分析の生成に失敗しました。');
    } finally {
      setIsLoading(false);
    }
  };

  // シートが開かれたときに自動的に生成
  useEffect(() => {
    if (isOpen && !summary && !isLoading) {
      generateSummary();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

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
              <p className="text-sm text-dark dark:text-white mt-1">
                {startDate} 〜 {endDate}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-dark dark:text-white hover:text-primary transition-colors"
              aria-label="閉じる"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
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
                <div>
                  <h3 className="text-sm font-medium text-red-800 dark:text-red-300">
                    エラーが発生しました
                  </h3>
                  <p className="mt-1 text-sm text-red-700 dark:text-red-400">
                    {error}
                  </p>
                  <button
                    onClick={generateSummary}
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
              {isCached && (
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
                  {generatedAt && ` (生成: ${new Date(generatedAt).toLocaleString('ja-JP')})`}
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
                      <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-dark-2 hover:bg-gray-100 dark:hover:bg-dark-3 transition-colors">
                        <span className="text-sm font-semibold text-gray-500 dark:text-gray-400 mt-0.5">{index + 1}.</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-dark dark:text-white mb-1">{rec.title}</p>
                          {rec.description && (
                            <p className="text-xs text-body-color line-clamp-3">{rec.description}</p>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            onClose();
                            navigate(`/improve?action=add&title=${encodeURIComponent(rec.title)}&description=${encodeURIComponent(rec.description)}&category=${rec.category}&priority=${rec.priority}`);
                          }}
                          className="flex-shrink-0 px-3 py-1.5 text-xs font-medium text-white bg-primary rounded hover:bg-opacity-90 transition-colors"
                        >
                          タスク追加
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 再生成ボタン */}
              <div className="mt-6 pt-6 border-t border-stroke dark:border-dark-3">
                <button
                  onClick={generateSummary}
                  disabled={isLoading}
                  className="w-full inline-flex items-center justify-center rounded-md bg-primary px-5 py-3 text-base font-medium text-white hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  再生成
                </button>
              </div>
            </>
          )}

          {/* 初期状態（データなし） */}
          {!summary && !isLoading && !error && (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <svg
                  className="w-8 h-8 text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
              </div>
              <p className="text-dark dark:text-white">
                「AI分析を生成」ボタンをクリックして分析を開始してください
              </p>
              <button
                onClick={generateSummary}
                className="mt-4 inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-base font-medium text-white hover:bg-opacity-90 transition-colors"
              >
                AI分析を生成
              </button>
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="sticky bottom-0 bg-gray-50 dark:bg-dark-2 border-t border-stroke dark:border-dark-3 px-6 py-4">
          <div className="flex items-center text-xs text-dark dark:text-white">
            <svg
              className="w-4 h-4 mr-2 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            <span>
              この分析はGoogle Gemini AIによって生成されています。必ず内容を確認してください。
            </span>
          </div>
        </div>
      </div>
    </>
  );
}

