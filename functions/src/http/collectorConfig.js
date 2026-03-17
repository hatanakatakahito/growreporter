/**
 * サイトコンテンツコレクター 設定エンドポイント
 *
 * クライアントスクリプト(gr-collector.js)から呼び出され、
 * 対象ページのデータ収集が必要かどうかを判定する。
 *
 * GET ?siteId=xxx&pageUrl=yyy&device=pc
 * → { collect: true/false }
 */
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import crypto from 'crypto';

/**
 * ページURL+デバイスからドキュメントIDを生成
 */
function generateDocId(pageUrl, device) {
  return crypto.createHash('md5').update(`${pageUrl}::${device}`).digest('hex');
}

export async function collectorConfigHandler(req, res) {
  // CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { siteId, pageUrl, device } = req.query;

  if (!siteId || !pageUrl || !device) {
    return res.status(400).json({ collect: false, error: 'Missing required parameters: siteId, pageUrl, device' });
  }

  try {
    const db = getFirestore();

    // サイト存在確認
    const siteDoc = await db.collection('sites').doc(siteId).get();
    if (!siteDoc.exists) {
      return res.status(404).json({ collect: false, error: 'Site not found' });
    }

    // 既収集チェック: 同一URL+deviceが直近7日以内ならスキップ
    const docId = generateDocId(pageUrl, device);
    const existingDoc = await db.collection('sites').doc(siteId)
      .collection('siteStructureData').doc(docId).get();

    if (existingDoc.exists) {
      const data = existingDoc.data();
      const collectedAt = data.collectedAt?.toDate?.() || new Date(0);
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      if (collectedAt > sevenDaysAgo) {
        logger.info(`[CollectorConfig] スキップ（7日以内に収集済み）: ${siteId}, ${pageUrl}, ${device}`);
        return res.status(200).json({ collect: false, reason: 'recently_collected' });
      }
    }

    logger.info(`[CollectorConfig] 収集許可: ${siteId}, ${pageUrl}, ${device}`);
    return res.status(200).json({ collect: true });

  } catch (error) {
    logger.error('[CollectorConfig] エラー:', error);
    return res.status(500).json({ collect: false, error: 'Internal server error' });
  }
}
