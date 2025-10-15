'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Loading from '@/components/common/Loading';

interface ShareLinkData {
  userId: string;
  shareToken: string;
  title: string;
  allowedPages: string[];
  expiresAt: string;
  createdAt: string;
  isActive: boolean;
  viewCount: number;
}

export default function ShareViewPage() {
  const params = useParams();
  const router = useRouter();
  const token = params?.token as string;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareData, setShareData] = useState<ShareLinkData | null>(null);

  useEffect(() => {
    if (!token) {
      setError('無効なリンクです');
      setLoading(false);
      return;
    }

    async function validateAndLoadShareLink() {
      try {
        const response = await fetch(`/api/share/validate?token=${token}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          setError(errorData.error || '閲覧リンクが無効です');
          setLoading(false);
          return;
        }

        const data = await response.json();
        setShareData(data.shareLink);
        
        // メインページにリダイレクト（読み取り専用モード）
        router.push(`/summary?shareToken=${token}`);
      } catch (err: any) {
        console.error('閲覧リンク検証エラー:', err);
        setError('閲覧リンクの検証に失敗しました');
        setLoading(false);
      }
    }

    validateAndLoadShareLink();
  }, [token, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loading size={48} className="mb-4" />
          <p className="text-lg text-body-color dark:text-dark-6">リンクを検証中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="max-w-md rounded-lg border border-stroke bg-white p-8 text-center dark:border-dark-3 dark:bg-dark-2">
          <div className="mb-4 flex justify-center">
            <svg className="h-16 w-16 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="mb-2 text-xl font-semibold text-dark dark:text-white">アクセスできません</h2>
          <p className="text-body-color dark:text-dark-6">{error}</p>
        </div>
      </div>
    );
  }

  return null;
}

