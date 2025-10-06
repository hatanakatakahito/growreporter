/**
 * 📊 分析結果管理サービス
 * Firestoreを使用した分析レポートCRUD操作
 */

import { firestore } from '@/lib/firebase/config';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  Timestamp,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import {
  AnalysisReport,
  CreateAnalysisReportRequest,
  UpdateAnalysisReportRequest,
  SaveGA4DataRequest,
  SaveGSCDataRequest,
  SaveAIAnalysisRequest,
  AnalysisReportFilterOptions,
  AnalysisSummary,
  DEFAULT_ANALYSIS_REPORT,
} from '@/types/analysis';
import { v4 as uuidv4 } from 'uuid';

export class AnalysisService {
  /**
   * 分析レポートを作成
   */
  static async createAnalysisReport(
    userId: string,
    request: CreateAnalysisReportRequest
  ): Promise<string> {
    try {
      const reportId = uuidv4();
      const now = Timestamp.now();
      
      // 実際の日付を計算
      const actualDates = this.calculateActualDates(
        request.startDate,
        request.endDate
      );
      
      const newReport: AnalysisReport = {
        id: reportId,
        userId,
        title: request.title || `分析レポート ${new Date().toLocaleDateString('ja-JP')}`,
        description: request.description || null,
        target: {
          ga4PropertyId: request.ga4PropertyId || null,
          ga4PropertyName: request.ga4PropertyName || null,
          gscSiteUrl: request.gscSiteUrl || null,
        },
        dateRange: {
          type: request.dateRangeType || 'preset',
          startDate: request.startDate || '30daysAgo',
          endDate: request.endDate || 'today',
          actualStartDate: actualDates.start,
          actualEndDate: actualDates.end,
        },
        ...DEFAULT_ANALYSIS_REPORT,
        metadata: {
          ...DEFAULT_ANALYSIS_REPORT.metadata,
          createdAt: now,
          updatedAt: now,
        },
      };
      
      const reportRef = doc(firestore, `users/${userId}/analysisReports/${reportId}`);
      await setDoc(reportRef, newReport);
      
      console.log('✅ 分析レポート作成完了:', reportId);
      
      // サマリーを更新
      await this.updateSummary(userId);
      
      return reportId;
      
    } catch (error) {
      console.error('❌ 分析レポート作成エラー:', error);
      throw error;
    }
  }
  
  /**
   * 分析レポートを取得
   */
  static async getAnalysisReport(
    userId: string,
    reportId: string
  ): Promise<AnalysisReport | null> {
    try {
      const reportRef = doc(firestore, `users/${userId}/analysisReports/${reportId}`);
      const reportSnapshot = await getDoc(reportRef);
      
      if (reportSnapshot.exists()) {
        return reportSnapshot.data() as AnalysisReport;
      }
      
      console.warn('⚠️ 分析レポートが見つかりません:', reportId);
      return null;
      
    } catch (error) {
      console.error('❌ 分析レポート取得エラー:', error);
      throw error;
    }
  }
  
  /**
   * 全分析レポートを取得
   */
  static async getAllAnalysisReports(
    userId: string,
    options?: AnalysisReportFilterOptions
  ): Promise<AnalysisReport[]> {
    try {
      const reportsRef = collection(firestore, `users/${userId}/analysisReports`);
      
      // インデックス不要なシンプルなクエリに変更
      const q = query(reportsRef, limit(100));
      
      const snapshot = await getDocs(q);
      let reports = snapshot.docs.map(doc => doc.data() as AnalysisReport);
      
      // クライアント側でフィルタリングとソート
      if (options?.isArchived !== undefined) {
        reports = reports.filter(r => r.metadata.isArchived === options.isArchived);
      }
      
      if (options?.isFavorite) {
        reports = reports.filter(r => r.metadata.isFavorite === true);
      }
      
      if (options?.ga4PropertyId) {
        reports = reports.filter(r => r.target.ga4PropertyId === options.ga4PropertyId);
      }
      
      if (options?.gscSiteUrl) {
        reports = reports.filter(r => r.target.gscSiteUrl === options.gscSiteUrl);
      }
      
      if (options?.hasAIAnalysis) {
        reports = reports.filter(r => r.aiAnalysis.executed);
      }
      
      // 作成日時で降順ソート（最新が先頭）
      reports.sort((a, b) => b.metadata.createdAt.toMillis() - a.metadata.createdAt.toMillis());
      
      return reports;
      
    } catch (error) {
      console.error('❌ 分析レポート一覧取得エラー:', error);
      return [];
    }
  }
  
  /**
   * 分析レポートを更新
   */
  static async updateAnalysisReport(
    userId: string,
    reportId: string,
    updates: UpdateAnalysisReportRequest
  ): Promise<void> {
    try {
      const reportRef = doc(firestore, `users/${userId}/analysisReports/${reportId}`);
      
      const updateData: any = {
        'metadata.updatedAt': Timestamp.now(),
      };
      
      if (updates.title !== undefined) {
        updateData.title = updates.title;
      }
      
      if (updates.description !== undefined) {
        updateData.description = updates.description;
      }
      
      if (updates.tags !== undefined) {
        updateData['metadata.tags'] = updates.tags;
      }
      
      if (updates.isFavorite !== undefined) {
        updateData['metadata.isFavorite'] = updates.isFavorite;
      }
      
      if (updates.isArchived !== undefined) {
        updateData['metadata.isArchived'] = updates.isArchived;
      }
      
      await updateDoc(reportRef, updateData);
      
      console.log('✅ 分析レポート更新完了:', reportId);
      
    } catch (error) {
      console.error('❌ 分析レポート更新エラー:', error);
      throw error;
    }
  }
  
  /**
   * GA4データを保存
   */
  static async saveGA4Data(
    userId: string,
    reportId: string,
    data: SaveGA4DataRequest
  ): Promise<void> {
    try {
      const reportRef = doc(firestore, `users/${userId}/analysisReports/${reportId}`);
      
      await updateDoc(reportRef, {
        'ga4Data.fetched': true,
        'ga4Data.timestamp': Timestamp.now(),
        'ga4Data.metrics': data.metrics,
        'ga4Data.rawData': data.rawData,
        'metadata.updatedAt': Timestamp.now(),
      });
      
      console.log('✅ GA4データ保存完了:', reportId);
      
    } catch (error) {
      console.error('❌ GA4データ保存エラー:', error);
      throw error;
    }
  }
  
  /**
   * GSCデータを保存
   */
  static async saveGSCData(
    userId: string,
    reportId: string,
    data: SaveGSCDataRequest
  ): Promise<void> {
    try {
      const reportRef = doc(firestore, `users/${userId}/analysisReports/${reportId}`);
      
      await updateDoc(reportRef, {
        'gscData.fetched': true,
        'gscData.timestamp': Timestamp.now(),
        'gscData.metrics': data.metrics,
        'gscData.rawData': data.rawData,
        'metadata.updatedAt': Timestamp.now(),
      });
      
      console.log('✅ GSCデータ保存完了:', reportId);
      
    } catch (error) {
      console.error('❌ GSCデータ保存エラー:', error);
      throw error;
    }
  }
  
  /**
   * AI分析結果を保存
   */
  static async saveAIAnalysis(
    userId: string,
    reportId: string,
    data: SaveAIAnalysisRequest
  ): Promise<void> {
    try {
      const reportRef = doc(firestore, `users/${userId}/analysisReports/${reportId}`);
      
      await updateDoc(reportRef, {
        'aiAnalysis.executed': true,
        'aiAnalysis.timestamp': Timestamp.now(),
        'aiAnalysis.result': data.result,
        'aiAnalysis.model': data.model,
        'aiAnalysis.tokenCount': data.tokenCount || null,
        'metadata.updatedAt': Timestamp.now(),
      });
      
      console.log('✅ AI分析結果保存完了:', reportId);
      
    } catch (error) {
      console.error('❌ AI分析結果保存エラー:', error);
      throw error;
    }
  }
  
  /**
   * KPI更新結果を記録
   */
  static async recordKPIUpdates(
    userId: string,
    reportId: string,
    kpiIds: string[]
  ): Promise<void> {
    try {
      const reportRef = doc(firestore, `users/${userId}/analysisReports/${reportId}`);
      
      await updateDoc(reportRef, {
        'kpiUpdates.count': kpiIds.length,
        'kpiUpdates.kpiIds': kpiIds,
        'kpiUpdates.timestamp': Timestamp.now(),
        'metadata.updatedAt': Timestamp.now(),
      });
      
      console.log('✅ KPI更新結果記録完了:', reportId);
      
    } catch (error) {
      console.error('❌ KPI更新結果記録エラー:', error);
      // KPI更新記録のエラーはクリティカルではない
    }
  }
  
  /**
   * 分析レポートを削除
   */
  static async deleteAnalysisReport(
    userId: string,
    reportId: string
  ): Promise<void> {
    try {
      const reportRef = doc(firestore, `users/${userId}/analysisReports/${reportId}`);
      await deleteDoc(reportRef);
      
      console.log('✅ 分析レポート削除完了:', reportId);
      
      // サマリーを更新
      await this.updateSummary(userId);
      
    } catch (error) {
      console.error('❌ 分析レポート削除エラー:', error);
      throw error;
    }
  }
  
  /**
   * 分析レポートをリアルタイム監視
   */
  static subscribeToAnalysisReport(
    userId: string,
    reportId: string,
    callback: (report: AnalysisReport | null) => void
  ): Unsubscribe {
    const reportRef = doc(firestore, `users/${userId}/analysisReports/${reportId}`);
    
    return onSnapshot(reportRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data() as AnalysisReport);
      } else {
        callback(null);
      }
    }, (error) => {
      console.error('❌ 分析レポートリアルタイム監視エラー:', error);
      callback(null);
    });
  }
  
  /**
   * 分析サマリーを取得
   */
  static async getAnalysisSummary(userId: string): Promise<AnalysisSummary> {
    try {
      const summaryRef = doc(firestore, `users/${userId}/stats/analysisSummary`);
      const summarySnapshot = await getDoc(summaryRef);
      
      if (summarySnapshot.exists()) {
        return summarySnapshot.data() as AnalysisSummary;
      }
      
      // サマリーがない場合はデフォルト値
      return {
        totalReports: 0,
        reportsThisMonth: 0,
        reportsThisWeek: 0,
        favoriteReports: 0,
        ga4ReportsCount: 0,
        gscReportsCount: 0,
        aiAnalysisCount: 0,
        lastAnalysisDate: null,
      };
      
    } catch (error) {
      console.error('❌ 分析サマリー取得エラー:', error);
      throw error;
    }
  }
  
  /**
   * 分析サマリーを更新
   */
  static async updateSummary(userId: string): Promise<void> {
    try {
      const reports = await this.getAllAnalysisReports(userId);
      
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      const summary: AnalysisSummary = {
        totalReports: reports.length,
        reportsThisMonth: reports.filter(r => 
          r.metadata.createdAt.toDate() >= monthStart
        ).length,
        reportsThisWeek: reports.filter(r => 
          r.metadata.createdAt.toDate() >= weekStart
        ).length,
        favoriteReports: reports.filter(r => r.metadata.isFavorite).length,
        ga4ReportsCount: reports.filter(r => r.ga4Data.fetched).length,
        gscReportsCount: reports.filter(r => r.gscData.fetched).length,
        aiAnalysisCount: reports.filter(r => r.aiAnalysis.executed).length,
        lastAnalysisDate: reports.length > 0 
          ? reports[0].metadata.createdAt 
          : null,
      };
      
      const summaryRef = doc(firestore, `users/${userId}/stats/analysisSummary`);
      await setDoc(summaryRef, summary);
      
      console.log('✅ 分析サマリー更新完了');
      
    } catch (error) {
      console.error('❌ 分析サマリー更新エラー:', error);
      // サマリー更新のエラーはクリティカルではない
    }
  }
  
  /**
   * 実際の日付を計算
   */
  private static calculateActualDates(
    startDate?: string,
    endDate?: string
  ): { start: Timestamp; end: Timestamp } {
    const now = new Date();
    
    // 終了日
    let endDateTime: Date;
    if (!endDate || endDate === 'today') {
      endDateTime = now;
    } else if (endDate === 'yesterday') {
      endDateTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    } else {
      endDateTime = new Date(endDate);
    }
    
    // 開始日
    let startDateTime: Date;
    if (!startDate) {
      // デフォルトは30日前
      startDateTime = new Date(endDateTime.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (startDate.endsWith('daysAgo')) {
      const days = parseInt(startDate.replace('daysAgo', ''));
      startDateTime = new Date(endDateTime.getTime() - days * 24 * 60 * 60 * 1000);
    } else {
      startDateTime = new Date(startDate);
    }
    
    return {
      start: Timestamp.fromDate(startDateTime),
      end: Timestamp.fromDate(endDateTime),
    };
  }
}

