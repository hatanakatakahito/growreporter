import { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import LoadingSpinner from '../common/LoadingSpinner';
import { Dialog, DialogTitle, DialogBody, DialogActions } from '../ui/dialog';
import { Button } from '../ui/button';

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

  // ユーザー名を取得（lastName + firstName 優先、なければdisplayName）
  const getUserName = () => {
    if (user.lastName && user.firstName) {
      return `${user.lastName} ${user.firstName}`;
    }
    return user.displayName || user.email;
  };

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
    <Dialog open={true} onClose={onClose} size="2xl">
      <DialogTitle>個別制限の設定</DialogTitle>

      <DialogBody>
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
          <div className="font-medium text-dark dark:text-white">{getUserName()}</div>
          <div className="text-sm text-body-color dark:text-dark-6">{user.email}</div>
        </div>

        {/* フォーム */}
        <form id="custom-limits-form" onSubmit={handleSubmit}>
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
        </form>
      </DialogBody>

      <DialogActions>
        <Button plain onClick={onClose} disabled={loading}>
          キャンセル
        </Button>
        <Button color="blue" type="submit" form="custom-limits-form" disabled={loading}>
          {loading && <LoadingSpinner />}
          {loading ? '保存中...' : '保存'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
