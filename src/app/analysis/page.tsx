'use client';

import {
  MDBContainer,
  MDBRow,
  MDBCol,
  MDBCard,
  MDBCardBody,
  MDBCardTitle,
  MDBIcon,
  MDBNavbar,
  MDBNavbarBrand,
  MDBNavbarNav,
  MDBNavbarItem,
  MDBSpinner,
  MDBBtn,
  MDBBadge,
  MDBTable,
  MDBTableHead,
  MDBTableBody
} from 'mdb-react-ui-kit';
import { useAuth } from '@/lib/auth/authContext';
import UserProfile from '@/components/auth/UserProfile';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { GA4Property } from '@/lib/api/googleAnalytics';
import { GSCSite } from '@/components/api/GSCConnection';
import { FirestoreService } from '@/lib/firebase/firestoreService';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import './datepicker.css';

interface GA4Data {
  success: boolean;
  data: any;
  summary: {
    propertyId: string;
    rowCount: number;
    dateRange: { startDate: string; endDate: string };
    metrics: string[];
    dimensions: string[];
  };
}

interface GSCData {
  success: boolean;
  data: {
    rows: any[];
    totalClicks: number;
    totalImpressions: number;
    averageCTR: number;
    averagePosition: number;
  };
  summary: {
    siteUrl: string;
    rowCount: number;
    dateRange: { startDate: string; endDate: string };
    dimensions: string[];
    totalClicks: number;
    totalImpressions: number;
    averageCTR: number;
    averagePosition: number;
  };
}

export default function AnalysisPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [selectedGA4Property, setSelectedGA4Property] = useState<GA4Property | null>(null);
  const [selectedGSCSite, setSelectedGSCSite] = useState<GSCSite | null>(null);
  const [ga4Data, setGA4Data] = useState<GA4Data | null>(null);
  const [gscData, setGSCData] = useState<GSCData | null>(null);
  const [isLoadingGA4, setIsLoadingGA4] = useState(false);
  const [isLoadingGSC, setIsLoadingGSC] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 期間選択の状態
  const [dateRangeType, setDateRangeType] = useState<'preset' | 'custom'>('preset');
  const [presetRange, setPresetRange] = useState<string>('30daysAgo');
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null);
  const [customEndDate, setCustomEndDate] = useState<Date | null>(null);
  
  // AI分析の状態
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
      return;
    }

    // Firestoreから選択されたプロパティを復元
    if (user?.uid) {
      const unsubscribeGA4 = FirestoreService.subscribeToGA4Properties(
        user.uid,
        (ga4Data) => {
          if (ga4Data && ga4Data.selected.propertyId) {
            // 選択されたプロパティを復元
            const selectedProp = ga4Data.properties.find(
              prop => prop.name === ga4Data.selected.propertyId
            );
            if (selectedProp) {
              setSelectedGA4Property(selectedProp);
              console.log('✅ 選択GA4プロパティ復元:', selectedProp.displayName);
            }
          }
        }
      );

      const unsubscribeGSC = FirestoreService.subscribeToGSCSites(
        user.uid,
        (gscData) => {
          if (gscData && gscData.selected.siteUrl) {
            // 選択されたサイトを復元
            const selectedSite = gscData.sites.find(
              site => site.siteUrl === gscData.selected.siteUrl
            );
            if (selectedSite) {
              setSelectedGSCSite(selectedSite);
              console.log('✅ 選択GSCサイト復元:', selectedSite.siteUrl);
            }
          }
        }
      );

      return () => {
        unsubscribeGA4();
        unsubscribeGSC();
      };
    }
  }, [user, loading, router]);

  const fetchGA4Data = async () => {
    if (!selectedGA4Property || !user?.uid) return;

    setIsLoadingGA4(true);
    setError(null);

    try {
      // Firestoreからアクセストークンを取得
      const oauthTokens = await FirestoreService.getOAuthTokens(user.uid);
      
      console.log('🔧 GA4 Access Token Debug:', {
        foundToken: !!oauthTokens?.unified.accessToken,
        tokenLength: oauthTokens?.unified.accessToken?.length || 0,
        hasGA4Permission: oauthTokens?.permissions.ga4.granted || false,
        expiresAt: oauthTokens?.unified.expiresAt,
        isExpired: oauthTokens?.unified.expiresAt 
          ? new Date(oauthTokens.unified.expiresAt.toMillis()).getTime() < Date.now()
          : 'unknown'
      });

      if (!oauthTokens?.unified.accessToken) {
        throw new Error('GA4アクセストークンが見つかりません。ダッシュボードで再接続してください。');
      }

      // トークンの有効期限チェック & 自動更新
      const isExpired = oauthTokens.unified.expiresAt 
        ? oauthTokens.unified.expiresAt.toMillis() < Date.now()
        : false;

      let accessToken = oauthTokens.unified.accessToken;

      if (isExpired) {
        console.warn('⚠️ アクセストークンが期限切れです。自動更新を試みます...');
        
        // リフレッシュトークンが存在する場合は自動更新
        if (oauthTokens.unified.refreshToken) {
          try {
            // サーバーサイドAPIを使ってトークンを更新（セキュリティのため）
            const refreshResponse = await fetch('/api/auth/refresh-token', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                userId: user.uid,
                refreshToken: oauthTokens.unified.refreshToken
              })
            });

            if (!refreshResponse.ok) {
              const errorData = await refreshResponse.json();
              throw new Error(errorData.message || 'Token refresh failed');
            }

            const refreshData = await refreshResponse.json();
            accessToken = refreshData.accessToken;
            console.log('✅ アクセストークン自動更新成功');
            
          } catch (refreshError) {
            console.error('❌ トークン自動更新失敗:', refreshError);
            setError('アクセストークンの更新に失敗しました。');
            setIsLoadingGA4(false);
            throw new Error('アクセストークンの有効期限が切れており、自動更新にも失敗しました。ダッシュボードでもう一度「統合Google接続」を実行してください。');
          }
        } else {
          // リフレッシュトークンがない場合は再接続が必要
          setError('アクセストークンの有効期限が切れています。');
          setIsLoadingGA4(false);
          throw new Error('リフレッシュトークンが見つかりません。ダッシュボードでもう一度「統合Google接続」を実行してください。');
        }
      }

      // プロパティIDを抽出（properties/123456789 → 123456789）
      const propertyId = selectedGA4Property.name.replace('properties/', '');

      // 期間の設定
      let startDate: string;
      let endDate: string;

      if (dateRangeType === 'preset') {
        startDate = presetRange;
        endDate = 'today';
      } else {
        // カスタム期間の場合
        if (!customStartDate || !customEndDate) {
          throw new Error('開始日と終了日を選択してください');
        }
        startDate = customStartDate.toISOString().split('T')[0];
        endDate = customEndDate.toISOString().split('T')[0];
      }

      console.log('🔧 GA4期間設定:', { dateRangeType, startDate, endDate });

      const response = await fetch('/api/analytics/ga4', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          propertyId,
          accessToken,
          dateRange: [
            {
              startDate,
              endDate
            }
          ]
        })
      });

      console.log('🔧 GA4 API Response:', {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (!response.ok) {
        let errorData: any = {};
        try {
          const responseText = await response.text();
          console.error('❌ GA4 API Error Response Text:', responseText);
          errorData = responseText ? JSON.parse(responseText) : {};
        } catch (e) {
          console.error('❌ GA4 API Error parsing failed:', e);
          errorData = { error: response.statusText };
        }
        
        console.error('❌ GA4 API Error Details:', {
          status: response.status,
          statusText: response.statusText,
          errorData,
          selectedProperty: selectedGA4Property.displayName,
          propertyId: selectedGA4Property.name.replace('properties/', '')
        });
        
        throw new Error(errorData.error || errorData.details || `GA4 API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      setGA4Data(data);
      console.log('✅ GA4データ取得成功:', data.summary);

    } catch (error) {
      console.error('GA4データ取得エラー:', error);
      setError(error instanceof Error ? error.message : 'GA4データの取得に失敗しました');
    } finally {
      setIsLoadingGA4(false);
    }
  };

  const fetchGSCData = async () => {
    if (!selectedGSCSite || !user?.uid) return;

    setIsLoadingGSC(true);
    setError(null);

    try {
      // Firestoreからアクセストークンを取得（統合OAuth）
      const oauthTokens = await FirestoreService.getOAuthTokens(user.uid);

      if (!oauthTokens?.unified.accessToken) {
        throw new Error('Search Consoleアクセストークンが見つかりません。ダッシュボードで再接続してください。');
      }

      // トークンの有効期限チェック & 自動更新
      const isExpired = oauthTokens.unified.expiresAt 
        ? oauthTokens.unified.expiresAt.toMillis() < Date.now()
        : false;

      let accessToken = oauthTokens.unified.accessToken;

      if (isExpired) {
        console.warn('⚠️ GSCアクセストークンが期限切れです。自動更新を試みます...');
        
        if (oauthTokens.unified.refreshToken) {
          try {
            // サーバーサイドAPIを使ってトークンを更新（セキュリティのため）
            const refreshResponse = await fetch('/api/auth/refresh-token', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                userId: user.uid,
                refreshToken: oauthTokens.unified.refreshToken
              })
            });

            if (!refreshResponse.ok) {
              const errorData = await refreshResponse.json();
              throw new Error(errorData.message || 'Token refresh failed');
            }

            const refreshData = await refreshResponse.json();
            accessToken = refreshData.accessToken;
            console.log('✅ GSCアクセストークン自動更新成功');
            
          } catch (refreshError) {
            console.error('❌ GSCトークン自動更新失敗:', refreshError);
            setError('アクセストークンの更新に失敗しました。');
            setIsLoadingGSC(false);
            throw new Error('アクセストークンの有効期限が切れており、自動更新にも失敗しました。ダッシュボードでもう一度「統合Google接続」を実行してください。');
          }
        } else {
          setError('アクセストークンの有効期限が切れています。');
          setIsLoadingGSC(false);
          throw new Error('リフレッシュトークンが見つかりません。ダッシュボードでもう一度「統合Google接続」を実行してください。');
        }
      }

      // 期間の設定
      let startDate: string;
      let endDate: string;

      if (dateRangeType === 'preset') {
        // プリセット期間を日付に変換
        const today = new Date();
        endDate = today.toISOString().split('T')[0];
        
        const startDateObj = new Date();
        switch (presetRange) {
          case '7daysAgo':
            startDateObj.setDate(today.getDate() - 7);
            break;
          case '30daysAgo':
            startDateObj.setDate(today.getDate() - 30);
            break;
          case '90daysAgo':
            startDateObj.setDate(today.getDate() - 90);
            break;
          default:
            startDateObj.setDate(today.getDate() - 30);
        }
        startDate = startDateObj.toISOString().split('T')[0];
      } else {
        // カスタム期間の場合
        if (!customStartDate || !customEndDate) {
          throw new Error('開始日と終了日を選択してください');
        }
        startDate = customStartDate.toISOString().split('T')[0];
        endDate = customEndDate.toISOString().split('T')[0];
      }

      console.log('🔧 GSC期間設定:', { dateRangeType, startDate, endDate });

      const response = await fetch('/api/analytics/gsc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          siteUrl: selectedGSCSite.siteUrl,
          accessToken,
          dateRange: {
            startDate,
            endDate
          },
          dimensions: ['date']
        })
      });

      console.log('🔧 GSC API Response:', {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (!response.ok) {
        let errorData: any = {};
        try {
          const responseText = await response.text();
          console.error('❌ GSC API Error Response Text:', responseText);
          errorData = responseText ? JSON.parse(responseText) : {};
        } catch (e) {
          console.error('❌ GSC API Error parsing failed:', e);
          errorData = { error: response.statusText };
        }
        
        console.error('❌ GSC API Error Details:', {
          status: response.status,
          statusText: response.statusText,
          errorData,
          selectedSite: selectedGSCSite.siteUrl
        });
        
        throw new Error(errorData.error || errorData.details || `GSC API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      setGSCData(data);
      console.log('✅ GSCデータ取得成功:', data.summary);

    } catch (error) {
      console.error('GSCデータ取得エラー:', error);
      setError(error instanceof Error ? error.message : 'Search Consoleデータの取得に失敗しました');
    } finally {
      setIsLoadingGSC(false);
    }
  };

  // Gemini AI分析を実行
  const runAIAnalysis = async () => {
    if (!ga4Data && !gscData) {
      setError('分析するデータがありません。まずGA4またはGSCデータを取得してください。');
      return;
    }

    setIsLoadingAI(true);
    setError(null);

    try {
      console.log('🤖 Gemini AI分析開始');

      // GA4とGSCデータを整形
      const ga4Summary = ga4Data ? {
        totalSessions: ga4Data.data?.rows?.reduce((sum: number, row: any) => {
          const sessionIndex = ga4Data.summary.metrics.indexOf('sessions');
          return sum + (row.metricValues?.[sessionIndex] ? parseInt(row.metricValues[sessionIndex].value) : 0);
        }, 0) || 0,
        totalUsers: ga4Data.data?.rows?.reduce((sum: number, row: any) => {
          const userIndex = ga4Data.summary.metrics.indexOf('activeUsers');
          return sum + (row.metricValues?.[userIndex] ? parseInt(row.metricValues[userIndex].value) : 0);
        }, 0) || 0,
        totalPageViews: ga4Data.data?.rows?.reduce((sum: number, row: any) => {
          const pvIndex = ga4Data.summary.metrics.indexOf('screenPageViews');
          return sum + (row.metricValues?.[pvIndex] ? parseInt(row.metricValues[pvIndex].value) : 0);
        }, 0) || 0,
        avgBounceRate: (() => {
          const bounceIndex = ga4Data.summary.metrics.indexOf('bounceRate');
          if (bounceIndex === -1 || !ga4Data.data?.rows?.length) return 0;
          const total = ga4Data.data.rows.reduce((sum: number, row: any) => {
            const value = row.metricValues?.[bounceIndex] ? parseFloat(row.metricValues[bounceIndex].value) : 0;
            return sum + value;
          }, 0);
          return ((total / ga4Data.data.rows.length) * 100).toFixed(2);
        })(),
        rowCount: ga4Data.summary.rowCount
      } : null;

      const gscSummary = gscData ? {
        totalClicks: gscData.summary.totalClicks,
        totalImpressions: gscData.summary.totalImpressions,
        avgCTR: gscData.summary.averageCTR,
        avgPosition: gscData.summary.averagePosition,
        rowCount: gscData.summary.rowCount
      } : null;

      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ga4Data: ga4Summary,
          gscData: gscSummary,
          dateRange: ga4Data?.summary.dateRange || gscData?.summary.dateRange,
          propertyName: selectedGA4Property?.displayName,
          siteUrl: selectedGSCSite?.siteUrl
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'AI分析に失敗しました');
      }

      const data = await response.json();
      setAiAnalysis(data.analysis);
      console.log('✅ Gemini AI分析完了');

    } catch (error) {
      console.error('❌ AI分析エラー:', error);
      setError(error instanceof Error ? error.message : 'AI分析に失敗しました');
    } finally {
      setIsLoadingAI(false);
    }
  };

  if (loading) {
    return (
      <MDBContainer fluid className="py-5 text-center">
        <MDBIcon fas icon="spinner" spin size="3x" className="text-primary" />
        <p className="mt-3">読み込み中...</p>
      </MDBContainer>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <>
      <MDBNavbar light bgColor="light" className="shadow-sm">
        <MDBContainer fluid>
          <MDBNavbarBrand href="/dashboard" className="fw-bold text-primary">
            <MDBIcon fas icon="chart-line" className="me-2" />
            GrowReporter 分析結果
          </MDBNavbarBrand>

          <MDBNavbarNav className="ms-auto">
            <MDBNavbarItem>
              <MDBBtn color="secondary" size="sm" href="/dashboard" className="me-3">
                <MDBIcon fas icon="arrow-left" className="me-2" />
                ダッシュボードに戻る
              </MDBBtn>
            </MDBNavbarItem>
            <MDBNavbarItem>
              <UserProfile />
            </MDBNavbarItem>
          </MDBNavbarNav>
        </MDBContainer>
      </MDBNavbar>

      <MDBContainer fluid className="py-5">
        {/* 選択されたプロパティ情報 */}
        <MDBRow className="mb-4">
          <MDBCol md="12">
            <MDBCard className="border-primary">
              <MDBCardBody>
                <h5 className="text-primary mb-3">
                  <MDBIcon fas icon="cog" className="me-2" />
                  分析対象
                </h5>
                <MDBRow>
                  <MDBCol md="6">
                    <div className="mb-3">
                      <strong>GA4プロパティ:</strong>
                      <br />
                      {selectedGA4Property ? (
                        <span className="text-success">{selectedGA4Property.displayName}</span>
                      ) : (
                        <span className="text-muted">選択されていません</span>
                      )}
                    </div>
                  </MDBCol>
                  <MDBCol md="6">
                    <div className="mb-3">
                      <strong>Search Consoleサイト:</strong>
                      <br />
                      {selectedGSCSite ? (
                        <span className="text-success">{selectedGSCSite.siteUrl}</span>
                      ) : (
                        <span className="text-muted">選択されていません</span>
                      )}
                    </div>
                  </MDBCol>
                </MDBRow>

                {/* 期間選択 */}
                <hr className="my-4" />
                <h6 className="mb-3">
                  <MDBIcon fas icon="calendar-alt" className="me-2" />
                  データ取得期間
                </h6>
                
                <MDBRow className="mb-3">
                  <MDBCol md="12">
                    <div className="mb-3">
                      <div className="form-check form-check-inline">
                        <input
                          className="form-check-input"
                          type="radio"
                          name="dateRangeType"
                          id="presetRange"
                          checked={dateRangeType === 'preset'}
                          onChange={() => setDateRangeType('preset')}
                        />
                        <label className="form-check-label" htmlFor="presetRange">
                          プリセット期間
                        </label>
                      </div>
                      <div className="form-check form-check-inline">
                        <input
                          className="form-check-input"
                          type="radio"
                          name="dateRangeType"
                          id="customRange"
                          checked={dateRangeType === 'custom'}
                          onChange={() => setDateRangeType('custom')}
                        />
                        <label className="form-check-label" htmlFor="customRange">
                          カスタム期間
                        </label>
                      </div>
                    </div>
                  </MDBCol>
                </MDBRow>

                {dateRangeType === 'preset' ? (
                  <MDBRow className="mb-3">
                    <MDBCol md="6">
                      <select
                        className="form-select"
                        value={presetRange}
                        onChange={(e) => setPresetRange(e.target.value)}
                      >
                        <option value="7daysAgo">過去7日間</option>
                        <option value="30daysAgo">過去30日間</option>
                        <option value="90daysAgo">過去90日間</option>
                      </select>
                    </MDBCol>
                  </MDBRow>
                ) : (
                  <MDBRow className="mb-3">
                    <MDBCol md="4">
                      <label className="form-label">
                        <MDBIcon fas icon="calendar" className="me-2" />
                        開始日
                      </label>
                      <DatePicker
                        selected={customStartDate}
                        onChange={(date: Date | null) => setCustomStartDate(date)}
                        selectsStart
                        startDate={customStartDate}
                        endDate={customEndDate}
                        maxDate={customEndDate || new Date()}
                        dateFormat="yyyy-MM-dd"
                        className="form-control"
                        placeholderText="開始日を選択"
                        locale="ja"
                        showMonthDropdown
                        showYearDropdown
                        dropdownMode="select"
                      />
                    </MDBCol>
                    <MDBCol md="4">
                      <label className="form-label">
                        <MDBIcon fas icon="calendar" className="me-2" />
                        終了日
                      </label>
                      <DatePicker
                        selected={customEndDate}
                        onChange={(date: Date | null) => setCustomEndDate(date)}
                        selectsEnd
                        startDate={customStartDate}
                        endDate={customEndDate}
                        minDate={customStartDate}
                        maxDate={new Date()}
                        dateFormat="yyyy-MM-dd"
                        className="form-control"
                        placeholderText="終了日を選択"
                        locale="ja"
                        showMonthDropdown
                        showYearDropdown
                        dropdownMode="select"
                      />
                    </MDBCol>
                  </MDBRow>
                )}

          <div className="text-center mt-4">
            <MDBBtn 
              color="primary" 
              onClick={fetchGA4Data}
              disabled={!selectedGA4Property || isLoadingGA4}
              className="me-3"
            >
              {isLoadingGA4 ? (
                <MDBSpinner size="sm" tag="span" className="me-2" />
              ) : (
                <MDBIcon fas icon="chart-bar" className="me-2" />
              )}
              GA4データを取得
            </MDBBtn>

            <MDBBtn 
              color="warning" 
              onClick={fetchGSCData}
              disabled={!selectedGSCSite || isLoadingGSC}
              className="me-3"
            >
              {isLoadingGSC ? (
                <MDBSpinner size="sm" tag="span" className="me-2" />
              ) : (
                <MDBIcon fas icon="search" className="me-2" />
              )}
              Search Consoleデータを取得
            </MDBBtn>

            <MDBBtn 
              color="success" 
              onClick={runAIAnalysis}
              disabled={(!ga4Data && !gscData) || isLoadingAI}
              className="me-3"
            >
              {isLoadingAI ? (
                <MDBSpinner size="sm" tag="span" className="me-2" />
              ) : (
                <MDBIcon fas icon="robot" className="me-2" />
              )}
              Gemini AI分析を実行
            </MDBBtn>

            <MDBBtn 
              color="info" 
              size="sm"
              onClick={() => {
                const allCookies = document.cookie;
                const cookieList = allCookies.split('; ').map(c => {
                  const [key, value] = c.split('=');
                  return { key, value: value || '', length: (value || '').length };
                });
                
                console.log('🔧 Detailed Debug Info:', {
                  allCookies,
                  cookieCount: cookieList.length,
                  cookieList,
                  hasGA4Token: allCookies.includes('ga4_access_token'),
                  hasGA4Properties: allCookies.includes('ga4_properties_temp'),
                  localStorage: localStorage.getItem('growreporter_connections'),
                  selectedGA4: selectedGA4Property,
                  selectedGSC: selectedGSCSite,
                  currentURL: window.location.href,
                  userAgent: navigator.userAgent
                });
                
                // ユーザーにも表示
                const debugSummary = `
デバッグ情報:
- Cookie数: ${cookieList.length}
- GA4トークン: ${allCookies.includes('ga4_access_token') ? 'あり' : 'なし'}
- GA4プロパティ: ${allCookies.includes('ga4_properties_temp') ? 'あり' : 'なし'}
- 選択GA4: ${selectedGA4Property ? selectedGA4Property.displayName : 'なし'}
- 選択GSC: ${selectedGSCSite ? selectedGSCSite.siteUrl : 'なし'}

詳細はコンソールを確認してください。
                `;
                alert(debugSummary);
              }}
            >
              <MDBIcon fas icon="bug" className="me-2" />
              詳細デバッグ
            </MDBBtn>
          </div>
              </MDBCardBody>
            </MDBCard>
          </MDBCol>
        </MDBRow>

        {/* エラー表示 */}
        {error && (
          <MDBRow className="mb-4">
            <MDBCol md="12">
              <div className="alert alert-danger">
                <MDBIcon fas icon="exclamation-triangle" className="me-2" />
                {error}
              </div>
            </MDBCol>
          </MDBRow>
        )}

        {/* GA4データ表示 */}
        {ga4Data && (
          <MDBRow className="mb-4">
            <MDBCol md="12">
              <MDBCard className="border-primary">
                <MDBCardBody>
                  <MDBCardTitle className="text-primary">
                    <MDBIcon fas icon="chart-bar" className="me-2" />
                    GA4分析結果
                  </MDBCardTitle>
                  
                  <div className="mb-3">
                    <MDBBadge color="success" pill className="me-2">
                      データ件数: {ga4Data.summary.rowCount}件
                    </MDBBadge>
                    <MDBBadge color="info" pill>
                      期間: {ga4Data.summary.dateRange.startDate} ～ {ga4Data.summary.dateRange.endDate}
                    </MDBBadge>
                  </div>

                  {/* 実際のデータを表示 */}
                  {ga4Data.data && ga4Data.data.rows && ga4Data.data.rows.length > 0 ? (
                    <div>
                      <div className="row mb-4">
                        {/* セッション数 */}
                        <div className="col-md-3">
                          <div className="text-center bg-light p-3 rounded">
                            <h4 className="text-primary">
                              {(() => {
                                const total = ga4Data.data.rows.reduce((sum: number, row: any) => {
                                  const sessionIndex = ga4Data.summary.metrics.indexOf('sessions');
                                  return sum + (row.metricValues && row.metricValues[sessionIndex] 
                                    ? parseInt(row.metricValues[sessionIndex].value) 
                                    : 0);
                                }, 0);
                                return total.toLocaleString();
                              })()}
                            </h4>
                            <small>総セッション数</small>
                          </div>
                        </div>

                        {/* アクティブユーザー数 */}
                        <div className="col-md-3">
                          <div className="text-center bg-light p-3 rounded">
                            <h4 className="text-success">
                              {(() => {
                                const total = ga4Data.data.rows.reduce((sum: number, row: any) => {
                                  const userIndex = ga4Data.summary.metrics.indexOf('activeUsers');
                                  return sum + (row.metricValues && row.metricValues[userIndex] 
                                    ? parseInt(row.metricValues[userIndex].value) 
                                    : 0);
                                }, 0);
                                return total.toLocaleString();
                              })()}
                            </h4>
                            <small>アクティブユーザー</small>
                          </div>
                        </div>

                        {/* ページビュー数 */}
                        <div className="col-md-3">
                          <div className="text-center bg-light p-3 rounded">
                            <h4 className="text-info">
                              {(() => {
                                const total = ga4Data.data.rows.reduce((sum: number, row: any) => {
                                  const pvIndex = ga4Data.summary.metrics.indexOf('screenPageViews');
                                  return sum + (row.metricValues && row.metricValues[pvIndex] 
                                    ? parseInt(row.metricValues[pvIndex].value) 
                                    : 0);
                                }, 0);
                                return total.toLocaleString();
                              })()}
                            </h4>
                            <small>ページビュー</small>
                          </div>
                        </div>

                        {/* 平均直帰率 */}
                        <div className="col-md-3">
                          <div className="text-center bg-light p-3 rounded">
                            <h4 className="text-warning">
                              {(() => {
                                const bounceIndex = ga4Data.summary.metrics.indexOf('bounceRate');
                                if (bounceIndex === -1 || !ga4Data.data.rows[0]?.metricValues) return 'N/A';
                                
                                const total = ga4Data.data.rows.reduce((sum: number, row: any, idx: number) => {
                                  const value = row.metricValues && row.metricValues[bounceIndex] 
                                    ? parseFloat(row.metricValues[bounceIndex].value) 
                                    : 0;
                                  return sum + value;
                                }, 0);
                                const avg = (total / ga4Data.data.rows.length) * 100;
                                return `${avg.toFixed(2)}%`;
                              })()}
                            </h4>
                            <small>平均直帰率</small>
                          </div>
                        </div>
                      </div>

                      <div className="row">
                        <div className="col-md-6">
                          <h6>取得メトリクス:</h6>
                          <ul>
                            {ga4Data.summary.metrics.map((metric, index) => (
                              <li key={index}>{metric}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="col-md-6">
                          <h6>ディメンション:</h6>
                          <ul>
                            {ga4Data.summary.dimensions.map((dimension, index) => (
                              <li key={index}>{dimension}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="alert alert-info">
                      データが取得されましたが、詳細データが含まれていません。
                    </div>
                  )}

                  <div className="mt-3">
                    <small className="text-muted">
                      プロパティID: {ga4Data.summary.propertyId}
                    </small>
                  </div>
                </MDBCardBody>
              </MDBCard>
            </MDBCol>
          </MDBRow>
        )}

        {/* GSCデータ表示 */}
        {gscData && (
          <MDBRow className="mb-4">
            <MDBCol md="12">
              <MDBCard className="border-warning">
                <MDBCardBody>
                  <MDBCardTitle className="text-warning">
                    <MDBIcon fas icon="search" className="me-2" />
                    Search Console分析結果
                  </MDBCardTitle>
                  
                  <div className="mb-3">
                    <MDBBadge color="success" pill className="me-2">
                      データ件数: {gscData.summary.rowCount}件
                    </MDBBadge>
                    <MDBBadge color="info" pill>
                      期間: {gscData.summary.dateRange.startDate} ～ {gscData.summary.dateRange.endDate}
                    </MDBBadge>
                  </div>

                  <div className="row">
                    <div className="col-md-3">
                      <div className="text-center bg-light p-3 rounded">
                        <h4 className="text-primary">{gscData.summary.totalClicks.toLocaleString()}</h4>
                        <small>総クリック数</small>
                      </div>
                    </div>
                    <div className="col-md-3">
                      <div className="text-center bg-light p-3 rounded">
                        <h4 className="text-info">{gscData.summary.totalImpressions.toLocaleString()}</h4>
                        <small>総表示回数</small>
                      </div>
                    </div>
                    <div className="col-md-3">
                      <div className="text-center bg-light p-3 rounded">
                        <h4 className="text-success">{gscData.summary.averageCTR}%</h4>
                        <small>平均CTR</small>
                      </div>
                    </div>
                    <div className="col-md-3">
                      <div className="text-center bg-light p-3 rounded">
                        <h4 className="text-warning">{gscData.summary.averagePosition}</h4>
                        <small>平均掲載順位</small>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3">
                    <small className="text-muted">
                      サイトURL: {gscData.summary.siteUrl}
                    </small>
                  </div>
                </MDBCardBody>
              </MDBCard>
            </MDBCol>
          </MDBRow>
        )}

        {/* AI分析結果表示 */}
        {aiAnalysis && (
          <MDBRow className="mb-4">
            <MDBCol md="12">
              <MDBCard className="border-success">
                <MDBCardBody>
                  <MDBCardTitle className="text-success">
                    <MDBIcon fas icon="robot" className="me-2" />
                    Gemini AI分析結果
                  </MDBCardTitle>
                  
                  <div className="mb-3">
                    <MDBBadge color="success" pill className="me-2">
                      AI分析完了
                    </MDBBadge>
                    <MDBBadge color="info" pill>
                      モデル: Gemini Pro
                    </MDBBadge>
                  </div>

                  <div 
                    className="ai-analysis-content"
                    style={{
                      whiteSpace: 'pre-wrap',
                      lineHeight: '1.8',
                      fontSize: '0.95rem'
                    }}
                  >
                    {aiAnalysis}
                  </div>

                  <div className="mt-3 text-end">
                    <MDBBtn 
                      color="light" 
                      size="sm"
                      onClick={() => setAiAnalysis(null)}
                    >
                      <MDBIcon fas icon="times" className="me-2" />
                      閉じる
                    </MDBBtn>
                  </div>
                </MDBCardBody>
              </MDBCard>
            </MDBCol>
          </MDBRow>
        )}
      </MDBContainer>
    </>
  );
}
