'use client';

/**
 * Analysis History Page
 * Display list of past analysis reports
 */

import { useAuth } from '@/lib/auth/authContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { AnalysisService } from '@/lib/analysis/analysisService';
import { AnalysisReport, AnalysisSummary } from '@/types/analysis';

interface ShareModalState {
  open: boolean;
  report: AnalysisReport | null;
  shareUrl: string | null;
  loading: boolean;
  expiresInDays: number | null;
  password: string;
  error: string | null;
}

export default function HistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const [reports, setReports] = useState<AnalysisReport[]>([]);
  const [summary, setSummary] = useState<AnalysisSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'favorite' | 'archived'>('all');
  const [selectedReport, setSelectedReport] = useState<AnalysisReport | null>(null);
  const [shareModal, setShareModal] = useState<ShareModalState>({
    open: false,
    report: null,
    shareUrl: null,
    loading: false,
    expiresInDays: 7,
    password: '',
    error: null,
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
      return;
    }
    
    if (!user) return;
    
    loadData();
  }, [user, authLoading, router, filter]);
  
  const loadData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      const summaryData = await AnalysisService.getAnalysisSummary(user.uid);
      setSummary(summaryData);
      
      const options: any = {};
      if (filter === 'favorite') {
        options.isFavorite = true;
      } else if (filter === 'archived') {
        options.isArchived = true;
      } else {
        options.isArchived = false;
      }
      
      const reportsData = await AnalysisService.getAllAnalysisReports(user.uid, options);
      setReports(reportsData);
      
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleToggleFavorite = async (reportId: string, currentValue: boolean) => {
    if (!user) return;
    
    try {
      await AnalysisService.updateAnalysisReport(user.uid, reportId, {
        isFavorite: !currentValue,
      });
      await loadData();
    } catch (error) {
      console.error('Failed to update favorite:', error);
    }
  };
  
  const handleArchive = async (reportId: string) => {
    if (!user || !confirm('このレポートをアーカイブしますか？')) return;
    
    try {
      await AnalysisService.updateAnalysisReport(user.uid, reportId, {
        isArchived: true,
      });
      await loadData();
    } catch (error) {
      console.error('Failed to archive:', error);
    }
  };
  
  const handleDelete = async (reportId: string) => {
    if (!user || !confirm('このレポートを完全に削除しますか？')) return;
    
    try {
      await AnalysisService.deleteAnalysisReport(user.uid, reportId);
      await loadData();
      alert('レポートを削除しました');
    } catch (error) {
      console.error('Failed to delete:', error);
      alert('削除に失敗しました');
    }
  };

  const handleOpenShareModal = (report: AnalysisReport) => {
    setShareModal({
      open: true,
      report,
      shareUrl: report.sharing.shareUrl || null,
      loading: false,
      expiresInDays: 7,
      password: '',
      error: null,
    });
  };

  const handleCreateShareLink = async () => {
    if (!user || !shareModal.report) return;
    
    try {
      setShareModal(prev => ({ ...prev, loading: true, error: null }));
      
      const response = await fetch('/api/reports/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid,
          reportId: shareModal.report.id,
          expiresInDays: shareModal.expiresInDays,
          password: shareModal.password || null,
        }),
      });
      
      if (!response.ok) throw new Error('共有リンク作成に失敗しました');
      
      const data = await response.json();
      setShareModal(prev => ({ 
        ...prev, 
        shareUrl: data.shareUrl, 
        loading: false 
      }));
      
      await loadData();
      
    } catch (error) {
      console.error('Failed to create share link:', error);
      setShareModal(prev => ({ 
        ...prev, 
        error: '共有リンク作成に失敗しました', 
        loading: false 
      }));
    }
  };

  const handleCopyShareLink = () => {
    if (shareModal.shareUrl) {
      navigator.clipboard.writeText(shareModal.shareUrl);
      alert('共有リンクをコピーしました');
    }
  };

  const handleRevokeShareLink = async () => {
    if (!user || !shareModal.report || !confirm('共有リンクを無効化しますか？')) return;
    
    try {
      setShareModal(prev => ({ ...prev, loading: true, error: null }));
      
      const response = await fetch('/api/reports/share', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid,
          reportId: shareModal.report.id,
        }),
      });
      
      if (!response.ok) throw new Error('共有リンク無効化に失敗しました');
      
      setShareModal(prev => ({ ...prev, shareUrl: null, loading: false }));
      await loadData();
      
    } catch (error) {
      console.error('Failed to revoke share link:', error);
      setShareModal(prev => ({ ...prev, error: '共有リンク無効化に失敗しました', loading: false }));
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-2 dark:bg-dark">
        <div className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-body-color dark:text-dark-6">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-screen-2xl p-4 md:p-6 2xl:p-10">
        {/* Page Header - Mega Template準拠 */}
        <div className="mb-9">
          <h2 className="mb-2 text-2xl font-semibold text-dark dark:text-white">
            分析履歴
          </h2>
          <p className="text-sm font-medium text-body-color dark:text-dark-6">
            過去の分析レポート一覧
          </p>
        </div>

        {/* Summary Stats - Mega Template準拠 */}
        {summary && (
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {/* Total Reports */}
            <div className="rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="block text-sm font-medium text-body-color dark:text-dark-6">総レポート数</span>
                  <h4 className="mt-2 text-2xl font-semibold text-dark dark:text-white">
                    {summary.totalReports}
                  </h4>
                </div>
                <div className="flex h-[50px] w-[50px] items-center justify-center rounded-full bg-primary/[0.06] text-primary dark:bg-primary/10">
                  <svg className="fill-current" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18.375 3.5H9.625C8.58 3.5 7.583 3.914 6.848 4.649C6.113 5.384 5.699 6.381 5.699 7.426V20.574C5.699 21.619 6.113 22.616 6.848 23.351C7.583 24.086 8.58 24.5 9.625 24.5H18.375C19.42 24.5 20.417 24.086 21.152 23.351C21.887 22.616 22.301 21.619 22.301 20.574V7.426C22.301 6.381 21.887 5.384 21.152 4.649C20.417 3.914 19.42 3.5 18.375 3.5ZM9.625 5.25H18.375C18.956 5.25 19.513 5.481 19.925 5.893C20.337 6.305 20.568 6.862 20.568 7.443V8.75H7.432V7.443C7.432 6.862 7.663 6.305 8.075 5.893C8.487 5.481 9.044 5.25 9.625 5.25ZM18.375 22.75H9.625C9.044 22.75 8.487 22.519 8.075 22.107C7.663 21.695 7.432 21.138 7.432 20.557V10.5H20.568V20.557C20.568 21.138 20.337 21.695 19.925 22.107C19.513 22.519 18.956 22.75 18.375 22.75Z"/>
                  </svg>
                </div>
              </div>
            </div>

            {/* Favorites */}
            <div className="rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="block text-sm font-medium text-body-color dark:text-dark-6">お気に入り</span>
                  <h4 className="mt-2 text-2xl font-semibold text-dark dark:text-white">
                    {summary.favoriteReports}
                  </h4>
                </div>
                <div className="flex h-[50px] w-[50px] items-center justify-center rounded-full bg-[#F59E0B]/[0.06] text-[#F59E0B] dark:bg-[#F59E0B]/10">
                  <svg className="fill-current" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2.25L14.9438 8.15625L21.5625 9.125L16.7812 13.8125L17.8875 20.4062L12 17.2812L6.1125 20.4062L7.21875 13.8125L2.4375 9.125L9.05625 8.15625L12 2.25Z"/>
                  </svg>
                </div>
              </div>
            </div>

            {/* AI Analysis */}
            <div className="rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="block text-sm font-medium text-body-color dark:text-dark-6">AI分析</span>
                  <h4 className="mt-2 text-2xl font-semibold text-dark dark:text-white">
                    {summary.aiAnalysisCount}
                  </h4>
                </div>
                <div className="flex h-[50px] w-[50px] items-center justify-center rounded-full bg-secondary/[0.06] text-secondary dark:bg-secondary/10">
                  <svg className="fill-current" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2.25C6.615 2.25 2.25 6.615 2.25 12C2.25 17.385 6.615 21.75 12 21.75C17.385 21.75 21.75 17.385 21.75 12C21.75 6.615 17.385 2.25 12 2.25ZM12 20.25C7.44 20.25 3.75 16.56 3.75 12C3.75 7.44 7.44 3.75 12 3.75C16.56 3.75 20.25 7.44 20.25 12C20.25 16.56 16.56 20.25 12 20.25Z"/>
                    <path d="M12 6C11.4375 6 10.9375 6.5 10.9375 7.0625V12C10.9375 12.5625 11.4375 13.0625 12 13.0625C12.5625 13.0625 13.0625 12.5625 13.0625 12V7.0625C13.0625 6.5 12.5625 6 12 6Z"/>
                    <path d="M12 15C11.4375 15 10.9375 15.5 10.9375 16.0625C10.9375 16.625 11.4375 17.125 12 17.125C12.5625 17.125 13.0625 16.625 13.0625 16.0625C13.0625 15.5 12.5625 15 12 15Z"/>
                  </svg>
                </div>
              </div>
            </div>

            {/* Archived */}
            <div className="rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="block text-sm font-medium text-body-color dark:text-dark-6">アーカイブ</span>
                  <h4 className="mt-2 text-2xl font-semibold text-dark dark:text-white">
                    {summary.archivedReports}
                  </h4>
                </div>
                <div className="flex h-[50px] w-[50px] items-center justify-center rounded-full bg-[#64748B]/[0.06] text-[#64748B] dark:bg-[#64748B]/10">
                  <svg className="fill-current" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M19.5 6H4.5C3.9375 6 3.5 6.4375 3.5 7V9C3.5 9.5625 3.9375 10 4.5 10H4.84375V18C4.84375 18.5625 5.28125 19 5.84375 19H18.1562C18.7188 19 19.1562 18.5625 19.1562 18V10H19.5C20.0625 10 20.5 9.5625 20.5 9V7C20.5 6.4375 20.0625 6 19.5 6ZM17.6562 17.5H6.34375V10H17.6562V17.5ZM19 8.5H5V7.5H19V8.5Z"/>
                    <path d="M9.75 11.5H14.25C14.8125 11.5 15.25 11.9375 15.25 12.5C15.25 13.0625 14.8125 13.5 14.25 13.5H9.75C9.1875 13.5 8.75 13.0625 8.75 12.5C8.75 11.9375 9.1875 11.5 9.75 11.5Z"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filter Tabs - Mega Template準拠 */}
        <div className="mb-6 flex flex-wrap gap-3">
          <button
            onClick={() => setFilter('all')}
            className={`inline-flex items-center justify-center gap-2 rounded-md px-4.5 py-2.5 text-sm font-medium transition ${
              filter === 'all'
                ? 'bg-primary text-white'
                : 'border border-stroke bg-white text-dark hover:bg-gray-2 dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:hover:bg-dark-3'
            }`}
          >
            すべて ({reports.length})
          </button>
          <button
            onClick={() => setFilter('favorite')}
            className={`inline-flex items-center justify-center gap-2 rounded-md px-4.5 py-2.5 text-sm font-medium transition ${
              filter === 'favorite'
                ? 'bg-[#F59E0B] text-white'
                : 'border border-stroke bg-white text-dark hover:bg-gray-2 dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:hover:bg-dark-3'
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 1.5L9.908 5.364L14.25 6L11.125 9.045L11.816 13.364L8 11.364L4.184 13.364L4.875 9.045L1.75 6L6.092 5.364L8 1.5Z" fill="currentColor"/>
            </svg>
            お気に入り
          </button>
          <button
            onClick={() => setFilter('archived')}
            className={`inline-flex items-center justify-center gap-2 rounded-md px-4.5 py-2.5 text-sm font-medium transition ${
              filter === 'archived'
                ? 'bg-[#64748B] text-white'
                : 'border border-stroke bg-white text-dark hover:bg-gray-2 dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:hover:bg-dark-3'
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M13 4H3C2.725 4 2.5 4.225 2.5 4.5V6C2.5 6.275 2.725 6.5 3 6.5H3.25V12C3.25 12.275 3.475 12.5 3.75 12.5H12.25C12.525 12.5 12.75 12.275 12.75 12V6.5H13C13.275 6.5 13.5 6.275 13.5 6V4.5C13.5 4.225 13.275 4 13 4ZM11.75 11.5H4.25V6.5H11.75V11.5ZM12.5 5.5H3.5V5H12.5V5.5Z" fill="currentColor"/>
            </svg>
            アーカイブ
          </button>
        </div>

        {/* Reports List - Mega Template準拠 */}
        {reports.length === 0 ? (
          <div className="rounded-lg border border-stroke bg-white p-10 text-center dark:border-dark-3 dark:bg-dark-2">
            <svg className="mx-auto mb-4 h-16 w-16 text-body-color dark:text-dark-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mb-2 text-xl font-semibold text-dark dark:text-white">
              {filter === 'all' ? 'レポートが見つかりません' : `${filter === 'favorite' ? 'お気に入り' : 'アーカイブ'}レポートがありません`}
            </h3>
            <p className="text-sm font-medium text-body-color dark:text-dark-6">
              {filter === 'all' ? '分析ページから新しいレポートを作成してください' : 'このカテゴリにレポートを追加してください'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {reports.map((report) => (
              <div key={report.id} className="rounded-lg border border-stroke bg-white p-5 dark:border-dark-3 dark:bg-dark-2">
              <div className="mb-4 flex items-start justify-between">
                <div className="flex-1">
                  <div className="mb-2 flex items-center gap-2">
                    {report.isFavorite && (
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M10 1.875L12.4297 7.10156L18.125 7.875L14.0625 11.8281L14.9297 17.5L10 14.9297L5.07031 17.5L5.9375 11.8281L1.875 7.875L7.57031 7.10156L10 1.875Z" fill="#F2994A"/>
                      </svg>
                    )}
                    {report.isArchived && (
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M16.25 5H3.75C3.40625 5 3.125 5.28125 3.125 5.625V7.5C3.125 7.84375 3.40625 8.125 3.75 8.125H4.0625V15C4.0625 15.3438 4.34375 15.625 4.6875 15.625H15.3125C15.6562 15.625 15.9375 15.3438 15.9375 15V8.125H16.25C16.5938 8.125 16.875 7.84375 16.875 7.5V5.625C16.875 5.28125 16.5938 5 16.25 5ZM14.6875 14.375H5.3125V8.125H14.6875V14.375ZM15.625 6.875H4.375V6.25H15.625V6.875Z" fill="#9B51E0"/>
                      </svg>
                    )}
                  </div>
                  <h3 className="mb-1 text-lg font-bold text-dark dark:text-white">
                    {report.title}
                  </h3>
                  <p className="text-sm text-body-color dark:text-dark-6">
                    {report.metadata.createdAt.toDate().toLocaleDateString('ja-JP')}
                  </p>
                </div>
                <button
                  onClick={() => handleToggleFavorite(report.id, report.isFavorite)}
                  className="transition-transform hover:scale-110"
                >
                  {report.isFavorite ? (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 2.25L15.0938 8.52188L21.75 9.45L16.875 14.1938L17.9688 20.8125L12 17.5938L6.03125 20.8125L7.125 14.1938L2.25 9.45L8.90625 8.52188L12 2.25Z" fill="#F2994A"/>
                    </svg>
                  ) : (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 2.25L15.0938 8.52188L21.75 9.45L16.875 14.1938L17.9688 20.8125L12 17.5938L6.03125 20.8125L7.125 14.1938L2.25 9.45L8.90625 8.52188L12 2.25Z" stroke="#6B7280" strokeWidth="2" fill="none"/>
                    </svg>
                  )}
                </button>
              </div>

              <div className="mb-4 space-y-2 border-y border-stroke py-4 dark:border-dark-3">
                {report.ga4Data && (
                  <div className="flex items-center gap-2 text-sm text-body-color dark:text-dark-6">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <span className="font-medium">GA4 Data</span>
                  </div>
                )}
                {report.gscData && (
                  <div className="flex items-center gap-2 text-sm text-body-color dark:text-dark-6">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <span className="font-medium">GSC Data</span>
                  </div>
                )}
                {report.aiAnalysis && (
                  <div className="flex items-center gap-2 text-sm text-secondary">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    <span className="font-medium">AI Analyzed</span>
                  </div>
                )}
              </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => router.push(`/analysis?reportId=${report.id}`)}
                    className="inline-flex items-center justify-center rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-white transition hover:bg-opacity-90"
                  >
                    表示
                  </button>
                  {!report.sharing.enabled ? (
                    <button
                      onClick={() => handleOpenShareModal(report)}
                      className="inline-flex items-center justify-center gap-1.5 rounded-md border border-stroke px-3.5 py-2 text-sm font-medium text-dark transition hover:bg-gray-2 dark:border-dark-3 dark:text-white dark:hover:bg-dark-3"
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M13 10.5C12.3 10.5 11.7 10.8 11.2 11.2L5.9 8.2C5.95 8 6 7.8 6 7.5C6 7.2 5.95 7 5.9 6.8L11.1 3.8C11.6 4.2 12.3 4.5 13 4.5C14.4 4.5 15.5 3.4 15.5 2C15.5 0.6 14.4 -0.5 13 -0.5C11.6 -0.5 10.5 0.6 10.5 2C10.5 2.3 10.55 2.5 10.6 2.7L5.4 5.7C4.9 5.3 4.2 5 3.5 5C2.1 5 1 6.1 1 7.5C1 8.9 2.1 10 3.5 10C4.2 10 4.9 9.7 5.4 9.3L10.7 12.3C10.65 12.5 10.6 12.7 10.6 12.9C10.6 14.3 11.7 15.4 13.1 15.4C14.5 15.4 15.6 14.3 15.6 12.9C15.6 11.5 14.5 10.5 13 10.5Z" fill="currentColor"/>
                      </svg>
                      共有
                    </button>
                  ) : (
                    <button
                      onClick={() => handleOpenShareModal(report)}
                      className="inline-flex items-center justify-center gap-1.5 rounded-md bg-secondary px-3.5 py-2 text-sm font-medium text-white transition hover:bg-opacity-90"
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M13 10.5C12.3 10.5 11.7 10.8 11.2 11.2L5.9 8.2C5.95 8 6 7.8 6 7.5C6 7.2 5.95 7 5.9 6.8L11.1 3.8C11.6 4.2 12.3 4.5 13 4.5C14.4 4.5 15.5 3.4 15.5 2C15.5 0.6 14.4 -0.5 13 -0.5C11.6 -0.5 10.5 0.6 10.5 2C10.5 2.3 10.55 2.5 10.6 2.7L5.4 5.7C4.9 5.3 4.2 5 3.5 5C2.1 5 1 6.1 1 7.5C1 8.9 2.1 10 3.5 10C4.2 10 4.9 9.7 5.4 9.3L10.7 12.3C10.65 12.5 10.6 12.7 10.6 12.9C10.6 14.3 11.7 15.4 13.1 15.4C14.5 15.4 15.6 14.3 15.6 12.9C15.6 11.5 14.5 10.5 13 10.5Z" fill="white"/>
                      </svg>
                      共有中
                    </button>
                  )}
                  {!report.isArchived && (
                    <button
                      onClick={() => handleArchive(report.id)}
                      className="inline-flex items-center justify-center rounded-md border border-stroke px-3 py-2 text-sm font-medium text-dark transition hover:bg-gray-2 dark:border-dark-3 dark:text-white dark:hover:bg-dark-3"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M13 4H3C2.725 4 2.5 4.225 2.5 4.5V6C2.5 6.275 2.725 6.5 3 6.5H3.25V12C3.25 12.275 3.475 12.5 3.75 12.5H12.25C12.525 12.5 12.75 12.275 12.75 12V6.5H13C13.275 6.5 13.5 6.275 13.5 6V4.5C13.5 4.225 13.275 4 13 4Z" fill="currentColor"/>
                    </svg>
                  </button>
                  )}
                  <button
                    onClick={() => handleDelete(report.id)}
                    className="inline-flex items-center justify-center rounded-md border border-red px-3 py-2 text-sm font-medium text-red transition hover:bg-red/10"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M13.5 3.5H11.5V2.5C11.5 1.95 11.05 1.5 10.5 1.5H5.5C4.95 1.5 4.5 1.95 4.5 2.5V3.5H2.5C2.225 3.5 2 3.725 2 4V4.5C2 4.775 2.225 5 2.5 5H3V13.5C3 14.05 3.45 14.5 4 14.5H12C12.55 14.5 13 14.05 13 13.5V5H13.5C13.775 5 14 4.775 14 4.5V4C14 3.725 13.775 3.5 13.5 3.5ZM5.5 2.5H10.5V3.5H5.5V2.5ZM12 13.5H4V5H12V13.5Z" fill="currentColor"/>
                      <path d="M6.5 6.5H7.5V12H6.5V6.5Z" fill="currentColor"/>
                      <path d="M8.5 6.5H9.5V12H8.5V6.5Z" fill="currentColor"/>
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Share Modal - Mega Template準拠 */}
        {shareModal.open && (
          <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
              <div className="mb-5 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-dark dark:text-white">
                  レポート共有
                </h3>
              <button
                onClick={() => setShareModal({ ...shareModal, open: false })}
                className="text-body-color hover:text-dark dark:text-dark-6 dark:hover:text-white"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

              {shareModal.error && (
                <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3.5 text-sm font-medium text-red dark:border-red-900/50 dark:bg-red-900/20">
                  {shareModal.error}
                </div>
              )}

              {!shareModal.shareUrl ? (
                <div className="space-y-4">
                  <div>
                    <label className="mb-2.5 block text-sm font-medium text-dark dark:text-white">
                      有効期限（日数）
                    </label>
                    <input
                      type="number"
                      value={shareModal.expiresInDays || ''}
                      onChange={(e) => setShareModal({ ...shareModal, expiresInDays: parseInt(e.target.value) || null })}
                      className="w-full rounded-md border border-stroke bg-transparent px-4.5 py-3 text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:text-white"
                      placeholder="7"
                    />
                  </div>

                  <div>
                    <label className="mb-2.5 block text-sm font-medium text-dark dark:text-white">
                      パスワード（任意）
                    </label>
                    <input
                      type="password"
                      value={shareModal.password}
                      onChange={(e) => setShareModal({ ...shareModal, password: e.target.value })}
                      className="w-full rounded-md border border-stroke bg-transparent px-4.5 py-3 text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:text-white"
                      placeholder="任意のパスワード"
                    />
                  </div>

                  <button
                    onClick={handleCreateShareLink}
                    disabled={shareModal.loading}
                    className="w-full rounded-md bg-primary px-5 py-3 text-base font-medium text-white transition hover:bg-opacity-90 disabled:opacity-50"
                  >
                    {shareModal.loading ? '作成中...' : '共有リンクを作成'}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="mb-2.5 block text-sm font-medium text-dark dark:text-white">
                      共有URL
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={shareModal.shareUrl}
                        readOnly
                        className="flex-1 rounded-md border border-stroke bg-gray-2 px-4.5 py-3 text-dark dark:border-dark-3 dark:bg-dark-3 dark:text-white"
                      />
                      <button
                        onClick={handleCopyShareLink}
                        className="rounded-md bg-primary px-4.5 py-3 text-base font-medium text-white transition hover:bg-opacity-90"
                      >
                        コピー
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={handleRevokeShareLink}
                    disabled={shareModal.loading}
                    className="w-full rounded-md border border-red px-5 py-3 text-base font-medium text-red transition hover:bg-red/10 disabled:opacity-50"
                  >
                    {shareModal.loading ? '無効化中...' : '共有リンクを無効化'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}