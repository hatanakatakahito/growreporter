import { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Check, X, Send, Plus } from 'lucide-react';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { PLANS, PLAN_TYPES, getPlanBadgeColor, isUnlimited, EXTRA_SITE_UNIT_PRICE } from '../../constants/plans';
import { usePlan } from '../../hooks/usePlan';
import { monthsUntilContractEnd } from '../../utils/effectiveMaxSites';
import toast from 'react-hot-toast';
import { Dialog, DialogBody, DialogActions } from '../ui/dialog';
import { Button } from '../ui/button';
import BusinessPlanFormFields, { BUSINESS_FORM_INITIAL, EXTRA_SITES_OPTIONS } from './BusinessPlanFormFields';

const freePlan = PLANS[PLAN_TYPES.FREE];
const businessPlan = PLANS[PLAN_TYPES.BUSINESS];

const fmt = (v) => {
  if (v === 0) return '不可';
  return isUnlimited(v) ? '無制限' : `${v}回`;
};

const features = [
  {
    label: '登録サイト数',
    getValue: (p) => {
      const base = `${p.features.maxSites}サイト`;
      if (p.id === PLAN_TYPES.BUSINESS) {
        return `${base}（追加 +¥${EXTRA_SITE_UNIT_PRICE.toLocaleString()}/サイト/月）`;
      }
      return base;
    },
  },
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

/**
 * UpgradeModal
 *
 * mode:
 *   'compare' (default): 既存の Free → Business アップグレード比較表 + 申込フォーム
 *   'addon'            : 既存 Business ユーザーがサイト追加オプションだけを申し込むフォーム
 *                        （オーナー限定で AccountSettings から呼び出す前提）
 */
export default function UpgradeModal({ isOpen, onClose, initialStep = 'compare', mode = 'compare' }) {
  const navigate = useNavigate();
  const { userProfile, currentUser } = useAuth();
  const { extraSitesValidUntil } = usePlan();
  const isAddonMode = mode === 'addon';
  const [step, setStep] = useState(isAddonMode ? 'form' : initialStep);
  const [form, setForm] = useState(INITIAL_FORM);
  const [isSending, setIsSending] = useState(false);
  const [formInitialized, setFormInitialized] = useState(false);

  // addon モードで既存契約データを fallback で取得
  // - users.boardProjectId / users.extraSitesValidUntil がある場合はそれを使う
  // - 既存 Business ユーザー（v5.8.0 以前）はフィールド未設定 → upgradeInquiries の active から補完
  // - 住所等のフォーム prefill 用フィールドも upgradeInquiries 過去レコードから補完
  //   （users ドキュメントに zipCode/building が無いユーザー対策）
  const [fallbackContract, setFallbackContract] = useState({
    boardProjectId: null,
    contractEndDate: null,
    // フォーム prefill 用（住所・連絡先）
    companyName: null,
    department: null,
    lastName: null,
    firstName: null,
    phone: null,
    email: null,
    zipCode: null,
    prefecture: null,
    city: null,
    building: null,
    paymentTiming: null,
  });
  const [isLoadingContract, setIsLoadingContract] = useState(false);

  useEffect(() => {
    if (!isAddonMode || !isOpen || !currentUser?.uid) return;
    let cancelled = false;
    (async () => {
      setIsLoadingContract(true);
      try {
        // uid 単一 equality のみ（auto index で動作）→ in-memory で active かつ
        // boardProjectId 持ちの new_business を優先選択
        const q = query(
          collection(db, 'upgradeInquiries'),
          where('uid', '==', currentUser.uid)
        );
        const snap = await getDocs(q);
        const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        const sortByUpdatedDesc = (a, b) => {
          const aTime = a.statusUpdatedAt?.toMillis?.() || a.createdAt?.toMillis?.() || 0;
          const bTime = b.statusUpdatedAt?.toMillis?.() || b.createdAt?.toMillis?.() || 0;
          return bTime - aTime;
        };
        // 契約情報用: active かつ boardProjectId 持ちの new_business を最優先
        const activeWithProject = docs.filter((d) => d.status === 'active' && d.boardProjectId);
        const newBusinessActive = activeWithProject
          .filter((d) => (d.inquiryType || 'new_business') === 'new_business')
          .sort(sortByUpdatedDesc);
        const contractDoc = newBusinessActive[0] || activeWithProject.sort(sortByUpdatedDesc)[0] || null;

        // フォーム prefill 用: 過去のレコード全部（active 以外も含む）から最新を取得
        // → 住所等は active 化されていなくても使える
        const formSourceDoc = docs.sort(sortByUpdatedDesc)[0] || contractDoc || null;

        if (!cancelled) {
          setFallbackContract({
            boardProjectId: contractDoc?.boardProjectId || null,
            contractEndDate: contractDoc?.contractEndDate || null,
            companyName: formSourceDoc?.companyName || null,
            department: formSourceDoc?.department || null,
            lastName: formSourceDoc?.lastName || null,
            firstName: formSourceDoc?.firstName || null,
            phone: formSourceDoc?.phone || null,
            email: formSourceDoc?.email || null,
            zipCode: formSourceDoc?.zipCode || null,
            prefecture: formSourceDoc?.prefecture || null,
            city: formSourceDoc?.city || null,
            building: formSourceDoc?.building || null,
            paymentTiming: formSourceDoc?.paymentTiming || null,
          });
        }
      } catch (err) {
        console.warn('[UpgradeModal] addon fallback contract lookup failed:', err);
      } finally {
        if (!cancelled) setIsLoadingContract(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isAddonMode, isOpen, currentUser?.uid]);

  // 有効な boardProjectId（users 優先、fallback 後追い）
  const effectiveBoardProjectId = userProfile?.boardProjectId || fallbackContract.boardProjectId || null;

  // 有効な契約終了日（usePlan 優先、fallback 後追い）
  const contractEndDate = useMemo(() => {
    if (extraSitesValidUntil) return extraSitesValidUntil;
    if (fallbackContract.contractEndDate) {
      const d = new Date(fallbackContract.contractEndDate);
      return Number.isNaN(d.getTime()) ? null : d;
    }
    return null;
  }, [extraSitesValidUntil, fallbackContract.contractEndDate]);

  const remainingMonths = useMemo(() => {
    if (!isAddonMode || !contractEndDate) return null;
    return monthsUntilContractEnd(contractEndDate);
  }, [isAddonMode, contractEndDate]);

  const updateField = useCallback((field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  }, []);

  // 各フィールドの prefill: users (優先) → upgradeInquiries fallback → 空文字
  const pickPrefill = useCallback((userField, inquiryField, fallbackEmpty = '') => {
    const u = userField !== undefined && userField !== null ? userField : '';
    const i = inquiryField !== undefined && inquiryField !== null ? inquiryField : '';
    return u || i || fallbackEmpty;
  }, []);

  const initFormFields = useCallback(() => {
    if (!formInitialized && userProfile) {
      const fc = fallbackContract;
      setForm({
        ...INITIAL_FORM,
        companyName: pickPrefill(userProfile.company, fc.companyName),
        lastName: pickPrefill(userProfile.lastName, fc.lastName),
        firstName: pickPrefill(userProfile.firstName, fc.firstName),
        email: currentUser?.email || pickPrefill(userProfile.email, fc.email),
        // 連絡先・住所も常に prefill（users → fallback → 空）
        // compare モードでも既知の値があればプレ入力する
        department: pickPrefill(userProfile.department, fc.department),
        phone: pickPrefill(userProfile.phoneNumber || userProfile.phone, fc.phone),
        zipCode: pickPrefill(userProfile.zipCode, fc.zipCode),
        prefecture: pickPrefill(userProfile.prefecture, fc.prefecture),
        city: pickPrefill(userProfile.city, fc.city),
        building: pickPrefill(userProfile.building, fc.building),
        paymentTiming: pickPrefill(userProfile.paymentTiming, fc.paymentTiming, 'recurring'),
        // addon モード固有のセット
        ...(isAddonMode ? {
          // 開始日は既存契約期間に揃えるので入力不要 → 内部的に none で送信
          startDatePref: 'none',
          extraSitesCount: 1,
        } : {}),
      });
      setFormInitialized(true);
    }
  }, [formInitialized, userProfile, currentUser, isAddonMode, fallbackContract, pickPrefill]);

  // addon モードで fallback ロードが完了したタイミングで再 prefill する
  // （初回 initFormFields 実行時は fallback がまだ空のため、後追いで反映）
  useEffect(() => {
    if (!isAddonMode || !isOpen || !formInitialized) return;
    if (isLoadingContract) return;
    // すでにユーザーが手動で値を入れている可能性があるので、空のフィールドだけ補填
    setForm((prev) => {
      const fc = fallbackContract;
      const filled = (k, candidate) => (prev[k] && String(prev[k]).trim() !== '' ? prev[k] : (candidate || prev[k]));
      return {
        ...prev,
        companyName: filled('companyName', fc.companyName),
        department: filled('department', fc.department),
        lastName: filled('lastName', fc.lastName),
        firstName: filled('firstName', fc.firstName),
        phone: filled('phone', fc.phone),
        email: filled('email', fc.email),
        zipCode: filled('zipCode', fc.zipCode),
        prefecture: filled('prefecture', fc.prefecture),
        city: filled('city', fc.city),
        building: filled('building', fc.building),
        paymentTiming: filled('paymentTiming', fc.paymentTiming),
      };
    });
  }, [isAddonMode, isOpen, formInitialized, isLoadingContract, fallbackContract]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSending(true);
    try {
      const extraSitesCount = Math.max(0, parseInt(form.extraSitesCount, 10) || 0);

      // 課金月数: addon は残月数、new_business は支払いタイミング依存
      const extraSitesMonths = isAddonMode
        ? (remainingMonths || 1)
        : (form.paymentTiming === 'bulk' ? 12 : 1);

      // addon モードのバリデーション
      if (isAddonMode && extraSitesCount <= 0) {
        toast.error('追加するサイト数を1サイト以上で指定してください。');
        setIsSending(false);
        return;
      }
      if (isAddonMode && !effectiveBoardProjectId) {
        toast.error('既存契約の案件IDが見つかりません。担当者にお問合せください。');
        setIsSending(false);
        return;
      }

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
        source: isAddonMode ? 'addon_modal' : 'upgrade_modal',
        createdAt: serverTimestamp(),
        // サイト追加オプション（v5.8.0）
        inquiryType: isAddonMode ? 'addon_only' : 'new_business',
        extraSitesCount,
        extraSitesMonths,
        baseProjectId: isAddonMode ? effectiveBoardProjectId : null,
      });
      handleClose();
      toast.success(
        isAddonMode
          ? '追加サイトオプションのお申し込みを受け付けました。担当者より折り返しご連絡いたします。'
          : 'お申し込みを受け付けました。',
        { duration: 6000 }
      );
      if (!isAddonMode) navigate('/thanks');
    } catch (err) {
      console.error('[UpgradeModal] 送信エラー:', err);
      toast.error('送信に失敗しました。しばらくしてから再度お試しください。');
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    setStep(isAddonMode ? 'form' : initialStep);
    setForm(INITIAL_FORM);
    setFormInitialized(false);
    onClose();
  };

  if (isOpen && (initialStep === 'form' || isAddonMode) && !formInitialized) {
    initFormFields();
  }

  // ── ステップ: addon_only 専用フォーム ──
  if (isAddonMode) {
    const extras = parseInt(form.extraSitesCount, 10) || 0;
    const months = remainingMonths || 1;
    const monthly = EXTRA_SITE_UNIT_PRICE * extras;
    const totalAmount = monthly * months;

    return (
      <Dialog open={isOpen} onClose={handleClose} size="2xl">
        <div className="-mx-(--gutter) -mt-(--gutter) border-b border-stroke bg-gradient-business px-6 py-4 dark:border-dark-3 rounded-t-2xl shrink-0">
          <h3 className="text-xl font-semibold text-white flex items-center gap-2">
            <Plus className="h-5 w-5" />
            サイト追加オプションのお申し込み
          </h3>
          <p className="mt-1 text-sm text-white/80">
            ビジネスプランに追加でサイトを登録できます。1サイト ¥{EXTRA_SITE_UNIT_PRICE.toLocaleString()}/月（税別）
          </p>
        </div>

        <form id="addon-form" onSubmit={handleSubmit}>
          <DialogBody className="!overflow-y-auto scrollbar-hide" style={{ maxHeight: 'calc(90vh - 120px)' }}>
            <div className="space-y-5">
              {/* 現契約サマリー */}
              <div className="rounded-lg border border-primary/30 bg-blue-50/50 p-4 dark:bg-blue-900/10">
                <h4 className="mb-2 text-sm font-semibold text-dark dark:text-white">現在のご契約</h4>
                <dl className="text-xs space-y-1 text-body-color dark:text-dark-6">
                  <div className="flex justify-between"><dt>プラン</dt><dd className="font-medium text-dark dark:text-white">ビジネスプラン</dd></div>
                  {contractEndDate ? (
                    <div className="flex justify-between">
                      <dt>契約終了日</dt>
                      <dd className="font-medium text-dark dark:text-white">
                        {contractEndDate.toLocaleDateString('ja-JP')}
                        （残 {remainingMonths} ヶ月）
                      </dd>
                    </div>
                  ) : isLoadingContract ? (
                    <div className="text-xs text-body-color">契約情報を取得中...</div>
                  ) : (
                    <div className="text-xs text-orange-600">
                      ※ 契約終了日が取得できませんでした。担当者が手動で確認の上、見積書を発行します。
                    </div>
                  )}
                </dl>
              </div>

              {/* 追加サイト数 */}
              <div>
                <label className={labelClass}>追加サイト数 {requiredMark}</label>
                <select
                  value={form.extraSitesCount ?? 1}
                  onChange={(e) => updateField('extraSitesCount', parseInt(e.target.value, 10) || 0)}
                  required
                  className={inputClass}
                >
                  {EXTRA_SITES_OPTIONS.filter((n) => n > 0).map((n) => (
                    <option key={n} value={n}>+{n}サイト</option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-body-color dark:text-dark-6">
                  10サイト以上の場合は備考欄でお知らせください。
                </p>
              </div>

              {/* 金額プレビュー */}
              {extras > 0 && (
                <div className="rounded-lg bg-gray-50 p-4 dark:bg-dark-3">
                  <h4 className="mb-2 text-sm font-semibold text-dark dark:text-white">お見積り</h4>
                  <dl className="text-sm space-y-1 text-body-color dark:text-dark-6">
                    <div className="flex justify-between">
                      <dt>追加サイト × 月額</dt>
                      <dd>¥{EXTRA_SITE_UNIT_PRICE.toLocaleString()} × {extras} = ¥{monthly.toLocaleString()}/月</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt>課金月数（残契約期間）</dt>
                      <dd>{months} ヶ月</dd>
                    </div>
                    <div className="mt-2 flex justify-between border-t border-stroke pt-2 text-base font-semibold text-dark dark:text-white dark:border-dark-3">
                      <dt>合計（税別）</dt>
                      <dd>¥{totalAmount.toLocaleString()}</dd>
                    </div>
                  </dl>
                  <p className="mt-2 text-xs text-body-color dark:text-dark-6">
                    ※ 既存のご契約見積書に明細が追記されます。担当者がメール/連絡の上、改めて見積書を提示します。
                  </p>
                </div>
              )}

              {/* ご質問・備考 */}
              <div>
                <label className={labelClass}>ご質問・ご要望（任意）</label>
                <textarea
                  value={form.message}
                  onChange={(e) => updateField('message', e.target.value)}
                  rows={3}
                  className={inputClass}
                  placeholder="サイト追加の用途、追加サイト数が10件を超える場合のご相談など"
                />
              </div>

              {/* 送信ボタン */}
              <div className="flex justify-center">
                <Button variant="upgrade" size="lg" type="submit" disabled={isSending || extras <= 0}>
                  <Send className="h-5 w-5" data-slot="icon" />
                  {isSending ? '送信中...' : '追加オプションを申し込む'}
                </Button>
              </div>
            </div>
          </DialogBody>
        </form>
      </Dialog>
    );
  }

  // ── ステップ2: お問い合わせフォーム ──
  if (step === 'form') {
    return (
      <Dialog open={isOpen} onClose={handleClose} size="2xl">
        <div className="-mx-(--gutter) -mt-(--gutter) border-b border-stroke bg-gradient-business px-6 py-4 dark:border-dark-3 rounded-t-2xl shrink-0">
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

              {/* 担当者情報〜住所〜契約条件〜質問（共用コンポーネント）
                  showExtraSitesField=true で「追加サイト数」セレクトを表示 */}
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
                showExtraSitesField={true}
                extraSitesUnitPrice={EXTRA_SITE_UNIT_PRICE}
                monthlyBase={businessPlan.price}
              />
              {/* 送信ボタン: アップグレード申込なので variant="upgrade" */}
              <div className="flex justify-center">
                <Button variant="upgrade" size="lg" type="submit" disabled={isSending}>
                  <Send className="h-5 w-5" data-slot="icon" />
                  {isSending ? '送信中...' : '送信する'}
                </Button>
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
      <div className="-mx-(--gutter) -mt-(--gutter) border-b border-stroke bg-gradient-business p-6 dark:border-dark-3 rounded-t-2xl">
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
        <Button variant="upgrade" size="lg" onClick={() => { initFormFields(); setStep('form'); }}>
          ビジネスプランのお問い合わせ
        </Button>
      </DialogActions>
    </Dialog>
  );
}
