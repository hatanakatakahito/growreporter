'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DetectedIssue } from '@/lib/improvements/types';

interface InsightsAlertProps {
  issues: DetectedIssue[];
  onClose?: () => void;
}

export default function InsightsAlert({ issues, onClose }: InsightsAlertProps) {
  const router = useRouter();
  
  // Escキーでモーダルを閉じる
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);
  
  if (issues.length === 0) return null;
  
  const highPriorityIssues = issues.filter(i => i.priority === 'high');
  const displayIssues = highPriorityIssues.length > 0 ? highPriorityIssues : issues.slice(0, 3);
  
  return (
    <>
      {/* オーバーレイ背景 */}
      <div 
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />
      
      {/* モーダルコンテンツ */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div 
          className="relative w-full max-w-2xl transform rounded-2xl bg-white p-8 shadow-2xl transition-all duration-300 dark:bg-dark-2 animate-in fade-in zoom-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 閉じるボタン */}
          <button
            onClick={onClose}
            className="absolute right-6 top-6 rounded-full p-2 text-body-color transition-colors hover:bg-gray-100 hover:text-dark dark:text-dark-6 dark:hover:bg-dark-3 dark:hover:text-white"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              className="fill-current"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M5.29289 5.29289C5.68342 4.90237 6.31658 4.90237 6.70711 5.29289L12 10.5858L17.2929 5.29289C17.6834 4.90237 18.3166 4.90237 18.7071 5.29289C19.0976 5.68342 19.0976 6.31658 18.7071 6.70711L13.4142 12L18.7071 17.2929C19.0976 17.6834 19.0976 18.3166 18.7071 18.7071C18.3166 19.0976 17.6834 19.0976 17.2929 18.7071L12 13.4142L6.70711 18.7071C6.31658 19.0976 5.68342 19.0976 5.29289 18.7071C4.90237 18.3166 4.90237 17.6834 5.29289 17.2929L10.5858 12L5.29289 6.70711C4.90237 6.31658 4.90237 5.68342 5.29289 5.29289Z"
              />
            </svg>
          </button>

          {/* アイコンとタイトル */}
          <div className="mb-6 flex items-center">
            <div className="mr-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-primary">
              <svg
                width="32"
                height="32"
                viewBox="0 0 30 30"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="text-white"
              >
                <path
                  d="M11.0163 29.4375C10.5476 29.4375 10.0788 29.2031 9.75071 28.8281C9.14133 28.125 9.32883 27.2344 9.42258 26.8125L12.0945 15.4219H6.75071C6.42258 15.4219 5.81321 15.4219 5.34446 15.0469C4.50071 14.3906 4.73508 13.1719 4.82883 12.7969L6.89133 2.85938C6.98508 2.39063 7.17258 1.59375 7.78196 1.07813C8.39133 0.609375 9.14133 0.609375 9.65696 0.609375H16.3132C16.8757 0.609375 18.0007 0.609375 18.657 1.45313C19.3132 2.29688 19.0788 3.375 18.9851 3.9375L18.282 7.03125L22.8757 7.07813C24.1413 7.07813 24.8913 7.5 25.1726 8.29688C25.4538 9.14063 24.9851 9.89063 24.7038 10.2656L12.8445 28.1719C12.6101 28.5 12.282 29.0156 11.7663 29.25C11.5788 29.3438 11.3445 29.3906 11.157 29.3906C11.1101 29.3906 11.0632 29.4375 11.0163 29.4375ZM9.65696 2.25C9.37571 2.25 9.00071 2.25 8.81321 2.39063C8.62571 2.53125 8.53196 2.95313 8.48508 3.23438L6.46946 13.125C6.37571 13.6406 6.42258 13.7813 6.42258 13.7813C6.46946 13.7813 6.70383 13.7813 6.79758 13.7813H13.1726C13.407 13.7813 13.6413 13.875 13.8288 14.1094C13.9695 14.2969 14.0632 14.5781 13.9695 14.8125L11.0163 27.1875C10.9226 27.6094 10.9226 27.7031 10.9695 27.75C11.0163 27.7969 11.0163 27.7969 11.0163 27.7969C11.157 27.7031 11.3445 27.4688 11.4851 27.2813L23.3445 9.32813C23.5788 9 23.6257 8.85938 23.6257 8.8125C23.5788 8.8125 23.4382 8.71875 22.8757 8.71875L17.2976 8.67188C17.0632 8.67188 16.8288 8.57813 16.6413 8.34375C16.5007 8.15625 16.407 7.875 16.5007 7.64062L17.3913 3.51562C17.4382 3.23438 17.5788 2.625 17.3913 2.4375C17.2038 2.20312 16.5945 2.20312 16.3132 2.20312L9.65696 2.25Z"
                  fill="currentColor"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-dark dark:text-white">
                改善の気づき
              </h3>
              <p className="text-sm text-body-color dark:text-dark-6">
                サイトに改善が必要な箇所が見つかりました
              </p>
            </div>
          </div>

          {/* 問題リスト */}
          <div className="mb-8 space-y-3">
            {displayIssues.map((issue, index) => (
              <div
                key={index}
                className="flex items-start rounded-lg border border-stroke bg-gray-2 p-4 transition-colors hover:bg-gray-3 dark:border-dark-3 dark:bg-dark-3 dark:hover:bg-dark-4"
              >
                <span
                  className={`mr-3 mt-0.5 flex h-6 w-10 items-center justify-center rounded text-xs font-bold ${
                    issue.priority === 'high'
                      ? 'bg-red-500 text-white'
                      : issue.priority === 'medium'
                      ? 'bg-yellow-500 text-white'
                      : 'bg-blue-500 text-white'
                  }`}
                >
                  {issue.priority === 'high' && '高'}
                  {issue.priority === 'medium' && '中'}
                  {issue.priority === 'low' && '低'}
                </span>
                <div className="flex-1">
                  <p className="font-medium text-dark dark:text-white">
                    {issue.title}
                  </p>
                  {issue.description && (
                    <p className="mt-1 text-sm text-body-color dark:text-dark-6">
                      {issue.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
            
            {issues.length > 3 && (
              <div className="rounded-lg bg-primary/10 px-4 py-3 text-center text-sm text-primary dark:bg-primary/20">
                他 {issues.length - 3} 件の問題が検出されています
              </div>
            )}
          </div>

          {/* アクションボタン */}
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              onClick={onClose}
              className="rounded-lg border border-stroke px-6 py-3 font-medium text-body-color transition-colors hover:bg-gray-2 dark:border-dark-3 dark:text-dark-6 dark:hover:bg-dark-3"
            >
              後で確認する
            </button>
            <button
              onClick={() => {
                router.push('/improvements');
                if (onClose) onClose();
              }}
              className="rounded-lg bg-primary px-6 py-3 font-medium text-white transition-colors hover:bg-primary/90"
            >
              改善案を確認する
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

