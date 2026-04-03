import { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../config/firebase';
import { getPlanDisplayName, getPlanInfo, getPlanBadgeColor, isUnlimited } from '../../constants/plans';
import { AlertCircle, CheckCircle, Globe } from 'lucide-react';
import { Dialog, DialogTitle, DialogDescription, DialogBody, DialogActions } from '../ui/dialog';
import { Button } from '../ui/button';
import DotWaveSpinner from '../common/DotWaveSpinner';

/**
 * 管理者ユーザー作成モーダル
 */
export default function AdminCreateUserModal({ onClose, onSuccess, onProceedToSiteRegistration }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    phoneNumber: '',
    plan: 'free',
    password: '',
    sendWelcomeEmail: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [createdUser, setCreatedUser] = useState(null);

  const plans = ['free', 'business'];

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // バリデーション
  const isValid = formData.name && formData.email && formData.company && formData.phoneNumber
    && (!formData.password || formData.password.length >= 6);

  // ユーザー作成実行
  const handleCreate = async () => {
    setLoading(true);
    setError(null);

    try {
      const adminCreateUser = httpsCallable(functions, 'adminCreateUser');
      const result = await adminCreateUser(formData);

      if (result.data.success) {
        setCreatedUser({
          uid: result.data.uid,
          name: formData.name,
          message: result.data.message,
        });
        onSuccess(result.data.message);
      } else {
        throw new Error('ユーザー作成に失敗しました');
      }
    } catch (err) {
      console.error('ユーザー作成エラー:', err);
      setError(err.message || 'ユーザー作成に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setShowConfirm(true);
  };

  // 作成完了画面
  if (createdUser) {
    return (
      <Dialog open={true} onClose={onClose} size="md">
        <DialogBody>
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <h3 className="text-lg font-semibold text-dark dark:text-white">
              ユーザー作成完了
            </h3>
            <p className="mt-2 text-sm text-body-color dark:text-dark-6">
              {createdUser.message}
            </p>
          </div>
        </DialogBody>

        <DialogActions>
          <Button plain onClick={onClose}>
            閉じる
          </Button>
          {onProceedToSiteRegistration && (
            <Button
              color="blue"
              onClick={() => {
                onProceedToSiteRegistration({
                  uid: createdUser.uid,
                  name: createdUser.name,
                });
                onClose();
              }}
            >
              <Globe className="h-4 w-4" />
              続けてサイトを登録する
            </Button>
          )}
        </DialogActions>
      </Dialog>
    );
  }

  // 確認ダイアログ
  if (showConfirm) {
    const displayName = formData.name;
    return (
      <Dialog open={true} onClose={() => { setShowConfirm(false); setError(null); }} size="md">
        <DialogBody>
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <AlertCircle className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-dark dark:text-white">
                ユーザー作成の確認
              </h3>
              <p className="text-sm text-body-color dark:text-dark-6">
                以下の内容でユーザーを作成します
              </p>
            </div>
          </div>

          <div className="mb-6 space-y-3 rounded-lg bg-gray-50 p-4 dark:bg-dark-3">
            <div>
              <p className="text-xs text-body-color dark:text-dark-6">氏名</p>
              <p className="text-sm font-medium text-dark dark:text-white">{displayName}</p>
            </div>
            <div>
              <p className="text-xs text-body-color dark:text-dark-6">メールアドレス</p>
              <p className="text-sm font-medium text-dark dark:text-white">{formData.email}</p>
            </div>
            <div>
              <p className="text-xs text-body-color dark:text-dark-6">組織名</p>
              <p className="text-sm font-medium text-dark dark:text-white">{formData.company}</p>
            </div>
            <div>
              <p className="text-xs text-body-color dark:text-dark-6">プラン</p>
              <span className={`inline-block rounded-full px-2 py-1 text-xs font-semibold text-white ${getPlanBadgeColor(formData.plan)}`}>
                {getPlanDisplayName(formData.plan)}
              </span>
            </div>
            <div>
              <p className="text-xs text-body-color dark:text-dark-6">パスワード</p>
              <p className="text-sm text-dark dark:text-white">
                {formData.password ? '設定済み' : '未設定（パスワード設定メールを送信）'}
              </p>
            </div>
            <div>
              <p className="text-xs text-body-color dark:text-dark-6">メール通知</p>
              <p className="text-sm text-dark dark:text-white">
                ウェルカムメール: {formData.sendWelcomeEmail ? '送信する' : '送信しない'}
              </p>
              {!formData.password && (
                <p className="text-xs text-body-color dark:text-dark-6 mt-1">
                  ※パスワード設定メールも送信されます
                </p>
              )}
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20">
              {error}
            </div>
          )}
        </DialogBody>

        <DialogActions>
          <Button plain onClick={() => { setShowConfirm(false); setError(null); }} disabled={loading}>
            戻る
          </Button>
          <Button color="blue" onClick={handleCreate} disabled={loading}>
            {loading ? (
              <>
                <DotWaveSpinner size="xs" variant="white" />
                作成中...
              </>
            ) : (
              'ユーザーを作成'
            )}
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  // 入力フォーム
  return (
    <Dialog open={true} onClose={onClose} size="2xl">
      <DialogTitle>ユーザー作成</DialogTitle>
      <DialogDescription>新しいユーザーアカウントを作成します</DialogDescription>

      <form id="create-user-form" onSubmit={handleSubmit}>
        <DialogBody>
          {/* 組織名 */}
          <div className="mb-5">
            <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
              組織名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.company}
              onChange={(e) => handleChange('company', e.target.value)}
              placeholder="株式会社○○"
              className="w-full rounded-lg border border-stroke bg-white px-4 py-3 text-sm focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark dark:text-white"
            />
          </div>

          {/* 氏名 */}
          <div className="mb-5">
            <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
              氏名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="例: 山田 太郎"
              className="w-full rounded-lg border border-stroke bg-white px-4 py-3 text-sm focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark dark:text-white"
            />
          </div>

          {/* メールアドレス */}
          <div className="mb-5">
            <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
              メールアドレス <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="example@company.com"
              className="w-full rounded-lg border border-stroke bg-white px-4 py-3 text-sm focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark dark:text-white"
            />
          </div>

          {/* 電話番号 */}
          <div className="mb-5">
            <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
              電話番号 <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={formData.phoneNumber}
              onChange={(e) => handleChange('phoneNumber', e.target.value)}
              placeholder="03-1234-5678"
              className="w-full rounded-lg border border-stroke bg-white px-4 py-3 text-sm focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark dark:text-white"
            />
          </div>

          {/* パスワード */}
          <div className="mb-5">
            <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
              パスワード
            </label>
            <input
              type="text"
              value={formData.password}
              onChange={(e) => handleChange('password', e.target.value)}
              placeholder="未入力の場合、パスワード設定メールが送信されます"
              className="w-full rounded-lg border border-stroke bg-white px-4 py-3 text-sm focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark dark:text-white"
            />
            {formData.password && formData.password.length < 6 && (
              <p className="mt-1 text-xs text-red-500">パスワードは6文字以上で入力してください</p>
            )}
          </div>

          {/* プラン選択 */}
          <div className="mb-5">
            <label className="mb-3 block text-sm font-medium text-dark dark:text-white">
              プラン
            </label>
            <div className="grid gap-4 md:grid-cols-3">
              {plans.map((plan) => {
                const planInfo = getPlanInfo(plan);
                const isSelected = formData.plan === plan;

                return (
                  <button
                    key={plan}
                    type="button"
                    onClick={() => handleChange('plan', plan)}
                    className={`rounded-lg border-2 p-4 text-left transition ${
                      isSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-stroke hover:border-primary/50 dark:border-dark-3'
                    }`}
                  >
                    <div className={`mb-2 inline-block rounded-full px-3 py-1 text-xs font-semibold text-white ${getPlanBadgeColor(plan)}`}>
                      {planInfo.displayName}
                    </div>
                    <p className="mb-2 text-lg font-bold text-dark dark:text-white">
                      {planInfo.price}
                    </p>
                    <ul className="space-y-1 text-xs text-body-color dark:text-dark-6">
                      <li>サイト: {planInfo.features.maxSites}個</li>
                      <li>AI分析: {isUnlimited(planInfo.features.aiSummaryMonthly) ? '無制限' : `${planInfo.features.aiSummaryMonthly}回/月`}</li>
                      <li>AI改善: {isUnlimited(planInfo.features.aiImprovementMonthly) ? '無制限' : `${planInfo.features.aiImprovementMonthly}回/月`}</li>
                    </ul>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ウェルカムメール送信 */}
          <div className="mb-6">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.sendWelcomeEmail}
                onChange={(e) => handleChange('sendWelcomeEmail', e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <div>
                <span className="text-sm font-medium text-dark dark:text-white">ウェルカムメールを送信する</span>
              </div>
            </label>
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
        <Button color="blue" type="submit" form="create-user-form" disabled={!isValid}>
          確認画面へ
        </Button>
      </DialogActions>
    </Dialog>
  );
}
