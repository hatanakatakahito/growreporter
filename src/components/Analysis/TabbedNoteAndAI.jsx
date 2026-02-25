import React, { useState, useEffect } from 'react';
import { FileText, Sparkles } from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useSite } from '../../contexts/SiteContext';

/**
 * メモとAI分析のタブコンポーネント
 * @param {React.ReactNode} noteContent - メモタブの内容
 * @param {React.ReactNode} aiContent - AI分析タブの内容
 * @param {string} defaultTab - デフォルトで表示するタブ ('note' or 'ai')
 * @param {function} onTabChange - タブ変更時のコールバック
 * @param {string} pageType - ページタイプ（メモ件数表示用）
 */
export default function TabbedNoteAndAI({ noteContent, aiContent, defaultTab = 'ai', onTabChange, pageType }) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [memoCount, setMemoCount] = useState(0);
  const { selectedSiteId } = useSite();

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (onTabChange) {
      onTabChange(tab);
    }
  };

  // 外部からタブを切り替えられるように、windowイベントをリッスン
  useEffect(() => {
    const handleSwitchToAI = () => {
      setActiveTab('ai');
    };

    window.addEventListener('switchToAITab', handleSwitchToAI);
    return () => window.removeEventListener('switchToAITab', handleSwitchToAI);
  }, []);

  // メモ件数をリアルタイムで取得
  useEffect(() => {
    if (!selectedSiteId || !pageType) return;

    const q = query(
      collection(db, 'sites', selectedSiteId, 'pageNotes'),
      where('pageType', '==', pageType)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      setMemoCount(snapshot.size);
    }, (err) => {
      console.error('[TabbedNoteAndAI] メモ件数取得エラー:', err);
    });

    return () => unsub();
  }, [selectedSiteId, pageType]);

  return (
    <div className="mt-8 ai-gradient-border">
      {/* タブヘッダー */}
      <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-2 rounded-t-lg">
        <nav className="-mb-px flex" aria-label="Tabs">
          <button
            onClick={() => handleTabChange('ai')}
            id="ai-analysis-tab"
            className={`
              flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors
              ${activeTab === 'ai'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }
            `}
            aria-current={activeTab === 'ai' ? 'page' : undefined}
          >
            <Sparkles className="h-5 w-5" />
            <span>AI分析</span>
          </button>
          
          <button
            onClick={() => handleTabChange('note')}
            className={`
              flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors
              ${activeTab === 'note'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }
            `}
            aria-current={activeTab === 'note' ? 'page' : undefined}
          >
            <FileText className="h-5 w-5" />
            <span>メモ</span>
            {memoCount > 0 && (
              <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-blue-100 px-1.5 text-xs font-semibold text-blue-600">
                {memoCount}
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* タブコンテンツ */}
      <div id="ai-analysis-section" className="scroll-mt-20 bg-white dark:bg-dark-2 rounded-b-lg">
        {activeTab === 'ai' ? (
          <div className="p-6">
            {aiContent}
          </div>
        ) : (
          <div className="p-6">
            {noteContent}
          </div>
        )}
      </div>
    </div>
  );
}
