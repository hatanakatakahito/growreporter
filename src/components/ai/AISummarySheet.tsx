/**
 * AI要約シート
 * 右側からスライドして表示されるAI分析コメント
 */

'use client';

import React, { useState, useEffect } from 'react';
import AISummaryService from '@/lib/ai/summaryService';

interface AISummarySheetProps {
  isOpen: boolean;
  onClose: () => void;
  pageType: string;
  contextData: any;
  startDate: string;
  endDate: string;
  userId: string;
}

export default function AISummarySheet({
  isOpen,
  onClose,
  pageType,
  contextData,
  startDate,
  endDate,
  userId,
}: AISummarySheetProps) {
  const [summary, setSummary] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadSummary();
    }
  }, [isOpen, pageType, startDate, endDate]);

  const loadSummary = async () => {
    try {
      setError(null);
      const savedSummary = await AISummaryService.getSummary(
        userId,
        pageType,
        startDate,
        endDate
      );
      setSummary(savedSummary || '');
    } catch (err) {
      console.error('AI要約の読み込みエラー:', err);
      setError('AI要約の読み込みに失敗しました');
    }
  };

  const handleRegenerate = async () => {
    try {
      setIsGenerating(true);
      setError(null);
      const newSummary = await AISummaryService.generateAndSaveSummary(
        userId,
        pageType,
        startDate,
        endDate,
        contextData
      );
      setSummary(newSummary);
    } catch (err) {
      console.error('AI要約の生成エラー:', err);
      setError('AI要約の生成に失敗しました');
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* オーバーレイ */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* シートコンテンツ */}
      <div className="fixed right-0 top-0 h-full w-full max-w-2xl bg-white dark:bg-dark-2 shadow-xl z-50 overflow-y-auto transform transition-transform">
        {/* ヘッダー */}
        <div className="sticky top-0 bg-white dark:bg-dark-2 border-b border-stroke dark:border-dark-3 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-purple-600 to-pink-600">
              <svg
                className="h-5 w-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-dark dark:text-white">
                AI分析
              </h2>
              <p className="text-sm text-body-color">
                {startDate} ～ {endDate}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-gray-2 dark:hover:bg-dark-3"
          >
            <svg
              className="h-5 w-5 text-body-color"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
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

        {/* コンテンツ */}
        <div className="p-6">
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}

          {isGenerating ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent mb-4" />
              <p className="text-body-color">AI分析を生成中...</p>
            </div>
          ) : summary ? (
            <div className="space-y-4">
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <div className="whitespace-pre-wrap text-body-color dark:text-dark-6">
                  {summary}
                </div>
              </div>
              <button
                onClick={handleRegenerate}
                className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2 text-sm font-medium text-white hover:from-purple-700 hover:to-pink-700 shadow-lg transition-all"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
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
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-dark-3">
                <svg
                  className="h-8 w-8 text-body-color"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
              </div>
              <p className="mb-4 text-body-color">AI分析がまだ生成されていません</p>
              <button
                onClick={handleRegenerate}
                className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2 text-sm font-medium text-white hover:from-purple-700 hover:to-pink-700 shadow-lg transition-all"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                  />
                </svg>
                AI分析を生成
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

