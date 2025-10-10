'use client';

import React from 'react';

interface SuggestionCardProps {
  suggestion: {
    title: string;
    description: string;
    actions: string[];
    expectedEffect: {
      cvr?: string;
      conversions?: string;
    };
    difficulty: 'low' | 'medium' | 'high';
    estimatedTime: string;
    estimatedCost: 'low' | 'medium' | 'high';
    requiresVendor: boolean;
  };
  onAddToTodo: () => void;
  onRequestVendor: () => void;
}

export default function SuggestionCard({ suggestion, onAddToTodo, onRequestVendor }: SuggestionCardProps) {
  const difficultyColors = {
    low: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
    medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
    high: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
  };
  
  const costColors = {
    low: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    medium: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
    high: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300'
  };
  
  return (
    <div className="flex flex-col rounded-lg border border-stroke bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:border-dark-3 dark:bg-dark-2">
      {/* ヘッダー */}
      <div className="mb-4">
        <h4 className="text-lg font-semibold text-dark dark:text-white">
          {suggestion.title}
        </h4>
        <p className="mt-2 text-sm text-body-color">
          {suggestion.description}
        </p>
      </div>
      
      {/* 期待効果 */}
      <div className="mb-4 rounded-md bg-blue-50 p-3 dark:bg-blue-950">
        <div className="text-xs font-medium text-blue-700 dark:text-blue-300">
          期待効果
        </div>
        <div className="mt-1 space-y-1 text-sm">
          {suggestion.expectedEffect.cvr && (
            <div className="text-dark dark:text-white">
              CVR: <span className="font-semibold">{suggestion.expectedEffect.cvr}</span>
            </div>
          )}
          {suggestion.expectedEffect.conversions && (
            <div className="text-dark dark:text-white">
              CV数: <span className="font-semibold">{suggestion.expectedEffect.conversions}</span>
            </div>
          )}
        </div>
      </div>
      
      {/* アクション */}
      <div className="mb-4 flex-1">
        <div className="mb-2 text-xs font-medium text-body-color">
          具体的なアクション
        </div>
        <ul className="space-y-1">
          {suggestion.actions.slice(0, 3).map((action, index) => (
            <li key={index} className="flex items-start text-sm text-body-color">
              <span className="mr-2 mt-1 h-1 w-1 flex-shrink-0 rounded-full bg-primary" />
              <span>{action}</span>
            </li>
          ))}
          {suggestion.actions.length > 3 && (
            <li className="text-sm text-body-color">
              他 {suggestion.actions.length - 3} 件
            </li>
          )}
        </ul>
      </div>
      
      {/* メタ情報 */}
      <div className="mb-4 flex flex-wrap gap-2">
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${difficultyColors[suggestion.difficulty]}`}>
          {suggestion.difficulty === 'low' && '難易度: 低'}
          {suggestion.difficulty === 'medium' && '難易度: 中'}
          {suggestion.difficulty === 'high' && '難易度: 高'}
        </span>
        
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${costColors[suggestion.estimatedCost]}`}>
          {suggestion.estimatedCost === 'low' && 'コスト: 低'}
          {suggestion.estimatedCost === 'medium' && 'コスト: 中'}
          {suggestion.estimatedCost === 'high' && 'コスト: 高'}
        </span>
        
        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
          {suggestion.estimatedTime}
        </span>
        
        {suggestion.requiresVendor && (
          <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-700 dark:bg-purple-900 dark:text-purple-300">
            業者推奨
          </span>
        )}
      </div>
      
      {/* アクションボタン */}
      <div className="flex gap-2">
        <button
          onClick={onAddToTodo}
          className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-opacity-90"
        >
          自分でやる
        </button>
        
        {suggestion.requiresVendor && (
          <button
            onClick={onRequestVendor}
            className="flex-1 rounded-md border border-stroke bg-white px-4 py-2 text-sm font-medium text-dark transition-colors hover:bg-gray-2 dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:hover:bg-dark-3"
          >
            依頼書を作成
          </button>
        )}
      </div>
    </div>
  );
}

