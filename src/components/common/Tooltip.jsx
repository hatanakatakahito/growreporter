import React, { useState } from 'react';
import { Info } from 'lucide-react';

/**
 * ツールチップコンポーネント
 * @param {string} content - ツールチップの内容
 * @param {React.ReactNode} children - ツールチップを表示する対象の要素（省略時はInfoアイコンを表示）
 */
export default function Tooltip({ content, children }) {
  const [isVisible, setIsVisible] = useState(false);

  if (!content) return children || null;

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        className="cursor-help"
      >
        {children || <Info className="h-4 w-4 text-body-color dark:text-dark-6" />}
      </div>
      
      {isVisible && (
        <div className="absolute bottom-full left-1/2 z-50 mb-2 w-64 -translate-x-1/2 transform">
          <div className="rounded-lg bg-dark px-3 py-2 text-sm text-white shadow-lg dark:bg-white dark:text-dark">
            {content}
            <div className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 transform border-4 border-transparent border-t-dark dark:border-t-white"></div>
          </div>
        </div>
      )}
    </div>
  );
}

