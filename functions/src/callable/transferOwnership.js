import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { sendEmailDirect } from '../utils/emailSender.js';

/**
 * オーナー権限を譲渡
 * 
 * @param {Object} data - リクエストパラメータ
 * @param {string} data.newOwnerId - 新しいオーナーのUID
 * @returns {Object} 譲渡結果
 */
export const transferOwnershipCallable = async (request) => {
  const uid = request.auth?.uid;

  if (!uid) {
    throw new HttpsError('unauthenticated', 'ユーザー認証が必要です');
  }

  const { newOwnerId } = request.data || {};

  if (!newOwnerId) {
    throw new HttpsError('invalid-argument', '新しいオーナーのIDが必要です');
  }

  try {
    const db = getFirestore();
    
    // 1. 現在のユーザーがオーナーまたはシステム管理者かチェック
    const currentUserDoc = await db.collection('users').doc(uid).get();
    if (!currentUserDoc.exists) {
      throw new HttpsError('not-found', 'ユーザーが見つかりません');
    }
    
    const currentUserData = currentUserDoc.data();
    const memberRole = currentUserData.memberRole || 'owner';
    
    // システム管理者かチェック
    const adminDoc = await db.collection('adminUsers').doc(uid).get();
    const isAdmin = adminDoc.exists && ['admin', 'editor'].includes(adminDoc.data().role);
    
    if (memberRole !== 'owner' && !isAdmin) {
      throw new HttpsError('permission-denied', 'オーナーまたはシステム管理者のみ譲渡できます');
    }
    
    const accountOwnerId = currentUserData.accountOwnerId || uid;
    
    // 2. 新しいオーナーが同一アカウントのメンバーかチェック（users のみ参照）
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
    
    // 4. 現在のオーナーの情報
    const previousOwnerName = currentUserData.name || (currentUserData.lastName && currentUserData.firstName
      ? `${currentUserData.lastName} ${currentUserData.firstName}`
      : '') || currentUserData.displayName || currentUserData.email;
    const companyName = currentUserData.company || 'グローレポータ';
    
    // 5. トランザクションで更新
    await db.runTransaction(async (transaction) => {
      // 5-1. 現在のオーナーのaccountMembersを編集者に変更（システム管理者でない場合のみ）
      if (memberRole === 'owner') {
        const currentOwnerMemberSnapshot = await db.collection('accountMembers')
          .where('accountOwnerId', '==', accountOwnerId)
          .where('userId', '==', uid)
          .where('role', '==', 'owner')
          .limit(1)
          .get();
        
        if (!currentOwnerMemberSnapshot.empty) {
          transaction.update(currentOwnerMemberSnapshot.docs[0].ref, {
            role: 'editor',
            updatedAt: FieldValue.serverTimestamp()
          });
        }
        
        // 5-2. 現在のオーナーのusersを編集者に変更
        transaction.update(db.collection('users').doc(uid), {
          memberRole: 'editor',
          updatedAt: FieldValue.serverTimestamp()
        });
      }
      
      // 5-3. 新しいオーナーのaccountMembersをオーナーに変更
      transaction.update(newOwnerMemberDoc.ref, {
        role: 'owner',
        updatedAt: FieldValue.serverTimestamp()
      });
      
      // 5-4. 新しいオーナーのusersをオーナーに変更
      transaction.update(db.collection('users').doc(newOwnerId), {
        memberRole: 'owner',
        updatedAt: FieldValue.serverTimestamp()
      });
    });
    
    // 6. 全メンバーのaccountOwnerIdを更新（トランザクション外で実行）
    const allMembersSnapshot = await db.collection('accountMembers')
      .where('accountOwnerId', '==', accountOwnerId)
      .where('status', '==', 'active')
      .get();
    
    const batch = db.batch();
    allMembersSnapshot.docs.forEach(doc => {
      batch.update(doc.ref, {
        accountOwnerId: newOwnerId,
        updatedAt: FieldValue.serverTimestamp()
      });
    });
    await batch.commit();
    
    // 7. 全サイトのuserIdを更新
    const allSitesSnapshot = await db.collection('sites')
      .where('userId', '==', accountOwnerId)
      .get();
    
    const sitesBatch = db.batch();
    allSitesSnapshot.docs.forEach(doc => {
      sitesBatch.update(doc.ref, {
        userId: newOwnerId,
        updatedAt: FieldValue.serverTimestamp()
      });
    });
    await sitesBatch.commit();
    
    // 8. 新しいオーナーに通知メールを送信（SMTP 直接送信）
    const appUrl = process.env.APP_URL || 'https://grow-reporter.com';
    const subject = `【グローレポータ】${companyName} のオーナー権限が譲渡されました`;
    const html = `
<!DOCTYPE html>
<html lang="ja">
<body style="font-family: sans-serif; padding: 20px; background-color: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 30px; border-radius: 8px;">
    <h2 style="color: #1f2937;">オーナー権限が譲渡されました</h2>
    <p>${newOwnerName} さん、</p>
    <p>${previousOwnerName} さんから、<strong>${companyName}</strong> のオーナー権限が譲渡されました。</p>
    <p>今後、あなたがこのアカウントのオーナーとして、メンバー管理やプラン変更などの全ての操作が可能になります。</p>
    <p style="margin-top: 30px;">
      <a href="${appUrl}/members" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px;">
        メンバー管理画面を開く
      </a>
    </p>
  </div>
</body>
</html>
    `;
    await sendEmailDirect({ to: newOwnerUserData.email, subject, html });
    
    logger.info('Ownership transferred', { 
      previousOwnerId: uid, 
      newOwnerId,
      accountOwnerId: newOwnerId
    });
    
    return { success: true, message: 'オーナー権限を譲渡しました' };
  } catch (error) {
    logger.error('Error transferring ownership:', error);
    throw error;
  }
};
