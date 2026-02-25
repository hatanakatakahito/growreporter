import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { logger } from 'firebase-functions/v2';
import { sendEmailDirect } from '../utils/emailSender.js';

/**
 * メンバーを削除
 * 
 * @param {Object} data - リクエストパラメータ
 * @param {string} data.userId - 削除するユーザーのUID
 * @returns {Object} 削除結果
 */
export const removeMemberCallable = async (request) => {
  const uid = request.auth?.uid;

  if (!uid) {
    throw new HttpsError('unauthenticated', 'ユーザー認証が必要です');
  }

  const { userId } = request.data || {};

  if (!userId) {
    throw new HttpsError('invalid-argument', 'ユーザーIDが必要です');
  }

  try {
    const db = getFirestore();
    
    // 1. オーナー情報を取得
    const ownerDoc = await db.collection('users').doc(uid).get();
    if (!ownerDoc.exists) {
      throw new HttpsError('not-found', 'ユーザーが見つかりません');
    }
    
    const ownerData = ownerDoc.data();
    const accountOwnerId = ownerData.accountOwnerId || uid;
    const memberships = ownerData.memberships || {};
    
    // 2. オーナーかチェック
    const ownerMembership = memberships[accountOwnerId];
    if (!ownerMembership || ownerMembership.role !== 'owner') {
      throw new HttpsError('permission-denied', 'オーナーのみメンバーを削除できます');
    }
    
    // 3. 削除対象のメンバー情報を取得
    const memberDoc = await db.collection('users').doc(userId).get();
    if (!memberDoc.exists) {
      throw new HttpsError('not-found', 'メンバーが見つかりません');
    }
    
    const memberData = memberDoc.data();
    const memberMemberships = memberData.memberships || {};
    
    // 4. このアカウントのメンバーかチェック
    if (!memberMemberships[accountOwnerId]) {
      throw new HttpsError('not-found', 'このメンバーはアカウントに所属していません');
    }
    
    // 5. オーナー自身は削除不可
    if (memberMemberships[accountOwnerId].role === 'owner') {
      throw new HttpsError('invalid-argument', 'オーナーは削除できません');
    }
    
    // 6. membership から削除し、トップレベルの accountOwnerId / memberRole / joinedAt / invitedBy / invitedByName をクリア
    delete memberMemberships[accountOwnerId];
    const updateData = {
      memberships: memberMemberships,
      updatedAt: FieldValue.serverTimestamp()
    };
    updateData.accountOwnerId = FieldValue.delete();
    updateData.memberRole = FieldValue.delete();
    updateData.joinedAt = FieldValue.delete();
    updateData.invitedBy = FieldValue.delete();
    updateData.invitedByName = FieldValue.delete();
    await memberDoc.ref.update(updateData);
    
    // 7. メンバー削除通知メールを送信
    const companyName = ownerData.company || 'アカウント';
    const displayName = memberData.displayName || `${memberData.lastName} ${memberData.firstName}`;
    const subject = `【グローレポータ】${companyName} のメンバーから削除されました`;
    const html = `
<!DOCTYPE html>
<html lang="ja">
<body style="font-family: sans-serif; padding: 20px; background-color: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 30px; border-radius: 8px;">
    <h2 style="color: #1f2937;">メンバーから削除されました</h2>
    <p>${displayName} さん、</p>
    <p>${companyName} のメンバーから削除されました。今後、このアカウントのサイトにはアクセスできません。</p>
    <p>ご質問がある場合は、アカウントオーナーにお問い合わせください。</p>
  </div>
</body>
</html>
    `;
    
    try {
      await sendEmailDirect({ to: memberData.email, subject, html });
    } catch (emailError) {
      logger.warn('Failed to send removal notification email:', emailError);
    }
    
    // 8. 他に所属しているアカウントがない場合のみ、ユーザーを完全削除
    if (Object.keys(memberMemberships).length === 0) {
      try {
        // users ドキュメントを削除
        await db.collection('users').doc(userId).delete();
        logger.info('Deleted user document from Firestore', { userId });
        
        // Firebase Authentication からユーザーを削除
        await getAuth().deleteUser(userId);
        logger.info('Deleted user from Firebase Authentication', { userId });
      } catch (deleteError) {
        logger.error('Failed to delete user completely:', deleteError);
      }
    }
    
    logger.info('Member removed from account', { userId, accountOwnerId });
    
    return { success: true, message: 'メンバーを削除しました' };
  } catch (error) {
    logger.error('Error removing member:', error);
    throw error;
  }
};
