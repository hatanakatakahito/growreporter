import { RefreshCw, Sparkles, Check, AlertCircle, ArrowRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSite } from '../../contexts/SiteContext';
import { usePlan } from '../../hooks/usePlan';
import { useAuth } from '../../contexts/AuthContext';
import { httpsCallable } from 'firebase/functions';
import { functions, db } from '../../config/firebase';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import DotWaveSpinner from '../common/DotWaveSpinner';
import UpgradeModal from '../common/UpgradeModal';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';

/**
 * AI分析セクション（タブ内に表示）
 * @param {string} pageType - ページタイプ
 * @param {object} rawData - フロント画面で取得したCloud Functionの生データ
 * @param {object} metrics - AI分析用メトリクス
 * @param {object} period - 分析期間 { startDate, endDate }
 * @param {object|null} comparisonRawData - 比較期間の生データ（比較時のみ）
 * @param {object|null} comparisonPeriod - 比較期間 { startDate, endDate }（比較時のみ）
 * @param {function} onLimitExceeded - 制限超過時のコールバック
 */
export default function AIAnalysisSection({ pageType, rawData, metrics, period, comparisonRawData, comparisonPeriod, onLimitExceeded }) {
  const { selectedSiteId, selectedSite } = useSite();
  const { checkCanGenerate, planId } = usePlan();
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();

  const [summary, setSummary] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [generatedAt, setGeneratedAt] = useState(null);
  const [fromCache, setFromCache] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [addedTaskIds, setAddedTaskIds] = useState(new Set());
  
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  // 既存のタスクを取得
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
    staleTime: 1000 * 60,
  });

  // AI分析を読み込み
  const loadAnalysis = async (forceRegenerate = false) => {
    setIsLoading(true);
    setError(null);

    try {
      const usageType = pageType === 'comprehensive_improvement' ? 'improvement' : 'summary';
      if (forceRegenerate && !checkCanGenerate(usageType)) {
        if (onLimitExceeded) onLimitExceeded();
        setIsLoading(false);
        return;
      }
      
      if (!selectedSiteId || !pageType) {
        throw new Error('必要なデータが不足しています');
      }
      
      if (!rawData && (!metrics || typeof metrics !== 'object')) {
        throw new Error('分析データが不正です');
      }

      const generateAISummary = httpsCallable(functions, 'generateAISummary');
      
      const params = {
        siteId: selectedSiteId,
        pageType,
        rawData: rawData || null,
        metrics: metrics || null,
        startDate: period?.startDate || new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
        endDate: period?.endDate || new Date(new Date().getFullYear(), new Date().getMonth(), 0),
        forceRegenerate,
      };

      // 比較期間データがある場合のみ追加（コスト最適化）
      if (comparisonRawData && comparisonPeriod?.startDate && comparisonPeriod?.endDate) {
        params.comparisonRawData = comparisonRawData;
        params.comparisonStartDate = comparisonPeriod.startDate;
        params.comparisonEndDate = comparisonPeriod.endDate;
      }

      const result = await generateAISummary(params);

      const data = result.data;
      
      setSummary(data.summary || null);
      setRecommendations(data.recommendations || []);
      setGeneratedAt(data.generatedAt || null);
      setFromCache(data.fromCache || false);
    } catch (err) {
      console.error('[AIAnalysisSection] AI分析エラー:', err);
      
      if (err.code === 'functions/resource-exhausted') {
        if (onLimitExceeded) onLimitExceeded();
      } else if (err.message) {
        setError(`AI分析エラー: ${err.message}`);
      } else {
        setError('AI分析の生成に失敗しました。しばらくしてから再度お試しください。');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 比較期間の開始・終了日をプリミティブ値として取得（useEffect deps用）
  const compStartDate = comparisonPeriod?.startDate || null;
  const compEndDate = comparisonPeriod?.endDate || null;
  const hasComparison = !!comparisonRawData;

  useEffect(() => {
    // 必要なデータが揃っている場合のみ実行
    // rawData/metricsはオブジェクト参照が毎回変わるためdepsに含めない
    // 比較ON/OFF切替・比較期間変更時は自動で再分析
    if (selectedSiteId && pageType && (rawData || metrics)) {
      loadAnalysis(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSiteId, pageType, hasComparison, compStartDate, compEndDate]);

  // タスク追加
  const addTaskMutation = useMutation({
    mutationFn: async (task) => {
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
        createdBy: currentUser?.email || '',
      };
      
      return await addDoc(collection(db, 'sites', selectedSiteId, 'improvements'), newTask);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['improvements', selectedSiteId] });
      
      const taskKey = `${variables.title}_${variables.description}`;
      setAddedTaskIds(prev => {
        const newSet = new Set(prev);
        newSet.add(taskKey);
        return newSet;
      });
    },
    onError: (error) => {
      alert(`タスクの追加に失敗しました。\nエラー: ${error.message}`);
    },
  });

  // 必要なデータがない場合は早期リターン（全Hooksの後に配置）
  if (!selectedSiteId || !pageType) {
    return (
      <div className="text-center py-8 text-gray-500">
        データを読み込み中...
      </div>
    );
  }

  // ローディング中
  if (isLoading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center">
        <DotWaveSpinner size="lg" />
        <p className="mt-4 text-sm text-body-color">AI分析を生成中...</p>
      </div>
    );
  }

  // エラー
  if (error) {
    return (
      <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-red-800 dark:text-red-200">エラーが発生しました</h3>
            <p className="mt-1 text-sm text-red-700 dark:text-red-300">{error}</p>
            <button
              onClick={() => loadAnalysis(false)}
              className="mt-3 inline-flex items-center gap-2 rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              <RefreshCw className="h-4 w-4" />
              再試行
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-pink-500">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">AI分析結果</h3>
            {generatedAt && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {format(new Date(generatedAt), 'yyyy/MM/dd HH:mm')} 生成
                {fromCache && ' (前回の分析結果)'}
              </p>
            )}
          </div>
        </div>
        
        <button
            onClick={() => {
              if (planId === 'free') {
                setIsUpgradeModalOpen(true);
              } else {
                loadAnalysis(true);
              }
            }}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-3 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            再分析
          </button>
      </div>

      {/* AI分析サマリ */}
      {summary && (
        <div className="rounded-lg bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-blue-900/20 dark:via-purple-900/20 dark:to-pink-900/20 px-10 py-8">
          {pageType === 'comprehensive_analysis' || pageType === 'comprehensive_improvement' ? (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown>{summary}</ReactMarkdown>
            </div>
          ) : (() => {
            const lines = summary.split('\n').filter(l => l.trim() !== '');
            const paragraphs = [];
            const bullets = [];
            for (const line of lines) {
              if (line.trim().startsWith('・')) {
                bullets.push(line.trim().replace(/^・\s?/, ''));
              } else {
                paragraphs.push(line.trim());
              }
            }
            return (
              <div className="ai-summary-content text-sm text-gray-800 dark:text-gray-200">
                {paragraphs.length > 0 && (() => {
                  const joined = paragraphs.join('');
                  const sentences = joined.split(/(?<=。)/).filter(s => s.trim() !== '');
                  return (
                    <p className="leading-relaxed">
                      {sentences.map((s, i) => (
                        <span key={i}>{i > 0 && <><br /><span className="block h-1" /></>}{s.trim()}</span>
                      ))}
                    </p>
                  );
                })()}
                {bullets.length > 0 && (
                  <ul className="mt-4 space-y-2 list-disc pl-5">
                    {bullets.map((item, i) => (
                      <li key={i} className="leading-relaxed">{item}</li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* 改善提案 */}
      {recommendations && recommendations.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">改善提案</h4>
          {recommendations.map((rec, index) => {
            const taskTitle = rec.title || rec.recommendation || `提案${index + 1}`;
            const taskDescription = rec.description || '';
            const taskKey = `${taskTitle}_${taskDescription}`;
            
            const existsInFirestore = existingTasks.some(task =>
              task.title === taskTitle && task.description === taskDescription
            );
            
            const addedInSession = addedTaskIds.has(taskKey);
            const isAdded = existsInFirestore || addedInSession;

            return (
              <div
                key={index}
                className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-2 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <h5 className="text-sm font-medium text-gray-900 dark:text-white">
                      {taskTitle}
                    </h5>
                    {taskDescription && (
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        {taskDescription}
                      </p>
                    )}
                  </div>
                  
                  <button
                    onClick={() => addTaskMutation.mutate(rec)}
                    disabled={isAdded || addTaskMutation.isPending}
                    className={`
                      inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors
                      ${isAdded
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                      }
                    `}
                  >
                    {isAdded ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        追加済み
                      </>
                    ) : (
                      '+ タスクに追加'
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* サイト改善画面へのリンク */}
      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 flex flex-col items-center">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              const pagePath = location.pathname.replace('/analysis/', '').replace('/', '');
              navigate(`/ai-chat?from=${pagePath || 'comprehensive'}`);
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-3 text-sm font-medium text-white hover:from-blue-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
            AIに質問する
          </button>
          <button
            onClick={() => {
              if (!selectedSiteId) return;
              navigate('/improve');
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-3 text-sm font-medium text-white hover:from-blue-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg"
          >
            <Sparkles className="h-4 w-4" />
            サイト改善案を生成する
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center">
          過去365日分のデータを分析し、最適な改善提案を生成します
        </p>
      </div>

      {/* アップグレードモーダル */}
      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
      />
    </div>
  );
}
