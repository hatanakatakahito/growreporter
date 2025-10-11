'use client';

import React, { useState } from 'react';
import { UserImprovement } from '@/lib/improvements/types';
import { ImprovementService } from '@/lib/improvements/improvementService';
import { useAuth } from '@/lib/auth/authContext';

interface InProgressCardProps {
  improvement: UserImprovement;
  onUpdate: () => void;
}

export default function InProgressCard({ improvement, onUpdate }: InProgressCardProps) {
  const { user } = useAuth();
  const [memo, setMemo] = useState(improvement.memo || '');
  const [checklist, setChecklist] = useState(improvement.checklist || []);
  const [saving, setSaving] = useState(false);
  
  const handleChecklistChange = async (index: number) => {
    if (!user) return;
    
    const newChecklist = [...checklist];
    newChecklist[index].checked = !newChecklist[index].checked;
    setChecklist(newChecklist);
    
    try {
      await ImprovementService.updateChecklist(user.uid, improvement.id, newChecklist);
    } catch (error) {
      console.error('チェックリスト更新エラー:', error);
    }
  };
  
  const handleMemoSave = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      await ImprovementService.updateMemo(user.uid, improvement.id, memo);
      alert('メモを保存しました');
    } catch (error) {
      console.error('メモ保存エラー:', error);
      alert('メモの保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };
  
  const handleComplete = async () => {
    if (!user) return;
    
    const confirmed = confirm('この施策を完了にしますか？');
    if (!confirmed) return;
    
    try {
      await ImprovementService.updateStatus(user.uid, improvement.id, 'completed');
      onUpdate();
    } catch (error) {
      console.error('ステータス更新エラー:', error);
      alert('ステータスの更新に失敗しました');
    }
  };
  
  const progress = checklist.length > 0
    ? (checklist.filter(item => item.checked).length / checklist.length) * 100
    : 0;
  
  return (
    <div className="rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
      {/* ヘッダー */}
      <div className="mb-4 flex items-start justify-between">
        <div className="flex-1">
          <h5 className="text-lg font-semibold text-dark dark:text-white">
            {improvement.title}
          </h5>
          {improvement.startedAt && (
            <p className="mt-1 text-xs text-body-color">
              開始日: {new Date(improvement.startedAt).toLocaleDateString('ja-JP')}
            </p>
          )}
        </div>
        
        <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300">
          実行中
        </span>
      </div>
      
      {/* 進捗バー */}
      {checklist.length > 0 && (
        <div className="mb-4">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-body-color">進捗</span>
            <span className="font-semibold text-dark dark:text-white">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
      
      {/* チェックリスト */}
      {checklist.length > 0 && (
        <div className="mb-4">
          <h5 className="mb-2 text-sm font-medium text-dark dark:text-white">
            チェックリスト
          </h5>
          <div className="space-y-2">
            {checklist.map((item, index) => (
              <label
                key={index}
                className="flex items-start gap-2 cursor-pointer group"
              >
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={() => handleChecklistChange(index)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span
                  className={`text-sm transition-colors ${
                    item.checked
                      ? 'text-body-color line-through'
                      : 'text-dark group-hover:text-primary dark:text-white'
                  }`}
                >
                  {item.text}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}
      
      {/* メモ */}
      <div className="mb-4">
        <h5 className="mb-2 text-sm font-medium text-dark dark:text-white">
          メモ
        </h5>
        <textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="作業メモを記録..."
          className="w-full rounded-md border border-stroke bg-white px-3 py-2 text-sm text-dark placeholder-body-color focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark-2 dark:text-white"
          rows={3}
        />
        {memo !== improvement.memo && (
          <button
            onClick={handleMemoSave}
            disabled={saving}
            className="mt-2 rounded-md bg-gray-200 px-3 py-1 text-xs font-medium text-dark hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
          >
            {saving ? '保存中...' : 'メモを保存'}
          </button>
        )}
      </div>
      
      {/* 期待効果 */}
      {improvement.expectedEffect && (
        <div className="mb-4 rounded-md bg-blue-50 p-3 dark:bg-blue-950">
          <div className="text-xs font-medium text-blue-700 dark:text-blue-300">
            期待効果
          </div>
          <div className="mt-1 text-sm text-dark dark:text-white">
            {improvement.expectedEffect.cvr && `CVR: ${improvement.expectedEffect.cvr}`}
            {improvement.expectedEffect.cvr && improvement.expectedEffect.conversions && ' / '}
            {improvement.expectedEffect.conversions && `CV数: ${improvement.expectedEffect.conversions}`}
          </div>
        </div>
      )}
      
      {/* アクション */}
      <div className="flex gap-2">
        <button
          onClick={handleComplete}
          className="flex-1 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
        >
          完了にする
        </button>
      </div>
    </div>
  );
}

