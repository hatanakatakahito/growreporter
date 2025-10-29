import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { db } from '../../config/firebase';
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';

export default function ImprovementDialog({ isOpen, onClose, siteId, editingItem }) {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'other',
    priority: 'medium',
    expectedImpact: '',
  });
  
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (editingItem) {
      setFormData({
        title: editingItem.title || '',
        description: editingItem.description || '',
        category: editingItem.category || 'other',
        priority: editingItem.priority || 'medium',
        expectedImpact: editingItem.expectedImpact || '',
      });
    } else {
      setFormData({
        title: '',
        description: '',
        category: 'other',
        priority: 'medium',
        expectedImpact: '',
      });
    }
  }, [editingItem, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const improvementData = {
        ...formData,
        siteId,
        status: editingItem?.status || 'draft',
        updatedAt: new Date(),
      };

      if (editingItem) {
        // 更新
        const improvementRef = doc(db, 'improvements', editingItem.id);
        await updateDoc(improvementRef, improvementData);
      } else {
        // 新規作成
        improvementData.createdAt = new Date();
        improvementData.createdBy = currentUser.email;
        await addDoc(collection(db, 'improvements'), improvementData);
      }

      queryClient.invalidateQueries({ queryKey: ['improvements', siteId] });
      onClose();
    } catch (error) {
      console.error('Error saving improvement:', error);
      alert('保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl rounded-lg bg-white p-6 dark:bg-dark-2">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-semibold text-dark dark:text-white">
            {editingItem ? '改善課題を編集' : '改善課題を追加'}
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-gray-2 dark:hover:bg-dark-3"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
              タイトル <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-dark outline-none focus:border-primary dark:border-dark-3 dark:text-white"
              placeholder="例: トップページのファーストビュー改善"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
              説明 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-dark outline-none focus:border-primary dark:border-dark-3 dark:text-white"
              placeholder="改善内容の詳細を記述してください"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                カテゴリ <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-dark outline-none focus:border-primary dark:border-dark-3 dark:text-white"
                required
              >
                <option value="acquisition">集客</option>
                <option value="content">コンテンツ</option>
                <option value="design">デザイン</option>
                <option value="feature">機能</option>
                <option value="other">その他</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                優先度 <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-dark outline-none focus:border-primary dark:border-dark-3 dark:text-white"
                required
              >
                <option value="high">高</option>
                <option value="medium">中</option>
                <option value="low">低</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
              期待効果（任意）
            </label>
            <input
              type="text"
              value={formData.expectedImpact}
              onChange={(e) => setFormData({ ...formData, expectedImpact: e.target.value })}
              className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-dark outline-none focus:border-primary dark:border-dark-3 dark:text-white"
              placeholder="例: CVR 10%向上を期待"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
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
              {isSaving ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

