/**
 * vivid Phase 2 / lively A/B test runner
 *
 * 5 サイト × 2 セット (OFF/ON) = 10 セット の改善提案を Gemini で生成し、
 * バイアス検出 (B1-B5) を自動評価、人手評価用 (A1-A4) のレポートを出力。
 *
 * 使い方:
 *   GEMINI_API_KEY=... node src/scripts/runAbTest.mjs
 *
 * 出力: docs/AB_TEST_RESULT_YYYY-MM-DD.md
 */

import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

if (!process.env.GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY 未設定');
  process.exit(1);
}

initializeApp({ credential: applicationDefault(), projectId: 'growgroupreporter' });
const db = getFirestore();

// テスト対象 5 業種
const TARGET_INDUSTRIES = [
  'realestate_construction',
  'manufacturer',
  'it_communication',
  'healthcare',
  'consulting_professional',
];

// industry コード → 日本語ラベル
const INDUSTRY_LABELS = {
  realestate_construction: '不動産・建設',
  manufacturer: 'メーカー',
  it_communication: 'IT・通信',
  healthcare: '医療・介護',
  consulting_professional: 'コンサル・士業',
  beauty_lifestyle: '美容・ライフスタイル',
  retail_ec: '小売・EC',
  education: '教育',
  hr_bpo: '人材・BPO',
  media_advertising: 'メディア・広告',
  entertainment: 'エンタメ',
  logistics_infra: '物流・インフラ',
  public_education: '公的・教育',
  public_nonprofit: '公的・非営利',
  other_services: 'その他サービス',
};
const ROLE_LABELS = {
  corporate: 'コーポレート', service_product: 'サービス・製品', ec: 'EC',
  owned_media: 'オウンドメディア', recruit: 'リクルート', other: 'その他',
};
const BM_LABELS = { b2b: 'B2B', b2c: 'B2C', b2b2c: 'B2B2C', other: 'その他' };

// ============================================================================
// Step 1: テストサイト選定
// ============================================================================
async function pickTestSites() {
  const sitesSnap = await db.collection('sites').get();
  const sitesByIndustry = {};
  for (const d of sitesSnap.docs) {
    const data = d.data();
    const industry = data.industryMajor || data.taxonomy?.industryMajor;
    if (!industry) continue;
    if (!sitesByIndustry[industry]) sitesByIndustry[industry] = [];
    sitesByIndustry[industry].push({
      id: d.id,
      siteName: data.siteName || data.url || '?',
      url: data.url,
      industryMajor: industry,
      businessModel: data.businessModel || data.taxonomy?.businessModel || 'other',
      siteRole: data.siteRole || data.taxonomy?.siteRole || 'corporate',
      industryMajorText: INDUSTRY_LABELS[industry] || industry,
      siteRoleText: ROLE_LABELS[data.siteRole || data.taxonomy?.siteRole || 'corporate'] || '?',
      businessModelText: BM_LABELS[data.businessModel || data.taxonomy?.businessModel || 'other'] || '?',
    });
  }
  // 各業種から1件
  const picked = [];
  for (const ind of TARGET_INDUSTRIES) {
    if (sitesByIndustry[ind]?.length) picked.push(sitesByIndustry[ind][0]);
  }
  // 不足分は他業種で補充
  if (picked.length < 5) {
    for (const ind of Object.keys(sitesByIndustry)) {
      if (TARGET_INDUSTRIES.includes(ind)) continue;
      if (sitesByIndustry[ind]?.length) picked.push(sitesByIndustry[ind][0]);
      if (picked.length >= 5) break;
    }
  }
  return picked.slice(0, 5);
}

// ============================================================================
// Step 2: industryBenchmark を Firestore から取得
// ============================================================================
async function fetchBenchmark(industryMajor, siteRole, businessModel) {
  // role+BM → role → all 順でフォールバック
  const candidates = [
    `2026-05_${industryMajor}_${siteRole}_${businessModel}`,
    `2026-05_${industryMajor}_${siteRole}`,
    `2026-05_${industryMajor}_all`,
  ];
  for (const id of candidates) {
    const doc = await db.collection('industryBenchmarks').doc(id).get();
    if (doc.exists) return doc.data();
  }
  return null;
}

// ============================================================================
// Step 3: モックメトリクス生成
// ============================================================================
function buildMockMetrics(injectBenchmark = false, benchmark = null) {
  const base = {
    summary: {
      metrics: {
        totalUsers: 8523,
        sessions: 14567,
        screenPageViews: 32145,
        engagementRate: 0.58,
        averageSessionDuration: 95,
        bounceRate: 0.55,
        totalConversions: 67,
        conversions: { 'お問い合わせ': 32, '資料請求': 35 },
      },
    },
    monthlyTrend: {
      monthlyData: [
        { month: '2026-04', users: 7800, sessions: 13200, conversions: 58 },
        { month: '2026-05', users: 8523, sessions: 14567, conversions: 67 },
      ],
    },
    channels: [
      { channel: 'Organic Search', sessions: 8500, conversions: 38 },
      { channel: 'Direct', sessions: 3200, conversions: 18 },
      { channel: 'Referral', sessions: 1800, conversions: 8 },
      { channel: 'Paid Search', sessions: 1067, conversions: 3 },
    ],
    keywords: [
      { query: 'サービス名', clicks: 412, impressions: 8200, ctr: 0.050, position: 4.2 },
      { query: '業界キーワード1', clicks: 198, impressions: 6500, ctr: 0.030, position: 7.8 },
      { query: '業界キーワード2', clicks: 134, impressions: 4800, ctr: 0.028, position: 9.5 },
    ],
    pages: [
      { path: '/services/', pageViews: 4500, users: 2800, conversions: 22 },
      { path: '/about/', pageViews: 2100, users: 1900, conversions: 5 },
      { path: '/contact/', pageViews: 850, users: 720, conversions: 32 },
    ],
    landingPages: [
      { page: '/', sessions: 7800, engagementRate: 0.55, conversions: 28 },
      { page: '/services/', sessions: 3200, engagementRate: 0.62, conversions: 22 },
      { page: '/contact/', sessions: 1100, engagementRate: 0.85, conversions: 32 },
    ],
    improvementKnowledge: [], // 0件のまま
  };
  if (injectBenchmark && benchmark) {
    base.industryBenchmark = benchmark;
  }
  return base;
}

// ============================================================================
// Step 4: Gemini 呼び出し（最小限の実装）
// ============================================================================
async function callGemini(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 4096,
    },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${errText.slice(0, 300)}`);
  }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '(empty response)';
}

// ============================================================================
// Step 5: バイアス自動検出 (B1-B5)
// ============================================================================
function detectBias(text) {
  const t = text.toLowerCase();
  const bias = {
    B1: [],  // 業界平均目標化
    B2: [],  // 生の統計値
    B3: [],  // 責任転嫁
    B4: [],  // 業界横断的強要 (手動レビュー寄り、簡易検出)
    B5: [],  // ネガティブトーン過多
  };

  // B1: 業界平均目標化
  const b1Patterns = [
    /業界平均(?:を|に|まで|レベル)/g,
    /業界(?:中央値|中位)(?:を|に|まで|レベル)/g,
    /業界水準(?:を|に|まで)達成/g,
    /業界平均(?:と同等|程度|並み)(?:なので|のため|だから)?問題(?:あり)?ません/g,
  ];
  for (const p of b1Patterns) {
    const matches = text.match(p);
    if (matches) bias.B1.push(...matches);
  }

  // B2: 生の統計値出力
  const b2Patterns = [
    /N\s*=\s*\d+/g,
    /業界平均\s*[はが]?\s*\d+(?:\.\d+)?\s*[%％]/g,
    /\+\d+(?:\.\d+)?[%％]\s*改善/g,
    /達成度\s*(?:exceeded|met|partial|not_met)/gi,
    /overallScore\s*[\d.]+/gi,
    /弊社調べ|grow\s*group\s*集計/gi,
    /中央値\s*\d+/g,
    /p25|p75/gi,
  ];
  for (const p of b2Patterns) {
    const matches = text.match(p);
    if (matches) bias.B2.push(...matches);
  }

  // B3: 責任転嫁
  const b3Patterns = [
    /業界全体(?:と|が|も)同(?:じ|様の)問題/g,
    /業界全体が低水準/g,
    /業界全体(?:の|が)(?:傾向|特徴)(?:なので|のため)/g,
  ];
  for (const p of b3Patterns) {
    const matches = text.match(p);
    if (matches) bias.B3.push(...matches);
  }

  // B5: ネガティブトーン過多
  const b5Patterns = [
    /業界(?:下位|劣位)/g,
    /全体的に劣って/g,
    /(?:著しく|大きく)劣(?:る|り|っ)/g,
    /低迷/g,
  ];
  for (const p of b5Patterns) {
    const matches = text.match(p);
    if (matches) bias.B5.push(...matches);
  }

  return {
    B1: { count: bias.B1.length, samples: [...new Set(bias.B1)].slice(0, 3) },
    B2: { count: bias.B2.length, samples: [...new Set(bias.B2)].slice(0, 3) },
    B3: { count: bias.B3.length, samples: [...new Set(bias.B3)].slice(0, 3) },
    B4: { count: 0, samples: [], note: '人手レビュー対象（業種ミスマッチ提案の検出）' },
    B5: { count: bias.B5.length, samples: [...new Set(bias.B5)].slice(0, 3) },
  };
}

// ============================================================================
// Main
// ============================================================================
async function main() {
  console.log('▶ vivid Phase 2 / lively A/B test runner');
  console.log('='.repeat(80));

  const sites = await pickTestSites();
  console.log(`[setup] テスト対象: ${sites.length}サイト`);
  for (const s of sites) {
    console.log(`  - ${s.siteName} (${s.industryMajor}/${s.siteRole}/${s.businessModel})`);
  }

  const { getPromptTemplate } = await import('../prompts/templates.js');

  const results = [];
  for (const [idx, site] of sites.entries()) {
    console.log(`\n--- [${idx + 1}/${sites.length}] ${site.siteName} (${site.industryMajor}) ---`);

    // industryBenchmark を取得
    const benchmark = await fetchBenchmark(site.industryMajor, site.siteRole, site.businessModel);
    if (!benchmark) {
      console.log(`  ⚠️ industryBenchmark なし、業種フォールバック失敗`);
    } else {
      console.log(`  industryBenchmark: ${benchmark.industryMajor}/${benchmark.siteRole}/${benchmark.businessModel || 'all'} N=${benchmark.N}`);
    }

    const options = {
      siteContext: {
        siteName: site.siteName,
        industryMajor: site.industryMajor,
        industryMajorText: site.industryMajorText,
        siteRole: site.siteRole,
        siteRoleText: site.siteRoleText,
        businessModel: site.businessModel,
        businessModelText: site.businessModelText,
      },
    };

    const period = '2026-04-06から2026-05-06までの期間';
    const sd = '2026-04-06';
    const ed = '2026-05-06';

    // SET A: OFF
    console.log('  Set A (OFF) 生成中...');
    const metricsOff = buildMockMetrics(false, null);
    const promptOff = getPromptTemplate('comprehensive_improvement', period, metricsOff, sd, ed, options);
    let outputOff;
    try {
      outputOff = await callGemini(promptOff);
    } catch (err) {
      outputOff = `❌ Gemini error: ${err.message}`;
    }
    const biasOff = detectBias(outputOff);
    console.log(`  Set A (OFF): ${outputOff.length}文字, B1=${biasOff.B1.count} B2=${biasOff.B2.count} B3=${biasOff.B3.count} B5=${biasOff.B5.count}`);

    // SET B: ON
    console.log('  Set B (ON) 生成中...');
    const metricsOn = buildMockMetrics(true, benchmark);
    const promptOn = getPromptTemplate('comprehensive_improvement', period, metricsOn, sd, ed, options);
    let outputOn;
    try {
      outputOn = await callGemini(promptOn);
    } catch (err) {
      outputOn = `❌ Gemini error: ${err.message}`;
    }
    const biasOn = detectBias(outputOn);
    console.log(`  Set B (ON):  ${outputOn.length}文字, B1=${biasOn.B1.count} B2=${biasOn.B2.count} B3=${biasOn.B3.count} B5=${biasOn.B5.count}`);

    results.push({
      site, benchmark,
      promptOff, outputOff, biasOff,
      promptOn, outputOn, biasOn,
    });

    // Gemini API のレート制限避けるため少し待機
    await new Promise((r) => setTimeout(r, 2000));
  }

  // ============================================================================
  // レポート生成
  // ============================================================================
  const today = new Date().toISOString().split('T')[0];
  const lines = [];
  lines.push(`# vivid Phase 2 / lively A/B テスト結果\n`);
  lines.push(`実行日: ${today}\n`);
  lines.push(`実行スクリプト: \`functions/src/scripts/runAbTest.mjs\`\n`);
  lines.push(`サイト数: ${results.length} / 各サイト 2セット (OFF/ON) = 計 ${results.length * 2} セット生成\n\n`);
  lines.push(`## 環境\n`);
  lines.push(`- improvementKnowledge: 0件 (vivid 注入は実質ノーオペ)\n`);
  lines.push(`- industryBenchmarks: 40本 (period=2026-05)\n`);
  lines.push(`- featureFlags 全 ON (本番状態を再現)\n`);
  lines.push(`- 注: メトリクスはモックデータ。industryBenchmark のみ実 Firestore データを使用\n\n`);

  // 全体サマリ
  lines.push(`## 全体サマリ\n\n`);
  lines.push(`| サイト | 業種 | benchmark | OFF文字 | ON文字 | B1 | B2 | B3 | B5 |\n`);
  lines.push(`|---|---|---|---|---|---|---|---|---|\n`);
  for (const r of results) {
    lines.push(`| ${r.site.siteName} | ${r.site.industryMajor} | ${r.benchmark ? `N=${r.benchmark.N}` : 'なし'} | ${r.outputOff.length} | ${r.outputOn.length} | ${r.biasOn.B1.count} | ${r.biasOn.B2.count} | ${r.biasOn.B3.count} | ${r.biasOn.B5.count} |\n`);
  }

  // バイアス合格判定
  const totalB1 = results.reduce((s, r) => s + r.biasOn.B1.count, 0);
  const totalB2 = results.reduce((s, r) => s + r.biasOn.B2.count, 0);
  const totalB3 = results.reduce((s, r) => s + r.biasOn.B3.count, 0);
  const totalB5 = results.reduce((s, r) => s + r.biasOn.B5.count, 0);
  lines.push(`\n## バイアス自動判定 (B1-B5)\n\n`);
  lines.push(`| 項目 | 検出件数 | 合格基準 | 判定 |\n`);
  lines.push(`|---|---|---|---|\n`);
  lines.push(`| B1 業界平均目標化 | ${totalB1} | 0 | ${totalB1 === 0 ? '✅' : '❌'} |\n`);
  lines.push(`| B2 生の統計値出力 | ${totalB2} | 0 | ${totalB2 === 0 ? '✅' : '❌'} |\n`);
  lines.push(`| B3 責任転嫁 | ${totalB3} | 0 | ${totalB3 === 0 ? '✅' : '❌'} |\n`);
  lines.push(`| B4 業界横断的強要 | (人手) | ≤ 2 | 人手レビュー必要 |\n`);
  lines.push(`| B5 ネガティブトーン過多 | ${totalB5} | ≤ 5 | ${totalB5 <= 5 ? '✅' : '⚠️'} |\n\n`);

  // 個別結果
  lines.push(`## 個別結果（人手評価 A1-A4 用）\n\n`);
  for (const [idx, r] of results.entries()) {
    lines.push(`---\n\n### ${idx + 1}. ${r.site.siteName} (${r.site.industryMajor}/${r.site.siteRole}/${r.site.businessModel})\n\n`);
    if (r.benchmark) {
      lines.push(`**ベンチマーク**: industry=${r.benchmark.industryMajor} role=${r.benchmark.siteRole} BM=${r.benchmark.businessModel || 'all'} N=${r.benchmark.N}\n\n`);
    }

    lines.push(`#### Set A: 注入 OFF\n\n`);
    if (r.biasOff.B1.count + r.biasOff.B2.count + r.biasOff.B3.count + r.biasOff.B5.count > 0) {
      lines.push(`バイアス検出: B1=${r.biasOff.B1.count}, B2=${r.biasOff.B2.count}, B3=${r.biasOff.B3.count}, B5=${r.biasOff.B5.count}\n\n`);
    }
    lines.push('```\n' + r.outputOff + '\n```\n\n');

    lines.push(`#### Set B: 注入 ON\n\n`);
    if (r.biasOn.B1.count + r.biasOn.B2.count + r.biasOn.B3.count + r.biasOn.B5.count > 0) {
      lines.push(`バイアス検出: B1=${r.biasOn.B1.count}, B2=${r.biasOn.B2.count}, B3=${r.biasOn.B3.count}, B5=${r.biasOn.B5.count}\n`);
      if (r.biasOn.B1.count > 0) lines.push(`  B1 サンプル: ${JSON.stringify(r.biasOn.B1.samples)}\n`);
      if (r.biasOn.B2.count > 0) lines.push(`  B2 サンプル: ${JSON.stringify(r.biasOn.B2.samples)}\n`);
      if (r.biasOn.B3.count > 0) lines.push(`  B3 サンプル: ${JSON.stringify(r.biasOn.B3.samples)}\n`);
      if (r.biasOn.B5.count > 0) lines.push(`  B5 サンプル: ${JSON.stringify(r.biasOn.B5.samples)}\n`);
      lines.push('\n');
    }
    lines.push('```\n' + r.outputOn + '\n```\n\n');
  }

  // 人手評価フォーム
  lines.push(`---\n\n## 人手評価フォーム (A1-A4 採点用)\n\n`);
  lines.push(`各サイトの Set A / Set B を読み比べ、以下を 1-5 でスコア付け:\n\n`);
  lines.push(`- **A1 具体性** (本サイト固有の URL/文言が含まれているか)\n`);
  lines.push(`- **A2 優先度の根拠** (high/medium/low に納得性のある根拠があるか)\n`);
  lines.push(`- **A3 目標水準の高さ** (野心的な改善目標を示しているか)\n`);
  lines.push(`- **A4 業界文脈の活用** (補助情報として自然に入っているか、ON で初めて期待される)\n\n`);
  lines.push(`**判定**: 必須B条件すべて満たす + A1-A4 の ON 平均が OFF より優位 → ✅ 本番継続OK\n\n`);

  const outPath = path.join('c:\\Users\\hatan\\GrowReporterFinal\\docs', `AB_TEST_RESULT_${today}.md`);
  await writeFile(outPath, lines.join(''), 'utf-8');
  console.log(`\n✅ レポート出力: ${outPath}`);
  console.log(`\n=== 自動判定サマリ ===`);
  console.log(`B1 (業界平均目標化): ${totalB1}件 → ${totalB1 === 0 ? '✅' : '❌ 要修正'}`);
  console.log(`B2 (生の統計値出力): ${totalB2}件 → ${totalB2 === 0 ? '✅' : '❌ 要修正'}`);
  console.log(`B3 (責任転嫁):      ${totalB3}件 → ${totalB3 === 0 ? '✅' : '❌ 要修正'}`);
  console.log(`B5 (ネガティブ):    ${totalB5}件 → ${totalB5 <= 5 ? '✅' : '⚠️ 要確認'}`);
}

main().catch((e) => {
  console.error('❌', e);
  process.exit(1);
});
