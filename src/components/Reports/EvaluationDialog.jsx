import React, { useState, useEffect } from 'react';
import { X, CheckCircle, Star } from 'lucide-react';
import { db } from '../../config/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useQueryClient } from '@tanstack/react-query';

export default function EvaluationDialog({ isOpen, onClose, item }) {
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    actualImpact: '',
    evaluation: '',
    rating: 3,
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);

  useEffect(() => {
    if (item) {
      const hasEvaluation = item.rating && item.evaluation;
      setIsReadOnly(hasEvaluation);
      
      setFormData({
        actualImpact: item.actualImpact || '',
        evaluation: item.evaluation || '',
        rating: item.rating || 3,
      });
    }
  }, [item]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isReadOnly) {
      onClose();
      return;
    }
    
    setIsSaving(true);

    try {
      const improvementRef = doc(db, 'improvements', item.id);
      await updateDoc(improvementRef, {
        ...formData,
        evaluatedAt: new Date(),
        updatedAt: new Date(),
      });

      queryClient.invalidateQueries({ queryKey: ['completed-improvements'] });
      onClose();
    } catch (error) {
      console.error('Error saving evaluation:', error);
      alert('評価の保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen || !item) return null;

  const categoryColors = {
    acquisition: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
    content: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300',
    design: 'bg-pink-100 text-pink-800 dark:bg-pink-900/20 dark:text-pink-300',
    feature: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
    other: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300',
  };

  const categoryLabels = {
    acquisition: '集客',
    content: 'コンテンツ',
    design: 'デザイン',
    feature: '機能',
    other: 'その他',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 dark:bg-dark-2">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-6 w-6 text-green-500" />
            <h3 className="text-xl font-semibold text-dark dark:text-white">
              {isReadOnly ? '改善課題の評価詳細' : '改善課題の評価'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-gray-2 dark:hover:bg-dark-3"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-6 space-y-3 rounded-lg border border-stroke bg-gray-2 p-4 dark:border-dark-3 dark:bg-dark-3">
          <div className="flex items-start justify-between">
            <h4 className="flex-1 font-medium text-dark dark:text-white">
              {item.title}
            </h4>
            <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${categoryColors[item.category]}`}>
              {categoryLabels[item.category]}
            </span>
          </div>
          
          <p className="text-sm text-body-color">
            {item.description}
          </p>
          
          {item.expectedImpact && (
            <div className="border-t border-stroke pt-2 dark:border-dark-3">
              <p className="text-xs text-body-color">
                <span className="font-medium">期待効果: </span>
                {item.expectedImpact}
              </p>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
              実際の効果
            </label>
            <input
              type="text"
              value={formData.actualImpact}
              onChange={(e) => setFormData({ ...formData, actualImpact: e.target.value })}
              className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-dark outline-none focus:border-primary disabled:cursor-not-allowed disabled:opacity-60 dark:border-dark-3 dark:text-white"
              placeholder="例: CVR 12%向上、滞在時間 25%増加"
              disabled={isReadOnly}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
              評価・振り返り {!isReadOnly && <span className="text-red-500">*</span>}
            </label>
            <textarea
              value={formData.evaluation}
              onChange={(e) => setFormData({ ...formData, evaluation: e.target.value })}
              rows={4}
              className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-dark outline-none focus:border-primary disabled:cursor-not-allowed disabled:opacity-60 dark:border-dark-3 dark:text-white"
              placeholder="改善の効果や気づいた点を記録してください"
              disabled={isReadOnly}
              required={!isReadOnly}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
              満足度評価 {!isReadOnly && <span className="text-red-500">*</span>}
            </label>
            <div className="flex items-center gap-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => !isReadOnly && setFormData({ ...formData, rating: star })}
                  className={`group ${isReadOnly ? 'cursor-default' : ''}`}
                  disabled={isReadOnly}
                >
                  <Star
                    className={`h-8 w-8 transition-colors ${
                      star <= formData.rating
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'fill-none text-gray-300 group-hover:text-yellow-400'
                    } ${isReadOnly ? 'group-hover:text-gray-300' : ''}`}
                  />
                </button>
              ))}
              <span className="ml-2 text-sm text-body-color">
                {formData.rating}/5
              </span>
            </div>
            <div className="mt-2">
              <p className="text-xs text-body-color">
                1: 改善が必要 | 2: やや不満 | 3: 普通 | 4: 良い | 5: 大変良い
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-stroke pt-4 dark:border-dark-3">
            {isReadOnly ? (
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
              >
                閉じる
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-stroke px-4 py-2 text-sm font-medium text-dark hover:bg-gray-2 dark:border-dark-3 dark:text-white dark:hover:bg-dark-3"
                  disabled={isSaving}
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isSaving}
                >
                  {isSaving ? '保存中...' : '評価を保存'}
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

