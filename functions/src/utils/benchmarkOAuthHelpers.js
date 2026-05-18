/**
 * lively-aggregating-bobcat: ベンチマーク用 OAuth トークン管理ヘルパー
 *
 * Grow Group の運用 OAuth アカウント（webmaster@/ads@/analytics@/analytics-02@grow-group.jp 等）
 * を admin UI から追加・管理するための共通機能。
 *
 * トークンは平文で Firestore `serviceTokens/{email}` に保存（既存 tokenManager と同じパターン）。
 * firestore.rules で write 完全禁止 + admin SDK 経由のみ書込可能 + フロント返却時はマスク。
 */

import { google } from 'googleapis';
import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';

// ベンチマーク用 OAuth が要求するスコープ（lively v1.5 仕様）
export const BENCHMARK_OAUTH_SCOPES = [
  'https://www.googleapis.com/auth/analytics.readonly',
  'https://www.googleapis.com/auth/webmasters.readonly',
  'openid',
  'email',
];

/**
 * OAuth2 クライアント生成（GOOGLE_CLIENT_ID/SECRET は Cloud Functions の env 経由）
 */
export function createOAuth2Client(redirectUri) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new HttpsError('failed-precondition', 'GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET が設定されていません');
  }
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

/**
 * 管理者権限チェック（adminUsers コレクション参照）
 */
export async function assertAdmin(uid) {
  if (!uid) {
    throw new HttpsError('unauthenticated', 'ユーザー認証が必要です');
  }
  const db = getFirestore();
  const adminDoc = await db.collection('adminUsers').doc(uid).get();
  if (!adminDoc.exists || !['admin', 'editor'].includes(adminDoc.data()?.role)) {
    throw new HttpsError('permission-denied', '管理者権限がありません（admin / editor のみ）');
  }
  return adminDoc.data();
}

/**
 * refresh_token を表示用にマスク（前4 + 末尾4のみ表示）
 */
export function maskToken(token) {
  if (!token || typeof token !== 'string' || token.length < 12) return '****';
  return `${token.slice(0, 4)}****${token.slice(-4)}`;
}

/**
 * OAuth callback redirect_uri が許可リストに入っているか検証
 * （任意 URL 受け入れによる open redirect 攻撃を防止）
 */
export function validateRedirectUri(uri) {
  const allowedSuffixes = [
    '/admin/industry-benchmarks/oauth-callback',
  ];
  if (!uri || typeof uri !== 'string') return false;
  return allowedSuffixes.some((s) => uri.endsWith(s));
}

/**
 * id_token から email を抽出（OAuth スコープに openid + email を含む場合のみ取得可能）
 */
export function decodeIdTokenEmail(idToken) {
  if (!idToken || typeof idToken !== 'string') return null;
  const parts = idToken.split('.');
  if (parts.length !== 3) return null;
  try {
    const payloadJson = Buffer.from(parts[1], 'base64url').toString('utf-8');
    const payload = JSON.parse(payloadJson);
    return payload.email || null;
  } catch {
    return null;
  }
}
