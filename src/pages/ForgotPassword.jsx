import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { setPageTitle } from '../utils/pageTitle';
import logoImg from '../assets/img/logo.svg';
import loginIllustration from '../assets/img/login.svg';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { resetPassword } = useAuth();

  useEffect(() => { setPageTitle('パスワード再設定'); }, []);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsSubmitting(true);

    try {
      await resetPassword(email);
      setMessage('パスワードリセットメールを送信しました。メールをご確認ください。');
    } catch (err) {
      console.error('Password reset error:', err);
      let errorMessage = 'パスワードリセットに失敗しました';
      if (err.code === 'auth/user-not-found') {
        errorMessage = 'このメールアドレスのアカウントが見つかりません';
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = 'メールアドレスの形式が正しくありません';
      } else if (err.code === 'auth/too-many-requests') {
        errorMessage = 'リクエストが多すぎます。しばらく待ってから再度お試しください';
      }
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="relative z-10 flex min-h-screen items-center justify-center py-12 lg:py-20" style={{
      backgroundColor: 'rgb(244, 244, 244)'
    }}>
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-[1000px] overflow-hidden rounded-2xl bg-white dark:bg-dark-2 lg:flex">

          {/* 左側：イラストエリア */}
          <div className="flex w-full items-center justify-center bg-[#F9FAFB] px-6 py-10 dark:bg-dark-3 lg:w-1/2 lg:px-8">
            <div className="w-full max-w-[400px] text-center">
              <div className="mb-5 flex items-center justify-center">
                <img
                  src={logoImg}
                  alt="GROW REPORTER"
                  className="h-14 w-auto"
                />
              </div>
              <p className="mb-8 text-center text-sm text-body-color dark:text-dark-6 lg:text-base">
                グローレポーターは、アクセス解析にAIを掛け合わせ、
                <br />
                "次の打ち手"まで導くサイト改善ツールです。
              </p>

              {/* イラスト */}
              <div className="mx-auto flex items-center justify-center">
                <img
                  src={loginIllustration}
                  alt="Login Illustration"
                  className="w-full max-w-[400px] h-auto"
                />
              </div>
            </div>
          </div>

          {/* 右側：フォームエリア */}
          <div className="flex w-full items-center justify-center px-6 py-10 lg:w-1/2 lg:px-8">
            <div className="w-full max-w-[400px]">
              <h2 className="mb-2 text-xl font-bold text-dark dark:text-white">
                パスワードをリセット
              </h2>
              <p className="mb-6 text-sm text-body-color dark:text-dark-6">
                登録済みのメールアドレスを入力してください。パスワードリセット用のメールをお送りします。
              </p>

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

              {/* 成功メッセージ */}
              {message && (
                <div className="mb-6 flex items-start gap-3 rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                    <svg className="h-5 w-5 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm leading-relaxed text-green-700 dark:text-green-400">{message}</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleResetPassword}>
                {/* メールアドレス */}
                <div className="mb-5">
                  <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                    メールアドレス
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="メールアドレスを入力"
                      required
                      className="w-full rounded-md border border-stroke bg-transparent px-4 py-2.5 pr-11 text-sm text-gray-900 outline-none focus:border-primary focus-visible:shadow-none dark:border-dark-3 dark:text-white"
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

                {/* SSO利用者への注意 */}
                <p className="mb-4 rounded-md bg-amber-50 p-3 text-xs leading-relaxed text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                  Google または Microsoft アカウントでご登録の方は、パスワードリセットは不要です。ログイン画面から該当のボタンでログインしてください。
                </p>

                {/* 送信ボタン */}
                <button
                  type="submit"
                  disabled={isSubmitting || !email}
                  className="mb-4 w-full rounded-md bg-primary px-4 py-3 text-center text-sm font-medium text-white hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting ? '送信中...' : 'リセットメールを送信'}
                </button>
              </form>

              <div className="text-center">
                <Link
                  to="/login"

                  className="text-sm text-primary hover:underline"
                >
                  &larr; ログイン画面に戻る
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
