import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';

/**
 * 共有リンク用 公開エンドポイント（認証不要）
 * /share/close-meeting/:token の閲覧時に呼ばれ、確定保存された snapshot のみを返す。
 * GA4/GSC は一切呼ばない。token 不正・無効化済み・期限切れは not-found を返す。
 *
 * セキュリティ:
 *  - token は推測困難なランダム文字列（22文字 base64url）。リンクを知っている人のみ閲覧可（モックアップ共有と同様）
 *  - 90日で自動失効（share.expiresAt）。発行者が手動で無効化/再発行も可
 *  - 返すのは集計済みの数値（PII を含まない）と AI 総括・担当者メモのみ
 */
export const getSharedCloseMeetingCallable = async (request) => {
  const token = request.data?.token;
  if (!token || typeof token !== 'string' || token.length < 8 || token.length > 64) {
    throw new HttpsError('invalid-argument', 'token が不正です');
  }
  try {
    const db = getFirestore();
    const snap = await db.collection('closeMeetings').where('share.token', '==', token).limit(1).get();
    if (snap.empty) {
      throw new HttpsError('not-found', 'このレポートは公開されていません');
    }
    const doc = snap.docs[0];
    const d = doc.data() || {};
    const share = d.share || {};
    if (!share.enabled) {
      throw new HttpsError('not-found', 'このレポートの共有は無効化されています');
    }
    // 期限切れチェック
    const expMs = share.expiresAt && typeof share.expiresAt.toMillis === 'function' ? share.expiresAt.toMillis() : null;
    if (expMs && expMs < Date.now()) {
      throw new HttpsError('not-found', 'このレポートの共有リンクは期限切れです');
    }
    if (!d.snapshot || typeof d.snapshot !== 'object') {
      throw new HttpsError('not-found', 'このレポートはまだ確定保存されていません');
    }

    // 担当者メモは「補足情報」なので、確定後に追記した内容（備考など）も反映されるよう最新（ライブ）を優先。
    // ライブが空の場合のみ確定時の snapshot 内 notesSnapshot にフォールバック。
    const hasNotes = (n) =>
      n && typeof n === 'object' && Object.values(n).some((v) => (Array.isArray(v) ? v.length > 0 : v && String(v).trim() !== ''));
    const consultantNotes = hasNotes(d.consultantNotes) ? d.consultantNotes : d.snapshot?.notesSnapshot || d.consultantNotes || {};

    return {
      siteName: d.siteName || '',
      siteUrl: d.siteUrl || '',
      launchDate: d.launchDate || '',
      label: d.label || '',
      snapshot: d.snapshot,
      aiSummary: d.aiSummary || null,
      consultantNotes,
      expiresAt: expMs ? new Date(expMs).toISOString() : null,
    };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    logger.error('[getSharedCloseMeeting] error:', error);
    throw new HttpsError('internal', '取得に失敗しました');
  }
};
