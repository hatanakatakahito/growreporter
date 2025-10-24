import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { db } from '../../../config/firebase';
import { doc, getDoc } from 'firebase/firestore';
import MainLayout from '../../Layout/MainLayout';
import CompleteSummary from './CompleteSummary';

export default function Complete() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentUser } = useAuth();
  const siteId = searchParams.get('siteId');

  const [siteData, setSiteData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // サイトデータ読み込み
  useEffect(() => {
    const loadSiteData = async () => {
      if (!siteId) {
        navigate('/sites/list');
        return;
      }

      try {
        const siteDoc = await getDoc(doc(db, 'sites', siteId));
        if (siteDoc.exists()) {
          setSiteData({ id: siteDoc.id, ...siteDoc.data() });
        } else {
          navigate('/sites/list');
        }
      } catch (err) {
        console.error('Error loading site:', err);
        navigate('/sites/list');
      } finally {
        setIsLoading(false);
      }
    };

    loadSiteData();
  }, [siteId, navigate]);

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            <p className="mt-4 text-body-color">読み込み中...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!siteData) {
    return null;
  }

  return (
    <MainLayout>
      <div className="p-6">
        <div className="mx-auto max-w-4xl">
          {/* 成功メッセージ */}
          <div className="mb-8 text-center">
            <h1 className="mb-2 text-3xl font-bold text-dark dark:text-white">
              サイト登録が完了しました！
            </h1>
            <p className="text-body-color">
              サイト「{siteData.siteName}」の登録が完了しました。<br />
              データ分析の準備を開始しています。
            </p>
          </div>

          {/* 登録内容サマリー */}
          <CompleteSummary siteData={siteData} />

          {/* ボタン */}
          <div className="mt-8 flex gap-4">
            <button
              onClick={() => navigate(`/dashboard?siteId=${siteData.id}`)}
              className="flex-1 rounded-md bg-primary px-6 py-3 text-center text-sm font-medium text-white transition hover:bg-opacity-90"
            >
              ダッシュボードを見る
            </button>
            <button
              onClick={() => navigate('/sites/list')}
              className="flex-1 rounded-md border border-stroke bg-white px-6 py-3 text-center text-sm font-medium text-dark transition hover:bg-gray-2 dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:hover:bg-dark-3"
            >
              サイト一覧へ戻る
            </button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

