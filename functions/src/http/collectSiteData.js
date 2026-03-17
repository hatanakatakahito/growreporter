/**
 * サイトコンテンツコレクター データ受信エンドポイント
 *
 * クライアントスクリプト(gr-collector.js)から送信された
 * サイト構造化データを受信してFirestoreに保存する。
 *
 * POST { siteId, pageUrl, device, ... }
 * → sites/{siteId}/siteStructureData/{docId}
 */
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import crypto from 'crypto';

/**
 * ページURL+デバイスからドキュメントIDを生成
 */
function generateDocId(pageUrl, device) {
  return crypto.createHash('md5').update(`${pageUrl}::${device}`).digest('hex');
}

/**
 * ペイロードのバリデーション
 */
function validatePayload(data) {
  if (!data.siteId || typeof data.siteId !== 'string') {
    return 'Missing or invalid siteId';
  }
  if (!data.pageUrl || typeof data.pageUrl !== 'string') {
    return 'Missing or invalid pageUrl';
  }
  if (!data.device || !['pc', 'mobile', 'tablet'].includes(data.device)) {
    return 'Missing or invalid device (must be pc, mobile, or tablet)';
  }
  return null;
}

export async function collectSiteDataHandler(req, res) {
  // CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ペイロードサイズチェック（100KB上限）
  const bodyStr = JSON.stringify(req.body);
  if (bodyStr.length > 100 * 1024) {
    return res.status(413).json({ error: 'Payload too large (max 100KB)' });
  }

  const data = req.body;
  const validationError = validatePayload(data);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  try {
    const db = getFirestore();

    // サイト存在確認
    const siteDoc = await db.collection('sites').doc(data.siteId).get();
    if (!siteDoc.exists) {
      return res.status(404).json({ error: 'Site not found' });
    }

    // ドキュメントIDを生成（pageUrl + device のハッシュ）
    const docId = generateDocId(data.pageUrl, data.device);

    // 保存データを構築（不要フィールドを除外）
    const structureData = {
      pageUrl: data.pageUrl,
      device: data.device,
      collectedAt: FieldValue.serverTimestamp(),

      // ファーストビュー
      firstView: data.firstView || null,

      // ナビゲーション
      navigation: data.navigation || null,

      // セクション構成
      sections: data.sections || [],

      // フォーム
      forms: data.forms || [],

      // フッター
      footer: data.footer || null,

      // メタ情報
      meta: data.meta || null,

      // デザイントークン
      designTokens: data.designTokens || null,

      // 主要要素のHTML+スタイル
      keyElements: data.keyElements || [],
    };

    // Firestoreに保存（upsert）
    await db.collection('sites').doc(data.siteId)
      .collection('siteStructureData').doc(docId)
      .set(structureData, { merge: true });

    logger.info(`[CollectSiteData] 保存完了: ${data.siteId}, ${data.pageUrl}, ${data.device}, docId=${docId}`);
    return res.status(200).json({ success: true, docId });

  } catch (error) {
    logger.error('[CollectSiteData] エラー:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
