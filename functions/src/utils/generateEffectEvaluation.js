/**
 * 改善効果AI評価生成ユーティリティ
 * Gemini APIを呼び出してBefore/After指標に基づくAI考察を生成する
 */
import { getEffectEvaluationPrompt } from '../prompts/templates.js';

/**
 * 改善効果のAI評価を生成
 * @param {object} params
 * @param {object} params.item - 改善タスクドキュメント
 * @param {object} params.before - Beforeスナップショット
 * @param {object} params.after - Afterスナップショット
 * @param {object} params.changes - 変化率
 * @param {number} params.overallScore - 総合スコア
 * @param {string} params.category - カテゴリ
 * @param {boolean} params.hasConcurrentTasks - 同一ページ・同時期の他タスクあり
 * @returns {Promise<object|null>} aiEvaluation or null on failure
 */
export async function generateEffectEvaluation({
  item, before, after, changes, overallScore, category, hasConcurrentTasks = false,
}) {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    console.warn('[generateEffectEvaluation] GEMINI_API_KEY not configured, skipping AI evaluation');
    return null;
  }

  try {
    const prompt = getEffectEvaluationPrompt({
      title: item.title || '',
      description: item.description || '',
      expectedImpact: item.expectedImpact || '',
      category,
      targetPageUrl: item.targetPageUrl || null,
      before,
      after,
      changes,
      overallScore,
      hasConcurrentTasks,
    });

    const geminiModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';
    console.log(`[generateEffectEvaluation] Calling Gemini (${geminiModel}) for item: ${item.id}`);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }],
          }],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 1500,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[generateEffectEvaluation] Gemini API error:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!rawText.trim()) {
      console.warn('[generateEffectEvaluation] Empty response from Gemini');
      return null;
    }

    // JSONを抽出（```json ... ``` のフェンス対応）
    const jsonMatch = rawText.match(/```json\s*([\s\S]*?)```/) || rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('[generateEffectEvaluation] Failed to parse JSON from response:', rawText.substring(0, 300));
      return null;
    }

    const jsonStr = jsonMatch[1] || jsonMatch[0];
    const parsed = JSON.parse(jsonStr);

    // バリデーション
    const validLevels = ['exceeded', 'met', 'partial', 'not_met'];
    if (!validLevels.includes(parsed.achievementLevel)) {
      parsed.achievementLevel = overallScore >= 30 ? 'exceeded'
        : overallScore >= 10 ? 'met'
        : overallScore >= -5 ? 'partial'
        : 'not_met';
    }

    const aiEvaluation = {
      achievementLevel: parsed.achievementLevel,
      summary: (parsed.summary || '').substring(0, 500),
      analysis: (parsed.analysis || '').substring(0, 1500),
      nextActions: Array.isArray(parsed.nextActions) ? parsed.nextActions.slice(0, 5) : [],
      generatedAt: new Date().toISOString(),
    };

    console.log(`[generateEffectEvaluation] Success: achievementLevel=${aiEvaluation.achievementLevel}`);
    return aiEvaluation;

  } catch (err) {
    console.error('[generateEffectEvaluation] Error:', err.message);
    return null;
  }
}

/**
 * 同一ページ・同時期に他の完了タスクがあるか確認
 * @param {object} db - Firestore instance
 * @param {string} siteId
 * @param {object} item - 現在のタスク
 * @returns {Promise<boolean>}
 */
export async function checkConcurrentTasks(db, siteId, item) {
  if (!item.targetPageUrl) return false;

  try {
    const snap = await db.collection('sites').doc(siteId).collection('improvements')
      .where('status', '==', 'completed')
      .where('targetPageUrl', '==', item.targetPageUrl)
      .limit(5)
      .get();

    // 自分以外に同じページの完了タスクがあるか
    const others = snap.docs.filter(doc => doc.id !== item.id);
    if (others.length === 0) return false;

    // effectiveDate が近い（±30日以内）タスクがあるか
    const itemDate = new Date(item.effectiveDate).getTime();
    const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

    return others.some(doc => {
      const otherDate = doc.data().effectiveDate;
      if (!otherDate) return false;
      return Math.abs(new Date(otherDate).getTime() - itemDate) <= THIRTY_DAYS;
    });
  } catch (err) {
    console.warn('[checkConcurrentTasks] Error:', err.message);
    return false;
  }
}
