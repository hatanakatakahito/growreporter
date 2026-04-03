import { FieldValue } from 'firebase-admin/firestore';

const FALLBACK_ANALYSIS = {
  summary: '自動分析を生成できませんでした。ダッシュボードで詳細をご確認ください。',
  actions: [],
};

/**
 * 数値フォーマット（小数点あり指標はそのまま、整数系はカンマ区切り）
 */
function fmtVal(key, value) {
  if (value == null || isNaN(value)) return '—';
  if (['engagementRate', 'conversionRate', 'bounceRate'].includes(key)) {
    return `${Number(value).toFixed(1)}%`;
  }
  if (key === 'averagePageviews') {
    return Number(value).toFixed(2);
  }
  return Number(value).toLocaleString();
}

/**
 * 複数アラートをまとめてAI分析を生成（状況の整理 + 確認すべきこと）
 * @param {FirebaseFirestore.Firestore} db
 * @param {string} siteId
 * @param {Array} alerts - アラート配列
 * @param {string} siteName
 * @param {string} siteUrl
 * @param {Array} allMetricsSummary - 全指標サマリー（変化あり＋なし）
 * @returns {Promise<{summary: string, actions: string[]}>}
 */
export async function generateBatchedAlertHypotheses(db, siteId, alerts, siteName, siteUrl, allMetricsSummary) {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    saveFallbackToAlerts(db, siteId, alerts);
    return FALLBACK_ANALYSIS;
  }

  // 変化ありの指標
  const alertedMetrics = allMetricsSummary
    .filter(m => m.isAlert)
    .map(m => `- ${m.label}: ${fmtVal(m.key, m.previous)} → ${fmtVal(m.key, m.current)}（${m.changePercent >= 0 ? '+' : ''}${m.changePercent.toFixed(1)}%）`)
    .join('\n');

  // 横ばいの指標
  const stableMetrics = allMetricsSummary
    .filter(m => !m.isAlert)
    .map(m => `- ${m.label}: ${fmtVal(m.key, m.previous)} → ${fmtVal(m.key, m.current)}（${m.changePercent != null ? (m.changePercent >= 0 ? '+' : '') + m.changePercent.toFixed(1) + '%' : '—'}）`)
    .join('\n');

  const prompt = `あなたはWebサイトのアクセス解析コンサルタントです。
以下のサイトで複数の指標に大きな変化がありました。

サイト名: ${siteName || '（不明）'}
サイトURL: ${siteUrl || '（不明）'}
対象期間: ${alerts[0]?.periodCurrent || ''}（vs ${alerts[0]?.periodPrevious || '前週'}）

【大きく変化した指標】
${alertedMetrics}

【横ばいの指標】
${stableMetrics}

以下の2セクションを出力してください。

## 状況の整理
変化した指標と横ばいの指標の関係性から、何が起きているかを3〜4文で簡潔に説明してください。
- 複数指標が連動している場合はその関係性を明示する（例: 「流入減に連動してCV数も減少」）
- 母数が小さい指標（10件未満）の変化は「母数が少ないため誤差の範囲」と注記する
- 横ばいの指標から読み取れること（例: 「サイト内行動は正常」）も述べる
- 推測や仮説ではなく、データから読み取れる事実を述べる

## 確認すべきこと
サイト運営者が次にとるべき具体的な確認アクションを3つ、優先度順で書いてください。
- 各項目は「〜を確認してください」という行動指示にする
- 各項目の下に → で1文の補足説明をつける
- 「可能性があります」のような曖昧な仮説ではなく、具体的な確認手順にする

番号と本文以外の前置き・挨拶は書かないでください。`;

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
            temperature: 0.3,
            maxOutputTokens: 1000,
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error('[alertHypotheses] Gemini error', response.status, errText);
      saveFallbackToAlerts(db, siteId, alerts);
      return FALLBACK_ANALYSIS;
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const parsed = parseAnalysis(rawText);

    if (!parsed.summary) {
      saveFallbackToAlerts(db, siteId, alerts);
      return FALLBACK_ANALYSIS;
    }

    // 各アラートドキュメントにもAI分析結果を保存
    for (const alert of alerts) {
      const ref = db.collection('sites').doc(siteId).collection('alerts').doc(alert.alertId);
      await ref.update({
        aiAnalysis: parsed,
        // 後方互換: hypothesesフィールドも更新
        hypotheses: parsed.actions.map(a => ({ text: a, source: 'ai' })),
        hypothesesUpdatedAt: FieldValue.serverTimestamp(),
      });
    }

    return parsed;
  } catch (err) {
    console.error('[alertHypotheses] Batched error', err.message);
    saveFallbackToAlerts(db, siteId, alerts);
    return FALLBACK_ANALYSIS;
  }
}

/**
 * AIレスポンスを「状況の整理」と「確認すべきこと」にパース
 */
function parseAnalysis(rawText) {
  const result = { summary: '', actions: [] };

  // 「状況の整理」セクションを抽出
  const summaryMatch = rawText.match(/##\s*状況の整理\s*\n([\s\S]*?)(?=##\s*確認すべきこと|$)/);
  if (summaryMatch) {
    result.summary = summaryMatch[1].trim();
  }

  // 「確認すべきこと」セクションを抽出
  const actionsMatch = rawText.match(/##\s*確認すべきこと\s*\n([\s\S]*?)$/);
  if (actionsMatch) {
    const actionsText = actionsMatch[1].trim();
    // 番号付きリスト（1. ... → ...）をパース
    const actionBlocks = actionsText.split(/\n(?=\d+\.\s)/);
    result.actions = actionBlocks
      .map(block => block.replace(/^\d+\.\s*/, '').trim())
      .filter(a => a.length > 0)
      .slice(0, 3);
  }

  return result;
}

/**
 * フォールバック時にアラートドキュメントを更新
 */
async function saveFallbackToAlerts(db, siteId, alerts) {
  for (const alert of alerts) {
    const ref = db.collection('sites').doc(siteId).collection('alerts').doc(alert.alertId);
    await ref.update({
      aiAnalysis: FALLBACK_ANALYSIS,
      hypotheses: [{ text: FALLBACK_ANALYSIS.summary, source: 'ai' }],
      hypothesesUpdatedAt: FieldValue.serverTimestamp(),
    });
  }
}

/**
 * 単一アラート用の仮説生成（後方互換・UI表示用）
 */
export async function generateAlertHypotheses(db, siteId, alertId, alert, siteName) {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const fallback = [{ text: '仮説を取得できませんでした', source: 'ai' }];

  if (!geminiApiKey) {
    await updateAlertHypotheses(db, siteId, alertId, fallback);
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
          generationConfig: { temperature: 0.5, maxOutputTokens: 600 },
        }),
      }
    );

    if (!response.ok) {
      await updateAlertHypotheses(db, siteId, alertId, fallback);
      return;
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const hypotheses = rawText
      .split(/\n/)
      .map(s => s.replace(/^\s*[\d・\.]\s*/, '').trim())
      .filter(s => s.length > 0 && s.length <= 200)
      .slice(0, 3);

    if (hypotheses.length === 0) {
      await updateAlertHypotheses(db, siteId, alertId, fallback);
      return;
    }
    await updateAlertHypotheses(db, siteId, alertId, hypotheses.map(text => ({ text, source: 'ai' })));
  } catch (err) {
    console.error('[alertHypotheses] Error', err.message);
    await updateAlertHypotheses(db, siteId, alertId, fallback);
  }
}

async function updateAlertHypotheses(db, siteId, alertId, hypotheses) {
  const ref = db.collection('sites').doc(siteId).collection('alerts').doc(alertId);
  await ref.update({
    hypotheses,
    hypothesesUpdatedAt: FieldValue.serverTimestamp(),
  });
}

/**
 * 週次/月次レポート用のAI考察を生成
 * @param {string} reportType - 'weekly' | 'monthly'
 * @param {string} siteName
 * @param {object} metrics - 当期メトリクス
 * @param {object} previousMetrics - 前期メトリクス
 * @param {string} periodLabel - 例: '2026-03-01 〜 2026-03-31'
 * @returns {Promise<{summary: string, actions: string[]}>}
 */
export async function generateReportAnalysis(reportType, siteName, metrics, previousMetrics, periodLabel) {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) return { summary: '', actions: [] };

  const periodName = reportType === 'weekly' ? '今週' : '今月';
  const prevName = reportType === 'weekly' ? '前週' : '前月';

  const fmt = (v) => v == null || isNaN(v) ? '—' : Number(v).toLocaleString();
  const pct = (cur, prev) => {
    if (!prev || prev === 0) return '—';
    const change = ((cur - prev) / prev) * 100;
    return `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`;
  };

  const metricsText = [
    `セッション数: ${fmt(metrics.sessions)}（${prevName}比 ${pct(metrics.sessions, previousMetrics.sessions)}）`,
    `ユーザー数: ${fmt(metrics.totalUsers || metrics.users)}（${prevName}比 ${pct(metrics.totalUsers || metrics.users, previousMetrics.totalUsers || previousMetrics.users)}）`,
    `表示回数: ${fmt(metrics.screenPageViews || metrics.pageviews)}（${prevName}比 ${pct(metrics.screenPageViews || metrics.pageviews, previousMetrics.screenPageViews || previousMetrics.pageviews)}）`,
    `エンゲージメント率: ${metrics.engagementRate != null ? (metrics.engagementRate * 100).toFixed(1) + '%' : '—'}（${prevName}比 ${pct(metrics.engagementRate, previousMetrics.engagementRate)}）`,
    `コンバージョン数: ${fmt(metrics.conversions)}（${prevName}比 ${pct(metrics.conversions, previousMetrics.conversions)}）`,
    `直帰率: ${metrics.bounceRate != null ? (metrics.bounceRate * 100).toFixed(1) + '%' : '—'}（${prevName}比 ${pct(metrics.bounceRate, previousMetrics.bounceRate)}）`,
  ].join('\n');

  const prompt = `あなたはWebサイトのアクセス解析コンサルタントです。
以下のサイトの${periodName}のアクセスデータを分析してください。

サイト名: ${siteName || '（不明）'}
対象期間: ${periodLabel}

【主要指標】
${metricsText}

以下の2セクションを出力してください。マークダウン記法は一切使わないでください。

## 状況の整理
${periodName}のデータを3〜4文で簡潔にまとめてください。
- 前期比で目立つ変化とその意味を述べる
- 良い傾向と悪い傾向の両方に触れる
- 推測ではなくデータから読み取れる事実を述べる

## 確認すべきこと
サイト運営者が次にとるべき具体的な確認アクションを3つ、優先度順で書いてください。
- 各項目は「〜を確認してください」という行動指示にする
- 各項目の下に → で1文の補足説明をつける
- 番号と本文のみ。前置き・挨拶・マークダウン記法は書かない`;

  try {
    const geminiModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 800 },
        }),
      }
    );

    if (!response.ok) {
      console.error('[generateReportAnalysis] Gemini error', response.status);
      return { summary: '', actions: [] };
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return parseReportAnalysis(rawText);
  } catch (err) {
    console.error('[generateReportAnalysis] Error', err.message);
    return { summary: '', actions: [] };
  }
}

/**
 * レポートAIレスポンスをパース
 */
function parseReportAnalysis(rawText) {
  const result = { summary: '', actions: [] };

  // マークダウン記法を除去
  const clean = rawText
    .replace(/#{1,6}\s*/g, '')
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  const summaryMatch = clean.match(/(?:■|##)?\s*状況の整理\s*\n([\s\S]*?)(?=(?:■|##)?\s*確認すべきこと|$)/);
  if (summaryMatch) {
    result.summary = summaryMatch[1].trim();
  }

  const actionsMatch = clean.match(/(?:■|##)?\s*確認すべきこと\s*\n([\s\S]*?)$/);
  if (actionsMatch) {
    const actionsText = actionsMatch[1].trim();
    const actionBlocks = actionsText.split(/\n(?=\d+[\.\)]\s)/);
    result.actions = actionBlocks
      .map(block => block.replace(/^\d+[\.\)]\s*/, '').trim())
      .filter(a => a.length > 0)
      .slice(0, 3);
  }

  return result;
}
