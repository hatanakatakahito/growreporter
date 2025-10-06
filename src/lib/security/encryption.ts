/**
 * 🔐 暗号化サービス
 * AES-256-GCM を使用したOAuthトークンの暗号化・復号化
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 初期化ベクトル（IV）の長さ
const AUTH_TAG_LENGTH = 16; // 認証タグの長さ
const KEY_LENGTH = 32; // AES-256のキー長（32バイト = 256ビット）

/**
 * 暗号化キーを取得
 * 環境変数から取得し、適切な長さに調整
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }
  
  // キーをバッファに変換し、32バイトに調整
  const keyBuffer = Buffer.from(key, 'utf-8');
  
  if (keyBuffer.length < KEY_LENGTH) {
    // キーが短い場合はパディング
    const paddedKey = Buffer.alloc(KEY_LENGTH);
    keyBuffer.copy(paddedKey);
    return paddedKey;
  } else if (keyBuffer.length > KEY_LENGTH) {
    // キーが長い場合は切り詰め
    return keyBuffer.subarray(0, KEY_LENGTH);
  }
  
  return keyBuffer;
}

/**
 * 暗号化キーを生成（初回セットアップ用）
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(KEY_LENGTH).toString('base64');
}

/**
 * データを暗号化
 * @param plainText 暗号化する平文
 * @returns 暗号化されたデータ（Base64エンコード）
 */
export function encrypt(plainText: string): string {
  try {
    const key = getEncryptionKey();
    
    // ランダムなIV（初期化ベクトル）を生成
    const iv = crypto.randomBytes(IV_LENGTH);
    
    // 暗号化
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(plainText, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // 認証タグを取得（GCMモードの完全性検証用）
    const authTag = cipher.getAuthTag();
    
    // IV + 認証タグ + 暗号文 を結合してBase64エンコード
    const combined = Buffer.concat([
      iv,
      authTag,
      Buffer.from(encrypted, 'hex')
    ]);
    
    return combined.toString('base64');
    
  } catch (error) {
    console.error('❌ 暗号化エラー:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * データを復号化
 * @param encryptedData 暗号化されたデータ（Base64エンコード）
 * @returns 復号化された平文
 */
export function decrypt(encryptedData: string): string {
  try {
    const key = getEncryptionKey();
    
    // Base64デコード
    const combined = Buffer.from(encryptedData, 'base64');
    
    // IV、認証タグ、暗号文を分離
    const iv = combined.subarray(0, IV_LENGTH);
    const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
    
    // 復号化
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted.toString('hex'), 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
    
  } catch (error) {
    console.error('❌ 復号化エラー:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * 暗号化されたオブジェクトの型
 */
export interface EncryptedTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  encrypted: true; // 暗号化済みフラグ
}

/**
 * OAuthトークンを暗号化
 */
export function encryptTokens(tokens: {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}): EncryptedTokens {
  return {
    accessToken: encrypt(tokens.accessToken),
    refreshToken: encrypt(tokens.refreshToken),
    expiresAt: tokens.expiresAt,
    encrypted: true,
  };
}

/**
 * OAuthトークンを復号化
 */
export function decryptTokens(encryptedTokens: EncryptedTokens): {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
} {
  return {
    accessToken: decrypt(encryptedTokens.accessToken),
    refreshToken: decrypt(encryptedTokens.refreshToken),
    expiresAt: encryptedTokens.expiresAt,
  };
}

/**
 * データが暗号化されているか確認
 */
export function isEncrypted(data: any): data is EncryptedTokens {
  return data && typeof data === 'object' && data.encrypted === true;
}

/**
 * 暗号化キーをテスト
 */
export function testEncryption(): boolean {
  try {
    const testData = 'test-encryption-' + Date.now();
    const encrypted = encrypt(testData);
    const decrypted = decrypt(encrypted);
    return testData === decrypted;
  } catch (error) {
    console.error('❌ 暗号化テストエラー:', error);
    return false;
  }
}





