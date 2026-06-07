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
const MEETING_TYPES = ['close', 'after'];
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
    // 既存ドキュメントには無いフィールド。クローズMTG #1 としてフォールバック
    meetingType: MEETING_TYPES.includes(d.meetingType) ? d.meetingType : 'close',
    meetingSeq: Number.isFinite(d.meetingSeq) && d.meetingSeq > 0 ? d.meetingSeq : 1,
    parentRecordId: d.parentRecordId || null,
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

/**
 * 同 (siteId, launchDate) 系列に アフターMTG を1件追加する。
 * seq 採番（兄弟の最大 meetingSeq + 1）を runTransaction で原子化し、同時作成時の seq 重複を防ぐ。
 *  - parentRecordId 明示指定があればそれを親に。
 *  - resolveParentFromSeries=true（単独起点アフター）の場合、既存系列があれば
 *    クローズMTG（無ければ系列ルートのアフター）を親に解決し、担当者メモも継承して「一本化」する。
 *    既存系列が無ければ parentRecordId=null（＝この記録が系列ルート）になる。
 */
async function createAfterInSeries(db, opts) {
  const {
    siteId,
    siteName = '',
    siteUrl = '',
    launchDate,
    meetingDate,
    observationRange = null,
    consultantNotes = {},
    parentRecordId = null,
    resolveParentFromSeries = false,
    uid,
    email,
  } = opts;
  const col = db.collection('closeMeetings');
  const newId = await db.runTransaction(async (tx) => {
    // 同系列（siteId + launchDate）の兄弟をトランザクション内で読み取り → seq を原子採番
    const snap = await tx.get(col.where('siteId', '==', siteId).where('launchDate', '==', launchDate));
    const maxSeq = snap.docs.reduce((m, d) => {
      const s = Number(d.data().meetingSeq);
      return Number.isFinite(s) && s > m ? s : m;
    }, 0);
    const nextSeq = (maxSeq || snap.size) + 1;

    let resolvedParentId = parentRecordId || null;
    let notes = consultantNotes || {};
    if (resolveParentFromSeries && snap.size > 0) {
      // 既存系列に合流: クローズMTG > 系列ルートのアフター > 先頭 の順で親を解決
      const closeDoc = snap.docs.find((d) => (d.data().meetingType || 'close') === 'close');
      const rootAfter = snap.docs.find((d) => d.data().meetingType === 'after' && !d.data().parentRecordId);
      const base = closeDoc || rootAfter || snap.docs[0];
      if (!resolvedParentId && base) resolvedParentId = base.id;
      // 担当者メモが空で渡された場合のみ系列の基準記録から継承
      if (base && (!consultantNotes || Object.keys(consultantNotes).length === 0)) {
        notes = base.data().consultantNotes || {};
      }
    }

    const ref = col.doc();
    const now = FieldValue.serverTimestamp();
    tx.set(ref, {
      siteId,
      siteName,
      siteUrl,
      launchDate,
      label: '',
      meetingDate,
      status: 'draft',
      comparison: { mode: 'prevPeriod' }, // アフターMTG の既定は前期間比較
      observationRange: observationRange || null,
      consultantNotes: notes,
      aiSummary: null,
      snapshot: null,
      share: null,
      meetingType: 'after',
      meetingSeq: nextSeq,
      parentRecordId: resolvedParentId,
      createdBy: uid,
      createdByEmail: email,
      createdAt: now,
      updatedAt: now,
    });
    return ref.id;
  });
  const doc = await col.doc(newId).get();
  return serializeRecord(doc);
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

// ── 新規作成 ──
// 2 つのモード:
//   1) 新規リニューアル（クローズMTG）   : { siteId, launchDate }
//   2) アフターMTG（同 launchDate の追加） : { parentRecordId, meetingDate, observationRange? }
export const createCloseMeetingCallable = async (request) => {
  const { uid, email } = requireGrowStaff(request);
  const { siteId, launchDate, parentRecordId, meetingDate, observationRange, meetingType } = request.data || {};
  const db = getFirestore();
  const obs =
    observationRange && isValidDateStr(observationRange.from) && isValidDateStr(observationRange.to)
      ? { from: observationRange.from, to: observationRange.to }
      : null;

  // ── アフターMTG: 既存記録（クローズ/アフターどちらでも可）を起点に同系列へ追加 ──
  if (parentRecordId) {
    if (typeof parentRecordId !== 'string') {
      throw new HttpsError('invalid-argument', 'parentRecordId が不正です');
    }
    if (!isValidDateStr(meetingDate)) {
      throw new HttpsError('invalid-argument', 'meetingDate（YYYY-MM-DD）が必要です');
    }
    try {
      const { data: parentData } = await loadRecordWithAccess(uid, parentRecordId);
      // 系列ルートの親を解決（親がアフターなら、その親 or 親自身がルート）
      const parentType = MEETING_TYPES.includes(parentData.meetingType) ? parentData.meetingType : 'close';
      const rootParentId = parentType === 'close' ? parentRecordId : parentData.parentRecordId || parentRecordId;
      const record = await createAfterInSeries(db, {
        siteId: parentData.siteId,
        siteName: parentData.siteName || '',
        siteUrl: parentData.siteUrl || '',
        launchDate: parentData.launchDate,
        meetingDate,
        observationRange: obs,
        // 担当者メモは作成時にコピー（以降は独立編集）
        consultantNotes: parentData.consultantNotes || {},
        parentRecordId: rootParentId,
        uid,
        email,
      });
      logger.info('[closeMeetings] created (after from record)', {
        recordId: record.id,
        parentRecordId: rootParentId,
        seq: record.meetingSeq,
        createdBy: uid,
      });
      return { record };
    } catch (error) {
      logger.error('[closeMeetings] create after error:', error);
      if (error instanceof HttpsError) throw error;
      throw new HttpsError('internal', error?.message || '作成に失敗しました');
    }
  }

  // ── アフターMTG: 単独起点（クローズMTG なしでアフターから開始） ──
  //    同 (siteId, launchDate) に既存系列があれば、その系列へ合流（一本化）する
  if (meetingType === 'after') {
    if (!siteId || typeof siteId !== 'string') {
      throw new HttpsError('invalid-argument', 'siteId が必要です');
    }
    if (!isValidDateStr(launchDate)) {
      throw new HttpsError('invalid-argument', 'launchDate（YYYY-MM-DD）が必要です');
    }
    if (!isValidDateStr(meetingDate)) {
      throw new HttpsError('invalid-argument', 'meetingDate（YYYY-MM-DD）が必要です');
    }
    const hasAccess = await canAccessSite(uid, siteId);
    if (!hasAccess) {
      throw new HttpsError('permission-denied', 'このサイトへのアクセス権がありません');
    }
    try {
      const siteDoc = await db.collection('sites').doc(siteId).get();
      if (!siteDoc.exists) {
        throw new HttpsError('not-found', 'サイトが見つかりません');
      }
      const siteData = siteDoc.data();
      const record = await createAfterInSeries(db, {
        siteId,
        siteName: siteData.siteName || '',
        siteUrl: siteData.siteUrl || '',
        launchDate,
        meetingDate,
        observationRange: obs,
        consultantNotes: {},
        resolveParentFromSeries: true,
        uid,
        email,
      });
      logger.info('[closeMeetings] created (after standalone)', {
        recordId: record.id,
        siteId,
        launchDate,
        seq: record.meetingSeq,
        createdBy: uid,
      });
      return { record };
    } catch (error) {
      logger.error('[closeMeetings] create standalone after error:', error);
      if (error instanceof HttpsError) throw error;
      throw new HttpsError('internal', error?.message || '作成に失敗しました');
    }
  }

  // ── 新規リニューアル（クローズMTG）作成 ──
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
      meetingType: 'close',
      meetingSeq: 1,
      parentRecordId: null,
      createdBy: uid,
      createdByEmail: email,
      createdAt: now,
      updatedAt: now,
    });
    const doc = await ref.get();
    logger.info('[closeMeetings] created (close)', { recordId: ref.id, siteId, createdBy: uid });
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
      const meetingType = MEETING_TYPES.includes(data.meetingType) ? data.meetingType : 'close';
      // 公開日を編集できるのは系列の起点（クローズMTG または parentRecordId を持たない最初のアフターMTG）のみ。
      // 系列内の子アフターMTG は起点から同期されるため個別編集を禁止。
      const isSeriesRoot = meetingType === 'close' || !data.parentRecordId;
      if (!isSeriesRoot) {
        throw new HttpsError(
          'failed-precondition',
          'このアフターMTG では公開日を編集できません。系列の起点（クローズMTG または最初のアフターMTG）から編集してください'
        );
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

    // 親（クローズMTG）の launchDate 変更時は、同 siteId の旧 launchDate に紐づく
    // アフターMTG（parentRecordId == this.id）の launchDate も新値に同期し、AI 総括をクリア。
    if ('launchDate' in update && update.launchDate !== data.launchDate) {
      const db = getFirestore();
      const childrenSnap = await db
        .collection('closeMeetings')
        .where('siteId', '==', data.siteId)
        .where('parentRecordId', '==', recordId)
        .get();
      if (!childrenSnap.empty) {
        const batch = db.batch();
        const ts = FieldValue.serverTimestamp();
        childrenSnap.docs.forEach((d) => {
          batch.update(d.ref, { launchDate: update.launchDate, aiSummary: null, updatedAt: ts });
        });
        await batch.commit();
        logger.info('[closeMeetings] cascaded launchDate to children', {
          parentRecordId: recordId,
          children: childrenSnap.size,
        });
      }
    }

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
    // この記録を親とするアフターMTG が紐付いていれば誤削除を防ぐためブロック（クローズ/アフター系列ルート共通）
    const db = getFirestore();
    const childrenSnap = await db
      .collection('closeMeetings')
      .where('siteId', '==', data.siteId)
      .where('parentRecordId', '==', recordId)
      .limit(1)
      .get();
    if (!childrenSnap.empty) {
      throw new HttpsError(
        'failed-precondition',
        'この記録にはアフターMTG が紐付いています。先にアフターMTG を削除してください'
      );
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
