import React, { useState } from 'react';
import { X, Sparkles, Loader2 } from 'lucide-react';
import { db, functions } from '../../config/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { usePlan } from '../../hooks/usePlan';
import { format, subDays } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import { fetchComprehensiveDataForImprovement } from '../../utils/comprehensiveDataFetcher';

export default function AIGenerateDialog({ isOpen, onClose, siteId }) {
  const { currentUser } = useAuth();
  const { getRemainingByType } = usePlan();
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

  const handleGenerate = async (forceRegenerate = false) => {
    console.log('[AIGenerateDialog] AI改善案生成開始:', { siteId, startDate, endDate, forceRegenerate });

    // 再生成の場合は制限チェック（初回はキャッシュを確認するため後でチェック）
    if (forceRegenerate) {
      const remaining = getRemainingByType('improvement');
      if (remaining === 0) {
        alert('AI改善提案の月間上限に達しました。来月1日に自動的にリセットされます。');
        return;
      }
    }

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
        forceRegenerate: forceRegenerate,
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
      
      // 制限超過エラーの場合
      if (error.code === 'functions/resource-exhausted') {
        alert('AI改善提案の月間上限に達しました。来月1日に自動的にリセットされます。');
        onClose();
        return;
      }
      
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
    high: '優先度 高',
    medium: '優先度 中',
    low: '優先度 低',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-6">
      <div className="max-h-[90vh] w-full max-w-6xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* ヘッダー（グラデーション） */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-8 py-5 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* AIアイコン */}
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm shadow-lg">
                <Sparkles className="h-7 w-7 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white">AI改善案生成</h3>
                <p className="text-sm text-white/90 mt-1">365日分のデータから導き出された改善施策</p>
              </div>
            </div>
            
            {/* 閉じるボタン */}
            <button
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm text-white transition hover:bg-white/30"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* コンテンツエリア */}
        <div className="max-h-[calc(90vh-200px)] overflow-y-auto bg-gray-50">{/* スクロール可能エリア */}

        {generatedSuggestions.length === 0 ? (
          <div className="py-12 text-center p-8">
            <Sparkles className="mx-auto mb-4 h-12 w-12 text-purple-500" />
            <p className="mb-6 text-body-color">
              過去365日分のデータを分析し、直近30日のパフォーマンスを重点的に改善提案します。
            </p>
            <button
              onClick={() => handleGenerate(false)}
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
          <div className="p-8 space-y-8">
            {/* 分析サマリー */}
            {generatedSummary && (
              <div>
                <h4 className="text-xl font-bold text-gray-900 mb-4">分析サマリー</h4>

                <div className="rounded-xl bg-white border border-gray-200 p-6 shadow-sm">
                  <ReactMarkdown
                    components={{
                      h2: ({ node, ...props }) => (
                        <h2 className="mb-3 text-xl font-bold text-gray-900" {...props} />
                      ),
                      h3: ({ node, ...props }) => (
                        <h3 className="mb-2 text-lg font-semibold text-gray-900" {...props} />
                      ),
                      p: ({ node, ...props }) => (
                        <p className="mb-3 leading-relaxed text-gray-700" {...props} />
                      ),
                      ul: ({ node, ...props }) => (
                        <ul className="mb-3 list-disc space-y-1 pl-5 text-gray-700" {...props} />
                      ),
                      li: ({ node, ...props }) => (
                        <li className="text-gray-700" {...props} />
                      ),
                      strong: ({ node, ...props }) => (
                        <strong className="font-bold text-gray-900" {...props} />
                      ),
                    }}
                  >
                    {generatedSummary}
                  </ReactMarkdown>
                </div>
              </div>
            )}

            {/* おすすめの改善施策 */}
            <div>
              <h4 className="text-xl font-bold text-gray-900 mb-4">おすすめの改善施策（{generatedSuggestions.length}件）</h4>

              <p className="text-sm text-gray-600 mb-4">追加する項目を選択してください。</p>

              {/* 改善施策リスト */}
              <div className="space-y-3">
                {generatedSuggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    onClick={() => toggleSelection(index)}
                    className={`rounded-xl p-5 shadow-sm cursor-pointer transition-all ${
                      selectedSuggestions.has(index)
                        ? 'border-2 border-purple-600 bg-purple-50'
                        : 'border-2 border-gray-200 bg-white hover:border-purple-300 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {/* チェックボックス */}
                      <div className="flex-shrink-0 pt-0.5">
                        <div className={`flex h-6 w-6 items-center justify-center rounded-md shadow-sm ${
                          selectedSuggestions.has(index)
                            ? 'bg-purple-600'
                            : 'border-2 border-gray-300 bg-white'
                        }`}>
                          {selectedSuggestions.has(index) && (
                            <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/>
                            </svg>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <h5 className="text-base font-bold text-gray-900">{suggestion.title}</h5>
                          <span className={`flex-shrink-0 rounded-md px-2.5 py-1 text-xs font-bold ${
                            suggestion.priority === 'high' ? 'bg-red-500 text-white' :
                            suggestion.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {priorityLabels[suggestion.priority]}
                          </span>
                        </div>
                        
                        <p className="text-sm text-gray-700 mb-3 leading-relaxed">
                          {suggestion.description}
                        </p>
                        
                        {suggestion.expectedImpact && (
                          <p className="text-sm text-green-700 mb-3 leading-relaxed">
                            期待する効果：{suggestion.expectedImpact}
                          </p>
                        )}
                        
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-md px-2.5 py-1 text-xs font-semibold ${categoryColors[suggestion.category]}`}>
                            {categoryLabels[suggestion.category]}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        </div>

        {/* フッター */}
        {generatedSuggestions.length > 0 && (
          <div className="border-t border-gray-200 bg-white px-8 py-5">
            <div className="flex items-center justify-between">
              <button
                onClick={() => handleGenerate(true)}
                disabled={isGenerating}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    生成中...
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"/>
                    </svg>
                    再生成
                  </>
                )}
              </button>
              
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleAddSelected}
                  disabled={selectedSuggestions.size === 0}
                  className="rounded-lg bg-purple-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  選択した{selectedSuggestions.size}件を追加
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

