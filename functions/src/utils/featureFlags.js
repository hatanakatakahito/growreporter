/**
 * Feature flags 読み出しユーティリティ
 *
 * Firestore `systemSettings/featureFlags` ドキュメントから機能フラグを読み出し、
 * Cloud Functions のメモリにキャッシュ（60秒TTL）して負荷を抑える。
 *
 * 利用例:
 *   import { isFeatureEnabled, getFeatureConfig } from '../utils/featureFlags.js';
 *
 *   if (await isFeatureEnabled('improvementKnowledgeRagInjection')) {
 *     // 機能を実行
 *   }
 *
 *   const cfg = await getFeatureConfig('improvementKnowledgeRagInjection');
 *   if (cfg.enabledPrompts?.includes('comprehensiveImprovement')) {
 *     // 個別プロンプトに対する ON/OFF
 *   }
 *
 * フラグ未設定時のデフォルト挙動:
 *   - ドキュメントが存在しない、または該当フラグが未設定 → 「enabled: true」（fail-open）
 *   - 「enabled: false」が明示的に設定されている場合のみ無効化
 *   → 緊急時は admin が flag を ON→OFF に切り替えるだけで即時無効化できる
 */

import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';

const CACHE_TTL_MS = 60 * 1000; // 60秒
let _cache = null;
let _cacheExpiresAt = 0;

/**
 * featureFlags ドキュメント全体を取得（キャッシュ付き）
 * @returns {Promise<object>}
 */
async function loadFeatureFlags() {
  const now = Date.now();
  if (_cache && now < _cacheExpiresAt) {
    return _cache;
  }
  try {
    const db = getFirestore();
    const doc = await db.collection('systemSettings').doc('featureFlags').get();
    _cache = doc.exists ? doc.data() : {};
    _cacheExpiresAt = now + CACHE_TTL_MS;
    return _cache;
  } catch (err) {
    logger.warn('[featureFlags] load failed, fail-open (enabled=true)', { error: err.message });
    // 読み出し失敗時はキャッシュを汚さず、空オブジェクトを返す（fail-open）
    return {};
  }
}

/**
 * 指定フラグが有効か判定
 * @param {string} flagName - 例: 'improvementKnowledgeRagInjection'
 * @returns {Promise<boolean>}
 */
export async function isFeatureEnabled(flagName) {
  const flags = await loadFeatureFlags();
  const cfg = flags[flagName];
  if (!cfg) return true; // 未設定はデフォルトで有効
  return cfg.enabled !== false;
}

/**
 * 指定フラグの設定オブジェクト全体を取得
 * @param {string} flagName
 * @returns {Promise<object>} 未設定時は空オブジェクト
 */
export async function getFeatureConfig(flagName) {
  const flags = await loadFeatureFlags();
  return flags[flagName] || {};
}

/**
 * プロンプト個別の ON/OFF を判定
 * 例: getFeatureConfig('improvementKnowledgeRagInjection').enabledPrompts に
 *     'comprehensiveImprovement' が含まれていれば有効
 * @param {string} flagName - 例: 'improvementKnowledgeRagInjection'
 * @param {string} promptKey - 例: 'comprehensiveImprovement'
 * @returns {Promise<boolean>}
 */
export async function isPromptInjectionEnabled(flagName, promptKey) {
  const cfg = await getFeatureConfig(flagName);
  if (cfg.enabled === false) return false;
  // enabledPrompts が未設定なら全プロンプトで有効（緩め）
  if (!Array.isArray(cfg.enabledPrompts)) return true;
  return cfg.enabledPrompts.includes(promptKey);
}

/**
 * テスト・debug用: キャッシュをクリア（即座に最新値を読み出すため）
 */
export function clearFeatureFlagsCache() {
  _cache = null;
  _cacheExpiresAt = 0;
}
