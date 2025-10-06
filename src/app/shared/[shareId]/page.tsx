'use client';

/**
 * 📊 共有レポートビューアページ
 * 公開URLからアクセス可能なレポート表示
 */

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  MDBContainer,
  MDBCard,
  MDBCardBody,
  MDBSpinner,
  MDBIcon,
  MDBRow,
  MDBCol,
  MDBInput,
  MDBBtn,
} from 'mdb-react-ui-kit';
import { AnalysisReport } from '@/types/analysis';

export default function SharedReportPage() {
  const params = useParams();
  const shareId = params?.shareId as string;
  
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [verifying, setVerifying] = useState(false);
  
  useEffect(() => {
    if (shareId) {
      loadSharedReport();
    }
  }, [shareId]);
  
  const loadSharedReport = async (pwd?: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // TODO: サーバーサイドAPIを実装
      // const response = await fetch(`/api/reports/shared/${shareId}`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ password: pwd }),
      // });
      
      // const data = await response.json();
      
      // if (!response.ok) {
      //   if (data.requiresPassword) {
      //     setRequiresPassword(true);
      //   } else {
      //     setError(data.error || 'レポートの読み込みに失敗しました');
      //   }
      //   return;
      // }
      
      // setReport(data.report);
      
      // 現時点では実装中メッセージを表示
      setError('共有レポート機能は現在実装中です。しばらくお待ちください。');
      
    } catch (err) {
      console.error('❌ 共有レポート読み込みエラー:', err);
      setError('レポートの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };
  
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifying(true);
    await loadSharedReport(password);
    setVerifying(false);
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <MDBSpinner color="primary" className="mb-3" />
          <p className="text-gray-600">レポートを読み込んでいます...</p>
        </div>
      </div>
    );
  }
  
  if (requiresPassword && !report) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <MDBCard className="max-w-md w-full">
          <MDBCardBody>
            <div className="text-center mb-4">
              <MDBIcon fas icon="lock" size="3x" className="text-primary mb-3" />
              <h2 className="text-xl font-bold">パスワードが必要です</h2>
              <p className="text-gray-600 mt-2">
                このレポートを閲覧するにはパスワードを入力してください
              </p>
            </div>
            
            <form onSubmit={handlePasswordSubmit}>
              <MDBInput
                type="password"
                label="パスワード"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mb-4"
                required
              />
              
              <MDBBtn
                type="submit"
                color="primary"
                className="w-full"
                disabled={verifying}
              >
                {verifying ? <MDBSpinner size="sm" className="me-2" /> : null}
                確認
              </MDBBtn>
            </form>
          </MDBCardBody>
        </MDBCard>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <MDBCard className="max-w-md w-full">
          <MDBCardBody className="text-center">
            <MDBIcon fas icon="exclamation-triangle" size="3x" className="text-danger mb-3" />
            <h2 className="text-xl font-bold mb-3">エラー</h2>
            <p className="text-gray-600">{error}</p>
          </MDBCardBody>
        </MDBCard>
      </div>
    );
  }
  
  if (!report) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <MDBCard className="max-w-md w-full">
          <MDBCardBody className="text-center">
            <MDBIcon fas icon="file-excel" size="3x" className="text-gray-400 mb-3" />
            <h2 className="text-xl font-bold mb-3">レポートが見つかりません</h2>
            <p className="text-gray-600">
              このレポートは削除されたか、URLが無効です
            </p>
          </MDBCardBody>
        </MDBCard>
      </div>
    );
  }
  
  // レポート表示
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <MDBContainer className="py-4">
          <h1 className="text-2xl font-bold text-gray-900">
            <MDBIcon fas icon="share-alt" className="me-2" />
            {report.title}
          </h1>
          {report.description && (
            <p className="text-gray-600 mt-2">{report.description}</p>
          )}
        </MDBContainer>
      </div>
      
      <MDBContainer className="py-5">
        <MDBRow>
          {/* GA4データ */}
          {report.ga4Data.fetched && (
            <MDBCol md="12" className="mb-4">
              <MDBCard>
                <MDBCardBody>
                  <h3 className="font-bold mb-3">
                    <MDBIcon fas icon="chart-line" className="me-2" />
                    Google Analytics 4
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 p-4 rounded">
                      <p className="text-sm text-gray-600">セッション</p>
                      <p className="text-2xl font-bold text-blue-900">
                        {report.ga4Data.metrics.sessions.toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-green-50 p-4 rounded">
                      <p className="text-sm text-gray-600">ユーザー</p>
                      <p className="text-2xl font-bold text-green-900">
                        {report.ga4Data.metrics.users.toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-purple-50 p-4 rounded">
                      <p className="text-sm text-gray-600">ページビュー</p>
                      <p className="text-2xl font-bold text-purple-900">
                        {report.ga4Data.metrics.pageViews.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </MDBCardBody>
              </MDBCard>
            </MDBCol>
          )}
          
          {/* GSCデータ */}
          {report.gscData.fetched && (
            <MDBCol md="12" className="mb-4">
              <MDBCard>
                <MDBCardBody>
                  <h3 className="font-bold mb-3">
                    <MDBIcon fas icon="search" className="me-2" />
                    Search Console
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 p-4 rounded">
                      <p className="text-sm text-gray-600">クリック数</p>
                      <p className="text-2xl font-bold text-blue-900">
                        {report.gscData.metrics.clicks.toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-green-50 p-4 rounded">
                      <p className="text-sm text-gray-600">表示回数</p>
                      <p className="text-2xl font-bold text-green-900">
                        {report.gscData.metrics.impressions.toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-yellow-50 p-4 rounded">
                      <p className="text-sm text-gray-600">CTR</p>
                      <p className="text-2xl font-bold text-yellow-900">
                        {(report.gscData.metrics.ctr * 100).toFixed(2)}%
                      </p>
                    </div>
                    <div className="bg-purple-50 p-4 rounded">
                      <p className="text-sm text-gray-600">平均掲載順位</p>
                      <p className="text-2xl font-bold text-purple-900">
                        {report.gscData.metrics.position.toFixed(1)}
                      </p>
                    </div>
                  </div>
                </MDBCardBody>
              </MDBCard>
            </MDBCol>
          )}
          
          {/* AI分析結果 */}
          {report.aiAnalysis.executed && (
            <MDBCol md="12">
              <MDBCard>
                <MDBCardBody>
                  <h3 className="font-bold mb-3">
                    <MDBIcon fas icon="robot" className="me-2" />
                    AI分析結果
                  </h3>
                  <div className="bg-purple-50 p-4 rounded">
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                      {report.aiAnalysis.result}
                    </pre>
                  </div>
                </MDBCardBody>
              </MDBCard>
            </MDBCol>
          )}
        </MDBRow>
        
        <div className="text-center text-gray-500 text-sm mt-8">
          <p>Powered by GrowReporter</p>
        </div>
      </MDBContainer>
    </div>
  );
}





