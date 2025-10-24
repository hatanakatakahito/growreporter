import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSite } from '../contexts/SiteContext';
import MainLayout from './Layout/MainLayout';

export default function Dashboard() {
  const { currentUser, userProfile, logout } = useAuth();
  const { sites, selectedSite, selectSite } = useSite();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // URLのsiteIdパラメータからサイトを選択
  useEffect(() => {
    const siteIdFromUrl = searchParams.get('siteId');
    if (siteIdFromUrl && siteIdFromUrl !== selectedSite?.id) {
      selectSite(siteIdFromUrl);
    }
  }, [searchParams, selectedSite, selectSite]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <MainLayout
      title={selectedSite ? `${selectedSite.siteName} - ダッシュボード` : 'ダッシュボード'}
      subtitle="サイトの分析データと改善状況を確認できます"
      showSiteSelector={true}
    >
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          {/* 準備中表示 */}
          <div className="flex min-h-[60vh] items-center justify-center rounded-lg bg-white border border-stroke p-12 shadow-sm dark:border-dark-3 dark:bg-dark-2">
            <div className="text-center">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                <svg className="h-10 w-10 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
              </div>
              <h2 className="mb-3 text-2xl font-bold text-dark dark:text-white">
                コンテンツ準備中
              </h2>
              <p className="mb-8 text-body-color">
                ダッシュボード機能は現在開発中です。<br />
                まずはサイトを登録して、データ分析の準備を始めましょう。
              </p>
              <button
                onClick={() => navigate('/sites/new')}
                className="rounded-md bg-primary px-8 py-3 text-sm font-medium text-white hover:bg-opacity-90"
              >
                サイトを登録
              </button>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
