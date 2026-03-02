import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, useSearchParams, useParams } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { db, functions } from '../../../config/firebase';
import { collection, addDoc, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import logoImg from '../../../assets/img/logo.svg';
import StepIndicator from './StepIndicator';
import Step1BasicInfo from './Step1BasicInfo';
import Step2GA4Connect from './Step2GA4Connect';
import Step3GSCConnect from './Step3GSCConnect';
import Step4ConversionSettings from './Step4ConversionSettings';
import Step5KPISettings from './Step5KPISettings';

export default function SiteRegistration({ mode = 'new' }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { siteId: siteIdFromParams } = useParams();
  const { currentUser, userProfile } = useAuth();

  const stepParam = parseInt(searchParams.get('step')) || 1;
  // 編集モードの場合はURLパラメータから、新規作成の場合はクエリパラメータから取得
  const siteIdParam = mode === 'edit' ? siteIdFromParams : searchParams.get('siteId');

  const [currentStep, setCurrentStep] = useState(stepParam);
  const [siteId, setSiteId] = useState(siteIdParam);
  const [isLoading, setIsLoading] = useState(mode === 'edit' && !!siteIdParam);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [isAdminEditingOtherSite, setIsAdminEditingOtherSite] = useState(false);
  const [siteOwnerUserId, setSiteOwnerUserId] = useState(null);
  /** Step1の最新値（保存タイミングのずれで industry/siteType/sitePurpose が抜けないようにする） */
  const step1LatestRef = useRef({});

  const [siteData, setSiteData] = useState({
    siteName: '',
    siteUrl: '',
    industry: [],
    siteType: [],
    sitePurpose: [],
    metaTitle: '',
    metaDescription: '',
    pcScreenshotUrl: '',
    mobileScreenshotUrl: '',
    // STEP 2: GA4連携
    ga4PropertyId: '',
    ga4PropertyName: '',
    ga4AccountId: '',
    ga4AccountName: '',
    ga4OauthTokenId: '',
    ga4GoogleAccount: '',
    // STEP 3: GSC連携
    gscSiteUrl: '',
    gscOauthTokenId: '',
    gscGoogleAccount: '',
    // STEP 4: コンバージョン設定
    conversionEvents: [],
    // STEP 5: KPI設定
    kpiSettings: {
      targetSessions: 0,
      targetUsers: 0,
      targetConversions: 0,
      targetConversionRate: 0,
      kpiList: [],
    },
    // メタ情報
    setupStep: 1,
    setupCompleted: false,
  });

  // URLパラメータの変更を監視
  useEffect(() => {
    const step = parseInt(searchParams.get('step')) || 1;
    setCurrentStep(step);
  }, [searchParams]);

  // 既存サイトデータの読み込み（編集モード）
  useEffect(() => {
    const loadSiteData = async () => {
      console.log('[SiteRegistration] loadSiteData:', { mode, siteIdParam });
      
      if (mode === 'edit' && siteIdParam) {
        setIsLoading(true);
        try {
          console.log('[SiteRegistration] サイトデータ読み込み開始:', siteIdParam);
          const siteDoc = await getDoc(doc(db, 'sites', siteIdParam));
          
          if (siteDoc.exists()) {
            const data = siteDoc.data();
            console.log('[SiteRegistration] サイトデータ取得成功:', data);
            
            // 権限チェック
            const isDirectOwner = data.userId === currentUser.uid;
            
            if (!isDirectOwner) {
              // 1. 同じアカウントのメンバーかチェック
              const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
              const userData = userDoc.data();
              const memberships = userData?.memberships || {};
              const isMember = memberships[data.userId] !== undefined;
              
              // 2. システム管理者かチェック
              const adminDoc = await getDoc(doc(db, 'adminUsers', currentUser.uid));
              const isAdmin = adminDoc.exists() && ['admin', 'editor'].includes(adminDoc.data().role);
              
              if (!isMember && !isAdmin) {
                setError('このサイトを編集する権限がありません');
                setIsLoading(false);
                return;
              }
              
              if (isAdmin) {
                setIsAdminEditingOtherSite(true);
                setSiteOwnerUserId(data.userId);
                console.log('[SiteRegistration] 管理者による他ユーザーサイトの代理設定');
              } else {
                console.log('[SiteRegistration] メンバーによるサイト編集');
              }
            }
            
            setSiteData({
              siteName: data.siteName || '',
              siteUrl: data.siteUrl || '',
              industry: Array.isArray(data.industry) ? data.industry : (data.industry ? [data.industry] : []),
              siteType: Array.isArray(data.siteType) ? data.siteType : (data.siteType ? [data.siteType] : []),
              sitePurpose: Array.isArray(data.sitePurpose) ? data.sitePurpose : (data.sitePurpose ? [data.sitePurpose] : []),
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
              setupStep: data.setupStep || 1,
              setupCompleted: data.setupCompleted || false,
            });
          } else {
            console.error('[SiteRegistration] サイトが見つかりません:', siteIdParam);
            setError('サイトが見つかりません');
          }
        } catch (err) {
          console.error('[SiteRegistration] Error loading site data:', err);
          setError('サイトデータの読み込みに失敗しました: ' + err.message);
        } finally {
          setIsLoading(false);
        }
      } else {
        console.log('[SiteRegistration] 編集モードではない、またはsiteIdがありません');
      }
    };

    loadSiteData();
  }, [mode, siteIdParam, currentUser]);

  // ステップクリック
  const handleStepClick = (stepNumber) => {
    if (stepNumber <= currentStep) {
      const params = new URLSearchParams(searchParams);
      params.set('step', stepNumber.toString());
      navigate(`${location.pathname}?${params.toString()}`);
    }
  };

  // バリデーション（useMemoでメモ化してパフォーマンス向上）
  const canProceed = React.useMemo(() => {
    switch (currentStep) {
      case 1:
        // 「取得中...」の状態では進めない
        const isMetadataLoading = siteData.metaTitle === '取得中...' || siteData.metaDescription === '取得中...';
        return !!(
          siteData.siteName &&
          siteData.siteUrl &&
          Array.isArray(siteData.industry) && siteData.industry.length > 0 &&
          Array.isArray(siteData.siteType) && siteData.siteType.length > 0 &&
          Array.isArray(siteData.sitePurpose) && siteData.sitePurpose.length > 0 &&
          !isMetadataLoading
        );
      case 2:
        return !!siteData.ga4PropertyId;
      case 3:
        return true; // Search Console連携は任意（スキップ可能）
      case 4:
      case 5:
        return true; // 任意項目
      default:
        return true;
    }
  }, [currentStep, siteData.siteName, siteData.siteUrl, siteData.industry, siteData.siteType, siteData.sitePurpose, siteData.metaTitle, siteData.metaDescription, siteData.ga4PropertyId]);

  // 保存処理
  const saveSiteData = async (nextStep) => {
    setIsSaving(true);
    setError('');

    try {
      console.log('[SiteRegistration] 保存開始:', { currentUser: currentUser?.uid, siteId, nextStep });
      
      const dataToSave = {
        ...siteData,
        ...step1LatestRef.current,
        setupStep: nextStep,
        updatedAt: serverTimestamp(),
      };
      
      console.log('[SiteRegistration] 保存データ:', {
        metaTitle: dataToSave.metaTitle,
        metaDescription: dataToSave.metaDescription,
        pcScreenshotUrl: dataToSave.pcScreenshotUrl ? '(あり)' : '(なし)',
        mobileScreenshotUrl: dataToSave.mobileScreenshotUrl ? '(あり)' : '(なし)',
      });

      if (siteId) {
        // 既存サイトの更新（管理者代理編集時はuserIdを上書きしない）
        console.log('[SiteRegistration] 既存サイト更新:', siteId);
        const updatePayload = { ...dataToSave };
        if (isAdminEditingOtherSite) {
          // 管理者がOAuth連携した場合、トークンオーナーを管理者に設定
          if (updatePayload.ga4OauthTokenId) {
            updatePayload.ga4TokenOwner = currentUser.uid;
          }
          if (updatePayload.gscOauthTokenId) {
            updatePayload.gscTokenOwner = currentUser.uid;
          }
        } else {
          updatePayload.userId = currentUser.uid;
        }
        await updateDoc(doc(db, 'sites', siteId), updatePayload);
        console.log('[SiteRegistration] 更新完了:', siteId);
      } else {
        // 新規サイトの作成
        console.log('[SiteRegistration] 新規サイト作成:', { userId: currentUser.uid });
        const docRef = await addDoc(collection(db, 'sites'), {
          ...dataToSave,
          userId: currentUser.uid,
          createdAt: serverTimestamp(),
        });
        console.log('[SiteRegistration] サイト作成成功:', docRef.id);
        console.log('[SiteRegistration] 保存されたデータを確認してください: Firestore > sites >', docRef.id);
        setSiteId(docRef.id);
        
        // URLにsiteIdを追加
        const params = new URLSearchParams(searchParams);
        params.set('siteId', docRef.id);
        params.set('step', nextStep.toString());
        navigate(`${location.pathname}?${params.toString()}`, { replace: true });
        return;
      }

      // 次のステップへ
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

  // 保存して終了（編集モード用）
  const handleSaveAndExit = async () => {
    setIsSaving(true);
    setError('');

    try {
      const dataToSave = {
        ...siteData,
        ...step1LatestRef.current,
        setupStep: currentStep,
        updatedAt: serverTimestamp(),
      };

      if (siteId) {
        const updatePayload = { ...dataToSave };
        if (isAdminEditingOtherSite) {
          if (updatePayload.ga4OauthTokenId) {
            updatePayload.ga4TokenOwner = currentUser.uid;
          }
          if (updatePayload.gscOauthTokenId) {
            updatePayload.gscTokenOwner = currentUser.uid;
          }
        } else {
          updatePayload.userId = currentUser.uid;
        }
        await updateDoc(doc(db, 'sites', siteId), updatePayload);

        // 管理者代理編集時は管理者画面へ、それ以外はダッシュボードへ
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
      const finalData = {
        ...siteData,
        ...step1LatestRef.current,
        setupStep: 5,
        setupCompleted: true,
        updatedAt: serverTimestamp(),
      };

      let completedSiteId = siteId;
      let isNewSite = !siteId;

      // 管理者代理編集時はトークンオーナーを管理者に設定
      if (isAdminEditingOtherSite) {
        if (finalData.ga4OauthTokenId) {
          finalData.ga4TokenOwner = currentUser.uid;
        }
        if (finalData.gscOauthTokenId) {
          finalData.gscTokenOwner = currentUser.uid;
        }
      }

      if (siteId) {
        await updateDoc(doc(db, 'sites', siteId), finalData);
      } else {
        const docRef = await addDoc(collection(db, 'sites'), {
          ...finalData,
          userId: currentUser.uid,
          createdAt: serverTimestamp(),
        });
        completedSiteId = docRef.id;
      }

      // 新規サイト作成時のログを記録（非同期で、エラーは無視）
      if (isNewSite) {
        try {
          const userProfile = await getDoc(doc(db, 'users', currentUser.uid));
          const userData = userProfile.data();
          const displayName = userData?.lastName && userData?.firstName 
            ? `${userData.lastName} ${userData.firstName}` 
            : currentUser.displayName || '';
          
          const logSiteCreated = httpsCallable(functions, 'logSiteCreated');
          await logSiteCreated({
            siteId: completedSiteId,
            siteName: siteData.name,
            siteUrl: siteData.url,
            displayName,
          });
        } catch (logError) {
          console.error('Log site created error:', logError);
          // ログ記録エラーは無視して処理を続行
        }
      }

      // 管理者が他ユーザーのサイトを設定している場合は管理者ユーザー詳細へ、それ以外は完了画面へ
      if (isAdminEditingOtherSite) {
        console.log('[SiteRegistration] 管理者による設定完了 - 管理者画面へ遷移');
        window.location.href = siteOwnerUserId ? `/admin/users/${siteOwnerUserId}` : '/admin/users';
      } else {
        console.log('[SiteRegistration] 通常の設定完了 - 完了画面へ遷移');
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
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
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
        <StepIndicator currentStep={currentStep} onStepClick={handleStepClick} />
      </div>

      {/* フォームカード */}
      <div className="mx-auto max-w-4xl px-6 pb-12">
        <div className="rounded-xl border border-stroke bg-white shadow-md dark:border-dark-3 dark:bg-dark-2">
            <div className="border-b border-stroke px-8 py-6 dark:border-dark-3">
              <h2 className="text-xl font-semibold text-dark dark:text-white">
                {
                  currentStep === 1 ? 'サイト基本情報' :
                  currentStep === 2 ? 'GA4連携' :
                  currentStep === 3 ? 'Search Console連携' :
                  currentStep === 4 ? 'コンバージョン設定' :
                  'KPI設定'
                }
                {currentStep >= 3 && <span className="ml-2 text-sm text-gray-500">（任意）</span>}
              </h2>
              <p className="mt-1 text-sm text-body-color">
                {
                  currentStep === 1 ? 'サイト名やURL、業界・業種、サイト種別、サイトの目的を入力してください' :
                  currentStep === 2 ? 'Google Analytics 4のプロパティを連携します' :
                  currentStep === 3 ? 'Google Search Consoleのサイトを連携します（スキップ可能）' :
                  currentStep === 4 ? 'コンバージョンイベントを設定します（スキップ可能）' :
                  '目標KPIを設定します（スキップ可能）'
                }
              </p>
            </div>

            {/* エラーメッセージ */}
            {error && (
              <div className="mx-8 mt-6 rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

          {/* ステップコンテンツ */}
          <div className="px-8 py-8">
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
          </div>

          {/* ボタンエリア */}
          <div className="flex items-center justify-between border-t border-stroke px-8 py-6 dark:border-dark-3">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className="inline-flex items-center gap-2 rounded-lg border border-stroke px-6 py-2.5 text-sm font-medium text-dark transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-dark-3 dark:text-white dark:hover:bg-dark-3"
            >
              <ChevronLeft className="h-4 w-4" />
              戻る
            </button>

            <div className="flex gap-3">
              {currentStep < 5 ? (
                <>
                  {mode === 'edit' && (
                    <button
                      onClick={handleSaveAndExit}
                      disabled={isSaving}
                      className="inline-flex items-center gap-2 rounded-lg border-2 border-primary bg-white px-6 py-2.5 text-sm font-medium text-primary transition hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-dark-2"
                    >
                      {isSaving ? '保存中...' : '保存して終了'}
                    </button>
                  )}
                  <button
                    onClick={handleNext}
                    disabled={!canProceed || isSaving}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white transition hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSaving ? '保存中...' : (mode === 'edit' ? '保存して次へ' : '次へ')}
                    {!isSaving && <ChevronRight className="h-4 w-4" />}
                  </button>
                </>
              ) : (
                <button
                  onClick={handleComplete}
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white transition hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSaving ? '保存中...' : '完了'}
                  {!isSaving && <Check className="h-4 w-4" />}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
