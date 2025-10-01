'use client';

import React from 'react';
import {
  MDBContainer,
  MDBRow,
  MDBCol,
  MDBCard,
  MDBCardBody,
  MDBCardTitle,
  MDBCardText,
  MDBBtn,
  MDBIcon,
  MDBBadge,
  MDBNavbar,
  MDBNavbarBrand,
  MDBNavbarNav,
  MDBNavbarItem
} from 'mdb-react-ui-kit';
import { useAuth } from '@/lib/auth/authContext';
import UserProfile from '@/components/auth/UserProfile';
import UnifiedGoogleConnection from '@/components/api/UnifiedGoogleConnection';
import PropertySelector from '@/components/api/PropertySelector';
import ReportSelector, { GA4ReportType } from '@/components/analysis/ReportSelector';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { GA4Property } from '@/lib/api/googleAnalytics';
import { FirestoreService, GA4PropertiesData, GSCSitesData } from '@/lib/firebase/firestoreService';
import { Unsubscribe } from 'firebase/firestore';

// GSCSite型を直接定義
export interface GSCSite {
  siteUrl: string;
  permissionLevel: string;
}

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [ga4Properties, setGA4Properties] = useState<GA4Property[]>([]);
  const [gscSites, setGscSites] = useState<GSCSite[]>([]);
  const [isUnifiedConnected, setIsUnifiedConnected] = useState(false);
  const [selectedGA4Property, setSelectedGA4Property] = useState<GA4Property | null>(null);
  const [selectedGSCSite, setSelectedGSCSite] = useState<GSCSite | null>(null);
  const [selectedGA4Reports, setSelectedGA4Reports] = useState<GA4ReportType[]>([]);
  const [showPropertySelector, setShowPropertySelector] = useState(false);
  const [showReportSelector, setShowReportSelector] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
      return;
    }
  }, [user, loading, router]);

  // 🔥 Firestore リアルタイム監視（LocalStorage置き換え）
  useEffect(() => {
    if (!user?.uid) return;

    console.log('🔧 Firestore リアルタイム監視開始:', { userId: user.uid });

    // GA4プロパティのリアルタイム監視
    const unsubscribeGA4 = FirestoreService.subscribeToGA4Properties(
      user.uid,
      (ga4Data: GA4PropertiesData | null) => {
        if (ga4Data) {
          console.log('🔧 Firestore GA4データ更新:', {
            count: ga4Data.properties.length,
            total: ga4Data.metadata.totalCount,
            isPartial: ga4Data.cache.isPartial
          });
          setGA4Properties(ga4Data.properties);
          setIsUnifiedConnected(true);
        } else {
          console.log('📝 Firestore GA4データなし');
          setGA4Properties([]);
        }
      }
    );

    // GSCサイトのリアルタイム監視
    const unsubscribeGSC = FirestoreService.subscribeToGSCSites(
      user.uid,
      (gscData: GSCSitesData | null) => {
        if (gscData) {
          console.log('🔧 Firestore GSCデータ更新:', {
            count: gscData.sites.length,
            total: gscData.metadata.totalCount
          });
          setGscSites(gscData.sites);
          setIsUnifiedConnected(true);
        } else {
          console.log('📝 Firestore GSCデータなし');
          setGscSites([]);
        }
      }
    );

    // クリーンアップ関数
    return () => {
      console.log('🔧 Firestore リアルタイム監視終了');
      unsubscribeGA4();
      unsubscribeGSC();
    };
  }, [user?.uid]);

  // OAuth成功後の処理（Cookie方式）
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const unifiedSuccess = urlParams.get('unified_oauth_success');
    const ga4Count = urlParams.get('ga4_count');
    const gscCount = urlParams.get('gsc_count');

    if (unifiedSuccess === 'true') {
      console.log('🎉 統合OAuth成功を検出:', { ga4Count, gscCount });
      setIsUnifiedConnected(true);
      
      // CookieからGA4プロパティデータを復元
      try {
        console.log('🔧 全Cookie確認:', document.cookie);
        const ga4PropertiesCookie = document.cookie
          .split('; ')
          .find(row => row.startsWith('unified_ga4_properties='));
        
        console.log('🔧 GA4 Cookie検索結果:', ga4PropertiesCookie);
        
        if (ga4PropertiesCookie) {
          const cookieValue = ga4PropertiesCookie.split('=')[1];
          console.log('🔧 GA4 Cookie生値:', cookieValue);
          const ga4PropertiesData = JSON.parse(decodeURIComponent(cookieValue));
          console.log('🔧 Cookie GA4データ復元:', { count: ga4PropertiesData.length });
          setGA4Properties(ga4PropertiesData);
        } else {
          console.log('❌ GA4 Cookieが見つかりません');
        }
      } catch (error) {
        console.error('❌ GA4 Cookieデータ復元エラー:', error);
      }

      // CookieからGSCサイトデータを復元
      try {
        const gscSitesCookie = document.cookie
          .split('; ')
          .find(row => row.startsWith('unified_gsc_sites='));
        
        console.log('🔧 GSC Cookie検索結果:', gscSitesCookie);
        
        if (gscSitesCookie) {
          const cookieValue = gscSitesCookie.split('=')[1];
          console.log('🔧 GSC Cookie生値:', cookieValue);
          const gscSitesData = JSON.parse(decodeURIComponent(cookieValue));
          console.log('🔧 Cookie GSCデータ復元:', { count: gscSitesData.length });
          setGscSites(gscSitesData);
        } else {
          console.log('❌ GSC Cookieが見つかりません');
        }
      } catch (error) {
        console.error('❌ GSC Cookieデータ復元エラー:', error);
      }

      // URLをクリーンアップ
      window.history.replaceState({}, document.title, '/dashboard');
    }
  }, []);

  // 統合Google OAuth用ハンドラー
  const handleUnifiedConnectionSuccess = (data: { ga4Count: number; gscCount: number }) => {
    console.log('🎉 統合Google接続成功:', data);
    setIsUnifiedConnected(true);
    
    // LocalStorageから統合データを復元
    try {
      const savedConnections = localStorage.getItem('growreporter_connections');
      if (savedConnections) {
        const connections = JSON.parse(savedConnections);
        if (connections.unifiedGoogle) {
          setGA4Properties(connections.unifiedGoogle.ga4Properties || []);
          setGscSites(connections.unifiedGoogle.gscSites || []);
        }
      }
    } catch (error) {
      console.error('接続状態の復元エラー:', error);
    }
  };

  const handleUnifiedConnectionError = (error: string) => {
    console.error('統合Google接続エラー:', error);
    alert(`統合Google接続エラー: ${error}`);
  };

  const handleUnifiedDisconnect = async () => {
    if (!user?.uid) return;

    try {
      console.log('🔧 統合OAuth切断開始:', { userId: user.uid });
      
      // Firestoreからデータを削除
      await FirestoreService.clearUserOAuthData(user.uid);
      
      // ローカル状態をクリア
      setIsUnifiedConnected(false);
      setGA4Properties([]);
      setGscSites([]);
      setSelectedGA4Property(null);
      setSelectedGSCSite(null);
      
      // LocalStorageもクリア（移行期間中の互換性のため）
      localStorage.removeItem('growreporter_faro_connections');
      
      // 統合OAuthのCookieも削除
      document.cookie = 'unified_access_token=; Max-Age=0; path=/';
      document.cookie = 'unified_refresh_token=; Max-Age=0; path=/';
      document.cookie = 'unified_oauth_status=; Max-Age=0; path=/';
      
      console.log('✅ Firestore統合OAuth切断完了');
      
    } catch (error) {
      console.error('❌ 統合OAuth切断エラー:', error);
      alert('切断中にエラーが発生しました。ページを再読み込みしてください。');
    }
  };

  // プロパティ選択完了時の処理（Firestore対応）
  const handlePropertySelectionConfirm = async (selectedGA4: GA4Property | null, selectedGSC: GSCSite | null) => {
    setSelectedGA4Property(selectedGA4);
    setSelectedGSCSite(selectedGSC);

    console.log('✅ プロパティ選択完了:', { 
      ga4: selectedGA4?.displayName || 'なし',
      gsc: selectedGSC?.siteUrl || 'なし'
    });
    
    // Firestoreの選択状態を更新
    if (user?.uid) {
      try {
        // GA4の選択状態を更新
        if (selectedGA4) {
          const ga4Data = await FirestoreService.getGA4Properties(user.uid);
          if (ga4Data) {
            await FirestoreService.saveGA4Properties(user.uid, ga4Data.properties, selectedGA4.name);
          }
        }
        
        // GSCの選択状態を更新
        if (selectedGSC) {
          const gscData = await FirestoreService.getGSCSites(user.uid);
          if (gscData) {
            await FirestoreService.saveGSCSites(user.uid, gscData.sites, selectedGSC.siteUrl);
          }
        }
        
        console.log('✅ Firestore選択状態更新完了');
      } catch (error) {
        console.error('❌ Firestore選択状態更新エラー:', error);
      }
    }

    setShowPropertySelector(false);
    
    // 分析ページに遷移
    router.push('/analysis');
  };

  // レポート選択完了時の処理
  const handleReportSelectionConfirm = (reports: GA4ReportType[]) => {
    setSelectedGA4Reports(reports);
    setShowReportSelector(false);
    console.log('🔧 選択されたレポート:', reports);
  };

  // Faro方式デバッグ情報
  console.log('🔧 Faro Dashboard状態:', {
    isUnifiedConnected,
    ga4Properties: ga4Properties.length,
    gscSites: gscSites.length,
    selectedGA4Property: selectedGA4Property?.displayName || 'なし',
    selectedGSCSite: selectedGSCSite?.siteUrl || 'なし',
    selectedGA4Reports: selectedGA4Reports.length,
    faroLocalStorage: typeof window !== 'undefined' ? localStorage.getItem('growreporter_faro_connections') !== null : false
  });

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <>
      {/* ナビゲーションバー */}
      <MDBNavbar light bgColor="white" className="shadow-sm">
        <MDBContainer>
          <MDBNavbarBrand href="/dashboard" className="fw-bold text-primary">
            <MDBIcon fas icon="chart-line" className="me-2" />
            GrowReporter
          </MDBNavbarBrand>
          <MDBNavbarNav className="ms-auto">
            <MDBNavbarItem>
              <UserProfile />
            </MDBNavbarItem>
          </MDBNavbarNav>
        </MDBContainer>
      </MDBNavbar>

      <MDBContainer className="py-5">
        {/* ヘッダーセクション */}
        <MDBRow className="mb-5">
          <MDBCol>
            <h1 className="display-6 fw-bold text-primary mb-3">
              <MDBIcon fas icon="tachometer-alt" className="me-3" />
              ダッシュボード
            </h1>
            <p className="lead text-muted">
              Google Analytics 4とSearch Consoleのデータを統合分析
            </p>
          </MDBCol>
        </MDBRow>

        {/* 統合Google認証セクション */}
        <MDBRow className="mb-5">
          <MDBCol>
            <h6 className="text-primary fw-bold mb-3">
              <MDBIcon fab icon="google" className="me-2" />
              統合Google認証（推奨）
            </h6>
            <UnifiedGoogleConnection
              isConnected={isUnifiedConnected}
              onConnectionSuccess={handleUnifiedConnectionSuccess}
              onConnectionError={handleUnifiedConnectionError}
              onDisconnect={handleUnifiedDisconnect}
            />
          </MDBCol>
        </MDBRow>

        {/* 統計情報セクション */}
        <MDBRow className="g-4 mb-5">
          <MDBCol lg="3" md="6">
            <MDBCard className="text-center border-0 bg-light">
              <MDBCardBody>
                <MDBIcon fas icon="plug" size="2x" className="text-muted mb-3" />
                 <h4 className="fw-bold">
                   {isUnifiedConnected ? 1 : 0}/1
                 </h4>
                <p className="text-muted mb-0">統合認証完了</p>
              </MDBCardBody>
            </MDBCard>
          </MDBCol>

          <MDBCol lg="3" md="6">
            <MDBCard className="text-center border-0 bg-light">
              <MDBCardBody>
                <MDBIcon fas icon="chart-bar" size="2x" className="text-success mb-3" />
                <h4 className="fw-bold text-success">{ga4Properties.length}</h4>
                <p className="text-muted mb-0">GA4プロパティ</p>
              </MDBCardBody>
            </MDBCard>
          </MDBCol>

          <MDBCol lg="3" md="6">
            <MDBCard className="text-center border-0 bg-light">
              <MDBCardBody>
                <MDBIcon fas icon="search" size="2x" className="text-warning mb-3" />
                <h4 className="fw-bold text-warning">{gscSites.length}</h4>
                <p className="text-muted mb-0">GSCサイト</p>
              </MDBCardBody>
            </MDBCard>
          </MDBCol>

          <MDBCol lg="3" md="6">
            <MDBCard className="text-center border-0 bg-light">
              <MDBCardBody>
                <MDBIcon fas icon="robot" size="2x" className="text-info mb-3" />
                <h4 className="fw-bold text-info">AI</h4>
                <p className="text-muted mb-0">分析準備完了</p>
              </MDBCardBody>
            </MDBCard>
          </MDBCol>
        </MDBRow>

        {/* 次のステップセクション */}
        <MDBRow className="mb-5">
          <MDBCol>
            <MDBCard className="border-0 shadow-sm">
              <MDBCardBody className="p-4">
                <h5 className="fw-bold mb-4">
                  <MDBIcon fas icon="list-check" className="me-2 text-primary" />
                  次のステップ
                </h5>
                
                {/* 統合認証が完了している場合のプロパティ選択 */}
                {(isUnifiedConnected && (ga4Properties.length > 0 || gscSites.length > 0)) ? (
                  <div>
                    <p className="text-muted mb-4">
                      分析に使用するプロパティ・サイトを選択してください
                    </p>
                    
                    {/* プロパティ選択ボタン */}
                    <div className="d-flex flex-wrap gap-3 mb-4">
                      <MDBBtn 
                        color="primary" 
                        onClick={() => setShowPropertySelector(true)}
                        className="d-flex align-items-center"
                      >
                        <MDBIcon fas icon="cog" className="me-2" />
                        プロパティ・サイト選択
                        {(selectedGA4Property || selectedGSCSite) && (
                          <MDBBadge color="success" className="ms-2">設定済み</MDBBadge>
                        )}
                      </MDBBtn>

                      {/* 選択済みの場合はレポート選択も表示 */}
                      {selectedGA4Property && (
                        <MDBBtn 
                          color="info" 
                          onClick={() => setShowReportSelector(true)}
                          className="d-flex align-items-center"
                        >
                          <MDBIcon fas icon="chart-line" className="me-2" />
                          レポート選択
                          {selectedGA4Reports.length > 0 && (
                            <MDBBadge color="success" className="ms-2">{selectedGA4Reports.length}</MDBBadge>
                          )}
                        </MDBBtn>
                      )}
                    </div>

                    {/* 選択状況表示 */}
                    {(selectedGA4Property || selectedGSCSite) && (
                      <div className="bg-light p-3 rounded mb-4">
                        <h6 className="fw-bold mb-2">選択済みプロパティ・サイト</h6>
                        {selectedGA4Property && (
                          <p className="mb-1">
                            <MDBIcon fas icon="chart-bar" className="me-2 text-success" />
                            GA4: {selectedGA4Property.displayName}
                          </p>
                        )}
                        {selectedGSCSite && (
                          <p className="mb-1">
                            <MDBIcon fas icon="search" className="me-2 text-warning" />
                            GSC: {selectedGSCSite.siteUrl}
                          </p>
                        )}
                        {selectedGA4Reports.length > 0 && (
                          <p className="mb-0">
                            <MDBIcon fas icon="chart-line" className="me-2 text-info" />
                            レポート: {selectedGA4Reports.length}個選択済み
                          </p>
                        )}
                      </div>
                    )}

                    {/* 分析開始ボタン */}
                    {(selectedGA4Property || selectedGSCSite) && (
                      <MDBBtn 
                        color="success" 
                        size="lg" 
                        href="/analysis"
                        className="d-flex align-items-center justify-content-center"
                      >
                        <MDBIcon fas icon="rocket" className="me-2" />
                        分析画面へ移動
                      </MDBBtn>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-5">
                    <MDBIcon fas icon="info-circle" size="3x" className="text-muted mb-3" />
                    <h6 className="text-muted">まず統合Google認証を完了してください</h6>
                    <p className="text-muted">
                      Google Analytics 4とSearch Consoleのデータにアクセスするには認証が必要です
                    </p>
                  </div>
                )}
              </MDBCardBody>
            </MDBCard>
          </MDBCol>
        </MDBRow>

        {/* プロパティ選択モーダル */}
        {showPropertySelector && (
          <PropertySelector
            show={showPropertySelector}
            onClose={() => setShowPropertySelector(false)}
            ga4Properties={ga4Properties}
            gscSites={gscSites}
            onConfirm={handlePropertySelectionConfirm}
            mode="both"
            initialSelectedGA4={selectedGA4Property}
            initialSelectedGSC={selectedGSCSite}
          />
        )}

        {/* レポート選択モーダル */}
        {showReportSelector && selectedGA4Property && (
          <ReportSelector
            show={showReportSelector}
            onClose={() => setShowReportSelector(false)}
            onConfirm={handleReportSelectionConfirm}
            type="ga4"
          />
        )}
      </MDBContainer>
    </>
  );
}
