'use client';

import React, { useState } from 'react';

interface MetricTooltipProps {
  description?: string;
}

export default function MetricTooltip({ 
  description = "月別推移（過去13ヶ月）"
}: MetricTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative inline-block">
      {/* トリガーアイコン */}
      <button
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        className="ml-1.5 inline-flex items-center justify-center rounded-full text-body-color hover:text-primary dark:text-dark-6 dark:hover:text-white transition-colors"
        type="button"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="2"
          stroke="currentColor"
          className="h-3.5 w-3.5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z"
          />
        </svg>
      </button>

      {/* ツールチップ */}
      {isVisible && (
        <div
          className="absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 transform whitespace-nowrap"
          onMouseEnter={() => setIsVisible(true)}
          onMouseLeave={() => setIsVisible(false)}
        >
          <div className="rounded-lg bg-dark px-3 py-2 text-xs text-white shadow-lg dark:bg-white dark:text-dark">
            {description}
          </div>
          {/* 矢印 */}
          <div className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 transform border-4 border-transparent border-t-dark dark:border-t-white"></div>
        </div>
      )}
    </div>
  );
}

