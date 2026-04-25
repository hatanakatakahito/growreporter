import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import Confetti from 'react-confetti';
import { Check, ChevronRight, Pencil, Plus } from 'lucide-react';

import { useAuth } from '../../../contexts/AuthContext';
import { db } from '../../../config/firebase';
import logoImg from '../../../assets/img/logo.svg';
import DotWaveSpinner from '../../common/DotWaveSpinner';
import { Button } from '../../ui/button';

/**
 * サイト登録完了画面
 * - 紙吹雪は登録の達成感演出として残す (15 秒で徐々にフェードアウト)
 * - 登録内容を 5 セクションのカード形式で表示
 * - 各セクションに「編集」リンク (= 編集モードの該当ステップへ遷移)
 * - 未設定セクション (任意項目) は「設定する」CTA を表示
 */
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
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
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
          // 操作方法ガイドの「サイトを登録する」を自動完了
          if (currentUser?.uid) {
            try {
              await updateDoc(doc(db, 'users', currentUser.uid), {
                'onboarding.steps.siteRegistered': true,
              });
            } catch (e) {
              console.warn('[Complete] onboarding マーク失敗:', e);
            }
          }
        } else {
          navigate('/sites/list');
        }
      } catch (err) {
        console.error('Error loading site:', err);
        navigate('/sites/list');
      } finally {
        setTimeout(() => setIsLoading(false), 500);
      }
    };
    loadSiteData();
  }, [siteId, navigate, currentUser]);

  // 演出のタイムライン
  useEffect(() => {
    if (!isLoading && siteData) {
      setTimeout(() => setShowConfetti(true), 100);
      setTimeout(() => setShowSuccess(true), 300);
      setTimeout(() => setShowContent(true), 800);
      setTimeout(() => setNumberOfPieces(120), 5000);
      setTimeout(() => setNumberOfPieces(90), 7000);
      setTimeout(() => setNumberOfPieces(60), 9000);
      setTimeout(() => setNumberOfPieces(30), 11000);
      setTimeout(() => setNumberOfPieces(15), 13000);
      setTimeout(() => setShowConfetti(false), 15000);
    }
  }, [isLoading, siteData]);

  // 5 セクションのデータを構築
  const sections = useMemo(() => {
    if (!siteData) return [];
    return [
      {
        n: 1,
        title: '基本情報',
        optional: false,
        filled: !!(siteData.siteName && siteData.siteUrl),
        items: [
          { label: 'サイト名', value: siteData.siteName },
          { label: 'URL', value: siteData.siteUrl },
        ],
      },
      {
        n: 2,
        title: 'Google Analytics 4 連携',
        optional: false,
        filled: !!siteData.ga4PropertyId,
        items: siteData.ga4PropertyId
          ? [
              { label: 'プロパティ', value: siteData.ga4PropertyName },
              { label: 'アカウント', value: siteData.ga4GoogleAccount },
            ]
          : [],
      },
      {
        n: 3,
        title: 'Search Console 連携',
        optional: true,
        filled: !!siteData.gscSiteUrl,
        items: siteData.gscSiteUrl ? [{ label: 'サイト', value: siteData.gscSiteUrl }] : [],
      },
      {
        n: 4,
        title: 'コンバージョン設定',
        optional: true,
        filled: (siteData.conversionEvents?.length || 0) > 0,
        countLabel: siteData.conversionEvents?.length ? `(${siteData.conversionEvents.length} 件)` : '',
        bullets: (siteData.conversionEvents || []).map((ev) => ev.displayName || ev.eventName),
      },
      {
        n: 5,
        title: '目標設定',
        optional: true,
        filled: (siteData.kpiSettings?.kpiList?.length || 0) > 0,
        countLabel: siteData.kpiSettings?.kpiList?.length ? `(${siteData.kpiSettings.kpiList.length} 件)` : '',
        bullets: (siteData.kpiSettings?.kpiList || []).map(
          (kpi) => `${kpi.label}: ${Number(kpi.target).toLocaleString()} / 月`,
        ),
      },
    ];
  }, [siteData]);

  // 編集ボタン: 該当ステップを開く
  const handleEditSection = (stepNumber) => {
    navigate(`/sites/${siteId}/edit?step=${stepNumber}`);
  };

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
      {/* 紙吹雪アニメーション (本番環境準拠) */}
      {showConfetti && (
        <div className="fixed inset-0 overflow-hidden" style={{ pointerEvents: 'none' }}>
          <Confetti
            width={windowSize.width}
            height={windowSize.height}
            numberOfPieces={numberOfPieces}
            recycle={numberOfPieces > 0}
            colors={['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B195', '#C06C84', '#6C5B7B', '#355C7D']}
            gravity={0.08}
            wind={0.005}
          />
        </div>
      )}

      {/* ロゴ (ウィザードと共通) */}
      <div className="flex justify-center pt-8 pb-6">
        <img src={logoImg} alt="GROW REPORTER" className="h-10 w-auto" />
      </div>

      {/* メインコンテンツ */}
      <div className="mx-auto max-w-4xl px-6 pb-16">
        <div
          className={`transform transition-all duration-700 ${
            showContent ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
          }`}
        >
          <section className="rounded-xl border border-stroke bg-white shadow-sm">
            {/* ヘッダー: 完了 hero */}
            <div className="px-8 pt-10 pb-6 text-center">
              <h1 className="text-2xl font-bold text-primary mb-1.5">登録が完了しました</h1>
              <p className="text-sm text-body-color">
                サイト「{siteData.siteName}」のデータ収集を開始しました。
              </p>

              {/* メインアクションボタン (ファーストビューに見えるよう hero 直下) */}
              <div className="mt-6 flex items-center justify-center gap-3 flex-wrap">
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={() => navigate('/sites/list')}
                >
                  サイト一覧へ戻る
                </Button>
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => navigate(`/dashboard?siteId=${siteData.id}`)}
                >
                  ダッシュボードを見る
                  <ChevronRight data-slot="icon" />
                </Button>
              </div>
            </div>

            {/* ボディ: 各セクションを独立カードで表示 */}
            <div className="px-8 pb-8 space-y-3">
              {sections.map((sec) => (
                <SectionCard
                  key={sec.n}
                  section={sec}
                  onEdit={() => handleEditSection(sec.n)}
                />
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

/**
 * 1 セクション分のカード (B 案: 独立カード形式)
 */
function SectionCard({ section, onEdit }) {
  const { n, title, optional, filled, items, bullets, countLabel } = section;
  const cardCls = filled
    ? 'rounded-lg bg-gray-50 px-5 py-4'
    : 'rounded-lg bg-gray-50/40 px-5 py-4';

  return (
    <div className={`flex items-start gap-3 ${cardCls}`}>
      {/* 番号バブル: 完了済みは緑チェック / 未設定は番号グレー */}
      {filled ? (
        <span className="flex-shrink-0 w-8 h-8 rounded-full bg-green-50 flex items-center justify-center">
          <Check className="w-4 h-4 text-green-600" strokeWidth={3} />
        </span>
      ) : (
        <span className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 text-gray-400 text-sm font-semibold flex items-center justify-center">
          {n}
        </span>
      )}

      <div className="flex-1 min-w-0">
        {/* タイトル + 編集ボタン */}
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <p className={`text-sm font-semibold ${filled ? 'text-dark' : 'text-body-color'}`}>
            {title}
            {optional && (
              <span className="ml-1 text-xs text-body-color font-normal">
                {countLabel || '(任意)'}
              </span>
            )}
          </p>
          {filled ? (
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium text-body-color hover:text-primary hover:bg-gray-100 transition flex-shrink-0"
            >
              <Pencil className="w-3.5 h-3.5" />
              編集
            </button>
          ) : (
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline cursor-pointer flex-shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              設定する
            </button>
          )}
        </div>

        {/* 値表示 */}
        {filled ? (
          <>
            {items && items.length > 0 && (
              <div className="text-sm text-dark space-y-0.5">
                {items.map((item, idx) => (
                  <div key={idx} className="break-all">
                    <span className="text-body-color">{item.label}:</span> {item.value}
                  </div>
                ))}
              </div>
            )}
            {bullets && bullets.length > 0 && (
              <div className="text-sm text-dark space-y-0.5">
                {bullets.map((b, idx) => (
                  <div key={idx}>・{b}</div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="text-sm text-body-color">未設定</div>
        )}
      </div>
    </div>
  );
}
