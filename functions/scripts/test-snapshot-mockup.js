/**
 * snapshot + patch 方式のモックアップ生成をローカルでテストする
 *
 * Firestore / Storage の「本番データ」を読み書きするが、
 * 結果は test-mockups/ 配下に保存し、既存の improvement 文書は変更しない。
 *
 * 使い方:
 *   cd functions
 *   GEMINI_API_KEY=... node scripts/test-snapshot-mockup.js <siteId> <improvementId>
 */

import admin from 'firebase-admin';
import { captureFullSnapshot, readSnapshotHtml } from '../src/utils/captureFullSnapshot.js';
import {
  buildStructuralHtml,
  requestPatchFromGemini,
  applyPatchesToSnapshot,
} from '../src/callable/generateImprovementMockup.js';

const siteId = process.argv[2];
const improvementId = process.argv[3];

if (!siteId || !improvementId) {
  console.error('Usage: node scripts/test-snapshot-mockup.js <siteId> <improvementId>');
  process.exit(1);
}

const apiKey = (process.env.GEMINI_API_KEY || '').trim();
if (!apiKey) {
  console.error('GEMINI_API_KEY 環境変数を設定してください');
  process.exit(1);
}

admin.initializeApp({
  projectId: 'growgroupreporter',
  storageBucket: 'growgroupreporter.firebasestorage.app',
});
const db = admin.firestore();
const bucket = admin.storage().bucket();

async function main() {
  // 1) 対象 improvement 取得
  const impRef = db.doc(`sites/${siteId}/improvements/${improvementId}`);
  const impSnap = await impRef.get();
  if (!impSnap.exists) {
    console.error(`improvement not found: ${siteId}/${improvementId}`);
    process.exit(1);
  }
  const improvement = impSnap.data();
  console.log('─'.repeat(60));
  console.log(`siteId:        ${siteId}`);
  console.log(`improvementId: ${improvementId}`);
  console.log(`title:         ${improvement.title}`);
  console.log(`targetPageUrl: ${improvement.targetPageUrl}`);
  console.log('─'.repeat(60));

  if (!improvement.targetPageUrl) {
    console.error('targetPageUrl がない改善案は snapshot 方式の対象外です');
    process.exit(1);
  }

  // 2) Snapshot 取得（強制リフレッシュはしない、キャッシュ優先）
  console.log('\n[1/5] Snapshot を取得中...');
  const t1 = Date.now();
  const snap = await captureFullSnapshot({ siteId, pageUrl: improvement.targetPageUrl });
  if (!snap) {
    console.error('   ✗ snapshot 取得失敗');
    process.exit(1);
  }
  console.log(`   ✓ ${snap.fromCache ? 'キャッシュ再利用' : '新規取得'} (${Date.now() - t1}ms)`);
  console.log(`     path: ${snap.storagePath}`);
  console.log(`     size: ${snap.byteLen} bytes, CSS: ${snap.cssInlined}/${snap.cssInlined + snap.cssFailed}`);

  // 3) 構造 HTML 作成
  console.log('\n[2/5] 構造 HTML を作成中...');
  const t2 = Date.now();
  const snapshotHtml = await readSnapshotHtml(snap.storagePath);
  if (!snapshotHtml) {
    console.error('   ✗ snapshot 読み出し失敗');
    process.exit(1);
  }
  const structuralHtml = buildStructuralHtml(snapshotHtml);
  console.log(`   ✓ ${snapshotHtml.length} bytes → ${structuralHtml.length} bytes (${Math.round(structuralHtml.length / snapshotHtml.length * 100)}%) in ${Date.now() - t2}ms`);

  // 4) Gemini JSON パッチ生成
  console.log('\n[3/5] Gemini に JSON パッチをリクエスト中...');
  const t3 = Date.now();
  const patch = await requestPatchFromGemini({ apiKey, improvement, structuralHtml });
  if (!patch || !Array.isArray(patch.changes) || patch.changes.length === 0) {
    console.error('   ✗ パッチ取得失敗またはchangesが空');
    console.error('   patch:', JSON.stringify(patch));
    process.exit(1);
  }
  console.log(`   ✓ changes=${patch.changes.length}, summary="${patch.summary || '(none)'}" (${Date.now() - t3}ms)`);
  patch.changes.forEach((c, i) => {
    console.log(`     [${i + 1}] ${c.action} @ ${c.target_selector} → ${c.change_label || ''}`);
  });

  // 5) snapshot にパッチ適用
  console.log('\n[4/5] snapshot にパッチを適用中...');
  const t4 = Date.now();
  const applied = applyPatchesToSnapshot(snapshotHtml, patch.changes);
  if (!applied) {
    console.error('   ✗ パッチ適用失敗');
    process.exit(1);
  }
  console.log(`   ✓ ${applied.appliedCount}/${patch.changes.length} パッチ適用 (${Date.now() - t4}ms, output ${applied.html.length} bytes)`);

  if (applied.appliedCount === 0) {
    console.error('\n⚠ 1件も適用できませんでした。セレクタ不一致の可能性大。');
    console.log('\n--- patch.changes ---');
    console.log(JSON.stringify(patch.changes, null, 2));
  }

  // 6) Storage に test-mockups/ として保存（本番 page-mockups/ には触らない）
  console.log('\n[5/5] Storage に保存中...');
  const t5 = Date.now();
  const testPath = `test-mockups/${siteId}/${improvementId}-${Date.now()}.html`;
  const file = bucket.file(testPath);
  await file.save(applied.html, {
    metadata: {
      contentType: 'text/html; charset=utf-8',
      cacheControl: 'public, max-age=60',
    },
    resumable: false,
  });
  await file.makePublic();
  const url = `https://storage.googleapis.com/${bucket.name}/${testPath}`;
  console.log(`   ✓ 保存完了 (${Date.now() - t5}ms)`);

  console.log('\n' + '═'.repeat(60));
  console.log('完了。ブラウザで下記URLを開いて確認してください:');
  console.log('');
  console.log('  ' + url);
  console.log('');
  console.log('本番の improvement 文書は変更していません。');
  console.log('実運用では mockupStorageUrl フィールドに上記URL相当のパスが保存されます。');
  console.log('═'.repeat(60));
}

main().catch((err) => {
  console.error('エラー:', err);
  process.exit(1);
});
