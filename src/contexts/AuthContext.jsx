import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { auth, googleProvider, microsoftProvider, db } from '../config/firebase';
import { getDefaultOnboarding } from '../constants/onboarding';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // ユーザープロファイルの取得
  const fetchUserProfile = async (uid) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        return userDoc.data();
      }
      return null;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  };

  // ユーザープロファイルの作成・更新
  const updateUserProfile = async (uid, profileData) => {
    try {
      await setDoc(
        doc(db, 'users', uid),
        {
          ...profileData,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      const updatedProfile = await fetchUserProfile(uid);
      setUserProfile(updatedProfile);
      return updatedProfile;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  };

  // メール/パスワードでユーザー登録
  const signup = async (email, password, additionalData = {}) => {
    if (!auth) {
      throw new Error('Firebase is not configured. Please set up your .env file.');
    }
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Firestoreにユーザープロファイルを作成（自身をアカウントオーナーとして登録しメンバー一覧に含まれるようにする）
      const now = serverTimestamp();
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        displayName: additionalData.displayName || additionalData.name || '',
        name: additionalData.name || additionalData.displayName || '',
        lastName: additionalData.lastName || '',
        firstName: additionalData.firstName || '',
        company: additionalData.company || '',
        department: additionalData.department || '',
        phoneNumber: additionalData.phoneNumber || '',
        zipCode: additionalData.zipCode || '',
        prefecture: additionalData.prefecture || '',
        city: additionalData.city || '',
        building: additionalData.building || '',
        industry: additionalData.industry || '',
        photoURL: user.photoURL || '',
        plan: 'free',
        aiSummaryUsage: 0,
        aiImprovementUsage: 0,
        accountOwnerId: user.uid,
        memberRole: 'owner',
        memberships: { [user.uid]: { role: 'owner', joinedAt: now } },
        notificationSettings: {
          weeklyReportEmail: true,
          monthlyReportEmail: true,
          alertEmail: true,
          emailNotifications: true,
        },
        joinedAt: now,
        createdAt: now,
        updatedAt: now,
        lastLoginAt: now,
        onboarding: getDefaultOnboarding(),
      });

      return userCredential;
    } catch (error) {
      console.error('Error signing up:', error);
      throw error;
    }
  };

  // メール/パスワードでログイン
  const login = async (email, password) => {
    if (!auth) {
      throw new Error('Firebase is not configured. Please set up your .env file.');
    }
    
    try {
      return await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error('Error logging in:', error);
      throw error;
    }
  };

  // Googleでログイン
  const loginWithGoogle = async () => {
    if (!auth || !googleProvider) {
      throw new Error('Firebase is not configured. Please set up your .env file.');
    }
    
    try {
      const userCredential = await signInWithPopup(auth, googleProvider);
      const user = userCredential.user;

      // Firestoreでユーザープロファイルを確認
      const userDoc = await getDoc(doc(db, 'users', user.uid));

      if (!userDoc.exists()) {
        // 新規ユーザーの場合、基本情報＋自身をアカウントオーナーとして保存（メンバー一覧に含まれるようにする）
        const now = serverTimestamp();
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || '',
          photoURL: user.photoURL || '',
          company: '',
          phoneNumber: '',
          industry: '',
          plan: 'free',
          aiSummaryUsage: 0,
          aiImprovementUsage: 0,
          accountOwnerId: user.uid,
          memberRole: 'owner',
          memberships: { [user.uid]: { role: 'owner', joinedAt: now } },
          joinedAt: now,
          notificationSettings: {
            weeklyReportEmail: true,
            monthlyReportEmail: true,
            alertEmail: true,
            emailNotifications: true,
          },
          createdAt: now,
          updatedAt: now,
          lastLoginAt: now,
          onboarding: getDefaultOnboarding(),
        });
      } else {
        // 既存ユーザー: SSO の写真・表示名を Firestore に反映
        await setDoc(
          doc(db, 'users', user.uid),
          {
            photoURL: user.photoURL || null,
            displayName: user.displayName || userDoc.data()?.displayName || '',
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      }

      return userCredential;
    } catch (error) {
      console.error('Error logging in with Google:', error);
      throw error;
    }
  };

  // Microsoftでログイン
  const loginWithMicrosoft = async () => {
    if (!auth || !microsoftProvider) {
      throw new Error('Firebase is not configured. Please set up your .env file.');
    }

    try {
      const userCredential = await signInWithPopup(auth, microsoftProvider);
      const user = userCredential.user;

      // Firestoreでユーザープロファイルを確認
      const userDoc = await getDoc(doc(db, 'users', user.uid));

      if (!userDoc.exists()) {
        // 新規ユーザーの場合、基本情報＋自身をアカウントオーナーとして保存（メンバー一覧に含まれるようにする）
        const now = serverTimestamp();
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || '',
          photoURL: user.photoURL || '',
          company: '',
          phoneNumber: '',
          industry: '',
          plan: 'free',
          aiSummaryUsage: 0,
          aiImprovementUsage: 0,
          accountOwnerId: user.uid,
          memberRole: 'owner',
          memberships: { [user.uid]: { role: 'owner', joinedAt: now } },
          joinedAt: now,
          notificationSettings: {
            weeklyReportEmail: true,
            monthlyReportEmail: true,
            alertEmail: true,
            emailNotifications: true,
          },
          createdAt: now,
          updatedAt: now,
          lastLoginAt: now,
          onboarding: getDefaultOnboarding(),
        });
      } else {
        // 既存ユーザー: SSO の写真・表示名を Firestore に反映
        await setDoc(
          doc(db, 'users', user.uid),
          {
            photoURL: user.photoURL || null,
            displayName: user.displayName || userDoc.data()?.displayName || '',
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      }

      return userCredential;
    } catch (error) {
      console.error('Error logging in with Microsoft:', error);
      throw error;
    }
  };

  // ログアウト
  const logout = async () => {
    try {
      await signOut(auth);
      setUserProfile(null);
    } catch (error) {
      console.error('Error logging out:', error);
      throw error;
    }
  };

  // パスワードリセット
  const resetPassword = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      console.error('Error resetting password:', error);
      throw error;
    }
  };

  // 認証状態の監視 + userProfile の onSnapshot リアルタイム購読
  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    let unsubscribeProfile = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      // 前のユーザーの onSnapshot を解除
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (user) {
        // 初回のみ: 最終ログイン日時を更新 + 既存ユーザーの onboarding 遡及マージ
        try {
          const currentProfile = await fetchUserProfile(user.uid);
          if (currentProfile) {
            const updateData = {
              lastLoginAt: serverTimestamp(),
            };
            // セキュリティ強化 (Phase 2-1):
            //   aiSummaryUsage / aiImprovementUsage はクライアントから書込禁止。
            //   旧コードでは「未設定なら 0 セット」していたが、サーバ側 planManager.js が
            //   `userData.aiSummaryUsage || 0` で undefined を 0 として扱うため、
            //   ここで初期化する必要はなくなった（不正リセット防止のため allowlist 外）。
            if (currentProfile.onboarding === undefined) {
              updateData.onboarding = getDefaultOnboarding();
            }
            // 既存ユーザーの profile 遡及マージ: department/住所が未設定なら upgradeInquiries から補完
            const needsProfileBackfill =
              currentProfile.department === undefined ||
              currentProfile.zipCode === undefined;
            if (needsProfileBackfill) {
              try {
                const inquirySnap = await getDocs(
                  query(
                    collection(db, 'upgradeInquiries'),
                    where('uid', '==', user.uid)
                  )
                );
                if (!inquirySnap.empty) {
                  // 最新の申込を採用
                  const latest = inquirySnap.docs
                    .map((d) => d.data())
                    .sort((a, b) => {
                      const ta = a.createdAt?.toMillis?.() ?? 0;
                      const tb = b.createdAt?.toMillis?.() ?? 0;
                      return tb - ta;
                    })[0];
                  if (latest) {
                    if (currentProfile.department === undefined) updateData.department = latest.department || '';
                    if (currentProfile.zipCode === undefined) updateData.zipCode = latest.zipCode || '';
                    if (currentProfile.prefecture === undefined) updateData.prefecture = latest.prefecture || '';
                    if (currentProfile.city === undefined) updateData.city = latest.city || '';
                    if (currentProfile.building === undefined) updateData.building = latest.building || '';
                  }
                }
              } catch (e) {
                console.warn('[AuthContext] profile 遡及マージエラー:', e);
              }
            }
            await setDoc(doc(db, 'users', user.uid), updateData, { merge: true });
          }
        } catch (error) {
          console.error('Error updating user data:', error);
        }

        // userProfile を onSnapshot でリアルタイム購読
        // Firestore への書き込みが即座にローカル state に反映される
        unsubscribeProfile = onSnapshot(
          doc(db, 'users', user.uid),
          (snapshot) => {
            if (snapshot.exists()) {
              setUserProfile(snapshot.data());
            } else {
              setUserProfile(null);
            }
            setLoading(false);
          },
          (error) => {
            console.error('[AuthContext] userProfile onSnapshot error:', error);
            setLoading(false);
          }
        );
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  // userProfile をサーバーから再取得してローカル state を更新
  const refreshUserProfile = async () => {
    if (!currentUser?.uid) return null;
    const fresh = await fetchUserProfile(currentUser.uid);
    if (fresh) setUserProfile(fresh);
    return fresh;
  };

  const value = {
    currentUser,
    userProfile,
    loading,
    signup,
    login,
    loginWithGoogle,
    loginWithMicrosoft,
    logout,
    resetPassword,
    updateUserProfile,
    fetchUserProfile,
    refreshUserProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

