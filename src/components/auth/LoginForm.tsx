'use client';

import React, { useState } from 'react';
import {
  MDBCard,
  MDBCardBody,
  MDBCardTitle,
  MDBBtn,
  MDBIcon,
  MDBSpinner,
  MDBTabs,
  MDBTabsItem,
  MDBTabsLink,
  MDBTabsContent,
  MDBTabsPane
} from 'mdb-react-ui-kit';
import { useAuth } from '@/lib/auth/authContext';
import EmailAuthForm from './EmailAuthForm';

const LoginForm: React.FC = () => {
  const { signInWithGoogle, signInWithMicrosoft, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('sso');
  const [error, setError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setError(null);
    setAuthLoading(true);
    try {
      await signInWithGoogle();
    } catch (error: any) {
      setError('Googleログインに失敗しました: ' + error.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleMicrosoftSignIn = async () => {
    setError(null);
    setAuthLoading(true);
    try {
      await signInWithMicrosoft();
    } catch (error: any) {
      setError('Microsoftログインに失敗しました: ' + error.message);
    } finally {
      setAuthLoading(false);
    }
  };

  if (loading || authLoading) {
    return (
      <MDBCard className="text-center">
        <MDBCardBody className="py-5">
          <MDBSpinner role="status">
            <span className="visually-hidden">読み込み中...</span>
          </MDBSpinner>
          <p className="mt-3 text-muted">認証処理中...</p>
        </MDBCardBody>
      </MDBCard>
    );
  }

  return (
    <MDBCard className="shadow-sm">
      <MDBCardBody className="p-5">
        <MDBCardTitle className="text-center mb-4">
          <MDBIcon fas icon="sign-in-alt" className="me-2" />
          GrowReporterにログイン
        </MDBCardTitle>

        <MDBTabs className="mb-4">
          <MDBTabsItem>
            <MDBTabsLink
              onClick={() => setActiveTab('sso')}
              active={activeTab === 'sso'}
            >
              <MDBIcon fas icon="shield-alt" className="me-2" />
              SSO認証
            </MDBTabsLink>
          </MDBTabsItem>
          <MDBTabsItem>
            <MDBTabsLink
              onClick={() => setActiveTab('email')}
              active={activeTab === 'email'}
            >
              <MDBIcon fas icon="envelope" className="me-2" />
              メール認証
            </MDBTabsLink>
          </MDBTabsItem>
        </MDBTabs>

        <MDBTabsContent>
          {/* SSO認証タブ */}
          <MDBTabsPane open={activeTab === 'sso'}>
            {error && (
              <div className="alert alert-danger mb-4" role="alert">
                {error}
              </div>
            )}

            <div className="d-grid gap-3">
              <MDBBtn
                color="primary"
                size="lg"
                onClick={handleGoogleSignIn}
                disabled={authLoading}
                className="d-flex align-items-center justify-content-center"
              >
                <MDBIcon fab icon="google" className="me-2" />
                Googleアカウントでログイン
              </MDBBtn>

              <MDBBtn
                color="info"
                size="lg"
                onClick={handleMicrosoftSignIn}
                disabled={authLoading}
                className="d-flex align-items-center justify-content-center"
              >
                <MDBIcon fab icon="microsoft" className="me-2" />
                Microsoftアカウントでログイン
              </MDBBtn>
            </div>
          </MDBTabsPane>

          {/* メール認証タブ */}
          <MDBTabsPane open={activeTab === 'email'}>
            <EmailAuthForm />
          </MDBTabsPane>
        </MDBTabsContent>

        <hr className="my-4" />

        <p className="text-center text-muted small">
          ログインすることで、
          <a href="/terms" className="text-decoration-none">利用規約</a>
          および
          <a href="/privacy" className="text-decoration-none">プライバシーポリシー</a>
          に同意したものとみなされます。
        </p>
      </MDBCardBody>
    </MDBCard>
  );
};

export default LoginForm;
