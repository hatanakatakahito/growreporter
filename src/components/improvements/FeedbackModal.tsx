'use client';

import React, { useState } from 'react';
import { UserImprovement } from '@/lib/improvements/types';
import { useAuth } from '@/lib/auth/authContext';

interface FeedbackModalProps {
  improvement: UserImprovement;
  onClose: () => void;
  onSubmit: () => void;
}

export default function FeedbackModal({ improvement, onClose, onSubmit }: FeedbackModalProps) {
  const { user } = useAuth();
  const [rating, setRating] = useState<'good' | 'neutral' | 'bad' | null>(null);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  const handleSubmit = async () => {
    if (!user || !rating) return;
    
    setSubmitting(true);
    try {
      const response = await fetch('/api/improvements/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.uid
        },
        body: JSON.stringify({
          templateId: improvement.templateId,
          templateTitle: improvement.title,
          rating,
          comment: comment.trim() || undefined
        })
      });
      
      if (response.ok) {
        alert('フィードバックを送信しました！');
        onSubmit();
        onClose();
      } else {
        throw new Error('送信に失敗しました');
      }
    } catch (error) {
      console.error('フィードバック送信エラー:', error);
      alert('フィードバックの送信に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 dark:bg-dark-2">
        {/* ヘッダー */}
        <div className="mb-6">
          <h3 className="text-xl font-semibold text-dark dark:text-white">
            この施策はどうでしたか？
          </h3>
          <p className="mt-2 text-sm text-body-color">
            {improvement.title}
          </p>
        </div>
        
        {/* 評価ボタン */}
        <div className="mb-6">
          <div className="flex justify-center gap-6">
            <button
              onClick={() => setRating('good')}
              className={`flex flex-col items-center gap-2 rounded-lg border-2 p-6 transition-all ${
                rating === 'good'
                  ? 'border-green-500 bg-green-50 dark:bg-green-950'
                  : 'border-stroke hover:border-green-300 dark:border-dark-3'
              }`}
            >
              <span className="text-4xl">◯</span>
              <span className="text-sm font-medium text-dark dark:text-white">
                良かった
              </span>
            </button>
            
            <button
              onClick={() => setRating('neutral')}
              className={`flex flex-col items-center gap-2 rounded-lg border-2 p-6 transition-all ${
                rating === 'neutral'
                  ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950'
                  : 'border-stroke hover:border-yellow-300 dark:border-dark-3'
              }`}
            >
              <span className="text-4xl">△</span>
              <span className="text-sm font-medium text-dark dark:text-white">
                まあまあ
              </span>
            </button>
            
            <button
              onClick={() => setRating('bad')}
              className={`flex flex-col items-center gap-2 rounded-lg border-2 p-6 transition-all ${
                rating === 'bad'
                  ? 'border-red-500 bg-red-50 dark:bg-red-950'
                  : 'border-stroke hover:border-red-300 dark:border-dark-3'
              }`}
            >
              <span className="text-4xl">×</span>
              <span className="text-sm font-medium text-dark dark:text-white">
                良くなかった
              </span>
            </button>
          </div>
        </div>
        
        {/* コメント（任意） */}
        <div className="mb-6">
          <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
            コメント（任意）
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="詳しく教えてください..."
            className="w-full rounded-md border border-stroke bg-white px-3 py-2 text-sm text-dark placeholder-body-color focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark-2 dark:text-white"
            rows={3}
          />
        </div>
        
        {/* アクション */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-md border border-stroke bg-white px-4 py-2 text-sm font-medium text-dark hover:bg-gray-2 dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:hover:bg-dark-3"
          >
            スキップ
          </button>
          <button
            onClick={handleSubmit}
            disabled={!rating || submitting}
            className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90 disabled:opacity-50"
          >
            {submitting ? '送信中...' : '送信'}
          </button>
        </div>
      </div>
    </div>
  );
}

