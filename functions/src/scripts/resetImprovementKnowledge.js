import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

/**
 * フェーズ1 デプロイ完了後に実行するスクリプト。
 *
 * 目的:
 *   既存の improvementKnowledge レコードは「完了ボタン信用ベース」で収集された
 *   データのため、実装検証されていない = 信頼性不確実。検品済み 100% verified の
 *   データのみで moat を積み上げ直すため、一括削除する。
 *
 * 使い方:
 *   cd functions
 *   node --loader ./loader.mjs src/scripts/resetImprovementKnowledge.js
 *
 * バックアップ:
 *   Firestore 自動エクスポート運用に委ねる。事前バックアップは取らない。
 *
 * 注意:
 *   このスクリプトは一度だけ実行することを想定。二度目以降は対象 0 件で終わる。
 */

initializeApp();

async function resetKnowledge() {
  const db = getFirestore();

  const snap = await db.collection('improvementKnowledge').get();
  console.log(`[resetKnowledge] 削除対象: ${snap.size} 件`);

  if (snap.empty) {
    console.log('[resetKnowledge] 対象なし、何もしません');
    return;
  }

  // バッチ削除（500 件上限に注意して chunk）
  const docs = snap.docs;
  const CHUNK = 400;
  let processed = 0;
  for (let i = 0; i < docs.length; i += CHUNK) {
    const chunk = docs.slice(i, i + CHUNK);
    const batch = db.batch();
    for (const d of chunk) {
      batch.delete(d.ref);
    }
    await batch.commit();
    processed += chunk.length;
    console.log(`[resetKnowledge] コミット: ${processed}/${docs.length}`);
  }

  console.log(`[resetKnowledge] 完了: ${processed} 件を削除しました`);
  console.log('[resetKnowledge] 今後は implementationVerified=true の改善のみ knowledge に追加されます');
}

resetKnowledge()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal:', err);
    process.exit(1);
  });
