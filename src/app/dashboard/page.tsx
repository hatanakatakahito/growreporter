'use client';

import { useAuth } from '@/lib/auth/authContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
      return;
    }

    if (!user) return;

    // 初回設定完了チェック
    const checkOnboarding = async () => {
      try {
        const { UserProfileService } = await import('@/lib/user/userProfileService');
        const profile = await UserProfileService.getUserProfile(user.uid);
        
        // 初回設定が完了していない場合はサイト設定画面へ
        if (!profile?.metadata?.hasCompletedOnboarding) {
          router.push('/site-settings');
          return;
        }
      } catch (error) {
        console.error('プロフィール取得エラー:', error);
      }
    };

    checkOnboarding();
  }, [user, authLoading, router]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-2 dark:bg-dark">
        <div className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-body-color dark:text-dark-6">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-screen-2xl p-4 md:p-6 2xl:p-10">
        {/* Page Header */}
        <div className="mb-6">
          <h2 className="mb-2 text-2xl font-semibold text-dark dark:text-white">
            ダッシュボード
          </h2>
          <p className="text-sm font-medium text-body-color dark:text-dark-6">
            コンテンツは追って実装予定です
          </p>
        </div>

        {/* Empty State */}
        <div className="rounded-lg border border-stroke bg-white p-12 text-center dark:border-dark-3 dark:bg-dark-2">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gray-2 dark:bg-dark-3">
            <svg
              className="h-10 w-10 text-body-color dark:text-dark-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
          <h3 className="mb-2 text-lg font-semibold text-dark dark:text-white">
            ダッシュボード
          </h3>
          <p className="text-sm text-body-color dark:text-dark-6">
            コンテンツは追って実装予定です
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
