'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DetectedIssue } from '@/lib/improvements/types';

interface InsightsAlertProps {
  issues: DetectedIssue[];
}

export default function InsightsAlert({ issues }: InsightsAlertProps) {
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(true);
  
  if (issues.length === 0 || !isVisible) return null;
  
  const highPriorityIssues = issues.filter(i => i.priority === 'high');
  const displayIssues = highPriorityIssues.length > 0 ? highPriorityIssues : issues.slice(0, 2);
  
  return (
    <div className="mb-6 rounded-lg border-l-4 border-primary bg-primary/5 p-4 dark:bg-primary/10">
      <div className="flex items-start gap-4">
        <div className="mt-1 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary text-white">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="h-6 w-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
          </svg>
        </div>
        
        <div className="flex-1">
          <h4 className="mb-2 font-semibold text-dark dark:text-white">
            改善の気づき
          </h4>
          
          <div className="space-y-2">
            {displayIssues.map((issue, index) => (
              <div key={index} className="text-sm">
                <span
                  className={`mr-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                    issue.priority === 'high'
                      ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                      : issue.priority === 'medium'
                      ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                      : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                  }`}
                >
                  {issue.priority === 'high' && '高'}
                  {issue.priority === 'medium' && '中'}
                  {issue.priority === 'low' && '低'}
                </span>
                <span className="text-body-color">
                  {issue.title}
                </span>
              </div>
            ))}
          </div>
          
          {issues.length > 2 && (
            <p className="mt-2 text-xs text-body-color">
              他 {issues.length - 2} 件の問題が検出されています
            </p>
          )}
          
          <button
            onClick={() => router.push('/improvements')}
            className="mt-3 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90"
          >
            改善案を見る →
          </button>
        </div>
        
        <button
          onClick={() => setIsVisible(false)}
          className="text-body-color hover:text-dark dark:hover:text-white transition-colors"
          aria-label="閉じる"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

