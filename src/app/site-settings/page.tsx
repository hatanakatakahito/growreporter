'use client';

/**
 * サイト設定ページ（新仕様）
 * STEP1: サイト情報入力
 * STEP2: Google Analytics接続
 * STEP3: Search Console接続
 * STEP4: 目標KPI設定（コンバージョン・KPI）
 */

import { useState, useEffect, useRef } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/lib/auth/authContext';
import { GA4OAuthManager } from '@/lib/auth/ga4OAuthManager';
import { GSCOAuthManager } from '@/lib/auth/gscOAuthManager';
import { useRouter, useSearchParams } from 'next/navigation';
import { UserProfileService } from '@/lib/user/userProfileService';
import { ConversionService, ConversionEvent } from '@/lib/conversion/conversionService';
import { GA4DataService } from '@/lib/api/ga4DataService';
import { KPIService } from '@/lib/kpi/kpiService';

// サイト種類の選択肢
const SITE_TYPES = [
  { value: 'corporate', label: 'コーポレートサイト' },
  { value: 'product', label: '製品サイト' },
  { value: 'service', label: 'サービスサイト' },
  { value: 'lp', label: 'LP' },
  { value: 'media', label: 'オウンドメディア' },
  { value: 'ec', label: 'ECサイト' },
  { value: 'other', label: 'その他' }
];

// ビジネス形態の選択肢
const BUSINESS_TYPES = [
  { value: 'btob', label: 'BtoB' },
  { value: 'btoc', label: 'BtoC' },
  { value: 'btobtoc', label: 'BtoBtoC' },
  { value: 'personal', label: '個人' }
];

// KPI指標の選択肢（基本指標のみ、コンバージョンは動的に追加）
const KPI_METRICS = [
  { value: 'users', label: 'ユーザー数' },
  { value: 'sessions', label: 'セッション数' },
  { value: 'pageviews', label: 'ページビュー数' },
  { value: 'engagementRate', label: 'エンゲージメント率 (%)' }
];

export default function SiteSettingsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // URLパラメータからステップを取得（初期値）
  const initialStep = searchParams?.get('step') ? parseInt(searchParams.get('step')!, 10) : 1;
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // STEP1: サイト情報
  const [siteName, setSiteName] = useState('');
  const [siteUrl, setSiteUrl] = useState('');
  const [siteType, setSiteType] = useState('');
  const [businessType, setBusinessType] = useState('');

  // STEP2: GA4接続状態
  const [isGA4Connected, setIsGA4Connected] = useState(false);
  const [ga4Properties, setGa4Properties] = useState<any[]>([]);
  const [selectedGA4Property, setSelectedGA4Property] = useState('');
  const [matchedGA4Property, setMatchedGA4Property] = useState<any>(null);
  const [showGA4Dropdown, setShowGA4Dropdown] = useState(false);
  const [filteredGA4Properties, setFilteredGA4Properties] = useState<any[]>([]);
  const ga4InputRef = useRef<HTMLInputElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

  // STEP3: GSC接続状態
  const [isGSCConnected, setIsGSCConnected] = useState(false);
  const [gscSites, setGscSites] = useState<any[]>([]);
  const [selectedGSCSite, setSelectedGSCSite] = useState('');
  const [matchedGSCSite, setMatchedGSCSite] = useState<any>(null);
  const [showGSCDropdown, setShowGSCDropdown] = useState(false);
  const [filteredGSCSites, setFilteredGSCSites] = useState<any[]>([]);
  const gscInputRef = useRef<HTMLInputElement>(null);
  const [gscDropdownPosition, setGscDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

  // STEP4: コンバージョン設定
  const [ga4Events, setGa4Events] = useState<Array<{ eventName: string; eventCount: number }>>([]);
  const [selectedConversions, setSelectedConversions] = useState<ConversionEvent[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  
  // STEP5: KPI設定
  const [kpiSettings, setKpiSettings] = useState<Array<{
    id: string;
    metric: string;
    targetValue: string;
  }>>([]);
  const [showKpiForm, setShowKpiForm] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState('');
  const [selectedTargetValue, setSelectedTargetValue] = useState('');
  
  // イベント検索用のstate
  const [eventSearchTerm, setEventSearchTerm] = useState('');
  const [showEventDropdown, setShowEventDropdown] = useState(false);
  const [filteredEvents, setFilteredEvents] = useState<Array<{ eventName: string; eventCount: number }>>([]);
  const eventInputRef = useRef<HTMLInputElement>(null);
  const [eventDropdownPosition, setEventDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

  // ユーザープロフィールからサイト情報を読み込み
  useEffect(() => {
    if (!user) return;

    const loadUserProfile = async () => {
      try {
        const profile = await UserProfileService.getUserProfile(user.uid);
        
        console.log('📊 Firestoreから読み込んだプロフィール:', {
          siteName: profile.profile?.siteName,
          siteUrl: profile.profile?.siteUrl,
          siteType: profile.profile?.siteType,
          businessType: profile.profile?.businessType
        });
        
        // 保存されているサイト情報を復元
        if (profile.profile?.siteName) setSiteName(profile.profile.siteName);
        if (profile.profile?.siteUrl) setSiteUrl(profile.profile.siteUrl);
        if (profile.profile?.siteType) setSiteType(profile.profile.siteType);
        if (profile.profile?.businessType) setBusinessType(profile.profile.businessType);
      } catch (err) {
        console.error('プロフィール読み込みエラー:', err);
      }
    };

    loadUserProfile();
  }, [user]);

  // GA4接続状態とプロパティ一覧を確認
  useEffect(() => {
    if (!user) return;
    
    // siteUrlが読み込まれるまで待つ
    if (!siteUrl) {
      console.log('⏳ siteURLがまだ読み込まれていません');
    }

    const checkGA4Connection = async () => {
      try {
        const response = await fetch('/api/datasources/status', {
          headers: { 'x-user-id': user.uid }
        });
        
        if (response.ok) {
          const data = await response.json();
          setIsGA4Connected(data.ga4Count > 0);
          
          // プロパティ一覧を取得
          if (data.ga4Count > 0) {
            const listResponse = await fetch('/api/datasources/list', {
              headers: { 'x-user-id': user.uid }
            });
            
            if (listResponse.ok) {
              const listData = await listResponse.json();
              const properties = listData.ga4Properties || [];
              console.log('📥 クライアント受信データ:', {
                count: properties.length,
                firstProperty: properties[0]
              });
              setGa4Properties(properties);
              
              // 登録済みサイトURLと一致するプロパティを検索
              let selectedProperty = '';
              
              // 既存の選択がある場合はプロパティ名のみ表示
              if (listData.selectedGA4PropertyId) {
                const existingProperty = properties.find((p: any) => p.name === listData.selectedGA4PropertyId);
                if (existingProperty) {
                  selectedProperty = existingProperty.displayName;
                  setMatchedGA4Property(existingProperty);
                }
              }
              
              if (!selectedProperty && properties.length > 0) {
                if (siteUrl) {
                  // URL正規化関数
                  const normalizeUrl = (url: string) => {
                    try {
                      const urlObj = new URL(url);
                      // ホスト名からwwwを除去し、小文字に変換
                      return urlObj.hostname.replace(/^www\./, '').toLowerCase();
                    } catch {
                      // URLとして解析できない場合は、プロトコルとwwwを除去
                      return url.replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/$/, '').toLowerCase();
                    }
                  };
                  
                  const normalizedSiteUrl = normalizeUrl(siteUrl);
                  console.log('🔍 登録済みサイトURL:', siteUrl, '→', normalizedSiteUrl);
                  console.log('📋 プロパティ一覧:', properties.map((p: any) => ({ 
                    name: p.displayName, 
                    id: p.name,
                    websiteUrl: p.websiteUrl 
                  })));
                  
                  // プロパティのwebsiteUrlで照合（最も確実）
                  const matchedProperty = properties.find((prop: any) => {
                    if (!prop.websiteUrl) {
                      console.log('  ⚠️ プロパティにwebsiteUrlなし:', prop.displayName);
                      return false;
                    }
                    
                    const normalizedPropUrl = normalizeUrl(prop.websiteUrl);
                    console.log('  🔎 URL照合:', normalizedPropUrl, 'vs', normalizedSiteUrl);
                    
                    if (normalizedPropUrl === normalizedSiteUrl) {
                      console.log('    ✅ URL完全一致!');
                      return true;
                    }
                    
                    return false;
                  });
                  
                  if (matchedProperty) {
                    selectedProperty = matchedProperty.displayName;
                    setMatchedGA4Property(matchedProperty);
                    console.log('✅ URL照合成功:', matchedProperty.displayName, '←→', matchedProperty.websiteUrl);
                  } else {
                    // 一致しない場合は最初のプロパティを選択
                    selectedProperty = properties[0].displayName;
                    setMatchedGA4Property(properties[0]);
                    console.log('ℹ️ URL照合失敗。最初のプロパティを選択:', properties[0].displayName);
                  }
                } else {
                  // サイトURLが未登録の場合は最初のプロパティを選択
                  selectedProperty = properties[0].displayName;
                  setMatchedGA4Property(properties[0]);
                  console.log('ℹ️ サイトURL未登録。最初のプロパティを選択:', properties[0].displayName);
                }
              }
              
              setSelectedGA4Property(selectedProperty);
              console.log('📊 GA4プロパティ一覧:', properties.length, '件');
            }
          }
        }
      } catch (err) {
        console.error('GA4接続状態確認エラー:', err);
      }
    };

    checkGA4Connection();
  }, [user, siteUrl]);

  // GSC接続状態とサイト一覧を確認
  useEffect(() => {
    if (!user) return;
    
    // siteUrlが読み込まれるまで待つ
    if (!siteUrl) {
      console.log('⏳ siteURL（GSC）がまだ読み込まれていません');
      return;
    }

    const checkGSCConnection = async () => {
      try {
        const response = await fetch('/api/datasources/status', {
          headers: { 'x-user-id': user.uid }
        });
        
        if (response.ok) {
          const data = await response.json();
          setIsGSCConnected(data.gscCount > 0);
          
          // サイト一覧を取得
          if (data.gscCount > 0) {
            const listResponse = await fetch('/api/datasources/list', {
              headers: { 'x-user-id': user.uid }
            });
            
            if (listResponse.ok) {
              const listData = await listResponse.json();
              const sites = listData.gscSites || [];
              setGscSites(sites);
              
              console.log('📊 GSCデータ取得:', {
                selectedGSCSiteUrl: listData.selectedGSCSiteUrl,
                sitesCount: sites.length,
                sites: sites.map((s: any) => s.siteUrl)
              });
              
              // 登録済みサイトURLと一致するGSCサイトを検索
              let selectedSite = '';
              let initialMatchedSite = null;
              
              if (listData.selectedGSCSiteUrl) {
                selectedSite = listData.selectedGSCSiteUrl;
                // 選択されたサイトに対応するサイトオブジェクトを検索
                initialMatchedSite = sites.find((site: any) => site.siteUrl === listData.selectedGSCSiteUrl);
                if (initialMatchedSite) {
                  setMatchedGSCSite(initialMatchedSite);
                  console.log('✅ 保存済みGSCサイトを読み込み:', selectedSite);
                }
              }
              
              if (!selectedSite && sites.length > 0) {
                if (siteUrl) {
                  // URL正規化関数
                  const normalizeUrl = (url: string) => {
                    try {
                      const urlObj = new URL(url);
                      return urlObj.origin + urlObj.pathname.replace(/\/+$/, '') + '/';
                    } catch {
                      return url.replace(/\/+$/, '') + '/';
                    }
                  };
                  
                  const normalizedSiteUrl = normalizeUrl(siteUrl);
                  console.log('🔍 登録済みサイトURL（GSC）:', siteUrl, '→', normalizedSiteUrl);
                  console.log('📋 GSCサイト一覧:', sites.map((s: any) => s.siteUrl));
                  
                  // 一致するサイトを検索
                  const matchedSite = sites.find((site: any) => {
                    const normalizedGscUrl = normalizeUrl(site.siteUrl);
                    return normalizedGscUrl === normalizedSiteUrl;
                  });
                  
                  if (matchedSite) {
                    selectedSite = matchedSite.siteUrl;
                    setMatchedGSCSite(matchedSite);
                    console.log('✅ URL照合成功（GSC）:', matchedSite.siteUrl);
                  } else {
                    // 一致しない場合は最初のサイトを選択
                    selectedSite = sites[0]?.siteUrl || '';
                    setMatchedGSCSite(sites[0] || null);
                    console.log('ℹ️ URL照合失敗（GSC）。最初のサイトを選択:', sites[0]?.siteUrl);
                  }
                } else {
                  // サイトURLが未登録の場合は最初のサイトを選択
                  selectedSite = sites[0].siteUrl;
                  setMatchedGSCSite(sites[0]);
                  console.log('ℹ️ サイトURL未登録（GSC）。最初のサイトを選択:', sites[0].siteUrl);
                }
              }
              
              setSelectedGSCSite(selectedSite);
              console.log('📊 GSCサイト一覧:', sites.length, '件');
            }
          }
        }
      } catch (err) {
        console.error('GSC接続状態確認エラー:', err);
      }
    };

    checkGSCConnection();
  }, [user, siteUrl]);

  // STEP4: GA4プロパティIDを取得
  useEffect(() => {
    if (!user) return;
    
    const fetchPropertyId = async () => {
      try {
        console.log('🔍 STEP4: プロパティID取得開始');
        const response = await fetch('/api/datasources/list', {
          headers: { 'x-user-id': user.uid }
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('📊 STEP4: 取得したデータ:', data);
          
          // プロパティIDの処理
          let propertyId = data.selectedGA4PropertyId || null;
          
          if (propertyId) {
            // properties/プレフィックスがある場合は削除
            if (propertyId.startsWith('properties/')) {
              propertyId = propertyId.replace('properties/', '');
              console.log('🔄 properties/プレフィックスを削除:', propertyId);
            }
            // 数字のみの場合はそのまま使用
            console.log('✅ STEP4: 最終プロパティID:', propertyId);
          } else {
            console.warn('⚠️ STEP4: プロパティIDが見つかりません');
          }
          
          setSelectedPropertyId(propertyId);
        } else {
          console.error('❌ STEP4: データソース取得失敗:', response.status);
        }
      } catch (err) {
        console.error('❌ STEP4: プロパティID取得エラー:', err);
      }
    };

    fetchPropertyId();
  }, [user, currentStep]); // currentStepが4になったら再取得

  // STEP4: 既存のコンバージョン定義を読み込み
  useEffect(() => {
    if (!user) return;

    const loadConversions = async () => {
      try {
        const conversions = await ConversionService.getConversions(user.uid);
        setSelectedConversions(conversions);
      } catch (err) {
        console.error('コンバージョン読み込みエラー:', err);
      }
    };

    loadConversions();
  }, [user]);

  // KPI設定を読み込む
  useEffect(() => {
    if (!user) return;

    const loadKPISettings = async () => {
      try {
        const savedKpiSettings = await KPIService.getKPISettings(user.uid);
        if (savedKpiSettings.length > 0) {
          setKpiSettings(savedKpiSettings);
          console.log('📊 KPI設定を読み込みました:', savedKpiSettings);
        }
      } catch (err) {
        console.error('KPI設定読み込みエラー:', err);
      }
    };

    loadKPISettings();
  }, [user]);

  // OAuth認証結果を処理
  useEffect(() => {
    const status = searchParams?.get('status');
    const errorMsg = searchParams?.get('error');
    const stepParam = searchParams?.get('step');
    const service = searchParams?.get('service');

    console.log('🔍 OAuth認証結果:', { status, errorMsg, stepParam, service });

    if (status === 'success') {
      const serviceName = service === 'ga4' ? 'Google Analytics' : service === 'gsc' ? 'Search Console' : '';
      setSuccess(`${serviceName}の認証が完了しました！`);
      
      // stepパラメータがあればそのステップに移動
      if (stepParam) {
        const step = parseInt(stepParam, 10);
        console.log('✅ 認証成功 - ステップ', step, 'に移動');
        setCurrentStep(step);
      }
      
      // URLパラメータをクリア（リロードなし）
      const timer = setTimeout(() => {
        router.replace('/site-settings', { scroll: false });
        setSuccess(null);
        
        // 接続状態を再確認（リロードなし）
        if (service === 'ga4') {
          setIsGA4Connected(true);
        } else if (service === 'gsc') {
          setIsGSCConnected(true);
        }
      }, 2000);
      
      return () => clearTimeout(timer);
    } else if (status === 'error') {
      console.error('❌ OAuth認証エラー:', errorMsg);
      setError(errorMsg || '認証に失敗しました。');
      router.replace('/site-settings', { scroll: false });
    }
  }, [searchParams, router]);

  // STEP1: サイト情報を保存
  const handleSaveStep1 = async () => {
    if (!user) return;

    // バリデーション
    if (!siteName.trim()) {
      setError('サイト名を入力してください。');
      return;
    }
    if (!siteUrl.trim()) {
      setError('対象URLを入力してください。');
      return;
    }
    if (!siteType) {
      setError('サイト種類を選択してください。');
      return;
    }
    if (!businessType) {
      setError('ビジネス形態を選択してください。');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const profileData = {
        profile: {
          siteName: siteName.trim(),
          siteUrl: siteUrl.trim(),
          siteType,
          businessType
        }
      };

      console.log('💾 Firestoreに保存するデータ:', profileData);

      await UserProfileService.updateUserProfile(user.uid, profileData);

      console.log('✅ Firestoreへの保存が完了しました');

      setCurrentStep(2);
    } catch (err: any) {
      console.error('サイト情報保存エラー:', err);
      setError('サイト情報の保存に失敗しました。');
    } finally {
      setIsLoading(false);
    }
  };

  // STEP2: GA4接続
  const handleConnectGA4 = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);
      
      console.log('🔵 GA4認証開始');
      const { url } = GA4OAuthManager.generateOAuthURL({
        userId: user.uid,
        returnUrl: '/site-settings?step=2'
      });
      
      console.log('🔵 GA4 OAuth URLへリダイレクト');
      window.location.href = url;
    } catch (err: any) {
      console.error('❌ GA4接続エラー:', err);
      setError('Google Analytics接続に失敗しました。');
      setIsLoading(false);
    }
  };

  // STEP3: GSC接続
  const handleConnectGSC = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);
      
      console.log('🟢 GSC認証開始');
      const { url } = GSCOAuthManager.generateOAuthURL({
        userId: user.uid,
        returnUrl: '/site-settings?step=3'
      });
      
      console.log('🟢 GSC OAuth URLへリダイレクト');
      window.location.href = url;
    } catch (err: any) {
      console.error('❌ GSC接続エラー:', err);
      setError('Search Console接続に失敗しました。');
      setIsLoading(false);
    }
  };

  // STEP4: GA4イベント一覧を取得
  const handleFetchEvents = async () => {
    console.log('🔍 イベント取得開始:', { user: !!user, selectedPropertyId });
    
    if (!user || !selectedPropertyId) {
      setError('GA4プロパティが設定されていません。');
      return;
    }

    try {
      setIsLoadingEvents(true);
      setError(null);

      // 過去30日間のイベントを取得
      const today = new Date();
      const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      const formatDate = (date: Date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}${m}${d}`;
      };

      console.log('📅 イベント取得期間:', {
        startDate: formatDate(thirtyDaysAgo),
        endDate: formatDate(today),
        propertyId: selectedPropertyId
      });

      const events = await GA4DataService.getEvents(
        user.uid,
        selectedPropertyId,
        formatDate(thirtyDaysAgo),
        formatDate(today)
      );

      setGa4Events(events);
      setSuccess('コンバージョンを取得しました！');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('コンバージョン取得エラー:', err);
      setError('コンバージョンの取得に失敗しました。');
    } finally {
      setIsLoadingEvents(false);
    }
  };

  // STEP4: コンバージョンを追加
  const handleAddConversion = async (eventName: string) => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);

      const newConversion: Omit<ConversionEvent, 'createdAt'> = {
        id: `conv_${Date.now()}`,
        userId: user.uid,
        eventName,
        displayName: eventName,
        isActive: true
      };

      // userIdとconversionを別々の引数として渡す
      await ConversionService.addConversion(user.uid, newConversion);
      
      // Firestoreから最新のデータを再取得
      const updatedConversions = await ConversionService.getConversions(user.uid);
      setSelectedConversions(updatedConversions);

      setSuccess('コンバージョンを追加しました！');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('コンバージョン追加エラー:', err);
      setError('コンバージョンの追加に失敗しました。');
    } finally {
      setIsLoading(false);
    }
  };

  // STEP4: コンバージョンを削除
  const handleRemoveConversion = async (conversionId: string) => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);

      await ConversionService.deleteConversion(user.uid, conversionId);
      
      // Firestoreから最新のデータを再取得して確実に反映
      const updatedConversions = await ConversionService.getConversions(user.uid);
      setSelectedConversions(updatedConversions);

      setSuccess('コンバージョンを削除しました！');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('コンバージョン削除エラー:', err);
      setError('コンバージョンの削除に失敗しました。');
    } finally {
      setIsLoading(false);
    }
  };

  // STEP4: KPI設定を保存
  // STEP5: KPI目標を追加
  const handleAddKPI = () => {
    if (!selectedMetric) {
      setError('目標を選択してください。');
      return;
    }

    if (!selectedTargetValue) {
      setError('目標値を入力してください。');
      return;
    }

    // 既に同じ指標が登録されているかチェック
    if (kpiSettings.some(kpi => kpi.metric === selectedMetric)) {
      setError('この目標は既に登録されています。');
      return;
    }

    const newKpi = {
      id: `kpi_${Date.now()}`,
      metric: selectedMetric,
      targetValue: selectedTargetValue
    };

    setKpiSettings([...kpiSettings, newKpi]);
    setSelectedMetric('');
    setSelectedTargetValue('');
    setError(null);
  };

  // STEP5: KPI目標を削除
  const handleRemoveKPI = (kpiId: string) => {
    setKpiSettings(kpiSettings.filter(kpi => kpi.id !== kpiId));
  };

  // STEP5: KPI目標値を更新
  const handleUpdateKPIValue = (kpiId: string, value: string) => {
    setKpiSettings(kpiSettings.map(kpi => 
      kpi.id === kpiId ? { ...kpi, targetValue: value } : kpi
    ));
  };

  const handleSaveKPI = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);

      // Firestoreに保存
      await KPIService.saveKPISettings(user.uid, kpiSettings);
      console.log('💾 保存したKPI設定:', kpiSettings);

      setSuccess('KPI設定を保存しました！');
      setTimeout(() => {
        setSuccess(null);
        router.push('/summary');
      }, 1500);
    } catch (err: any) {
      console.error('KPI保存エラー:', err);
      setError('KPI設定の保存に失敗しました。');
    } finally {
      setIsLoading(false);
    }
  };

  // GA4プロパティ選択を保存
  const handleSaveGA4Property = async () => {
    console.log('🔵 handleSaveGA4Property呼び出し:', { user: !!user, selectedGA4Property });
    
    if (!user || !selectedGA4Property) {
      console.log('⚠️ 保存処理スキップ:', { user: !!user, selectedGA4Property });
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // 表示名形式から実際のプロパティIDを抽出
      // 形式: "サイト名 - properties/123456789"
      let propertyId = selectedGA4Property;
      let matchedProperty = null;

      // matchedGA4Propertyが既にある場合はそれを使う
      if (matchedGA4Property) {
        propertyId = matchedGA4Property.name;
        console.log('💾 既存のマッチ結果を使用:', { プロパティ名: matchedGA4Property.displayName, ID: propertyId });
      } else if (selectedGA4Property.includes(' - properties/')) {
        // datalistから選択された場合（旧形式）
        propertyId = selectedGA4Property.split(' - ')[1];
      } else {
        // 直接入力された場合、部分一致でプロパティを検索
        const searchTerm = selectedGA4Property.toLowerCase()
          .replace(/^https?:\/\//, '')  // プロトコル削除
          .replace(/^www\./, '')         // www削除
          .replace(/\/$/, '');           // 末尾スラッシュ削除
        
        console.log('🔍 検索開始:', { 入力: selectedGA4Property, 正規化: searchTerm });
        
        matchedProperty = ga4Properties.find((prop: any) => {
          const displayName = prop.displayName?.toLowerCase() || '';
          const websiteUrl = (prop.websiteUrl || '')
            .toLowerCase()
            .replace(/^https?:\/\//, '')
            .replace(/^www\./, '')
            .replace(/\/$/, '');
          const propName = prop.name?.toLowerCase() || '';
          
          const isMatch = displayName.includes(searchTerm) || 
                         websiteUrl.includes(searchTerm) || 
                         propName.includes(searchTerm);
          
          if (isMatch) {
            console.log('  ✅ マッチ:', { プロパティ: prop.displayName, URL: prop.websiteUrl });
          }
          
          return isMatch;
        });

        if (matchedProperty) {
          propertyId = matchedProperty.name;
          console.log('✅ 入力値から検出成功:', { 入力: selectedGA4Property, 検出: matchedProperty.displayName });
        } else {
          console.log('❌ 検出失敗:', { 
            入力: selectedGA4Property, 
            検索対象件数: ga4Properties.length,
            サンプル: ga4Properties.slice(0, 3).map((p: any) => ({ name: p.displayName, url: p.websiteUrl }))
          });
          setError(`「${selectedGA4Property}」に一致するプロパティが見つかりませんでした。`);
          setIsLoading(false);
          return;
        }
      }

      console.log('💾 GA4プロパティを保存:', { 入力値: selectedGA4Property, 保存値: propertyId });

      // connections.ga4.propertyIdに保存（STEP4で取得できるように）
      await UserProfileService.updateUserProfile(user.uid, {
        connections: {
          ga4: {
            propertyId: propertyId
          }
        }
      });

      console.log('✅ GA4プロパティ保存完了:', propertyId);
      // 保存成功。次のステップへの遷移はボタン側で制御
    } catch (err: any) {
      console.error('GA4プロパティ保存エラー:', err);
      setError('GA4プロパティの保存に失敗しました。');
    } finally {
      setIsLoading(false);
    }
  };

  // GSCサイト選択を保存
  const handleSaveGSCSite = async () => {
    console.log('🔵 handleSaveGSCSite呼び出し:', { user: !!user, selectedGSCSite });
    
    if (!user || !selectedGSCSite) {
      console.log('⚠️ 保存処理スキップ:', { user: !!user, selectedGSCSite });
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      let siteUrl = selectedGSCSite;

      // matchedGSCSiteが既にある場合はそれを使う
      if (matchedGSCSite) {
        siteUrl = matchedGSCSite.siteUrl;
        console.log('💾 既存のマッチ結果を使用:', { サイトURL: siteUrl });
      } else {
        // 直接入力された場合、部分一致でサイトを検索
        const searchTerm = selectedGSCSite.toLowerCase();
        const matched = gscSites.find((site: any) => 
          site.siteUrl?.toLowerCase().includes(searchTerm)
        );

        if (matched) {
          siteUrl = matched.siteUrl;
          console.log('🔍 入力値から検出:', { 入力: selectedGSCSite, 検出: siteUrl });
        } else {
          setError(`「${selectedGSCSite}」に一致するサイトが見つかりませんでした。`);
          setIsLoading(false);
          return;
        }
      }

      console.log('💾 GSCサイトを保存:', { 入力値: selectedGSCSite, 保存値: siteUrl });

      // connections.gsc.siteUrlに保存
      await UserProfileService.updateUserProfile(user.uid, {
        connections: {
          gsc: {
            siteUrl: siteUrl
          }
        }
      });

      console.log('✅ GSCサイト保存完了:', siteUrl);
      // 保存成功後は何もせず、ボタンで遷移先を選択させる
    } catch (err: any) {
      console.error('GSCサイト保存エラー:', err);
      setError('Search Consoleサイトの保存に失敗しました。');
    } finally {
      setIsLoading(false);
    }
  };

  // STEP4へ進む
  const handleGoToStep4 = async () => {
    // まず保存
    await handleSaveGSCSite();
    if (!error) {
      setCurrentStep(4);
    }
  };

  // レポート表示画面へ（STEP3から直接）
  const handleGoToSummary = async () => {
    // まず保存
    await handleSaveGSCSite();
    if (!error) {
      router.push('/summary');
    }
  };

  // 設定完了してレポートへ（STEP4から）
  const handleCompleteSettings = () => {
    router.push('/summary');
  };

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>読み込み中...</p>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-4xl p-4 md:p-6 2xl:p-10">
        {/* ページヘッダー */}
        <div className="mb-6">
          <h2 className="mb-2 text-2xl font-semibold text-dark dark:text-white">
            サイト設定
          </h2>
          <p className="text-sm font-medium text-body-color dark:text-dark-6">
            サイト情報の登録とGoogleアナリティクス、Googleサーチコンソールのアクセス権限を持つGoogleアカウントが必要になります。
          </p>
        </div>

        {/* ステップインジケーター（クリック可能） */}
        <div className="mb-6 flex items-center justify-center gap-0">
          <ArrowStep 
            active={currentStep === 1} 
            completed={currentStep > 1} 
            stepNumber="STEP1" 
            stepName="サイト情報"
            onClick={() => setCurrentStep(1)}
          />
          <ArrowStep 
            active={currentStep === 2} 
            completed={currentStep > 2} 
            stepNumber="STEP2" 
            stepName="GA4接続"
            onClick={() => setCurrentStep(2)}
          />
          <ArrowStep 
            active={currentStep === 3} 
            completed={currentStep > 3} 
            stepNumber="STEP3" 
            stepName="GSC接続"
            onClick={() => setCurrentStep(3)}
          />
          <ArrowStep 
            active={currentStep === 4} 
            completed={currentStep > 4} 
            stepNumber="STEP4" 
            stepName="コンバージョン"
            onClick={() => setCurrentStep(4)}
          />
          <ArrowStep 
            active={currentStep === 5} 
            completed={currentStep > 5} 
            stepNumber="STEP5" 
            stepName="KPI" 
            isLast
            onClick={() => setCurrentStep(5)}
          />
        </div>

        {/* エラー・成功メッセージ */}
        {error && (
          <div className="mb-6 rounded-md border-l-4 border-red-500 bg-red-50 p-4 dark:bg-red-900/20">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}
        {success && (
          <div className="mb-6 rounded-md border-l-4 border-green-500 bg-green-50 p-4 dark:bg-green-900/20">
            <p className="text-sm text-green-800 dark:text-green-200">{success}</p>
          </div>
        )}

        {/* STEP1: サイト情報 */}
        {currentStep === 1 && (
          <div className="rounded-lg border border-stroke bg-white dark:border-dark-3 dark:bg-dark-2">
            <div className="bg-gray-2 dark:bg-dark-3 px-6 py-4 rounded-t-lg border-b border-stroke dark:border-dark-3">
              <h2 className="text-xl font-semibold text-dark dark:text-white">
                STEP1：サイト情報
              </h2>
            </div>
            <div className="p-6">
            <p className="mb-5 text-sm text-body-color dark:text-dark-6">
              サイト情報では分析したいサイト名やURL、各種サイト種類やビジネス形態を入力、選択してください。
            </p>
            <div className="space-y-4">
              {/* サイト名 */}
              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-dark dark:text-white">
                  サイト名 <span className="inline-block rounded bg-red-500 px-2 py-0.5 text-xs text-white">必須</span>
                </label>
                <input
                  type="text"
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  className="w-full rounded-md border border-stroke bg-transparent px-4 py-3 text-dark outline-none focus:border-primary dark:border-dark-3 dark:text-white"
                  placeholder="例: 株式会社サンプル"
                />
              </div>

              {/* 対象URL */}
              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-dark dark:text-white">
                  対象URL <span className="inline-block rounded bg-red-500 px-2 py-0.5 text-xs text-white">必須</span>
                </label>
                <input
                  type="url"
                  value={siteUrl}
                  onChange={(e) => setSiteUrl(e.target.value)}
                  className="w-full rounded-md border border-stroke bg-transparent px-4 py-3 text-dark outline-none focus:border-primary dark:border-dark-3 dark:text-white"
                  placeholder="https://example.com"
                />
              </div>

              {/* サイト種類 */}
              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-dark dark:text-white">
                  サイト種類 <span className="inline-block rounded bg-red-500 px-2 py-0.5 text-xs text-white">必須</span>
                </label>
                <select
                  value={siteType}
                  onChange={(e) => setSiteType(e.target.value)}
                  className="w-full rounded-md border border-stroke bg-transparent px-4 py-3 text-dark outline-none focus:border-primary dark:border-dark-3 dark:text-white"
                >
                  <option value="">選択してください</option>
                  {SITE_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* ビジネス形態 */}
              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-dark dark:text-white">
                  ビジネス形態 <span className="inline-block rounded bg-red-500 px-2 py-0.5 text-xs text-white">必須</span>
                </label>
                <select
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                  className="w-full rounded-md border border-stroke bg-transparent px-4 py-3 text-dark outline-none focus:border-primary dark:border-dark-3 dark:text-white"
                >
                  <option value="">選択してください</option>
                  {BUSINESS_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="!mt-8 flex justify-end">
                <button
                  onClick={handleSaveStep1}
                  disabled={isLoading}
                  className="rounded-md bg-primary px-8 py-3 text-white hover:bg-opacity-90 disabled:opacity-50"
                >
                  {isLoading ? '保存中...' : '次へ'}
                </button>
              </div>
            </div>
            </div>
          </div>
        )}

        {/* STEP2: Google Analytics */}
        {currentStep === 2 && (
          <div className="rounded-lg border border-stroke bg-white dark:border-dark-3 dark:bg-dark-2">
            <div className="bg-gray-2 dark:bg-dark-3 px-6 py-4 rounded-t-lg border-b border-stroke dark:border-dark-3">
              <h2 className="text-xl font-semibold text-dark dark:text-white">
                STEP2：Google Analytics
              </h2>
            </div>
            <div className="p-6">
            <p className="mb-5 text-sm text-body-color dark:text-dark-6">
              Googleアナリティクスを登録しているアカウントから分析したいレポートを選択してください。<br />
              ※STEP1で入力した対象URLが設定されている場合は自動で連携します。
            </p>

            {isGA4Connected ? (
              <div className="space-y-4">
                {/* GA4プロパティ選択 */}
                {ga4Properties.length > 0 && (
                  <div>
                    <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                      GA4プロパティを選択または入力
                    </label>
                    <div className="relative">
                      <input
                      ref={ga4InputRef}
                      type="text"
                      value={selectedGA4Property}
                      onFocus={() => {
                        setShowGA4Dropdown(true);
                        setFilteredGA4Properties(ga4Properties.slice(0, 50));
                        
                        // 入力フィールドの位置を計算（上に表示）
                        if (ga4InputRef.current) {
                          const rect = ga4InputRef.current.getBoundingClientRect();
                          // ドロップダウンの最大高さを400pxに変更
                          const dropdownMaxHeight = 400;
                          setDropdownPosition({
                            top: rect.top + window.scrollY - dropdownMaxHeight - 8, // 上に配置（8pxの余白）
                            left: rect.left + window.scrollX,
                            width: rect.width
                          });
                        }
                      }}
                      onBlur={() => {
                        // 少し遅延させてクリックイベントを処理できるようにする
                        setTimeout(() => setShowGA4Dropdown(false), 200);
                      }}
                      onChange={(e) => {
                        const inputValue = e.target.value;
                        console.log('📝 入力値変更:', inputValue);
                        setSelectedGA4Property(inputValue);
                        setShowGA4Dropdown(true);
                        
                        // リアルタイムでマッチング検索とフィルタリング
                        if (inputValue && !inputValue.includes(' - properties/')) {
                          const searchTerm = inputValue.toLowerCase()
                            .replace(/^https?:\/\//, '')
                            .replace(/^www\./, '')
                            .replace(/\/$/, '');
                          
                          const filtered = ga4Properties.filter((prop: any) => {
                            const displayName = prop.displayName?.toLowerCase() || '';
                            const websiteUrl = (prop.websiteUrl || '')
                              .toLowerCase()
                              .replace(/^https?:\/\//, '')
                              .replace(/^www\./, '')
                              .replace(/\/$/, '');
                            const propName = prop.name?.toLowerCase() || '';
                            
                            return displayName.includes(searchTerm) || 
                                   websiteUrl.includes(searchTerm) || 
                                   propName.includes(searchTerm);
                          }).slice(0, 50);
                          
                          setFilteredGA4Properties(filtered);
                          setMatchedGA4Property(filtered[0] || null);
                        } else {
                          setFilteredGA4Properties(ga4Properties.slice(0, 50));
                          setMatchedGA4Property(null);
                        }
                      }}
                      className="w-full rounded-md border border-stroke bg-transparent px-4 py-3 text-dark outline-none focus:border-primary dark:border-dark-3 dark:text-white"
                      placeholder="プロパティを選択または入力してください"
                    />
                    
                    {/* カスタムドロップダウン */}
                    {showGA4Dropdown && filteredGA4Properties.length > 0 && (
                      <div 
                        className="fixed z-50 max-h-[400px] overflow-auto rounded-md border border-stroke bg-white shadow-lg dark:border-dark-3 dark:bg-dark-2"
                        style={{
                          top: `${dropdownPosition.top}px`,
                          left: `${dropdownPosition.left}px`,
                          width: `${dropdownPosition.width}px`
                        }}
                      >
                        {filteredGA4Properties.map((property) => (
                          <button
                            key={property.name}
                            type="button"
                            onClick={() => {
                              // プロパティ名のみを表示（IDは内部で保持）
                              setSelectedGA4Property(property.displayName);
                              setMatchedGA4Property(property);
                              setShowGA4Dropdown(false);
                            }}
                            className="w-full border-b border-stroke px-3 py-2 text-left hover:bg-gray-2 dark:border-dark-3 dark:hover:bg-dark-3"
                          >
                            <div className="text-sm font-medium text-dark dark:text-white">
                              {property.displayName}
                            </div>
                            {property.websiteUrl && (
                              <div className="mt-0.5 text-xs text-body-color dark:text-dark-6">
                                {property.websiteUrl}
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                    </div>
                    
                    {/* マッチしない場合の警告 */}
                    {selectedGA4Property && 
                     !selectedGA4Property.includes(' - properties/') && 
                     !matchedGA4Property && 
                     selectedGA4Property.length > 2 && (
                      <div className="mt-2 rounded-md bg-yellow-50 p-3 dark:bg-yellow-900/20">
                        <div className="flex items-start gap-2">
                          <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-600 dark:text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                              ⚠ 一致するプロパティが見つかりません
                            </p>
                            <p className="mt-1 text-xs text-yellow-700 dark:text-yellow-400">
                              プロパティ名、URL、またはIDの一部を入力してください
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {!selectedGA4Property && (
                      <p className="mt-2 text-sm text-body-color dark:text-dark-6">
                        {ga4Properties.length}件のプロパティが見つかりました
                      </p>
                    )}
                  </div>
                )}

                {/* 接続済みメッセージと解除ボタン */}
                <div className="flex items-center justify-between gap-3 rounded-md bg-green-50 p-4 dark:bg-green-900/20">
                  <div className="flex items-center gap-3">
                    <svg className="h-6 w-6 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <p className="text-sm font-medium text-green-800 dark:text-green-200">
                      Google Analyticsに接続済みです
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setIsGA4Connected(false);
                      setGa4Properties([]);
                      setSelectedGA4Property('');
                    }}
                    className="rounded-md border border-red-500 bg-white px-4 py-2 text-sm font-medium text-dark hover:bg-red-50 dark:border-red-400 dark:bg-dark-2 dark:text-white dark:hover:bg-red-900/20"
                  >
                    接続を解除
                  </button>
                </div>

                <div className="!mt-8 flex justify-between">
                  <button
                    onClick={() => setCurrentStep(1)}
                    className="rounded-md border border-stroke px-6 py-3 text-dark hover:bg-gray-2 dark:border-dark-3 dark:text-white"
                  >
                    戻る
                  </button>
                  <button
                    onClick={async () => {
                      await handleSaveGA4Property();
                      if (!error) {
                        setCurrentStep(3);
                      }
                    }}
                    disabled={!selectedGA4Property || isLoading}
                    className="rounded-md bg-primary px-6 py-3 text-white hover:bg-opacity-90 disabled:opacity-50"
                  >
                    {isLoading ? '保存中...' : '次へ'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-body-color dark:text-dark-6">
                  Google Analyticsと連携して、サイトのアクセス解析データを取得します。
                </p>

                <button
                  onClick={handleConnectGA4}
                  disabled={isLoading}
                  className="flex w-full items-center justify-center gap-3 rounded-md border-2 border-stroke bg-white px-6 py-4 hover:bg-gray-2 disabled:opacity-50 dark:border-dark-3 dark:bg-dark-2"
                >
                  <svg className="h-6 w-6" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span className="font-medium text-dark dark:text-white">
                    {isLoading ? '接続中...' : 'Googleアカウントで認証'}
                  </span>
                </button>

                <div className="mt-6 flex justify-between">
                  <button
                    onClick={() => setCurrentStep(1)}
                    className="rounded-md border border-stroke px-6 py-3 text-dark hover:bg-gray-2 dark:border-dark-3 dark:text-white"
                  >
                    戻る
                  </button>
                </div>
              </div>
            )}
            </div>
          </div>
        )}

        {/* STEP3: Search Console */}
        {currentStep === 3 && (
          <div className="rounded-lg border border-stroke bg-white dark:border-dark-3 dark:bg-dark-2">
            <div className="bg-gray-2 dark:bg-dark-3 px-6 py-4 rounded-t-lg border-b border-stroke dark:border-dark-3">
              <h2 className="text-xl font-semibold text-dark dark:text-white">
                STEP3：Search Console
              </h2>
            </div>
            <div className="p-6">
            <p className="mb-5 text-sm text-body-color dark:text-dark-6">
              Searchconsoleをを登録しているアカウントから分析したいレポートを選択してください。<br />
              ※Searchconsoleが未登録の場合は、未入力のまま「次へ」を選択してください。
            </p>

            {isGSCConnected ? (
              <div className="space-y-4">
                {/* GSCサイト選択 */}
                {gscSites.length > 0 && (
                  <div>
                    <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                      Search Consoleサイトを選択または入力
                    </label>
                    <div className="relative">
                      <input
                        ref={gscInputRef}
                        type="text"
                        value={selectedGSCSite}
                        onFocus={() => {
                          setShowGSCDropdown(true);
                          setFilteredGSCSites(gscSites.slice(0, 50));
                          
                          // 入力フィールドの位置を計算（上に表示）
                          if (gscInputRef.current) {
                            const rect = gscInputRef.current.getBoundingClientRect();
                            const dropdownMaxHeight = 400;
                            setGscDropdownPosition({
                              top: rect.top + window.scrollY - dropdownMaxHeight - 8,
                              left: rect.left + window.scrollX,
                              width: rect.width
                            });
                          }
                        }}
                        onBlur={() => {
                          setTimeout(() => setShowGSCDropdown(false), 200);
                        }}
                        onChange={(e) => {
                          const inputValue = e.target.value;
                          setSelectedGSCSite(inputValue);
                          setShowGSCDropdown(true);
                          
                          // リアルタイムでマッチング検索とフィルタリング
                          if (inputValue) {
                            const searchTerm = inputValue.toLowerCase();
                            
                            const filtered = gscSites.filter((site: any) => {
                              const siteUrl = site.siteUrl?.toLowerCase() || '';
                              return siteUrl.includes(searchTerm);
                            }).slice(0, 50);
                            
                            setFilteredGSCSites(filtered);
                            
                            // 完全一致または部分一致するサイトを探す
                            const exactMatch = gscSites.find((site: any) => 
                              site.siteUrl?.toLowerCase() === inputValue.toLowerCase()
                            );
                            const partialMatch = filtered[0];
                            
                            setMatchedGSCSite(exactMatch || partialMatch || null);
                          } else {
                            setFilteredGSCSites(gscSites.slice(0, 50));
                            setMatchedGSCSite(null);
                          }
                        }}
                        className="w-full rounded-md border border-stroke bg-transparent px-4 py-3 text-dark outline-none focus:border-primary dark:border-dark-3 dark:text-white"
                        placeholder="サイトを選択または入力してください"
                      />
                      
                      {/* カスタムドロップダウン */}
                      {showGSCDropdown && filteredGSCSites.length > 0 && (
                        <div 
                          className="fixed z-50 max-h-[400px] overflow-auto rounded-md border border-stroke bg-white shadow-lg dark:border-dark-3 dark:bg-dark-2"
                          style={{
                            top: `${gscDropdownPosition.top}px`,
                            left: `${gscDropdownPosition.left}px`,
                            width: `${gscDropdownPosition.width}px`
                          }}
                        >
                          {filteredGSCSites.map((site) => (
                            <button
                              key={site.siteUrl}
                              type="button"
                              onClick={() => {
                                setSelectedGSCSite(site.siteUrl);
                                setMatchedGSCSite(site);
                                setShowGSCDropdown(false);
                              }}
                              className="w-full border-b border-stroke px-3 py-2 text-left hover:bg-gray-2 dark:border-dark-3 dark:hover:bg-dark-3"
                            >
                              <div className="text-sm font-medium text-dark dark:text-white">
                                {site.siteUrl}
                              </div>
                              <div className="mt-0.5 text-xs text-body-color dark:text-dark-6">
                                {site.permissionLevel}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {/* マッチしない場合の警告 */}
                    {selectedGSCSite && 
                     !matchedGSCSite && 
                     selectedGSCSite.length > 2 && (
                      <div className="mt-2 rounded-md bg-yellow-50 p-3 dark:bg-yellow-900/20">
                        <div className="flex items-start gap-2">
                          <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-600 dark:text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                              ⚠ 一致するサイトが見つかりません
                            </p>
                            <p className="mt-1 text-xs text-yellow-700 dark:text-yellow-400">
                              サイトURLの一部を入力してください
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {!selectedGSCSite && (
                      <p className="mt-2 text-sm text-body-color dark:text-dark-6">
                        {gscSites.length}件のサイトが見つかりました
                      </p>
                    )}
                  </div>
                )}

                {/* 接続済みメッセージと解除ボタン */}
                <div className="flex items-center justify-between gap-3 rounded-md bg-green-50 p-4 dark:bg-green-900/20">
                  <div className="flex items-center gap-3">
                    <svg className="h-6 w-6 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <p className="text-sm font-medium text-green-800 dark:text-green-200">
                      Search Consoleに接続済みです
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setIsGSCConnected(false);
                      setGscSites([]);
                      setSelectedGSCSite('');
                    }}
                    className="rounded-md border border-red-500 bg-white px-4 py-2 text-sm font-medium text-dark hover:bg-red-50 dark:border-red-400 dark:bg-dark-2 dark:text-white dark:hover:bg-red-900/20"
                  >
                    接続を解除
                  </button>
                </div>

                <div className="!mt-8 flex items-center justify-between gap-4">
                  <button
                    onClick={() => setCurrentStep(2)}
                    className="rounded-md border border-stroke px-6 py-3 text-dark hover:bg-gray-2 dark:border-dark-3 dark:text-white"
                  >
                    戻る
                  </button>
                  <button
                    onClick={handleGoToStep4}
                    disabled={!selectedGSCSite || isLoading}
                    className="rounded-md bg-primary px-6 py-3 text-white hover:bg-opacity-90 disabled:opacity-50"
                  >
                    {isLoading ? '保存中...' : '次へ'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-body-color dark:text-dark-6">
                  Search Consoleと連携して、検索キーワードやクリック数などのデータを取得します。
                </p>
                <p className="text-sm text-body-color dark:text-dark-6">
                  ※ Search ConsoleのアカウントがGoogle Analyticsと異なる場合は、別途認証を行ってください。
                </p>

                <button
                  onClick={handleConnectGSC}
                  disabled={isLoading}
                  className="flex w-full items-center justify-center gap-3 rounded-md border-2 border-stroke bg-white px-6 py-4 hover:bg-gray-2 disabled:opacity-50 dark:border-dark-3 dark:bg-dark-2"
                >
                  <svg className="h-6 w-6" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span className="font-medium text-dark dark:text-white">
                    {isLoading ? '接続中...' : 'Googleアカウントで認証'}
                  </span>
                </button>

                <div className="mt-6 flex justify-between">
                  <button
                    onClick={() => setCurrentStep(2)}
                    className="rounded-md border border-stroke px-6 py-3 text-dark hover:bg-gray-2 dark:border-dark-3 dark:text-white"
                  >
                    戻る
                  </button>
                  <button
                    onClick={handleGoToSummary}
                    className="rounded-md bg-gray-3 px-6 py-3 text-body-color dark:bg-dark-3 dark:text-dark-6"
                  >
                    スキップ
                  </button>
                </div>
              </div>
            )}
            </div>
          </div>
        )}

        {/* STEP4: コンバージョン設定 */}
        {currentStep === 4 && (
          <div className="rounded-lg border border-stroke bg-white dark:border-dark-3 dark:bg-dark-2">
            <div className="bg-gray-2 dark:bg-dark-3 px-6 py-4 rounded-t-lg border-b border-stroke dark:border-dark-3">
              <h2 className="text-xl font-semibold text-dark dark:text-white">
                STEP4：コンバージョン設定（任意）
              </h2>
            </div>
            <div className="p-6">
              {/* コンバージョン設定 */}
              {(
                <div className="space-y-6">
                  {/* イベント取得 */}
                  <div>
                    <h3 className="mb-3 text-lg font-semibold text-dark dark:text-white">
                      コンバージョンを取得
                    </h3>
                    <p className="mb-4 text-sm text-body-color dark:text-dark-6">
                      過去30日間に発生したGA4のイベントを取得して、コンバージョンとして設定できます。<br />
                      ※イベント登録やコンバージョン（目標）が不要な場合は、未入力のまま「次へ」を選択してください。
                    </p>
                    {!selectedPropertyId && (
                      <div className="mb-4 rounded-md bg-yellow-50 p-3 dark:bg-yellow-900/20">
                        <p className="text-sm text-yellow-800 dark:text-yellow-200">
                          ⚠️ GA4プロパティが設定されていません。
                        </p>
                      </div>
                    )}
                    <button
                      onClick={handleFetchEvents}
                      disabled={isLoadingEvents || !selectedPropertyId}
                      className="rounded-md bg-primary px-6 py-3 text-white hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isLoadingEvents ? 'コンバージョン取得中...' : 'コンバージョンを取得'}
                    </button>
                  </div>

                  {/* イベント一覧（検索可能ドロップダウン） */}
                  {ga4Events.length > 0 && (
                    <div>
                      <h3 className="mb-3 text-lg font-semibold text-dark dark:text-white">
                        利用可能なイベント
                      </h3>
                      <p className="mb-3 text-sm text-body-color dark:text-dark-6">
                        {ga4Events.length}件のイベントが見つかりました。イベント名を検索してコンバージョンとして追加できます。
                      </p>
                      
                      <div className="relative">
                        <input
                          ref={eventInputRef}
                          type="text"
                          value={eventSearchTerm}
                          onFocus={() => {
                            setShowEventDropdown(true);
                            setFilteredEvents(ga4Events.slice(0, 50));
                            
                            // ドロップダウンの位置を計算
                            if (eventInputRef.current) {
                              const rect = eventInputRef.current.getBoundingClientRect();
                              setEventDropdownPosition({
                                top: rect.top - 410, // ドロップダウンを上に表示
                                left: rect.left,
                                width: rect.width
                              });
                            }
                          }}
                          onBlur={() => {
                            setTimeout(() => setShowEventDropdown(false), 200);
                          }}
                          onChange={(e) => {
                            const searchValue = e.target.value;
                            setEventSearchTerm(searchValue);
                            
                            if (searchValue) {
                              const filtered = ga4Events.filter((event) =>
                                event.eventName.toLowerCase().includes(searchValue.toLowerCase())
                              ).slice(0, 50);
                              setFilteredEvents(filtered);
                            } else {
                              setFilteredEvents(ga4Events.slice(0, 50));
                            }
                          }}
                          className="w-full rounded-md border border-stroke bg-transparent px-4 py-3 text-dark outline-none focus:border-primary dark:border-dark-3 dark:text-white"
                          placeholder="イベント名を検索..."
                        />
                        
                        {/* カスタムドロップダウン */}
                        {showEventDropdown && filteredEvents.length > 0 && (
                          <div 
                            className="fixed z-50 max-h-[400px] overflow-auto rounded-md border border-stroke bg-white shadow-lg dark:border-dark-3 dark:bg-dark-2"
                            style={{
                              top: `${eventDropdownPosition.top}px`,
                              left: `${eventDropdownPosition.left}px`,
                              width: `${eventDropdownPosition.width}px`
                            }}
                          >
                            {filteredEvents.map((event) => {
                              const isSelected = selectedConversions.some(
                                (c) => c.eventName === event.eventName
                              );
                              return (
                                <div
                                  key={event.eventName}
                                  className="flex items-center justify-between border-b border-stroke px-3 py-2 hover:bg-gray-2 dark:border-dark-3 dark:hover:bg-dark-3"
                                >
                                  <div className="flex-1">
                                    <div className="text-sm font-medium text-dark dark:text-white">
                                      {event.eventName}
                                    </div>
                                    <div className="mt-0.5 text-xs text-body-color dark:text-dark-6">
                                      発生回数: {event.eventCount.toLocaleString()}
                                    </div>
                                  </div>
                                  {isSelected ? (
                                    <span className="ml-2 rounded bg-green-500 px-2 py-1 text-xs text-white">
                                      追加済み
                                    </span>
                                  ) : (
                                    <button
                                      onMouseDown={(e) => {
                                        e.preventDefault(); // onBlurの発火を防ぐ
                                      }}
                                      onClick={() => {
                                        handleAddConversion(event.eventName);
                                        // ドロップダウンは閉じない、検索フィールドもクリアしない
                                      }}
                                      className="ml-2 rounded bg-primary px-3 py-1 text-xs text-white hover:bg-opacity-90"
                                    >
                                      追加
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 定義済みコンバージョン */}
                  <div>
                    <h3 className="mb-3 text-lg font-semibold text-dark dark:text-white">
                      定義済みコンバージョン
                    </h3>
                    {selectedConversions.length === 0 ? (
                      <p className="text-sm text-body-color dark:text-dark-6">
                        まだコンバージョンが定義されていません。
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {selectedConversions.map((conversion) => (
                          <div
                            key={conversion.id || conversion.eventName}
                            className="flex items-center justify-between rounded-md border border-stroke bg-white px-4 py-3 dark:border-dark-3 dark:bg-dark-2"
                          >
                            <p className="font-medium text-dark dark:text-white">
                              {conversion.displayName || conversion.eventName}
                            </p>
                            <button
                              onClick={() => handleRemoveConversion(conversion.id!)}
                              disabled={isLoading}
                              className="rounded-md border border-red-500 bg-white px-3 py-1 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50 dark:bg-dark-2 dark:text-red-400"
                            >
                              削除
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* STEP4のボタン */}
              <div className="mt-8 flex items-center justify-between gap-4">
                <button
                  onClick={() => setCurrentStep(3)}
                  className="rounded-md border border-stroke px-6 py-3 text-dark hover:bg-gray-2 dark:border-dark-3 dark:text-white"
                >
                  戻る
                </button>
                <button
                  onClick={() => setCurrentStep(5)}
                  className="rounded-md bg-primary px-8 py-3 text-white hover:bg-opacity-90"
                >
                  次へ
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP5: KPI設定 */}
        {currentStep === 5 && (
          <div className="rounded-lg border border-stroke bg-white dark:border-dark-3 dark:bg-dark-2">
            <div className="bg-gray-2 dark:bg-dark-3 px-6 py-4 rounded-t-lg border-b border-stroke dark:border-dark-3">
              <h2 className="text-xl font-semibold text-dark dark:text-white">
                STEP5：KPI設定（任意）
              </h2>
            </div>
            <div className="p-6">
            <p className="mb-5 text-sm text-body-color dark:text-dark-6">
              目標KPI設定では、ユーザー数やコンバージョン数などの各種指標を目標設定することが可能です。<br />
              ※目標KPI設定が不要な場合は、未入力のまま「保存」を選択してください。
            </p>

              {/* アコーディオン: KPI設定 */}
              <div className="space-y-4">
                <button
                  onClick={() => setShowKpiForm(!showKpiForm)}
                  className="flex w-full items-center justify-between rounded-md border border-stroke bg-gray-2 px-4 py-3 text-left hover:bg-gray-3 dark:border-dark-3 dark:bg-dark dark:hover:bg-dark-2"
                >
                  <span className="font-medium text-dark dark:text-white">
                    KPI設定
                  </span>
                  <svg
                    className={`h-5 w-5 transition-transform ${showKpiForm ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showKpiForm && (
                  <div className="space-y-4 rounded-md border border-stroke bg-white p-4 dark:border-dark-3 dark:bg-dark-2">
                    {/* 目標選択と数値入力 */}
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                          目標
                        </label>
                        <select
                          value={selectedMetric}
                          onChange={(e) => setSelectedMetric(e.target.value)}
                          className="w-full rounded-md border border-stroke bg-transparent px-4 py-3 text-dark outline-none focus:border-primary dark:border-dark-3 dark:text-white"
                        >
                          <option value="">選択してください</option>
                          <optgroup label="基本指標">
                            {KPI_METRICS.map((metric) => (
                              <option key={metric.value} value={metric.value}>
                                {metric.label}
                              </option>
                            ))}
                          </optgroup>
                          {selectedConversions.length > 0 && (
                            <optgroup label="コンバージョン">
                              {selectedConversions.map((conversion) => (
                                <option key={`conv_${conversion.eventName}`} value={`conversion_${conversion.eventName}`}>
                                  {conversion.displayName || conversion.eventName}
                                </option>
                              ))}
                            </optgroup>
                          )}
                        </select>
                      </div>
                      <div className="flex-1">
                        <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                          目標値（月間）
                        </label>
                        <input
                          type="number"
                          step={selectedMetric && selectedMetric.includes('Rate') ? '0.1' : '1'}
                          value={selectedTargetValue}
                          onChange={(e) => setSelectedTargetValue(e.target.value)}
                          className="w-full rounded-md border border-stroke bg-transparent px-4 py-3 text-dark outline-none focus:border-primary dark:border-dark-3 dark:text-white"
                          placeholder="数値を入力"
                        />
                      </div>
                      <div className="flex items-end">
                        <button
                          onClick={handleAddKPI}
                          disabled={!selectedMetric || !selectedTargetValue}
                          className="rounded-md bg-primary px-6 py-3 text-white hover:bg-opacity-90 disabled:opacity-50"
                        >
                          追加
                        </button>
                      </div>
                    </div>

                    {/* 登録済みKPI一覧 */}
                    {kpiSettings.length > 0 && (
                      <div>
                        <h3 className="mb-3 text-lg font-semibold text-dark dark:text-white">
                          登録済みKPI
                        </h3>
                        <div className="space-y-3">
                          {kpiSettings.map((kpi) => {
                            // 基本指標またはコンバージョンのラベルを取得
                            let metricLabel = KPI_METRICS.find(m => m.value === kpi.metric)?.label;
                            
                            if (!metricLabel && kpi.metric.startsWith('conversion_')) {
                              const eventName = kpi.metric.replace('conversion_', '');
                              const conversion = selectedConversions.find(c => c.eventName === eventName);
                              metricLabel = conversion?.displayName || conversion?.eventName || eventName;
                            }
                            
                            metricLabel = metricLabel || kpi.metric;
                            
                            return (
                              <div
                                key={kpi.id}
                                className="flex items-center justify-between rounded-md border border-stroke bg-white px-4 py-3 dark:border-dark-3 dark:bg-dark-2"
                              >
                                <div>
                                  <p className="font-medium text-dark dark:text-white">
                                    {metricLabel}
                                  </p>
                                  <p className="mt-1 text-sm text-body-color dark:text-dark-6">
                                    目標値（月間）: {kpi.targetValue}
                                  </p>
                                </div>
                                <button
                                  onClick={() => handleRemoveKPI(kpi.id)}
                                  disabled={isLoading}
                                  className="rounded-md border border-red-500 bg-white px-3 py-1 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50 dark:bg-dark-2 dark:text-red-400"
                                >
                                  削除
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* STEP5のボタン */}
              <div className="mt-8 flex items-center justify-between gap-4">
                <button
                  onClick={() => setCurrentStep(4)}
                  className="rounded-md border border-stroke px-6 py-3 text-dark hover:bg-gray-2 dark:border-dark-3 dark:text-white"
                >
                  戻る
                </button>
                <button
                  onClick={handleSaveKPI}
                  disabled={isLoading}
                  className="rounded-md bg-primary px-8 py-3 text-white hover:bg-opacity-90 disabled:opacity-50"
                >
                  {isLoading ? '保存中...' : '保存'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

// 矢印形式のステップインジケーター（クリック可能）
const ArrowStep = ({ 
  active, 
  completed, 
  stepNumber, 
  stepName, 
  isLast,
  onClick
}: { 
  active: boolean; 
  completed: boolean; 
  stepNumber: string; 
  stepName: string; 
  isLast?: boolean;
  onClick?: () => void;
}) => {
  const bgColor = active 
    ? 'bg-primary dark:bg-primary' 
    : completed 
    ? 'bg-primary dark:bg-primary' 
    : 'bg-[#B8C9E8] dark:bg-[#B8C9E8]';
  
  const textColor = 'text-white dark:text-white';

  return (
    <div className="relative flex items-center" style={{ width: '280px' }}>
      {/* メインボックス */}
      <div 
        onClick={onClick}
        className={`${bgColor} ${textColor} relative z-10 flex h-16 w-full items-center justify-center transition-colors ${
          onClick ? 'cursor-pointer hover:opacity-90' : ''
        }`}
        style={{
          clipPath: isLast 
            ? 'polygon(0 0, calc(100% - 20px) 0, 100% 50%, calc(100% - 20px) 100%, 0 100%, 20px 50%)'
            : 'polygon(0 0, calc(100% - 20px) 0, 100% 50%, calc(100% - 20px) 100%, 0 100%, 20px 50%)'
        }}
      >
        <div className="text-center" style={{ marginLeft: isLast ? '0' : '10px', marginRight: '10px' }}>
          <div className="text-sm font-bold">
            {stepNumber}
          </div>
          <div className="text-xs font-medium mt-1">
            {stepName}
          </div>
        </div>
      </div>
    </div>
  );
};

