import { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../config/firebase';
import { getPlanDisplayName, getPlanInfo, getPlanBadgeColor, isUnlimited } from '../../constants/plans';
import { AlertCircle } from 'lucide-react';
import { Dialog, DialogTitle, DialogDescription, DialogBody, DialogActions } from '../ui/dialog';
import { Button } from '../ui/button';
import DotWaveSpinner from '../common/DotWaveSpinner';

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

  const plans = ['free', 'business'];
  const currentPlan = user.plan || 'free';

  // プラン変更を実行
  const handleChangePlan = async () => {
    if (selectedPlan === currentPlan) {
      setError('同じプランが選択されています');
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

  // 確認ダイアログ
  if (showConfirm) {
    return (
      <Dialog open={true} onClose={() => setShowConfirm(false)} size="md">
        <DialogBody>
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
            {reason.trim() && (
              <div>
                <p className="text-xs text-body-color dark:text-dark-6">変更理由</p>
                <p className="text-sm text-dark dark:text-white">{reason}</p>
              </div>
            )}
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20">
              {error}
            </div>
          )}
        </DialogBody>

        <DialogActions>
          <Button plain onClick={() => setShowConfirm(false)} disabled={loading}>
            キャンセル
          </Button>
          <Button color="blue" onClick={handleChangePlan} disabled={loading}>
            {loading ? (
              <>
                <DotWaveSpinner size="xs" variant="white" />
                変更中...
              </>
            ) : (
              '変更を実行'
            )}
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  // プラン選択フォーム
  return (
    <Dialog open={true} onClose={onClose} size="2xl">
      <DialogTitle>プラン変更</DialogTitle>
      <DialogDescription>{getUserName()} ({user.email})</DialogDescription>

      <form id="plan-change-form" onSubmit={handleSubmit}>
        <DialogBody>
          {/* プラン選択 */}
          <div className="mb-6">
            <label className="mb-3 block text-sm font-medium text-dark dark:text-white">
              新しいプラン
            </label>
            <div className="grid gap-4 md:grid-cols-2">
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
                      <li>• AI分析: {isUnlimited(planInfo.features.aiSummaryMonthly) ? '無制限' : `${planInfo.features.aiSummaryMonthly}回/月`}</li>
                      <li>• AI改善: {isUnlimited(planInfo.features.aiImprovementMonthly) ? '無制限' : `${planInfo.features.aiImprovementMonthly}回/月`}</li>
                    </ul>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 変更理由 */}
          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
              変更理由
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="プラン変更の理由を入力してください..."
              rows={3}
              className="w-full rounded-lg border border-stroke bg-white px-4 py-3 text-sm focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark dark:text-white"
            />
          </div>

          {/* エラー表示 */}
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20">
              {error}
            </div>
          )}
        </DialogBody>
      </form>

      <DialogActions>
        <Button plain onClick={onClose}>
          キャンセル
        </Button>
        <Button color="blue" type="submit" form="plan-change-form" disabled={selectedPlan === currentPlan}>
          確認画面へ
        </Button>
      </DialogActions>
    </Dialog>
  );
}
