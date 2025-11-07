import { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import LoadingSpinner from '../common/LoadingSpinner';

/**
 * 個別制限設定モーダル
 */
export default function CustomLimitsModal({ user, currentLimits, onClose, onSave }) {
  const [formData, setFormData] = useState({
    maxSites: '',
    aiSummaryMonthly: '',
    aiImprovementMonthly: '',
    validUntil: '',
    reason: '',
    isUnlimited: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (currentLimits) {
      setFormData({
        maxSites: currentLimits.limits?.maxSites ?? '',
        aiSummaryMonthly: currentLimits.limits?.aiSummaryMonthly ?? '',
        aiImprovementMonthly: currentLimits.limits?.aiImprovementMonthly ?? '',
        validUntil: currentLimits.validUntil ? currentLimits.validUntil.split('T')[0] : '',
        reason: currentLimits.reason || '',
        isUnlimited: !currentLimits.validUntil,
      });
    }
  }, [currentLimits]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const limits = {
        maxSites: formData.maxSites === '' ? null : parseInt(formData.maxSites, 10),
        aiSummaryMonthly: formData.aiSummaryMonthly === '' ? null : parseInt(formData.aiSummaryMonthly, 10),
        aiImprovementMonthly: formData.aiImprovementMonthly === '' ? null : parseInt(formData.aiImprovementMonthly, 10),
      };

      const validUntil = formData.isUnlimited ? null : formData.validUntil || null;

      await onSave(limits, validUntil, formData.reason);
      onClose();
    } catch (err) {
      setError(err.message || '保存に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-2xl rounded-lg border border-stroke bg-white p-6 shadow-xl dark:border-dark-3 dark:bg-dark-2">
        {/* ヘッダー */}
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-xl font-bold text-dark dark:text-white">
            個別制限の設定
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-body-color transition hover:bg-gray-2 dark:text-dark-6 dark:hover:bg-dark-3"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* エラー表示 */}
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-red-600 dark:bg-red-900/20 dark:text-red-400">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        )}

        {/* ユーザー情報 */}
        <div className="mb-6 rounded-lg bg-gray-50 p-4 dark:bg-dark-3">
          <div className="text-sm text-body-color dark:text-dark-6">対象ユーザー</div>
          <div className="font-medium text-dark dark:text-white">{user.displayName}</div>
          <div className="text-sm text-body-color dark:text-dark-6">{user.email}</div>
        </div>

        {/* フォーム */}
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* サイト登録数 */}
            <div>
              <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                サイト登録数上限
              </label>
              <input
                type="number"
                min="0"
                value={formData.maxSites}
                onChange={(e) => setFormData({ ...formData, maxSites: e.target.value })}
                placeholder="プラン標準値を使用"
                className="w-full rounded-lg border border-stroke bg-white px-4 py-2 text-dark focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark dark:text-white"
              />
              <p className="mt-1 text-xs text-body-color dark:text-dark-6">
                空欄の場合はプラン標準値、999999で実質無制限
              </p>
            </div>

            {/* AI分析サマリー */}
            <div>
              <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                AI分析サマリー（月間）
              </label>
              <input
                type="number"
                min="0"
                value={formData.aiSummaryMonthly}
                onChange={(e) => setFormData({ ...formData, aiSummaryMonthly: e.target.value })}
                placeholder="プラン標準値を使用"
                className="w-full rounded-lg border border-stroke bg-white px-4 py-2 text-dark focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark dark:text-white"
              />
            </div>

            {/* AI改善提案 */}
            <div>
              <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                AI改善提案（月間）
              </label>
              <input
                type="number"
                min="0"
                value={formData.aiImprovementMonthly}
                onChange={(e) => setFormData({ ...formData, aiImprovementMonthly: e.target.value })}
                placeholder="プラン標準値を使用"
                className="w-full rounded-lg border border-stroke bg-white px-4 py-2 text-dark focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark dark:text-white"
              />
            </div>

            {/* 有効期限 */}
            <div>
              <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                有効期限
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="date"
                  value={formData.validUntil}
                  onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                  disabled={formData.isUnlimited}
                  className="flex-1 rounded-lg border border-stroke bg-white px-4 py-2 text-dark focus:border-primary focus:outline-none disabled:opacity-50 dark:border-dark-3 dark:bg-dark dark:text-white"
                />
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isUnlimited}
                    onChange={(e) => setFormData({ ...formData, isUnlimited: e.target.checked })}
                    className="h-4 w-4 rounded border-stroke text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-body-color dark:text-dark-6">無期限</span>
                </label>
              </div>
            </div>

            {/* 理由 */}
            <div>
              <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                設定理由 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                required
                rows={3}
                placeholder="VIP契約により無制限、トライアル延長、など"
                className="w-full rounded-lg border border-stroke bg-white px-4 py-2 text-dark focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark dark:text-white"
              />
            </div>
          </div>

          {/* ボタン */}
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-lg border border-stroke bg-white px-6 py-2 font-medium text-dark transition hover:bg-gray-2 disabled:opacity-50 dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:hover:bg-dark-3"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2 font-medium text-white transition hover:bg-primary/90 disabled:opacity-50"
            >
              {loading && <LoadingSpinner />}
              {loading ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

