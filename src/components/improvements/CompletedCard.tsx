'use client';

import React, { useState } from 'react';
import { UserImprovement } from '@/lib/improvements/types';
import FeedbackModal from './FeedbackModal';

interface CompletedCardProps {
  improvement: UserImprovement;
  onUpdate: () => void;
}

export default function CompletedCard({ improvement, onUpdate }: CompletedCardProps) {
  const [showFeedback, setShowFeedback] = useState(false);
  
  const hasResult = improvement.result !== undefined;
  
  const renderChange = (value: string) => {
    if (value.startsWith('+')) {
      return <span className="text-green-600 dark:text-green-400">{value}</span>;
    } else if (value.startsWith('-')) {
      return <span className="text-red-600 dark:text-red-400">{value}</span>;
    }
    return <span>{value}</span>;
  };
  
  return (
    <>
      <div className="rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
        {/* ヘッダー */}
        <div className="mb-4 flex items-start justify-between">
          <div className="flex-1">
            <h4 className="text-lg font-semibold text-dark dark:text-white">
              {improvement.title}
            </h4>
            {improvement.completedAt && (
              <p className="mt-1 text-xs text-body-color">
                完了日: {new Date(improvement.completedAt).toLocaleDateString('ja-JP')}
              </p>
            )}
          </div>
          
          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700 dark:bg-green-900 dark:text-green-300">
            完了
          </span>
        </div>
        
        {/* 効果測定結果 */}
        {hasResult && improvement.result ? (
          <div className="mb-4 rounded-md bg-gray-50 p-4 dark:bg-gray-900">
            <h5 className="mb-3 text-sm font-medium text-dark dark:text-white">
              📊 効果測定結果
            </h5>
            
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <div className="text-xs text-body-color">CVR</div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-lg font-semibold text-dark dark:text-white">
                    {(improvement.result.afterData.cvr * 100).toFixed(2)}%
                  </span>
                  <span className="text-sm">
                    {renderChange(improvement.result.change.cvr)}
                  </span>
                </div>
              </div>
              
              <div>
                <div className="text-xs text-body-color">CV数</div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-lg font-semibold text-dark dark:text-white">
                    {improvement.result.afterData.conversions}件
                  </span>
                  <span className="text-sm">
                    {renderChange(
                      improvement.result.change.conversions > 0
                        ? `+${improvement.result.change.conversions}`
                        : `${improvement.result.change.conversions}`
                    )}
                  </span>
                </div>
              </div>
              
              <div>
                <div className="text-xs text-body-color">セッション</div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-lg font-semibold text-dark dark:text-white">
                    {improvement.result.afterData.sessions.toLocaleString()}
                  </span>
                  <span className="text-sm">
                    {renderChange(improvement.result.change.sessions)}
                  </span>
                </div>
              </div>
            </div>
            
            {improvement.result.achievedExpectation && (
              <div className="mt-3 rounded-md bg-green-100 px-3 py-2 text-sm text-green-700 dark:bg-green-900 dark:text-green-300">
                ✓ 期待効果を達成しました
              </div>
            )}
          </div>
        ) : (
          <div className="mb-4 rounded-md bg-yellow-50 p-3 text-sm text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300">
            効果測定待ち（完了から7日後に自動測定されます）
          </div>
        )}
        
        {/* 期待効果 */}
        {improvement.expectedEffect && (
          <div className="mb-4 rounded-md bg-blue-50 p-3 dark:bg-blue-950">
            <div className="text-xs font-medium text-blue-700 dark:text-blue-300">
              期待効果（目標）
            </div>
            <div className="mt-1 text-sm text-dark dark:text-white">
              {improvement.expectedEffect.cvr && `CVR: ${improvement.expectedEffect.cvr}`}
              {improvement.expectedEffect.cvr && improvement.expectedEffect.conversions && ' / '}
              {improvement.expectedEffect.conversions && `CV数: ${improvement.expectedEffect.conversions}`}
            </div>
          </div>
        )}
        
        {/* メモ */}
        {improvement.memo && (
          <div className="mb-4">
            <h5 className="mb-2 text-sm font-medium text-dark dark:text-white">
              メモ
            </h5>
            <p className="text-sm text-body-color whitespace-pre-wrap">
              {improvement.memo}
            </p>
          </div>
        )}
        
        {/* 振り返り */}
        {improvement.retrospective && (
          <div className="mb-4 rounded-md border border-stroke p-3 dark:border-dark-3">
            <h5 className="mb-2 text-sm font-medium text-dark dark:text-white">
              振り返り
            </h5>
            <p className="text-sm text-body-color whitespace-pre-wrap">
              {improvement.retrospective.memo}
            </p>
            {improvement.retrospective.tags && improvement.retrospective.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {improvement.retrospective.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="rounded-full bg-gray-200 px-2 py-1 text-xs text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* アクション */}
        <div className="flex gap-2">
          <button
            onClick={() => setShowFeedback(true)}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90"
          >
            評価する
          </button>
        </div>
      </div>
      
      {/* フィードバックモーダル */}
      {showFeedback && (
        <FeedbackModal
          improvement={improvement}
          onClose={() => setShowFeedback(false)}
          onSubmit={onUpdate}
        />
      )}
    </>
  );
}

