import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { canAccessSite } from '../utils/permissionHelper.js';
import { getCloseMeetingPrompt } from '../prompts/templates.js';
import {
  BUSINESS_MODEL_LABELS,
  SITE_ROLE_LABELS,
  INDUSTRY_MAJOR_LABELS,
  labelFor,
  formatIndustry,
} from '../constants/siteOptionsV2.js';

/**
 * クローズミーティング: AI 総括の生成 / 確定保存（GrowGroup 社内用）
 *  - generateCloseMeetingSummaryCallable: Gemini で公開前後の総括を生成して返す（保存はしない）
 *  - finalizeCloseMeetingReportCallable: フロントが組み立てた snapshot ＋ aiSummary を記録に焼き込み status:'finalized'
 *
 * 多層防御: 呼び出し元が @grow-group.jp ＋ canAccessSite。GrowGroup 社内向けのため
 * プラン枠（checkCanGenerate）の対象外。
 */

const GROW_STAFF_EMAIL_RE = /@grow-group\.jp$/i;

function requireGrowStaff(request) {
  const uid = request.auth?.uid;
  const email = request.auth?.token?.email;
  if (!uid) throw new HttpsError('unauthenticated', 'ログインが必要です');
  if (!email || !GROW_STAFF_EMAIL_RE.test(email)) {
    throw new HttpsError('permission-denied', 'この機能は GrowGroup 社内スタッフのみ利用できます');
  }
  return { uid, email };
}

async function loadRecordWithAccess(uid, recordId) {
  if (!recordId || typeof recordId !== 'string') {
    throw new HttpsError('invalid-argument', 'recordId が必要です');
  }
  const db = getFirestore();
  const ref = db.collection('closeMeetings').doc(recordId);
  const doc = await ref.get();
  if (!doc.exists) throw new HttpsError('not-found', '記録が見つかりません');
  const data = doc.data();
  const hasAccess = await canAccessSite(uid, data.siteId);
  if (!hasAccess) throw new HttpsError('permission-denied', 'このサイトへのアクセス権がありません');
  return { db, ref, data };
}

function buildSiteContext(siteData) {
  if (!siteData) return {};
  return {
    industryText: formatIndustry(siteData.industryMajor, siteData.industryMinor, '未設定') ||
      labelFor(INDUSTRY_MAJOR_LABELS, siteData.industryMajor, '未設定'),
    siteRoleText: labelFor(SITE_ROLE_LABELS, siteData.siteRole, '未設定'),
    businessModelText: labelFor(BUSINESS_MODEL_LABELS, siteData.businessModel, '未設定'),
  };
}

// 文字列の軽いサニタイズ（長さ制限）
const clip = (v, max = 4000) => (typeof v === 'string' ? v.slice(0, max) : '');
const clipArr = (a, max = 30, eachMax = 600) =>
  Array.isArray(a) ? a.filter((x) => typeof x === 'string').map((x) => x.slice(0, eachMax)).slice(0, max) : [];

// ── AI 総括の生成 ──
export const generateCloseMeetingSummaryCallable = async (request) => {
  const { uid } = requireGrowStaff(request);
  const { recordId, payload } = request.data || {};
  if (!payload || typeof payload !== 'object') {
    throw new HttpsError('invalid-argument', 'payload が必要です');
  }

  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    throw new HttpsError('failed-precondition', 'AI 機能が構成されていません（GEMINI_API_KEY 未設定）');
  }

  try {
    const { data: record } = await loadRecordWithAccess(uid, recordId);
    const db = getFirestore();
    const siteDoc = await db.collection('sites').doc(record.siteId).get();
    const siteContext = buildSiteContext(siteDoc.exists ? siteDoc.data() : null);

    const prompt = getCloseMeetingPrompt({
      siteName: record.siteName || (siteDoc.exists ? siteDoc.data().siteName : '') || '未設定',
      siteUrl: record.siteUrl || (siteDoc.exists ? siteDoc.data().siteUrl : '') || '未設定',
      siteContext,
      launchDate: record.launchDate || '',
      observationRange: payload.observationRange || {},
      comparisonRange: payload.comparisonRange || null,
      comparisonModeLabel: payload.comparisonModeLabel || '公開前',
      kpiLines: Array.isArray(payload.kpiLines) ? payload.kpiLines.slice(0, 20) : [],
      breakdownBlocks: Array.isArray(payload.breakdownBlocks) ? payload.breakdownBlocks.slice(0, 8) : [],
      kpiActualsLines: Array.isArray(payload.kpiActualsLines) ? payload.kpiActualsLines.slice(0, 20) : null,
      // 担当者メモは記録（サーバ）側の値を信頼
      consultantNotes: record.consultantNotes || {},
    });

    const geminiModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';
    logger.info('[generateCloseMeetingSummary] calling Gemini', { recordId, model: geminiModel });

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.5, maxOutputTokens: 2048 },
        }),
      }
    );
    if (!response.ok) {
      const errText = await response.text();
      logger.error('[generateCloseMeetingSummary] Gemini error', { status: response.status, errText: errText.slice(0, 500) });
      throw new HttpsError('internal', `AI 生成に失敗しました (Gemini ${response.status})`);
    }
    const json = await response.json();
    const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (!rawText.trim()) {
      throw new HttpsError('internal', 'AI から有効な応答が得られませんでした');
    }
    const jsonMatch = rawText.match(/```json\s*([\s\S]*?)```/) || rawText.match(/\{[\s\S]*\}/);
    let parsed = null;
    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);
      } catch {
        parsed = null;
      }
    }
    if (!parsed || typeof parsed !== 'object') {
      // JSON でなければそのまま summary として返す
      parsed = { summary: rawText.trim().slice(0, 2000), goodPoints: [], nextActions: [] };
    }

    const aiSummary = {
      summary: clip(parsed.summary, 2000),
      goodPoints: clipArr(parsed.goodPoints, 8, 400),
      nextActions: clipArr(parsed.nextActions, 8, 400),
      generatedAt: new Date().toISOString(),
    };
    logger.info('[generateCloseMeetingSummary] success', { recordId });
    return { aiSummary };
  } catch (error) {
    logger.error('[generateCloseMeetingSummary] error:', error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', error?.message || 'AI 生成に失敗しました');
  }
};

// ── 確定保存（snapshot ＋ aiSummary を記録に焼き込み） ──
export const finalizeCloseMeetingReportCallable = async (request) => {
  const { uid } = requireGrowStaff(request);
  const { recordId, snapshot, aiSummary } = request.data || {};
  if (!snapshot || typeof snapshot !== 'object') {
    throw new HttpsError('invalid-argument', 'snapshot が必要です');
  }
  try {
    const { ref } = await loadRecordWithAccess(uid, recordId);

    // snapshot のサイズチェック（Firestore 1MiB 制限への保険）
    let approxBytes = 0;
    try {
      approxBytes = Buffer.byteLength(JSON.stringify(snapshot), 'utf8');
    } catch {
      approxBytes = 0;
    }
    if (approxBytes > 900 * 1024) {
      throw new HttpsError('invalid-argument', 'スナップショットが大きすぎます。観測期間やページ件数を絞ってください');
    }

    const update = {
      snapshot: { ...snapshot, generatedAt: new Date().toISOString() },
      status: 'finalized',
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (aiSummary && typeof aiSummary === 'object') {
      update.aiSummary = {
        summary: clip(aiSummary.summary, 2000),
        goodPoints: clipArr(aiSummary.goodPoints, 8, 400),
        nextActions: clipArr(aiSummary.nextActions, 8, 400),
        generatedAt: typeof aiSummary.generatedAt === 'string' ? aiSummary.generatedAt : new Date().toISOString(),
      };
    }

    await ref.update(update);
    logger.info('[finalizeCloseMeetingReport] finalized', { recordId, approxBytes, by: uid });
    return { success: true, recordId };
  } catch (error) {
    logger.error('[finalizeCloseMeetingReport] error:', error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', error?.message || '確定保存に失敗しました');
  }
};
