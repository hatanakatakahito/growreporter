import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { logger } from 'firebase-functions/v2';
import { v4 as uuidv4 } from 'uuid';
import { sendEmailDirect } from '../utils/emailSender.js';
import { escapeHtml, escapeHtmlAndValidateUrl } from '../utils/htmlEscape.js';
import { enforceRateLimit, DEFAULT_RATE_LIMITS } from '../utils/rateLimiter.js';

/**
 * メンバーを招待
 * 
 * @param {Object} data - リクエストパラメータ
 * @param {string} data.email - 招待するメールアドレス
 * @param {string} data.role - 権限 (editor/viewer)
 * @returns {Object} 招待結果
 */
export const inviteMemberCallable = async (request) => {
  const uid = request.auth?.uid;

  if (!uid) {
    throw new HttpsError('unauthenticated', 'ユーザー認証が必要です');
  }

  // セキュリティ (Phase 4-A-2): レート制限。スパム踏み台防止
  await enforceRateLimit({ uid, ...DEFAULT_RATE_LIMITS.inviteMember });

  const {
    email,
    role = 'viewer',
    allowedSiteIds = [],
  } = request.data || {};

  if (!email) {
    throw new HttpsError('invalid-argument', 'メールアドレスが必要です');
  }

  if (!['editor', 'viewer'].includes(role)) {
    throw new HttpsError('invalid-argument', '無効な権限です');
  }

  // editor / viewer どちらも招待時に対象サイトを 1 つ以上指定する必要がある
  // （オーナー以外はサイト指定式）
  if (role === 'editor' || role === 'viewer') {
    if (!Array.isArray(allowedSiteIds) || allowedSiteIds.length === 0) {
      throw new HttpsError('invalid-argument', '対象のサイトを 1 つ以上選択してください');
    }
  }

  try {
    const db = getFirestore();
    const auth = getAuth();
    
    // 1. ユーザー情報を取得（オーナーかチェック）
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      throw new HttpsError('not-found', 'ユーザーが見つかりません');
    }
    
    const userData = userDoc.data();
    const memberRole = userData.memberRole || 'owner'; // デフォルトはowner
    
    if (memberRole !== 'owner') {
      throw new HttpsError('permission-denied', 'オーナーのみメンバーを招待できます');
    }
    
    const accountOwnerId = userData.accountOwnerId || uid;
    
    // 2. プラン制限チェック
    //    パフォーマンス改善: 旧実装は users コレクション全件走査 (O(N)) していた。
    //    accountMembers の active メンバー件数をクエリで取得する (O(1) wrt total users)。
    //    accountMembers が無い古いアカウントへのフォールバックとして pending invitation 数を加算。
    const [activeMembersSnap, pendingInvSnap] = await Promise.all([
      db.collection('accountMembers')
        .where('accountOwnerId', '==', accountOwnerId)
        .where('status', '==', 'active')
        .get(),
      db.collection('invitations')
        .where('accountOwnerId', '==', accountOwnerId)
        .where('status', '==', 'pending')
        .get(),
    ]);

    const currentMemberCount = activeMembersSnap.size + pendingInvSnap.size;

    const rawPlan = userData.plan || 'free';
    const plan = (rawPlan === 'standard' || rawPlan === 'premium' || rawPlan === 'paid') ? 'business' : rawPlan;
    // CLAUDE.md 仕様: free=3 / business=実質無制限。customLimits によるオーバーライドは別途 planManager で吸収
    const limits = { free: 3, business: 999999 };

    if (currentMemberCount >= limits[plan]) {
      throw new HttpsError('resource-exhausted',
        `プランの上限（${limits[plan]}人）に達しています`);
    }
    
    // 3. 既に招待済みかチェック
    const existingInvitation = await db.collection('invitations')
      .where('accountOwnerId', '==', accountOwnerId)
      .where('email', '==', email.toLowerCase())
      .where('status', '==', 'pending')
      .get();
    
    if (!existingInvitation.empty) {
      throw new HttpsError('already-exists', 'このメールアドレスは既に招待済みです');
    }
    
    // 4. 既にメンバーかチェック（users.memberships を確認）
    const targetUsersSnapshot = await db.collection('users')
      .where('email', '==', email.toLowerCase())
      .limit(1)
      .get();
    
    if (!targetUsersSnapshot.empty) {
      const targetUserDoc = targetUsersSnapshot.docs[0];
      const targetUserData = targetUserDoc.data();
      const targetMemberships = targetUserData.memberships || {};
      
      if (targetMemberships[accountOwnerId]) {
        throw new HttpsError('already-exists', 'このユーザーは既にメンバーです');
      }
    }
    
    // 4.5 editor/viewer の場合、allowedSiteIds が実際に accountOwnerId のサイトであることを検証
    let validatedAllowedSiteIds = [];
    if ((role === 'editor' || role === 'viewer') && allowedSiteIds.length > 0) {
      const siteSnaps = await Promise.all(
        allowedSiteIds.map((sid) => db.collection('sites').doc(sid).get())
      );
      const ownedSiteIds = siteSnaps
        .filter((s) => s.exists && s.data().userId === accountOwnerId)
        .map((s) => s.id);
      if (ownedSiteIds.length !== allowedSiteIds.length) {
        throw new HttpsError('invalid-argument', '指定したサイトの一部があなたのアカウントに存在しません');
      }
      validatedAllowedSiteIds = ownedSiteIds;
    }

    // 5. 招待トークンを生成
    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7日間有効

    // 6. 招待ドキュメントを作成
    const invitationData = {
      accountOwnerId,
      email: email.toLowerCase(),
      role,
      token,
      status: 'pending',
      expiresAt: Timestamp.fromDate(expiresAt),
      invitedBy: uid,
      invitedByName: userData.name || `${userData.lastName || ''} ${userData.firstName || ''}`.trim() || userData.email,
      accountOwnerName: userData.company || 'グローレポータ',
      createdAt: FieldValue.serverTimestamp()
    };
    if (role === 'editor' || role === 'viewer') {
      invitationData.allowedSiteIds = validatedAllowedSiteIds;
    }
    const invitationRef = await db.collection('invitations').add(invitationData);
    
    // 7. 招待メールを送信（Trigger Email 拡張用: subject + text 必須の場合は text も渡す）
    const appUrl = process.env.APP_URL || 'https://grow-reporter.com';
    const invitationUrl = `${appUrl}/accept-invitation?token=${token}`;
    const subject = `【グローレポータ】${userData.company || 'グローレポータ'} への招待`;
    const html = generateInvitationEmailHtml({
      inviterName: userData.name || `${userData.lastName || ''} ${userData.firstName || ''}`.trim() || userData.email,
      companyName: userData.company || 'グローレポータ',
      role: role === 'editor' ? '編集者' : '閲覧者',
      allowedSiteCount: (role === 'editor' || role === 'viewer') ? validatedAllowedSiteIds.length : null,
      invitationUrl,
      expiresAt: expiresAt.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
    });

    try {
      await sendEmailDirect({
        to: email,
        subject,
        text: subject + '\n\n招待リンク: ' + invitationUrl,
        html,
      });
    } catch (mailError) {
      logger.warn('Invitation mail send failed (invitation was created)', { error: mailError?.message, email });
    }

    logger.info('Member invited', {
      accountOwnerId,
      email,
      role,
      invitationId: invitationRef.id,
    });

    return {
      success: true,
      message: '招待メールを送信しました',
      invitationId: invitationRef.id,
    };
  } catch (error) {
    logger.error('Error inviting member:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', error?.message || '招待の処理中にエラーが発生しました');
  }
};

/**
 * 招待メールHTMLを生成
 */
function generateInvitationEmailHtml(data) {
  const { inviterName, companyName, role, allowedSiteCount, invitationUrl, expiresAt } = data;

  // XSS 対策: HTML 文脈に展開する変数は escape 必須
  const inviterNameH = escapeHtml(inviterName);
  const companyNameH = escapeHtml(companyName);
  const roleH = escapeHtml(role);
  const expiresAtH = escapeHtml(expiresAt);
  const invitationUrlH = escapeHtmlAndValidateUrl(invitationUrl);

  const accessScopeText = (allowedSiteCount != null)
    ? `指定された ${escapeHtml(allowedSiteCount)} サイトのみ${role === '編集者' ? '編集・閲覧' : '閲覧'}可能です`
    : `${companyNameH} の全サイトのデータにアクセスできるようになります`;

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
            <td style="background-color: #3758F9; padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">グローレポータ</h1>
              <p style="margin: 10px 0 0 0; color: #e0e7ff; font-size: 14px;">メンバー招待</p>
            </td>
          </tr>

          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px 0; color: #1f2937; font-size: 20px; font-weight: 700;">
                ${inviterNameH} さんから招待が届いています
              </h2>

              <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                <strong>${companyNameH}</strong> のメンバーとして招待されました。
              </p>

              <div style="background-color: #f9fafb; border-left: 4px solid #3758F9; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; color: #374151; font-size: 14px;">
                  <strong>権限:</strong> ${roleH}
                </p>
              </div>

              <p style="margin: 20px 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                招待を承認すると、${accessScopeText}。
              </p>

              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${invitationUrlH}" style="display: inline-block; background-color: #3758F9; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 16px; font-weight: 600;">
                      招待を承認する
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 16px 0 0 0; color: #6b7280; font-size: 13px; line-height: 1.6;">
                ボタンが表示されない場合は、以下のリンクをクリックしてください：<br>
                <a href="${invitationUrlH}" style="color: #3758F9; text-decoration: underline; word-break: break-all;">${invitationUrlH}</a>
              </p>
              <p style="margin: 20px 0 0 0; color: #9ca3af; font-size: 13px; line-height: 1.6;">
                ※ この招待は <strong>${expiresAtH}</strong> まで有効です。<br>
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
