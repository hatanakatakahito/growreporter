import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { X, Sparkles, Check, Send } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { PLANS, PLAN_TYPES, getPlanBadgeColor, isUnlimited } from '../../constants/plans';
import toast from 'react-hot-toast';

/**
 * プランアップグレードモーダル（3ステップ）
 * 1. プラン比較表
 * 2. お問い合わせフォーム
 * 3. サンクス画面
 * @param {boolean} props.isOpen
 * @param {function} props.onClose
 */
export default function UpgradeModal({ isOpen, onClose, initialStep = 'compare' }) {
  const navigate = useNavigate();
  const { userProfile, currentUser } = useAuth();
  const [step, setStep] = useState(initialStep); // 'compare' | 'form'
  const [selectedPlan, setSelectedPlan] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [userName, setUserName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [formInitialized, setFormInitialized] = useState(false);

  if (!isOpen) return null;

  const standardPlan = PLANS[PLAN_TYPES.STANDARD];
  const premiumPlan = PLANS[PLAN_TYPES.PREMIUM];

  const fmt = (v) => (isUnlimited(v) ? '無制限' : `${v}回`);

  const features = [
    { label: '登録サイト数', getValue: (p) => `${p.features.maxSites}サイト` },
    { label: 'メンバー数', getValue: (p) => `${p.features.maxMembers}人` },
    { label: 'AI分析（再分析）', getValue: () => '可能' },
    { label: 'AI改善案 / 月', getValue: (p) => fmt(p.features.aiImprovementMonthly) },
    { label: 'エクスポート / 月', getValue: (p) => fmt(p.features.excelExportMonthly) },
    { label: 'サポート', getValue: (p) => p.features.support },
  ];

  // フォーム初期値をプロフィールから設定
  const initFormFields = () => {
    if (!formInitialized && userProfile) {
      const name = (userProfile.lastName && userProfile.firstName)
        ? `${userProfile.lastName} ${userProfile.firstName}`
        : (userProfile.displayName || '');
      setCompanyName(userProfile.company || '');
      setUserName(name);
      setEmail(currentUser?.email || userProfile.email || '');
      setFormInitialized(true);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPlan) {
      toast.error('希望プランを選択してください');
      return;
    }
    setIsSending(true);
    try {
      await addDoc(collection(db, 'upgradeInquiries'), {
        uid: currentUser?.uid || null,
        selectedPlan,
        companyName: companyName.trim(),
        userName: userName.trim(),
        email: email.trim() || currentUser?.email || '',
        message: message.trim(),
        status: 'new',
        createdAt: serverTimestamp(),
      });
      handleClose();
      navigate('/thanks');
    } catch (err) {
      console.error('[UpgradeModal] 送信エラー:', err);
      toast.error('送信に失敗しました。しばらくしてから再度お試しください。');
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    setStep(initialStep);
    setSelectedPlan('');
    setCompanyName('');
    setUserName('');
    setEmail('');
    setMessage('');
    setFormInitialized(false);
    onClose();
  };

  // initialStep が 'form' の場合、開いた時点でフォーム初期値をセット
  if (isOpen && initialStep === 'form' && !formInitialized) {
    initFormFields();
  }

  // ── モーダル内容 ──
  let content;

  if (step === 'form') {
    // ── ステップ2: お問い合わせフォーム ──
    content = (
      <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 p-4">
        <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-lg bg-white dark:bg-dark-2">
          <div className="flex-shrink-0 border-b border-stroke bg-gradient-to-r from-blue-500 to-pink-500 px-6 py-4 dark:border-dark-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-white">プランアップグレードのお問い合わせ</h3>
              <button onClick={handleClose} className="rounded-lg p-2 text-white hover:bg-white/20">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-1 flex-col min-h-0">
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {/* 希望プラン */}
              <div>
                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                  希望プラン <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[standardPlan, premiumPlan].map((plan) => (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => setSelectedPlan(plan.id)}
                      className={`rounded-lg border-2 p-3 text-center transition ${
                        selectedPlan === plan.id
                          ? 'border-primary bg-blue-50 dark:bg-blue-900/20'
                          : 'border-stroke hover:border-primary/50 dark:border-dark-3'
                      }`}
                    >
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${getPlanBadgeColor(plan.id)}`}
                      >
                        {plan.displayName}
                      </span>
                      <p className="mt-1.5 text-sm font-bold text-dark dark:text-white">
                        ¥{plan.price.toLocaleString()}<span className="text-xs font-normal text-body-color"> / 月</span>
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* 組織名 */}
              <div>
                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">組織名</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-sm text-dark outline-none focus:border-primary dark:border-dark-3 dark:text-white"
                  placeholder="株式会社○○"
                />
              </div>

              {/* 氏名 */}
              <div>
                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">氏名</label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-sm text-dark outline-none focus:border-primary dark:border-dark-3 dark:text-white"
                  placeholder="山田 太郎"
                />
              </div>

              {/* メールアドレス */}
              <div>
                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">メールアドレス</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-sm text-dark outline-none focus:border-primary dark:border-dark-3 dark:text-white"
                  placeholder="example@example.com"
                />
              </div>

              {/* メッセージ */}
              <div>
                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                  メッセージ（任意）
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-dark outline-none focus:border-primary dark:border-dark-3 dark:text-white"
                  placeholder="ご質問やご要望があればご記入ください"
                />
              </div>
            </div>

            <div className="flex-shrink-0 flex items-center justify-center border-t border-stroke px-6 py-5 dark:border-dark-3">
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-10 py-3 text-base font-medium text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isSending || !selectedPlan}
              >
                <Send className="h-5 w-5" />
                {isSending ? '送信中...' : '送信'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  } else {
    // ── ステップ1: プラン比較表 ──
    content = (
      <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 p-4">
        <div className="relative w-full max-w-2xl overflow-hidden rounded-lg bg-white shadow-2xl dark:bg-dark-2">
          {/* ヘッダー */}
          <div className="relative border-b border-stroke bg-gradient-to-r from-blue-500 to-pink-500 p-6 dark:border-dark-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  より高度な分析でサイトを成長させましょう
                </h2>
                <p className="mt-1 text-sm text-white/80">
                  再分析機能は有料プランでご利用いただけます
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="absolute right-4 top-4 rounded-lg p-2 text-white hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* プラン比較 */}
          <div className="p-6">
            <div className="grid grid-cols-2 gap-4">
              {[standardPlan, premiumPlan].map((plan) => (
                <div
                  key={plan.id}
                  className={`rounded-lg border-2 p-5 ${
                    plan.popular
                      ? 'border-primary bg-blue-50/50 dark:bg-blue-900/10'
                      : 'border-stroke dark:border-dark-3'
                  }`}
                >
                  {/* プランバッジ */}
                  <div className="mb-3 text-center">
                    <span
                      className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${getPlanBadgeColor(plan.id)}`}
                    >
                      {plan.displayName}
                    </span>
                    {plan.popular && (
                      <span className="ml-2 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                        おすすめ
                      </span>
                    )}
                  </div>

                  {/* 価格 */}
                  <div className="mb-4 text-center">
                    <span className="text-2xl font-bold text-dark dark:text-white">
                      ¥{plan.price.toLocaleString()}
                    </span>
                    <span className="text-sm text-body-color"> / 月（税別）</span>
                  </div>

                  {/* 機能一覧 */}
                  <ul className="space-y-2.5">
                    {features.map((feature) => (
                      <li key={feature.label} className="flex items-start gap-2 text-sm">
                        <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
                        <span className="text-dark dark:text-white">
                          <span className="text-body-color dark:text-dark-6">{feature.label}: </span>
                          {feature.getValue(plan)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* フッター */}
          <div className="flex items-center justify-center border-t border-stroke p-6 dark:border-dark-3">
            <button
              onClick={() => { initFormFields(); setStep('form'); }}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-8 py-3 text-sm font-medium text-white transition hover:bg-primary/90"
            >
              お問い合わせ
            </button>
          </div>
        </div>
      </div>
    );
  }

  return createPortal(content, document.body);
}
