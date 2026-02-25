import React, { useState, useEffect } from 'react';
import { X, RefreshCw } from 'lucide-react';
import { db, functions } from '../../config/firebase';
import { httpsCallable } from 'firebase/functions';
import { collection, addDoc, updateDoc, doc, deleteDoc, query, where, getDocs } from 'firebase/firestore';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';

export default function ImprovementDialog({ isOpen, onClose, siteId, editingItem, onDeleted }) {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    expectedImpact: '',
    targetPageUrl: '',
    targetArea: '',
    category: '',
    priority: '',
    estimatedLaborHours: '',
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [isFetchingScreenshot, setIsFetchingScreenshot] = useState(false);

  useEffect(() => {
    if (isOpen && editingItem) {
      setFormData({
        title: editingItem.title || '',
        description: editingItem.description || '',
        expectedImpact: editingItem.expectedImpact || '',
        targetPageUrl: (editingItem.targetPageUrl || '').trim(),
        targetArea: editingItem.targetArea || '',
        category: editingItem.category || '',
        priority: editingItem.priority || '',
        estimatedLaborHours: editingItem.estimatedLaborHours != null && editingItem.estimatedLaborHours !== ''
          ? String(editingItem.estimatedLaborHours)
          : '',
      });
    } else if (isOpen && !editingItem) {
      setFormData({
        title: '',
        description: '',
        expectedImpact: '',
        targetPageUrl: '',
        targetArea: '',
        category: '',
        priority: '',
        estimatedLaborHours: '',
      });
    }
  }, [editingItem, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      // 新規作成時のみ重複チェック
      if (!editingItem?.id) {
        const q = query(
          collection(db, 'sites', siteId, 'improvements'),
          where('title', '==', formData.title.trim())
        );
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          alert('同じタイトルの改善課題が既に存在します。別のタイトルを入力してください。');
          setIsSaving(false);
          return;
        }
      }

      const hoursVal = formData.estimatedLaborHours?.trim();
      const estimatedLaborHours = (hoursVal !== '' && !Number.isNaN(Number(hoursVal)) && Number(hoursVal) > 0)
        ? Number(hoursVal)
        : null;
      const improvementData = {
        title: formData.title?.trim() || '',
        description: formData.description?.trim() || '',
        expectedImpact: formData.expectedImpact?.trim() || '',
        targetPageUrl: formData.targetPageUrl?.trim() || '',
        targetArea: formData.targetArea?.trim() || '',
        category: formData.category?.trim() || null,
        priority: formData.priority?.trim() || null,
        estimatedLaborHours,
        status: editingItem?.status || 'draft',
        updatedAt: new Date(),
      };

      // editingItem に id がある場合のみ更新、それ以外は新規作成
      if (editingItem?.id) {
        // 更新
        const improvementRef = doc(db, 'sites', siteId, 'improvements', editingItem.id);
        await updateDoc(improvementRef, improvementData);
      } else {
        // 新規作成
        improvementData.createdAt = new Date();
        improvementData.createdBy = currentUser.email;
        await addDoc(collection(db, 'sites', siteId, 'improvements'), improvementData);
      }

      // クエリを無効化して再取得
      queryClient.invalidateQueries({ queryKey: ['improvements', siteId] });
      
      // フォームをリセット
      setFormData({
        title: '',
        description: '',
        expectedImpact: '',
        targetPageUrl: '',
        targetArea: '',
        category: '',
        priority: '',
        estimatedLaborHours: '',
      });
      
      // ダイアログを閉じる
      onClose();
    } catch (error) {
      console.error('Error saving improvement:', error);
      console.error('Error details:', {
        siteId,
        currentUser: currentUser?.email,
        formData,
        editingItem,
      });
      alert(`保存に失敗しました: ${error.message || '不明なエラー'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editingItem?.id) return;
    if (!window.confirm('この改善課題を削除しますか？')) return;
    try {
      await deleteDoc(doc(db, 'sites', siteId, 'improvements', editingItem.id));
      queryClient.invalidateQueries({ queryKey: ['improvements', siteId] });
      queryClient.invalidateQueries({ queryKey: ['completed-improvements', siteId] });
      onDeleted?.();
      onClose();
    } catch (err) {
      console.error('[ImprovementDialog] 削除エラー:', err);
      alert('削除に失敗しました: ' + (err?.message || ''));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex h-[90vh] max-h-[90vh] w-full max-w-2xl flex-col rounded-lg bg-white dark:bg-dark-2">
        <div className="flex-shrink-0 border-b border-stroke px-6 py-4 dark:border-dark-3">
          <div className="flex items-center justify-between">
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
        </div>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col min-h-0">
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
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
              rows={8}
              className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-dark outline-none focus:border-primary dark:border-dark-3 dark:text-white resize-none"
              placeholder="改善内容の詳細を記述してください"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
              対象ページURL <span className="text-body-color font-normal">（任意）</span>
            </label>
            <input
              type="text"
              value={formData.targetPageUrl}
              onChange={(e) => setFormData({ ...formData, targetPageUrl: e.target.value })}
              className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-dark outline-none focus:border-primary dark:border-dark-3 dark:text-white"
              placeholder="例: https://example.com/pricing または /path/"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
              対象箇所 <span className="text-body-color font-normal">（任意）</span>
            </label>
            <input
              type="text"
              value={formData.targetArea}
              onChange={(e) => setFormData({ ...formData, targetArea: e.target.value })}
              className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-dark outline-none focus:border-primary dark:border-dark-3 dark:text-white"
              placeholder="例: ヒーロー、CTA、フッター"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
              期待効果 <span className="text-body-color font-normal">（任意）</span>
            </label>
            <input
              type="text"
              value={formData.expectedImpact}
              onChange={(e) => setFormData({ ...formData, expectedImpact: e.target.value })}
              className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-dark outline-none focus:border-primary dark:border-dark-3 dark:text-white"
              placeholder="例: CVR 10%向上を期待"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
              カテゴリー <span className="text-body-color font-normal">（任意）</span>
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-dark outline-none focus:border-primary dark:border-dark-3 dark:text-white"
            >
              <option value="">選択しない</option>
              <option value="acquisition">集客</option>
              <option value="content">コンテンツ</option>
              <option value="design">デザイン</option>
              <option value="feature">機能</option>
              <option value="other">その他</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
              優先度 <span className="text-body-color font-normal">（任意）</span>
            </label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-dark outline-none focus:border-primary dark:border-dark-3 dark:text-white"
            >
              <option value="">選択しない</option>
              <option value="high">高</option>
              <option value="medium">中</option>
              <option value="low">低</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
              想定工数（時間） <span className="text-body-color font-normal">（任意）</span>
            </label>
            <input
              type="number"
              min="0.5"
              max="100"
              step="0.5"
              value={formData.estimatedLaborHours}
              onChange={(e) => setFormData({ ...formData, estimatedLaborHours: e.target.value })}
              className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-dark outline-none focus:border-primary dark:border-dark-3 dark:text-white"
              placeholder="例: 2（目安料金・納期の算出に使用）"
            />
          </div>

          {editingItem?.id && formData.targetPageUrl?.trim() && (
            <div>
              <button
                type="button"
                onClick={async () => {
                  const url = formData.targetPageUrl.trim();
                  if (!url) return;
                  setIsFetchingScreenshot(true);
                  try {
                    const captureScreenshot = httpsCallable(functions, 'captureScreenshot');
                    const [pcRes, mobileRes] = await Promise.all([
                      captureScreenshot({ siteUrl: url, deviceType: 'pc' }),
                      captureScreenshot({ siteUrl: url, deviceType: 'mobile' }),
                    ]);
                    const updates = { updatedAt: new Date() };
                    if (pcRes?.data?.imageUrl) updates.targetPageScreenshotUrlPc = pcRes.data.imageUrl;
                    if (mobileRes?.data?.imageUrl) updates.targetPageScreenshotUrlMobile = mobileRes.data.imageUrl;
                    if (Object.keys(updates).length > 1) {
                      await updateDoc(doc(db, 'sites', siteId, 'improvements', editingItem.id), updates);
                      queryClient.invalidateQueries({ queryKey: ['improvements', siteId] });
                    }
                  } catch (e) {
                    console.error('[ImprovementDialog] スクショ取得エラー:', e);
                    alert('スクショの取得に失敗しました。');
                  } finally {
                    setIsFetchingScreenshot(false);
                  }
                }}
                disabled={isFetchingScreenshot}
                className="inline-flex items-center gap-2 rounded-lg border border-stroke px-4 py-2 text-sm font-medium text-dark hover:bg-gray-2 dark:border-dark-3 dark:text-white dark:hover:bg-dark-3 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${isFetchingScreenshot ? 'animate-spin' : ''}`} />
                {isFetchingScreenshot ? '取得中...' : 'スクショを再取得'}
              </button>
            </div>
          )}
          </div>

          <div className="flex-shrink-0 flex items-center justify-between gap-3 border-t border-stroke px-6 py-4 dark:border-dark-3">
            <div>
              {editingItem?.id && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="rounded-lg border border-red-500 px-4 py-2 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  削除
                </button>
              )}
            </div>
            <div className="flex gap-3">
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
          </div>
        </form>
      </div>
    </div>
  );
}

