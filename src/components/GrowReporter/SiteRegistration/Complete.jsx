import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { db } from '../../../config/firebase';
import { doc, getDoc } from 'firebase/firestore';
import Confetti from 'react-confetti';
import { Check } from 'lucide-react';
import MainLayout from '../../Layout/MainLayout';
import CompleteSummary from './CompleteSummary';

export default function Complete() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentUser } = useAuth();
  const siteId = searchParams.get('siteId');

  const [siteData, setSiteData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const [numberOfPieces, setNumberOfPieces] = useState(400);
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  // ウィンドウサイズ変更を監視
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
        // ローディング終了後、演出開始
        setTimeout(() => setIsLoading(false), 500);
      }
    };

    loadSiteData();
  }, [siteId, navigate]);

  // 演出のタイムライン
  useEffect(() => {
    if (!isLoading && siteData) {
      // 1. 紙吹雪開始
      setTimeout(() => setShowConfetti(true), 100);
      
      // 2. 成功アイコン表示
      setTimeout(() => setShowSuccess(true), 300);
      
      // 3. コンテンツ表示
      setTimeout(() => setShowContent(true), 800);
      
      // 4. 紙吹雪を徐々に減らす
      setTimeout(() => setNumberOfPieces(200), 3000);
      setTimeout(() => setNumberOfPieces(100), 4000);
      setTimeout(() => setNumberOfPieces(50), 5000);
      
      // 5. 紙吹雪停止
      setTimeout(() => setShowConfetti(false), 6000);
    }
  }, [isLoading, siteData]);

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 to-purple-500/5">
          <div className="text-center">
            <div className="mx-auto mb-6 h-16 w-16 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            <p className="text-lg font-medium text-primary">登録処理中...</p>
            <p className="mt-2 text-sm text-body-color">もうすぐ完了します</p>
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
      {/* 紙吹雪アニメーション */}
      {showConfetti && (
        <Confetti
          width={windowSize.width}
          height={windowSize.height}
          numberOfPieces={numberOfPieces}
          recycle={numberOfPieces > 0}
          colors={['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4']}
          gravity={0.3}
        />
      )}

      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-purple-500/5 py-12">
        <div className="mx-auto max-w-4xl px-6">
          {/* 成功アイコン（アニメーション） */}
          <div className="mb-8 flex justify-center">
            <div
              className={`transform transition-all duration-700 ${
                showSuccess
                  ? 'scale-100 opacity-100'
                  : 'scale-0 opacity-0'
              }`}
            >
              <div className="relative">
                {/* 背景の円（パルスアニメーション） */}
                <div className="absolute inset-0 animate-ping rounded-full bg-primary/20"></div>
                
                {/* メインアイコン */}
                <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-primary to-purple-600 shadow-2xl">
                  <Check className="h-12 w-12 text-white" strokeWidth={3} />
                </div>
              </div>
            </div>
          </div>

          {/* 成功メッセージ（フェードイン） */}
          <div
            className={`transform transition-all duration-700 delay-300 ${
              showContent
                ? 'translate-y-0 opacity-100'
                : 'translate-y-4 opacity-0'
            }`}
          >
            <div className="mb-8 text-center">
              <h1 className="mb-4 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-5xl font-bold text-transparent">
                登録完了！
              </h1>
              <p className="text-xl font-medium text-dark dark:text-white">
                サイト「{siteData.siteName}」の登録が完了しました
              </p>
              <p className="mt-2 text-body-color">
                データ分析の準備を開始しています 🚀
              </p>
            </div>

            {/* 登録内容サマリー（カード） */}
            <div className="transform transition-all duration-700 delay-500">
              <div className="overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-dark-2">
                <div className="bg-gradient-to-r from-primary to-purple-600 px-6 py-4">
                  <h2 className="text-lg font-semibold text-white">
                    登録内容
                  </h2>
                </div>
                <div className="p-6">
                  <CompleteSummary siteData={siteData} />
                </div>
              </div>
            </div>

            {/* ボタン（フェードイン） */}
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <button
                onClick={() => navigate(`/dashboard?siteId=${siteData.id}`)}
                className="group relative flex-1 overflow-hidden rounded-xl bg-gradient-to-r from-primary to-purple-600 px-8 py-4 text-center text-base font-semibold text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  ダッシュボードを見る
                  <svg
                    className="h-5 w-5 transition-transform group-hover:translate-x-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7l5 5m0 0l-5 5m5-5H6"
                    />
                  </svg>
                </span>
              </button>
              <button
                onClick={() => navigate('/sites/list')}
                className="flex-1 rounded-xl border-2 border-primary/20 bg-white px-8 py-4 text-center text-base font-semibold text-primary transition-all hover:scale-105 hover:border-primary/40 hover:bg-primary/5 dark:bg-dark-2 dark:text-white dark:hover:bg-dark-3"
              >
                サイト一覧へ戻る
              </button>
            </div>

            {/* 次のステップへの案内 */}
            <div className="mt-8 rounded-xl border border-primary/20 bg-primary/5 p-6 dark:bg-primary/10">
              <h3 className="mb-3 flex items-center gap-2 font-semibold text-primary">
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                次のステップ
              </h3>
              <ul className="space-y-2 text-sm text-body-color">
                <li className="flex items-start gap-2">
                  <span className="mt-1 text-primary">✓</span>
                  <span>ダッシュボードでサイトのパフォーマンスを確認</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 text-primary">✓</span>
                  <span>AI分析レポートで改善提案を確認</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 text-primary">✓</span>
                  <span>定期的なデータ更新で成長をトラッキング</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

