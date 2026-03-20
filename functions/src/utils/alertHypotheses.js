import { FieldValue } from 'firebase-admin/firestore';

const FALLBACK_HYPOTHESIS = { text: '仮説を取得できませんでした', source: 'ai' };

/**
 * アラート用の仮説をAIで生成し、Firestoreのアラートドキュメントを更新する
 * @param {FirebaseFirestore.Firestore} db
 * @param {string} siteId
 * @param {string} alertId
 * @param {object} alert - message, metricLabel, changePercent, periodCurrent など
 * @param {string} siteName
 */
export async function generateAlertHypotheses(db, siteId, alertId, alert, siteName) {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    await updateAlertHypotheses(db, siteId, alertId, [FALLBACK_HYPOTHESIS]);
    return;
  }

  const prompt = `あなたはWebサイトのアクセス分析の専門家です。
以下のメトリクス変化について、考えられる原因の仮説を3つ、日本語で答えてください。
各仮説は具体的で、なぜその変動が起きたのかを1〜2文で説明してください。

サイト名: ${siteName || '（不明）'}
メトリクス: ${alert.metricLabel || alert.metricName}
変化: ${alert.changePercent != null ? alert.changePercent.toFixed(1) : ''}%
メッセージ: ${alert.message || ''}
対象期間: ${alert.periodCurrent || ''}

回答は「1. 〇〇」「2. 〇〇」「3. 〇〇」の形式で3つだけ出力してください。番号と本文以外は書かないでください。`;

  try {
    const geminiModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.5,
            maxOutputTokens: 600,
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error('[alertHypotheses] Gemini error', response.status, errText);
      await updateAlertHypotheses(db, siteId, alertId, [FALLBACK_HYPOTHESIS]);
      return;
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const hypotheses = parseHypotheses(rawText);
    if (hypotheses.length === 0) {
      await updateAlertHypotheses(db, siteId, alertId, [FALLBACK_HYPOTHESIS]);
      return;
    }
    await updateAlertHypotheses(
      db,
      siteId,
      alertId,
      hypotheses.map((text) => ({ text, source: 'ai' }))
    );
  } catch (err) {
    console.error('[alertHypotheses] Error', err.message);
    await updateAlertHypotheses(db, siteId, alertId, [FALLBACK_HYPOTHESIS]);
  }
}

function parseHypotheses(rawText) {
  const lines = rawText
    .split(/\n/)
    .map((s) => s.replace(/^\s*[\d・\.]\s*/, '').trim())
    .filter((s) => s.length > 0 && s.length <= 200);
  return lines.slice(0, 3);
}

async function updateAlertHypotheses(db, siteId, alertId, hypotheses) {
  const ref = db.collection('sites').doc(siteId).collection('alerts').doc(alertId);
  await ref.update({
    hypotheses,
    hypothesesUpdatedAt: FieldValue.serverTimestamp(),
  });
}

/**
 * 複数アラートをまとめて仮説を一括生成
 * @param {FirebaseFirestore.Firestore} db
 * @param {string} siteId
 * @param {Array<{alertId: string, metricLabel: string, changePercent: number, message: string, periodCurrent: string}>} alerts
 * @param {string} siteName
 * @returns {Promise<Array<{text: string, source: string}>>} 総括仮説の配列
 */
export async function generateBatchedAlertHypotheses(db, siteId, alerts, siteName) {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    return [FALLBACK_HYPOTHESIS];
  }

  const metricsListText = alerts
    .map(a => `- ${a.metricLabel}: ${a.changePercent >= 0 ? '+' : ''}${a.changePercent.toFixed(1)}%（${a.message}）`)
    .join('\n');

  const prompt = `あなたはWebサイトのアクセス分析の専門家です。
以下のサイトで${alerts.length}件の指標に大きな変化がありました。
これらの変化に共通する考えられる原因の仮説を3つ、日本語で答えてください。
各仮説は具体的で、なぜこれらの変動が同時に起きたのかを1〜2文で説明してください。

サイト名: ${siteName || '（不明）'}
対象期間: ${alerts[0]?.periodCurrent || ''}

変化のあった指標:
${metricsListText}

回答は「1. 〇〇」「2. 〇〇」「3. 〇〇」の形式で3つだけ出力してください。番号と本文以外は書かないでください。`;

  try {
    const geminiModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.5,
            maxOutputTokens: 600,
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error('[alertHypotheses] Batched Gemini error', response.status, errText);
      return [FALLBACK_HYPOTHESIS];
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const hypotheses = parseHypotheses(rawText);
    if (hypotheses.length === 0) {
      return [FALLBACK_HYPOTHESIS];
    }

    const result = hypotheses.map((text) => ({ text, source: 'ai' }));

    // 各アラートドキュメントにも仮説を保存
    for (const alert of alerts) {
      await updateAlertHypotheses(db, siteId, alert.alertId, result);
    }

    return result;
  } catch (err) {
    console.error('[alertHypotheses] Batched error', err.message);
    return [FALLBACK_HYPOTHESIS];
  }
}
