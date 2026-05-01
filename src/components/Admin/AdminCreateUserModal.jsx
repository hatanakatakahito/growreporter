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
 * 通常のユーザー登録（Register.jsx）/ プロフィール編集（ProfileEdit.jsx）と
 * 同等のフィールド構成（lastName/firstName 分割、部署、住所等）。
 */
export default function AdminCreateUserModal({ onClose, onSuccess, onProceedToSiteRegistration }) {
  const [formData, setFormData] = useState({
    company: '',
    department: '',
    lastName: '',
    firstName: '',
    email: '',
    phoneNumber: '',
    zipCode: '',
    prefecture: '',
    city: '',
    building: '',
    plan: 'free',
    password: '',
    sendWelcomeEmail: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [createdUser, setCreatedUser] = useState(null);
  const [isZipLoading, setIsZipLoading] = useState(false);

  const plans = ['free', 'business'];

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // 郵便番号 → 住所自動補完（Register.jsx と同じロジック）
  const handleZipChange = async (value) => {
    const digits = value.replace(/[^0-9]/g, '').slice(0, 7);
    handleChange('zipCode', digits);
    if (digits.length === 7) {
      setIsZipLoading(true);
      try {
        const res = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${digits}`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === 200 && data.results?.length > 0) {
            const r = data.results[0];
            setFormData(prev => ({
              ...prev,
              prefecture: r.address1,
              city: `${r.address2}${r.address3}`,
            }));
          }
        }
      } catch { /* ignore */ }
      finally { setIsZipLoading(false); }
    }
  };

  // バリデーション（必須: 組織名・姓・名・メール・電話）
  const isValid = formData.company
    && formData.lastName
    && formData.firstName
    && formData.email
    && formData.phoneNumber
    && (!formData.password || formData.password.length >= 6);

  const displayName = `${formData.lastName} ${formData.firstName}`.trim();

  // ユーザー作成実行
  const handleCreate = async () => {
    setLoading(true);
    setError(null);

    try {
      const adminCreateUser = httpsCallable(functions, 'adminCreateUser');
      // backend が受け付けるフィールドを送信（追加フィールドは backend で users 作成時に保存）
      const result = await adminCreateUser({
        ...formData,
        // 後方互換: name は lastName + firstName から組み立て
        name: displayName,
      });

      if (result.data.success) {
        setCreatedUser({
          uid: result.data.uid,
          name: displayName,
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

  const inputClass = 'w-full rounded-lg border border-stroke bg-white px-4 py-2.5 text-sm focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark dark:text-white';
  const labelClass = 'mb-1.5 block text-sm font-medium text-dark dark:text-white';
  const required = <span className="text-red-500">*</span>;

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
          <Button variant="ghost" onClick={onClose}>
            閉じる
          </Button>
          {onProceedToSiteRegistration && (
            <Button
              variant="primary"
              onClick={() => {
                onProceedToSiteRegistration({
                  uid: createdUser.uid,
                  name: createdUser.name,
                });
                onClose();
              }}
            >
              <Globe data-slot="icon" />
              続けてサイトを登録する
            </Button>
          )}
        </DialogActions>
      </Dialog>
    );
  }

  // 確認ダイアログ
  if (showConfirm) {
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
              <p className="text-xs text-body-color dark:text-dark-6">組織名 / 部署</p>
              <p className="text-sm font-medium text-dark dark:text-white">
                {formData.company}
                {formData.department && `（${formData.department}）`}
              </p>
            </div>
            {(formData.zipCode || formData.prefecture || formData.city) && (
              <div>
                <p className="text-xs text-body-color dark:text-dark-6">住所</p>
                <p className="text-sm text-dark dark:text-white">
                  {formData.zipCode && `〒${formData.zipCode} `}
                  {formData.prefecture}{formData.city}{formData.building && ` ${formData.building}`}
                </p>
              </div>
            )}
            <div>
              <p className="text-xs text-body-color dark:text-dark-6">プラン</p>
              <span className={`inline-block rounded-full px-2 py-1 text-xs font-semibold text-white ${getPlanBadgeColor(formData.plan)}`}>
                {getPlanDisplayName(formData.plan)}
              </span>
            </div>
            <div>
              <p className="text-xs text-body-color dark:text-dark-6">パスワード</p>
              <p className="text-sm text-dark dark:text-white">
                {formData.password ? '設定済み' : '未設定（パスワード設定メールで顧客が後で設定）'}
              </p>
            </div>
            <div>
              <p className="text-xs text-body-color dark:text-dark-6">ウェルカムメール</p>
              <p className="text-sm text-dark dark:text-white">
                {formData.sendWelcomeEmail ? '送信する' : '送信しない（サイレント作成）'}
              </p>
              {!formData.sendWelcomeEmail && (
                <p className="mt-1 text-xs text-orange-600 dark:text-orange-400">
                  ※ 後で /admin/users/{'{uid}'} の「アカウント情報メール」セクションから手動送信できます
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
          <Button variant="ghost" onClick={() => { setShowConfirm(false); setError(null); }} disabled={loading}>
            戻る
          </Button>
          <Button variant="primary" onClick={handleCreate} disabled={loading}>
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
      <DialogDescription>新しいユーザーアカウントを作成します（通常の signup と同じ項目）</DialogDescription>

      <form id="create-user-form" onSubmit={handleSubmit}>
        <DialogBody className="!overflow-y-auto" style={{ maxHeight: 'calc(80vh - 140px)' }}>
          {/* 組織情報 */}
          <div className="mb-5">
            <label className={labelClass}>組織名 {required}</label>
            <input
              type="text"
              value={formData.company}
              onChange={(e) => handleChange('company', e.target.value)}
              placeholder="株式会社○○"
              required
              className={inputClass}
            />
          </div>

          <div className="mb-5">
            <label className={labelClass}>部署名</label>
            <input
              type="text"
              value={formData.department}
              onChange={(e) => handleChange('department', e.target.value)}
              placeholder="例: マーケティング部"
              className={inputClass}
            />
          </div>

          {/* 姓・名 */}
          <div className="mb-5 grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>姓 {required}</label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => handleChange('lastName', e.target.value)}
                placeholder="山田"
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>名 {required}</label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => handleChange('firstName', e.target.value)}
                placeholder="太郎"
                required
                className={inputClass}
              />
            </div>
          </div>

          {/* メールアドレス */}
          <div className="mb-5">
            <label className={labelClass}>メールアドレス {required}</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="example@company.com"
              required
              className={inputClass}
            />
          </div>

          {/* 電話番号 */}
          <div className="mb-5">
            <label className={labelClass}>電話番号 {required}</label>
            <input
              type="tel"
              value={formData.phoneNumber}
              onChange={(e) => {
                const cleaned = e.target.value
                  .replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
                  .replace(/[-\s()ー−‐―]/g, '')
                  .replace(/[^0-9]/g, '');
                handleChange('phoneNumber', cleaned);
              }}
              placeholder="09012345678（ハイフンなし）"
              required
              className={inputClass}
            />
            <p className="mt-1 text-xs text-body-color">※ハイフンは自動で削除されます</p>
          </div>

          {/* 住所 */}
          <div className="mb-5 border-t border-stroke pt-5 dark:border-dark-3">
            <h4 className="mb-3 text-sm font-semibold text-dark dark:text-white">住所（任意）</h4>
            <div className="space-y-3">
              <div>
                <label className={labelClass}>郵便番号</label>
                <div className="relative max-w-[240px]">
                  <input
                    type="text"
                    value={formData.zipCode}
                    onChange={(e) => handleZipChange(e.target.value)}
                    maxLength={7}
                    inputMode="numeric"
                    placeholder="1234567（ハイフンなし）"
                    className={inputClass}
                  />
                  {isZipLoading && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>都道府県</label>
                  <input
                    type="text"
                    value={formData.prefecture}
                    onChange={(e) => handleChange('prefecture', e.target.value)}
                    placeholder="東京都"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>市区町村・番地</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => handleChange('city', e.target.value)}
                    placeholder="千代田区〇〇1-2-3"
                    className={inputClass}
                  />
                </div>
              </div>
              <div>
                <label className={labelClass}>建物名・部屋番号</label>
                <input
                  type="text"
                  value={formData.building}
                  onChange={(e) => handleChange('building', e.target.value)}
                  placeholder="〇〇ビル 3F"
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {/* パスワード */}
          <div className="mb-5 border-t border-stroke pt-5 dark:border-dark-3">
            <label className={labelClass}>パスワード（任意）</label>
            <input
              type="text"
              value={formData.password}
              onChange={(e) => handleChange('password', e.target.value)}
              placeholder="未入力の場合、後で「アカウント情報メール」から顧客に設定リンクを送信"
              className={inputClass}
            />
            {formData.password && formData.password.length < 6 && (
              <p className="mt-1 text-xs text-red-500">パスワードは 6 文字以上で入力してください</p>
            )}
            <p className="mt-1 text-xs text-body-color">
              ※ 推奨: 空欄のまま作成 → /admin/users/{'{uid}'} の「アカウント情報メール」から顧客に通知
            </p>
          </div>

          {/* プラン選択 */}
          <div className="mb-5 border-t border-stroke pt-5 dark:border-dark-3">
            <label className="mb-3 block text-sm font-medium text-dark dark:text-white">
              プラン
            </label>
            <div className="grid gap-4 md:grid-cols-2">
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
                      {planInfo.price === 0 ? '¥0' : `¥${planInfo.price.toLocaleString()}`}
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
          <div className="mb-2 border-t border-stroke pt-5 dark:border-dark-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.sendWelcomeEmail}
                onChange={(e) => handleChange('sendWelcomeEmail', e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <div>
                <span className="text-sm font-medium text-dark dark:text-white">作成と同時にウェルカムメールを送信する</span>
                <p className="mt-0.5 text-xs text-body-color">
                  チェックなし（推奨）: サイレント作成。後でサイト登録など準備完了後に「アカウント情報メール」から手動送信
                </p>
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
        <Button variant="ghost" onClick={onClose}>
          キャンセル
        </Button>
        <Button variant="primary" type="submit" form="create-user-form" disabled={!isValid}>
          確認画面へ
        </Button>
      </DialogActions>
    </Dialog>
  );
}
