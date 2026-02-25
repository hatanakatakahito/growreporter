import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { sendEmailDirect } from '../utils/emailSender.js';

/**
 * 招待を再送信
 * 
 * @param {Object} data - リクエストパラメータ
 * @param {string} data.invitationId - 招待ID
 * @returns {Object} 再送信結果
 */
export const resendInvitationCallable = async (request) => {
  const uid = request.auth?.uid;

  if (!uid) {
    throw new HttpsError('unauthenticated', 'ユーザー認証が必要です');
  }

  const { invitationId } = request.data || {};

  if (!invitationId) {
    throw new HttpsError('invalid-argument', '招待IDが必要です');
  }

  try {
    const db = getFirestore();
    
    // 1. 招待情報を取得
    const invitationDoc = await db.collection('invitations').doc(invitationId).get();
    if (!invitationDoc.exists) {
      throw new HttpsError('not-found', '招待が見つかりません');
    }
    
    const invitation = invitationDoc.data();
    
    // 2. オーナーかチェック
    const userDoc = await db.collection('users').doc(uid).get();
    const userData = userDoc.data();
    const memberRole = userData.memberRole || 'owner';
    const accountOwnerId = userData.accountOwnerId || uid;
    
    if (memberRole !== 'owner' || invitation.accountOwnerId !== accountOwnerId) {
      throw new HttpsError('permission-denied', 'オーナーのみ招待を再送信できます');
    }
    
    // 3. 保留中の招待のみ再送信可能
    if (invitation.status !== 'pending') {
      throw new HttpsError('invalid-argument', '保留中の招待のみ再送信できます');
    }
    
    // 4. 招待メールを再送信（Trigger Email 拡張用: text も渡す）
    const appUrl = process.env.APP_URL || 'https://grow-reporter.com';
    const invitationUrl = `${appUrl}/accept-invitation?token=${invitation.token}`;
    const subject = `【グローレポータ】${invitation.accountOwnerName} への招待`;
    const html = generateInvitationEmailHtml({
      inviterName: invitation.invitedByName,
      companyName: invitation.accountOwnerName,
      role: invitation.role === 'editor' ? '編集者' : '閲覧者',
      invitationUrl,
      expiresAt: invitation.expiresAt.toDate().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
    });

    await sendEmailDirect({
      to: invitation.email,
      subject,
      text: subject + '\n\n招待リンク: ' + invitationUrl,
      html,
    });
    
    logger.info('Invitation resent', { invitationId });
    
    return { success: true, message: '招待メールを再送信しました' };
  } catch (error) {
    logger.error('Error resending invitation:', error);
    throw error;
  }
};

/**
 * 招待メールHTMLを生成
 */
function generateInvitationEmailHtml(data) {
  const { inviterName, companyName, role, invitationUrl, expiresAt } = data;
  
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
            <td style="background-color: #667eea; padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">グローレポータ</h1>
              <p style="margin: 10px 0 0 0; color: #e0e7ff; font-size: 14px;">メンバー招待</p>
            </td>
          </tr>

          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px 0; color: #1f2937; font-size: 20px; font-weight: 700;">
                ${inviterName} さんから招待が届いています
              </h2>
              
              <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                <strong>${companyName}</strong> のメンバーとして招待されました。
              </p>
              
              <div style="background-color: #f9fafb; border-left: 4px solid #667eea; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; color: #374151; font-size: 14px;">
                  <strong>権限:</strong> ${role}
                </p>
              </div>
              
              <p style="margin: 20px 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                招待を承認すると、${companyName} の全サイトのデータにアクセスできるようになります。
              </p>
              
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${invitationUrl}" style="display: inline-block; background-color: #667eea; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 16px; font-weight: 600;">
                      招待を承認する
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 16px 0 0 0; color: #6b7280; font-size: 13px; line-height: 1.6;">
                ボタンが表示されない場合は、以下のリンクをクリックしてください：<br>
                <a href="${invitationUrl}" style="color: #667eea; text-decoration: underline; word-break: break-all;">${invitationUrl}</a>
              </p>
              <p style="margin: 20px 0 0 0; color: #9ca3af; font-size: 13px; line-height: 1.6;">
                ※ この招待は <strong>${expiresAt}</strong> まで有効です。<br>
                ※ グローレポータのアカウントをお持ちでない場合は、まず新規登録を行ってから招待を承認してください。
              </p>
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
