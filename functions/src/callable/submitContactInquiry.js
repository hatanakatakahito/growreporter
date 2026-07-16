/**
 * LP（grow-reporter.com/lp/）お問い合わせフォーム送信エンドポイント（HTTP, public）
 *
 * Firebase Hosting の rewrite (firebase.json: /api/contact → submitContactInquiry) で
 * grow-reporter.com 配下の URL として静的 LP から fetch POST される。
 *
 * 未認証で叩ける公開エンドポイントのため、以下でスパム・濫用を抑止する:
 *   - ハニーポット項目（人間には見えない隠しフィールド）が埋まっていたら成功を装って破棄
 *   - 送信元 IP 単位のレート制限
 *   - 入力長・形式の検証
 *
 * 送信処理: 既存メール基盤 sendContactInquiryEmail（SES 経由・宛先 info@grow-reporter.com）
 * 記録用に Firestore `contactInquiries` にも保存する（メール失敗時の保険）。
 */
import { logger } from 'firebase-functions/v2';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { sendContactInquiryEmail, sendContactAutoReplyEmail } from '../utils/emailSender.js';
import { enforceRateLimit } from '../utils/rateLimiter.js';

const MAX_NAME_LEN = 100;
const MAX_COMPANY_LEN = 200;
const MAX_DEPARTMENT_LEN = 100;
const MAX_EMAIL_LEN = 254; // RFC 3696
const MAX_MESSAGE_LEN = 5000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length > 0) {
    return fwd.split(',')[0].trim();
  }
  return req.ip || 'unknown';
}

export async function submitContactInquiryRequest(req, res) {
  // CORS（同一オリジン経由が基本だが、直接呼び出しにも備える）
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Method Not Allowed' });
    return;
  }

  try {
    const data = req.body || {};

    // ハニーポット: bot が埋めがちな隠しフィールド。埋まっていたら成功を装って破棄。
    if (typeof data.website === 'string' && data.website.trim() !== '') {
      logger.info('[contact] ハニーポット検知のため破棄', { ip: clientIp(req) });
      res.status(200).json({ success: true });
      return;
    }

    const company = String(data.company ?? '').trim();
    const department = String(data.department ?? '').trim();
    const name = String(data.name ?? '').trim();
    const email = String(data.email ?? '').trim();
    const message = String(data.message ?? '').trim();

    // 入力検証
    if (!company || company.length > MAX_COMPANY_LEN) {
      res.status(400).json({ success: false, error: '会社名・組織名を正しく入力してください' });
      return;
    }
    if (department.length > MAX_DEPARTMENT_LEN) {
      res.status(400).json({ success: false, error: '部署名が長すぎます' });
      return;
    }
    if (!name || name.length > MAX_NAME_LEN) {
      res.status(400).json({ success: false, error: 'お名前を正しく入力してください' });
      return;
    }
    if (!email || email.length > MAX_EMAIL_LEN || !EMAIL_RE.test(email)) {
      res.status(400).json({ success: false, error: 'メールアドレスを正しく入力してください' });
      return;
    }
    if (!message || message.length > MAX_MESSAGE_LEN) {
      res.status(400).json({ success: false, error: 'お問い合わせ内容を正しく入力してください' });
      return;
    }

    // レート制限: 送信元 IP 単位（rate_limits/{ip}_contactInquiry）
    const ip = clientIp(req);
    try {
      await enforceRateLimit({
        uid: `ip:${ip}`,
        action: 'contactInquiry',
        limit: 5,
        windowSec: 3600,
        errorMessage: '短時間に送信が集中しています。しばらく経ってから再度お試しください。',
      });
    } catch (rateErr) {
      logger.warn('[contact] レート制限超過', { ip });
      res.status(429).json({ success: false, error: rateErr.message || '送信回数の上限に達しました' });
      return;
    }

    // 記録（メール失敗時の保険・管理確認用）
    const db = getFirestore();
    try {
      await db.collection('contactInquiries').add({
        company,
        department,
        name,
        email,
        message,
        ip,
        userAgent: String(req.headers['user-agent'] || '').slice(0, 500),
        source: 'lp',
        status: 'new',
        createdAt: FieldValue.serverTimestamp(),
      });
    } catch (storeErr) {
      // 保存失敗はメール送信を妨げない
      logger.error('[contact] Firestore 保存失敗', { error: storeErr.message });
    }

    const result = await sendContactInquiryEmail({ name, company, department, email, message });
    if (!result.success) {
      res.status(500).json({ success: false, error: '送信に失敗しました。時間をおいて再度お試しください。' });
      return;
    }

    // 送信者本人への自動返信（受付控え）。失敗しても問い合わせ自体は成功扱いにする。
    try {
      await sendContactAutoReplyEmail({ name, company, department, email, message });
    } catch (replyErr) {
      logger.error('[contact] 自動返信メール送信失敗', { error: replyErr.message });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    logger.error('[contact] お問い合わせ処理エラー', { error: error.message });
    res.status(500).json({ success: false, error: 'サーバーエラーが発生しました' });
  }
}
