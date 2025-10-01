'use client';

import React, { useState } from 'react';
import {
  MDBCard,
  MDBCardBody,
  MDBCardTitle,
  MDBBtn,
  MDBIcon,
  MDBBadge,
  MDBSpinner
} from 'mdb-react-ui-kit';
import { UnifiedOAuthManager } from '@/lib/auth/unifiedOAuthManager';
import { useAuth } from '@/lib/auth/authContext';

interface UnifiedGoogleConnectionProps {
  isConnected: boolean;
  onConnectionSuccess: (data: { ga4Count: number; gscCount: number }) => void;
  onConnectionError: (error: string) => void;
  onDisconnect: () => void;
}

export default function UnifiedGoogleConnection({
  isConnected,
  onConnectionSuccess,
  onConnectionError,
  onDisconnect
}: UnifiedGoogleConnectionProps) {
  const { user } = useAuth();
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    if (!user) {
      onConnectionError('ユーザーが認証されていません。');
      return;
    }
    
    try {
      setIsConnecting(true);
      
      // クライアントサイドでの環境変数デバッグ
      console.log('🔧 クライアントサイド環境変数デバッグ:', {
        clientId: process.env.NEXT_PUBLIC_GOOGLE_UNIFIED_CLIENT_ID,
        allNextPublicVars: Object.keys(process.env).filter(key => key.startsWith('NEXT_PUBLIC_')),
        processEnvKeys: Object.keys(process.env).length
      });
      
      // 統合OAuth URLを生成（正しいメソッドシグネチャで呼び出し）
      const { url: oauthUrl } = UnifiedOAuthManager.generateOAuthURL({
        userId: user.uid,
        returnUrl: '/dashboard'
      });
      
      // OAuth認証ページにリダイレクト
      window.location.href = oauthUrl;
    } catch (error: any) {
      console.error('統合Google接続エラー:', error);
      onConnectionError(error.message || '接続に失敗しました。');
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      // LocalStorageから接続情報を削除
      const connections = JSON.parse(localStorage.getItem('growreporter_connections') || '{}');
      connections.apis = { ga4: false, gsc: false };
      connections.ga4Properties = [];
      connections.gscSites = [];
      connections.selectedGA4Property = null;
      connections.selectedGSCSite = null;
      localStorage.setItem('growreporter_connections', JSON.stringify(connections));

      // Cookieからトークンを削除
      document.cookie = 'ga4_access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      document.cookie = 'gsc_access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      document.cookie = 'google_unified_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';

      onDisconnect();
    } catch (error: any) {
      console.error('統合Google切断エラー:', error);
      onConnectionError(error.message || '切断に失敗しました。');
    }
  };

  return (
    <MDBCard className="h-100 shadow-sm border-0">
      <MDBCardBody className="d-flex flex-column">
        <div className="d-flex align-items-center mb-3">
          <MDBIcon 
            fab 
            icon="google" 
            size="2x" 
            className="text-danger me-3"
          />
          <div>
            <MDBCardTitle className="mb-1 h5">
              統合Google認証
              {isConnected && (
                <MDBBadge color="success" className="ms-2">
                  接続済み
                </MDBBadge>
              )}
            </MDBCardTitle>
            <small className="text-muted">GA4 + Search Console 同時接続</small>
          </div>
        </div>

        <p className="text-muted small mb-4">
          Faroパターンを採用した企業レベルの統合認証システム。
          一度の認証でGoogle Analytics 4とSearch Consoleの両方に接続できます。
        </p>

        <div className="mt-auto">
          {!isConnected ? (
            <MDBBtn
              color="danger"
              onClick={handleConnect}
              disabled={isConnecting}
              className="w-100"
            >
              {isConnecting ? (
                <>
                  <MDBSpinner size="sm" tag="span" className="me-2" />
                  認証中...
                </>
              ) : (
                <>
                  <MDBIcon fab icon="google" className="me-2" />
                  Googleに統合接続
                </>
              )}
            </MDBBtn>
          ) : (
            <div className="d-grid gap-2">
              <MDBBtn
                color="outline-danger"
                onClick={handleDisconnect}
                size="sm"
              >
                <MDBIcon fas icon="unlink" className="me-2" />
                接続を解除
              </MDBBtn>
            </div>
          )}
        </div>
      </MDBCardBody>
    </MDBCard>
  );
}
