import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';

/**
 * accountMembers コレクションから users コレクションの memberships へマイグレーション
 * 
 * 実行方法:
 * 1. Firebase Functions にデプロイ
 * 2. Firebase Console から手動実行
 * または
 * 1. このファイルを単独スクリプトとして実行
 */
export async function migrateAccountMembersToUsers() {
  const db = getFirestore();
  
  try {
    logger.info('Starting migration from accountMembers to users.memberships');
    
    // 1. accountMembers コレクションの全データを取得
    const accountMembersSnapshot = await db.collection('accountMembers').get();
    
    if (accountMembersSnapshot.empty) {
      logger.info('No accountMembers found. Migration complete.');
      return { success: true, migrated: 0, message: 'No data to migrate' };
    }
    
    let migratedCount = 0;
    let errorCount = 0;
    const batch = db.batch();
    let batchCount = 0;
    
    // 2. 各 accountMember を処理
    for (const doc of accountMembersSnapshot.docs) {
      const memberData = doc.data();
      const { userId, accountOwnerId, role, invitedBy, invitedByName, acceptedAt, status } = memberData;
      
      // status が active でないものはスキップ
      if (status !== 'active') {
        logger.info(`Skipping inactive member: ${doc.id}`);
        continue;
      }
      
      if (!userId || !accountOwnerId) {
        logger.warn(`Missing userId or accountOwnerId in document: ${doc.id}`);
        errorCount++;
        continue;
      }
      
      try {
        // 3. users ドキュメントを取得
        const userRef = db.collection('users').doc(userId);
        const userDoc = await userRef.get();
        
        if (!userDoc.exists) {
          logger.warn(`User document not found: ${userId}`);
          errorCount++;
          continue;
        }
        
        const userData = userDoc.data();
        const memberships = userData.memberships || {};
        
        // 4. membership を追加（既に存在する場合はスキップ）
        if (memberships[accountOwnerId]) {
          logger.info(`Membership already exists for user ${userId} in account ${accountOwnerId}`);
          continue;
        }
        
        memberships[accountOwnerId] = {
          role: role || 'viewer',
          joinedAt: acceptedAt || FieldValue.serverTimestamp(),
          invitedBy: invitedBy || '',
          invitedByName: invitedByName || ''
        };
        
        // 5. batch に追加
        batch.update(userRef, {
          memberships,
          updatedAt: FieldValue.serverTimestamp()
        });
        
        batchCount++;
        migratedCount++;
        
        // 6. batch が 500 件に達したらコミット（Firestore の制限）
        if (batchCount >= 500) {
          await batch.commit();
          logger.info(`Committed batch of ${batchCount} updates`);
          batchCount = 0;
        }
        
      } catch (error) {
        logger.error(`Error processing member ${doc.id}:`, error);
        errorCount++;
      }
    }
    
    // 7. 残りの batch をコミット
    if (batchCount > 0) {
      await batch.commit();
      logger.info(`Committed final batch of ${batchCount} updates`);
    }
    
    logger.info(`Migration complete. Migrated: ${migratedCount}, Errors: ${errorCount}`);
    
    return {
      success: true,
      migrated: migratedCount,
      errors: errorCount,
      message: `Successfully migrated ${migratedCount} members. ${errorCount} errors.`
    };
    
  } catch (error) {
    logger.error('Migration failed:', error);
    throw error;
  }
}
