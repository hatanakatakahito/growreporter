import { getFirestore } from 'firebase-admin/firestore';

/**
 * ユーザーがサイトにアクセスする権限があるかチェック
 * 
 * @param {string} userId - チェックするユーザーのUID
 * @param {string} siteId - チェックするサイトのID
 * @returns {Promise<boolean>} - アクセス権限があればtrue
 */
export async function canAccessSite(userId, siteId) {
  const db = getFirestore();
  
  try {
    // 1. サイト情報を取得
    const siteDoc = await db.collection('sites').doc(siteId).get();
    
    if (!siteDoc.exists) {
      return false;
    }
    
    const siteData = siteDoc.data();
    const siteOwnerId = siteData.userId;
    
    // 2. サイトの直接所有者かチェック
    if (siteOwnerId === userId) {
      return true;
    }
    
    // 3. ユーザー情報を取得してメンバーシップをチェック
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return false;
    }
    
    const userData = userDoc.data();
    const memberships = userData.memberships || {};
    
    // 4. サイトオーナーのアカウントのメンバーかチェック
    if (memberships[siteOwnerId]) {
      return true;
    }
    
    // 5. 管理者権限をチェック
    const adminDoc = await db.collection('adminUsers').doc(userId).get();
    if (adminDoc.exists && ['admin', 'editor', 'viewer'].includes(adminDoc.data().role)) {
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error checking site access permission:', error);
    return false;
  }
}

/**
 * ユーザーがサイトを編集する権限があるかチェック
 * 
 * @param {string} userId - チェックするユーザーのUID
 * @param {string} siteId - チェックするサイトのID
 * @returns {Promise<boolean>} - 編集権限があればtrue
 */
export async function canEditSite(userId, siteId) {
  const db = getFirestore();
  
  try {
    // 1. サイト情報を取得
    const siteDoc = await db.collection('sites').doc(siteId).get();
    
    if (!siteDoc.exists) {
      return false;
    }
    
    const siteData = siteDoc.data();
    const siteOwnerId = siteData.userId;
    
    // 2. サイトの直接所有者かチェック
    if (siteOwnerId === userId) {
      return true;
    }
    
    // 3. ユーザー情報を取得してメンバーシップをチェック
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return false;
    }
    
    const userData = userDoc.data();
    const memberships = userData.memberships || {};
    
    // 4. サイトオーナーのアカウントのメンバーで、かつ編集者以上の権限があるかチェック
    if (memberships[siteOwnerId]) {
      const memberRole = memberships[siteOwnerId].role;
      if (memberRole === 'owner' || memberRole === 'editor') {
        return true;
      }
    }
    
    // 5. 管理者権限をチェック（admin/editorのみ）
    const adminDoc = await db.collection('adminUsers').doc(userId).get();
    if (adminDoc.exists && ['admin', 'editor'].includes(adminDoc.data().role)) {
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error checking site edit permission:', error);
    return false;
  }
}
