'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  UserCredential,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from 'firebase/auth';
import { auth, googleProvider, microsoftProvider } from '../firebase/config';
import { UserProfileService } from '@/lib/user/userProfileService';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<UserCredential>;
  signInWithMicrosoft: () => Promise<UserCredential>;
  signInWithEmail: (email: string, password: string) => Promise<UserCredential>;
  signUpWithEmail: (email: string, password: string) => Promise<UserCredential>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      // 👤 新規ユーザーの場合、プロファイルを自動作成
      if (user) {
        try {
          const profileExists = await UserProfileService.profileExists(user.uid);
          
          if (!profileExists) {
            console.log('🆕 新規ユーザー検出 - プロファイル作成開始:', user.uid);
            await UserProfileService.createUserProfile({
              uid: user.uid,
              email: user.email || '',
              displayName: user.displayName || undefined,
              photoURL: user.photoURL || undefined,
            });
          } else {
            // 既存ユーザーの場合、ログイン時刻を更新
            await UserProfileService.updateLastLogin(user.uid);
          }
        } catch (error) {
          console.error('❌ ユーザープロファイル処理エラー:', error);
          // プロファイル処理のエラーは認証フローをブロックしない
        }
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async (): Promise<UserCredential> => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      return result;
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const signInWithMicrosoft = async (): Promise<UserCredential> => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, microsoftProvider);
      return result;
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const signOut = async (): Promise<void> => {
    setLoading(true);
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const signInWithEmail = async (email: string, password: string): Promise<UserCredential> => {
    setLoading(true);
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      return result;
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, password: string): Promise<UserCredential> => {
    setLoading(true);
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      return result;
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    signInWithGoogle,
    signInWithMicrosoft,
    signInWithEmail,
    signUpWithEmail,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
