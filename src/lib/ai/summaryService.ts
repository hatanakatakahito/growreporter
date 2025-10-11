/**
 * AI要約サービス
 * OpenAI APIを使用してデータの要約を生成・管理
 */

import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  deleteDoc,
  doc,
  orderBy,
  limit,
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

export interface AISummary {
  id?: string;
  userId: string;
  pageType: 'summary' | 'users' | 'acquisition';
  startDate: string;
  endDate: string;
  summary: string;
  metrics: any; // 要約に使用したデータのスナップショット
  generatedAt: Date;
  createdAt: Date;
}

class AISummaryService {
  /**
   * キャッシュされたAI要約を取得
   */
  static async getCachedSummary(
    userId: string,
    pageType: 'summary' | 'users' | 'acquisition',
    startDate: string,
    endDate: string
  ): Promise<AISummary | null> {
    try {
      console.log('📊 AI要約キャッシュ検索:', { userId, pageType, startDate, endDate });

      const summariesRef = collection(db, 'aiSummaries');
      const q = query(
        summariesRef,
        where('userId', '==', userId),
        where('pageType', '==', pageType),
        where('startDate', '==', startDate),
        where('endDate', '==', endDate),
        orderBy('generatedAt', 'desc'),
        limit(1)
      );

      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        console.log('❌ AI要約キャッシュが見つかりません');
        return null;
      }

      const docData = snapshot.docs[0].data();
      const summary: AISummary = {
        id: snapshot.docs[0].id,
        userId: docData.userId,
        pageType: docData.pageType,
        startDate: docData.startDate,
        endDate: docData.endDate,
        summary: docData.summary,
        metrics: docData.metrics,
        generatedAt: docData.generatedAt?.toDate() || new Date(),
        createdAt: docData.createdAt?.toDate() || new Date(),
      };

      console.log('✅ AI要約キャッシュ取得成功:', summary.id);
      return summary;
    } catch (error) {
      console.error('❌ AI要約キャッシュ取得エラー:', error);
      return null;
    }
  }

  /**
   * AI要約を生成してFirestoreに保存
   */
  static async generateAndSaveSummary(
    userId: string,
    pageType: 'summary' | 'users' | 'acquisition',
    startDate: string,
    endDate: string,
    metrics: any
  ): Promise<AISummary> {
    try {
      console.log('🤖 AI要約生成開始:', { userId, pageType, startDate, endDate });

      // OpenAI API経由で要約を生成
      const response = await fetch('/api/ai/generate-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify({
          pageType,
          startDate,
          endDate,
          metrics
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'AI要約生成に失敗しました');
      }

      const { summary: summaryText } = await response.json();

      // Firestoreに保存
      const summariesRef = collection(db, 'aiSummaries');
      const now = new Date();
      
      // undefinedフィールドを除外
      const cleanMetrics = metrics ? JSON.parse(JSON.stringify(metrics)) : null;
      
      const dataToSave: any = {
        userId,
        pageType,
        startDate,
        endDate,
        summary: summaryText,
        generatedAt: Timestamp.fromDate(now),
        createdAt: Timestamp.fromDate(now)
      };
      
      // metricsがnullでない場合のみ追加
      if (cleanMetrics !== null) {
        dataToSave.metrics = cleanMetrics;
      }
      
      const docRef = await addDoc(summariesRef, dataToSave);

      console.log('✅ AI要約生成・保存成功:', docRef.id);

      return {
        id: docRef.id,
        userId,
        pageType,
        startDate,
        endDate,
        summary: summaryText,
        metrics,
        generatedAt: now,
        createdAt: now
      };
    } catch (error) {
      console.error('❌ AI要約生成エラー:', error);
      throw error;
    }
  }

  /**
   * AI要約を取得（getSummaryエイリアス）
   */
  static async getSummary(
    userId: string,
    pageType: 'summary' | 'users' | 'acquisition',
    startDate: string,
    endDate: string
  ): Promise<string | null> {
    const cachedSummary = await this.getCachedSummary(userId, pageType, startDate, endDate);
    return cachedSummary?.summary || null;
  }

  /**
   * キャッシュされたAI要約を削除
   */
  static async deleteSummary(summaryId: string): Promise<void> {
    try {
      console.log('🗑️ AI要約削除:', summaryId);
      
      const docRef = doc(db, 'aiSummaries', summaryId);
      await deleteDoc(docRef);

      console.log('✅ AI要約削除成功');
    } catch (error) {
      console.error('❌ AI要約削除エラー:', error);
      throw error;
    }
  }

  /**
   * 古いAI要約を削除（30日以上前）
   */
  static async cleanupOldSummaries(userId: string): Promise<void> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const summariesRef = collection(db, 'aiSummaries');
      const q = query(
        summariesRef,
        where('userId', '==', userId),
        where('createdAt', '<', Timestamp.fromDate(thirtyDaysAgo))
      );

      const snapshot = await getDocs(q);
      
      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);

      console.log(`✅ ${snapshot.size}件の古いAI要約を削除しました`);
    } catch (error) {
      console.error('❌ 古いAI要約削除エラー:', error);
    }
  }
}

export default AISummaryService;

