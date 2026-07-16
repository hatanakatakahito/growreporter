/**
 * パスワード強度チェックユーティリティ (Phase 4-A-10)
 *
 * 旧仕様: 6 文字以上
 * 新仕様:
 *   - 8 文字以上
 *   - 大文字 / 小文字 / 数字 / 記号 のうち 3 種類以上を含む
 *   - よくあるパスワード（"password", "12345678", 等）を拒否
 */

const COMMON_PASSWORDS = new Set([
  'password',
  'password123',
  'password1',
  'qwerty',
  'qwerty123',
  '12345678',
  '123456789',
  '1234567890',
  'abc12345',
  'abcd1234',
  'admin',
  'admin123',
  'letmein',
  'welcome',
  'iloveyou',
  'monkey',
  'dragon',
  'master',
  'hello',
  'test1234',
  'changeme',
  'p@ssw0rd',
  'p@ssword',
  'passw0rd',
]);

const MIN_LENGTH = 8;
const MIN_CATEGORIES = 3;

/**
 * パスワードの強度を検証する。
 * @param {string} password
 * @returns {{ ok: boolean, reason?: string, score: 0|1|2|3|4 }}
 *   score:
 *     0: 全く満たしていない
 *     1: 長さだけ満たす
 *     2: 弱い
 *     3: 中
 *     4: 強い (合格)
 */
export function checkPasswordStrength(password) {
  if (!password || typeof password !== 'string') {
    return { ok: false, reason: 'パスワードを入力してください', score: 0 };
  }
  if (password.length < MIN_LENGTH) {
    return {
      ok: false,
      reason: `パスワードは ${MIN_LENGTH} 文字以上で入力してください`,
      score: 0,
    };
  }

  // よくあるパスワード判定
  const lower = password.toLowerCase();
  if (COMMON_PASSWORDS.has(lower)) {
    return {
      ok: false,
      reason: 'よく使われるパスワードのため使用できません。別の組み合わせを設定してください',
      score: 1,
    };
  }

  // 文字種カウント
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);
  const categories = [hasLower, hasUpper, hasDigit, hasSymbol].filter(Boolean).length;

  if (categories < MIN_CATEGORIES) {
    return {
      ok: false,
      reason: `大文字・小文字・数字・記号のうち ${MIN_CATEGORIES} 種類以上を含めてください（現在 ${categories} 種類）`,
      score: categories === 1 ? 1 : 2,
    };
  }

  // 連続する同一文字（例: aaaa, 0000）は弱い扱い
  if (/(.)\1{3,}/.test(password)) {
    return {
      ok: false,
      reason: '同じ文字を 4 回以上連続させないでください',
      score: 2,
    };
  }

  // 単純な数字シーケンス
  if (/(?:0123|1234|2345|3456|4567|5678|6789|7890|abcd|qwer|asdf)/i.test(password)) {
    return {
      ok: false,
      reason: '簡単に推測できる連続文字（1234, abcd 等）は使用できません',
      score: 2,
    };
  }

  // ここまでクリアしたら強度 4
  return { ok: true, score: 4 };
}

/**
 * 強度スコア → ラベルとスタイル用クラス名
 * @param {number} score
 * @returns {{label: string, color: string, percent: number}}
 */
export function strengthLabel(score) {
  switch (score) {
    case 0:
      return { label: '未入力', color: '#9ca3af', percent: 0 };
    case 1:
      return { label: '非常に弱い', color: '#ef4444', percent: 25 };
    case 2:
      return { label: '弱い', color: '#f59e0b', percent: 50 };
    case 3:
      return { label: '中', color: '#eab308', percent: 75 };
    case 4:
      return { label: '強い', color: '#10b981', percent: 100 };
    default:
      return { label: '', color: '#9ca3af', percent: 0 };
  }
}
