import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import PickerModal from './PickerModal';
import { useAuth } from '../../../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { db, functions } from '../../../config/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import DotWaveSpinner from '../../common/DotWaveSpinner';

export default function Step3GSCConnect({ siteData, setSiteData }) {
  const { currentUser } = useAuth();
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [token, setToken] = useState(null);
  const [sites, setSites] = useState([]);
  const [isLoadingSites, setIsLoadingSites] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [showSitePicker, setShowSitePicker] = useState(false);

  // 既存のトークンを読み込む
  useEffect(() => {
    const loadExistingToken = async () => {
      if (!currentUser?.uid) return;

      try {
        // サイトに紐づくトークンIDがある場合、それを読み込む
        if (siteData.gscOauthTokenId) {
          const ownerId = siteData.userId ?? currentUser?.uid;
          const tokenRef = doc(db, 'users', ownerId, 'oauth_tokens', siteData.gscOauthTokenId);
          const tokenSnap = await getDoc(tokenRef);

          if (tokenSnap.exists()) {
            const tokenData = { id: tokenSnap.id, ...tokenSnap.data() };
            setToken(tokenData);
            
            // トークンがあればサイト一覧を取得
            await fetchGSCSites(tokenData);
          }
        }
      } catch (err) {
        console.error('トークン読み込みエラー:', err);
      }
    };

    loadExistingToken();
  }, [currentUser, siteData.gscOauthTokenId]);

  // 重複フェッチ防止
  const isFetchingRef = useRef(false);

  // GSCサイト一覧を取得
  const fetchGSCSites = async (tokenData) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setIsLoadingSites(true);
    setError(null);

    try {
      // アクセストークンの有効期限をチェック
      const expiresAt = tokenData.expires_at?.toDate ? tokenData.expires_at.toDate() : new Date(tokenData.expires_at);
      const now = new Date();

      if (expiresAt <= now) {
        setError('アクセストークンの有効期限が切れています。再接続してください。');
        setIsLoadingSites(false);
        isFetchingRef.current = false;
        return;
      }

      // Google Search Console API を使用してサイト一覧を取得
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const response = await fetch(
        'https://www.googleapis.com/webmasters/v3/sites',
        {
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`,
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        }
      );
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // サイト一覧を整形
      const sitesList = [];
      if (data.siteEntry) {
        data.siteEntry.forEach(site => {
          sitesList.push({
            siteUrl: site.siteUrl,
            permissionLevel: site.permissionLevel,
          });
        });
      }

      console.log(`[GSCConnect] サイト取得完了: ${sitesList.length}件`);
      setSites(sitesList);

      if (sitesList.length === 0) {
        setError('アクセス可能なSearch Consoleサイトが見つかりませんでした。Search Consoleの権限を確認してください。');
      }
    } catch (err) {
      console.error('GSCサイト取得エラー:', err);
      if (err.name === 'AbortError') {
        setError('Search Consoleサイトの取得がタイムアウトしました。通信環境を確認して再度お試しください。');
      } else {
        setError('Search Consoleサイトの取得に失敗しました: ' + err.message);
      }
    } finally {
      setIsLoadingSites(false);
      isFetchingRef.current = false;
    }
  };

  // Google OAuth 2.0 直接認証（永続的なリフレッシュトークンを取得）
  const handleConnect = async () => {
    setIsConnecting(true);
    setError(null);

    console.log('[GSCConnect] OAuth 2.0認証開始');

    try {
      // OAuth 2.0の設定
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      const redirectUri = `${window.location.origin}/oauth/callback`;
      
      if (!clientId) {
        throw new Error('Google Client IDが設定されていません');
      }

      // OAuth 2.0認可URLを構築
      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.append('client_id', clientId);
      authUrl.searchParams.append('redirect_uri', redirectUri);
      authUrl.searchParams.append('response_type', 'code');
      authUrl.searchParams.append('scope', 'https://www.googleapis.com/auth/webmasters.readonly');
      authUrl.searchParams.append('access_type', 'offline');
      authUrl.searchParams.append('prompt', 'consent'); // 常に同意画面を表示してリフレッシュトークンを確実に取得
      authUrl.searchParams.append('include_granted_scopes', 'true');
      authUrl.searchParams.append('state', 'gsc'); // プロバイダー識別用

      console.log('[GSCConnect] 認可URLを生成:', authUrl.toString());

      // ポップアップウィンドウを開く
      const width = 500;
      const height = 600;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;
      
      const popup = window.open(
        authUrl.toString(),
        'Google OAuth',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      if (!popup) {
        throw new Error('ポップアップがブロックされました。ブラウザの設定を確認してください。');
      }

      console.log('[GSCConnect] ポップアップウィンドウを開きました');

      // localStorageをクリア（前回の結果を削除）
      localStorage.removeItem('oauth_callback_result');

      // ポップアップからのメッセージを待機（localStorageとpostMessageの両方をサポート）
      const authCode = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          cleanup();
          reject(new Error('認証がタイムアウトしました。もう一度お試しください。'));
        }, 5 * 60 * 1000); // 5分でタイムアウト

        let isResolved = false;

        const cleanup = () => {
          clearTimeout(timeout);
          clearInterval(storageCheckInterval);
          window.removeEventListener('message', handleMessage);
        };

        // postMessageハンドラー
        const handleMessage = (event) => {
          // セキュリティチェック
          if (event.origin !== window.location.origin) {
            return;
          }

          if (event.data.type === 'OAUTH_SUCCESS') {
            if (!isResolved) {
              isResolved = true;
              cleanup();
              localStorage.removeItem('oauth_callback_result'); // クリーンアップ
              console.log('[GSCConnect] Received via postMessage');
              resolve(event.data.code);
            }
          } else if (event.data.type === 'OAUTH_ERROR') {
            if (!isResolved) {
              isResolved = true;
              cleanup();
              localStorage.removeItem('oauth_callback_result'); // クリーンアップ
              reject(new Error(event.data.error || '認証に失敗しました'));
            }
          }
        };

        // localStorageポーリング（メインの通信方法）
        const checkLocalStorage = () => {
          const resultStr = localStorage.getItem('oauth_callback_result');
          if (resultStr) {
            try {
              const result = JSON.parse(resultStr);
              
              // タイムスタンプチェック（5分以内の結果のみ有効）
              if (Date.now() - result.timestamp > 5 * 60 * 1000) {
                console.warn('[GSCConnect] Expired result in localStorage');
                localStorage.removeItem('oauth_callback_result');
                return;
              }

              if (result.type === 'OAUTH_SUCCESS') {
                if (!isResolved) {
                  isResolved = true;
                  cleanup();
                  localStorage.removeItem('oauth_callback_result'); // クリーンアップ
                  console.log('[GSCConnect] Received via localStorage');
                  resolve(result.code);
                }
              } else if (result.type === 'OAUTH_ERROR') {
                if (!isResolved) {
                  isResolved = true;
                  cleanup();
                  localStorage.removeItem('oauth_callback_result'); // クリーンアップ
                  reject(new Error(result.error || '認証に失敗しました'));
                }
              }
            } catch (e) {
              console.error('[GSCConnect] Error parsing localStorage result:', e);
              localStorage.removeItem('oauth_callback_result');
            }
          }
        };

        window.addEventListener('message', handleMessage);

        // localStorageを500msごとにチェック
        const storageCheckInterval = setInterval(checkLocalStorage, 500);

        // 初回チェック
        checkLocalStorage();
      });

      console.log('[GSCConnect] 認可コード取得成功');

      // Cloud Functionで認可コードをトークンに交換
      const exchangeOAuthCode = httpsCallable(functions, 'exchangeOAuthCode');

      console.log('[GSCConnect] トークン交換を開始...');

      const result = await exchangeOAuthCode({
        code: authCode,
        provider: 'gsc',
        redirectUri: redirectUri,
      });

      console.log('[GSCConnect] トークン交換成功:', result.data);

      const { tokenId, googleAccount } = result.data;

      // トークンデータを作成（サイト一覧取得用）※直前に保存したので currentUser.uid 配下
      const tokenRef = doc(db, 'users', currentUser.uid, 'oauth_tokens', tokenId);
      const tokenSnap = await getDoc(tokenRef);

      if (!tokenSnap.exists()) {
        throw new Error('トークンの取得に失敗しました');
      }

      const savedToken = { id: tokenId, ...tokenSnap.data() };
      setToken(savedToken);

      // サイトデータを更新
      setSiteData(prev => ({
        ...prev,
        gscOauthTokenId: tokenId,
        gscGoogleAccount: googleAccount,
      }));

      console.log('[GSCConnect] 接続成功 - サイト一覧を取得します');

      // サイト一覧を取得
      await fetchGSCSites(savedToken);

    } catch (err) {
      console.error('[GSCConnect] 認証エラー:', err);
      setError('認証に失敗しました: ' + err.message);
    } finally {
      setIsConnecting(false);
    }
  };

  // サイトを選択（react-select用）
  const handleSiteSelect = (selectedOption) => {
    if (selectedOption) {
      console.log('[GSCConnect] サイト選択:', selectedOption.value);
      setSiteData(prev => ({
        ...prev,
        gscSiteUrl: selectedOption.value,
      }));
    }
  };

  // Search Console接続を解除
  const handleDisconnect = () => {
    if (!confirm('Google Search Consoleの接続を解除しますか？\n※サイト選択もクリアされます。')) {
      return;
    }

    setIsDisconnecting(true);
    
    try {
      console.log('[GSCConnect] 接続解除');
      
      // トークンとサイトリストをクリア
      setToken(null);
      setSites([]);
      
      // siteDataから接続情報を削除
      setSiteData(prev => ({
        ...prev,
        gscOauthTokenId: null,
        gscGoogleAccount: null,
        gscSiteUrl: null,
      }));
      
      setError(null);
    } finally {
      setIsDisconnecting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* エラーメッセージ */}
      {error && (
        <div className="flex items-center gap-3 rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <svg className="h-5 w-5 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800 dark:text-red-300">{error}</p>
          </div>
        </div>
      )}

      {!token ? (
        // 未接続状態
        <div className="rounded-lg bg-gray-50 p-12 text-center dark:bg-dark-3">
          <h3 className="mb-2 text-lg font-semibold text-dark dark:text-white">
            Google Search Console に接続
          </h3>
          <p className="mb-6 text-sm text-body-color">
            Googleアカウントで認証し、Search Consoleサイトにアクセスします<br />
            <span className="text-gray-500">※ この設定は任意です。スキップして次のステップに進むこともできます</span>
          </p>
          <Button
            onClick={handleConnect}
            disabled={isConnecting}
            variant="primary"
            size="lg"
          >
            {isConnecting ? (
              <>
                <DotWaveSpinner size="sm" variant="white" />
                接続中...
              </>
            ) : (
              'Googleアカウントで接続'
            )}
          </Button>
        </div>
      ) : (
        // 接続済み状態
        <>
          {/* サイト選択 */}
          <div>
            <label htmlFor="gsc-site" className="mb-2.5 flex items-center gap-2 text-sm font-medium text-dark dark:text-white">
              Search Console サイトを選択
            </label>

            {isLoadingSites ? (
              <div className="flex items-center gap-2 rounded-md border border-stroke bg-transparent px-5 py-3 text-sm text-body-color dark:border-dark-3">
                <DotWaveSpinner size="sm" />
                サイトを読み込み中...
              </div>
            ) : sites.length > 0 ? (
              (() => {
                const matched = sites.find((s) => s.siteUrl === siteData.gscSiteUrl);
                const display = matched
                  ? matched.siteUrl
                  : siteData.gscSiteUrl || null;
                return (
                  <button
                    type="button"
                    id="gsc-site"
                    onClick={() => setShowSitePicker(true)}
                    className="flex w-full items-center justify-between gap-2 rounded-md border border-stroke bg-white px-4 py-3 text-left text-sm transition hover:border-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-dark-3 dark:bg-dark-2"
                  >
                    <span className={`truncate ${display ? 'text-dark dark:text-white' : 'text-body-color'}`}>
                      {display || `選択してください (${sites.length} 件のサイト)`}
                    </span>
                    <ChevronDown className="h-4 w-4 flex-shrink-0 text-body-color" />
                  </button>
                );
              })()
            ) : (
              <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-900/30 dark:bg-orange-900/20">
                <p className="text-sm text-orange-800 dark:text-orange-300">
                  アクセス可能なSearch Consoleサイトが見つかりませんでした。<br />
                  Search Consoleの権限を確認してください。
                </p>
              </div>
            )}

            {/* 接続状態 + 解除 (セレクト下、右寄せ) */}
            <div className="mt-2 flex items-center justify-end gap-2">
              {token.google_account && (
                <span className="inline-flex items-center gap-1 text-xs text-green-700 dark:text-green-400">
                  <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  {token.google_account}
                </span>
              )}
              <Button
                type="button"
                variant="danger-outline"
                size="sm"
                onClick={handleDisconnect}
                disabled={isDisconnecting}
                title="接続を解除"
              >
                <svg data-slot="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                解除
              </Button>
            </div>
          </div>

          {/* サイト選択モーダル */}
          <PickerModal
            open={showSitePicker}
            onClose={() => setShowSitePicker(false)}
            title="Search Console サイトを選択"
            searchPlaceholder="サイト URL で検索..."
            items={sites.map((site) => ({
              key: site.siteUrl,
              primary: site.siteUrl,
              secondary: `権限: ${site.permissionLevel}`,
              searchText: site.siteUrl,
            }))}
            selectedKey={siteData.gscSiteUrl}
            onSelect={(key) => {
              handleSiteSelect({ value: key, label: key });
              setShowSitePicker(false);
            }}
            emptyMessage="該当するサイトが見つかりません"
          />

          {/* 再接続テキストリンク */}
          <div className="text-center">
            <button
              type="button"
              onClick={handleConnect}
              disabled={isConnecting}
              className="text-sm text-body-color underline underline-offset-2 hover:text-dark disabled:opacity-50 disabled:cursor-not-allowed"
            >
              別のGoogleアカウントで接続・再接続
            </button>
          </div>
        </>
      )}
    </div>
  );
}

