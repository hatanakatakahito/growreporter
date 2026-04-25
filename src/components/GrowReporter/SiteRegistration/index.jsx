import React, { Component, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { addDoc, collection, deleteField, doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import toast from 'react-hot-toast';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';

import { useAuth } from '../../../contexts/AuthContext';
import { useSite } from '../../../contexts/SiteContext';
import { useAdmin } from '../../../hooks/useAdmin';
import { db, functions } from '../../../config/firebase';
import logoImg from '../../../assets/img/logo.svg';

import UpgradeModal from '../../common/UpgradeModal';
import DotWaveSpinner from '../../common/DotWaveSpinner';
import { Button } from '../../ui/button';
import StepIndicator from './StepIndicator';
import Step1BasicInfo from './Step1BasicInfo';
import Step2GA4Connect from './Step2GA4Connect';
import Step3GSCConnect from './Step3GSCConnect';
import Step4ConversionSettings from './Step4ConversionSettings';
import Step5KPISettings from './Step5KPISettings';

// 子コンポーネントのクラッシュをキャッチして白画面を防ぐエラーバウンダリ
class StepErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, errorInfo) { console.error('[SiteRegistration] ステップでエラー:', error, errorInfo); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center">
          <p className="text-red-600 font-medium mb-2">エラーが発生しました</p>
          <p className="text-sm text-body-color mb-4">{this.state.error?.message || '予期しないエラーです'}</p>
          <Button
            variant="primary"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            再試行
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

// 各ステップの表示情報 (見出し + サブタイトル)
const STEP_INFO = {
  1: { title: '基本情報', subtitle: 'サイト名と URL を入力してください。' },
  2: { title: 'Google Analytics 4 連携', subtitle: 'サイトのアクセス数・ユーザー行動が自動で取り込まれ、ダッシュボードに反映されます。' },
  3: { title: 'Google Search Console 連携', subtitle: 'どんな検索キーワードで訪れたか・掲載順位がわかり、SEO 改善に役立ちます。' },
  4: { title: 'コンバージョン設定', subtitle: 'お問い合わせ・購入など「成果」を登録すると、達成数や流入経路が分析できます。' },
  5: { title: '目標設定', subtitle: '月間の目標値を決めておくと、ダッシュボードで達成率が一目でわかります。' },
};

// 任意ステップを設定するメリット (早期完了時の確認ダイアログで訴求)
const STEP_BENEFITS = {
  3: {
    benefit: '検索キーワード・掲載順位・クリック率がわかり、SEO 改善の打ち手を具体化できます。',
    missing: '未設定だと、ユーザーがどんな検索ワードで流入したかが取得できません。',
  },
  4: {
    benefit: 'お問い合わせ・購入などの「成果」が計測でき、どの流入経路が売上に貢献しているかが分析できます。',
    missing: '未設定だと、達成数や CVR が計測できず、施策の効果測定ができません。',
  },
  5: {
    benefit: '月間の目標達成率がダッシュボードで一目でわかり、進捗管理や振り返りに使えます。',
    missing: '未設定だと、達成率や目標に対する進捗が可視化されません。',
  },
};

// 各ステップが「埋まっているか」の判定 (フッターの完了カウント・保存済バッジ用)
function isStepFilled(stepNumber, siteData) {
  if (!siteData) return false;
  switch (stepNumber) {
    case 1: return !!(siteData.siteName && siteData.siteUrl);
    case 2: return !!siteData.ga4PropertyId;
    case 3: return !!siteData.gscSiteUrl;
    case 4: return (siteData.conversionEvents?.length || 0) > 0;
    case 5: return (siteData.kpiSettings?.kpiList?.length || 0) > 0;
    default: return false;
  }
}

// 保存状態バッジ
function SaveBadge({ isSaving, savedAt, filled, required }) {
  if (isSaving) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
        <span className="inline-block w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        保存中…
      </span>
    );
  }
  if (savedAt) {
    const t = savedAt.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
        <Check className="w-3.5 h-3.5" />
        保存済 · {t}
      </span>
    );
  }
  if (filled) {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
        入力済
      </span>
    );
  }
  // 未保存: 必須/任意ラベルで出し分け
  if (required) {
    return (
      <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-primary">
        必須
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
      任意
    </span>
  );
}

// V1 レガシーフィールド (industry/siteType/sitePurpose/businessType) を保存時に除外する。
// updateDoc 時は deleteField() で Firestore からも消す。
const LEGACY_TAXONOMY_FIELDS = ['industry', 'siteType', 'sitePurpose', 'businessType'];

function buildSavePayload(baseData) {
  const cleaned = { ...baseData };
  LEGACY_TAXONOMY_FIELDS.forEach((key) => { delete cleaned[key]; });
  cleaned.taxonomyVersion = 2;
  return cleaned;
}

function legacyDeletionSentinels() {
  const sentinels = {};
  LEGACY_TAXONOMY_FIELDS.forEach((key) => { sentinels[key] = deleteField(); });
  return sentinels;
}

export default function SiteRegistration({ mode = 'new' }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { siteId: siteIdFromParams } = useParams();
  const { currentUser } = useAuth();
  const { maxSites, allSites, isLoading: isSiteLoading } = useSite();
  const { isAdmin, loading: isAdminLoading } = useAdmin();
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  const stepParam = parseInt(searchParams.get('step'), 10) || 1;
  const siteIdParam = mode === 'edit' ? siteIdFromParams : searchParams.get('siteId');

  const [currentStep, setCurrentStep] = useState(stepParam);
  const [siteId, setSiteId] = useState(siteIdParam);
  const [isLoading, setIsLoading] = useState(mode === 'edit' && !!siteIdParam);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [isAdminEditingOtherSite, setIsAdminEditingOtherSite] = useState(false);
  const [siteOwnerUserId, setSiteOwnerUserId] = useState(null);
  // 各ステップが当セッションで保存された時刻を記録 (見出しの保存済バッジに使用)
  const [stepSavedAt, setStepSavedAt] = useState({});
  // 早期完了確認ダイアログ表示
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  // Step1 の最新値 (保存タイミングのずれで siteName/siteUrl が抜けないようにする)
  const step1LatestRef = useRef({});

  const [siteData, setSiteData] = useState({
    siteName: '',
    siteUrl: '',
    // タクソノミー V2 はユーザに入力させない (登録完了後のスクレイピングで AI が自動判定)
    taxonomyVersion: 2,
    metaTitle: '',
    metaDescription: '',
    pcScreenshotUrl: '',
    mobileScreenshotUrl: '',
    ga4PropertyId: '',
    ga4PropertyName: '',
    ga4AccountId: '',
    ga4AccountName: '',
    ga4OauthTokenId: '',
    ga4GoogleAccount: '',
    gscSiteUrl: '',
    gscOauthTokenId: '',
    gscGoogleAccount: '',
    conversionEvents: [],
    kpiSettings: {
      targetSessions: 0,
      targetUsers: 0,
      targetConversions: 0,
      targetConversionRate: 0,
      kpiList: [],
    },
    setupStep: 1,
    setupCompleted: false,
  });

  // ビジネスプラン申込後のトースト
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('business_inquiry') === '1') {
      window.history.replaceState({}, '', window.location.pathname);
      toast.success('ビジネスプランのお申し込みを受け付けました。担当者より折り返しご連絡いたします。', { duration: 8000, id: 'business-inquiry-toast' });
    }
  }, []);

  // プラン上限チェック (新規 + setupCompleted=true のみカウント / 運営側 admin は無制限)
  useEffect(() => {
    if (mode !== 'new' || isSiteLoading || isAdminLoading) return;
    if (isAdmin) return;
    const completedSites = allSites.filter((s) => s.setupCompleted === true);
    if (completedSites.length >= maxSites) {
      setIsUpgradeModalOpen(true);
    }
  }, [mode, allSites, maxSites, isSiteLoading, isAdmin, isAdminLoading]);

  // ?step=N の変化を currentStep に反映
  useEffect(() => {
    const step = parseInt(searchParams.get('step'), 10) || 1;
    setCurrentStep(step);
  }, [searchParams]);

  // 編集モード: 既存サイトのデータを読み込み
  useEffect(() => {
    const loadSiteData = async () => {
      if (mode !== 'edit' || !siteIdParam) return;
      setIsLoading(true);
      try {
        const siteDoc = await getDoc(doc(db, 'sites', siteIdParam));
        if (!siteDoc.exists()) {
          setError('サイトが見つかりません');
          setIsLoading(false);
          return;
        }
        const data = siteDoc.data();
        const isDirectOwner = data.userId === currentUser?.uid;

        if (!isDirectOwner) {
          // メンバーシップ or 管理者権限を確認
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          const userData = userDoc.data();
          const memberships = userData?.memberships || {};
          const isMember = memberships[data.userId] !== undefined;

          const adminDoc = await getDoc(doc(db, 'adminUsers', currentUser.uid));
          const isAdminUser = adminDoc.exists() && ['admin', 'editor'].includes(adminDoc.data().role);

          if (!isMember && !isAdminUser) {
            setError('このサイトを編集する権限がありません');
            setIsLoading(false);
            return;
          }
          if (isAdminUser) {
            setIsAdminEditingOtherSite(true);
            setSiteOwnerUserId(data.userId);
          }
        }

        setSiteData({
          siteName: data.siteName || '',
          siteUrl: data.siteUrl || '',
          businessModel: data.businessModel || '',
          industryMajor: data.industryMajor || '',
          industryMinor: data.industryMinor || '',
          siteRole: data.siteRole || '',
          taxonomyVersion: Number(data.taxonomyVersion) === 2 ? 2 : undefined,
          needsManualReclassify: !!data.needsManualReclassify,
          metaTitle: data.metaTitle || '',
          metaDescription: data.metaDescription || '',
          pcScreenshotUrl: data.pcScreenshotUrl || '',
          mobileScreenshotUrl: data.mobileScreenshotUrl || '',
          ga4PropertyId: data.ga4PropertyId || '',
          ga4PropertyName: data.ga4PropertyName || '',
          ga4AccountId: data.ga4AccountId || '',
          ga4AccountName: data.ga4AccountName || '',
          ga4OauthTokenId: data.ga4OauthTokenId || '',
          ga4GoogleAccount: data.ga4GoogleAccount || '',
          gscSiteUrl: data.gscSiteUrl || '',
          gscOauthTokenId: data.gscOauthTokenId || '',
          gscGoogleAccount: data.gscGoogleAccount || '',
          conversionEvents: data.conversionEvents || [],
          kpiSettings: data.kpiSettings || {
            targetSessions: 0,
            targetUsers: 0,
            targetConversions: 0,
            targetConversionRate: 0,
            kpiList: [],
          },
          userId: data.userId, // Step2/3 の oauth_tokens パス解決に必要
          setupStep: data.setupStep || 1,
          setupCompleted: data.setupCompleted || false,
        });
      } catch (err) {
        console.error('[SiteRegistration] Error loading site data:', err);
        setError('サイトデータの読み込みに失敗しました: ' + err.message);
      } finally {
        setIsLoading(false);
      }
    };
    loadSiteData();
  }, [mode, siteIdParam, currentUser]);

  // ステップクリック: 新規モードでは過去ステップのみ、編集モードでは全ステップへ自由ジャンプ可能
  const handleStepClick = (stepNumber) => {
    if (mode === 'edit' || stepNumber <= currentStep) {
      const params = new URLSearchParams(searchParams);
      params.set('step', stepNumber.toString());
      navigate(`${location.pathname}?${params.toString()}`);
    }
  };

  // バリデーション
  const canProceed = useMemo(() => {
    switch (currentStep) {
      case 1: {
        const isMetadataLoading =
          siteData.metaTitle === '取得中...' || siteData.metaDescription === '取得中...';
        return !!(siteData.siteName && siteData.siteUrl && !isMetadataLoading);
      }
      case 2:
        return !!siteData.ga4PropertyId;
      case 3:
      case 4:
      case 5:
        return true; // 任意
      default:
        return true;
    }
  }, [
    currentStep,
    siteData.siteName,
    siteData.siteUrl,
    siteData.metaTitle,
    siteData.metaDescription,
    siteData.ga4PropertyId,
  ]);

  // 保存処理 (次のステップを指定)
  const saveSiteData = async (nextStep) => {
    setIsSaving(true);
    setError('');

    const savedStep = currentStep;
    try {
      const dataToSave = buildSavePayload({
        ...siteData,
        ...step1LatestRef.current,
        setupStep: nextStep,
        updatedAt: serverTimestamp(),
      });

      if (siteId) {
        const updatePayload = { ...dataToSave, ...legacyDeletionSentinels() };
        if (isAdminEditingOtherSite) {
          if (updatePayload.ga4OauthTokenId) updatePayload.ga4TokenOwner = currentUser.uid;
          if (updatePayload.gscOauthTokenId) updatePayload.gscTokenOwner = currentUser.uid;
        } else {
          updatePayload.userId = currentUser.uid;
        }
        await updateDoc(doc(db, 'sites', siteId), updatePayload);
      } else {
        // 新規作成
        const docRef = await addDoc(collection(db, 'sites'), {
          ...dataToSave,
          userId: currentUser.uid,
          createdAt: serverTimestamp(),
        });
        setSiteId(docRef.id);
        setStepSavedAt((prev) => ({ ...prev, [savedStep]: new Date() }));
        const params = new URLSearchParams(searchParams);
        params.set('siteId', docRef.id);
        params.set('step', nextStep.toString());
        navigate(`${location.pathname}?${params.toString()}`, { replace: true });
        return;
      }

      setStepSavedAt((prev) => ({ ...prev, [savedStep]: new Date() }));
      const params = new URLSearchParams(searchParams);
      params.set('step', nextStep.toString());
      navigate(`${location.pathname}?${params.toString()}`);
    } catch (err) {
      console.error('Error saving site data:', err);
      setError('保存中にエラーが発生しました: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // 次へ
  const handleNext = async () => {
    if (!canProceed) return;
    if (currentStep < 5) {
      await saveSiteData(currentStep + 1);
    }
  };

  // 戻る
  const handlePrevious = () => {
    if (currentStep > 1) {
      const params = new URLSearchParams(searchParams);
      params.set('step', (currentStep - 1).toString());
      navigate(`${location.pathname}?${params.toString()}`);
    }
  };

  // 保存して終了 (編集モード用)
  const handleSaveAndExit = async () => {
    setIsSaving(true);
    setError('');

    try {
      const dataToSave = buildSavePayload({
        ...siteData,
        ...step1LatestRef.current,
        setupStep: currentStep,
        updatedAt: serverTimestamp(),
      });

      if (siteId) {
        const updatePayload = { ...dataToSave, ...legacyDeletionSentinels() };
        if (isAdminEditingOtherSite) {
          if (updatePayload.ga4OauthTokenId) updatePayload.ga4TokenOwner = currentUser.uid;
          if (updatePayload.gscOauthTokenId) updatePayload.gscTokenOwner = currentUser.uid;
        } else {
          updatePayload.userId = currentUser.uid;
        }
        await updateDoc(doc(db, 'sites', siteId), updatePayload);

        if (isAdminEditingOtherSite) {
          window.location.href = siteOwnerUserId ? `/admin/users/${siteOwnerUserId}` : '/admin/users';
        } else {
          navigate(`/dashboard?siteId=${siteId}`);
        }
      }
    } catch (err) {
      console.error('Error saving and exiting:', err);
      setError('保存中にエラーが発生しました: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // 完了
  const handleComplete = async () => {
    setIsSaving(true);
    setError('');

    try {
      const merged = { ...siteData, ...step1LatestRef.current };
      const finalData = buildSavePayload({
        ...merged,
        setupStep: 5,
        setupCompleted: true,
        updatedAt: serverTimestamp(),
      });

      let completedSiteId = siteId;
      const isNewSite = !siteId;

      if (isAdminEditingOtherSite) {
        if (finalData.ga4OauthTokenId) finalData.ga4TokenOwner = currentUser.uid;
        if (finalData.gscOauthTokenId) finalData.gscTokenOwner = currentUser.uid;
      }

      if (siteId) {
        await updateDoc(doc(db, 'sites', siteId), {
          ...finalData,
          ...legacyDeletionSentinels(),
        });
      } else {
        const docRef = await addDoc(collection(db, 'sites'), {
          ...finalData,
          userId: currentUser.uid,
          createdAt: serverTimestamp(),
        });
        completedSiteId = docRef.id;
      }

      // 新規作成時のログ (失敗しても続行)
      if (isNewSite) {
        try {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          const userData = userDoc.data();
          const displayName = userData?.lastName && userData?.firstName
            ? `${userData.lastName} ${userData.firstName}`
            : currentUser.displayName || '';
          const logSiteCreated = httpsCallable(functions, 'logSiteCreated');
          await logSiteCreated({
            siteId: completedSiteId,
            siteName: merged.siteName,
            siteUrl: merged.siteUrl,
            displayName,
          });
        } catch (logError) {
          console.error('Log site created error:', logError);
        }
      }

      if (isAdminEditingOtherSite) {
        window.location.href = siteOwnerUserId ? `/admin/users/${siteOwnerUserId}` : '/admin/users';
      } else {
        window.location.href = `/sites/complete?siteId=${completedSiteId}`;
      }
    } catch (err) {
      console.error('Error completing setup:', err);
      setError('保存中にエラーが発生しました: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: 'rgb(244, 244, 244)' }}>
        <div className="text-center">
          <DotWaveSpinner size="lg" />
          <p className="mt-4 text-body-color">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'rgb(244, 244, 244)' }}>
      {/* ロゴ */}
      <div className="flex justify-center pt-8 pb-6">
        <img src={logoImg} alt="GROW REPORTER" className="h-10 w-auto" />
      </div>

      {/* タイトル */}
      <div className="mx-auto max-w-4xl px-6 pb-6 text-center">
        <h1 className="text-2xl font-bold text-dark dark:text-white">
          {mode === 'new' ? '新規サイト登録' : 'サイト設定'}
        </h1>
        <p className="mt-2 text-sm text-body-color">
          サイト情報の登録とGoogleアナリティクス、Googleサーチコンソールの連携を行います
        </p>
      </div>

      {/* ステップインジケーター */}
      <div className="mx-auto max-w-4xl px-6 pb-8">
        <StepIndicator
          currentStep={currentStep}
          onStepClick={handleStepClick}
          allowAllSteps={mode === 'edit'}
        />
      </div>

      {/* フォームカード */}
      <div className="mx-auto max-w-4xl px-6 pb-32">
        <div className="rounded-xl border border-stroke bg-white shadow-sm dark:border-dark-3 dark:bg-dark-2">
          <div className="flex items-center justify-between border-b border-stroke px-8 py-5 dark:border-dark-3">
            <div className="flex items-start gap-3">
              <span className="w-8 h-8 rounded-full bg-primary text-white text-sm font-semibold flex items-center justify-center flex-shrink-0">
                {currentStep}
              </span>
              <div>
                <h2 className="text-lg font-semibold text-dark dark:text-white">
                  {STEP_INFO[currentStep].title}
                </h2>
                <p className="text-xs text-body-color mt-0.5">{STEP_INFO[currentStep].subtitle}</p>
              </div>
            </div>
            <SaveBadge
              isSaving={isSaving}
              savedAt={stepSavedAt[currentStep]}
              filled={isStepFilled(currentStep, siteData)}
              required={currentStep === 1 || currentStep === 2}
            />
          </div>

          {error && (
            <div className="mx-8 mt-6 rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* ステップコンテンツ */}
          <div className="px-8 py-8">
            <StepErrorBoundary key={currentStep}>
              {currentStep === 1 && (
                <Step1BasicInfo siteData={siteData} setSiteData={setSiteData} step1LatestRef={step1LatestRef} mode={mode} />
              )}
              {currentStep === 2 && (
                <Step2GA4Connect siteData={siteData} setSiteData={setSiteData} />
              )}
              {currentStep === 3 && (
                <Step3GSCConnect siteData={siteData} setSiteData={setSiteData} />
              )}
              {currentStep === 4 && (
                <Step4ConversionSettings siteData={siteData} setSiteData={setSiteData} />
              )}
              {currentStep === 5 && (
                <Step5KPISettings siteData={siteData} setSiteData={setSiteData} />
              )}
            </StepErrorBoundary>
          </div>

          {/* ボタンエリア */}
          <div className="flex items-center justify-between border-t border-stroke px-8 py-6 dark:border-dark-3">
            <Button
              variant="ghost"
              size="lg"
              onClick={handlePrevious}
              disabled={currentStep === 1}
            >
              <ChevronLeft data-slot="icon" />
              戻る
            </Button>

            <div className="flex items-center gap-3">
              {currentStep < 5 ? (
                <>
                  {/* 任意ステップ (3, 4) かつ必須完了済みなら、ここで早期完了できるサブボタン */}
                  {currentStep >= 3 && isStepFilled(1, siteData) && isStepFilled(2, siteData) && (
                    <Button
                      variant="secondary"
                      size="lg"
                      onClick={() => {
                        // 任意ステップで未設定があれば確認ダイアログ、なければそのまま完了
                        const missing = [3, 4, 5].filter((n) => !isStepFilled(n, siteData));
                        if (missing.length > 0) {
                          setShowCompleteConfirm(true);
                        } else {
                          handleComplete();
                        }
                      }}
                      disabled={isSaving}
                    >
                      ここで登録を完了
                    </Button>
                  )}
                  {mode === 'edit' && (
                    <Button
                      variant="secondary"
                      size="lg"
                      onClick={handleSaveAndExit}
                      disabled={isSaving}
                    >
                      {isSaving ? '保存中...' : '保存して終了'}
                    </Button>
                  )}
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={handleNext}
                    disabled={!canProceed || isSaving}
                  >
                    {isSaving
                      ? '保存中...'
                      : mode === 'edit'
                        ? '保存して次へ'
                        : currentStep >= 3 && !isStepFilled(currentStep, siteData)
                          ? 'スキップ'
                          : '次へ'}
                    {!isSaving && <ChevronRight data-slot="icon" />}
                  </Button>
                </>
              ) : (
                <Button
                  variant="success"
                  size="lg"
                  onClick={handleComplete}
                  disabled={isSaving}
                >
                  {isSaving ? '保存中...' : '登録を完了する'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 下部フローティングフッター: 進捗表示 (右寄せ) */}
      {(() => {
        const filledCount = [1, 2, 3, 4, 5].filter((n) => isStepFilled(n, siteData)).length;
        const progressPct = Math.round((filledCount / 5) * 100);
        return (
          <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-stroke bg-white/95 backdrop-blur shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
            <div className="mx-auto max-w-4xl px-6 py-3 flex items-center justify-center gap-4">
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs font-medium text-dark dark:text-white whitespace-nowrap">{filledCount} / 5 完了</span>
                <span className="text-xs text-primary font-semibold">{progressPct}%</span>
              </div>
              <div className="hidden md:flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((n) => {
                  const filled = isStepFilled(n, siteData);
                  const isActive = n === currentStep;
                  const clickable = mode === 'edit' || n <= currentStep;
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => clickable && handleStepClick(n)}
                      disabled={!clickable}
                      title={`${n}. ${STEP_INFO[n].title}`}
                      className={`w-6 h-6 rounded-full text-[10px] font-semibold flex items-center justify-center transition ${
                        isActive || filled
                          ? 'bg-primary text-white'
                          : clickable
                          ? 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {filled && !isActive ? <Check className="h-3 w-3" /> : n}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}

      {/* 早期完了確認ダイアログ: 未設定の任意項目とそのメリットを訴求 */}
      {showCompleteConfirm && (() => {
        const missing = [3, 4, 5].filter((n) => !isStepFilled(n, siteData));
        return (
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4"
            onClick={() => !isSaving && setShowCompleteConfirm(false)}
          >
            <div
              className="w-full max-w-2xl rounded-lg bg-white shadow-xl flex flex-col max-h-[85vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* ヘッダー */}
              <div className="border-b border-stroke px-6 py-4">
                <h3 className="text-lg font-semibold text-dark">未設定の項目があります</h3>
                <p className="mt-1 text-xs text-body-color">
                  以下を設定すると分析の幅が広がります。後からも設定できますが、最初に入れておくと初回データから活用できます。
                </p>
              </div>

              {/* 未設定リスト + メリット */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                {missing.map((n) => (
                  <div key={n} className="rounded-lg border border-stroke bg-gray-50 p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-white text-xs font-semibold flex items-center justify-center">
                        {n}
                      </span>
                      <h4 className="text-sm font-semibold text-dark">{STEP_INFO[n].title}</h4>
                    </div>
                    <div className="space-y-1.5 pl-10">
                      <p className="text-xs text-dark leading-relaxed">
                        <span className="font-medium text-green-700">設定するメリット:</span>{' '}
                        {STEP_BENEFITS[n].benefit}
                      </p>
                      <p className="text-xs text-dark leading-relaxed">
                        <span className="font-medium text-red-600">未設定の影響:</span>{' '}
                        {STEP_BENEFITS[n].missing}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* フッターボタン */}
              <div className="flex items-center justify-center gap-3 border-t border-stroke px-6 py-4">
                <Button
                  type="button"
                  variant="ghost"
                  size="lg"
                  onClick={() => setShowCompleteConfirm(false)}
                  disabled={isSaving}
                >
                  戻って設定する
                </Button>
                <Button
                  type="button"
                  variant="success"
                  size="lg"
                  onClick={() => {
                    setShowCompleteConfirm(false);
                    handleComplete();
                  }}
                  disabled={isSaving}
                >
                  {isSaving ? '保存中...' : 'このまま登録を完了'}
                </Button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* プランアップグレードモーダル */}
      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => {
          setIsUpgradeModalOpen(false);
          if (isAdmin) return;
          const completedSites = allSites.filter((s) => s.setupCompleted === true);
          if (mode === 'new' && completedSites.length >= maxSites) {
            navigate('/sites/list');
          }
        }}
      />
    </div>
  );
}
