/**
 * HTML エスケープユーティリティ
 *
 * メールテンプレート / iframe srcDoc / その他 HTML として解釈される文脈で、
 * ユーザー入力由来の文字列をそのまま埋め込むと XSS / HTML injection を許す。
 *
 * 例:
 *   userName = '<script>alert(1)</script>'
 *   テンプレ: `<p>${userName} さん</p>` → 実行される（メール XSS）
 *   修正後: `<p>${escapeHtml(userName)} さん</p>` → そのままテキスト表示
 *
 * 信頼できないすべてのユーザー由来文字列（name / company / message / email 等）に
 * 適用する。
 *
 * 使い分け:
 *   - HTML 文脈（タグの中身、属性値）: escapeHtml
 *   - 属性値だけ: escapeAttr (escapeHtml と同等で OK)
 *   - URL 属性値（href/src）: escapeHtmlAndValidateUrl で http(s)/mailto/tel のみ許可
 *   - text/plain メール: エスケープ不要（HTML として解釈されない）
 */

const HTML_ESCAPE_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;',
};

/**
 * HTML 特殊文字をエンティティにエスケープする。
 * 入力が null/undefined/空文字の場合は空文字を返す。
 *
 * @param {unknown} input
 * @returns {string}
 */
export function escapeHtml(input) {
  if (input === null || input === undefined) return '';
  const str = String(input);
  if (!str) return '';
  return str.replace(/[&<>"'`=/]/g, (ch) => HTML_ESCAPE_MAP[ch] || ch);
}

/**
 * HTML 属性値専用のエスケープ。
 * 属性値内では `&<>"'` のエスケープで十分だが、安全側で escapeHtml と同じに揃える。
 *
 * @param {unknown} input
 * @returns {string}
 */
export function escapeAttr(input) {
  return escapeHtml(input);
}

/**
 * URL を href/src 属性に埋め込む際の安全化。
 * - http(s) / mailto: / tel: / 相対 URL のみ許可
 * - javascript: / data: / file: 等は空文字に置換
 * - 制御文字 / 改行 / タブを除去
 * - HTML エンティティ化も実施
 *
 * @param {unknown} input
 * @returns {string}
 */
export function escapeHtmlAndValidateUrl(input) {
  if (input === null || input === undefined) return '';
  const raw = String(input).trim();
  if (!raw) return '';
  // 制御文字 (改行・タブ・NULL 等) と DEL を除去
  // eslint-disable-next-line no-control-regex
  const cleaned = raw.replace(/[\x00-\x1F\x7F]/g, '');
  // スキームチェック
  // - 絶対 URL: スキーム allowlist
  // - 相対 URL / フラグメント: 通す
  if (/^(\/|#|\?|\.{1,2}\/)/.test(cleaned)) {
    return escapeHtml(cleaned);
  }
  const m = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(cleaned);
  if (!m) {
    // スキーム無し → 相対 URL 扱いで OK
    return escapeHtml(cleaned);
  }
  const scheme = m[1].toLowerCase();
  if (!['http', 'https', 'mailto', 'tel'].includes(scheme)) {
    return ''; // javascript: / data: / file: / blob: 等を遮断
  }
  return escapeHtml(cleaned);
}

/**
 * 改行を <br> に変換する（HTML プレーンテキスト埋め込み用）。
 * 入力は escapeHtml した後に呼び出すこと。
 *
 * @param {string} escapedText - 既に escapeHtml されたテキスト
 * @returns {string}
 */
export function nlToBr(escapedText) {
  if (!escapedText) return '';
  return String(escapedText).replace(/\r?\n/g, '<br>');
}

/**
 * ユーザー入力テキストを HTML に埋め込む際のワンステップヘルパ。
 *   `${escapeForHtmlMultiline(message)}` で改行も保持しつつ XSS 防止。
 *
 * @param {unknown} input
 * @returns {string}
 */
export function escapeForHtmlMultiline(input) {
  return nlToBr(escapeHtml(input));
}
