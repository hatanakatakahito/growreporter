import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Check, X, Send } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { PLANS, PLAN_TYPES, getPlanBadgeColor, isUnlimited } from '../../constants/plans';
import toast from 'react-hot-toast';
import { Dialog, DialogBody, DialogActions } from '../ui/dialog';
import BusinessPlanFormFields, { BUSINESS_FORM_INITIAL } from './BusinessPlanFormFields';

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

const inputClass = 'w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 text-sm text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:text-white';
const labelClass = 'mb-1.5 block text-sm font-medium text-dark dark:text-white';
const requiredMark = <span className="text-red-500">*</span>;

const INITIAL_FORM = {
  companyName: '',
  phone: '',
  email: '',
  ...BUSINESS_FORM_INITIAL,
};

export default function UpgradeModal({ isOpen, onClose, initialStep = 'compare' }) {
  const navigate = useNavigate();
  const { userProfile, currentUser } = useAuth();
  const [step, setStep] = useState(initialStep);
  const [form, setForm] = useState(INITIAL_FORM);
  const [isSending, setIsSending] = useState(false);
  const [formInitialized, setFormInitialized] = useState(false);

  const updateField = useCallback((field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  }, []);

  const initFormFields = () => {
    if (!formInitialized && userProfile) {
      setForm({
        ...INITIAL_FORM,
        companyName: userProfile.company || '',
        lastName: userProfile.lastName || '',
        firstName: userProfile.firstName || '',
        email: currentUser?.email || userProfile.email || '',
      });
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
        companyName: form.companyName.trim(),
        department: form.department.trim(),
        lastName: form.lastName.trim(),
        firstName: form.firstName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || currentUser?.email || '',
        zipCode: form.zipCode.trim(),
        prefecture: form.prefecture.trim(),
        city: form.city.trim(),
        building: form.building.trim(),
        paymentTiming: form.paymentTiming,
        startDatePref: form.startDatePref,
        startMonth: form.startDatePref === 'preferred' && form.startMonth
          ? form.startMonth
          : null,
        message: form.message.trim(),
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
    setForm(INITIAL_FORM);
    setFormInitialized(false);
    onClose();
  };

  if (isOpen && initialStep === 'form' && !formInitialized) {
    initFormFields();
  }

  // ── ステップ2: お問い合わせフォーム ──
  if (step === 'form') {
    return (
      <Dialog open={isOpen} onClose={handleClose} size="2xl">
        <div className="-mx-(--gutter) -mt-(--gutter) border-b border-stroke bg-gradient-to-r from-blue-500 to-pink-500 px-6 py-4 dark:border-dark-3 rounded-t-2xl shrink-0">
          <h3 className="text-xl font-semibold text-white">ビジネスプランのお問い合わせ</h3>
          <p className="mt-1 text-sm text-white/80">以下の情報をご入力ください。担当者より折り返しご連絡いたします。</p>
        </div>

        <form id="upgrade-form" onSubmit={handleSubmit}>
          <DialogBody className="!overflow-y-auto scrollbar-hide" style={{ maxHeight: 'calc(90vh - 120px)' }}>
            <div className="space-y-5">
              {/* 組織情報 */}
              <div className="space-y-3">
                <div>
                  <label className={labelClass}>組織名 {requiredMark}</label>
                  <input type="text" value={form.companyName} onChange={(e) => updateField('companyName', e.target.value)} required
                    className={inputClass} placeholder="株式会社〇〇" />
                </div>
              </div>

              {/* 担当者情報〜住所〜契約条件〜質問（共用コンポーネント） */}
              <BusinessPlanFormFields
                form={form}
                updateField={updateField}
                setForm={setForm}
                inputClass={inputClass}
                labelClass={labelClass}
                showNameFields={true}
                showPhoneField={true}
                showEmailField={true}
                radioNamePrefix="upgrade_"
              />
              {/* 送信ボタン */}
              <div className="flex justify-center">
                <button
                  type="submit"
                  disabled={isSending}
                  className="flex items-center gap-2 rounded-lg bg-primary px-10 py-3.5 text-base font-semibold text-white shadow-md transition hover:bg-opacity-90 disabled:opacity-50"
                >
                  <Send className="h-5 w-5" />
                  {isSending ? '送信中...' : '送信する'}
                </button>
              </div>
            </div>
          </DialogBody>
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
