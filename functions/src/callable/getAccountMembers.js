import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';

/**
 * アカウントのメンバー一覧を取得
 * 
 * @returns {Object} メンバーと招待の一覧
 */
export const getAccountMembersCallable = async (request) => {
  const uid = request.auth?.uid;

  if (!uid) {
    throw new HttpsError('unauthenticated', 'ユーザー認証が必要です');
  }

  try {
    const db = getFirestore();
    
    // 1. 自分のユーザー情報を取得
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      throw new HttpsError('not-found', 'ユーザーが見つかりません');
    }
    
    const userData = userDoc.data();
    const memberships = userData.memberships || {};
    const accountOwnerIds = Object.keys(memberships);
    
    // accountOwnerId を決定（accountOwnerId 優先、次に memberships の先頭、なければ自分＝オーナー）
    let accountOwnerId;
    if (userData.accountOwnerId) {
      accountOwnerId = userData.accountOwnerId;
    } else if (accountOwnerIds.length > 0) {
      accountOwnerId = accountOwnerIds[0];
    } else {
      accountOwnerId = uid;
    }
    
    // 2. users を accountOwnerId でクエリしてメンバー一覧を取得
    const usersSnapshot = await db.collection('users')
      .where('accountOwnerId', '==', accountOwnerId)
      .get();
    
    let membersData = usersSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: doc.id,
        email: data.email,
        displayName: (data.lastName && data.firstName) ? `${data.lastName} ${data.firstName}` : data.displayName || `${data.lastName || ''} ${data.firstName || ''}`.trim(),
        role: data.memberRole || 'viewer',
        joinedAt: data.joinedAt ?? null,
        invitedBy: data.invitedBy ?? null,
        invitedByName: data.invitedByName ?? null,
        type: 'member',
      };
    });

    // オーナー本人が一覧に含まれていない場合（新規作成ユーザーで accountOwnerId 未設定など）はオーナーを先頭に追加し、ユーザードキュメントを自己修復
    const ownerInList = membersData.some((m) => m.userId === accountOwnerId);
    if (!ownerInList && accountOwnerId) {
      const ownerDoc = await db.collection('users').doc(accountOwnerId).get();
      if (ownerDoc.exists) {
        const data = ownerDoc.data();
        membersData = [
          {
            id: ownerDoc.id,
            userId: ownerDoc.id,
            email: data.email,
            displayName: (data.lastName && data.firstName) ? `${data.lastName} ${data.firstName}` : data.displayName || `${data.lastName || ''} ${data.firstName || ''}`.trim(),
            role: 'owner',
            joinedAt: data.joinedAt ?? null,
            invitedBy: data.invitedBy ?? null,
            invitedByName: data.invitedByName ?? null,
            type: 'member',
          },
          ...membersData,
        ];
        // 既存ユーザーで accountOwnerId 未設定の場合は Firestore を更新（次回以降のクエリでヒットするように）
        if (!data.accountOwnerId) {
          const now = FieldValue.serverTimestamp();
          await db.collection('users').doc(accountOwnerId).update({
            accountOwnerId,
            memberRole: 'owner',
            memberships: { [accountOwnerId]: { role: 'owner', joinedAt: now } },
            joinedAt: data.joinedAt || now,
            updatedAt: now,
          });
          logger.info('Owner document backfilled with accountOwnerId/memberRole/memberships', { accountOwnerId });
        }
      }
    }
    
    // role と joinedAt でソート（owner が先、その後は参加日時順）
    membersData.sort((a, b) => {
      if (a.role === 'owner') return -1;
      if (b.role === 'owner') return 1;
      const aTime = a.joinedAt?._seconds || 0;
      const bTime = b.joinedAt?._seconds || 0;
      return aTime - bTime;
    });
    
    // 3. 保留中の招待を取得
    const invitationsSnapshot = await db.collection('invitations')
      .where('accountOwnerId', '==', accountOwnerId)
      .where('status', '==', 'pending')
      .orderBy('createdAt', 'desc')
      .get();
    
    const invitationsData = invitationsSnapshot.docs.map((doc) => {
      const data = doc.data();
      const expiresAt = data.expiresAt?.toDate?.();
      const isExpired = expiresAt && expiresAt < new Date();
      return {
        id: doc.id,
        email: data.email,
        role: data.role,
        invitedBy: data.invitedBy,
        invitedByName: data.invitedByName,
        createdAt: data.createdAt,
        expiresAt: data.expiresAt,
        type: 'invitation',
        isExpired,
      };
    });
    
    logger.info('Account members fetched', {
      accountOwnerId,
      membersCount: membersData.length,
      invitationsCount: invitationsData.length
    });
    
    return {
      success: true,
      members: membersData,
      invitations: invitationsData,
      accountOwnerId
    };
  } catch (error) {
    logger.error('Error fetching account members:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', error?.message || 'メンバー情報の取得中にエラーが発生しました');
  }
};
