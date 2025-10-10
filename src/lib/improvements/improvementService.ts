/**
 * 改善施策管理サービス
 */

import { db } from '@/lib/firebase/config';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs,
  query, 
  where, 
  orderBy,
  updateDoc,
  deleteDoc,
  Timestamp
} from 'firebase/firestore';
import { UserImprovement } from './types';

export class ImprovementService {
  
  /**
   * ユーザーの改善施策を取得
   */
  static async getUserImprovements(
    userId: string, 
    status?: UserImprovement['status']
  ): Promise<UserImprovement[]> {
    try {
      let q = query(
        collection(db, `users/${userId}/improvements`),
        orderBy('addedAt', 'desc')
      );
      
      if (status) {
        q = query(q, where('status', '==', status));
      }
      
      const snapshot = await getDocs(q);
      
      const improvements: UserImprovement[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        improvements.push({
          id: doc.id,
          ...data,
          addedAt: data.addedAt?.toDate() || new Date(),
          scheduledDate: data.scheduledDate?.toDate(),
          startedAt: data.startedAt?.toDate(),
          completedAt: data.completedAt?.toDate(),
          vendorRequest: data.vendorRequest ? {
            ...data.vendorRequest,
            requestedAt: data.vendorRequest.requestedAt?.toDate()
          } : undefined,
          result: data.result ? {
            ...data.result,
            measurementStartedAt: data.result.measurementStartedAt?.toDate()
          } : undefined
        } as UserImprovement);
      });
      
      return improvements;
    } catch (error) {
      console.error('改善施策取得エラー:', error);
      throw error;
    }
  }
  
  /**
   * 改善施策を追加（「自分でやる」）
   */
  static async addImprovement(
    userId: string, 
    improvement: Omit<UserImprovement, 'id' | 'userId' | 'addedAt'>
  ): Promise<string> {
    try {
      const improvementRef = doc(collection(db, `users/${userId}/improvements`));
      
      const data = {
        ...improvement,
        userId,
        addedAt: Timestamp.now(),
        scheduledDate: improvement.scheduledDate ? Timestamp.fromDate(improvement.scheduledDate) : null,
        startedAt: improvement.startedAt ? Timestamp.fromDate(improvement.startedAt) : null,
        completedAt: improvement.completedAt ? Timestamp.fromDate(improvement.completedAt) : null
      };
      
      await setDoc(improvementRef, data);
      
      console.log('✅ 改善施策を追加:', improvementRef.id);
      return improvementRef.id;
    } catch (error) {
      console.error('改善施策追加エラー:', error);
      throw error;
    }
  }
  
  /**
   * 改善施策を更新
   */
  static async updateImprovement(
    userId: string, 
    improvementId: string, 
    updates: Partial<UserImprovement>
  ): Promise<void> {
    try {
      const improvementRef = doc(db, `users/${userId}/improvements/${improvementId}`);
      
      const data: any = { ...updates };
      
      // Dateオブジェクトをタイムスタンプに変換
      if (updates.scheduledDate) {
        data.scheduledDate = Timestamp.fromDate(updates.scheduledDate);
      }
      if (updates.startedAt) {
        data.startedAt = Timestamp.fromDate(updates.startedAt);
      }
      if (updates.completedAt) {
        data.completedAt = Timestamp.fromDate(updates.completedAt);
      }
      
      await updateDoc(improvementRef, data);
      
      console.log('✅ 改善施策を更新:', improvementId);
    } catch (error) {
      console.error('改善施策更新エラー:', error);
      throw error;
    }
  }
  
  /**
   * 改善施策を削除
   */
  static async deleteImprovement(userId: string, improvementId: string): Promise<void> {
    try {
      const improvementRef = doc(db, `users/${userId}/improvements/${improvementId}`);
      await deleteDoc(improvementRef);
      
      console.log('✅ 改善施策を削除:', improvementId);
    } catch (error) {
      console.error('改善施策削除エラー:', error);
      throw error;
    }
  }
  
  /**
   * ステータスを変更
   */
  static async updateStatus(
    userId: string, 
    improvementId: string, 
    status: UserImprovement['status']
  ): Promise<void> {
    try {
      const updates: Partial<UserImprovement> = { status };
      
      // ステータスに応じてタイムスタンプを設定
      if (status === 'in_progress') {
        updates.startedAt = new Date();
      } else if (status === 'completed') {
        updates.completedAt = new Date();
      }
      
      await this.updateImprovement(userId, improvementId, updates);
      
      console.log(`✅ ステータス変更: ${improvementId} → ${status}`);
    } catch (error) {
      console.error('ステータス変更エラー:', error);
      throw error;
    }
  }
  
  /**
   * チェックリストを更新
   */
  static async updateChecklist(
    userId: string, 
    improvementId: string, 
    checklist: { text: string; checked: boolean }[]
  ): Promise<void> {
    try {
      await this.updateImprovement(userId, improvementId, { checklist });
      console.log('✅ チェックリストを更新:', improvementId);
    } catch (error) {
      console.error('チェックリスト更新エラー:', error);
      throw error;
    }
  }
  
  /**
   * メモを更新
   */
  static async updateMemo(
    userId: string, 
    improvementId: string, 
    memo: string
  ): Promise<void> {
    try {
      await this.updateImprovement(userId, improvementId, { memo });
      console.log('✅ メモを更新:', improvementId);
    } catch (error) {
      console.error('メモ更新エラー:', error);
      throw error;
    }
  }
}

