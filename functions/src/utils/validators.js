/**
 * Cloud Functions Callable 入力検証ユーティリティ (Phase 4-B-7)
 *
 * 各 callable の冒頭で `request.data` の型 / 長さ / 形式 を統一的に検証する。
 *
 * 設計方針:
 *   - 検証失敗時は HttpsError('invalid-argument') を即時 throw
 *   - 文字列は最大長を強制（DoS / Firestore 過大書込防止）
 *   - email / URL は構造的に検証（RegExp + new URL()）
 *   - Firestore document ID（siteId/uid 等）は英数字 + - + _ のみ許可
 *   - 配列は要素数上限を強制
 *   - HTML を含みうる入力（メッセージ等）は HTML エスケープ後に保存することを前提
 *
 * 想定攻撃:
 *   - 巨大な文字列 / 配列で書込コスト爆破（DoS）
 *   - 改行混入による Header Injection（メール送信先メールアドレス等）
 *   - 制御文字混入による表示破壊
 *   - 別 user の siteId 注入による IDOR
 */
import { HttpsError } from 'firebase-functions/v2/https';

// ============================================================
// 共通スキーマ定数
// ============================================================
export const MAX_NAME_LEN = 100;
export const MAX_COMPANY_LEN = 200;
export const MAX_EMAIL_LEN = 254;            // RFC 3696
export const MAX_URL_LEN = 2048;
export const MAX_PHONE_LEN = 30;
export const MAX_MESSAGE_LEN = 5000;         // フォーム自由記述
export const MAX_LONG_MESSAGE_LEN = 50000;   // AI チャット等の長文
export const MAX_USER_NOTE_LEN = 2000;
export const MAX_FIRESTORE_ID_LEN = 1500;    // Firestore のドキュメントID 制限
export const MAX_ARRAY_LEN = 200;

// 制御文字検出用の正規表現
// - C0 control chars: U+0000-U+001F
// - DEL: U+007F
// allowNewlines=true なら \t (U+0009), \n (U+000A), \r (U+000D) を許可する
// eslint-disable-next-line no-control-regex
const CONTROL_RE_STRICT = /[\x00-\x1F\x7F]/;
// eslint-disable-next-line no-control-regex
const CONTROL_RE_ALLOW_NL = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/;

// ============================================================
// 基本型検証
// ============================================================

/**
 * 必須文字列の検証。空文字 / null / undefined / 非文字列は拒否。
 * 制御文字（改行除く）も拒否。
 */
export function requireString(value, field, { maxLen = 1000, allowNewlines = false } = {}) {
  if (value === null || value === undefined) {
    throw new HttpsError('invalid-argument', `${field} is required`);
  }
  if (typeof value !== 'string') {
    throw new HttpsError('invalid-argument', `${field} must be a string`);
  }
  if (value.length === 0) {
    throw new HttpsError('invalid-argument', `${field} must not be empty`);
  }
  if (value.length > maxLen) {
    throw new HttpsError('invalid-argument', `${field} exceeds max length (${maxLen})`);
  }
  // 制御文字 (Header Injection / 表示破壊対策)
  const controlRe = allowNewlines ? CONTROL_RE_ALLOW_NL : CONTROL_RE_STRICT;
  if (controlRe.test(value)) {
    throw new HttpsError('invalid-argument', `${field} contains disallowed control characters`);
  }
  return value;
}

/**
 * 任意文字列。空 / null / undefined OK。値があれば検証。
 */
export function optionalString(value, field, opts = {}) {
  if (value === null || value === undefined || value === '') return '';
  return requireString(value, field, opts);
}

/**
 * メールアドレス検証。RFC 5322 のサブセット + 制御文字 / 改行を遮断。
 */
export function requireEmail(value, field = 'email') {
  const v = requireString(value, field, { maxLen: MAX_EMAIL_LEN });
  // 簡易な構造検証 (改行は requireString で既に弾かれている)
  if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(v)) {
    throw new HttpsError('invalid-argument', `${field} is not a valid email`);
  }
  return v.toLowerCase();
}

/**
 * URL 検証。http/https のみ許可。private IP / メタデータ host 等は呼出側で
 * cloudflareProxy.validateExternalFetchUrl() を併用して SSRF 検証する想定。
 */
export function requireUrl(value, field = 'url') {
  const v = requireString(value, field, { maxLen: MAX_URL_LEN });
  let parsed;
  try {
    parsed = new URL(v);
  } catch {
    throw new HttpsError('invalid-argument', `${field} is not a valid URL`);
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new HttpsError('invalid-argument', `${field} must use http or https`);
  }
  return v;
}

/**
 * Firestore ドキュメントID検証。
 * Firebase が許可する文字 + 長さ制限内であることを確認。
 * 実用上、英数字 + - + _ + 制限的な記号のみに絞る。
 */
export function requireDocId(value, field) {
  const v = requireString(value, field, { maxLen: MAX_FIRESTORE_ID_LEN });
  // Firestore は / と __ で始まるパスを許可しない。
  // 実用上はアプリで生成する ID は英数字 + - + _ のみ。
  if (!/^[A-Za-z0-9_-]+$/.test(v)) {
    throw new HttpsError('invalid-argument', `${field} contains invalid characters`);
  }
  if (v.startsWith('__')) {
    throw new HttpsError('invalid-argument', `${field} cannot start with __`);
  }
  return v;
}

/**
 * 値が enum セットに含まれることを検証。
 */
export function requireEnum(value, field, allowedValues) {
  if (!allowedValues.includes(value)) {
    throw new HttpsError(
      'invalid-argument',
      `${field} must be one of: ${allowedValues.join(', ')}`
    );
  }
  return value;
}

/**
 * 配列検証。要素数上限 + 各要素の検証関数オプション。
 */
export function requireArray(value, field, { maxLen = MAX_ARRAY_LEN, itemValidator = null } = {}) {
  if (!Array.isArray(value)) {
    throw new HttpsError('invalid-argument', `${field} must be an array`);
  }
  if (value.length > maxLen) {
    throw new HttpsError('invalid-argument', `${field} exceeds max array length (${maxLen})`);
  }
  if (itemValidator) {
    return value.map((item, idx) => itemValidator(item, `${field}[${idx}]`));
  }
  return value;
}

/**
 * boolean 検証。型が違えば拒否。
 */
export function requireBoolean(value, field) {
  if (typeof value !== 'boolean') {
    throw new HttpsError('invalid-argument', `${field} must be a boolean`);
  }
  return value;
}

/**
 * 整数検証。範囲指定可。
 */
export function requireInteger(value, field, { min = -Infinity, max = Infinity } = {}) {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new HttpsError('invalid-argument', `${field} must be an integer`);
  }
  if (value < min || value > max) {
    throw new HttpsError('invalid-argument', `${field} out of range [${min}, ${max}]`);
  }
  return value;
}

// ============================================================
// 高レベルヘルパ（callable で頻出するパターン）
// ============================================================

/**
 * ユーザー名 / 会社名のような短い表示用文字列の検証。
 */
export function requireDisplayName(value, field) {
  return requireString(value, field, { maxLen: MAX_NAME_LEN });
}

export function optionalDisplayName(value, field) {
  return optionalString(value, field, { maxLen: MAX_NAME_LEN });
}

export function requireCompanyName(value, field = 'companyName') {
  return requireString(value, field, { maxLen: MAX_COMPANY_LEN });
}

export function optionalCompanyName(value, field = 'companyName') {
  return optionalString(value, field, { maxLen: MAX_COMPANY_LEN });
}

export function requirePhoneNumber(value, field = 'phoneNumber') {
  const v = requireString(value, field, { maxLen: MAX_PHONE_LEN });
  // 電話番号は数字 / + / - / ( ) / 空白のみ許可
  if (!/^[\d+\-() ]+$/.test(v)) {
    throw new HttpsError('invalid-argument', `${field} contains invalid characters`);
  }
  return v;
}

/**
 * 自由記述メッセージ。改行可、最大長で切詰。
 */
export function optionalMessage(value, field = 'message', maxLen = MAX_MESSAGE_LEN) {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value !== 'string') {
    throw new HttpsError('invalid-argument', `${field} must be a string`);
  }
  if (value.length > maxLen) {
    throw new HttpsError('invalid-argument', `${field} exceeds max length (${maxLen})`);
  }
  // 改行可。NULL バイト / その他制御文字（改行・タブ除く）のみ拒否
  if (CONTROL_RE_ALLOW_NL.test(value)) {
    throw new HttpsError('invalid-argument', `${field} contains disallowed control characters`);
  }
  return value;
}
