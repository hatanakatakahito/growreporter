import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import { useAuth } from '../../../contexts/AuthContext';
import { db } from '../../../config/firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

export default function Step3GSCConnect({ siteData, setSiteData }) {
  const { currentUser } = useAuth();
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [token, setToken] = useState(null);
  const [sites, setSites] = useState([]);
  const [isLoadingSites, setIsLoadingSites] = useState(false);

  // 既存のトークンを読み込む
  useEffect(() => {
    const loadExistingToken = async () => {
      if (!currentUser?.uid) return;

      try {
        // サイトに紐づくトークンIDがある場合、それを読み込む
        if (siteData.gscOauthTokenId) {
          const tokenDoc = await getDocs(
            query(
              collection(db, 'oauth_tokens'),
              where('__name__', '==', siteData.gscOauthTokenId)
            )
          );

          if (!tokenDoc.empty) {
            const tokenData = { id: tokenDoc.docs[0].id, ...tokenDoc.docs[0].data() };
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

  // GSCサイト一覧を取得
  const fetchGSCSites = async (tokenData) => {
    setIsLoadingSites(true);
    setError(null);

    try {
      // アクセストークンの有効期限をチェック
      const expiresAt = tokenData.expires_at?.toDate ? tokenData.expires_at.toDate() : new Date(tokenData.expires_at);
      const now = new Date();

      if (expiresAt <= now) {
        setError('アクセストークンの有効期限が切れています。再接続してください。');
        setIsLoadingSites(false);
        return;
      }

      // Google Search Console API を使用してサイト一覧を取得
      const response = await fetch(
        'https://www.googleapis.com/webmasters/v3/sites',
        {
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

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
      setError('Search Consoleサイトの取得に失敗しました: ' + err.message);
    } finally {
      setIsLoadingSites(false);
    }
  };

  // Google OAuth認証（Firebase Authentication + 完全に独立したアプリインスタンス）
  const handleConnect = async () => {
    setIsConnecting(true);
    setError(null);

    // 現在のログインユーザーを保存
    const originalUser = currentUser;
    console.log('[GSCConnect] 元のユーザー保存:', originalUser.uid, originalUser.email);

    try {
      console.log('[GSCConnect] OAuth認証開始');

      // 完全に独立したFirebaseアプリインスタンスを作成
      const { initializeApp } = await import('firebase/app');
      const tempApp = initializeApp({
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      }, 'temp-gsc-auth'); // 別名で初期化
      
      const tempAuth = getAuth(tempApp);
      
      // GoogleAuthProviderを作成
      const provider = new GoogleAuthProvider();
      
      // GSC用のスコープを追加
      provider.addScope('https://www.googleapis.com/auth/webmasters.readonly');
      
      // リフレッシュトークンを取得するための設定
      provider.setCustomParameters({
        access_type: 'offline',
        prompt: 'consent select_account', // アカウント選択画面を表示してリフレッシュトークンを確実に取得
        include_granted_scopes: 'true'
      });

      console.log('[GSCConnect] ポップアップで認証開始');

      // ポップアップで認証（独立したAuthインスタンスを使用）
      const result = await signInWithPopup(tempAuth, provider);
      
      console.log('[GSCConnect] 認証成功:', result);

      // アクセストークンを取得
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const accessToken = credential?.accessToken;

      // リフレッシュトークンとexpiresInを取得（_tokenResponseから）
      const refreshToken = result._tokenResponse?.refreshToken || null;
      const expiresIn = result._tokenResponse?.expiresIn || 3600; // デフォルト1時間

      if (!accessToken) {
        throw new Error('アクセストークンの取得に失敗しました');
      }

      if (!refreshToken) {
        throw new Error('リフレッシュトークンの取得に失敗しました。もう一度認証を行ってください。');
      }

      console.log('[GSCConnect] アクセストークン取得成功');
      console.log('[GSCConnect] リフレッシュトークン: 取得成功');
      console.log('[GSCConnect] トークン有効期限:', expiresIn, '秒');

      // 認証したGoogleアカウントのメールアドレスを取得
      const googleEmail = result.user.email;

      // 一時アプリを削除
      const { deleteApp } = await import('firebase/app');
      await deleteApp(tempApp);
      console.log('[GSCConnect] 一時アプリを削除');

      // トークンをFirestoreに保存（元のユーザーの情報を使用）
      const tokenData = {
        access_token: accessToken,
        refresh_token: refreshToken,
        provider: 'google_search_console',
        google_account: googleEmail,
        created_by: originalUser.email,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
        expires_at: new Date(Date.now() + expiresIn * 1000), // 実際のexpiresInを使用
        user_uid: originalUser.uid,
      };

      console.log('[GSCConnect] トークン保存:', { user_uid: originalUser.uid, google_account: googleEmail });

      const docRef = await addDoc(collection(db, 'oauth_tokens'), tokenData);
      console.log('[GSCConnect] トークン保存完了:', docRef.id);

      const savedToken = { id: docRef.id, ...tokenData };
      setToken(savedToken);

      // サイトデータを更新
      setSiteData(prev => ({
        ...prev,
        gscOauthTokenId: docRef.id,
        gscGoogleAccount: googleEmail,
      }));

      // サイト一覧を取得
      await fetchGSCSites(savedToken);

    } catch (err) {
      console.error('[GSCConnect] 認証エラー:', err);
      
      if (err.code === 'auth/popup-closed-by-user') {
        setError('認証がキャンセルされました。');
      } else if (err.code === 'auth/popup-blocked') {
        setError('ポップアップがブロックされました。ブラウザの設定を確認してください。');
      } else {
        setError('認証に失敗しました: ' + err.message);
      }
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
        <div className="rounded-lg border border-stroke bg-gray-50 p-12 text-center dark:border-dark-3 dark:bg-dark-3">
          <h3 className="mb-2 text-lg font-semibold text-dark dark:text-white">
            Google Search Console に接続
          </h3>
          <p className="mb-6 text-sm text-body-color">
            Googleアカウントで認証し、Search Consoleサイトにアクセスします
          </p>
          <button
            onClick={handleConnect}
            disabled={isConnecting}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-8 py-3 text-sm font-medium text-white transition hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isConnecting ? (
              <>
                <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                接続中...
              </>
            ) : (
              'Googleアカウントで接続'
            )}
          </button>
        </div>
      ) : (
        // 接続済み状態
        <>
          {/* 接続済みメッセージ */}
          <div className="flex items-center gap-3 rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <svg className="h-5 w-5 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-green-800 dark:text-green-300">
                Googleアカウントに接続済みです
                {token.google_account && ` (${token.google_account})`}
              </p>
            </div>
          </div>

          {/* サイト選択 */}
          <div>
            <label htmlFor="gsc-site" className="mb-2.5 flex items-center gap-2 text-sm font-medium text-dark dark:text-white">
              Search Consoleサイトを選択
              <span className="rounded bg-red-500 px-1.5 py-0.5 text-xs text-white">必須</span>
            </label>
            
            {isLoadingSites ? (
              <div className="flex items-center gap-2 rounded-md border border-stroke bg-transparent px-5 py-3 text-body-color dark:border-dark-3">
                <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                サイトを読み込み中...
              </div>
            ) : sites.length > 0 ? (
              <>
                <Select
                  id="gsc-site"
                  options={sites.map(site => ({
                    value: site.siteUrl,
                    label: `${site.siteUrl} (${site.permissionLevel})`,
                  }))}
                  value={
                    siteData.gscSiteUrl
                      ? {
                          value: siteData.gscSiteUrl,
                          label: siteData.gscSiteUrl,
                        }
                      : null
                  }
                  onChange={handleSiteSelect}
                  placeholder="サイトURLで検索..."
                  noOptionsMessage={() => "該当するサイトが見つかりません"}
                  isSearchable={true}
                  isClearable={false}
                  classNames={{
                    control: () => 'w-full rounded-md border border-stroke bg-transparent px-2 py-1 text-dark dark:border-dark-3 dark:text-white',
                    menu: () => 'mt-2 rounded-md border border-stroke bg-white shadow-lg dark:border-dark-3 dark:bg-dark-2',
                    option: ({ isFocused, isSelected }) => 
                      `px-5 py-3 cursor-pointer ${
                        isSelected ? 'bg-primary text-white' : 
                        isFocused ? 'bg-gray-100 dark:bg-dark-3' : ''
                      }`,
                    placeholder: () => 'text-body-color',
                    input: () => 'text-dark dark:text-white',
                    singleValue: () => 'text-dark dark:text-white',
                  }}
                  styles={{
                    control: (base, state) => ({
                      ...base,
                      minHeight: '48px',
                      borderColor: state.isFocused ? '#3C50E0' : '#E5E7EB',
                      boxShadow: 'none',
                      '&:hover': {
                        borderColor: '#3C50E0',
                      },
                    }),
                  }}
                />
                <p className="mt-2 text-xs text-body-color">
                  {sites.length} 件のサイトが見つかりました
                  {token.google_account && ` (${token.google_account})`}
                </p>
              </>
            ) : (
              <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-900/30 dark:bg-orange-900/20">
                <p className="text-sm text-orange-800 dark:text-orange-300">
                  アクセス可能なSearch Consoleサイトが見つかりませんでした。<br />
                  Search Consoleの権限を確認してください。
                </p>
              </div>
            )}
          </div>

          {/* 選択済みサイトの表示 */}
          {siteData.gscSiteUrl && (
            <div className="flex items-center gap-3 rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                <svg className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                  <strong>{siteData.gscSiteUrl}</strong> を選択しました
                  {token.google_account && ` (アカウント: ${token.google_account})`}
                </p>
              </div>
            </div>
          )}

          {/* 再接続ボタン */}
          <button
            onClick={handleConnect}
            disabled={isConnecting}
            className="w-full rounded-md border border-stroke px-4 py-3 text-sm font-medium text-dark transition hover:bg-gray-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-dark-3 dark:text-white dark:hover:bg-dark-3"
          >
            別のGoogleアカウントで接続・再接続
          </button>
        </>
      )}
    </div>
  );
}

