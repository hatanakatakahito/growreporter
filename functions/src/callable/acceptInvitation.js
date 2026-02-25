import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { logger } from 'firebase-functions/v2';
import { sendEmailDirect } from '../utils/emailSender.js';

/**
 * 招待を承認
 * 
 * @param {Object} data - リクエストパラメータ
 * @param {string} data.token - 招待トークン
 * @returns {Object} 承認結果
 */
export const acceptInvitationCallable = async (request) => {
  const uid = request.auth?.uid;

  if (!uid) {
    throw new HttpsError('unauthenticated', 'ユーザー認証が必要です');
  }

  const { token } = request.data || {};

  if (!token) {
    throw new HttpsError('invalid-argument', 'トークンが必要です');
  }

  try {
    const db = getFirestore();
    const auth = getAuth();
    
    // 1. 招待を検索
    const invitationsSnapshot = await db.collection('invitations')
      .where('token', '==', token)
      .where('status', '==', 'pending')
      .limit(1)
      .get();
    
    if (invitationsSnapshot.empty) {
      throw new HttpsError('not-found', '招待が見つかりません');
    }
    
    const invitationDoc = invitationsSnapshot.docs[0];
    const invitation = invitationDoc.data();
    
    // 2. 有効期限チェック
    if (invitation.expiresAt.toDate() < new Date()) {
      await invitationDoc.ref.update({ status: 'expired' });
      throw new HttpsError('deadline-exceeded', '招待の有効期限が切れています');
    }

    // 3. ユーザー情報を取得
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      throw new HttpsError('not-found', 'ユーザー情報が見つかりません');
    }
    
    const userData = userDoc.data();
    const memberships = userData.memberships || {};
    
    // 4. 既にメンバーかチェック（既にメンバーならそのまま成功として返す＝招待リンクの再クリックに対応）
    if (memberships[invitation.accountOwnerId]) {
      return { success: true, message: '既にメンバーです' };
    }

    // 5. users ドキュメントに membership とトップレベル項目を追加（accountOwnerId / joinedAt / invitedBy / invitedByName）
    memberships[invitation.accountOwnerId] = {
      role: invitation.role,
      joinedAt: FieldValue.serverTimestamp(),
      invitedBy: invitation.invitedBy,
      invitedByName: invitation.invitedByName || ''
    };
    
    const joinedAt = FieldValue.serverTimestamp();
    await db.collection('users').doc(uid).update({
      accountOwnerId: invitation.accountOwnerId,
      memberRole: invitation.role,
      joinedAt,
      invitedBy: invitation.invitedBy ?? null,
      invitedByName: invitation.invitedByName || null,
      memberships,
      updatedAt: FieldValue.serverTimestamp()
    });
    
    // 6. 招待ステータスを更新
    await invitationDoc.ref.update({
      status: 'accepted',
      acceptedAt: FieldValue.serverTimestamp()
    });
    
    // 7. オーナーに通知メールを送信
    try {
      const ownerDoc = await db.collection('users').doc(invitation.accountOwnerId).get();
      if (ownerDoc.exists) {
        const ownerData = ownerDoc.data();
        const ownerEmail = ownerData.email;
        const memberName = `${userData.lastName || ''} ${userData.firstName || ''}`.trim() || userData.email;
        const roleText = invitation.role === 'editor' ? '編集者' : '閲覧者';
        
        const subject = `【グローレポータ】${memberName} さんがメンバーに参加しました`;
        const html = generateMemberAddedEmailHtml({
          ownerName: `${ownerData.lastName || ''} ${ownerData.firstName || ''}`.trim() || ownerData.email,
          memberName,
          memberEmail: userData.email,
          role: roleText,
          companyName: ownerData.company || 'グローレポータ'
        });
        
        await sendEmailDirect({
          to: ownerEmail,
          subject,
          text: `${memberName} さん（${userData.email}）が${roleText}としてメンバーに参加しました。`,
          html
        });
      }
    } catch (mailError) {
      logger.warn('Owner notification email failed', { error: mailError?.message });
    }
    
    logger.info('Invitation accepted', { 
      invitationId: invitationDoc.id,
      userId: uid,
      accountOwnerId: invitation.accountOwnerId
    });
    
    return { success: true, message: '招待を承認しました' };
  } catch (error) {
    logger.error('Error accepting invitation:', error);
    throw error;
  }
};

/**
 * メンバー追加通知メールHTMLを生成（オーナー宛）
 */
function generateMemberAddedEmailHtml(data) {
  const { ownerName, memberName, memberEmail, role, companyName } = data;
  
  return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, 'Yu Gothic', 'Hiragino Sans', Meiryo, sans-serif; background-color: #f3f4f6;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table cellpadding="0" cellspacing="0" border="0" width="600" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">グローレポータ</h1>
              <p style="margin: 10px 0 0 0; color: #e0e7ff; font-size: 14px;">メンバー参加通知</p>
            </td>
          </tr>

          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px 0; color: #1f2937; font-size: 20px; font-weight: 700;">
                ${ownerName} 様
              </h2>
              
              <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                <strong>${companyName}</strong> に新しいメンバーが参加しました。
              </p>
              
              <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0;">
                <p style="margin: 0 0 8px 0; color: #374151; font-size: 14px;">
                  <strong>メンバー名:</strong> ${memberName}
                </p>
                <p style="margin: 0 0 8px 0; color: #374151; font-size: 14px;">
                  <strong>メールアドレス:</strong> ${memberEmail}
                </p>
                <p style="margin: 0; color: #374151; font-size: 14px;">
                  <strong>権限:</strong> ${role}
                </p>
              </div>
              
              <p style="margin: 20px 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                メンバー管理画面から、権限の変更や削除が可能です。
              </p>
              
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${process.env.APP_URL || 'https://grow-reporter.com'}/members" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 16px; font-weight: 600;">
                      メンバー管理を開く
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="background-color: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                © 2026 グローレポータ by Grow Group
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}
