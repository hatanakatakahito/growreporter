import { useEffect, useState } from 'react';
import { setPageTitle } from '../../../utils/pageTitle';
import {
  useBenchmarkTokens,
  useGetBenchmarkOAuthUrl,
  useTestBenchmarkToken,
  useRevokeBenchmarkToken,
} from '../../../hooks/useBenchmarkTokens';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import ErrorAlert from '../../../components/common/ErrorAlert';
import { Button } from '../../../components/ui/button';
import { Plus, RotateCw, CheckCircle2, XCircle, ShieldOff } from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * lively-aggregating-bobcat: ベンチマーク用 OAuth トークン管理画面
 *
 * `/admin/industry-benchmarks/tokens`
 *
 * 機能:
 *   - 既存トークン一覧（email、status、追加日、最終更新、最終バッチ統計）
 *   - 「+ アカウント追加」ボタン → OAuth フロー開始
 *   - 「再認証」ボタン → 同じ email で再 OAuth
 *   - 「テスト」ボタン → GA4/GSC API 疎通確認
 *   - 「無効化」ボタン → status=revoked
 */
export default function IndustryBenchmarksTokens() {
  const { data: tokens, isLoading, error, refetch } = useBenchmarkTokens();
  const { mutateAsync: getOAuthUrl } = useGetBenchmarkOAuthUrl();
  const { mutateAsync: testToken } = useTestBenchmarkToken();
  const { mutateAsync: revokeToken } = useRevokeBenchmarkToken();

  const [testResults, setTestResults] = useState({}); // email -> { ga4Properties, gscSites, error? }
  const [actionLoading, setActionLoading] = useState({}); // email -> 'test' | 'revoke' | 'reauth'

  useEffect(() => {
    setPageTitle('業界ベンチマーク - OAuth管理');
  }, []);

  const handleAdd = async () => {
    const redirectUri = `${window.location.origin}/admin/industry-benchmarks/oauth-callback`;
    try {
      const authUrl = await getOAuthUrl({ redirectUri });
      // 同一タブで遷移（OAuth callback で戻ってくる）
      window.location.href = authUrl;
    } catch (e) {
      toast.error(`OAuth URL取得失敗: ${e.message}`);
    }
  };

  const handleReauth = async (email) => {
    setActionLoading((s) => ({ ...s, [email]: 'reauth' }));
    const redirectUri = `${window.location.origin}/admin/industry-benchmarks/oauth-callback`;
    try {
      const authUrl = await getOAuthUrl({ redirectUri, email });
      window.location.href = authUrl;
    } catch (e) {
      toast.error(`再認証 URL取得失敗: ${e.message}`);
      setActionLoading((s) => ({ ...s, [email]: null }));
    }
  };

  const handleTest = async (email) => {
    setActionLoading((s) => ({ ...s, [email]: 'test' }));
    try {
      const result = await testToken(email);
      setTestResults((s) => ({ ...s, [email]: result }));
      if (result.success) {
        toast.success(`${email}: GA4 ${result.ga4Properties}件 / GSC ${result.gscSites}件`);
      } else {
        toast.error(`${email}: ${result.error || '失敗'}`);
      }
    } catch (e) {
      toast.error(`テスト失敗: ${e.message}`);
    } finally {
      setActionLoading((s) => ({ ...s, [email]: null }));
    }
  };

  const handleRevoke = async (email) => {
    if (!window.confirm(`${email} のトークンを無効化しますか？翌月以降のバッチで除外されます。`)) {
      return;
    }
    setActionLoading((s) => ({ ...s, [email]: 'revoke' }));
    try {
      await revokeToken(email);
      toast.success(`${email} を無効化しました`);
    } catch (e) {
      toast.error(`無効化失敗: ${e.message}`);
    } finally {
      setActionLoading((s) => ({ ...s, [email]: null }));
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-dark dark:text-white">
            業界ベンチマーク OAuth管理
          </h2>
          <p className="mt-1 text-sm text-body-color dark:text-dark-6">
            ベンチマーク母集団のデータ取得元となる Google アカウントの OAuth トークンを管理。
            毎月のバッチで status='active' のトークンを使用。
          </p>
        </div>
        <Button variant="primary" onClick={handleAdd}>
          <Plus size={16} />
          アカウント追加
        </Button>
      </div>

      {isLoading && (
        <div className="flex min-h-[300px] items-center justify-center">
          <LoadingSpinner />
        </div>
      )}

      {error && !isLoading && (
        <ErrorAlert message={error.message} onRetry={() => refetch()} />
      )}

      {!isLoading && !error && (
        <div className="space-y-3">
          {tokens?.length === 0 ? (
            <div className="border border-stroke dark:border-dark-3 rounded-lg p-8 text-center text-body-color dark:text-dark-6">
              まだ認証済アカウントがありません。「アカウント追加」から OAuth 認証してください。
            </div>
          ) : (
            tokens?.map((t) => (
              <TokenCard
                key={t.email}
                token={t}
                testResult={testResults[t.email]}
                loading={actionLoading[t.email]}
                onReauth={() => handleReauth(t.email)}
                onTest={() => handleTest(t.email)}
                onRevoke={() => handleRevoke(t.email)}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

function TokenCard({ token, testResult, loading, onReauth, onTest, onRevoke }) {
  const isActive = token.status === 'active';
  const statusClass = isActive
    ? 'bg-green-100 text-green-800'
    : token.status === 'revoked'
    ? 'bg-red-100 text-red-800'
    : 'bg-yellow-100 text-yellow-800';

  return (
    <div className="border border-stroke dark:border-dark-3 rounded-lg p-4 bg-white dark:bg-dark-2">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-mono font-semibold text-dark dark:text-white">{token.email}</span>
          <span className={`px-2 py-0.5 rounded text-xs ${statusClass}`}>{token.status}</span>
          {token.consecutiveFailures > 0 && (
            <span className="px-2 py-0.5 rounded text-xs bg-red-100 text-red-800">
              連続失敗 {token.consecutiveFailures}回
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onTest} disabled={!isActive || !!loading}>
            {loading === 'test' ? <RotateCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            テスト
          </Button>
          <Button variant="ghost" onClick={onReauth} disabled={!!loading}>
            {loading === 'reauth' ? <RotateCw size={14} className="animate-spin" /> : <RotateCw size={14} />}
            再認証
          </Button>
          {isActive && (
            <Button variant="danger-outline" onClick={onRevoke} disabled={!!loading}>
              {loading === 'revoke' ? <RotateCw size={14} className="animate-spin" /> : <ShieldOff size={14} />}
              無効化
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-body-color dark:text-dark-6 mb-2">
        <div>追加: {token.addedAt ? new Date(token.addedAt).toLocaleDateString('ja-JP') : '-'}</div>
        <div>追加者: {token.addedBy || '-'}</div>
        <div>最終更新: {token.lastRefreshedAt ? new Date(token.lastRefreshedAt).toLocaleDateString('ja-JP') : '-'}</div>
        <div>最終バッチ使用: {token.lastUsedAt ? new Date(token.lastUsedAt).toLocaleDateString('ja-JP') : '-'}</div>
      </div>

      {token.lastBatchStats && (
        <div className="text-xs text-body-color dark:text-dark-6 mt-2">
          前回バッチ ({token.lastBatchStats.period}): GA4 {token.lastBatchStats.ga4PropertiesFound}件 /
          GSC {token.lastBatchStats.gscSitesFound}件 / {token.lastBatchStats.durationSeconds}秒
        </div>
      )}

      {token.failureReason && (
        <div className="text-xs text-red-700 mt-2 flex items-center gap-1">
          <XCircle size={12} />
          {token.failureReason}
        </div>
      )}

      {testResult && (
        <div className={`text-xs mt-2 p-2 rounded ${testResult.success ? 'bg-green-50' : 'bg-red-50'}`}>
          {testResult.success
            ? `成功: GA4 ${testResult.ga4Properties}件 / GSC ${testResult.gscSites}件`
            : `失敗: ${testResult.error || '失敗'}`}
        </div>
      )}

      <div className="text-xs text-body-color dark:text-dark-6 mt-2 font-mono">
        token: {token.refreshTokenMasked}
      </div>
    </div>
  );
}
