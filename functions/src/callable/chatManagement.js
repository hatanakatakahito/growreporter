/**
 * チャット管理 Callable Functions
 * - getChatSessions: 会話一覧取得
 * - deleteChatSession: 完全削除
 * - archiveChatSession: アーカイブ/復元
 * - endChatSession: セッション終了
 * - searchChatSessions: 全文検索
 * - addImprovementFromChat: 改善タスク追加
 * - updateChatSession: タイトル・共有設定の更新
 * - getChatMessages: セッションのメッセージ取得
 */
import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { logger } from 'firebase-functions/v2';
import { canEditSite } from '../utils/permissionHelper.js';

/**
 * チャット会話一覧を取得
 */
export async function getChatSessionsCallable(req) {
  if (!req.auth) throw new HttpsError('unauthenticated', 'ユーザー認証が必要です');

  const { siteId, includeArchived = false } = req.data;
  if (!siteId) throw new HttpsError('invalid-argument', 'siteIdが必要です');

  const canEdit = await canEditSite(req.auth.uid, siteId);
  if (!canEdit) throw new HttpsError('permission-denied', 'アクセス権がありません');

  const db = getFirestore();
  let q = db.collection('sites').doc(siteId).collection('chatSessions')
    .orderBy('updatedAt', 'desc')
    .limit(50);

  const snap = await q.get();
  const sessions = snap.docs
    .map(d => {
      const data = d.data();
      return {
        id: d.id,
        title: data.title,
        userId: data.userId,
        isShared: data.isShared,
        isArchived: data.isArchived || false,
        isEnded: data.isEnded || false,
        turnCount: data.turnCount || 0,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
        lastMessage: data.messages?.length > 0
          ? data.messages[data.messages.length - 1].text?.substring(0, 100) : '',
      };
    })
    .filter(s => {
      // 自分の会話 or 共有されている会話のみ
      const isOwner = s.userId === req.auth.uid;
      const isAccessible = isOwner || s.isShared;
      if (!isAccessible) return false;
      if (!includeArchived && s.isArchived) return false;
      return true;
    });

  return { success: true, sessions };
}

/**
 * チャットセッションを完全削除
 */
export async function deleteChatSessionCallable(req) {
  if (!req.auth) throw new HttpsError('unauthenticated', 'ユーザー認証が必要です');

  const { siteId, sessionId } = req.data;
  if (!siteId || !sessionId) throw new HttpsError('invalid-argument', 'siteId, sessionIdが必要です');

  const canEdit = await canEditSite(req.auth.uid, siteId);
  if (!canEdit) throw new HttpsError('permission-denied', 'アクセス権がありません');

  const db = getFirestore();
  const sessionRef = db.collection('sites').doc(siteId).collection('chatSessions').doc(sessionId);
  const sessionDoc = await sessionRef.get();

  if (!sessionDoc.exists) throw new HttpsError('not-found', 'セッションが見つかりません');
  if (sessionDoc.data().userId !== req.auth.uid) throw new HttpsError('permission-denied', '削除権限がありません');

  // Cloud Storageの添付ファイルも削除
  try {
    const bucket = getStorage().bucket();
    const [files] = await bucket.getFiles({ prefix: `chat-attachments/${siteId}/${sessionId}/` });
    for (const file of files) {
      await file.delete();
    }
  } catch (e) {
    logger.warn('[chatManagement] 添付ファイル削除エラー:', e.message);
  }

  await sessionRef.delete();
  return { success: true };
}

/**
 * アーカイブ/復元
 */
export async function archiveChatSessionCallable(req) {
  if (!req.auth) throw new HttpsError('unauthenticated', 'ユーザー認証が必要です');

  const { siteId, sessionId, archive = true } = req.data;
  if (!siteId || !sessionId) throw new HttpsError('invalid-argument', 'siteId, sessionIdが必要です');

  const db = getFirestore();
  const sessionRef = db.collection('sites').doc(siteId).collection('chatSessions').doc(sessionId);
  const sessionDoc = await sessionRef.get();

  if (!sessionDoc.exists) throw new HttpsError('not-found', 'セッションが見つかりません');
  if (sessionDoc.data().userId !== req.auth.uid) throw new HttpsError('permission-denied', '権限がありません');

  await sessionRef.update({
    isArchived: archive,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { success: true };
}

/**
 * セッション終了
 */
export async function endChatSessionCallable(req) {
  if (!req.auth) throw new HttpsError('unauthenticated', 'ユーザー認証が必要です');

  const { siteId, sessionId } = req.data;
  if (!siteId || !sessionId) throw new HttpsError('invalid-argument', 'siteId, sessionIdが必要です');

  const db = getFirestore();
  const sessionRef = db.collection('sites').doc(siteId).collection('chatSessions').doc(sessionId);
  const sessionDoc = await sessionRef.get();

  if (!sessionDoc.exists) throw new HttpsError('not-found', 'セッションが見つかりません');
  if (sessionDoc.data().userId !== req.auth.uid) throw new HttpsError('permission-denied', '権限がありません');

  await sessionRef.update({
    isEnded: true,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { success: true };
}

/**
 * セッションのタイトル・共有設定を更新
 */
export async function updateChatSessionCallable(req) {
  if (!req.auth) throw new HttpsError('unauthenticated', 'ユーザー認証が必要です');

  const { siteId, sessionId, title, isShared } = req.data;
  if (!siteId || !sessionId) throw new HttpsError('invalid-argument', 'siteId, sessionIdが必要です');

  const db = getFirestore();
  const sessionRef = db.collection('sites').doc(siteId).collection('chatSessions').doc(sessionId);
  const sessionDoc = await sessionRef.get();

  if (!sessionDoc.exists) throw new HttpsError('not-found', 'セッションが見つかりません');
  if (sessionDoc.data().userId !== req.auth.uid) throw new HttpsError('permission-denied', '権限がありません');

  const updateData = { updatedAt: FieldValue.serverTimestamp() };
  if (title !== undefined) updateData.title = title;
  if (isShared !== undefined) updateData.isShared = isShared;

  await sessionRef.update(updateData);
  return { success: true };
}

/**
 * 全文検索（タイトル + メッセージ内容）
 */
export async function searchChatSessionsCallable(req) {
  if (!req.auth) throw new HttpsError('unauthenticated', 'ユーザー認証が必要です');

  const { siteId, query } = req.data;
  if (!siteId || !query?.trim()) throw new HttpsError('invalid-argument', 'siteIdとqueryが必要です');

  const canEdit = await canEditSite(req.auth.uid, siteId);
  if (!canEdit) throw new HttpsError('permission-denied', 'アクセス権がありません');

  const db = getFirestore();
  const snap = await db.collection('sites').doc(siteId).collection('chatSessions')
    .orderBy('updatedAt', 'desc')
    .limit(100)
    .get();

  const searchLower = query.toLowerCase();
  const results = snap.docs
    .map(d => {
      const data = d.data();
      // アクセス権チェック
      if (data.userId !== req.auth.uid && !data.isShared) return null;

      // タイトル検索
      const titleMatch = (data.title || '').toLowerCase().includes(searchLower);

      // メッセージ内容検索
      const messageMatch = (data.messages || []).some(m =>
        (m.text || '').toLowerCase().includes(searchLower)
      );

      if (!titleMatch && !messageMatch) return null;

      return {
        id: d.id,
        title: data.title,
        isShared: data.isShared,
        isArchived: data.isArchived || false,
        turnCount: data.turnCount || 0,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
        matchType: titleMatch ? 'title' : 'message',
      };
    })
    .filter(Boolean);

  return { success: true, results };
}

/**
 * AIの改善提案をimprovement タスクに追加
 */
export async function addImprovementFromChatCallable(req) {
  if (!req.auth) throw new HttpsError('unauthenticated', 'ユーザー認証が必要です');

  const { siteId, improvement } = req.data;
  if (!siteId || !improvement) throw new HttpsError('invalid-argument', 'siteIdとimprovementが必要です');

  const canEdit = await canEditSite(req.auth.uid, siteId);
  if (!canEdit) throw new HttpsError('permission-denied', 'アクセス権がありません');

  const db = getFirestore();

  // ユーザーメール取得
  const userDoc = await db.collection('users').doc(req.auth.uid).get();
  const userEmail = userDoc.exists ? (userDoc.data().email || 'unknown') : 'unknown';

  const ref = db.collection('sites').doc(siteId).collection('improvements').doc();
  await ref.set({
    title: improvement.title || 'AIチャットからの提案',
    description: improvement.description || '',
    status: 'draft',
    expectedImpact: improvement.expectedImpact || '',
    targetPageUrl: improvement.targetPageUrl || '',
    category: improvement.category || 'other',
    priority: improvement.priority || 'medium',
    order: Date.now(),
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    createdBy: userEmail,
    source: 'ai_chat',
    autoGenerated: true,
    triggeredBy: 'chat',
  });

  return { success: true, improvementId: ref.id };
}

/**
 * セッションのメッセージ取得
 */
export async function getChatMessagesCallable(req) {
  if (!req.auth) throw new HttpsError('unauthenticated', 'ユーザー認証が必要です');

  const { siteId, sessionId } = req.data;
  if (!siteId || !sessionId) throw new HttpsError('invalid-argument', 'siteIdとsessionIdが必要です');

  const canEdit = await canEditSite(req.auth.uid, siteId);
  if (!canEdit) throw new HttpsError('permission-denied', 'アクセス権がありません');

  const db = getFirestore();
  const sessionRef = db.collection('sites').doc(siteId).collection('chatSessions').doc(sessionId);
  const sessionDoc = await sessionRef.get();

  if (!sessionDoc.exists) throw new HttpsError('not-found', 'セッションが見つかりません');

  const data = sessionDoc.data();

  // 自分の会話 or 共有されている会話のみ
  if (data.userId !== req.auth.uid && !data.isShared) {
    throw new HttpsError('permission-denied', 'このチャットセッションへのアクセス権がありません');
  }

  return { success: true, messages: data.messages || [] };
}
