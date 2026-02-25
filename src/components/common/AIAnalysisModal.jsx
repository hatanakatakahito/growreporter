import { X, RefreshCw, Sparkles, Check } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSite } from '../../contexts/SiteContext';
import { usePlan } from '../../hooks/usePlan';
import { useAuth } from '../../contexts/AuthContext';
import { httpsCallable } from 'firebase/functions';
import { functions, db } from '../../config/firebase';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import LoadingSpinner from './LoadingSpinner';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';

/**
 * AI分析結果を表示するサイドシート（シート型UI）
 * @param {string} pageType - ページタイプ
 * @param {object} rawData - フロント画面で取得したCloud Functionの生データ（推奨）
 * @param {object} metrics - AI分析用メトリクス（旧方式・後方互換性用）
 * @param {object} period - 分析期間 { startDate, endDate }
 * @param {function} onClose - モーダルを閉じる関数
 * @param {function} onLimitExceeded - 制限超過時のコールバック
 */
export default function AIAnalysisModal({ pageType, rawData, metrics, period, onClose, onLimitExceeded }) {
  const { selectedSiteId, selectedSite } = useSite();
  const { checkCanGenerate } = usePlan();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [summary, setSummary] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [generatedAt, setGeneratedAt] = useState(null);
  const [fromCache, setFromCache] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [addedTaskIds, setAddedTaskIds] = useState(new Set());

  // 既存のタスクを取得（重複チェック用）
  const { data: existingTasks = [] } = useQuery({
    queryKey: ['improvements', selectedSiteId],
    queryFn: async () => {
      if (!selectedSiteId) return [];
      
      const q = query(collection(db, 'sites', selectedSiteId, 'improvements'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
    },
    enabled: !!selectedSiteId,
    staleTime: 1000 * 60, // 1分間キャッシュ
  });

  /**
   * AI分析を読み込み
   */
  const loadAnalysis = async (forceRegenerate = false) => {
    setIsLoading(true);
    setError(null);

    try {
      // 再生成時は常に制限チェック
      const usageType = pageType === 'comprehensive_improvement' ? 'improvement' : 'summary';
      if (forceRegenerate && !checkCanGenerate(usageType)) {
        onLimitExceeded();
        setIsLoading(false);
        return;
      }
      
      // データ検証
      if (!selectedSiteId) {
        throw new Error('サイトが選択されていません');
      }
      
      if (!pageType) {
        throw new Error('ページタイプが指定されていません');
      }
      
      // rawDataもmetricsもない場合はエラー
      if (!rawData && (!metrics || typeof metrics !== 'object')) {
        throw new Error('分析データが不正です');
      }
      
      // 初回ロード時もバックエンドで制限チェックされるが、
      // キャッシュがない場合のみカウントされる

      const generateAISummary = httpsCallable(functions, 'generateAISummary');
      
      console.log('[AIAnalysisModal] AI分析リクエスト:', {
        siteId: selectedSiteId,
        pageType,
        hasRawData: !!rawData,
        hasMetrics: !!metrics,
        rawDataKeys: rawData ? Object.keys(rawData) : [],
        metricsKeys: metrics ? Object.keys(metrics) : [],
        startDate: period?.startDate,
        endDate: period?.endDate,
      });
      
      // 新方式と旧方式の両対応
      const requestData = {
        siteId: selectedSiteId,
        pageType,
        startDate: period?.startDate,
        endDate: period?.endDate,
        forceRegenerate,
      };
      
      // rawDataがあれば優先的に使用（新方式）
      if (rawData) {
        requestData.rawData = rawData;
        console.log('[AIAnalysisModal] 新方式: rawDataを送信');
      } else if (metrics) {
        // metricsのみの場合（旧方式・後方互換性）
        requestData.metrics = metrics;
        console.log('[AIAnalysisModal] 旧方式: metricsを送信');
      }
      
      const result = await generateAISummary(requestData);

      if (!result || !result.data) {
        throw new Error('AI分析の結果が取得できませんでした');
      }

      const data = result.data;
      
      if (!data.summary) {
        throw new Error('AI分析の要約が生成されませんでした');
      }
      
      console.log('[AIAnalysisModal] AI分析成功:', {
        summaryLength: data.summary?.length || 0,
        recommendationsCount: data.recommendations?.length || 0,
        fromCache: data.fromCache,
      });
      
      setSummary(data.summary);
      setRecommendations(data.recommendations || []);
      setGeneratedAt(data.generatedAt ? new Date(data.generatedAt) : new Date());
      setFromCache(data.fromCache || false);
    } catch (err) {
      console.error('[AIAnalysisModal] AI分析エラー:', err);
      console.error('[AIAnalysisModal] エラー詳細:', {
        message: err.message,
        code: err.code,
        stack: err.stack,
      });
      
      if (err.code === 'functions/resource-exhausted') {
        onLimitExceeded();
      } else if (err.message) {
        setError(`AI分析エラー: ${err.message}`);
      } else {
        setError('AI分析の生成に失敗しました。しばらくしてから再度お試しください。');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // マウント時にAI分析を実行
  useEffect(() => {
    loadAnalysis(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * タスク追加のmutation
   */
  const addTaskMutation = useMutation({
    mutationFn: async (task) => {
      console.log('[AIAnalysisModal] タスク追加開始:', task);
      console.log('[AIAnalysisModal] selectedSiteId:', selectedSiteId);
      console.log('[AIAnalysisModal] 既存タスク数:', existingTasks.length);
      
      const newTask = {
        siteId: selectedSiteId,
        title: task.title || task.recommendation || 'AI提案タスク',
        description: task.description || '',
        category: task.category || 'other',
        priority: task.priority || 'medium',
        status: 'draft',
        expectedImpact: '',
        order: Date.now(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: user?.email || '',
      };
      
      console.log('[AIAnalysisModal] Firestoreに追加するデータ:', newTask);
      
      return await addDoc(collection(db, 'sites', selectedSiteId, 'improvements'), newTask);
    },
    onSuccess: (data, variables, context) => {
      console.log('[AIAnalysisModal] タスク追加成功:', data.id, variables);
      
      // キャッシュ無効化
      queryClient.invalidateQueries({ queryKey: ['improvements', selectedSiteId] });
      
      // 追加済みタスクとしてマーク（チェックマーク表示用）
      const taskKey = `${variables.title}_${variables.description}`;
      setAddedTaskIds(prev => {
        const newSet = new Set(prev);
        newSet.add(taskKey);
        return newSet;
      });
    },
    onError: (error) => {
      console.error('[AIAnalysisModal] タスク追加エラー:', error);
      console.error('[AIAnalysisModal] エラーコード:', error.code);
      console.error('[AIAnalysisModal] エラーメッセージ:', error.message);
      alert(`タスクの追加に失敗しました。\nエラー: ${error.message}\nもう一度お試しください。`);
    },
  });

  /**
   * ページタイプのラベルを取得
   */
  const getPageTypeLabel = () => {
    const labels = {
      dashboard: 'ダッシュボード',
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

              {/* comprehensive_improvementの場合のみ推奨アクションを表示 */}
              {pageType === 'comprehensive_improvement' && recommendations && recommendations.length > 0 && (
                <div className="mt-6 pt-6 border-t border-stroke dark:border-dark-3">
                  <h4 className="text-base font-semibold text-dark dark:text-white mb-4 flex items-center gap-2">
                    <span>💡</span>
                    <span>おすすめの改善タスク</span>
                  </h4>
                  <div className="space-y-3">
                    {recommendations.map((rec, index) => {
                      const taskKey = `${rec.title || rec.recommendation}_${rec.description || ''}`;
                      const taskTitle = rec.title || rec.recommendation;
                      const taskDescription = rec.description || '';
                      
                      // 既にFirestoreに存在するかチェック
                      const existsInFirestore = existingTasks.some(task => 
                        task.title === taskTitle && task.description === taskDescription
                      );
                      
                      // セッション内で追加したかチェック
                      const addedInSession = addedTaskIds.has(taskKey);
                      
                      const isAdded = existsInFirestore || addedInSession;
                      
                      return (
                        <div key={taskKey} className="rounded-lg bg-gray-50 dark:bg-dark-2 hover:bg-gray-100 dark:hover:bg-dark-3 transition-colors overflow-hidden">
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
                            {isAdded ? (
                              <div className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400 rounded">
                                <Check className="h-3.5 w-3.5" />
                                追加済み
                              </div>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  addTaskMutation.mutate(rec);
                                }}
                                disabled={addTaskMutation.isPending}
                                className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-white bg-primary rounded hover:bg-opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {addTaskMutation.isPending ? '追加中...' : 'タスク追加'}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 分析画面の場合は「サイト改善を起案する」ボタンを表示 */}
              {pageType !== 'comprehensive_improvement' && (
                <div className="mt-6 pt-6 border-t border-stroke dark:border-dark-3">
                  <div className="text-center">
                    <p className="text-sm text-body-color mb-4">
                      より詳細な改善提案をご覧になりたい場合は、サイト改善画面へ移動してください。
                    </p>
                    <Link
                      to="/improve?openAI=true"
                      onClick={onClose}
                      className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-white transition hover:bg-opacity-90"
                    >
                      <Sparkles className="h-4 w-4" />
                      サイト改善を起案する
                    </Link>
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

