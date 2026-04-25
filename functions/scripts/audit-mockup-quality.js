/**
 * 改善提案とモックアップパッチの品質監査
 * - 新形式 description（①②③）かチェック
 * - parseProposals が全項目を抽出できるか
 * - 全項目がモックアップパッチでカバーされているか
 * - change_label に丸数字が付いているか
 * - new_html にプレースホルダ（{{...}} / ${...}）が残っていないか
 * - change_label の並びがソート可能か
 *
 * 使い方: node scripts/audit-mockup-quality.js <siteId> [--since=<minutes>]
 */
import admin from 'firebase-admin';

const siteId = process.argv[2];
const sinceArg = process.argv.find(a => a.startsWith('--since='));
const sinceMinutes = sinceArg ? Number(sinceArg.split('=')[1]) : 180;

if (!siteId) {
  console.error('Usage: node scripts/audit-mockup-quality.js <siteId> [--since=minutes]');
  process.exit(1);
}

admin.initializeApp({ projectId: 'growgroupreporter' });
const db = admin.firestore();

const CIRCLED_NUM_MAP = { '①':1,'②':2,'③':3,'④':4,'⑤':5,'⑥':6,'⑦':7,'⑧':8,'⑨':9,'⑩':10 };

function parseProposals(text) {
  if (!text || typeof text !== 'string') return null;
  const re = /([①②③④⑤⑥⑦⑧⑨⑩])\s*([\s\S]*?)(?=[①②③④⑤⑥⑦⑧⑨⑩]|$)/g;
  const items = [];
  let m;
  while ((m = re.exec(text)) !== null) {
    const num = CIRCLED_NUM_MAP[m[1]];
    const body = (m[2] || '').trim();
    if (!body) continue;
    const nlIdx = body.indexOf('\n');
    const fullColonIdx = body.indexOf('：');
    const halfColonIdx = body.indexOf(':');
    const candidates = [nlIdx, fullColonIdx, halfColonIdx].filter(i => i >= 0);
    let splitIdx = candidates.length ? Math.min(...candidates) : -1;
    if (splitIdx < 0) {
      const spaceRe = /[ 　]/g;
      let match;
      while ((match = spaceRe.exec(body)) !== null) {
        if (match.index >= 6 && match.index <= 40) {
          splitIdx = match.index;
          break;
        }
      }
    }
    let title, detail;
    if (splitIdx < 0) {
      title = body;
      detail = '';
    } else {
      title = body.slice(0, splitIdx).trim();
      detail = body.slice(splitIdx + 1).trim();
    }
    items.push({ num, title, detail });
  }
  return items.length >= 2 ? items : null;
}

function extractSolutionSection(description) {
  if (!description) return '';
  const m = description.match(/【\s*提案内容\s*】([\s\S]*?)(?=【|$)/);
  return m ? m[1].trim() : '';
}

const issues = {
  oldFormat: [],
  missingItems: [],
  labelMismatch: [],
  placeholders: [],
  noDetailItems: [],
  itemCoverageGaps: [],
  duplicateNumPatches: [],
};

(async () => {
  const sinceDate = new Date(Date.now() - sinceMinutes * 60 * 1000);
  const snap = await db.collection(`sites/${siteId}/improvements`).get();
  const recent = [];
  snap.forEach(doc => {
    const d = doc.data();
    const createdAt = d.createdAt?.toDate?.();
    if (createdAt && createdAt >= sinceDate) {
      recent.push({ id: doc.id, data: d, createdAt });
    }
  });
  recent.sort((a, b) => a.createdAt - b.createdAt);

  console.log(`\n═══ 監査対象: ${recent.length} 件 (過去 ${sinceMinutes} 分) ═══\n`);

  let totalPatchCount = 0;
  let totalItemCount = 0;
  let itemsCovered = 0;

  for (const { id, data } of recent) {
    const description = data.description || '';
    const patches = Array.isArray(data.mockupPatchChanges) ? data.mockupPatchChanges : [];
    const solutionText = extractSolutionSection(description);
    const proposals = parseProposals(solutionText);

    const title = data.title || '(no title)';
    const hasCircled = /[①②③④⑤⑥⑦⑧⑨⑩]/.test(solutionText);
    console.log(`[${id}] ${title.substring(0, 50)}${title.length > 50 ? '...' : ''}`);
    console.log(`  新形式: ${hasCircled ? '✓' : '✗'}, 項目数(parser): ${proposals?.length || 0}, パッチ数: ${patches.length}`);

    if (!hasCircled) {
      issues.oldFormat.push({ id, title });
      console.log(`  -> 旧形式（スキップ）`);
      console.log('');
      continue;
    }

    if (!proposals || proposals.length === 0) {
      issues.missingItems.push({ id, title, reason: 'parseProposals returned null/empty' });
      console.log(`  ✗ parseProposals 抽出失敗`);
    } else {
      totalItemCount += proposals.length;
      // 各項目の detail が空でないか
      const emptyDetails = proposals.filter(p => !p.detail);
      if (emptyDetails.length > 0) {
        issues.noDetailItems.push({ id, title, emptyNums: emptyDetails.map(p => p.num) });
        console.log(`  ✗ detail 空の項目: ${emptyDetails.map(p => `①`[p.num-1] || p.num).join(',')}`);
      }
    }

    totalPatchCount += patches.length;

    // change_label に丸数字が付いているか
    const labelsWithoutCircled = patches.filter(p => {
      const label = (p.change_label || '').trim();
      return !/^[①②③④⑤⑥⑦⑧⑨⑩]/.test(label);
    });
    if (labelsWithoutCircled.length > 0) {
      issues.labelMismatch.push({ id, title, count: labelsWithoutCircled.length, samples: labelsWithoutCircled.slice(0, 2).map(p => p.change_label) });
      console.log(`  ✗ 丸数字なし change_label: ${labelsWithoutCircled.length}件`);
    }

    // プレースホルダチェック
    const placeholderPatches = patches.filter(p => {
      const html = String(p.new_html || '');
      return /\{\{[^}]+\}\}|\$\{[^}]+\}|\[TODO\]/i.test(html);
    });
    if (placeholderPatches.length > 0) {
      issues.placeholders.push({
        id, title,
        count: placeholderPatches.length,
        samples: placeholderPatches.slice(0, 2).map(p => {
          const html = String(p.new_html || '');
          const match = html.match(/\{\{[^}]+\}\}|\$\{[^}]+\}/);
          return match ? match[0] : '(unknown)';
        }),
      });
      console.log(`  ✗ プレースホルダ残存: ${placeholderPatches.length}件 ${placeholderPatches.slice(0, 2).map(p => (p.new_html || '').match(/\{\{[^}]+\}\}/)?.[0]).join(', ')}`);
    }

    // 項目カバレッジ: 全項目番号がパッチに現れるか
    if (proposals && proposals.length > 0) {
      const itemNums = new Set(proposals.map(p => p.num));
      const patchNums = new Set();
      for (const p of patches) {
        const label = (p.change_label || '').trim();
        const firstChar = label.charAt(0);
        const n = CIRCLED_NUM_MAP[firstChar];
        if (n) patchNums.add(n);
      }
      const missing = [...itemNums].filter(n => !patchNums.has(n));
      if (missing.length > 0) {
        issues.itemCoverageGaps.push({ id, title, missingNums: missing, itemCount: proposals.length, patchCount: patches.length });
        console.log(`  ✗ パッチ未カバー項目: ${missing.map(n => Object.keys(CIRCLED_NUM_MAP).find(k => CIRCLED_NUM_MAP[k] === n)).join(',')}`);
      } else {
        itemsCovered += proposals.length;
      }
    }

    // 同じ num に複数パッチ（重複）
    const numCounts = {};
    for (const p of patches) {
      const firstChar = (p.change_label || '').charAt(0);
      const n = CIRCLED_NUM_MAP[firstChar];
      if (n) numCounts[n] = (numCounts[n] || 0) + 1;
    }
    const duplicates = Object.entries(numCounts).filter(([_, c]) => c > 1);
    if (duplicates.length > 0) {
      issues.duplicateNumPatches.push({ id, title, duplicates });
      console.log(`  ⚠ 同一番号に複数パッチ: ${duplicates.map(([n, c]) => `${n}:${c}件`).join(', ')}`);
    }

    console.log('');
  }

  console.log('═══ サマリー ═══');
  console.log(`  総改善数: ${recent.length}`);
  console.log(`  総項目数(parser抽出): ${totalItemCount}`);
  console.log(`  総パッチ数: ${totalPatchCount}`);
  console.log(`  項目カバレッジ: ${itemsCovered}/${totalItemCount} (${totalItemCount ? Math.round(itemsCovered / totalItemCount * 100) : 0}%)`);
  console.log('');
  console.log('═══ 問題件数 ═══');
  console.log(`  旧形式: ${issues.oldFormat.length}`);
  console.log(`  parser 抽出失敗: ${issues.missingItems.length}`);
  console.log(`  detail 空: ${issues.noDetailItems.length}`);
  console.log(`  change_label 丸数字なし: ${issues.labelMismatch.length}`);
  console.log(`  プレースホルダ残存: ${issues.placeholders.length}`);
  console.log(`  項目カバー不足: ${issues.itemCoverageGaps.length}`);
  console.log(`  同番号重複パッチ: ${issues.duplicateNumPatches.length}`);

  if (issues.placeholders.length > 0) {
    console.log('\n--- プレースホルダ詳細 ---');
    for (const i of issues.placeholders) {
      console.log(`  [${i.id}] ${i.title.substring(0, 40)}: ${i.samples.join(', ')}`);
    }
  }
  if (issues.itemCoverageGaps.length > 0) {
    console.log('\n--- 項目カバー不足詳細 ---');
    for (const i of issues.itemCoverageGaps) {
      console.log(`  [${i.id}] ${i.title.substring(0, 40)}: 欠落 ${i.missingNums.join(',')}`);
    }
  }
  if (issues.noDetailItems.length > 0) {
    console.log('\n--- detail 空詳細 ---');
    for (const i of issues.noDetailItems) {
      console.log(`  [${i.id}] ${i.title.substring(0, 40)}: 項目 ${i.emptyNums.join(',')}`);
    }
  }
})();
