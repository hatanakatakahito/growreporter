/**
 * コンバージョン定義管理サービス
 * GA4のイベントをコンバージョンとして定義・管理する
 */

import { db } from '@/lib/firebase/config';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  Timestamp,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';

export interface ConversionEvent {
  eventName: string;
  displayName: string;
  description?: string;
  eventCount?: number;
  isActive: boolean;
  createdAt: Date;
}

export interface ConversionSettings {
  userId: string;
  conversions: ConversionEvent[];
  updatedAt: Date;
}

export class ConversionService {
  /**
   * ユーザーのコンバージョン設定を取得
   */
  static async getConversions(userId: string): Promise<ConversionEvent[]> {
    try {
      const docRef = doc(db, 'conversions', userId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        return (data.conversions || []).map((conv: any) => {
          let createdAt: Date;
          
          // Firestoreのタイムスタンプオブジェクトかどうかをチェック
          if (conv.createdAt && typeof conv.createdAt.toDate === 'function') {
            createdAt = conv.createdAt.toDate();
          } else if (conv.createdAt && conv.createdAt.seconds) {
            // Firestoreタイムスタンプがプレーンオブジェクトになっている場合
            createdAt = new Date(conv.createdAt.seconds * 1000);
          } else if (conv.createdAt instanceof Date) {
            createdAt = conv.createdAt;
          } else {
            createdAt = new Date();
          }
          
          return {
            ...conv,
            createdAt
          };
        });
      }

      return [];
    } catch (error) {
      console.error('コンバージョン設定取得エラー:', error);
      throw error;
    }
  }

  /**
   * コンバージョンを追加
   */
  static async addConversion(
    userId: string,
    conversion: Omit<ConversionEvent, 'createdAt'>
  ): Promise<void> {
    try {
      const docRef = doc(db, 'conversions', userId);
      const docSnap = await getDoc(docRef);

      const newConversion: ConversionEvent = {
        ...conversion,
        createdAt: new Date()
      };

      // undefinedフィールドを削除
      const cleanConversion = JSON.parse(JSON.stringify({
        ...newConversion,
        createdAt: Timestamp.fromDate(newConversion.createdAt)
      }));

      if (docSnap.exists()) {
        // 既存の設定に追加
        await updateDoc(docRef, {
          conversions: arrayUnion(cleanConversion),
          updatedAt: Timestamp.now()
        });
      } else {
        // 新規作成
        await setDoc(docRef, {
          userId,
          conversions: [cleanConversion],
          updatedAt: Timestamp.now()
        });
      }
    } catch (error) {
      console.error('コンバージョン追加エラー:', error);
      throw error;
    }
  }

  /**
   * コンバージョンを更新
   */
  static async updateConversion(
    userId: string,
    eventName: string,
    updates: Partial<Omit<ConversionEvent, 'eventName' | 'createdAt'>>
  ): Promise<void> {
    try {
      const conversions = await this.getConversions(userId);
      const updatedConversions = conversions.map(conv => {
        if (conv.eventName === eventName) {
          return { ...conv, ...updates };
        }
        return conv;
      });

      // undefinedフィールドを削除
      const cleanConversions = JSON.parse(JSON.stringify(
        updatedConversions.map(conv => ({
          ...conv,
          createdAt: Timestamp.fromDate(conv.createdAt)
        }))
      ));

      const docRef = doc(db, 'conversions', userId);
      await updateDoc(docRef, {
        conversions: cleanConversions,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('コンバージョン更新エラー:', error);
      throw error;
    }
  }

  /**
   * コンバージョンを削除
   */
  static async deleteConversion(userId: string, conversionId: string): Promise<void> {
    try {
      console.log('🗑️ ConversionService: 削除処理開始', { userId, conversionId });
      
      const conversions = await this.getConversions(userId);
      console.log('📋 現在のコンバージョン:', conversions);
      
      const updatedConversions = conversions.filter(
        conv => conv.id !== conversionId
      );
      console.log('📋 削除後のコンバージョン:', updatedConversions);

      // undefinedフィールドを削除
      const cleanConversions = JSON.parse(JSON.stringify(
        updatedConversions.map(conv => ({
          ...conv,
          createdAt: Timestamp.fromDate(conv.createdAt)
        }))
      ));

      const docRef = doc(db, 'conversions', userId);
      await updateDoc(docRef, {
        conversions: cleanConversions,
        updatedAt: Timestamp.now()
      });
      
      console.log('✅ Firestoreへの削除が完了しました');
    } catch (error) {
      console.error('❌ コンバージョン削除エラー:', error);
      throw error;
    }
  }

  /**
   * アクティブなコンバージョンのみを取得
   */
  static async getActiveConversions(userId: string): Promise<ConversionEvent[]> {
    try {
      const conversions = await this.getConversions(userId);
      return conversions.filter(conv => conv.isActive);
    } catch (error) {
      console.error('アクティブなコンバージョン取得エラー:', error);
      throw error;
    }
  }
}

