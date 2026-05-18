import { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../config/firebase';
import { getPlanDisplayName, getPlanInfo, getPlanBadgeColor, isUnlimited, EXTRA_SITE_UNIT_PRICE } from '../../constants/plans';
import { AlertCircle } from 'lucide-react';
import { Dialog, DialogTitle, DialogDescription, DialogBody, DialogActions } from '../ui/dialog';
import { Button } from '../ui/button';
import DotWaveSpinner from '../common/DotWaveSpinner';

/**
 * プラン変更モーダル
 * プラン本体 (free / business) と
 * サイト追加オプション (extraSitesCount, extraSitesValidUntil) を一括で変更できる
 */
export default function PlanChangeModal({ user, onClose, onSuccess }) {
  const [selectedPlan, setSelectedPlan] = useState(user?.plan || 'free');
  const [extraSitesCount, setExtraSitesCount] = useState(Number(user?.extraSitesCount) || 0);
  const initialValidUntil = (() => {
    const v = user?.extraSitesValidUntil;
    if (!v) return '';
    // ISO 文字列 / Firestore Timestamp / Date のいずれにも対応
    const d = typeof v.toDate === 'function' ? v.toDate() : new Date(v);
    return Number.isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
  })();
  const [extraSitesValidUntil, setExtraSitesValidUntil] = useState(initialValidUntil);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);

  if (!user) return null;

  // free にダウングレード時は extras 自動ゼロ化
  const isDowngradeToFree = selectedPlan === 'free' && (user.plan || 'free') !== 'free';
  const effectiveExtraSitesCount = selectedPlan === 'free' ? 0 : extraSitesCount;

  // ユーザー名を取得（lastName + firstName 優先、なければdisplayName）
  const getUserName = () => {
    if (user.lastName && user.firstName) {
      return `${user.lastName} ${user.firstName}`;
    }
    return user.displayName || user.email;
  };

  const plans = ['free', 'business'];
  const currentPlan = user.plan || 'free';
  const currentExtraSitesCount = Number(user.extraSitesCount) || 0;

  const isPlanChanged = selectedPlan !== currentPlan;
  const isExtraChanged =
    effectiveExtraSitesCount !== currentExtraSitesCount ||
    extraSitesValidUntil !== initialValidUntil;
  const isAnyChange = isPlanChanged || isExtraChanged;

  // プラン変更を実行
  const handleChangePlan = async () => {
    if (!isAnyChange) {
      setError('変更内容がありません');
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
        extraSitesCount: effectiveExtraSitesCount,
        extraSitesValidUntil: extraSitesValidUntil || null,
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
          <Button variant="ghost" onClick={() => setShowConfirm(false)} disabled={loading}>
            キャンセル
          </Button>
          <Button variant="primary" onClick={handleChangePlan} disabled={loading}>
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
                      <li>• サイト: {planInfo.features.maxSites}個 / メンバー: {isUnlimited(planInfo.features.maxMembers) ? '無制限' : `${planInfo.features.maxMembers}人`}</li>
                      <li>• AI分析: {planInfo.features.aiSummaryMonthly === 0 ? '不可' : isUnlimited(planInfo.features.aiSummaryMonthly) ? '無制限' : `${planInfo.features.aiSummaryMonthly}回/月`}</li>
                      <li>• AI改善: {planInfo.features.aiImprovementMonthly === 0 ? '不可' : isUnlimited(planInfo.features.aiImprovementMonthly) ? '無制限' : `${planInfo.features.aiImprovementMonthly}回/月`}</li>
                      <li>• AIチャット: {planInfo.features.aiChatMonthly === 0 ? '不可' : isUnlimited(planInfo.features.aiChatMonthly) ? '無制限' : `${planInfo.features.aiChatMonthly}回/月`}</li>
                    </ul>
                  </button>
                );
              })}
            </div>
          </div>

          {/* サイト追加オプション */}
          <div className="mb-6 rounded-lg border border-stroke p-4 dark:border-dark-3">
            <h4 className="mb-3 text-sm font-medium text-dark dark:text-white">
              サイト追加オプション
            </h4>
            <p className="mb-3 text-xs text-body-color dark:text-dark-6">
              ビジネスプランの基本3サイトに加え、1サイトあたり ¥{EXTRA_SITE_UNIT_PRICE.toLocaleString()}/月（税別）で追加可能。
              free に戻す場合は自動でゼロ化されます。
            </p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-dark dark:text-white">
                  追加サイト数
                </label>
                <input
                  type="number"
                  min={0}
                  max={20}
                  value={extraSitesCount}
                  onChange={(e) => setExtraSitesCount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  disabled={selectedPlan === 'free'}
                  className="w-full rounded-lg border border-stroke bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none disabled:opacity-50 dark:border-dark-3 dark:bg-dark dark:text-white"
                />
                <p className="mt-1 text-xs text-body-color dark:text-dark-6">
                  現在: {currentExtraSitesCount}サイト
                </p>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-dark dark:text-white">
                  有効期限（メイン契約終了日）
                </label>
                <input
                  type="date"
                  value={extraSitesValidUntil}
                  onChange={(e) => setExtraSitesValidUntil(e.target.value)}
                  disabled={selectedPlan === 'free' || extraSitesCount <= 0}
                  className="w-full rounded-lg border border-stroke bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none disabled:opacity-50 dark:border-dark-3 dark:bg-dark dark:text-white"
                />
                <p className="mt-1 text-xs text-body-color dark:text-dark-6">
                  空欄の場合は無期限
                </p>
              </div>
            </div>
            {isDowngradeToFree && currentExtraSitesCount > 0 && (
              <p className="mt-3 rounded bg-orange-50 p-2 text-xs text-orange-700 dark:bg-orange-900/20 dark:text-orange-300">
                free に戻すため、追加サイトオプション {currentExtraSitesCount} サイトもクリアされます
              </p>
            )}
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
        <Button variant="ghost" onClick={onClose}>
          キャンセル
        </Button>
        <Button variant="primary" type="submit" form="plan-change-form" disabled={selectedPlan === currentPlan}>
          確認画面へ
        </Button>
      </DialogActions>
    </Dialog>
  );
}
