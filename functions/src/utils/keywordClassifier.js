/**
 * GSC キーワード AI 分類・クラスタリング・改善案生成ヘルパー
 *
 * Gemini API を使い:
 *   1. classifyKeywordsByLayer — 5 層分類（指名/純顕在/顕在/潜在/無関係）
 *   2. clusterKeywords         — 意味的クラスタリング + AI 命名
 *   3. generateTitleSuggestions — KW 単位の Title/Description 改善案 3 パターン
 *
 * 既存の generateStoryCommentsWithGemini と同じパターンで実装。
 * すべて failure 時は null を返してフォールバック可能にする。
 */

const FUNNEL_LAYERS = ['branded', 'pureIntent', 'intent', 'latent', 'noise'];
const LAYER_LABELS_JA = {
  branded: '指名',
  pureIntent: '純顕在',
  intent: '顕在',
  latent: '潜在',
  noise: '無関係',
};

/**
 * 内部ヘルパー: Gemini を呼んで JSON を返す
 */
async function callGeminiJSON(prompt, { temperature = 0.3, maxOutputTokens = 4096 } = {}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  let response;
  try {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature,
            maxOutputTokens,
            responseMimeType: 'application/json',
          },
        }),
      }
    );
  } catch (e) {
    console.warn('[keywordClassifier] Gemini fetch failed:', e.message);
    return null;
  }

  if (!response.ok) {
    const errText = await response.text();
    console.warn(`[keywordClassifier] Gemini error ${response.status}:`, errText.slice(0, 200));
    return null;
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    // テキスト中の最初の JSON ブロック（配列 or オブジェクト）を抽出
    const arrMatch = text.match(/\[[\s\S]*\]/);
    if (arrMatch) {
      try { return JSON.parse(arrMatch[0]); } catch { /* noop */ }
    }
    const objMatch = text.match(/\{[\s\S]*\}/);
    if (objMatch) {
      try { return JSON.parse(objMatch[0]); } catch { /* noop */ }
    }
    return null;
  }
}

function buildSiteContextLine(siteContext) {
  const { siteName, industry, siteType, sitePurpose, brandKeywords, excludeKeywords } = siteContext || {};
  const lines = [];
  if (siteName) lines.push(`サイト名: ${siteName}`);
  if (industry) lines.push(`業種: ${industry}`);
  if (siteType) lines.push(`サイト種別: ${siteType}`);
  if (sitePurpose) lines.push(`サイトの目的: ${sitePurpose}`);
  if (Array.isArray(brandKeywords) && brandKeywords.length) {
    lines.push(`ブランド指名語の候補: ${brandKeywords.slice(0, 20).join(', ')}（これらと類似する KW は branded と判定）`);
  }
  if (Array.isArray(excludeKeywords) && excludeKeywords.length) {
    lines.push(`明示的な除外語: ${excludeKeywords.slice(0, 20).join(', ')}（これらと類似する KW は noise と判定）`);
  }
  return lines.length ? `\n【サイト前提（最優先で考慮）】\n${lines.join('\n')}` : '';
}

/**
 * 5 層分類（指名/純顕在/顕在/潜在/無関係）
 * @param {Array<{query: string}>} keywords - クエリ配列
 * @param {object} siteContext - サイトコンテキスト
 * @returns {Promise<string[] | null>} - 入力と同順の層キー配列 (e.g., ['branded', 'intent', ...])
 */
export async function classifyKeywordsByLayer(keywords, siteContext) {
  if (!keywords?.length) return [];
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  // バッチサイズ 50、5 並列で実行（5547 KW = 111 batch → 約 23 サイクル × 2s = 約 45 秒）
  const BATCH_SIZE = 50;
  const CONCURRENCY = 5;
  const MAX_RETRY = 1;
  const result = new Array(keywords.length).fill(null);
  const ctxLine = buildSiteContextLine(siteContext);

  // 全バッチを事前構築（順序は keywords 配列を保持）
  const batches = [];
  for (let i = 0; i < keywords.length; i += BATCH_SIZE) {
    batches.push({ start: i, items: keywords.slice(i, i + BATCH_SIZE) });
  }

  const promptForBatch = (batch) => {
    // 各 KW に ID（バッチ内ローカル番号）を付与
    const numbered = batch.items.map((k, idx) => `${idx + 1}. ${k.query}`).join('\n');
    return `あなたは Web マーケティングの専門家です。Search Console の流入キーワード ${batch.items.length} 件を、以下の 5 層に分類してください。
${ctxLine}

【分類定義】
- branded（指名）: サイト名・ブランド名・社名・サービス名・ドメイン名・URL など、自社を直接指す検索語。表記ゆれ（カタカナ・英字・半角全角）も同一視する。サイト前提のサイト名・ブランド名と部分一致するものは branded と判定して良い
- pureIntent（純顕在）: すでに購入・問い合わせの意思が強い語（例: 「料金」「見積もり」「申し込み」「価格」「依頼」「相談」「予約」など、行動直結の修飾語を含む）
- intent（顕在）: 自社の主要サービス・商品カテゴリーに関する一般語（例: サービス名 + エリア、業種 + 比較、職種、サービスを示すワード）
- latent（潜在）: 業界の周辺情報・How-to・基礎知識など、まだ顕在化していない学習段階の検索語
- noise（無関係）: サイトの業種・サービス対象と明らかに無関係な検索語（誤流入・偶発的なヒット）。判断に迷った場合は noise ではなく latent / intent を優先

【判定の優先順位】
1) サイト前提のサイト名・ブランド名・社名と一致 or 部分一致 → branded
2) 「料金」「見積もり」「申し込み」「価格」「依頼」「相談」等の購入直結ワードを含む → pureIntent
3) 業種コンテキストに合致するサービス・商品名・職種 → intent
4) サイトのテーマに関連はあるが情報収集段階 → latent
5) 上記いずれにも該当しない明らかに別領域のもの → noise

【入力キーワード（番号付き）】
${numbered}

【出力形式】
必ず以下の純粋な JSON 配列のみを返してください（マークダウン・コードブロック・前置き禁止）。
各要素はオブジェクトで、入力番号 id（1〜${batch.items.length}）と layer を含めること:

[
  {"id": 1, "layer": "branded"},
  {"id": 2, "layer": "pureIntent"},
  {"id": 3, "layer": "intent"}
]

- id は入力番号と必ず一致させる（漏れ・重複なし）
- layer は "branded" / "pureIntent" / "intent" / "latent" / "noise" のいずれか
- 全 ${batch.items.length} 件を必ず分類すること（途中で省略しないこと）`;
  };

  // 1 バッチを処理する非同期関数（リトライ込み）
  const processBatch = async (batch) => {
    const prompt = promptForBatch(batch);
    let parsed = null;
    let lastLength = 0;
    for (let attempt = 0; attempt <= MAX_RETRY; attempt++) {
      parsed = await callGeminiJSON(prompt, { temperature: 0.2, maxOutputTokens: 4096 });
      if (Array.isArray(parsed)) {
        lastLength = parsed.length;
        // 長さが期待値以上 or 期待値の 80% 以上なら採用（ID 照合で穴は許容）
        if (parsed.length >= Math.max(1, Math.floor(batch.items.length * 0.8))) {
          break;
        }
      }
      if (attempt < MAX_RETRY) {
        await new Promise((r) => setTimeout(r, 500 + Math.random() * 500));
      }
    }
    return { start: batch.start, parsed, expectedSize: batch.items.length, lastLength };
  };

  // CONCURRENCY 並列で順次実行
  let processed = 0;
  let totalAssigned = 0;
  let totalMissing = 0;
  for (let i = 0; i < batches.length; i += CONCURRENCY) {
    const chunk = batches.slice(i, i + CONCURRENCY);
    const chunkResults = await Promise.all(chunk.map(processBatch));
    chunkResults.forEach(({ start, parsed, expectedSize, lastLength }) => {
      if (!Array.isArray(parsed)) {
        console.warn(`[classifyKeywordsByLayer] batch start=${start} (size=${expectedSize}) failed completely (parsed=${parsed === null ? 'null' : typeof parsed})`);
        totalMissing += expectedSize;
        return;
      }
      // ID ベースで照合（id は 1-based、配列は 0-based）
      const idToLayer = new Map();
      for (const entry of parsed) {
        if (entry && typeof entry === 'object') {
          const id = Number(entry.id);
          const layer = entry.layer;
          if (Number.isInteger(id) && id >= 1 && id <= expectedSize && FUNNEL_LAYERS.includes(layer)) {
            idToLayer.set(id, layer);
          }
        }
      }
      let assigned = 0;
      for (let j = 0; j < expectedSize; j++) {
        const layer = idToLayer.get(j + 1);
        if (layer) {
          result[start + j] = layer;
          assigned++;
        }
        // 取り出せなかった id は result[start+j] = null のまま → 後段で 'noise' フォールバック
      }
      totalAssigned += assigned;
      totalMissing += expectedSize - assigned;
      if (assigned < expectedSize) {
        console.warn(
          `[classifyKeywordsByLayer] batch start=${start} partial: ${assigned}/${expectedSize} (response length=${lastLength})`
        );
      }
    });
    processed += chunk.length;
    if (processed % 10 === 0 || processed === batches.length) {
      console.log(
        `[classifyKeywordsByLayer] progress: ${processed}/${batches.length} batches, ` +
        `assigned=${totalAssigned}, missing=${totalMissing}`
      );
    }
  }

  return result;
}

/**
 * 意味的クラスタリング + AI 命名
 * 上位 N 件（impressions 降順）に対してクラスタを生成。残りは "uncategorized" 扱い。
 *
 * @param {Array<{query, clicks, impressions}>} keywords - 全 KW（impressions 降順想定）
 * @param {object} siteContext
 * @param {object} options - { topN = 200, targetClusters = 6 }
 * @returns {Promise<{ clusters: Array<{id, name, keywordIndices: number[]}>, kwClusterMap: Object } | null>}
 */
export async function clusterKeywords(keywords, siteContext, options = {}) {
  const { topN = 200, targetClusters = 6 } = options;
  if (!keywords?.length) return { clusters: [], kwClusterMap: {} };
  if (!process.env.GEMINI_API_KEY) return null;

  const target = keywords.slice(0, topN);
  const numbered = target.map((k, i) => `${i + 1}. ${k.query}`).join('\n');
  const ctxLine = buildSiteContextLine(siteContext);

  const prompt = `あなたは Web マーケティングの専門家です。Search Console の流入キーワード ${target.length} 件を、意味的に類似するもの同士でクラスタにまとめ、各クラスタに簡潔な日本語名を付けてください。
${ctxLine}

【ルール】
- クラスタ数は ${targetClusters} 個前後を目安（多すぎず少なすぎず）
- クラスタ名は名詞 + "系"（例: "Web 制作系" "採用サイト系" "指名検索"）など、クライアントへの説明に使えるラベル
- クラスタ間で重複なし（1 KW は必ず 1 クラスタ）
- 関連が薄い KW を無理にどこかに入れない場合は "その他" クラスタに集約
- 各クラスタには代表 KW（最も中心的・包括的な KW）を 1 つ指定する（centerIndex は元の連番 1〜${target.length}）

【入力キーワード】
${numbered}

【出力形式】
必ず以下の純粋な JSON オブジェクトのみを返す（マークダウン・コードブロック・前置き禁止）:
{
  "clusters": [
    { "name": "Web 制作系", "centerIndex": 1, "keywordIndices": [1, 3, 7, 12, ...] },
    { "name": "採用サイト系", "centerIndex": 5, "keywordIndices": [5, 8, 9, ...] }
  ]
}

keywordIndices は 1〜${target.length} の整数（入力番号と一致）。すべての入力 KW を必ずどこかのクラスタに含めること。`;

  const parsed = await callGeminiJSON(prompt, { temperature: 0.4, maxOutputTokens: 8192 });
  if (!parsed || !Array.isArray(parsed.clusters)) return null;

  const clusters = parsed.clusters
    .filter((c) => c?.name && Array.isArray(c.keywordIndices))
    .map((c, i) => ({
      id: `cluster-${i + 1}`,
      name: String(c.name).slice(0, 40),
      centerIndex: Number.isInteger(c.centerIndex) ? c.centerIndex - 1 : c.keywordIndices[0] - 1,
      keywordIndices: c.keywordIndices
        .map((n) => Number(n) - 1)
        .filter((n) => Number.isInteger(n) && n >= 0 && n < target.length),
    }));

  const kwClusterMap = {};
  clusters.forEach((c) => {
    c.keywordIndices.forEach((idx) => {
      // 元の keywords 配列のインデックスを保持（target は keywords.slice(0, topN)）
      const originalIdx = idx;
      kwClusterMap[originalIdx] = c.id;
    });
  });

  return { clusters, kwClusterMap };
}

/**
 * Title / Description 改善案を 3 パターン生成
 *
 * @param {object} kw - { query, position, ctr, impressions }
 * @param {string} currentTitle - 現在の Title（不明なら空文字）
 * @param {string} currentDescription - 現在の Description（不明なら空文字）
 * @param {object} siteContext
 * @returns {Promise<Array<{label, title, description}> | null>}
 */
export async function generateTitleSuggestions(kw, currentTitle, currentDescription, siteContext) {
  if (!process.env.GEMINI_API_KEY) return null;
  const ctxLine = buildSiteContextLine(siteContext);

  const currentBlock = `
【現在の Title】${currentTitle || '(取得できず)'}
【現在の Description】${currentDescription || '(取得できず)'}`;

  const prompt = `あなたは SEO の専門家です。以下のキーワードで流入があるページの Title / Description を、CTR 向上のために 3 パターン改善してください。
${ctxLine}

【対象キーワード】${kw.query}
【現在の状況】表示 ${kw.impressions ?? 0}回 / クリック数 ${kw.clicks ?? 0}回 / CTR ${(kw.ctr * 100).toFixed(1)}% / 順位 ${kw.position?.toFixed(1) ?? '-'}位
${currentBlock}

【ルール】
- 3 パターンそれぞれ異なる訴求軸（例: 数字訴求 / 課題訴求 / 専門性訴求 / ベネフィット訴求 / 独自性訴求 など）
- Title は 30〜35 文字程度
- Description は 80〜120 文字程度
- 検索意図と合致させ、対象 KW を自然に含める
- 過度な誇張・誤認を招く表現を避ける
- 各パターンには 6〜10 文字程度の short label を付ける（例: "数字訴求"）

【出力形式】
必ず以下の純粋な JSON 配列のみを返す（マークダウン・コードブロック・前置き禁止）:
[
  { "label": "数字訴求", "title": "...", "description": "..." },
  { "label": "課題訴求", "title": "...", "description": "..." },
  { "label": "専門性訴求", "title": "...", "description": "..." }
]`;

  const parsed = await callGeminiJSON(prompt, { temperature: 0.8, maxOutputTokens: 1024 });
  if (!Array.isArray(parsed)) return null;
  return parsed
    .filter((p) => p?.title)
    .slice(0, 3)
    .map((p) => ({
      label: String(p.label || '提案').slice(0, 20),
      title: String(p.title).slice(0, 80),
      description: String(p.description || '').slice(0, 200),
    }));
}

export { FUNNEL_LAYERS, LAYER_LABELS_JA };
