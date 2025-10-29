import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { INDUSTRIES } from '../../constants/industries';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // 新規登録用の追加フィールド
  const [companyName, setCompanyName] = useState('');
  const [lastName, setLastName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [industry, setIndustry] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const { signup, loginWithGoogle, fetchUserProfile } = useAuth();
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    // バリデーション
    if (!companyName || !lastName || !firstName || !phoneNumber || !industry) {
      setError('すべての必須項目を入力してください');
      setIsSubmitting(false);
      return;
    }

    if (password.length < 6) {
      setError('パスワードは6文字以上で入力してください');
      setIsSubmitting(false);
      return;
    }

    try {
      const displayName = `${lastName} ${firstName}`;
      await signup(email, password, {
        displayName,
        company: companyName,
        phoneNumber,
        industry,
      });
      
      // 登録成功後、ダッシュボードへリダイレクト
      navigate('/dashboard');
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
          if (!profile?.company || !profile?.phoneNumber || !profile?.industry) {
            navigate('/register/complete');
          } else {
            // 情報が揃っている場合は初回サイト登録へ
            navigate('/sites/new');
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

  return (
    <section className="relative z-10 flex min-h-screen items-center justify-center bg-gray-50 py-12 lg:py-20" style={{
      backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='32' height='32' fill='none' stroke='%23cbd5e1'%3e%3ccircle fill='%23cbd5e1' cx='16' cy='16' r='0.5'/%3e%3c/svg%3e")`,
      backgroundSize: '32px 32px'
    }}>
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-[1000px] overflow-hidden rounded-2xl bg-white dark:bg-dark-2 lg:flex">
          
          {/* 左側：イラストエリア */}
          <div className="flex w-full items-center justify-center bg-[#F9FAFB] px-6 py-10 dark:bg-dark-3 lg:w-1/2 lg:px-8">
            <div className="w-full max-w-[350px] text-center">
              <div className="mb-5 flex items-center justify-center">
                <img 
                  src="/src/assets/img/logo.svg" 
                  alt="GROW REPORTER" 
                  className="h-10 w-auto"
                />
              </div>
              <p className="mb-8 text-sm text-body-color dark:text-dark-6 lg:text-base">
                GA4、Search Consoleのデータを統合分析し、ビジネス成長をサポートします。
              </p>
              
              {/* イラスト */}
              <div className="mx-auto flex items-center justify-center">
                <img 
                  src="/src/assets/img/login.svg" 
                  alt="Register Illustration" 
                  className="w-full max-w-[280px] h-auto"
                />
              </div>
            </div>
          </div>

          {/* 右側：フォームエリア */}
          <div className="flex w-full items-center justify-center px-6 py-10 lg:w-1/2 lg:px-8">
            <div className="w-full max-w-[400px]">
              {/* タブナビゲーション */}
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

              <form onSubmit={handleRegister}>
                <div className="mb-4">
                  <label className="mb-2 flex items-center gap-2 text-sm font-medium text-dark dark:text-white">
                    組織名
                    <span className="rounded bg-red-500 px-1.5 py-0.5 text-xs text-white">必須</span>
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="組織名を入力"
                    required
                    className="w-full rounded-md border border-stroke bg-transparent px-4 py-2.5 text-sm text-body-color outline-none focus:border-primary focus-visible:shadow-none dark:border-dark-3 dark:text-white"
                  />
                </div>
                <div className="mb-4 grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-2 flex items-center gap-2 text-sm font-medium text-dark dark:text-white">
                      姓
                      <span className="rounded bg-red-500 px-1.5 py-0.5 text-xs text-white">必須</span>
                    </label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="姓を入力"
                      required
                      className="w-full rounded-md border border-stroke bg-transparent px-4 py-2.5 text-sm text-body-color outline-none focus:border-primary focus-visible:shadow-none dark:border-dark-3 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="mb-2 flex items-center gap-2 text-sm font-medium text-dark dark:text-white">
                      名
                      <span className="rounded bg-red-500 px-1.5 py-0.5 text-xs text-white">必須</span>
                    </label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="名を入力"
                      required
                      className="w-full rounded-md border border-stroke bg-transparent px-4 py-2.5 text-sm text-body-color outline-none focus:border-primary focus-visible:shadow-none dark:border-dark-3 dark:text-white"
                    />
                  </div>
                </div>
                <div className="mb-4">
                  <label className="mb-2 flex items-center gap-2 text-sm font-medium text-dark dark:text-white">
                    電話番号
                    <span className="rounded bg-red-500 px-1.5 py-0.5 text-xs text-white">必須</span>
                  </label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="電話番号を入力"
                    required
                    className="w-full rounded-md border border-stroke bg-transparent px-4 py-2.5 text-sm text-body-color outline-none focus:border-primary focus-visible:shadow-none dark:border-dark-3 dark:text-white"
                  />
                </div>
                <div className="mb-4">
                  <label className="mb-2 flex items-center gap-2 text-sm font-medium text-dark dark:text-white">
                    業界・業種
                    <span className="rounded bg-red-500 px-1.5 py-0.5 text-xs text-white">必須</span>
                  </label>
                  <select
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    required
                    className="w-full rounded-md border border-stroke bg-transparent px-4 py-2.5 text-sm text-body-color outline-none focus:border-primary focus-visible:shadow-none dark:border-dark-3 dark:text-white"
                  >
                    <option value="">選択してください</option>
                    {INDUSTRIES.map((ind) => (
                      <option key={ind} value={ind}>{ind}</option>
                    ))}
                  </select>
                </div>

                {/* メールアドレス */}
                <div className="mb-4">
                  <label className="mb-2 flex items-center gap-2 text-sm font-medium text-dark dark:text-white">
                    メールアドレス
                    <span className="rounded bg-red-500 px-1.5 py-0.5 text-xs text-white">必須</span>
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="メールアドレスを入力"
                      required
                      className="w-full rounded-md border border-stroke bg-transparent px-4 py-2.5 pr-11 text-sm text-body-color outline-none focus:border-primary focus-visible:shadow-none dark:border-dark-3 dark:text-white"
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
                    <span className="rounded bg-red-500 px-1.5 py-0.5 text-xs text-white">必須</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="6文字以上、1つの大文字"
                      required
                      className="w-full rounded-md border border-stroke bg-transparent px-4 py-2.5 pr-11 text-sm text-body-color outline-none focus:border-primary focus-visible:shadow-none dark:border-dark-3 dark:text-white"
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
