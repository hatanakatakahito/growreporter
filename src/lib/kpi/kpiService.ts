/**
 * 📊 KPI設定サービス
 * サイト設定で定義したKPI目標を管理
 */

import { db } from '@/lib/firebase/config';
import { collection, doc, setDoc, getDoc, updateDoc, deleteDoc, query, where, getDocs } from 'firebase/firestore';

/**
 * シンプルなKPI設定
 */
export interface KPISetting {
  id: string;
  metric: string;  // メトリクス名（例: 'sessions', 'pageviews', 'conversions', またはコンバージョンイベント名）
  targetValue: string;  // 目標値（月間）
}

/**
 * KPI設定サービス
 */
export class KPIService {
  /**
   * KPI設定を保存
   */
  static async saveKPISettings(userId: string, kpiSettings: KPISetting[]): Promise<void> {
    try {
      const kpiDoc = doc(db, 'users', userId, 'settings', 'kpi');
      
      await setDoc(kpiDoc, {
        kpiSettings,
        updatedAt: new Date().toISOString()
      });
      
      console.log('✅ KPI設定を保存しました');
    } catch (error) {
      console.error('❌ KPI設定の保存に失敗:', error);
      throw error;
    }
  }

  /**
   * KPI設定を取得
   */
  static async getKPISettings(userId: string): Promise<KPISetting[]> {
    try {
      const kpiDoc = doc(db, 'users', userId, 'settings', 'kpi');
      const docSnap = await getDoc(kpiDoc);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        return data.kpiSettings || [];
      }
      
      return [];
    } catch (error) {
      console.error('❌ KPI設定の取得に失敗:', error);
      throw error;
    }
  }

  /**
   * KPI設定を削除
   */
  static async deleteKPISettings(userId: string): Promise<void> {
    try {
      const kpiDoc = doc(db, 'users', userId, 'settings', 'kpi');
      await deleteDoc(kpiDoc);
      
      console.log('✅ KPI設定を削除しました');
    } catch (error) {
      console.error('❌ KPI設定の削除に失敗:', error);
      throw error;
    }
  }
}

