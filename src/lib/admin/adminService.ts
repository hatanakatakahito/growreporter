/**
 * 👤 管理者サービス
 * 管理者専用の機能を提供
 */

import { firestore } from '@/lib/firebase/config';
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  query,
  orderBy,
  limit,
  Timestamp,
  where,
} from 'firebase/firestore';
import { UserProfile } from '@/types/user';
import { UserActivityLog } from '@/types/user';

export interface AdminUserListItem {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  createdAt: Timestamp;
  lastLoginAt: Timestamp | null;
  subscriptionPlan: 'free' | 'pro' | 'enterprise';
  subscriptionStatus: 'active' | 'inactive' | 'cancelled' | 'trial';
  roles: {
    isAdmin: boolean;
    isEditor: boolean;
    isViewer: boolean;
  };
  metadata: {
    emailVerified: boolean;
    onboardingCompleted: boolean;
  };
}

export class AdminService {
  /**
   * 全ユーザーリストを取得
   */
  static async getAllUsers(): Promise<AdminUserListItem[]> {
    try {
      const usersSnapshot = await getDocs(collection(firestore, 'users'));
      const users: AdminUserListItem[] = [];

      for (const userDoc of usersSnapshot.docs) {
        const profileRef = doc(firestore, `users/${userDoc.id}/profile/data`);
        const profileSnap = await getDocs(collection(firestore, `users/${userDoc.id}/profile`));
        
        if (!profileSnap.empty) {
          const profileDoc = profileSnap.docs.find(d => d.id === 'data');
          if (profileDoc) {
            const profile = profileDoc.data() as UserProfile;
            users.push({
              uid: profile.uid,
              email: profile.email,
              displayName: profile.displayName,
              photoURL: profile.photoURL,
              createdAt: profile.metadata.createdAt,
              lastLoginAt: profile.usage?.lastLogin || null,
              subscriptionPlan: profile.subscription.plan,
              subscriptionStatus: profile.subscription.status,
              roles: profile.roles,
              metadata: {
                emailVerified: profile.metadata.emailVerified,
                onboardingCompleted: profile.metadata.onboardingCompleted,
              },
            });
          }
        }
      }

      // 作成日時で降順ソート（新しいユーザーが先頭）
      users.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());

      return users;
    } catch (error) {
      console.error('❌ ユーザーリスト取得エラー:', error);
      throw error;
    }
  }

  /**
   * ユーザーのサブスクリプションステータスを変更
   */
  static async updateUserSubscriptionStatus(
    userId: string,
    status: 'active' | 'inactive' | 'cancelled' | 'trial'
  ): Promise<void> {
    try {
      const profileRef = doc(firestore, `users/${userId}/profile/data`);
      await updateDoc(profileRef, {
        'subscription.status': status,
        'metadata.updatedAt': Timestamp.now(),
      });

      console.log('✅ ユーザーサブスクリプションステータス更新完了:', { userId, status });
    } catch (error) {
      console.error('❌ ユーザーサブスクリプションステータス更新エラー:', error);
      throw error;
    }
  }

  /**
   * ユーザーのサブスクリプションプランを変更
   */
  static async updateUserSubscriptionPlan(
    userId: string,
    plan: 'free' | 'pro' | 'enterprise'
  ): Promise<void> {
    try {
      const profileRef = doc(firestore, `users/${userId}/profile/data`);
      await updateDoc(profileRef, {
        'subscription.plan': plan,
        'metadata.updatedAt': Timestamp.now(),
      });

      console.log('✅ ユーザーサブスクリプションプラン更新完了:', { userId, plan });
    } catch (error) {
      console.error('❌ ユーザーサブスクリプションプラン更新エラー:', error);
      throw error;
    }
  }

  /**
   * ユーザーの管理者権限を変更
   */
  static async updateUserAdminRole(
    userId: string,
    isAdmin: boolean
  ): Promise<void> {
    try {
      const profileRef = doc(firestore, `users/${userId}/profile/data`);
      await updateDoc(profileRef, {
        'roles.isAdmin': isAdmin,
        'metadata.updatedAt': Timestamp.now(),
      });

      console.log('✅ ユーザー管理者権限更新完了:', { userId, isAdmin });
    } catch (error) {
      console.error('❌ ユーザー管理者権限更新エラー:', error);
      throw error;
    }
  }

  /**
   * ユーザーのアクティビティログを取得
   */
  static async getUserActivityLogs(
    userId: string,
    limitCount: number = 50
  ): Promise<UserActivityLog[]> {
    try {
      const logsRef = collection(firestore, `users/${userId}/activityLogs`);
      const q = query(logsRef, orderBy('timestamp', 'desc'), limit(limitCount));
      const snapshot = await getDocs(q);

      const logs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as UserActivityLog[];

      return logs;
    } catch (error) {
      console.error('❌ ユーザーアクティビティログ取得エラー:', error);
      throw error;
    }
  }

  /**
   * 全ユーザーの最新アクティビティログを取得
   */
  static async getAllRecentActivityLogs(limitCount: number = 100): Promise<(UserActivityLog & { userEmail: string })[]> {
    try {
      const usersSnapshot = await getDocs(collection(firestore, 'users'));
      const allLogs: (UserActivityLog & { userEmail: string })[] = [];

      for (const userDoc of usersSnapshot.docs) {
        const profileRef = doc(firestore, `users/${userDoc.id}/profile/data`);
        const profileSnap = await getDocs(collection(firestore, `users/${userDoc.id}/profile`));
        
        let userEmail = 'unknown';
        if (!profileSnap.empty) {
          const profileDoc = profileSnap.docs.find(d => d.id === 'data');
          if (profileDoc) {
            userEmail = (profileDoc.data() as UserProfile).email;
          }
        }

        const logsRef = collection(firestore, `users/${userDoc.id}/activityLogs`);
        const q = query(logsRef, orderBy('timestamp', 'desc'), limit(10));
        const snapshot = await getDocs(q);

        snapshot.docs.forEach(doc => {
          allLogs.push({
            id: doc.id,
            userEmail,
            ...doc.data(),
          } as UserActivityLog & { userEmail: string });
        });
      }

      // タイムスタンプで降順ソート
      allLogs.sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis());

      return allLogs.slice(0, limitCount);
    } catch (error) {
      console.error('❌ 全ユーザーアクティビティログ取得エラー:', error);
      throw error;
    }
  }

  /**
   * ユーザーが管理者かどうかを確認
   */
  static async isUserAdmin(userId: string): Promise<boolean> {
    try {
      const profileRef = doc(firestore, `users/${userId}/profile/data`);
      const profileSnap = await getDocs(collection(firestore, `users/${userId}/profile`));
      
      if (!profileSnap.empty) {
        const profileDoc = profileSnap.docs.find(d => d.id === 'data');
        if (profileDoc) {
          const profile = profileDoc.data() as UserProfile;
          return profile.roles?.isAdmin || false;
        }
      }
      return false;
    } catch (error) {
      console.error('❌ 管理者権限確認エラー:', error);
      return false;
    }
  }
}





