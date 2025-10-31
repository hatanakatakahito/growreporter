import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams, useParams } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { db } from '../../../config/firebase';
import { collection, addDoc, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import MainLayout from '../../Layout/MainLayout';
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
  const { currentUser } = useAuth();

  const stepParam = parseInt(searchParams.get('step')) || 1;
  // 編集モードの場合はURLパラメータから、新規作成の場合はクエリパラメータから取得
  const siteIdParam = mode === 'edit' ? siteIdFromParams : searchParams.get('siteId');

  const [currentStep, setCurrentStep] = useState(stepParam);
  const [siteId, setSiteId] = useState(siteIdParam);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const [siteData, setSiteData] = useState({
    siteName: '',
    siteUrl: '',
    siteType: '',
    businessType: '',
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
            
            setSiteData({
              siteName: data.siteName || '',
              siteUrl: data.siteUrl || '',
              siteType: data.siteType || '',
              businessType: data.businessType || '',
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
  }, [mode, siteIdParam]);

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
        return !!(
          siteData.siteName &&
          siteData.siteUrl &&
          siteData.siteType &&
          siteData.businessType
        );
      case 2:
        return !!siteData.ga4PropertyId;
      case 3:
        return true; // Search Console は任意項目
      case 4:
      case 5:
        return true; // 任意項目
      default:
        return true;
    }
  }, [currentStep, siteData.siteName, siteData.siteUrl, siteData.siteType, siteData.businessType, siteData.ga4PropertyId]);

  // 保存処理
  const saveSiteData = async (nextStep) => {
    setIsSaving(true);
    setError('');

    try {
      console.log('[SiteRegistration] 保存開始:', { currentUser: currentUser?.uid, siteId, nextStep });
      
      const dataToSave = {
        ...siteData,
        setupStep: nextStep,
        updatedAt: serverTimestamp(),
      };

      if (siteId) {
        // 既存サイトの更新（userIdも含める）
        console.log('[SiteRegistration] 既存サイト更新:', siteId);
        await updateDoc(doc(db, 'sites', siteId), {
          ...dataToSave,
          userId: currentUser.uid, // 既存ドキュメントにもuserIdを追加
        });
      } else {
        // 新規サイトの作成
        console.log('[SiteRegistration] 新規サイト作成:', { userId: currentUser.uid });
        const docRef = await addDoc(collection(db, 'sites'), {
          ...dataToSave,
          userId: currentUser.uid,
          createdAt: serverTimestamp(),
        });
        console.log('[SiteRegistration] サイト作成成功:', docRef.id);
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

  // 完了
  const handleComplete = async () => {
    setIsSaving(true);
    setError('');

    try {
      const finalData = {
        ...siteData,
        setupStep: 5,
        setupCompleted: true,
        updatedAt: serverTimestamp(),
      };

      let completedSiteId = siteId;

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

      // 完了画面へリダイレクト
      navigate(`/sites/complete?siteId=${completedSiteId}`);
    } catch (err) {
      console.error('Error completing setup:', err);
      setError('保存中にエラーが発生しました: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            <p className="mt-4 text-body-color">読み込み中...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout
      title={mode === 'new' ? '新規サイト登録' : 'サイト設定'}
      subtitle="サイト情報の登録とGoogleアナリティクス、Googleサーチコンソールの連携を行います。"
      backLink="/sites/list"
      backLabel="サイト一覧に戻る"
    >
      <div className="p-6">
        {/* ステップインジケーター */}
        <div className="mx-auto mb-8 max-w-[1000px]">
          <StepIndicator currentStep={currentStep} onStepClick={handleStepClick} />
        </div>

        {/* フォームエリア */}
        <div className="mx-auto max-w-[800px] rounded-lg border border-stroke bg-white shadow-sm dark:border-dark-3 dark:bg-dark-2">
          <div className="border-b border-stroke px-12 py-8">
            <h2 className="text-2xl font-semibold text-dark dark:text-white">
              STEP {currentStep}: {
                currentStep === 1 ? 'サイト基本情報' :
                currentStep === 2 ? 'GA4連携' :
                currentStep === 3 ? 'Search Console連携' :
                currentStep === 4 ? 'コンバージョン設定（任意）' :
                'KPI設定（任意）'
              }
            </h2>
            <p className="mt-2 text-sm text-body-color">
              {
                currentStep === 1 ? 'サイト名やURL、各種サイト種類やビジネス形態を入力してください' :
                currentStep === 2 ? 'Google Analytics 4のプロパティを連携します' :
                currentStep === 3 ? 'Google Search Consoleのサイトを連携します' :
                currentStep === 4 ? 'コンバージョンイベントを設定します（スキップ可能）' :
                '目標KPIを設定します（スキップ可能）'
              }
            </p>
          </div>

          {/* エラーメッセージ */}
          {error && (
            <div className="mx-12 mt-8 rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* ステップコンテンツ */}
          <div className="px-12 py-10">
            {currentStep === 1 && (
              <Step1BasicInfo siteData={siteData} setSiteData={setSiteData} />
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
          <div className="flex items-center justify-between border-t border-stroke px-12 py-8">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className="rounded-md border border-stroke px-8 py-3 text-sm font-medium text-dark transition hover:bg-gray-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-dark-3 dark:text-white dark:hover:bg-dark-3"
            >
              戻る
            </button>

            <div className="flex gap-3">
              {currentStep < 5 ? (
                <button
                  onClick={handleNext}
                  disabled={!canProceed || isSaving}
                  className="rounded-md bg-primary px-8 py-3 text-sm font-medium text-white transition hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSaving ? '保存中...' : '次へ'}
                </button>
              ) : (
                <button
                  onClick={handleComplete}
                  disabled={isSaving}
                  className="rounded-md bg-primary px-8 py-3 text-sm font-medium text-white transition hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSaving ? '保存中...' : '保存'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
