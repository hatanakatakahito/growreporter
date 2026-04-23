/**
 * 実装検証: Before / After スナップショットの差分判定
 *
 * 戻り値 implementationVerified:
 *   - true  : 有意な変化を検出 → knowledge に蓄積する
 *   - false : どの基準でも変化未検出 → knowledge 除外、UI に ⚠ 表示
 *   - null  : 検証不能（Before 欠落・scrape 失敗等） → knowledge 除外、UI に — 表示
 *
 * 検出基準（OR 結合、1 つでも合致すれば verified=true）:
 *   1. metaTitle 変更
 *   2. metaDescription 変更
 *   3. headingStructure のいずれかのカウント変化
 *   4. textLength が ±10% を超えて変化
 *   5. ctaButtons のテキスト or href 集合が変化
 *   6. forms[].fields の集合が変化
 *   7. mainText の Jaccard 類似度 < 0.9
 */

const TEXT_LENGTH_TOLERANCE = 0.10;
const JACCARD_THRESHOLD = 0.9;

/**
 * 文字列 bigram の Set を返す
 */
function bigramSet(str) {
  const s = (str || '').replace(/\s+/g, ' ').trim();
  const set = new Set();
  for (let i = 0; i < s.length - 1; i++) {
    set.add(s.slice(i, i + 2));
  }
  return set;
}

/**
 * bigram ベースの Jaccard 類似度（0〜1、1 が完全一致）
 */
export function jaccardSimilarity(a, b) {
  const sa = bigramSet(a);
  const sb = bigramSet(b);
  if (sa.size === 0 && sb.size === 0) return 1;
  let intersection = 0;
  for (const x of sa) if (sb.has(x)) intersection++;
  const union = sa.size + sb.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * ctaButtons 配列から「テキスト + href」の集合（Set<string>）を作る
 */
function ctaSignature(ctaButtons) {
  if (!Array.isArray(ctaButtons)) return new Set();
  return new Set(
    ctaButtons
      .filter(c => c && (c.text || c.href))
      .map(c => `${(c.text || '').trim()}||${(c.href || '').trim()}`)
  );
}

/**
 * forms 配列から「フォーム目的 + 全フィールド名」の集合を作る
 */
function formSignature(forms) {
  if (!Array.isArray(forms)) return new Set();
  return new Set(
    forms
      .filter(f => f)
      .map(f => {
        const purpose = (f.purpose || '').trim();
        const fields = Array.isArray(f.fields) ? [...f.fields].sort().join(',') : '';
        return `${purpose}::${fields}`;
      })
  );
}

function setsEqual(a, b) {
  if (a.size !== b.size) return false;
  for (const x of a) if (!b.has(x)) return false;
  return true;
}

/**
 * Before / After スナップショットから差分判定する
 *
 * @param {object|null} before - beforeSnapshot object or null
 * @param {object|null} after  - afterSnapshot object or null
 * @returns {{
 *   implementationVerified: boolean|null,
 *   changedFields: string[],
 *   textSimilarity: number|null,
 *   verificationError: string|null,
 * }}
 */
export function diffSnapshots(before, after) {
  // null ガード: どちらか欠落していれば検証不能
  if (!before || before.error) {
    return {
      implementationVerified: null,
      changedFields: [],
      textSimilarity: null,
      verificationError: before?.error || 'before snapshot missing',
    };
  }
  if (!after || after.error) {
    return {
      implementationVerified: null,
      changedFields: [],
      textSimilarity: null,
      verificationError: after?.error || 'after snapshot missing',
    };
  }

  const changedFields = [];

  // 1. metaTitle
  if ((before.metaTitle || '') !== (after.metaTitle || '')) {
    changedFields.push('metaTitle');
  }

  // 2. metaDescription
  if ((before.metaDescription || '') !== (after.metaDescription || '')) {
    changedFields.push('metaDescription');
  }

  // 3. headingStructure（h1/h2/h3/h4 のカウント変化）
  const bHs = before.headingStructure || {};
  const aHs = after.headingStructure || {};
  const headingKeys = ['h1', 'h2', 'h3', 'h4'];
  const headingChanged = headingKeys.some(k => (bHs[k] || 0) !== (aHs[k] || 0));
  if (headingChanged) changedFields.push('headingStructure');

  // 4. textLength ±10%
  const bLen = Number(before.textLength || 0);
  const aLen = Number(after.textLength || 0);
  if (bLen > 0) {
    const ratio = Math.abs(aLen - bLen) / bLen;
    if (ratio > TEXT_LENGTH_TOLERANCE) changedFields.push('textLength');
  } else if (aLen > 0) {
    // Before が 0 で After に文字が入った → 変化あり
    changedFields.push('textLength');
  }

  // 5. ctaButtons（テキスト + href の集合）
  const bCtas = ctaSignature(before.ctaButtons);
  const aCtas = ctaSignature(after.ctaButtons);
  if (!setsEqual(bCtas, aCtas)) changedFields.push('ctaButtons');

  // 6. forms の集合
  const bForms = formSignature(before.forms);
  const aForms = formSignature(after.forms);
  if (!setsEqual(bForms, aForms)) changedFields.push('forms');

  // 7. mainText の Jaccard 類似度
  const similarity = jaccardSimilarity(before.mainText || '', after.mainText || '');
  if (similarity < JACCARD_THRESHOLD) changedFields.push('mainText');

  const implementationVerified = changedFields.length > 0;

  return {
    implementationVerified,
    changedFields,
    textSimilarity: Number(similarity.toFixed(4)),
    verificationError: null,
  };
}
