import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';

/**
 * users に accountOwnerId / memberRole / joinedAt / invitedBy / invitedByName をバックフィル
 * - accountMembers の内容を users のトップレベルに反映
 * - オーナー本人の user には accountOwnerId = 自分の uid, memberRole = 'owner' を設定
 *
 * 実行: Firebase Admin が利用可能な環境でこの関数を呼び出す
 * フェーズ1 実装前に1回実行する想定
 */
export async function backfillUsersAccountFields() {
  const db = getFirestore();
  const ownerIds = new Set();

  try {
    logger.info('Starting backfill: users accountOwnerId, memberRole, joinedAt, invitedBy, invitedByName');

    // 1. accountMembers からメンバーごとに users を更新
    const accountMembersSnap = await db.collection('accountMembers').get();
    let updated = 0;
    let batch = db.batch();
    let batchCount = 0;

    for (const doc of accountMembersSnap.docs) {
      const d = doc.data();
      if (d.status !== 'active' || !d.userId || !d.accountOwnerId) continue;

      ownerIds.add(d.accountOwnerId);

      const userRef = db.collection('users').doc(d.userId);
      const userSnap = await userRef.get();
      if (!userSnap.exists) continue;

      batch.update(userRef, {
        accountOwnerId: d.accountOwnerId,
        memberRole: d.role || 'viewer',
        joinedAt: d.acceptedAt || d.joinedAt || FieldValue.serverTimestamp(),
        invitedBy: d.invitedBy ?? null,
        invitedByName: d.invitedByName ?? null,
        updatedAt: FieldValue.serverTimestamp(),
      });
      batchCount++;
      updated++;

      if (batchCount >= 450) {
        await batch.commit();
        batch = db.batch();
        batchCount = 0;
      }
    }

    if (batchCount > 0) await batch.commit();

    // 2. オーナー本人の user に accountOwnerId = 自分の uid, memberRole = 'owner' を設定
    let ownersUpdated = 0;
    batch = db.batch();
    batchCount = 0;

    for (const ownerId of ownerIds) {
      const ownerRef = db.collection('users').doc(ownerId);
      const ownerSnap = await ownerRef.get();
      if (!ownerSnap.exists) continue;

      batch.update(ownerRef, {
        accountOwnerId: ownerId,
        memberRole: 'owner',
        updatedAt: FieldValue.serverTimestamp(),
      });
      batchCount++;
      ownersUpdated++;

      if (batchCount >= 450) {
        await batch.commit();
        batch = db.batch();
        batchCount = 0;
      }
    }

    if (batchCount > 0) await batch.commit();

    // 3. memberships のみ持っていて accountOwnerId がないユーザー（accountMembers にいないケース）を補完
    const usersSnap = await db.collection('users').get();
    let filled = 0;
    batch = db.batch();
    batchCount = 0;

    for (const doc of usersSnap.docs) {
      const data = doc.data();
      if (data.accountOwnerId != null) continue; // 既に設定済み
      const memberships = data.memberships || {};
      const keys = Object.keys(memberships);
      if (keys.length === 0) continue;

      const firstOwnerId = keys[0];
      const m = memberships[firstOwnerId] || {};
      batch.update(doc.ref, {
        accountOwnerId: doc.id === firstOwnerId ? doc.id : firstOwnerId,
        memberRole: m.role || (doc.id === firstOwnerId ? 'owner' : 'viewer'),
        joinedAt: m.joinedAt ?? null,
        invitedBy: m.invitedBy ?? null,
        invitedByName: m.invitedByName ?? null,
        updatedAt: FieldValue.serverTimestamp(),
      });
      batchCount++;
      filled++;
      if (batchCount >= 450) {
        await batch.commit();
        batch = db.batch();
        batchCount = 0;
      }
    }

    if (batchCount > 0) await batch.commit();

    logger.info('Backfill complete', { fromAccountMembers: updated, owners: ownersUpdated, fromMemberships: filled });
    return { success: true, fromAccountMembers: updated, owners: ownersUpdated, fromMemberships: filled };
  } catch (err) {
    logger.error('Backfill failed', err);
    throw err;
  }
}
