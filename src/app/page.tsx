'use client';

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
  MDBNavbar,
  MDBNavbarBrand,
  MDBNavbarNav,
  MDBNavbarItem
} from 'mdb-react-ui-kit';
import { useAuth } from '@/lib/auth/authContext';
import LoginForm from '@/components/auth/LoginForm';
import UserProfile from '@/components/auth/UserProfile';

export default function HomePage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <MDBContainer fluid className="py-5 text-center">
        <MDBIcon fas icon="spinner" spin size="3x" className="text-primary" />
        <p className="mt-3">読み込み中...</p>
      </MDBContainer>
    );
  }

  return (
    <>
      {/* ナビゲーションバー */}
      <MDBNavbar light bgColor="light" className="shadow-sm">
        <MDBContainer fluid>
          <MDBNavbarBrand href="/" className="fw-bold text-primary">
            <MDBIcon fas icon="chart-line" className="me-2" />
            GrowReporter
          </MDBNavbarBrand>
          
          <MDBNavbarNav className="ms-auto">
            <MDBNavbarItem>
              {user ? <UserProfile /> : null}
            </MDBNavbarItem>
          </MDBNavbarNav>
        </MDBContainer>
      </MDBNavbar>

      <MDBContainer fluid className="py-5">
      {user ? (
        // ログイン済みユーザー向け - ダッシュボードにリダイレクト
        <MDBRow>
          <MDBCol md="12" className="text-center">
            <MDBCard>
              <MDBCardBody className="py-5">
                <MDBIcon fas icon="check-circle" size="3x" className="text-success mb-3" />
                <h4>ログイン成功</h4>
                <p className="text-muted mb-4">
                  ダッシュボードに移動しています...
                </p>
                <MDBBtn href="/dashboard" color="primary">
                  <MDBIcon fas icon="tachometer-alt" className="me-2" />
                  ダッシュボードへ
                </MDBBtn>
              </MDBCardBody>
            </MDBCard>
          </MDBCol>
        </MDBRow>
      ) : (
          // 未ログインユーザー向けランディングページ
          <>
            {/* ヘッダーセクション */}
            <MDBRow className="mb-5">
              <MDBCol md="12" className="text-center">
                <h1 className="display-4 fw-bold text-primary mb-3">
                  <MDBIcon fas icon="chart-line" className="me-3" />
                  GrowReporter
                </h1>
                <p className="lead text-secondary">
                  Google Analytics 4、Search Consoleを統合した
                  <br />
                  AI分析による実行可能な改善提案プラットフォーム
                </p>
              </MDBCol>
            </MDBRow>

            {/* 機能紹介カード */}
            <MDBRow className="g-4 mb-5">
              <MDBCol lg="4" md="6">
                <MDBCard className="h-100 shadow-sm">
                  <MDBCardBody className="text-center">
                    <MDBIcon fas icon="chart-bar" size="3x" className="text-primary mb-3" />
                    <MDBCardTitle>統合ダッシュボード</MDBCardTitle>
                    <MDBCardText>
                      GA4、Search Consoleのデータを
                      一つの画面で確認できます
                    </MDBCardText>
                  </MDBCardBody>
                </MDBCard>
              </MDBCol>

              <MDBCol lg="4" md="6">
                <MDBCard className="h-100 shadow-sm">
                  <MDBCardBody className="text-center">
                    <MDBIcon fas icon="robot" size="3x" className="text-success mb-3" />
                    <MDBCardTitle>AI分析</MDBCardTitle>
                    <MDBCardText>
                      Gemini AIによる高度な分析と
                      実行可能な改善提案を提供します
                    </MDBCardText>
                  </MDBCardBody>
                </MDBCard>
              </MDBCol>

              <MDBCol lg="4" md="6">
                <MDBCard className="h-100 shadow-sm">
                  <MDBCardBody className="text-center">
                    <MDBIcon fas icon="share-alt" size="3x" className="text-info mb-3" />
                    <MDBCardTitle>レポート共有</MDBCardTitle>
                    <MDBCardText>
                      分析結果を安全なURLで
                      チームメンバーと共有できます
                    </MDBCardText>
                  </MDBCardBody>
                </MDBCard>
              </MDBCol>
            </MDBRow>

            {/* ログインフォーム */}
            <MDBRow className="justify-content-center">
              <MDBCol lg="6" md="8">
                <LoginForm />
              </MDBCol>
            </MDBRow>
          </>
        )}
      </MDBContainer>
    </>
  );
}
