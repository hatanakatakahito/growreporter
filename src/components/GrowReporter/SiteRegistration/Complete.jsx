import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { db } from '../../../config/firebase';
import { doc, getDoc } from 'firebase/firestore';
import Confetti from 'react-confetti';
import { Check } from 'lucide-react';
import DotWaveSpinner from '../../common/DotWaveSpinner';
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
  const [numberOfPieces, setNumberOfPieces] = useState(150);
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

  // 紙吹雪表示中は横スクロールを防ぐ
  useEffect(() => {
    if (showConfetti) {
      document.body.style.overflowX = 'hidden';
      document.documentElement.style.overflowX = 'hidden';
    } else {
      document.body.style.overflowX = '';
      document.documentElement.style.overflowX = '';
    }

    // クリーンアップ
    return () => {
      document.body.style.overflowX = '';
      document.documentElement.style.overflowX = '';
    };
  }, [showConfetti]);

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
      
      // 4. 紙吹雪を徐々に減らす（5秒後から開始）
      setTimeout(() => setNumberOfPieces(120), 5000);
      setTimeout(() => setNumberOfPieces(90), 7000);
      setTimeout(() => setNumberOfPieces(60), 9000);
      setTimeout(() => setNumberOfPieces(30), 11000);
      setTimeout(() => setNumberOfPieces(15), 13000);
      
      // 5. 紙吹雪完全停止（15秒後）
      setTimeout(() => setShowConfetti(false), 15000);
    }
  }, [isLoading, siteData]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: 'rgb(244, 244, 244)' }}>
        <div className="text-center">
          <div className="mb-6"><DotWaveSpinner size="lg" /></div>
          <p className="text-lg font-medium text-primary">登録処理中...</p>
          <p className="mt-2 text-sm text-body-color">もうすぐ完了します</p>
        </div>
      </div>
    );
  }

  if (!siteData) {
    return null;
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden" style={{ backgroundColor: 'rgb(244, 244, 244)' }}>
      {/* 紙吹雪アニメーション */}
      {showConfetti && (
        <div className="fixed inset-0 overflow-hidden" style={{ pointerEvents: 'none' }}>
          <Confetti
            width={windowSize.width}
            height={windowSize.height}
            numberOfPieces={numberOfPieces}
            recycle={numberOfPieces > 0}
            colors={['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B195', '#C06C84', '#6C5B7B', '#355C7D']}
            gravity={0.08}  // よりゆっくり落下（0.15 → 0.08）
            wind={0.005}    // 微風効果（横方向のゆらぎ）
          />
        </div>
      )}

      <div className="py-12">
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
                <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-primary shadow-2xl">
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
              <h1 className="mb-4 text-5xl font-bold text-primary">
                登録完了！
              </h1>
              <p className="text-xl font-medium text-dark dark:text-white">
                サイト「{siteData.siteName}」の登録が完了しました
              </p>
            </div>

            {/* ボタン（サイト名の下に配置） */}
            <div className="my-8 flex flex-col gap-4 sm:flex-row">
              <button
                onClick={() => navigate(`/dashboard?siteId=${siteData.id}`)}
                className="group relative flex-1 overflow-hidden rounded-xl bg-primary px-8 py-4 text-center text-base font-semibold text-white shadow-lg transition-all hover:bg-opacity-90"
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
                className="flex-1 rounded-xl border-2 border-stroke bg-white px-8 py-4 text-center text-base font-semibold text-dark transition-all hover:bg-gray-2 dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:hover:bg-dark-3"
              >
                サイト一覧へ戻る
              </button>
            </div>

            {/* 登録内容サマリー */}
            <div className="transform transition-all duration-700 delay-500">
              <CompleteSummary siteData={siteData} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

