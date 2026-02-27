import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';

const db = getFirestore();

// インメモリキャッシュ（siteId → { samplingRate, enabled, ts }）
const configCache = new Map();
const CONFIG_CACHE_TTL = 5 * 60 * 1000; // 5分

// プラン別ヒートマップPV上限（サイト単位/月）
const PV_LIMITS = {
  free: 0,
  standard: 10000,
  premium: 10000,
  paid: -1, // 無制限（旧システム互換）
};

/**
 * ヒートマップ設定取得 HTTP ハンドラ
 * クライアントのトラッキングスクリプト（gr-heatmap.js）から呼ばれ、
 * サンプリングレートと有効状態を返す軽量エンドポイント
 *
 * @param {import('firebase-functions/v2/https').Request} req
 * @param {import('firebase-functions/v2/https').Response} res
 */
export async function heatmapConfigHandler(req, res) {
  // CORS ヘッダー
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  // ブラウザキャッシュ 5分
  res.set('Cache-Control', 'public, max-age=300');

  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const siteId = req.query.siteId;
  if (!siteId) {
    return res.status(400).json({ error: 'Missing siteId' });
  }

  // インメモリキャッシュチェック
  const cached = configCache.get(siteId);
  if (cached && Date.now() - cached.ts < CONFIG_CACHE_TTL) {
    return res.status(200).json({
      samplingRate: cached.samplingRate,
      enabled: cached.enabled,
    });
  }

  try {
    // サイトドキュメント取得
    const siteDoc = await db.collection('sites').doc(siteId).get();
    if (!siteDoc.exists) {
      return res.status(404).json({ error: 'Site not found' });
    }

    const siteData = siteDoc.data();
    const userId = siteData.userId;

    // オーナーのプラン取得
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data() || {};
    const plan = userData.plan || 'free';

    // ヒートマップ有効判定
    const enabled = plan !== 'free';

    // PV上限チェック
    const pvLimit = PV_LIMITS[plan] ?? 0;
    const currentUsage = siteData.heatmapPvUsage || 0;
    const limitExceeded = pvLimit !== -1 && pvLimit > 0 && currentUsage >= pvLimit;

    // サンプリングレート決定
    // 1. PV上限到達 → 0（収集停止）
    // 2. サイト別に設定済み → その値
    // 3. デフォルト → 1.0（100%）
    let samplingRate = 1.0;
    if (!enabled || limitExceeded) {
      samplingRate = 0;
    } else if (siteData.heatmapSamplingRate != null) {
      samplingRate = siteData.heatmapSamplingRate;
    }

    const result = {
      samplingRate,
      enabled: enabled && !limitExceeded,
    };

    // キャッシュに保存
    configCache.set(siteId, { ...result, ts: Date.now() });

    return res.status(200).json(result);
  } catch (err) {
    logger.error('[heatmapConfig] Error:', err.message);
    return res.status(500).json({ error: 'Internal error' });
  }
}
