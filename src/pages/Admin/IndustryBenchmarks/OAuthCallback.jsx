import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../../config/firebase';
import { setPageTitle } from '../../../utils/pageTitle';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import { CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '../../../components/ui/button';

/**
 * lively-aggregating-bobcat: OAuth callback ページ
 *
 * URL: `/admin/industry-benchmarks/oauth-callback?code=XXX&state=YYY`
 *
 * Tokens 画面で「+ アカウント追加」または「再認証」ボタンを押すと、
 * Google OAuth 認可画面に遷移し、ユーザーが同意すると本ページに戻ってくる。
 * ここで `exchangeBenchmarkOAuthCode` callable を呼んで code をトークンに交換、
 * `serviceTokens/{email}` に保存する。
 *
 * 完了後は Tokens 画面に戻る。
 */
export default function IndustryBenchmarksOAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('processing'); // 'processing' | 'success' | 'error'
  const [message, setMessage] = useState('');
  const [savedEmail, setSavedEmail] = useState(null);
  const exchangedRef = useRef(false); // 重複呼出防止（StrictMode 対策）

  useEffect(() => {
    setPageTitle('OAuth 認証処理中');

    if (exchangedRef.current) return;
    exchangedRef.current = true;

    const code = searchParams.get('code');
    const oauthError = searchParams.get('error');

    if (oauthError) {
      setStatus('error');
      setMessage(`OAuth エラー: ${oauthError}`);
      return;
    }

    if (!code) {
      setStatus('error');
      setMessage('認可コードが見つかりません');
      return;
    }

    const redirectUri = `${window.location.origin}/admin/industry-benchmarks/oauth-callback`;

    (async () => {
      try {
        const callable = httpsCallable(functions, 'exchangeBenchmarkOAuthCode');
        const result = await callable({ code, redirectUri });
        if (result.data?.success) {
          setStatus('success');
          setSavedEmail(result.data.email);
          setMessage(
            result.data.isReauth
              ? `${result.data.email} を再認証しました`
              : `${result.data.email} を新規追加しました`
          );
        } else {
          setStatus('error');
          setMessage('トークン交換に失敗しました');
        }
      } catch (err) {
        setStatus('error');
        setMessage(err.message || 'トークン交換中にエラーが発生しました');
      }
    })();
  }, [searchParams]);

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center text-center p-6">
      {status === 'processing' && (
        <>
          <LoadingSpinner />
          <p className="mt-4 text-body-color dark:text-dark-6">OAuth トークンを保存中...</p>
        </>
      )}
      {status === 'success' && (
        <>
          <CheckCircle2 size={64} className="text-green-500 mb-4" />
          <h2 className="text-xl font-bold text-dark dark:text-white mb-2">認証完了</h2>
          <p className="text-body-color dark:text-dark-6 mb-6">{message}</p>
          {savedEmail && (
            <p className="font-mono text-sm bg-gray-100 dark:bg-dark-3 px-3 py-1 rounded mb-4">
              {savedEmail}
            </p>
          )}
          <Button variant="primary" onClick={() => navigate('/admin/industry-benchmarks/tokens')}>
            トークン一覧に戻る
          </Button>
        </>
      )}
      {status === 'error' && (
        <>
          <XCircle size={64} className="text-red-500 mb-4" />
          <h2 className="text-xl font-bold text-dark dark:text-white mb-2">認証エラー</h2>
          <p className="text-body-color dark:text-dark-6 mb-6 max-w-lg">{message}</p>
          <Button variant="ghost" onClick={() => navigate('/admin/industry-benchmarks/tokens')}>
            トークン一覧に戻る
          </Button>
        </>
      )}
    </div>
  );
}
