import React, { useState, useEffect } from 'react';
import { X, CheckCircle } from 'lucide-react';

export default function EvaluationModal({ isOpen, onClose, item, onSave }) {
  const [formData, setFormData] = useState({
    actualImpact: '',
    evaluation: '',
    rating: 3,
  });

  useEffect(() => {
    if (item) {
      setFormData({
        actualImpact: item.actualImpact || '',
        evaluation: item.evaluation || '',
        rating: item.rating || 3,
      });
    }
  }, [item]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl rounded-lg bg-white p-6 dark:bg-dark-2">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-6 w-6 text-green-500" />
            <h3 className="text-xl font-semibold text-dark dark:text-white">
              改善課題の評価
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-gray-2 dark:hover:bg-dark-3"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-6 rounded-lg border border-stroke bg-gray-2 p-4 dark:border-dark-3 dark:bg-dark-3">
          <h4 className="mb-2 font-medium text-dark dark:text-white">
            {item.title}
          </h4>
          <p className="text-sm text-body-color">
            {item.description}
          </p>
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
              className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-dark outline-none focus:border-primary dark:border-dark-3 dark:text-white"
              placeholder="例: CVR 12%向上、滞在時間 25%増加"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
              評価・振り返り
            </label>
            <textarea
              value={formData.evaluation}
              onChange={(e) => setFormData({ ...formData, evaluation: e.target.value })}
              rows={4}
              className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-dark outline-none focus:border-primary dark:border-dark-3 dark:text-white"
              placeholder="改善の効果や気づいた点を記録してください"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
              満足度評価
            </label>
            <div className="flex items-center gap-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setFormData({ ...formData, rating: star })}
                  className="group"
                >
                  <svg
                    className={`h-8 w-8 transition-colors ${
                      star <= formData.rating
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'fill-none text-gray-300 group-hover:text-yellow-400'
                    }`}
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                    />
                  </svg>
                </button>
              ))}
              <span className="ml-2 text-sm text-body-color">
                {formData.rating}/5
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-stroke px-4 py-2 text-sm font-medium text-dark hover:bg-gray-2 dark:border-dark-3 dark:text-white dark:hover:bg-dark-3"
            >
              スキップ
            </button>
            <button
              type="submit"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
            >
              評価を保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

