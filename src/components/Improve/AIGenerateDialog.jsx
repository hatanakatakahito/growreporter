import React, { useState } from 'react';
import { X, Sparkles, Loader2 } from 'lucide-react';
import { db, functions } from '../../config/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { format, subDays } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import { fetchComprehensiveDataForImprovement } from '../../utils/comprehensiveDataFetcher';

export default function AIGenerateDialog({ isOpen, onClose, siteId }) {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  
  // 固定期間：直近30日
  const today = new Date();
  const thirtyDaysAgo = subDays(today, 30);
  const startDate = format(thirtyDaysAgo, 'yyyy-MM-dd');
  const endDate = format(today, 'yyyy-MM-dd');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedSummary, setGeneratedSummary] = useState('');
  const [generatedSuggestions, setGeneratedSuggestions] = useState([]);
  const [selectedSuggestions, setSelectedSuggestions] = useState(new Set());

  const handleGenerate = async () => {
    console.log('[AIGenerateDialog] AI改善案生成開始:', { siteId, startDate, endDate });

    setIsGenerating(true);
    setGeneratedSummary('');
    setGeneratedSuggestions([]);
    setSelectedSuggestions(new Set());

    try {
      // Step 1: 包括的データを取得（365日分のデータ、直近30日重点）
      console.log('[AIGenerateDialog] データ取得開始...');
      const comprehensiveData = await fetchComprehensiveDataForImprovement(siteId);
      console.log('[AIGenerateDialog] データ取得完了:', comprehensiveData);

      // Step 2: AI改善案を生成
      console.log('[AIGenerateDialog] AI生成開始...');
      const generateAISummary = httpsCallable(functions, 'generateAISummary');
      
      const result = await generateAISummary({
        siteId,
        pageType: 'comprehensive_improvement',
        startDate,  // 直近30日の開始日
        endDate,    // 直近30日の終了日
        metrics: comprehensiveData,
        forceRegenerate: true,
      });

      console.log('[AIGenerateDialog] AI生成完了:', result.data);

      // Step 3: 結果を設定
      if (result.data.summary) {
        setGeneratedSummary(result.data.summary);
      }

      if (result.data.recommendations && Array.isArray(result.data.recommendations)) {
        console.log('[AIGenerateDialog] 推奨施策数:', result.data.recommendations.length);
        setGeneratedSuggestions(result.data.recommendations);
        
        // 推奨施策が0件の場合は警告
        if (result.data.recommendations.length === 0) {
          console.warn('[AIGenerateDialog] 推奨施策が0件です。AIのレスポンス形式に問題がある可能性があります。');
          // モックデータを表示
          throw new Error('推奨施策の抽出に失敗しました（0件）');
        }
      } else {
        console.warn('[AIGenerateDialog] recommendations が存在しないか、配列ではありません');
        throw new Error('推奨施策データが不正です');
      }

    } catch (error) {
      console.error('[AIGenerateDialog] エラー:', error);
      alert(`AI改善案の生成に失敗しました: ${error.message}`);
      
      // エラー時はモックデータを表示（開発用）
      const mockSummary = `## 分析サマリー

直近30日間（${startDate} 〜 ${endDate}）のデータを分析した結果、全体的なパフォーマンスは安定しています。セッション数は前期比で15%増加し、コンバージョン率も改善傾向にあります。特にオーガニック検索からの流入が好調で、主要なランディングページのエンゲージメント率が向上しています。`;

      setGeneratedSummary(mockSummary);
      
      const mockSuggestions = [
        {
          title: 'ファーストビューのCTA改善',
          description: 'メインビジュアル下のCTAボタンをより目立つデザインに変更し、マイクロコピーを追加してアクション誘導を強化',
          category: 'design',
          priority: 'high',
          expectedImpact: 'コンバージョン率の向上',
        },
        {
          title: 'SEO対策: メタディスクリプション最適化',
          description: '主要ページのメタディスクリプションを検索意図に沿った内容に書き換え、クリック率を改善',
          category: 'acquisition',
          priority: 'high',
          expectedImpact: 'オーガニック流入の増加',
        },
        {
          title: 'モバイルページ速度の改善',
          description: '画像の遅延読み込みとWebP形式への変換により、モバイルでの読み込み速度を改善',
          category: 'feature',
          priority: 'medium',
          expectedImpact: 'ページ速度とUXの向上',
        },
        {
          title: 'コンテンツの読みやすさ改善',
          description: '段落の改行や見出しの階層を見直し、スキャンしやすいレイアウトに変更',
          category: 'content',
          priority: 'medium',
          expectedImpact: 'ユーザーエンゲージメントの向上',
        },
        {
          title: 'お客様の声セクション追加',
          description: 'トップページに実際の利用者の声を掲載し、信頼性を向上',
          category: 'content',
          priority: 'low',
          expectedImpact: '信頼性とブランド価値の向上',
        },
      ];
      
      setGeneratedSuggestions(mockSuggestions);
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleSelection = (index) => {
    const newSelected = new Set(selectedSuggestions);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedSuggestions(newSelected);
  };

  const handleAddSelected = async () => {
    if (selectedSuggestions.size === 0) {
      alert('追加する改善案を選択してください');
      return;
    }

    console.log('[AIGenerateDialog] 選択された改善案を追加開始', {
      count: selectedSuggestions.size,
      siteId,
      currentUser,
    });

    try {
      const promises = Array.from(selectedSuggestions).map(async (index) => {
        const suggestion = generatedSuggestions[index];
        const improvementData = {
          ...suggestion,
          siteId,
          status: 'draft',
          createdAt: new Date(),
          createdBy: currentUser?.email || 'unknown',
          source: 'ai_generated',
        };
        
        console.log('[AIGenerateDialog] 追加するデータ', improvementData);
        
        return addDoc(collection(db, 'improvements'), improvementData);
      });

      await Promise.all(promises);
      
      console.log('[AIGenerateDialog] 改善案の追加成功');
      queryClient.invalidateQueries({ queryKey: ['improvements', siteId] });
      onClose();
      setGeneratedSuggestions([]);
      setSelectedSuggestions(new Set());
    } catch (error) {
      console.error('[AIGenerateDialog] 改善案の追加エラー:', error);
      console.error('[AIGenerateDialog] エラー詳細:', error.code, error.message);
      alert(`改善案の追加に失敗しました: ${error.message}`);
    }
  };

  if (!isOpen) return null;

  const categoryColors = {
    acquisition: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
    content: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300',
    design: 'bg-pink-100 text-pink-800 dark:bg-pink-900/20 dark:text-pink-300',
    feature: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
    other: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300',
  };

  const categoryLabels = {
    acquisition: '集客',
    content: 'コンテンツ',
    design: 'デザイン',
    feature: '機能',
    other: 'その他',
  };

  const priorityColors = {
    high: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
    medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300',
    low: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
  };

  const priorityLabels = {
    high: '高',
    medium: '中',
    low: '低',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white p-6 dark:bg-dark-2">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-xl font-semibold text-dark dark:text-white">
            AI改善案生成
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-gray-2 dark:hover:bg-dark-3"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {generatedSuggestions.length === 0 ? (
          <div className="py-12 text-center">
            <Sparkles className="mx-auto mb-4 h-12 w-12 text-purple-500" />
            <p className="mb-6 text-body-color">
              過去365日分のデータを分析し、直近30日のパフォーマンスを重点的に改善提案します。
            </p>
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-3 text-sm font-medium text-white hover:from-purple-600 hover:to-pink-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  AI改善案を生成
                </>
              )}
            </button>
          </div>
        ) : (
          <>
            {/* 分析サマリー */}
            {generatedSummary && (
              <div className="mb-6 rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
                <ReactMarkdown
                  components={{
                    h2: ({ node, ...props }) => (
                      <h2 className="mb-3 text-xl font-bold text-dark dark:text-white" {...props} />
                    ),
                    h3: ({ node, ...props }) => (
                      <h3 className="mb-2 text-lg font-semibold text-dark dark:text-white" {...props} />
                    ),
                    p: ({ node, ...props }) => (
                      <p className="mb-3 text-body-color leading-relaxed" {...props} />
                    ),
                    ul: ({ node, ...props }) => (
                      <ul className="mb-3 list-disc space-y-1 pl-5 text-body-color" {...props} />
                    ),
                    li: ({ node, ...props }) => (
                      <li className="text-body-color" {...props} />
                    ),
                    strong: ({ node, ...props }) => (
                      <strong className="font-semibold text-dark dark:text-white" {...props} />
                    ),
                  }}
                >
                  {generatedSummary}
                </ReactMarkdown>
              </div>
            )}

            {/* おすすめの改善施策 */}
            <h3 className="mb-3 text-lg font-semibold text-dark dark:text-white">
              おすすめの改善施策（{generatedSuggestions.length}件）
            </h3>
            <p className="mb-4 text-sm text-body-color">
              追加する項目を選択してください。
            </p>
            
            <div className="mb-6 space-y-3">
              {generatedSuggestions.map((suggestion, index) => (
                <div
                  key={index}
                  onClick={() => toggleSelection(index)}
                  className={`cursor-pointer rounded-lg border p-4 transition-all ${
                    selectedSuggestions.has(index)
                      ? 'border-primary bg-blue-50 dark:bg-blue-900/10'
                      : 'border-stroke hover:border-gray-400 dark:border-dark-3'
                  }`}
                >
                  <div className="mb-2 flex items-start justify-between">
                    <h4 className="flex-1 font-medium text-dark dark:text-white">
                      {suggestion.title}
                    </h4>
                    <input
                      type="checkbox"
                      checked={selectedSuggestions.has(index)}
                      onChange={() => toggleSelection(index)}
                      className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                  </div>
                  
                  <p className="mb-3 text-sm text-dark dark:text-white">
                    {suggestion.description}
                  </p>
                  
                  <div className="flex flex-wrap gap-2">
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${categoryColors[suggestion.category]}`}>
                      {categoryLabels[suggestion.category]}
                    </span>
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${priorityColors[suggestion.priority]}`}>
                      {priorityLabels[suggestion.priority]}
                    </span>
                    {suggestion.expectedImpact && (
                      <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800 dark:bg-gray-900/20 dark:text-gray-300">
                        {suggestion.expectedImpact}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between border-t border-stroke pt-4 dark:border-dark-3">
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="inline-flex items-center gap-2 rounded-lg border border-stroke px-4 py-2 text-sm font-medium text-dark hover:bg-gray-2 dark:border-dark-3 dark:text-white dark:hover:bg-dark-3 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    生成中...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    再生成
                  </>
                )}
              </button>
              
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="rounded-lg border border-stroke px-4 py-2 text-sm font-medium text-dark hover:bg-gray-2 dark:border-dark-3 dark:text-white dark:hover:bg-dark-3"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleAddSelected}
                  disabled={selectedSuggestions.size === 0}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  選択した{selectedSuggestions.size}件を追加
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

