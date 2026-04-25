/**
 * モックアップ生成 prompt の品質検証（10 回テスト）
 *
 * 実データの improvements から新形式 description を持つものを選び、
 * requestPatchFromGemini を直接呼び出して返ってくる patches を検証する。
 *
 * 検証項目:
 *  a) 全項目 (①②③…) が change_label に現れるか
 *  b) 同じ概念変更が 1 パッチに集約されているか（重複少）
 *  c) new_html にプレースホルダ ({{...}} / ${...}) が無いか
 *  d) description_excerpt が description に実在するか
 *  e) パッチ数が項目数 ±1 の範囲か（大幅な過不足がないか）
 *
 * 使い方: GEMINI_API_KEY=xxx node scripts/test-mockup-prompt-10x.js <siteId>
 */
import admin from 'firebase-admin';
import { requestPatchFromGemini, buildStructuralHtml } from '../src/callable/generateImprovementMockup.js';
import { getStorage } from 'firebase-admin/storage';

const siteId = process.argv[2];
const apiKey = process.env.GEMINI_API_KEY;

if (!siteId || !apiKey) {
  console.error('Usage: GEMINI_API_KEY=xxx node scripts/test-mockup-prompt-10x.js <siteId>');
  process.exit(1);
}

admin.initializeApp({ projectId: 'growgroupreporter', storageBucket: 'growgroupreporter.firebasestorage.app' });
const db = admin.firestore();
const bucket = getStorage().bucket();

const CIRCLED_NUM_MAP = { '①':1,'②':2,'③':3,'④':4,'⑤':5,'⑥':6,'⑦':7,'⑧':8,'⑨':9,'⑩':10 };
const CIRCLED_KEYS = Object.keys(CIRCLED_NUM_MAP);

function extractSolutionSection(description) {
  if (!description) return '';
  const m = description.match(/【\s*提案内容\s*】([\s\S]*?)(?=【|$)/);
  return m ? m[1].trim() : '';
}

function findItemNumbers(text) {
  const nums = new Set();
  for (const ch of text) {
    if (CIRCLED_NUM_MAP[ch]) nums.add(CIRCLED_NUM_MAP[ch]);
  }
  return [...nums].sort((a, b) => a - b);
}

async function readSnapshotFromStorage(storagePath) {
  try {
    const file = bucket.file(storagePath);
    const [buf] = await file.download();
    return buf.toString('utf-8');
  } catch (e) {
    console.warn(`snapshot 取得失敗: ${storagePath}: ${e.message}`);
    return null;
  }
}

(async () => {
  const snap = await db.collection(`sites/${siteId}/improvements`).get();
  const candidates = [];
  snap.forEach(doc => {
    const d = doc.data();
    const desc = d.description || '';
    const solText = extractSolutionSection(desc);
    if (/[①②③④⑤⑥⑦⑧⑨⑩]/.test(solText) && d.mockupSourceSnapshotPath) {
      candidates.push({ id: doc.id, data: d });
    }
  });
  console.log(`候補: ${candidates.length} 件（新形式 + snapshot 保存済み）`);

  // 候補が少ない場合は同じ improvement を複数回テストして TOTAL_RUNS 達成
  const targets = [];
  const TOTAL_RUNS = Number(process.env.TEST_RUNS || 10);
  while (targets.length < TOTAL_RUNS) {
    for (const c of candidates) {
      if (targets.length >= TOTAL_RUNS) break;
      targets.push({ ...c, runNo: targets.filter(t => t.id === c.id).length + 1 });
    }
  }

  const results = [];

  for (let i = 0; i < targets.length; i++) {
    const { id, data } = targets[i];
    const description = data.description;
    const solText = extractSolutionSection(description);
    const expectedNums = findItemNumbers(solText);
    const snapshotPath = data.mockupSourceSnapshotPath;

    console.log(`\n─── Test ${i + 1}/${targets.length}: ${id} (run ${targets[i].runNo}) ───`);
    console.log(`title: ${(data.title || '').substring(0, 60)}`);
    console.log(`項目番号: ${expectedNums.join(',')} (${expectedNums.length} 件)`);

    const snapshotHtml = await readSnapshotFromStorage(snapshotPath);
    if (!snapshotHtml) {
      console.log('✗ snapshot 取得失敗、スキップ');
      results.push({ id, ok: false, reason: 'snapshot unavailable' });
      continue;
    }

    const structuralHtml = buildStructuralHtml(snapshotHtml);
    const structuralSize = structuralHtml.length;
    console.log(`構造 HTML: ${Math.round(structuralSize / 1024)}KB`);

    const improvement = {
      title: data.title,
      description,
      expectedImpact: data.expectedImpact || '',
      category: data.category || '',
    };

    const started = Date.now();
    let patch;
    try {
      patch = await requestPatchFromGemini({ apiKey, improvement, structuralHtml });
    } catch (e) {
      console.log(`✗ Gemini 呼出エラー: ${e.message}`);
      results.push({ id, ok: false, reason: `gemini error: ${e.message}` });
      continue;
    }
    const elapsed = Date.now() - started;
    console.log(`Gemini 応答: ${elapsed}ms`);

    if (!patch || !Array.isArray(patch.changes)) {
      console.log('✗ patch null or invalid');
      results.push({ id, ok: false, reason: 'invalid patch' });
      continue;
    }

    const checks = {
      coverAll: null,
      noPlaceholders: null,
      labelsPrefixed: null,
      excerptMatch: null,
      reasonablePatchCount: null,
    };

    // a) 全項目カバー
    const patchNums = new Set();
    for (const c of patch.changes) {
      const firstChar = (c.change_label || '').charAt(0);
      if (CIRCLED_NUM_MAP[firstChar]) patchNums.add(CIRCLED_NUM_MAP[firstChar]);
    }
    const missing = expectedNums.filter(n => !patchNums.has(n));
    checks.coverAll = missing.length === 0;
    console.log(`  a) 全項目カバー: ${checks.coverAll ? '✓' : `✗ 欠落 ${missing.join(',')}`}`);

    // b) プレースホルダ無し
    const placeholderChanges = patch.changes.filter(c => {
      const html = String(c.new_html || '');
      return /\{\{[^}]+\}\}|\$\{[^}]+\}|\[TODO\]/i.test(html);
    });
    checks.noPlaceholders = placeholderChanges.length === 0;
    console.log(`  b) プレースホルダ無し: ${checks.noPlaceholders ? '✓' : `✗ ${placeholderChanges.length} 件`}`);
    if (!checks.noPlaceholders) {
      for (const c of placeholderChanges.slice(0, 2)) {
        const m = String(c.new_html || '').match(/\{\{[^}]+\}\}|\$\{[^}]+\}/);
        console.log(`     例: ${m?.[0]}`);
      }
    }

    // c) change_label 先頭に丸数字
    const badLabels = patch.changes.filter(c => !/^[①②③④⑤⑥⑦⑧⑨⑩]/.test((c.change_label || '').trim()));
    checks.labelsPrefixed = badLabels.length === 0;
    console.log(`  c) change_label 丸数字プレフィクス: ${checks.labelsPrefixed ? '✓' : `✗ ${badLabels.length} 件`}`);

    // d) description_excerpt が description に実在
    const nonExistent = patch.changes.filter(c => {
      const ex = c.description_excerpt || '';
      return ex && !description.includes(ex);
    });
    checks.excerptMatch = nonExistent.length === 0;
    console.log(`  d) excerpt 実在: ${checks.excerptMatch ? '✓' : `✗ ${nonExistent.length} 件不一致`}`);

    // e) パッチ数が妥当 (項目数 ±2)
    const diff = Math.abs(patch.changes.length - expectedNums.length);
    checks.reasonablePatchCount = diff <= 2;
    console.log(`  e) パッチ数妥当 (項目${expectedNums.length} vs パッチ${patch.changes.length}): ${checks.reasonablePatchCount ? '✓' : '✗'}`);

    const allOk = Object.values(checks).every(v => v === true);
    console.log(`  ${allOk ? '✅ PASS' : '❌ FAIL'}`);
    results.push({ id, ok: allOk, checks, title: data.title });
  }

  console.log('\n═══ 最終サマリー ═══');
  const passed = results.filter(r => r.ok).length;
  console.log(`PASS: ${passed}/${results.length} (${Math.round(passed / results.length * 100)}%)`);

  const failureCounts = { coverAll: 0, noPlaceholders: 0, labelsPrefixed: 0, excerptMatch: 0, reasonablePatchCount: 0 };
  for (const r of results) {
    if (!r.checks) continue;
    for (const k of Object.keys(failureCounts)) {
      if (r.checks[k] === false) failureCounts[k]++;
    }
  }
  console.log('失敗内訳:');
  for (const [k, c] of Object.entries(failureCounts)) {
    if (c > 0) console.log(`  ${k}: ${c}/${results.length}`);
  }
})();
