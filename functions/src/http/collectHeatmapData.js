import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { createHash } from 'crypto';

const db = getFirestore();

// サイト情報キャッシュ（インメモリ、TTL 5分）
const siteCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

// PV使用量キャッシュ（インメモリ、TTL 60秒）
const pvUsageCache = new Map();
const PV_USAGE_CACHE_TTL = 60 * 1000;

// プラン別ヒートマップPV上限（サイト単位/月）
const PV_LIMITS = {
  free: 0,
  standard: 10000,
  premium: 10000,
  paid: -1, // 無制限
};

/**
 * サイト情報を取得（キャッシュ付き）
 * @returns {{ valid: boolean, userId?: string, plan?: string }}
 */
async function getSiteInfo(siteId) {
  const cached = siteCache.get(siteId);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached;

  const siteDoc = await db.collection('sites').doc(siteId).get();
  if (!siteDoc.exists) {
    const result = { valid: false, ts: Date.now() };
    siteCache.set(siteId, result);
    return result;
  }

  const siteData = siteDoc.data();
  const userId = siteData.userId;

  // オーナーのプラン取得
  const userDoc = await db.collection('users').doc(userId).get();
  const userData = userDoc.data() || {};
  const plan = userData.plan || 'free';

  const result = { valid: true, userId, plan, ts: Date.now() };
  siteCache.set(siteId, result);
  return result;
}

/**
 * siteId が有効（Firestore に存在する）か確認（後方互換）
 */
async function isSiteValid(siteId) {
  const info = await getSiteInfo(siteId);
  return info.valid;
}

/**
 * ヒートマップPV上限をチェック
 * @returns {{ allowed: boolean, reason?: string }}
 */
async function checkPvLimit(siteId) {
  const siteInfo = await getSiteInfo(siteId);
  if (!siteInfo.valid) return { allowed: false, reason: 'invalid_site' };

  const pvLimit = PV_LIMITS[siteInfo.plan] ?? 0;
  if (pvLimit === -1) return { allowed: true }; // 無制限
  if (pvLimit === 0) return { allowed: false, reason: 'plan_disabled' };

  // インメモリキャッシュで高速判定
  const cacheKey = siteId;
  const cached = pvUsageCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < PV_USAGE_CACHE_TTL) {
    if (cached.count >= pvLimit) {
      return { allowed: false, reason: 'limit_exceeded' };
    }
    return { allowed: true };
  }

  // キャッシュミス: Firestoreから現在の使用量を取得
  try {
    const siteDoc = await db.collection('sites').doc(siteId).get();
    const usage = siteDoc.data()?.heatmapPvUsage || 0;
    pvUsageCache.set(cacheKey, { count: usage, ts: Date.now() });

    if (usage >= pvLimit) {
      return { allowed: false, reason: 'limit_exceeded' };
    }
    return { allowed: true };
  } catch (err) {
    logger.error('[collectHeatmapData] PV上限チェックエラー:', err.message);
    // エラー時は許可（データ損失を避ける）
    return { allowed: true };
  }
}

/**
 * ヒートマップPVカウンタをインクリメント（fire-and-forget）
 */
function incrementPvUsage(siteId) {
  const siteRef = db.collection('sites').doc(siteId);
  siteRef.update({
    heatmapPvUsage: FieldValue.increment(1),
  }).then(() => {
    // インメモリキャッシュも更新
    const cached = pvUsageCache.get(siteId);
    if (cached) {
      cached.count++;
    }
  }).catch((err) => {
    logger.error('[collectHeatmapData] PVカウンタ更新エラー:', err.message);
  });
}

/**
 * URL パスを正規化（パスのみ、末尾スラッシュ除去）
 */
function normalizePath(raw) {
  let p = (raw || '/').split('?')[0].split('#')[0];
  if (p !== '/' && p.endsWith('/')) p = p.slice(0, -1);
  return p || '/';
}

/**
 * ページ URL → ドキュメント ID を生成
 * 短い URL はそのままエンコード、長い場合は MD5 ハッシュ
 */
function pageUrlToDocId(pageUrl, device) {
  // パスを安全な文字列に変換
  let encoded = pageUrl.replace(/\//g, '_');
  // Firestore ドキュメント ID の制限対策（1500バイト）
  if (encoded.length > 200) {
    encoded = createHash('md5').update(pageUrl).digest('hex');
  }
  return `${encoded}_${device}`;
}

/**
 * ヒートマップデータ収集 HTTP ハンドラ
 * @param {import('firebase-functions/v2/https').Request} req
 * @param {import('firebase-functions/v2/https').Response} res
 */
export async function collectHeatmapDataHandler(req, res) {
  // CORS ヘッダー
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // text/plain で送信された JSON ボディをパース（sendBeacon のプリフライト回避用）
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid JSON' });
    }
  }

  // ペイロードサイズチェック（50KB）
  const rawBody = JSON.stringify(body);
  if (rawBody.length > 50000) {
    return res.status(413).json({ error: 'Payload too large' });
  }

  const { siteId, type, device, pageUrl: rawPageUrl, sessionId } = body;

  // 基本バリデーション
  if (!siteId || !type || !device || !rawPageUrl) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (!['pc', 'mobile'].includes(device)) {
    return res.status(400).json({ error: 'Invalid device type' });
  }

  if (!['clicks', 'scroll', 'sections'].includes(type)) {
    return res.status(400).json({ error: 'Invalid type' });
  }

  // siteId 検証 + PV上限チェック
  try {
    const valid = await isSiteValid(siteId);
    if (!valid) {
      return res.status(404).json({ error: 'Site not found' });
    }

    // PV上限チェック
    const pvCheck = await checkPvLimit(siteId);
    if (!pvCheck.allowed) {
      return res.status(429).json({
        error: 'Heatmap PV limit exceeded',
        code: 'PV_LIMIT_EXCEEDED',
        reason: pvCheck.reason,
      });
    }
  } catch (err) {
    logger.error('[collectHeatmapData] siteId検証エラー:', err.message);
    return res.status(500).json({ error: 'Internal error' });
  }

  const pageUrl = normalizePath(rawPageUrl);
  const docId = pageUrlToDocId(pageUrl, device);
  const docRef = db.collection('sites').doc(siteId).collection('heatmapPages').doc(docId);

  // 日別サブドキュメント用: 今日の日付（YYYY-MM-DD）
  const today = new Date().toISOString().slice(0, 10);
  const dailyDocRef = docRef.collection('daily').doc(today);

  try {
    if (type === 'sections') {
      // ページのセクション（見出し）マップを保存
      const { sections, pageHeight } = body;
      if (!Array.isArray(sections) || sections.length === 0) {
        return res.status(400).json({ error: 'No section data' });
      }

      // セクション情報を y 座標キーでマップ化（最大30件）
      const sectionMap = {};
      for (const s of sections.slice(0, 30)) {
        if (s.y != null && s.text) {
          const yKey = String(Math.floor(s.y / 100) * 100); // 100px 刻みに正規化
          if (!sectionMap[yKey]) { // 同じバケットの最初の見出しのみ
            sectionMap[yKey] = {
              text: String(s.text).slice(0, 50),
              tag: String(s.tag || 'h2').slice(0, 2),
              y: s.y,
            };
          }
        }
      }

      await docRef.set({
        pageUrl,
        device,
        sections: sectionMap,
        avgPageHeight: pageHeight || 0,
        lastEventAt: FieldValue.serverTimestamp(),
      }, { merge: true });

      return res.status(200).json({ ok: true });

    } else if (type === 'clicks') {
      const { clicks, viewportWidth, pageHeight } = body;
      if (!Array.isArray(clicks) || clicks.length === 0) {
        return res.status(400).json({ error: 'No click data' });
      }

      // 累積ドキュメント更新（set + merge でドキュメント未作成時も安全）
      await docRef.set({
        pageUrl,
        device,
        totalClicks: FieldValue.increment(clicks.length),
        avgPageHeight: pageHeight || 0,
        avgViewportWidth: viewportWidth || 0,
        lastEventAt: FieldValue.serverTimestamp(),
      }, { merge: true });

      // 日別サブドキュメントも同時更新
      await dailyDocRef.set({
        date: today,
        totalClicks: FieldValue.increment(clicks.length),
        avgPageHeight: pageHeight || 0,
      }, { merge: true });

      // クリックをグリッドに集約（x: 5%刻み=20区分、y: 100px刻み）
      const gridUpdates = {};
      const dailyGridUpdates = {};
      // セクション別クリック数を集計
      const sectionClickUpdates = {};
      for (const click of clicks) {
        const xBucket = Math.min(95, Math.floor((click.x / 10000) * 20) * 5);
        const yBucket = Math.floor(click.y / 100) * 100;
        const key = `clickGrid.x${xBucket}_y${yBucket}`;
        gridUpdates[key] = FieldValue.increment(1);
        dailyGridUpdates[key] = FieldValue.increment(1);

        // セクション名が付与されている場合、セクション別クリック数をインクリメント
        if (click.section) {
          const safeSection = click.section.replace(/[./$\[\]#]/g, '_').slice(0, 50);
          const sKey = `sectionClicks.${safeSection}`;
          sectionClickUpdates[sKey] = FieldValue.increment(1);
        }
      }
      const updatePromises = [
        docRef.update(gridUpdates),
        dailyDocRef.update(dailyGridUpdates),
      ];
      if (Object.keys(sectionClickUpdates).length > 0) {
        updatePromises.push(docRef.update(sectionClickUpdates));
      }
      await Promise.all(updatePromises);

    } else if (type === 'scroll') {
      const { maxScrollPercent, viewportHeight, pageHeight } = body;
      if (typeof maxScrollPercent !== 'number') {
        return res.status(400).json({ error: 'Invalid scroll data' });
      }

      // PVカウンタをインクリメント（scroll は離脱時1回のみ送信 = 実PVに最も近い）
      incrementPvUsage(siteId);

      // 累積ドキュメント更新
      await docRef.set({
        pageUrl,
        device,
        totalSessions: FieldValue.increment(1),
        avgPageHeight: pageHeight || 0,
        avgViewportWidth: viewportHeight || 0,
        lastEventAt: FieldValue.serverTimestamp(),
      }, { merge: true });

      // 日別サブドキュメントも同時更新
      await dailyDocRef.set({
        date: today,
        totalSessions: FieldValue.increment(1),
        avgPageHeight: pageHeight || 0,
      }, { merge: true });

      // 10% 刻みで到達セッション数をインクリメント
      const scrollUpdates = {};
      const dailyScrollUpdates = {};
      const reachedBucket = Math.min(100, Math.floor(maxScrollPercent / 10) * 10);
      for (let pct = 10; pct <= reachedBucket; pct += 10) {
        scrollUpdates[`scrollReach.${pct}`] = FieldValue.increment(1);
        dailyScrollUpdates[`scrollReach.${pct}`] = FieldValue.increment(1);
      }
      await Promise.all([
        docRef.update(scrollUpdates),
        dailyDocRef.update(dailyScrollUpdates),
      ]);
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    logger.error('[collectHeatmapData] Firestore書き込みエラー:', err.message);
    return res.status(500).json({ error: 'Internal error' });
  }
}
