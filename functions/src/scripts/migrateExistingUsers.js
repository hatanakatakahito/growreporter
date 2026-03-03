import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

/**
 * 既存ユーザーのマイグレーションスクリプト
 * 全ユーザーに accountOwnerId と memberRole を設定し、accountMembers コレクションに追加
 * 
 * 実行方法:
 * node --loader ./loader.mjs src/scripts/migrateExistingUsers.js
 */

initializeApp();

async function migrateExistingUsers() {
  const db = getFirestore();
  
  console.log('既存ユーザーのマイグレーションを開始します...');
  
  try {
    // 全ユーザーを取得
    const usersSnapshot = await db.collection('users').get();
    console.log(`対象ユーザー数: ${usersSnapshot.size}`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const userDoc of usersSnapshot.docs) {
      try {
        const userId = userDoc.id;
        const userData = userDoc.data();
        
        // 既にaccountOwnerIdが設定されている場合はスキップ
        if (userData.accountOwnerId && userData.memberRole) {
          console.log(`スキップ: ${userData.email} (既に設定済み)`);
          continue;
        }
        
        console.log(`処理中: ${userData.email} (${userId})`);
        
        // 1. usersドキュメントを更新
        await userDoc.ref.update({
          accountOwnerId: userId,  // 自分自身をオーナーに
          memberRole: 'owner',
          updatedAt: FieldValue.serverTimestamp()
        });
        
        // 2. accountMembersに追加（既に存在する場合はスキップ）
        const existingMember = await db.collection('accountMembers')
          .where('accountOwnerId', '==', userId)
          .where('userId', '==', userId)
          .limit(1)
          .get();
        
        if (existingMember.empty) {
          const displayName = userData.name || (userData.lastName && userData.firstName
            ? `${userData.lastName} ${userData.firstName}`
            : '') || userData.displayName || userData.email;
          
          await db.collection('accountMembers').add({
            accountOwnerId: userId,
            userId: userId,
            email: userData.email || '',
            displayName,
            role: 'owner',
            status: 'active',
            invitedAt: userData.createdAt || FieldValue.serverTimestamp(),
            invitedBy: userId,
            acceptedAt: userData.createdAt || FieldValue.serverTimestamp(),
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp()
          });
          
          console.log(`✓ 完了: ${userData.email}`);
          successCount++;
        } else {
          console.log(`スキップ: ${userData.email} (accountMembers既存)`);
        }
      } catch (error) {
        console.error(`✗ エラー: ${userDoc.id}`, error.message);
        errorCount++;
      }
    }
    
    console.log('\n=== マイグレーション完了 ===');
    console.log(`成功: ${successCount} 件`);
    console.log(`エラー: ${errorCount} 件`);
    console.log(`スキップ: ${usersSnapshot.size - successCount - errorCount} 件`);
    
  } catch (error) {
    console.error('マイグレーション中にエラーが発生しました:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

migrateExistingUsers();
