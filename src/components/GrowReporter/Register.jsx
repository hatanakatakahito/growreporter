import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import logoImg from '../../assets/img/logo.svg';
import loginIllustration from '../../assets/img/login.svg';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../config/firebase';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // 新規登録用の追加フィールド
  const [companyName, setCompanyName] = useState('');
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isFromInvitation, setIsFromInvitation] = useState(false);
  const [isLoadingInvitation, setIsLoadingInvitation] = useState(false);
  
  const { signup, loginWithGoogle, loginWithMicrosoft, fetchUserProfile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/dashboard';

  // 招待トークンから情報を取得
  useEffect(() => {
    const fetchInvitationInfo = async () => {
      const redirectParam = searchParams.get('redirect');
      console.log('[Register] redirect param:', redirectParam);
      
      if (!redirectParam || !redirectParam.includes('accept-invitation')) {
        console.log('[Register] No invitation redirect found');
        return;
      }

      // redirect URLからトークンを抽出
      const tokenMatch = redirectParam.match(/token=([^&]+)/);
      console.log('[Register] token match:', tokenMatch);
      
      if (!tokenMatch) {
        console.log('[Register] No token found in redirect URL');
        return;
      }

      const token = tokenMatch[1];
      console.log('[Register] Extracted token:', token);
      setIsLoadingInvitation(true);

      try {
        const getInvitationByToken = httpsCallable(functions, 'getInvitationByToken');
        const result = await getInvitationByToken({ token });
        const invitation = result.data;
        console.log('[Register] Invitation data:', invitation);

        if (invitation) {
          setEmail(invitation.email);
          setCompanyName(invitation.accountOwnerName || '');
          setIsFromInvitation(true);
          console.log('[Register] Set email:', invitation.email, 'company:', invitation.accountOwnerName);
        }
      } catch (err) {
        console.error('[Register] Error fetching invitation:', err);
      } finally {
        setIsLoadingInvitation(false);
      }
    };

    fetchInvitationInfo();
  }, [searchParams]);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    // バリデーション
    if (!companyName || !name || !phoneNumber) {
      setError('すべての必須項目を入力してください');
      setIsSubmitting(false);
      return;
    }

    if (password.length < 6) {
      setError('パスワードは6文字以上で入力してください');
      setIsSubmitting(false);
      return;
    }

    if (!agreedToTerms) {
      setError('利用規約とプライバシーポリシーに同意してください');
      setIsSubmitting(false);
      return;
    }

    try {
      await signup(email, password, {
        displayName: name,
        name,
        company: companyName,
        phoneNumber,
      });
      
      // 招待経由の場合、自動的に招待を承認してダッシュボードへ
      if (isFromInvitation) {
        try {
          // redirect URLからトークンを抽出
          const tokenMatch = redirectUrl.match(/token=([^&]+)/);
          if (tokenMatch) {
            const token = tokenMatch[1];
            const acceptInvitation = httpsCallable(functions, 'acceptInvitation');
            await acceptInvitation({ token });
            console.log('[Register] Auto-accepted invitation after signup');
          }
        } catch (inviteError) {
          console.error('[Register] Failed to auto-accept invitation:', inviteError);
          // 招待承認に失敗しても登録は成功しているので、招待画面へ遷移
          navigate(redirectUrl);
          return;
        }
        // 招待承認成功、ダッシュボードへ
        navigate('/dashboard');
      } else {
        // 通常の新規登録の場合、リダイレクト先へ遷移
        navigate(redirectUrl);
      }
    } catch (err) {
      console.error('Register error:', err);
      
      // Firebaseエラーメッセージを日本語化
      let errorMessage = '登録エラーが発生しました';
      if (err.code === 'auth/email-already-in-use') {
        errorMessage = 'このメールアドレスは既に使用されています';
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = 'メールアドレスの形式が正しくありません';
      } else if (err.code === 'auth/weak-password') {
        errorMessage = 'パスワードが弱すぎます。6文字以上で入力してください';
      }
      
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setIsSubmitting(true);

    try {
      const userCredential = await loginWithGoogle();
      
        // ユーザープロファイルを取得して情報が揃っているかチェック
        setTimeout(async () => {
          const profile = await fetchUserProfile(userCredential.user.uid);
          
          // 必須情報が不足している場合はSSO後の情報補完画面へ
          if (!profile?.company || !profile?.phoneNumber) {
            navigate('/register/complete');
          } else {
            // 情報が揃っている場合はリダイレクト先へ遷移
            navigate(redirectUrl);
          }
        }, 500);
    } catch (err) {
      console.error('Google sign in error:', err);
      
      let errorMessage = 'Google認証エラーが発生しました';
      if (err.code === 'auth/popup-closed-by-user') {
        errorMessage = '認証がキャンセルされました';
      } else if (err.code === 'auth/popup-blocked') {
        errorMessage = 'ポップアップがブロックされました。ブラウザの設定を確認してください';
      }
      
      setError(errorMessage);
      setIsSubmitting(false);
    }
  };

  const handleMicrosoftSignIn = async () => {
    setError('');
    setIsSubmitting(true);

    try {
      const userCredential = await loginWithMicrosoft();

      setTimeout(async () => {
        const profile = await fetchUserProfile(userCredential.user.uid);

        if (!profile?.company || !profile?.phoneNumber) {
          navigate('/register/complete');
        } else {
          navigate(redirectUrl);
        }
      }, 500);
    } catch (err) {
      console.error('Microsoft sign in error:', err);

      let errorMessage = 'Microsoft認証エラーが発生しました';
      if (err.code === 'auth/popup-closed-by-user') {
        errorMessage = '認証がキャンセルされました';
      } else if (err.code === 'auth/popup-blocked') {
        errorMessage = 'ポップアップがブロックされました。ブラウザの設定を確認してください';
      }

      setError(errorMessage);
      setIsSubmitting(false);
    }
  };

  return (
    <section className="relative z-10 flex min-h-screen items-center justify-center py-12 lg:py-20" style={{
      backgroundColor: 'rgb(244, 244, 244)'
    }}>
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-[820px] overflow-hidden rounded-2xl bg-white shadow-lg dark:bg-dark-2">
          {/* ロゴエリア（青紫グラデーション） */}
          <div className="bg-gradient-primary px-8 py-6 text-center">
            <div className="flex items-center justify-center">
              <img src={logoImg} alt="グローレポータ" className="h-10 w-auto brightness-0 invert" />
            </div>
            {isFromInvitation && (
              <h2 className="mt-2 text-lg font-bold text-white">
                招待を受けてアカウント作成
              </h2>
            )}
          </div>
          {/* フォームエリア */}
          <div className="flex w-full items-center justify-center px-20 py-10">
            <div className="w-full">
              {/* タブナビゲーション（招待経由の場合は非表示） */}
              {!isFromInvitation && (
                <div className="mb-6 flex gap-2 rounded-lg bg-gray-100 p-1 dark:bg-dark-3">
                  <Link
                    to="/login"
                    className="flex-1 rounded-md px-4 py-2.5 text-center text-sm font-medium transition-all text-body-color hover:text-dark dark:text-dark-6 dark:hover:text-white"
                  >
                    ログイン
                  </Link>
                  <button
                    type="button"
                    className="flex-1 rounded-md px-4 py-2.5 text-sm font-medium transition-all bg-white text-dark shadow-sm dark:bg-dark-2 dark:text-white"
                  >
                    新規ユーザー登録
                  </button>
                </div>
              )}

              {/* エラーメッセージ */}
              {error && (
                <div className="mb-6 flex items-start gap-3 rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                    <svg className="h-5 w-5 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h5 className="mb-1 text-sm font-semibold text-red-800 dark:text-red-300">エラー</h5>
                    <p className="text-sm leading-relaxed text-red-700 dark:text-red-400">{error}</p>
                  </div>
                  <button
                    onClick={() => setError('')}
                    className="flex-shrink-0 text-red-400 hover:text-red-600 dark:text-red-500 dark:hover:text-red-300"
                  >
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              )}

              {/* Googleから登録ボタン（招待経由の場合は非表示） */}
              {!isFromInvitation && (
                <>
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={isSubmitting}
                    className="mb-2 flex w-full items-center justify-center gap-3 rounded-md border border-stroke bg-transparent px-4 py-3 text-sm font-medium text-dark hover:bg-gray-50 dark:border-dark-3 dark:text-white dark:hover:bg-dark-3 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <g clipPath="url(#clip0_google)">
                        <path d="M19.9895 10.1871C19.9895 9.36767 19.9214 8.76973 19.7742 8.14966H10.1992V11.848H15.8195C15.7062 12.7671 15.0943 14.1512 13.7346 15.0813L13.7155 15.2051L16.7429 17.4969L16.9527 17.5174C18.879 15.7789 19.9895 13.221 19.9895 10.1871Z" fill="#4285F4"/>
                        <path d="M10.1993 19.9313C12.9527 19.9313 15.2643 19.0454 16.9527 17.5174L13.7346 15.0813C12.8734 15.6682 11.7176 16.0779 10.1993 16.0779C7.50243 16.0779 5.21352 14.3395 4.39759 11.9366L4.27799 11.9465L1.13003 14.3273L1.08887 14.4391C2.76588 17.6945 6.21061 19.9313 10.1993 19.9313Z" fill="#34A853"/>
                        <path d="M4.39748 11.9366C4.18219 11.3166 4.05759 10.6521 4.05759 9.96565C4.05759 9.27909 4.18219 8.61473 4.38615 7.99466L4.38045 7.8626L1.19304 5.44366L1.08875 5.49214C0.397576 6.84305 0.000976562 8.36008 0.000976562 9.96565C0.000976562 11.5712 0.397576 13.0882 1.08875 14.4391L4.39748 11.9366Z" fill="#FBBC05"/>
                        <path d="M10.1993 3.85336C12.1142 3.85336 13.406 4.66168 14.1425 5.33718L17.0207 2.59107C15.253 0.985496 12.9527 0 10.1993 0C6.2106 0 2.76588 2.23672 1.08887 5.49214L4.38626 7.99466C5.21352 5.59183 7.50242 3.85336 10.1993 3.85336Z" fill="#EB4335"/>
                      </g>
                      <defs>
                        <clipPath id="clip0_google">
                          <rect width="20" height="20" fill="white"/>
                        </clipPath>
                      </defs>
                    </svg>
                    Googleから登録
                  </button>

                  <button
                    type="button"
                    onClick={handleMicrosoftSignIn}
                    disabled={isSubmitting}
                    className="mb-0 flex w-full items-center justify-center gap-3 rounded-md border border-stroke bg-transparent px-4 py-3 text-sm font-medium text-dark hover:bg-gray-50 dark:border-dark-3 dark:text-white dark:hover:bg-dark-3 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <svg width="20" height="20" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M0 0H10V10H0V0Z" fill="#F25022"/>
                      <path d="M11 0H21V10H11V0Z" fill="#7FBA00"/>
                      <path d="M0 11H10V21H0V11Z" fill="#00A4EF"/>
                      <path d="M11 11H21V21H11V11Z" fill="#FFB900"/>
                    </svg>
                    Microsoftから登録
                  </button>

                  {/* 区切り線 */}
                  <div className="my-6 border-t border-gray-200 dark:border-dark-3"></div>
                </>
              )}

              {isFromInvitation && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg dark:bg-blue-900/20 dark:border-blue-800">
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    <strong>{companyName}</strong> への招待を受けています。アカウントを作成して参加しましょう。
                  </p>
                </div>
              )}

              <form onSubmit={handleRegister}>
                <div className="mb-6">
                  <label className="mb-2 flex items-center gap-2 text-sm font-medium text-dark dark:text-white">
                    組織名
                    <span className="text-red-500">*</span>
                    {isFromInvitation && <span className="text-xs text-gray-500">（招待元）</span>}
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="組織名を入力"
                    required
                    readOnly={isFromInvitation}
                    className={`w-full rounded-md border border-stroke px-4 py-2.5 text-sm text-dark outline-none focus:border-primary focus-visible:shadow-none dark:border-dark-3 dark:text-white ${
                      isFromInvitation ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed' : 'bg-transparent'
                    }`}
                  />
                </div>
                <div className="mb-4">
                  <label className="mb-2 flex items-center gap-2 text-sm font-medium text-dark dark:text-white">
                    氏名
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="例: 山田 太郎"
                    required
                    className="w-full rounded-md border border-stroke bg-transparent px-4 py-2.5 text-sm text-dark outline-none focus:border-primary focus-visible:shadow-none dark:border-dark-3 dark:text-white"
                  />
                </div>
                <div className="mb-6">
                  <label className="mb-2 flex items-center gap-2 text-sm font-medium text-dark dark:text-white">
                    電話番号
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => {
                      // ハイフン、スペース、括弧を自動削除
                      const cleaned = e.target.value.replace(/[-\s()]/g, '');
                      setPhoneNumber(cleaned);
                    }}
                    placeholder="09012345678（ハイフンなし）"
                    required
                    className="w-full rounded-md border border-stroke bg-transparent px-4 py-2.5 text-sm text-dark outline-none focus:border-primary focus-visible:shadow-none dark:border-dark-3 dark:text-white"
                  />
                  <p className="mt-1 text-xs text-body-color">※ハイフンは自動で削除されます</p>
                </div>

                {/* メールアドレス */}
                <div className="mb-6">
                  <label className="mb-2 flex items-center gap-2 text-sm font-medium text-dark dark:text-white">
                    メールアドレス
                    <span className="text-red-500">*</span>
                    {isFromInvitation && <span className="text-xs text-gray-500">（招待先）</span>}
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="メールアドレスを入力"
                      required
                      readOnly={isFromInvitation}
                      className={`w-full rounded-md border border-stroke px-4 py-2.5 pr-11 text-sm text-dark outline-none focus:border-primary focus-visible:shadow-none dark:border-dark-3 dark:text-white ${
                        isFromInvitation ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed' : 'bg-transparent'
                      }`}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2">
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 20 20"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M3.33331 5.83333L10 10.8333L16.6666 5.83333"
                          stroke="#9CA3AF"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <rect
                          x="2.5"
                          y="4.16667"
                          width="15"
                          height="11.6667"
                          rx="2"
                          stroke="#9CA3AF"
                          strokeWidth="1.5"
                        />
                      </svg>
                    </span>
                  </div>
                </div>

                {/* パスワード */}
                <div className="mb-5">
                  <label className="mb-2 flex items-center gap-2 text-sm font-medium text-dark dark:text-white">
                    パスワード
                    <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="6文字以上"
                      required
                      className="w-full rounded-md border border-stroke bg-transparent px-4 py-2.5 pr-11 text-sm text-dark outline-none focus:border-primary focus-visible:shadow-none dark:border-dark-3 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      {showPassword ? (
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 20 20"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M3.26 11.6C2.83 10.79 2.83 9.21 3.26 8.4C4.42 6.13 7.03 4 10 4C12.97 4 15.58 6.13 16.74 8.4C17.17 9.21 17.17 10.79 16.74 11.6C15.58 13.87 12.97 16 10 16C7.03 16 4.42 13.87 3.26 11.6Z"
                            stroke="currentColor"
                            strokeWidth="1.5"
                          />
                          <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
                          <line x1="3" y1="3" x2="17" y2="17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                      ) : (
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 20 20"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M3.26 11.6C2.83 10.79 2.83 9.21 3.26 8.4C4.42 6.13 7.03 4 10 4C12.97 4 15.58 6.13 16.74 8.4C17.17 9.21 17.17 10.79 16.74 11.6C15.58 13.87 12.97 16 10 16C7.03 16 4.42 13.87 3.26 11.6Z"
                            stroke="currentColor"
                            strokeWidth="1.5"
                          />
                          <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* 利用規約・プライバシーポリシー同意 */}
                <div className="mb-4">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agreedToTerms}
                      onChange={(e) => setAgreedToTerms(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <span className="text-sm text-body-color dark:text-dark-6">
                      <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">利用規約</a>
                      と
                      <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">プライバシーポリシー</a>
                      に同意します
                    </span>
                  </label>
                </div>

                {/* 送信ボタン */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="mb-4 w-full rounded-md bg-primary px-4 py-3 text-center text-sm font-medium text-white hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting ? '処理中...' : 'アカウントを作成'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
