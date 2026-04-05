import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Check, X, Send } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { PLANS, PLAN_TYPES, getPlanBadgeColor, isUnlimited } from '../../constants/plans';
import toast from 'react-hot-toast';
import { Dialog, DialogBody, DialogActions } from '../ui/dialog';
import { Button } from '../ui/button';

const freePlan = PLANS[PLAN_TYPES.FREE];
const businessPlan = PLANS[PLAN_TYPES.BUSINESS];

const fmt = (v) => {
  if (v === 0) return '不可';
  return isUnlimited(v) ? '無制限' : `${v}回`;
};

const features = [
  { label: '登録サイト数', getValue: (p) => `${p.features.maxSites}サイト` },
  { label: 'メンバー招待', getValue: (p) => isUnlimited(p.features.maxMembers) ? '無制限' : `${p.features.maxMembers}人` },
  { label: 'AI分析サマリー', getValue: (p) => fmt(p.features.aiSummaryMonthly) },
  { label: 'AI改善提案', getValue: (p) => fmt(p.features.aiImprovementMonthly) },
  { label: 'AIチャット', getValue: (p) => fmt(p.features.aiChatMonthly) },
  { label: '改善タスク管理', getValue: (p) => p.features.improvementTask ? '可能' : '不可' },
  { label: '効果測定', getValue: (p) => p.features.reportEvaluation ? '可能' : '不可' },
  { label: 'Excel/PPTXエクスポート', getValue: (p) => fmt(p.features.excelExportMonthly) },
  { label: 'アラート通知（AI分析付き）', getValue: (p) => p.features.aiSummaryMonthly > 0 ? '可能' : '数値のみ' },
  { label: 'サポート', getValue: (p) => p.features.support || 'なし' },
];

export default function UpgradeModal({ isOpen, onClose, initialStep = 'compare' }) {
  const navigate = useNavigate();
  const { userProfile, currentUser } = useAuth();
  const [step, setStep] = useState(initialStep);
  const [companyName, setCompanyName] = useState('');
  const [userName, setUserName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [formInitialized, setFormInitialized] = useState(false);

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
    setIsSending(true);
    try {
      await addDoc(collection(db, 'upgradeInquiries'), {
        uid: currentUser?.uid || null,
        selectedPlan: 'business',
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
    setCompanyName('');
    setUserName('');
    setEmail('');
    setMessage('');
    setFormInitialized(false);
    onClose();
  };

  if (isOpen && initialStep === 'form' && !formInitialized) {
    initFormFields();
  }

  // ── ステップ2: お問い合わせフォーム ──
  if (step === 'form') {
    return (
      <Dialog open={isOpen} onClose={handleClose} size="lg">
        <div className="-mx-(--gutter) -mt-(--gutter) border-b border-stroke bg-gradient-to-r from-blue-500 to-pink-500 px-6 py-4 dark:border-dark-3 rounded-t-2xl">
          <h3 className="text-xl font-semibold text-white">ビジネスプランのお問い合わせ</h3>
          <p className="mt-1 text-sm text-white/80">担当者より折り返しご連絡いたします</p>
        </div>

        <form id="upgrade-form" onSubmit={handleSubmit}>
          <DialogBody>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-dark dark:text-white">組織名</label>
                <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 text-sm text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:text-white" placeholder="株式会社〇〇" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-dark dark:text-white">お名前 <span className="text-red-500">*</span></label>
                <input type="text" value={userName} onChange={(e) => setUserName(e.target.value)} required
                  className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 text-sm text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:text-white" placeholder="山田 太郎" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-dark dark:text-white">メールアドレス <span className="text-red-500">*</span></label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                  className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 text-sm text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:text-white" placeholder="example@company.com" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-dark dark:text-white">ご質問・ご要望</label>
                <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3}
                  className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 text-sm text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:text-white" placeholder="ご不明点があればお気軽にお書きください" />
              </div>
            </div>
          </DialogBody>
          <DialogActions>
            <Button plain onClick={handleClose}>キャンセル</Button>
            <Button type="submit" form="upgrade-form" color="blue" disabled={isSending}>
              <Send className="h-4 w-4" />
              {isSending ? '送信中...' : '送信する'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    );
  }

  // ── ステップ1: プラン比較表 ──
  return (
    <Dialog open={isOpen} onClose={handleClose} size="2xl">
      <div className="-mx-(--gutter) -mt-(--gutter) border-b border-stroke bg-gradient-to-r from-blue-500 to-pink-500 p-6 dark:border-dark-3 rounded-t-2xl">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">
              AIの力でサイト改善を加速しましょう
            </h2>
            <p className="mt-1 text-sm text-white/80">
              ビジネスプランで全機能をフル活用
            </p>
          </div>
        </div>
      </div>

      <DialogBody>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* 無料プラン */}
          <div className="rounded-lg border-2 border-stroke p-5 dark:border-dark-3">
            <div className="mb-3 text-center">
              <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${getPlanBadgeColor('free')}`}>
                {freePlan.displayName}
              </span>
              <span className="ml-2 inline-block rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-body-color dark:bg-dark-3">
                現在のプラン
              </span>
            </div>
            <div className="mb-4 text-center">
              <span className="text-2xl font-bold text-dark dark:text-white">¥0</span>
              <span className="text-sm text-body-color"> / 月</span>
            </div>
            <ul className="space-y-2.5">
              {features.map((feature) => {
                const val = feature.getValue(freePlan);
                const disabled = val === '不可' || val === 'なし' || val === '数値のみ';
                return (
                  <li key={feature.label} className={`flex items-start gap-2 text-sm ${disabled ? 'opacity-40' : ''}`}>
                    {disabled
                      ? <X className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
                      : <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
                    }
                    <span className="text-dark dark:text-white">
                      <span className="text-body-color dark:text-dark-6">{feature.label}: </span>
                      {val}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* ビジネスプラン */}
          <div className="rounded-lg border-2 border-primary bg-blue-50/50 p-5 dark:bg-pink-900/10">
            <div className="mb-3 text-center">
              <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${getPlanBadgeColor('business')}`}>
                {businessPlan.displayName}
              </span>
              <span className="ml-2 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                おすすめ
              </span>
            </div>
            <div className="mb-4 text-center">
              <span className="text-2xl font-bold text-dark dark:text-white">
                ¥{businessPlan.price.toLocaleString()}
              </span>
              <span className="text-sm text-body-color"> / 月（税別）</span>
            </div>
            <ul className="space-y-2.5">
              {features.map((feature) => (
                <li key={feature.label} className="flex items-start gap-2 text-sm">
                  <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
                  <span className="text-dark dark:text-white">
                    <span className="text-body-color dark:text-dark-6">{feature.label}: </span>
                    {feature.getValue(businessPlan)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </DialogBody>

      <DialogActions className="!justify-center !pb-6">
        <button
          onClick={() => { initFormFields(); setStep('form'); }}
          className="rounded-lg bg-gradient-to-r from-blue-500 to-pink-500 px-10 py-3.5 text-base font-semibold text-white shadow-md transition hover:shadow-lg"
        >
          ビジネスプランのお問い合わせ
        </button>
      </DialogActions>
    </Dialog>
  );
}
