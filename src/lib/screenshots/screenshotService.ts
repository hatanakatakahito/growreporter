/**
 * スクリーンショット管理サービス
 */

import { db } from '@/lib/firebase/config';
import { collection, doc, setDoc, getDoc, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

export interface Screenshot {
  id: string;
  userId: string;
  siteUrl: string;
  device: 'desktop' | 'mobile';
  url: string; // Firebase Storage URL
  fileName: string;
  capturedAt: string;
  createdAt: string;
}

export class ScreenshotService {
  
  /**
   * スクリーンショットを保存
   */
  static async saveScreenshot(userId: string, screenshot: Omit<Screenshot, 'id' | 'userId' | 'createdAt'>): Promise<string> {
    try {
      const screenshotsRef = collection(db, 'users', userId, 'screenshots');
      const newDocRef = doc(screenshotsRef);
      
      const screenshotData: Screenshot = {
        id: newDocRef.id,
        userId,
        ...screenshot,
        createdAt: new Date().toISOString()
      };
      
      await setDoc(newDocRef, screenshotData);
      
      console.log('✅ スクリーンショット保存成功:', newDocRef.id);
      return newDocRef.id;
    } catch (error) {
      console.error('❌ スクリーンショット保存エラー:', error);
      throw error;
    }
  }
  
  /**
   * 最新のスクリーンショットを取得（デバイス別）
   */
  static async getLatestScreenshot(userId: string, siteUrl: string, device: 'desktop' | 'mobile'): Promise<Screenshot | null> {
    try {
      const screenshotsRef = collection(db, 'users', userId, 'screenshots');
      const q = query(
        screenshotsRef,
        where('siteUrl', '==', siteUrl),
        where('device', '==', device),
        orderBy('capturedAt', 'desc'),
        limit(1)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return null;
      }
      
      return querySnapshot.docs[0].data() as Screenshot;
    } catch (error) {
      console.error('❌ スクリーンショット取得エラー:', error);
      // orderByでインデックスエラーが発生した場合は、全件取得してクライアント側でソート
      try {
        const screenshotsRef = collection(db, 'users', userId, 'screenshots');
        const q = query(
          screenshotsRef,
          where('siteUrl', '==', siteUrl),
          where('device', '==', device)
        );
        
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
          return null;
        }
        
        // クライアント側でソート
        const screenshots = querySnapshot.docs
          .map(doc => doc.data() as Screenshot)
          .sort((a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime());
        
        return screenshots[0] || null;
      } catch (fallbackError) {
        console.error('❌ スクリーンショット取得エラー（フォールバック）:', fallbackError);
        return null;
      }
    }
  }
  
  /**
   * 全てのスクリーンショットを取得
   */
  static async getAllScreenshots(userId: string, siteUrl?: string): Promise<Screenshot[]> {
    try {
      const screenshotsRef = collection(db, 'users', userId, 'screenshots');
      let q;
      
      if (siteUrl) {
        q = query(
          screenshotsRef,
          where('siteUrl', '==', siteUrl)
        );
      } else {
        q = query(screenshotsRef);
      }
      
      const querySnapshot = await getDocs(q);
      
      const screenshots = querySnapshot.docs
        .map(doc => doc.data() as Screenshot)
        .sort((a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime());
      
      return screenshots;
    } catch (error) {
      console.error('❌ スクリーンショット一覧取得エラー:', error);
      return [];
    }
  }
  
  /**
   * スクリーンショットをキャプチャ（APIを呼び出し）
   */
  static async captureScreenshot(userId: string, siteUrl: string, device: 'desktop' | 'mobile'): Promise<Screenshot | null> {
    try {
      const response = await fetch('/api/screenshots/capture', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify({ siteUrl, device })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'スクリーンショットの撮影に失敗しました');
      }
      
      const data = await response.json();
      
      // Firestoreに保存
      const screenshotId = await this.saveScreenshot(userId, {
        siteUrl,
        device,
        url: data.url,
        fileName: data.fileName,
        capturedAt: data.capturedAt
      });
      
      return {
        id: screenshotId,
        userId,
        siteUrl,
        device,
        url: data.url,
        fileName: data.fileName,
        capturedAt: data.capturedAt,
        createdAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ スクリーンショットキャプチャエラー:', error);
      throw error;
    }
  }
}

