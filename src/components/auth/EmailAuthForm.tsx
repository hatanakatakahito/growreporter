'use client';

import React, { useState } from 'react';
import {
  MDBCard,
  MDBCardBody,
  MDBCardTitle,
  MDBBtn,
  MDBIcon,
  MDBInput,
  MDBTabs,
  MDBTabsItem,
  MDBTabsLink,
  MDBTabsContent,
  MDBTabsPane
} from 'mdb-react-ui-kit';
import Loading from '@/components/common/Loading';
import { useAuth } from '@/lib/auth/authContext';

const EmailAuthForm: React.FC = () => {
  const { signInWithEmail, signUpWithEmail, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!email || !password) {
      setError('メールアドレスとパスワードを入力してください。');
      return;
    }

    try {
      await signInWithEmail(email, password);
    } catch (err: any) {
      setError(getErrorMessage(err.code));
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!email || !password || !confirmPassword) {
      setError('すべての項目を入力してください。');
      return;
    }

    if (password !== confirmPassword) {
      setError('パスワードが一致しません。');
      return;
    }

    if (password.length < 6) {
      setError('パスワードは6文字以上で入力してください。');
      return;
    }

    try {
      await signUpWithEmail(email, password);
    } catch (err: any) {
      setError(getErrorMessage(err.code));
    }
  };

  const getErrorMessage = (errorCode: string): string => {
    switch (errorCode) {
      case 'auth/user-not-found':
        return 'ユーザーが見つかりません。';
      case 'auth/wrong-password':
        return 'パスワードが間違っています。';
      case 'auth/email-already-in-use':
        return 'このメールアドレスは既に使用されています。';
      case 'auth/weak-password':
        return 'パスワードが弱すぎます。';
      case 'auth/invalid-email':
        return 'メールアドレスの形式が正しくありません。';
      default:
        return 'エラーが発生しました。もう一度お試しください。';
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setError(null);
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    resetForm();
  };

  return (
    <MDBCard className="shadow-5">
      <MDBCardBody className="p-5">
        <MDBCardTitle className="text-center mb-4">
          <MDBIcon fas icon="envelope" className="me-2" />
          メール認証
        </MDBCardTitle>

        {error && (
          <div className="alert alert-danger mb-4" role="alert">
            {error}
          </div>
        )}

        <MDBTabs className="mb-4">
          <MDBTabsItem>
            <MDBTabsLink
              onClick={() => handleTabChange('login')}
              active={activeTab === 'login'}
            >
              ログイン
            </MDBTabsLink>
          </MDBTabsItem>
          <MDBTabsItem>
            <MDBTabsLink
              onClick={() => handleTabChange('signup')}
              active={activeTab === 'signup'}
            >
              新規登録
            </MDBTabsLink>
          </MDBTabsItem>
        </MDBTabs>

        <MDBTabsContent>
          {/* ログインタブ */}
          <MDBTabsPane open={activeTab === 'login'}>
            <form onSubmit={handleLogin}>
              <MDBInput
                type="email"
                label="メールアドレス"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mb-4"
                required
              />
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
                size="lg"
                className="w-100"
                disabled={loading}
              >
                {loading ? (
                  <Loading size={16} className="me-2" />
                ) : (
                  <MDBIcon fas icon="sign-in-alt" className="me-2" />
                )}
                ログイン
              </MDBBtn>
            </form>
          </MDBTabsPane>

          {/* 新規登録タブ */}
          <MDBTabsPane open={activeTab === 'signup'}>
            <form onSubmit={handleSignUp}>
              <MDBInput
                type="email"
                label="メールアドレス"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mb-4"
                required
              />
              <MDBInput
                type="password"
                label="パスワード"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mb-4"
                required
              />
              <MDBInput
                type="password"
                label="パスワード確認"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mb-4"
                required
              />
              <MDBBtn
                type="submit"
                color="success"
                size="lg"
                className="w-100"
                disabled={loading}
              >
                {loading ? (
                  <Loading size={16} className="me-2" />
                ) : (
                  <MDBIcon fas icon="user-plus" className="me-2" />
                )}
                新規登録
              </MDBBtn>
            </form>
          </MDBTabsPane>
        </MDBTabsContent>
      </MDBCardBody>
    </MDBCard>
  );
};

export default EmailAuthForm;

