import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { sendEmailDirect } from '../utils/emailSender.js';
import { escapeHtml, escapeHtmlAndValidateUrl } from '../utils/htmlEscape.js';
import { enforceRateLimit, DEFAULT_RATE_LIMITS } from '../utils/rateLimiter.js';
import { requireDocId } from '../utils/validators.js';

/**
 * オーナー権限を譲渡
 *
 * セキュリティ方針:
 *  - 自アカウントのオーナー本人のみ実行可能。
 *  - システム管理者(adminUsers admin/editor)による「他人アカウントの所有権移譲」バイパスは廃止した。
 *    管理者支援用には別途 forceTransferOwnership 専用 Callable を将来追加する。
 *
 * @param {Object} data - リクエストパラメータ
 * @param {string} data.newOwnerId - 新しいオーナーのUID（同一アカウントのメンバーである必要あり）
 * @returns {Object} 譲渡結果
 */
export const transferOwnershipCallable = async (request) => {
  const uid = request.auth?.uid;

  if (!uid) {
    throw new HttpsError('unauthenticated', 'ユーザー認証が必要です');
  }

  // Phase 4-A-2: レート制限（重要操作なので 1 日 3 回まで）
  await enforceRateLimit({ uid, ...DEFAULT_RATE_LIMITS.transferOwnership });

  // 入力検証 (Phase 4-B-7): newOwnerId は Firebase Auth UID 形式（英数字+ハイフン+アンダースコア）
  const newOwnerId = requireDocId(request.data?.newOwnerId, 'newOwnerId');

  if (newOwnerId === uid) {
    throw new HttpsError('invalid-argument', '自分自身に譲渡することはできません');
  }

  try {
    const db = getFirestore();

    // 1. 現在のユーザーがオーナーであることを確認（システム管理者バイパスは廃止）
    const currentUserDoc = await db.collection('users').doc(uid).get();
    if (!currentUserDoc.exists) {
      throw new HttpsError('not-found', 'ユーザーが見つかりません');
    }

    const currentUserData = currentUserDoc.data();
    const memberRole = currentUserData.memberRole || 'owner';

    if (memberRole !== 'owner') {
      throw new HttpsError('permission-denied', 'オーナーのみ譲渡できます');
    }

    const accountOwnerId = currentUserData.accountOwnerId || uid;

    // 2. 新しいオーナーが同一アカウントのメンバーかチェック
    const newOwnerUserDoc = await db.collection('users').doc(newOwnerId).get();
    if (!newOwnerUserDoc.exists) {
      throw new HttpsError('not-found', '指定されたユーザーが見つかりません');
    }
    const newOwnerUserData = newOwnerUserDoc.data();
    if (newOwnerUserData.accountOwnerId !== accountOwnerId) {
      throw new HttpsError('not-found', '指定されたユーザーはこのアカウントのメンバーではありません');
    }
    if (newOwnerUserData.memberRole === 'owner') {
      throw new HttpsError('invalid-argument', '既にオーナーです');
    }

    const newOwnerName = newOwnerUserData.name || (newOwnerUserData.lastName && newOwnerUserData.firstName
      ? `${newOwnerUserData.lastName} ${newOwnerUserData.firstName}`
      : '') || newOwnerUserData.displayName || newOwnerUserData.email;

    const previousOwnerName = currentUserData.name || (currentUserData.lastName && currentUserData.firstName
      ? `${currentUserData.lastName} ${currentUserData.firstName}`
      : '') || currentUserData.displayName || currentUserData.email;
    const companyName = currentUserData.company || 'グローレポータ';

    // 3. accountMembers の現旧オーナーレコードを事前取得（トランザクション外で読み取り）
    //    バグ修正: 旧コードでは newOwnerMemberDoc が定義されないまま transaction.update に渡されていた。
    const [currentOwnerMemberSnapshot, newOwnerMemberSnapshot] = await Promise.all([
      db.collection('accountMembers')
        .where('accountOwnerId', '==', accountOwnerId)
        .where('userId', '==', uid)
        .where('role', '==', 'owner')
        .limit(1)
        .get(),
      db.collection('accountMembers')
        .where('accountOwnerId', '==', accountOwnerId)
        .where('userId', '==', newOwnerId)
        .limit(1)
        .get(),
    ]);

    const currentOwnerMemberDocRef = currentOwnerMemberSnapshot.empty
      ? null
      : currentOwnerMemberSnapshot.docs[0].ref;
    const newOwnerMemberDocRef = newOwnerMemberSnapshot.empty
      ? null
      : newOwnerMemberSnapshot.docs[0].ref;

    // 4. トランザクションで原子的に更新
    await db.runTransaction(async (transaction) => {
      // 現オーナー: accountMembers を editor に
      if (currentOwnerMemberDocRef) {
        transaction.update(currentOwnerMemberDocRef, {
          role: 'editor',
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
      // 現オーナー: users.memberRole を editor に + memberships マップも更新
      const currentOwnerUpdate = {
        memberRole: 'editor',
        updatedAt: FieldValue.serverTimestamp(),
      };
      if (currentUserData.memberships && currentUserData.memberships[accountOwnerId]) {
        currentOwnerUpdate[`memberships.${accountOwnerId}.role`] = 'editor';
      }
      transaction.update(db.collection('users').doc(uid), currentOwnerUpdate);

      // 新オーナー: accountMembers を owner に（存在すれば update、なければ set）
      if (newOwnerMemberDocRef) {
        transaction.update(newOwnerMemberDocRef, {
          role: 'owner',
          updatedAt: FieldValue.serverTimestamp(),
        });
      } else {
        // accountMembers レコードが無い場合は新規作成
        const newMemberRef = db.collection('accountMembers').doc();
        transaction.set(newMemberRef, {
          accountOwnerId,
          userId: newOwnerId,
          role: 'owner',
          status: 'active',
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }

      // 新オーナー: users.memberRole を owner に + memberships マップも更新
      // editor / viewer から昇格する場合は allowedSiteIds を削除（owner は全サイト閲覧可）
      const newOwnerUpdate = {
        memberRole: 'owner',
        updatedAt: FieldValue.serverTimestamp(),
      };
      if (newOwnerUserData.memberRole === 'editor' || newOwnerUserData.memberRole === 'viewer') {
        newOwnerUpdate.allowedSiteIds = FieldValue.delete();
      }
      if (newOwnerUserData.memberships && newOwnerUserData.memberships[accountOwnerId]) {
        newOwnerUpdate[`memberships.${accountOwnerId}.role`] = 'owner';
      }
      transaction.update(db.collection('users').doc(newOwnerId), newOwnerUpdate);
    });

    // 5. 全メンバーの accountOwnerId を新オーナーに更新（トランザクション外、500件まで chunked）
    const allMembersSnapshot = await db.collection('accountMembers')
      .where('accountOwnerId', '==', accountOwnerId)
      .where('status', '==', 'active')
      .get();

    const memberDocs = allMembersSnapshot.docs;
    const CHUNK = 450; // Firestore batch 上限 500 未満
    for (let i = 0; i < memberDocs.length; i += CHUNK) {
      const batch = db.batch();
      memberDocs.slice(i, i + CHUNK).forEach((doc) => {
        batch.update(doc.ref, {
          accountOwnerId: newOwnerId,
          updatedAt: FieldValue.serverTimestamp(),
        });
      });
      await batch.commit();
    }

    // 6. 全サイトの userId を新オーナーに更新
    const allSitesSnapshot = await db.collection('sites')
      .where('userId', '==', accountOwnerId)
      .get();

    const siteDocs = allSitesSnapshot.docs;
    for (let i = 0; i < siteDocs.length; i += CHUNK) {
      const sitesBatch = db.batch();
      siteDocs.slice(i, i + CHUNK).forEach((doc) => {
        sitesBatch.update(doc.ref, {
          userId: newOwnerId,
          updatedAt: FieldValue.serverTimestamp(),
        });
      });
      await sitesBatch.commit();
    }

    // 7. 新オーナーに通知メールを送信（SMTP 直接送信）
    const appUrl = process.env.APP_URL || 'https://grow-reporter.com';
    const subject = `【グローレポータ】${companyName} のオーナー権限が譲渡されました`;

    // XSS 対策: 全変数を escape してから HTML に展開
    const newOwnerNameH = escapeHtml(newOwnerName);
    const previousOwnerNameH = escapeHtml(previousOwnerName);
    const companyNameH = escapeHtml(companyName);
    const membersUrlH = escapeHtmlAndValidateUrl(`${appUrl}/members`);

    const html = `
<!DOCTYPE html>
<html lang="ja">
<body style="font-family: sans-serif; padding: 20px; background-color: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 30px; border-radius: 8px;">
    <h2 style="color: #1f2937;">オーナー権限が譲渡されました</h2>
    <p>${newOwnerNameH} さん、</p>
    <p>${previousOwnerNameH} さんから、<strong>${companyNameH}</strong> のオーナー権限が譲渡されました。</p>
    <p>今後、あなたがこのアカウントのオーナーとして、メンバー管理やプラン変更などの全ての操作が可能になります。</p>
    <p style="margin-top: 30px;">
      <a href="${membersUrlH}" style="display: inline-block; background-color: #3758F9; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px;">
        メンバー管理画面を開く
      </a>
    </p>
  </div>
</body>
</html>
    `;
    try {
      await sendEmailDirect({ to: newOwnerUserData.email, subject, html });
    } catch (mailError) {
      logger.warn('オーナー譲渡通知メール送信失敗（譲渡自体は完了）', { error: mailError?.message });
    }

    logger.info('Ownership transferred', {
      previousOwnerId: uid,
      newOwnerId,
      accountOwnerId: newOwnerId,
    });

    return { success: true, message: 'オーナー権限を譲渡しました' };
  } catch (error) {
    logger.error('Error transferring ownership:', error);
    throw error;
  }
};
