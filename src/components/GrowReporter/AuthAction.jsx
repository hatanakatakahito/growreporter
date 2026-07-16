import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { getAuth, verifyPasswordResetCode, confirmPasswordReset, applyActionCode, checkActionCode } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import logoImg from '../../assets/img/logo.svg';
import { Eye, EyeOff, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

/**
 * Firebase Auth Action ハンドラー（カスタム UI）
 *
 * デフォルトの Firebase の URL（growgroupreporter.firebaseapp.com/__/auth/action）を
 * 自社ドメイン（grow-reporter.com/auth/action）に置き換えるためのカスタムページ。
 *
 * Firebase Console → Authentication → Templates で
 * Action URL を `https://grow-reporter.com/auth/action` に設定する必要あり。
 *
 * 対応モード:
 *   - resetPassword     : パスワードリセット
 *   - verifyEmail       : メール検証
 *   - recoverEmail      : メール変更の取り消し（受信したメールアドレスへの戻し）
 *
 * URL 例:
 *   /auth/action?mode=resetPassword&oobCode=XXX&apiKey=YYY&lang=ja
 */
export default function AuthAction() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const mode = searchParams.get('mode');
  const oobCode = searchParams.get('oobCode');

  const [phase, setPhase] = useState('verifying'); // verifying | form | success | error
  const [errorMessage, setErrorMessage] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. URL の oobCode を検証
  useEffect(() => {
    const auth = getAuth();
    if (!oobCode) {
      setErrorMessage('リンクが無効です。URL を確認してください。');
      setPhase('error');
      return;
    }

    (async () => {
      try {
        if (mode === 'resetPassword') {
          // resetPassword: oobCode を検証して email を取得
          const verifiedEmail = await verifyPasswordResetCode(auth, oobCode);
          setEmail(verifiedEmail);
          setPhase('form');
        } else if (mode === 'verifyEmail') {
          // verifyEmail: 即時適用
          await applyActionCode(auth, oobCode);
          setPhase('success');
        } else if (mode === 'recoverEmail') {
          // recoverEmail: 旧メールアドレスを取得して即時適用
          const info = await checkActionCode(auth, oobCode);
          setEmail(info.data?.email || '');
          await applyActionCode(auth, oobCode);
          setPhase('success');
        } else {
          setErrorMessage(`サポートされていないアクションモードです: ${mode}`);
          setPhase('error');
        }
      } catch (err) {
        console.error('[AuthAction] verify error:', err);
        let msg = 'リンクの検証に失敗しました。';
        if (err.code === 'auth/expired-action-code') {
          msg = 'リンクの有効期限が切れています。最新のメールから再度アクセスしてください（72時間以内）。';
        } else if (err.code === 'auth/invalid-action-code') {
          msg = 'リンクが無効です。すでに使用済みか、URL が破損している可能性があります。';
        } else if (err.code === 'auth/user-disabled') {
          msg = 'アカウントが無効化されています。管理者にお問い合わせください。';
        } else if (err.code === 'auth/user-not-found') {
          msg = 'アカウントが見つかりません。管理者にお問い合わせください。';
        } else if (err.message) {
          msg = err.message;
        }
        setErrorMessage(msg);
        setPhase('error');
      }
    })();
  }, [mode, oobCode]);

  // 2. パスワードリセット送信
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (password.length < 6) {
      setErrorMessage('パスワードは 6 文字以上で入力してください。');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('パスワードが一致しません。');
      return;
    }

    setIsSubmitting(true);
    try {
      const auth = getAuth();
      await confirmPasswordReset(auth, oobCode, password);
      setPhase('success');
    } catch (err) {
      console.error('[AuthAction] confirmPasswordReset error:', err);
      let msg = 'パスワードの設定に失敗しました。';
      if (err.code === 'auth/expired-action-code') {
        msg = 'リンクの有効期限が切れています。';
      } else if (err.code === 'auth/invalid-action-code') {
        msg = 'リンクが無効です。';
      } else if (err.code === 'auth/weak-password') {
        msg = 'パスワードが弱すぎます。6 文字以上で、推測されにくい文字列にしてください。';
      } else if (err.message) {
        msg = err.message;
      }
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="relative z-10 flex min-h-screen items-center justify-center py-12 lg:py-20" style={{ backgroundColor: 'rgb(244, 244, 244)' }}>
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-[820px] overflow-hidden rounded-2xl bg-white shadow-lg dark:bg-dark-2">
          {/* ロゴエリア (グラデヘッダー) */}
          <div className="bg-gradient-primary px-8 py-6 text-center">
            <div className="flex items-center justify-center">
              <img src={logoImg} alt="グローレポータ" className="h-10 w-auto brightness-0 invert" />
            </div>
          </div>

          {/* フォームエリア */}
          <div className="flex w-full items-center justify-center px-8 py-10 sm:px-12 lg:px-20">
            <div className="w-full max-w-[480px]">
              {/* 検証中 */}
              {phase === 'verifying' && (
                <div className="text-center">
                  <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-primary" />
                  <h2 className="mb-2 text-xl font-bold text-dark dark:text-white">
                    リンクを確認しています...
                  </h2>
                  <p className="text-sm text-body-color dark:text-dark-6">
                    しばらくお待ちください。
                  </p>
                </div>
              )}

              {/* パスワードリセットフォーム */}
              {phase === 'form' && mode === 'resetPassword' && (
                <>
                  <div className="mb-6">
                    <h2 className="mb-2 text-2xl font-bold text-dark dark:text-white">
                      パスワードを設定
                    </h2>
                    <p className="text-sm text-body-color dark:text-dark-6">
                      アカウントの新しいパスワードを設定してください。
                    </p>
                  </div>

                  {/* メールアドレス（読取専用表示） */}
                  <div className="mb-4 rounded-lg bg-gray-50 p-3 dark:bg-dark-3">
                    <div className="text-xs text-body-color dark:text-dark-6">アカウント</div>
                    <div className="mt-0.5 text-sm font-medium text-dark dark:text-white">{email}</div>
                  </div>

                  {/* エラー */}
                  {errorMessage && (
                    <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 p-3 dark:bg-red-900/20">
                      <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-600" />
                      <p className="text-sm text-red-700 dark:text-red-400">{errorMessage}</p>
                    </div>
                  )}

                  <form onSubmit={handleResetPassword}>
                    {/* 新しいパスワード */}
                    <div className="mb-4">
                      <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                        新しいパスワード
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="6文字以上"
                          required
                          minLength={6}
                          autoComplete="new-password"
                          className="w-full rounded-md border border-stroke bg-transparent px-4 py-2.5 pr-11 text-sm text-gray-900 outline-none focus:border-primary focus-visible:shadow-none dark:border-dark-3 dark:text-white"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          tabIndex={-1}
                        >
                          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>

                    {/* パスワード確認 */}
                    <div className="mb-6">
                      <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                        パスワード（確認）
                      </label>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="同じパスワードをもう一度"
                        required
                        minLength={6}
                        autoComplete="new-password"
                        className="w-full rounded-md border border-stroke bg-transparent px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-primary focus-visible:shadow-none dark:border-dark-3 dark:text-white"
                      />
                    </div>

                    {/* 送信ボタン */}
                    <Button
                      variant="primary"
                      type="submit"
                      size="lg"
                      disabled={isSubmitting || !password || !confirmPassword}
                      className="w-full"
                    >
                      {isSubmitting ? '設定中...' : 'パスワードを保存'}
                    </Button>
                  </form>

                  <p className="mt-6 text-center text-xs text-body-color dark:text-dark-6">
                    パスワードは 6 文字以上で、他者に推測されにくい文字列を設定してください。
                  </p>
                </>
              )}

              {/* 成功 */}
              {phase === 'success' && (
                <div className="text-center">
                  <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                    <CheckCircle2 className="h-9 w-9 text-green-600 dark:text-green-400" />
                  </div>
                  <h2 className="mb-2 text-2xl font-bold text-dark dark:text-white">
                    {mode === 'resetPassword' && 'パスワードを設定しました'}
                    {mode === 'verifyEmail' && 'メールアドレスを確認しました'}
                    {mode === 'recoverEmail' && 'メールアドレスを元に戻しました'}
                  </h2>
                  <p className="mb-6 text-sm text-body-color dark:text-dark-6">
                    {mode === 'resetPassword' && 'これで新しいパスワードでログインできます。'}
                    {mode === 'verifyEmail' && 'アカウントの認証が完了しました。'}
                    {mode === 'recoverEmail' && '元のメールアドレスでログインできます。念のためパスワードもリセットすることを推奨します。'}
                  </p>
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={() => navigate('/login')}
                    className="w-full"
                  >
                    ログイン画面へ
                  </Button>
                </div>
              )}

              {/* エラー */}
              {phase === 'error' && (
                <div className="text-center">
                  <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                    <AlertCircle className="h-9 w-9 text-red-600 dark:text-red-400" />
                  </div>
                  <h2 className="mb-2 text-2xl font-bold text-dark dark:text-white">
                    リンクが無効です
                  </h2>
                  <p className="mb-6 text-sm text-body-color dark:text-dark-6">
                    {errorMessage}
                  </p>
                  <div className="space-y-2">
                    <Link to="/login" className="block">
                      <Button variant="primary" size="lg" className="w-full">
                        ログイン画面へ
                      </Button>
                    </Link>
                    <p className="text-xs text-body-color dark:text-dark-6">
                      新しいリンクが必要な場合は、管理者にお問い合わせください。
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
