import { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../config/firebase';
import { getPlanDisplayName, getPlanInfo } from '../../constants/plans';
import LoadingSpinner from '../common/LoadingSpinner';
import { X, CheckCircle, AlertCircle } from 'lucide-react';

/**
 * プラン変更モーダル
 */
export default function PlanChangeModal({ user, onClose, onSuccess }) {
  const [selectedPlan, setSelectedPlan] = useState(user?.plan || 'free');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);

  if (!user) return null;

  // ユーザー名を取得（lastName + firstName 優先、なければdisplayName）
  const getUserName = () => {
    if (user.lastName && user.firstName) {
      return `${user.lastName} ${user.firstName}`;
    }
    return user.displayName || user.email;
  };

  const plans = ['free', 'standard', 'premium'];
  const currentPlan = user.plan || 'free';

  // プラン変更を実行
  const handleChangePlan = async () => {
    if (selectedPlan === currentPlan) {
      setError('同じプランが選択されています');
      return;
    }

    if (!reason.trim()) {
      setError('変更理由を入力してください');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const updateUserPlan = httpsCallable(functions, 'updateUserPlan');
      const result = await updateUserPlan({
        targetUserId: user.uid,
        newPlan: selectedPlan,
        reason: reason.trim(),
      });

      if (result.data.success) {
        onSuccess(result.data.message);
        onClose();
      } else {
        throw new Error('プラン変更に失敗しました');
      }
    } catch (err) {
      console.error('プラン変更エラー:', err);
      setError(err.message || 'プラン変更に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // 確認ダイアログを表示
  const handleSubmit = (e) => {
    e.preventDefault();
    setShowConfirm(true);
  };

  // プランバッジの色
  const getPlanBadgeColor = (plan) => {
    switch (plan) {
      case 'free':
        return 'bg-gradient-to-r from-blue-400 to-blue-600';
      case 'standard':
        return 'bg-gradient-to-r from-red-400 to-pink-600';
      case 'premium':
        return 'bg-gradient-to-r from-amber-400 to-yellow-500';
      default:
        return 'bg-gray-200';
    }
  };

  // 確認ダイアログ
  if (showConfirm) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-dark-2">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-500/10">
              <AlertCircle className="h-6 w-6 text-orange-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-dark dark:text-white">
                プラン変更の確認
              </h3>
              <p className="text-sm text-body-color dark:text-dark-6">
                以下の内容で変更します
              </p>
            </div>
          </div>

          <div className="mb-6 space-y-3 rounded-lg bg-gray-50 p-4 dark:bg-dark-3">
            <div>
              <p className="text-xs text-body-color dark:text-dark-6">ユーザー</p>
              <p className="text-sm font-medium text-dark dark:text-white">
                {getUserName()} ({user.email})
              </p>
            </div>
            <div>
              <p className="text-xs text-body-color dark:text-dark-6">プラン変更</p>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2 py-1 text-xs font-semibold text-white ${getPlanBadgeColor(currentPlan)}`}>
                  {getPlanDisplayName(currentPlan)}
                </span>
                <span className="text-body-color">→</span>
                <span className={`rounded-full px-2 py-1 text-xs font-semibold text-white ${getPlanBadgeColor(selectedPlan)}`}>
                  {getPlanDisplayName(selectedPlan)}
                </span>
              </div>
            </div>
            <div>
              <p className="text-xs text-body-color dark:text-dark-6">変更理由</p>
              <p className="text-sm text-dark dark:text-white">{reason}</p>
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setShowConfirm(false)}
              disabled={loading}
              className="flex-1 rounded-lg border border-stroke bg-white px-4 py-2 text-sm font-medium text-dark transition hover:bg-gray-2 disabled:opacity-50 dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:hover:bg-dark-3"
            >
              キャンセル
            </button>
            <button
              onClick={handleChangePlan}
              disabled={loading}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" />
                  変更中...
                </>
              ) : (
                '変更を実行'
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // プラン選択フォーム
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-lg bg-white shadow-xl dark:bg-dark-2">
        {/* ヘッダー */}
        <div className="flex items-center justify-between border-b border-stroke p-6 dark:border-dark-3">
          <div>
            <h2 className="text-xl font-semibold text-dark dark:text-white">
              プラン変更
            </h2>
            <p className="mt-1 text-sm text-body-color dark:text-dark-6">
              {getUserName()} ({user.email})
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-body-color transition hover:bg-gray-100 dark:hover:bg-dark-3"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* コンテンツ */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* プラン選択 */}
          <div className="mb-6">
            <label className="mb-3 block text-sm font-medium text-dark dark:text-white">
              新しいプラン
            </label>
            <div className="grid gap-4 md:grid-cols-3">
              {plans.map((plan) => {
                const planInfo = getPlanInfo(plan);
                const isSelected = selectedPlan === plan;
                const isCurrent = currentPlan === plan;

                return (
                  <button
                    key={plan}
                    type="button"
                    onClick={() => setSelectedPlan(plan)}
                    disabled={isCurrent}
                    className={`relative rounded-lg border-2 p-4 text-left transition ${
                      isSelected
                        ? 'border-primary bg-primary/5'
                        : isCurrent
                        ? 'border-gray-300 bg-gray-100 opacity-60'
                        : 'border-stroke hover:border-primary/50 dark:border-dark-3'
                    }`}
                  >
                    {isCurrent && (
                      <span className="absolute right-2 top-2 rounded-full bg-green-500 px-2 py-0.5 text-xs font-semibold text-white">
                        現在
                      </span>
                    )}
                    <div className={`mb-2 inline-block rounded-full px-3 py-1 text-xs font-semibold text-white ${getPlanBadgeColor(plan)}`}>
                      {planInfo.displayName}
                    </div>
                    <p className="mb-2 text-lg font-bold text-dark dark:text-white">
                      {planInfo.price}
                    </p>
                    <ul className="space-y-1 text-xs text-body-color dark:text-dark-6">
                      <li>• サイト: {planInfo.features.maxSites}個</li>
                      <li>• AI分析: {planInfo.features.aiSummaryMonthly}/月</li>
                      <li>• AI改善: {planInfo.features.aiImprovementMonthly}/月</li>
                    </ul>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 変更理由 */}
          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
              変更理由 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="プラン変更の理由を入力してください..."
              rows={3}
              required
              className="w-full rounded-lg border border-stroke bg-white px-4 py-3 text-sm focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark dark:text-white"
            />
          </div>

          {/* エラー表示 */}
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20">
              {error}
            </div>
          )}

          {/* ボタン */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-stroke bg-white px-4 py-2 text-sm font-medium text-dark transition hover:bg-gray-2 dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:hover:bg-dark-3"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={selectedPlan === currentPlan || !reason.trim()}
              className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary/90 disabled:opacity-50"
            >
              確認画面へ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

