/**
 * 👤 ユーザープロファイル管理サービス
 * Firestoreを使用したユーザープロファイルCRUD操作
 */

import { firestore } from '@/lib/firebase/config';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  Timestamp,
  onSnapshot,
  Unsubscribe,
  collection,
  addDoc,
} from 'firebase/firestore';
import {
  UserProfile,
  CreateUserProfileRequest,
  UpdateUserProfileRequest,
  UserActivityLog,
  UserStats,
  DEFAULT_USER_PROFILE,
} from '@/types/user';

export class UserProfileService {
  /**
   * ユーザープロファイルを作成
   */
  static async createUserProfile(request: CreateUserProfileRequest): Promise<UserProfile> {
    try {
      const { uid, email, displayName, photoURL, firstName, lastName, company } = request;
      
      const now = Timestamp.now();
      
      const newProfile: UserProfile = {
        uid,
        email,
        displayName: displayName || null,
        photoURL: photoURL || null,
        profile: {
          ...DEFAULT_USER_PROFILE.profile,
          firstName: firstName || null,
          lastName: lastName || null,
          company: company || null,
        },
        preferences: { ...DEFAULT_USER_PROFILE.preferences },
        roles: { ...DEFAULT_USER_PROFILE.roles },
        subscription: {
          ...DEFAULT_USER_PROFILE.subscription,
          startDate: now,
          endDate: null,
        },
        usage: {
          ...DEFAULT_USER_PROFILE.usage,
          lastLogin: now,
          loginCount: 1,
        },
        metadata: {
          ...DEFAULT_USER_PROFILE.metadata,
          createdAt: now,
          updatedAt: now,
        },
      };
      
      const userRef = doc(firestore, `users/${uid}/profile/data`);
      await setDoc(userRef, newProfile);
      
      console.log('✅ ユーザープロファイル作成完了:', uid);
      
      // アクティビティログを記録
      await this.logActivity(uid, 'profile_created', 'auth', {
        email,
        displayName,
      });
      
      return newProfile;
      
    } catch (error) {
      console.error('❌ ユーザープロファイル作成エラー:', error);
      throw error;
    }
  }
  
  /**
   * ユーザープロファイルを取得
   */
  static async getUserProfile(uid: string): Promise<UserProfile | null> {
    try {
      const userRef = doc(firestore, `users/${uid}/profile/data`);
      const userSnapshot = await getDoc(userRef);
      
      if (userSnapshot.exists()) {
        return userSnapshot.data() as UserProfile;
      }
      
      console.warn('⚠️ ユーザープロファイルが見つかりません:', uid);
      return null;
      
    } catch (error) {
      console.error('❌ ユーザープロファイル取得エラー:', error);
      throw error;
    }
  }
  
  /**
   * ユーザープロファイルを更新
   */
  static async updateUserProfile(
    uid: string,
    updates: UpdateUserProfileRequest
  ): Promise<void> {
    try {
      const userRef = doc(firestore, `users/${uid}/profile/data`);
      
      const updateData: any = {
        'metadata.updatedAt': Timestamp.now(),
      };
      
      // displayName
      if (updates.displayName !== undefined) {
        updateData.displayName = updates.displayName;
      }
      
      // photoURL
      if (updates.photoURL !== undefined) {
        updateData.photoURL = updates.photoURL;
      }
      
      // profile フィールド
      if (updates.profile) {
        Object.entries(updates.profile).forEach(([key, value]) => {
          if (value !== undefined) {
            updateData[`profile.${key}`] = value;
          }
        });
      }
      
      // preferences フィールド
      if (updates.preferences) {
        Object.entries(updates.preferences).forEach(([key, value]) => {
          if (value !== undefined) {
            updateData[`preferences.${key}`] = value;
          }
        });
      }
      
      // settings フィールド
      if (updates.settings) {
        Object.entries(updates.settings).forEach(([key, value]) => {
          if (value !== undefined) {
            updateData[`settings.${key}`] = value;
          }
        });
      }
      
      // metadata フィールド
      if (updates.metadata) {
        Object.entries(updates.metadata).forEach(([key, value]) => {
          if (value !== undefined) {
            updateData[`metadata.${key}`] = value;
          }
        });
      }
      
      await updateDoc(userRef, updateData);
      
      console.log('✅ ユーザープロファイル更新完了:', uid);
      
      // アクティビティログを記録
      await this.logActivity(uid, 'profile_updated', 'settings', updates);
      
    } catch (error) {
      console.error('❌ ユーザープロファイル更新エラー:', error);
      throw error;
    }
  }
  
  /**
   * ログイン時刻を更新
   */
  static async updateLastLogin(uid: string): Promise<void> {
    try {
      const userRef = doc(firestore, `users/${uid}/profile/data`);
      
      await updateDoc(userRef, {
        'usage.lastLogin': Timestamp.now(),
        'usage.loginCount': (await getDoc(userRef)).data()?.usage?.loginCount + 1 || 1,
        'metadata.updatedAt': Timestamp.now(),
      });
      
      console.log('✅ ログイン時刻更新完了:', uid);
      
    } catch (error) {
      console.error('❌ ログイン時刻更新エラー:', error);
      // ログイン時刻の更新失敗はクリティカルではないので、エラーを投げない
    }
  }
  
  /**
   * オンボーディング完了フラグを更新
   */
  static async completeOnboarding(uid: string): Promise<void> {
    try {
      const userRef = doc(firestore, `users/${uid}/profile/data`);
      
      await updateDoc(userRef, {
        'metadata.onboardingCompleted': true,
        'metadata.updatedAt': Timestamp.now(),
      });
      
      console.log('✅ オンボーディング完了:', uid);
      
      await this.logActivity(uid, 'onboarding_completed', 'settings', {});
      
    } catch (error) {
      console.error('❌ オンボーディング完了更新エラー:', error);
      throw error;
    }
  }
  
  /**
   * 利用規約・プライバシーポリシー同意を記録
   */
  static async acceptTerms(uid: string): Promise<void> {
    try {
      const userRef = doc(firestore, `users/${uid}/profile/data`);
      const now = Timestamp.now();
      
      await updateDoc(userRef, {
        'metadata.termsAcceptedAt': now,
        'metadata.privacyPolicyAcceptedAt': now,
        'metadata.updatedAt': now,
      });
      
      console.log('✅ 利用規約同意記録完了:', uid);
      
      await this.logActivity(uid, 'terms_accepted', 'settings', {});
      
    } catch (error) {
      console.error('❌ 利用規約同意記録エラー:', error);
      throw error;
    }
  }
  
  /**
   * ユーザープロファイルをリアルタイム監視
   */
  static subscribeToUserProfile(
    uid: string,
    callback: (profile: UserProfile | null) => void
  ): Unsubscribe {
    const userRef = doc(firestore, `users/${uid}/profile/data`);
    
    return onSnapshot(userRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data() as UserProfile);
      } else {
        callback(null);
      }
    }, (error) => {
      console.error('❌ ユーザープロファイルリアルタイム監視エラー:', error);
      callback(null);
    });
  }
  
  /**
   * ユーザー統計を取得
   */
  static async getUserStats(uid: string): Promise<UserStats> {
    try {
      const statsRef = doc(firestore, `users/${uid}/stats/summary`);
      const statsSnapshot = await getDoc(statsRef);
      
      if (statsSnapshot.exists()) {
        return statsSnapshot.data() as UserStats;
      }
      
      // 統計がない場合はデフォルト値を返す
      return {
        totalKPIs: 0,
        activeKPIs: 0,
        achievedKPIs: 0,
        totalReports: 0,
        ga4PropertiesConnected: 0,
        gscSitesConnected: 0,
        lastAnalysisDate: null,
      };
      
    } catch (error) {
      console.error('❌ ユーザー統計取得エラー:', error);
      throw error;
    }
  }
  
  /**
   * ユーザー統計を更新
   */
  static async updateUserStats(
    uid: string,
    updates: Partial<UserStats>
  ): Promise<void> {
    try {
      const statsRef = doc(firestore, `users/${uid}/stats/summary`);
      
      await setDoc(statsRef, updates, { merge: true });
      
      console.log('✅ ユーザー統計更新完了:', uid);
      
    } catch (error) {
      console.error('❌ ユーザー統計更新エラー:', error);
      // 統計更新の失敗はクリティカルではないので、エラーを投げない
    }
  }
  
  /**
   * アクティビティログを記録
   */
  static async logActivity(
    userId: string,
    action: string,
    category: UserActivityLog['category'],
    details: Record<string, any>,
    ipAddress: string = 'unknown',
    userAgent: string = 'unknown'
  ): Promise<void> {
    try {
      // undefinedを除外してFirestore互換のオブジェクトを作成
      const sanitizedDetails = this.removeUndefined(details);
      
      const activityLog: Omit<UserActivityLog, 'id'> = {
        userId,
        action,
        category,
        details: sanitizedDetails,
        ipAddress,
        userAgent,
        timestamp: Timestamp.now(),
      };
      
      const logsRef = collection(firestore, `users/${userId}/activityLogs`);
      await addDoc(logsRef, activityLog);
      
      console.log('✅ アクティビティログ記録完了:', action);
      
    } catch (error) {
      console.error('❌ アクティビティログ記録エラー:', error);
      // ログ記録の失敗はクリティカルではないので、エラーを投げない
    }
  }
  
  /**
   * undefinedを除外したオブジェクトを返す
   */
  private static removeUndefined(obj: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Timestamp)) {
          result[key] = this.removeUndefined(value);
        } else {
          result[key] = value;
        }
      }
    }
    return result;
  }
  
  /**
   * プロファイルが存在するか確認
   */
  static async profileExists(uid: string): Promise<boolean> {
    try {
      const userRef = doc(firestore, `users/${uid}/profile/data`);
      const userSnapshot = await getDoc(userRef);
      
      return userSnapshot.exists();
      
    } catch (error) {
      console.error('❌ プロファイル存在確認エラー:', error);
      return false;
    }
  }
}

