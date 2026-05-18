/**
 * Cloud Functions Callable レート制限ユーティリティ (Phase 4-A-2)
 *
 * Firestore に sliding window 方式でアクション履歴を記録し、上限超過時は
 * HttpsError('resource-exhausted') を投げる。
 *
 * 利用例:
 *   import { enforceRateLimit } from '../utils/rateLimiter.js';
 *   await enforceRateLimit({ uid: req.auth.uid, action: 'inviteMember', limit: 10, windowSec: 3600 });
 *
 * 設計:
 *   - Firestore コレクション `rate_limits/{uid}_{action}/events/{eventId}` に
 *     timestamp を記録
 *   - 既存の events のうち windowSec 内のものをカウント
 *   - 上限以下なら新 event を追加して通す。上限超過なら拒否
 *
 * 想定攻撃:
 *   - inviteMember を高頻度で叩いて大量の招待メールスパム
 *   - fetchMetadata を踏み台にした URL スクリーン
 *   - generateAISummary 等 AI コール乱用による課金枯渇
 */
import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';

/**
 * @param {Object} params
 * @param {string} params.uid - 呼出者 UID（必須）
 * @param {string} params.action - アクション名（例: 'inviteMember', 'fetchMetadata'）
 * @param {number} params.limit - 上限回数
 * @param {number} params.windowSec - スライディングウィンドウ秒数
 * @param {string} [params.errorMessage] - 上限超過時のメッセージ
 * @throws {HttpsError} 上限超過時に 'resource-exhausted'
 */
export async function enforceRateLimit({ uid, action, limit, windowSec, errorMessage }) {
  if (!uid) {
    // 認証なしのアクションには適用しない（呼出側で auth 必須にする想定）
    return;
  }
  if (!action || typeof limit !== 'number' || typeof windowSec !== 'number') {
    throw new Error('[rateLimiter] action / limit / windowSec が必須');
  }

  const db = getFirestore();
  const docId = `${uid}_${action}`;
  const eventsRef = db.collection('rate_limits').doc(docId).collection('events');
  const cutoff = new Date(Date.now() - windowSec * 1000);

  // ウィンドウ内の既存イベントをカウント
  const snapshot = await eventsRef
    .where('timestamp', '>=', cutoff)
    .orderBy('timestamp', 'desc')
    .limit(limit + 1)
    .get();

  if (snapshot.size >= limit) {
    logger.warn('[rateLimiter] 上限超過', { uid, action, count: snapshot.size, limit, windowSec });
    throw new HttpsError(
      'resource-exhausted',
      errorMessage ||
        `${action} の実行回数が上限(${limit}回 / ${Math.round(windowSec / 60)}分)に達しました。しばらく時間をおいてから再度お試しください。`
    );
  }

  // 新イベントを追加（成功時のみ）
  await eventsRef.add({
    timestamp: FieldValue.serverTimestamp(),
    action,
    uid,
  });

  // 古いエントリのクリーンアップは別途 scheduled function で実施推奨
  //   （rate_limits/*/events で 24h 以前を削除）
}

/**
 * 各 action のデフォルト上限定義。
 * 個別 callable で `enforceRateLimit({ ...DEFAULT_RATE_LIMITS.inviteMember })` のように使う。
 */
export const DEFAULT_RATE_LIMITS = {
  // メール送信を伴う操作（スパム踏み台防止）
  inviteMember: { action: 'inviteMember', limit: 10, windowSec: 3600 },
  resendInvitation: { action: 'resendInvitation', limit: 5, windowSec: 600 },
  submitImprovementConsultation: { action: 'submitImprovementConsultation', limit: 5, windowSec: 600 },
  submitUpgradeInquiry: { action: 'submitUpgradeInquiry', limit: 3, windowSec: 600 },
  sendTestReportEmail: { action: 'sendTestReportEmail', limit: 20, windowSec: 600 },

  // 外部 fetch を伴う操作（SSRF 踏み台防止 + 課金）
  fetchMetadata: { action: 'fetchMetadata', limit: 60, windowSec: 3600 },
  refreshSiteMetadataAndScreenshots: { action: 'refreshSiteMetadataAndScreenshots', limit: 20, windowSec: 3600 },
  scrapeTop100Pages: { action: 'scrapeTop100Pages', limit: 5, windowSec: 3600 },

  // AI 呼出（実用上の上限を大幅に拡張、2026-05-08）
  // 経緯: 旧 30 回/日 はテスト + 多サイト管理 + 複数ユーザー同時利用で頻繁に枯渇していた。
  // 異常リクエスト防止 (DDoS / 暴走 bot) の保険として極めて高い値だけ残し、正常運用では
  // 事実上ノーリミットで動作する設定に変更。
  generateAISummary: { action: 'generateAISummary', limit: 10000, windowSec: 86400 },
  generateImprovements: { action: 'generateImprovements', limit: 10000, windowSec: 86400 },
  generateImprovementMockup: { action: 'generateImprovementMockup', limit: 10000, windowSec: 86400 },
  expandManualImprovement: { action: 'expandManualImprovement', limit: 10000, windowSec: 86400 },
  aiChat: { action: 'aiChat', limit: 10000, windowSec: 86400 },
  inferSiteTaxonomy: { action: 'inferSiteTaxonomy', limit: 10000, windowSec: 86400 },
  analyzePageQuality: { action: 'analyzePageQuality', limit: 10000, windowSec: 86400 },

  // 重要操作
  transferOwnership: { action: 'transferOwnership', limit: 3, windowSec: 86400 },
  deleteAccount: { action: 'deleteAccount', limit: 2, windowSec: 86400 },
  deleteSite: { action: 'deleteSite', limit: 10, windowSec: 86400 },
};
