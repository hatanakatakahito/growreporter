'use client';

import { useState, useEffect } from 'react';
import AISummaryService from '@/lib/ai/summaryService';
import Loading from '@/components/common/Loading';

interface AISummarySectionProps {
  userId: string;
  pageType: 'summary' | 'users' | 'acquisition' | 'engagement';
  startDate: string; // YYYY-MM-DD format
  endDate: string; // YYYY-MM-DD format
  contextData: any;
  propertyId?: string;
  autoLoad?: boolean; // trueの場合、データが揃ったら自動ロード（デフォルト: true）
  className?: string; // 追加のCSSクラス
}

/**
 * AI要約セクション共通コンポーネント
 * 全てのページで統一されたAI要約表示を提供
 */
export default function AISummarySection({
  userId,
  pageType,
  startDate,
  endDate,
  contextData,
  propertyId,
  autoLoad = true,
  className = ''
}: AISummarySectionProps) {
  const [aiSummary, setAiSummary] = useState<string>('');
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);
  const [aiSummaryGeneratedAt, setAiSummaryGeneratedAt] = useState<Date | null>(null);

  // AI要約を取得
  const fetchAISummary = async () => {
    if (!userId || !startDate || !endDate || !contextData) {
      console.log('⚠️ AI要約取得スキップ:', { userId: !!userId, startDate, endDate, hasContext: !!contextData });
      return;
    }

    try {
      setAiSummaryLoading(true);
      console.log('🤖 AI要約取得開始:', { pageType, startDate, endDate });

      // キャッシュをチェック
      const cached = await AISummaryService.getCachedSummary(
        userId,
        pageType,
        startDate,
        endDate
      );

      if (cached) {
        console.log('✅ キャッシュから取得');
        setAiSummary(cached.summary);
        setAiSummaryGeneratedAt(cached.generatedAt);
        return;
      }

      // キャッシュがない場合は新規生成
      console.log('🆕 新規生成開始');
      const newSummary = await AISummaryService.generateAndSaveSummary(
        userId,
        pageType,
        startDate,
        endDate,
        contextData
      );

      if (newSummary) {
        console.log('✅ AI要約生成完了');
        setAiSummary(newSummary.summary);
        setAiSummaryGeneratedAt(newSummary.generatedAt);
      }
    } catch (error) {
      console.error('❌ AI要約取得エラー:', error);
    } finally {
      setAiSummaryLoading(false);
    }
  };

  // AI要約を再生成
  const handleRegenerateSummary = async () => {
    if (!userId || !contextData) {
      console.warn('⚠️ 再生成に必要なデータが不足しています');
      return;
    }

    try {
      setAiSummaryLoading(true);
      console.log('🔄 AI要約再生成開始');

      const newSummary = await AISummaryService.generateAndSaveSummary(
        userId,
        pageType,
        startDate,
        endDate,
        contextData
      );

      if (newSummary) {
        console.log('✅ AI要約再生成完了');
        setAiSummary(newSummary.summary);
        setAiSummaryGeneratedAt(newSummary.generatedAt);
      }
    } catch (error) {
      console.error('❌ AI要約再生成エラー:', error);
      alert('AI要約の再生成に失敗しました。');
    } finally {
      setAiSummaryLoading(false);
    }
  };

  // Markdown形式をHTMLに変換する関数
  const formatAISummary = (text: string) => {
    if (!text) return null;

    let formatted = text;

    // ### 見出し3 を <h3> に変換
    formatted = formatted.replace(/^###\s+(.+)$/gm, '<h3 class="text-base font-semibold text-dark dark:text-white mt-4 mb-1">$1</h3>');
    
    // ## 見出し2 を <h2> に変換
    formatted = formatted.replace(/^##\s+(.+)$/gm, '<h2 class="text-lg font-bold text-dark dark:text-white mt-4 mb-2">$1</h2>');
    
    // # 見出し1 を <h1> に変換
    formatted = formatted.replace(/^#\s+(.+)$/gm, '<h1 class="text-xl font-bold text-dark dark:text-white mt-4 mb-2">$1</h1>');

    // **強調** を <strong> に変換
    formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-dark dark:text-white">$1</strong>');
    
    // --- を削除
    formatted = formatted.replace(/---\s*/g, '');
    
    // * を ・ に変換（行頭または改行後）
    formatted = formatted.replace(/^\*\s+/gm, '・');
    formatted = formatted.replace(/\*\s+/g, '・');
    
    // 改行処理を最小限に：単一改行のみをスペースに変換
    formatted = formatted.replace(/\n/g, ' ');
    
    return <span dangerouslySetInnerHTML={{ __html: formatted }} />;
  };

  // データが揃ったら自動でAI要約を取得
  useEffect(() => {
    if (autoLoad && userId && startDate && endDate && contextData) {
      fetchAISummary();
    }
  }, [autoLoad, userId, startDate, endDate, contextData]);

  return (
    <div className={`mt-6 rounded-lg border border-stroke bg-white p-8 dark:border-dark-3 dark:bg-dark-2 ${className}`}>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
            <svg className="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path d="M16.5832 18.9583C16.3499 18.9583 16.1165 18.9083 15.9082 18.8C15.6832 18.6917 15.5332 18.5333 15.2499 18.2583L9.87487 12.8833L8.0832 11.0917C7.79987 10.8083 7.64154 10.65 7.5332 10.4333C7.32487 10.0083 7.32487 9.50833 7.5332 9.08333C7.64154 8.85833 7.79987 8.7 8.0832 8.425C8.36654 8.15 8.52487 7.98333 8.74154 7.875C9.16654 7.66667 9.66654 7.66667 10.0915 7.875C10.3165 7.98333 10.4749 8.14167 10.7499 8.425L17.9082 15.5833C18.1832 15.85 18.3415 16.0167 18.4582 16.2417C18.6665 16.6667 18.6665 17.1667 18.4582 17.5917C18.3415 17.8167 18.1832 17.9833 17.9082 18.2583C17.6332 18.5333 17.4665 18.7 17.2415 18.8083C17.0332 18.9083 16.7999 18.9667 16.5665 18.9667L16.5832 18.9583Z" />
              <path d="M14.6668 8.95866C14.4085 8.95866 14.1751 8.79199 14.0835 8.55033L13.8418 7.88366C13.5335 7.04199 13.4001 6.70033 13.1835 6.48366C12.9668 6.26699 12.6251 6.13366 11.7918 5.82533L11.1251 5.58366C10.8835 5.49199 10.7168 5.25866 10.7168 5.00033C10.7168 4.74199 10.8835 4.50866 11.1251 4.41699L11.7918 4.17533C12.6335 3.86699 12.9751 3.73366 13.1918 3.51699C13.4085 3.30033 13.5418 2.95866 13.8501 2.11699L14.1001 1.45033C14.1918 1.20866 14.4251 1.04199 14.6835 1.04199C14.9418 1.04199 15.1751 1.20866 15.2668 1.45033L15.5085 2.11699C15.8168 2.95866 15.9501 3.30033 16.1668 3.51699C16.3751 3.72533 16.7251 3.85866 17.5585 4.16699L18.2335 4.41699C18.4751 4.50866 18.6418 4.74199 18.6418 5.00033C18.6418 5.25866 18.4751 5.49199 18.2335 5.58366L17.5668 5.82533C16.7335 6.13366 16.3835 6.26699 16.1668 6.48366C15.9501 6.70033 15.8168 7.04199 15.5085 7.88366L15.2585 8.55033C15.1668 8.79199 14.9335 8.95866 14.6751 8.95866H14.6668Z" />
              <path d="M5.5 8.95801C5.24167 8.95801 5.00833 8.79134 4.91667 8.54967L4.73333 8.04967C4.51667 7.45801 4.41667 7.19134 4.275 7.05801C4.13333 6.92467 3.875 6.81634 3.28333 6.59967L2.78333 6.41634C2.54167 6.32467 2.375 6.09134 2.375 5.83301C2.375 5.57467 2.54167 5.34134 2.78333 5.24967L3.28333 5.06634C3.875 4.84967 4.14167 4.74967 4.275 4.60801C4.40833 4.46634 4.51667 4.20801 4.73333 3.61634L4.91667 3.11634C5.00833 2.87467 5.24167 2.70801 5.5 2.70801C5.75833 2.70801 5.99167 2.87467 6.08333 3.11634L6.26667 3.61634C6.48333 4.20801 6.58333 4.47467 6.725 4.60801C6.86667 4.74134 7.125 4.84967 7.71667 5.06634L8.21667 5.24967C8.45833 5.34134 8.625 5.57467 8.625 5.83301C8.625 6.09134 8.45833 6.32467 8.21667 6.41634L7.71667 6.59967C7.125 6.81634 6.85833 6.91634 6.725 7.05801C6.59167 7.19967 6.48333 7.45801 6.26667 8.04967L6.08333 8.54967C5.99167 8.79134 5.75833 8.95801 5.5 8.95801Z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-dark dark:text-white">
              AI要約
            </h3>
          </div>
        </div>
        <button
          onClick={handleRegenerateSummary}
          disabled={aiSummaryLoading}
          className="flex items-center gap-2 rounded-md border border-stroke bg-white px-4 py-2 text-sm font-medium text-dark transition-colors hover:bg-gray-2 disabled:opacity-50 dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:hover:bg-dark"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          再生成
        </button>
      </div>

      <div className="rounded-lg bg-gray-2 p-6 dark:bg-dark">
        {aiSummaryLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loading size={32} />
            <span className="ml-3 text-base text-dark dark:text-white">AI要約を生成中...</span>
          </div>
        ) : aiSummary ? (
          <>
            <div className="text-base leading-relaxed text-body-color dark:text-dark-6">
              {formatAISummary(aiSummary)}
            </div>
            {aiSummaryGeneratedAt && (
              <p className="mt-4 text-xs text-body-color dark:text-dark-6">
                生成日時: {aiSummaryGeneratedAt.toLocaleString('ja-JP')}
              </p>
            )}
          </>
        ) : (
          <p className="text-base text-body-color dark:text-dark-6">
            AI要約を読み込んでいます...
          </p>
        )}
      </div>
    </div>
  );
}

