import React, { useEffect, useState } from 'react';

export default function OAuthCallback() {
  const [message, setMessage] = useState('認証情報を処理しています...');
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    try {
      // URLからパラメータを取得
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const error = params.get('error');
      const state = params.get('state');
      
      console.log('[OAuth Callback] Parameters:', { code: !!code, error, state });
      
      // エラー処理
      if (error) {
        console.error('[OAuth Callback] Error:', error);
        setMessage('エラーが発生しました: ' + error);
        setIsError(true);
        
        // localStorageに保存
        const resultData = {
          type: 'OAUTH_ERROR',
          error: error,
          timestamp: Date.now()
        };
        localStorage.setItem('oauth_callback_result', JSON.stringify(resultData));
        console.log('[OAuth Callback] Error saved to localStorage');
        
        // postMessageも試みる
        if (window.opener && !window.opener.closed) {
          try {
            window.opener.postMessage(resultData, window.location.origin);
            console.log('[OAuth Callback] Error sent via postMessage');
          } catch (e) {
            console.warn('[OAuth Callback] postMessage failed:', e);
          }
        }
        
        setTimeout(() => {
          window.close();
        }, 3000);
        return;
      }
      
      if (!code) {
        console.error('[OAuth Callback] No authorization code');
        setMessage('認可コードが取得できませんでした');
        setIsError(true);
        
        // localStorageに保存
        const resultData = {
          type: 'OAUTH_ERROR',
          error: '認可コードが取得できませんでした',
          timestamp: Date.now()
        };
        localStorage.setItem('oauth_callback_result', JSON.stringify(resultData));
        console.log('[OAuth Callback] Error saved to localStorage');
        
        // postMessageも試みる
        if (window.opener && !window.opener.closed) {
          try {
            window.opener.postMessage(resultData, window.location.origin);
          } catch (e) {
            console.warn('[OAuth Callback] postMessage failed:', e);
          }
        }
        
        setTimeout(() => {
          window.close();
        }, 3000);
        return;
      }
      
      console.log('[OAuth Callback] Authorization code received');
      
      // 成功データを準備
      const resultData = {
        type: 'OAUTH_SUCCESS',
        code: code,
        state: state,
        timestamp: Date.now()
      };
      
      // localStorageに保存（メインの通信方法）
      localStorage.setItem('oauth_callback_result', JSON.stringify(resultData));
      console.log('[OAuth Callback] Success saved to localStorage');
      
      // postMessageも試みる（互換性のため）
      if (window.opener && !window.opener.closed) {
        try {
          window.opener.postMessage(resultData, window.location.origin);
          console.log('[OAuth Callback] Success sent via postMessage');
        } catch (e) {
          console.warn('[OAuth Callback] postMessage failed:', e);
        }
      } else {
        console.log('[OAuth Callback] No window.opener (using localStorage only)');
      }
      
      setMessage('認証が完了しました。このウィンドウは自動的に閉じます...');
      
      // 少し待ってから閉じる
      setTimeout(() => {
        window.close();
      }, 1000);
      
    } catch (err) {
      console.error('[OAuth Callback] Error:', err);
      setMessage('エラーが発生しました: ' + err.message);
      setIsError(true);
      
      // localStorageに保存
      const resultData = {
        type: 'OAUTH_ERROR',
        error: err.message,
        timestamp: Date.now()
      };
      localStorage.setItem('oauth_callback_result', JSON.stringify(resultData));
      
      // postMessageも試みる
      if (window.opener && !window.opener.closed) {
        try {
          window.opener.postMessage(resultData, window.location.origin);
        } catch (e) {
          console.warn('[OAuth Callback] postMessage failed:', e);
        }
      }
      
      setTimeout(() => {
        window.close();
      }, 3000);
    }
  }, []);

  return (
    <div style={{
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      margin: 0,
      background: '#f3f4f6'
    }}>
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <div style={{
          border: '4px solid #e5e7eb',
          borderTop: '4px solid #3b82f6',
          borderRadius: '50%',
          width: '40px',
          height: '40px',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 1rem'
        }} />
        <div style={{
          color: isError ? '#dc2626' : '#6b7280',
          fontSize: '14px',
          marginBottom: '1rem',
          fontWeight: isError ? '500' : 'normal'
        }}>
          {message}
        </div>
      </div>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}


