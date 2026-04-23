import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

/**
 * フェーズ1 デプロイ直前に実行するスクリプト。
 *
 * 目的:
 *   既存の completed 状態で emStatus=pending / measuring の改善は、
 *   implementationCheck.beforeSnapshot を持っていないため、デプロイ後の
 *   scheduled measureImprovementEffects で implementationVerified=null となる。
 *   これらが After 測定されて aiEvaluation だけが生えるのを避けるため、
 *   emStatus を 'suspended' に一括変更して完全隔離する。
 *
 * 使い方:
 *   cd functions
 *   node --loader ./loader.mjs src/scripts/suspendPendingMeasurements.js
 *
 * ロールバック:
 *   対象の改善の emStatus を 'pending' に戻せば再び測定対象になる（手動）。
 */

initializeApp();

async function suspendPending() {
  const db = getFirestore();

  const targets = [];
  const snap = await db
    .collectionGroup('improvements')
    .where('status', '==', 'completed')
    .where('emStatus', 'in', ['pending', 'measuring'])
    .get();

  snap.forEach((doc) => {
    targets.push({ ref: doc.ref, id: doc.id, data: doc.data() });
  });

  console.log(`[suspendPending] 対象: ${targets.length} 件`);

  if (targets.length === 0) {
    console.log('[suspendPending] 対象なし、何もしません');
    return;
  }

  // バッチ更新（Firestore の 500 件上限に注意して chunk）
  const CHUNK = 400;
  let processed = 0;
  for (let i = 0; i < targets.length; i += CHUNK) {
    const chunk = targets.slice(i, i + CHUNK);
    const batch = db.batch();
    for (const t of chunk) {
      batch.update(t.ref, {
        'effectMeasurement.status': 'suspended',
        emStatus: 'suspended',
        suspendedForPhase1Deploy: true,
        suspendedAt: FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();
    processed += chunk.length;
    console.log(`[suspendPending] コミット: ${processed}/${targets.length}`);
  }

  console.log(`[suspendPending] 完了: ${processed} 件を suspended に変更しました`);
}

suspendPending()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal:', err);
    process.exit(1);
  });
