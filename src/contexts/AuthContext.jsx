import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, googleProvider, db } from '../config/firebase';

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

      // Firestoreにユーザープロファイルを作成
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        displayName: additionalData.displayName || '',
        company: additionalData.company || '',
        phoneNumber: additionalData.phoneNumber || '',
        industry: additionalData.industry || '',
        photoURL: user.photoURL || '',
        plan: 'free',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
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
        // 新規ユーザーの場合、基本情報のみ保存
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || '',
          photoURL: user.photoURL || '',
          company: '',
          phoneNumber: '',
          industry: '',
          plan: 'free',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          lastLoginAt: serverTimestamp(),
        });
      }

      return userCredential;
    } catch (error) {
      console.error('Error logging in with Google:', error);
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

  // 認証状態の監視
  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        // 最終ログイン日時を更新
        try {
          await setDoc(
            doc(db, 'users', user.uid),
            {
              lastLoginAt: serverTimestamp(),
            },
            { merge: true }
          );
        } catch (error) {
          console.error('Error updating lastLoginAt:', error);
        }
        
        // ユーザープロファイルを取得
        const profile = await fetchUserProfile(user.uid);
        setUserProfile(profile);
      } else {
        setUserProfile(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userProfile,
    loading,
    signup,
    login,
    loginWithGoogle,
    logout,
    resetPassword,
    updateUserProfile,
    fetchUserProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

