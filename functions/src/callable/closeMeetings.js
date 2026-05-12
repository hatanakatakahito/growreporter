import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { randomBytes } from 'node:crypto';
import { canAccessSite } from '../utils/permissionHelper.js';

/**
 * クローズミーティング記録（GrowGroup 社内用）の CRUD callable 群
 *
 * セキュリティ方針（多層防御）:
 *   1. 呼び出し元が @grow-group.jp のメールアドレスを持つこと（requireGrowStaff）
 *   2. 対象サイトへのアクセス権があること（canAccessSite）
 *   3. Firestore ルールでも closeMeetings は GrowGroup スタッフ/管理者のみ read、write は Functions のみ
 *
 * 記録は履歴型: closeMeetings/{autoId} + siteId フィールド（1サイトに複数リニューアル記録可）
 */

const GROW_STAFF_EMAIL_RE = /@grow-group\.jp$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const COMPARISON_MODES = ['yoy', 'prevPeriod', 'custom'];
const UPDATABLE_KEYS = ['label', 'meetingDate', 'launchDate', 'comparison', 'observationRange', 'consultantNotes'];

function requireGrowStaff(request) {
  const uid = request.auth?.uid;
  const email = request.auth?.token?.email;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'ログインが必要です');
  }
  if (!email || !GROW_STAFF_EMAIL_RE.test(email)) {
    throw new HttpsError('permission-denied', 'この機能は GrowGroup 社内スタッフのみ利用できます');
  }
  return { uid, email };
}

function isValidDateStr(s) {
  return typeof s === 'string' && DATE_RE.test(s) && !Number.isNaN(Date.parse(s));
}

function toIso(v) {
  return v && typeof v.toDate === 'function' ? v.toDate().toISOString() : v ?? null;
}

// Firestore Timestamp などをフロントに返せる形（ISO 文字列）に正規化
function serializeRecord(doc) {
  const d = doc.data() || {};
  const aiSummary = d.aiSummary
    ? { ...d.aiSummary, generatedAt: toIso(d.aiSummary.generatedAt) }
    : null;
  const snapshot = d.snapshot
    ? { ...d.snapshot, generatedAt: toIso(d.snapshot.generatedAt) }
    : null;
  const share = d.share
    ? { ...d.share, createdAt: toIso(d.share.createdAt), expiresAt: toIso(d.share.expiresAt) }
    : null;
  return {
    ...d,
    id: doc.id,
    createdAt: toIso(d.createdAt),
    updatedAt: toIso(d.updatedAt),
    aiSummary,
    snapshot,
    share,
  };
}

async function loadRecordWithAccess(uid, recordId) {
  const db = getFirestore();
  const ref = db.collection('closeMeetings').doc(recordId);
  const doc = await ref.get();
  if (!doc.exists) {
    throw new HttpsError('not-found', '記録が見つかりません');
  }
  const data = doc.data();
  const hasAccess = await canAccessSite(uid, data.siteId);
  if (!hasAccess) {
    throw new HttpsError('permission-denied', 'このサイトへのアクセス権がありません');
  }
  return { ref, doc, data };
}

// ── 一覧取得（サイトのリニューアル記録、新しい順） ──
export const listCloseMeetingsCallable = async (request) => {
  const { uid } = requireGrowStaff(request);
  const { siteId } = request.data || {};
  if (!siteId || typeof siteId !== 'string') {
    throw new HttpsError('invalid-argument', 'siteId が必要です');
  }
  const hasAccess = await canAccessSite(uid, siteId);
  if (!hasAccess) {
    throw new HttpsError('permission-denied', 'このサイトへのアクセス権がありません');
  }
  try {
    const db = getFirestore();
    const snap = await db
      .collection('closeMeetings')
      .where('siteId', '==', siteId)
      .orderBy('createdAt', 'desc')
      .get();
    return { records: snap.docs.map(serializeRecord) };
  } catch (error) {
    logger.error('[closeMeetings] list error:', error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', error?.message || '一覧取得に失敗しました');
  }
};

// ── 1件取得 ──
export const getCloseMeetingCallable = async (request) => {
  const { uid } = requireGrowStaff(request);
  const { recordId } = request.data || {};
  if (!recordId || typeof recordId !== 'string') {
    throw new HttpsError('invalid-argument', 'recordId が必要です');
  }
  try {
    const { doc } = await loadRecordWithAccess(uid, recordId);
    return { record: serializeRecord(doc) };
  } catch (error) {
    logger.error('[closeMeetings] get error:', error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', error?.message || '取得に失敗しました');
  }
};

// ── 新規作成（公開日のみ入力） ──
export const createCloseMeetingCallable = async (request) => {
  const { uid, email } = requireGrowStaff(request);
  const { siteId, launchDate } = request.data || {};
  if (!siteId || typeof siteId !== 'string') {
    throw new HttpsError('invalid-argument', 'siteId が必要です');
  }
  if (!isValidDateStr(launchDate)) {
    throw new HttpsError('invalid-argument', 'launchDate（YYYY-MM-DD）が必要です');
  }
  const hasAccess = await canAccessSite(uid, siteId);
  if (!hasAccess) {
    throw new HttpsError('permission-denied', 'このサイトへのアクセス権がありません');
  }
  try {
    const db = getFirestore();
    const siteDoc = await db.collection('sites').doc(siteId).get();
    if (!siteDoc.exists) {
      throw new HttpsError('not-found', 'サイトが見つかりません');
    }
    const siteData = siteDoc.data();
    const now = FieldValue.serverTimestamp();
    const ref = await db.collection('closeMeetings').add({
      siteId,
      siteName: siteData.siteName || '',
      siteUrl: siteData.siteUrl || '',
      launchDate,
      label: '',
      meetingDate: null,
      status: 'draft',
      comparison: { mode: 'yoy' },
      observationRange: null,
      consultantNotes: {},
      aiSummary: null,
      snapshot: null,
      share: null,
      createdBy: uid,
      createdByEmail: email,
      createdAt: now,
      updatedAt: now,
    });
    const doc = await ref.get();
    logger.info('[closeMeetings] created', { recordId: ref.id, siteId, createdBy: uid });
    return { record: serializeRecord(doc) };
  } catch (error) {
    logger.error('[closeMeetings] create error:', error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', error?.message || '作成に失敗しました');
  }
};

// ── 更新（label / meetingDate / launchDate / comparison / observationRange / consultantNotes） ──
export const updateCloseMeetingCallable = async (request) => {
  const { uid } = requireGrowStaff(request);
  const { recordId, patch } = request.data || {};
  if (!recordId || typeof recordId !== 'string') {
    throw new HttpsError('invalid-argument', 'recordId が必要です');
  }
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
    throw new HttpsError('invalid-argument', 'patch が必要です');
  }
  for (const key of Object.keys(patch)) {
    if (!UPDATABLE_KEYS.includes(key)) {
      throw new HttpsError('invalid-argument', `更新できないフィールドです: ${key}`);
    }
  }
  try {
    const { ref, data } = await loadRecordWithAccess(uid, recordId);
    const update = { updatedAt: FieldValue.serverTimestamp() };

    if ('label' in patch) {
      update.label = typeof patch.label === 'string' ? patch.label.slice(0, 200) : '';
    }
    if ('meetingDate' in patch) {
      if (patch.meetingDate === null || patch.meetingDate === '') {
        update.meetingDate = null;
      } else if (isValidDateStr(patch.meetingDate)) {
        update.meetingDate = patch.meetingDate;
      } else {
        throw new HttpsError('invalid-argument', 'meetingDate（YYYY-MM-DD）が不正です');
      }
    }
    if ('launchDate' in patch) {
      if (!isValidDateStr(patch.launchDate)) {
        throw new HttpsError('invalid-argument', 'launchDate（YYYY-MM-DD）が不正です');
      }
      update.launchDate = patch.launchDate;
      // 公開日変更 → 生成済み AI 総括は古くなるためクリア
      if (patch.launchDate !== data.launchDate) {
        update.aiSummary = null;
      }
    }
    if ('comparison' in patch) {
      const c = patch.comparison;
      if (!c || typeof c !== 'object' || !COMPARISON_MODES.includes(c.mode)) {
        throw new HttpsError('invalid-argument', 'comparison.mode が不正です');
      }
      const out = { mode: c.mode };
      if (c.mode === 'custom') {
        if (!c.range || !isValidDateStr(c.range.from) || !isValidDateStr(c.range.to)) {
          throw new HttpsError('invalid-argument', 'custom 比較期間が不正です');
        }
        out.range = { from: c.range.from, to: c.range.to };
      }
      update.comparison = out;
      // 比較設定変更 → 生成済み AI 総括・スナップショットは古くなるためクリア
      update.aiSummary = null;
    }
    if ('observationRange' in patch) {
      const r = patch.observationRange;
      if (r === null) {
        update.observationRange = null;
      } else if (r && isValidDateStr(r.from) && isValidDateStr(r.to)) {
        update.observationRange = { from: r.from, to: r.to };
      } else {
        throw new HttpsError('invalid-argument', 'observationRange が不正です');
      }
      // 観測期間変更 → 生成済み AI 総括は古くなるためクリア
      update.aiSummary = null;
    }
    if ('consultantNotes' in patch) {
      const n = patch.consultantNotes || {};
      if (typeof n !== 'object' || Array.isArray(n)) {
        throw new HttpsError('invalid-argument', 'consultantNotes が不正です');
      }
      const clip = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '');
      update.consultantNotes = {
        background: clip(n.background, 5000),
        challenge: clip(n.challenge, 5000),
        purpose: clip(n.purpose, 5000),
        qualitativeGoal: clip(n.qualitativeGoal, 5000),
        quantitativeGoal: clip(n.quantitativeGoal, 5000),
        remarks: clip(n.remarks, 5000),
        measures: Array.isArray(n.measures)
          ? n.measures.filter((m) => typeof m === 'string' && m.trim()).map((m) => m.slice(0, 1000)).slice(0, 50)
          : [],
      };
    }

    await ref.update(update);
    const fresh = await ref.get();
    return { record: serializeRecord(fresh) };
  } catch (error) {
    logger.error('[closeMeetings] update error:', error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', error?.message || '更新に失敗しました');
  }
};

// ── 削除（下書き(draft)のみ。確定済み(finalized)は誤削除防止のため削除不可） ──
export const deleteCloseMeetingCallable = async (request) => {
  const { uid } = requireGrowStaff(request);
  const { recordId } = request.data || {};
  if (!recordId || typeof recordId !== 'string') {
    throw new HttpsError('invalid-argument', 'recordId が必要です');
  }
  try {
    const { ref, data } = await loadRecordWithAccess(uid, recordId);
    if (data.status === 'finalized') {
      throw new HttpsError('failed-precondition', '確定済みの記録は削除できません');
    }
    await ref.delete();
    logger.info('[closeMeetings] deleted', { recordId, siteId: data.siteId, by: uid });
    return { success: true, siteId: data.siteId };
  } catch (error) {
    logger.error('[closeMeetings] delete error:', error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', error?.message || '削除に失敗しました');
  }
};

// ── 共有リンクの発行 / 無効化 / 再発行（finalized 必須。token は22文字 URL-safe、90日で自動失効） ──
const SHARE_LINK_TTL_DAYS = 90;
function genShareToken() {
  return randomBytes(16).toString('base64url'); // 22 文字（URL-safe）
}
function serializeShare(share) {
  if (!share) return null;
  return {
    enabled: !!share.enabled,
    token: share.token || null,
    createdAt: toIso(share.createdAt),
    expiresAt: toIso(share.expiresAt),
  };
}

export const manageCloseMeetingShareLinkCallable = async (request) => {
  const { uid } = requireGrowStaff(request);
  const { recordId, action } = request.data || {};
  if (!['create', 'revoke', 'regenerate'].includes(action)) {
    throw new HttpsError('invalid-argument', 'action は create / revoke / regenerate のいずれかです');
  }
  try {
    const { ref, data } = await loadRecordWithAccess(uid, recordId);
    const cur = data.share || null;

    if (action === 'revoke') {
      const next = { enabled: false, token: cur?.token || null, createdAt: cur?.createdAt || null, expiresAt: cur?.expiresAt || null };
      await ref.update({ share: next, updatedAt: FieldValue.serverTimestamp() });
      return { share: serializeShare(next) };
    }

    // create / regenerate は確定保存(finalized)必須
    if (data.status !== 'finalized') {
      throw new HttpsError('failed-precondition', '共有する前に「確定保存」してください');
    }
    if (action === 'create' && cur?.enabled && cur?.token) {
      // 既に有効なリンクがあればそのまま返す（冪等）
      return { share: serializeShare(cur) };
    }

    const now = Timestamp.now();
    const next = {
      enabled: true,
      token: genShareToken(),
      createdAt: now,
      createdBy: uid,
      expiresAt: Timestamp.fromMillis(now.toMillis() + SHARE_LINK_TTL_DAYS * 86400 * 1000),
    };
    await ref.update({ share: next, updatedAt: FieldValue.serverTimestamp() });
    logger.info('[closeMeetings] share link', { recordId, action, by: uid });
    return { share: serializeShare(next) };
  } catch (error) {
    logger.error('[closeMeetings] share link error:', error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', error?.message || '共有リンクの操作に失敗しました');
  }
};
