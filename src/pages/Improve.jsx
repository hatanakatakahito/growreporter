import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useSite } from '../contexts/SiteContext';
import { useSidebar } from '../contexts/SidebarContext';
import { useSearchParams, useNavigate } from 'react-router-dom';
import AnalysisHeader from '../components/Analysis/AnalysisHeader';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { Sparkles, Trash2, Download, Mail, ChevronUp, ChevronDown, ExternalLink, Edit, X, FileText, Clock, TrendingUp, ChevronLeft, ChevronRight, AlertCircle, RefreshCw, LayoutDashboard, Share2 } from 'lucide-react';
import DotWaveSpinner from '../components/common/DotWaveSpinner';
import { setPageTitle } from '../utils/pageTitle';
import { db, functions } from '../config/firebase';
import { httpsCallable } from 'firebase/functions';
import { collection, query, where, limit, getDocs, updateDoc, doc, deleteDoc, addDoc, serverTimestamp, getDoc, onSnapshot, deleteField } from 'firebase/firestore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ImprovementDialog from '../components/Improve/ImprovementDialog';
import EvaluationModal from '../components/Improve/EvaluationModal';
import CompletionDialog from '../components/Improve/CompletionDialog';
import EffectMeasurementPanel from '../components/Improve/EffectMeasurementPanel';
import AIGenerationModal from '../components/Improve/AIGenerationModal';
import ImprovementFocusModal from '../components/Improve/ImprovementFocusModal';
import ConsultationFormModal from '../components/Improve/ConsultationFormModal';
import ImplementationCheckGuideDialog from '../components/Improve/ImplementationCheckGuideDialog';
import StatusActionCell from '../components/Improve/StatusActionCell';
import UpgradeModal from '../components/common/UpgradeModal';
import BusinessPlanLockOverlay from '../components/common/BusinessPlanLockOverlay';
import { usePlan } from '../hooks/usePlan';
import { useAuth } from '../contexts/AuthContext';
import { useAutoTour } from '../hooks/useAutoTour';
import { useOnboarding } from '../hooks/useOnboarding';
import TourHelpButton from '../components/Onboarding/TourHelpButton';
import { generateAndAddImprovements } from '../utils/generateAndAddImprovements';
import { downloadImprovementsExcel } from '../utils/exportImprovementsToExcel';
import { formatEstimatedPriceLabel, formatEstimatedDeliveryLabel } from '../utils/improvementEstimate';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';

const categoryLabels = {
  acquisition: '集客',
  content: 'コンテンツ',
  design: 'デザイン',
  feature: '機能',
  other: 'その他',
};
const categoryColors = {
  acquisition: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
  content: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300',
  design: 'bg-pink-100 text-pink-800 dark:bg-pink-900/20 dark:text-pink-300',
  feature: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
  other: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300',
};
const priorityLabels = { high: '高', medium: '中', low: '低' };

const ExcelIcon = ({ className, disabled }) => (
  <svg className={className} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="1" y="1" width="14" height="14" rx="2" fill={disabled ? '#9CA3AF' : '#217346'} />
    <path d="M5.5 4.5L8 8L5.5 11.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M10.5 4.5L8 8L10.5 11.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const statusLabels = { draft: '起案', in_progress: '対応中', completed: '完了', archived: 'アーカイブ' };
const priorityColors = {
  high: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
  medium: 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300',
  low: 'bg-gray-100 text-gray-700 dark:bg-gray-700/20 dark:text-gray-300',
};

/**
 * description を 3セクション（現状の問題 / 提案内容 / なぜ効くか）に分解。
 * 新フォーマット (【現状の問題】...【提案内容】...【なぜ効くか】...) は分解、
 * 旧フォーマット（長文1パラグラフ）は { legacy: text } として返す。
 */
// 丸数字 → 算用数字マップ
const CIRCLED_NUM_MAP = { '①':1,'②':2,'③':3,'④':4,'⑤':5,'⑥':6,'⑦':7,'⑧':8,'⑨':9,'⑩':10 };

// 【提案内容】本文から「①<タイトル>（：or \n）<補足>」形式の項目を抽出
// 2 件以上抽出できた場合のみ配列を返す。それ未満は null（legacy 段落描画にフォールバック）
// title/detail の区切りは、改行 or 全角コロン（：）or 半角コロン（:）のうち最も早い位置
function parseProposals(text) {
  if (!text || typeof text !== 'string') return null;
  const re = /([①②③④⑤⑥⑦⑧⑨⑩])\s*([\s\S]*?)(?=[①②③④⑤⑥⑦⑧⑨⑩]|$)/g;
  const items = [];
  let m;
  while ((m = re.exec(text)) !== null) {
    const num = CIRCLED_NUM_MAP[m[1]];
    const body = (m[2] || '').trim();
    if (!body) continue;
    // 区切り候補の中で最も早いものを採用
    const nlIdx = body.indexOf('\n');
    const fullColonIdx = body.indexOf('：');
    const halfColonIdx = body.indexOf(':');
    const candidates = [nlIdx, fullColonIdx, halfColonIdx].filter(i => i >= 0);
    let splitIdx = candidates.length ? Math.min(...candidates) : -1;
    // フォールバック: コロン/改行が無い場合、先頭 6〜40 字のあとに来る半角スペース/全角スペースで分割
    // （AI がタイトル + 半角スペース + 説明文 で返した場合に対応）
    if (splitIdx < 0) {
      const spaceRe = /[ 　]/g;
      let match;
      while ((match = spaceRe.exec(body)) !== null) {
        if (match.index >= 6 && match.index <= 40) {
          splitIdx = match.index;
          break;
        }
      }
    }
    let title, detail;
    if (splitIdx < 0) {
      title = body;
      detail = '';
    } else {
      title = body.slice(0, splitIdx).trim();
      // 区切り文字自体は捨てる（: or ： or \n or space のいずれも 1 文字）
      detail = body.slice(splitIdx + 1).trim();
    }
    items.push({ num, title, detail });
  }
  return items.length >= 2 ? items : null;
}

function parseDescriptionSections(text) {
  if (!text || typeof text !== 'string') return { legacy: '—' };
  const SECTION_KEYS = [
    { key: 'problem', label: '現状の問題', regex: /【\s*現状の問題\s*】/ },
    { key: 'solution', label: '提案内容', regex: /【\s*提案内容\s*】/ },
    { key: 'rationale', label: 'なぜ効くか', regex: /【\s*なぜ効くか\s*】/ },
  ];
  const hasAnyHeader = SECTION_KEYS.some(s => s.regex.test(text));
  if (!hasAnyHeader) return { legacy: text };

  // 見出し位置を拾って区間を切り出す
  const indices = SECTION_KEYS.map(s => {
    const m = text.match(s.regex);
    return { key: s.key, label: s.label, start: m ? m.index : -1, matchLen: m ? m[0].length : 0 };
  }).filter(s => s.start >= 0).sort((a, b) => a.start - b.start);

  const result = {};
  indices.forEach((section, i) => {
    const contentStart = section.start + section.matchLen;
    const contentEnd = i + 1 < indices.length ? indices[i + 1].start : text.length;
    const body = text.slice(contentStart, contentEnd).trim();
    if (body) result[section.key] = body;
  });
  // 提案内容から番号付き項目を抽出（抽出できれば proposals 追加、失敗時は legacy 段落描画）
  if (result.solution) {
    const proposals = parseProposals(result.solution);
    if (proposals) result.proposals = proposals;
  }
  return result;
}

export default function Improve() {
  const { selectedSite, selectedSiteId, dateRange, isLoading: isSiteLoading } = useSite();
  const { isSidebarOpen } = useSidebar();
  const [searchParams, setSearchParams] = useSearchParams();
  const { plan, getRemainingByType, checkCanGenerate, isFree, isLoading: isPlanLoading } = usePlan();
  const { currentUser, userProfile } = useAuth();
  const { seenTours, tourGuideEnabled, isDesktop, isLoading: isOnboardingLoading } = useOnboarding();
  const navigate = useNavigate();
  useAutoTour('improve');

  const memberRole = userProfile?.memberRole || 'owner';
  const isViewer = memberRole === 'viewer';
  const [editingItem, setEditingItem] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [evaluatingItem, setEvaluatingItem] = useState(null);
  const [isConsultationModalOpen, setIsConsultationModalOpen] = useState(false);
  const [isEvaluationOpen, setIsEvaluationOpen] = useState(false);
  const [completionItem, setCompletionItem] = useState(null);
  const [isCompletionDialogOpen, setIsCompletionDialogOpen] = useState(false);
  const [isCompletionLoading, setIsCompletionLoading] = useState(false);

  // 実装検証 Before 未取得時の誘導ダイアログ（fast-path: draft→completed 直行対策）
  const [implCheckGuideItem, setImplCheckGuideItem] = useState(null);
  const [isImplCheckGuideOpen, setIsImplCheckGuideOpen] = useState(false);
  
  // 方針選択モーダル（AI生成の前に表示）
  const [isFocusModalOpen, setIsFocusModalOpen] = useState(false);
  // AI生成オーバーレイの状態
  const [isGenerationModalOpen, setIsGenerationModalOpen] = useState(false);
  const [generationStatus, setGenerationStatus] = useState('loading');
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  // ダウンロードメニュー
  const [isDownloadMenuOpen, setIsDownloadMenuOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const downloadMenuRef = useRef(null);

  // モックアップ右カラム用のスクロール ref（変更箇所への自動スクロール用）
  const mockupScrollRef = useRef(null);
  // モックアップ生成後の自動スクロール完了を改善案IDで管理（無限再スクロール防止）
  const autoScrolledRef = useRef(new Set());
  // バッジクリック時に左パネルでハイライトする description 抜粋
  const [highlightedExcerpt, setHighlightedExcerpt] = useState(null);
  // 提案項目番号ハイライト（モックアップバッジクリック/ホバー時に該当カードを黄色化）
  const [highlightedProposalNum, setHighlightedProposalNum] = useState(null);
  // 変更箇所の位置情報キャッシュ（chip クリックでスクロールに使う）
  const [mockupPositions, setMockupPositions] = useState([]);
  // 変更 chip の展開状態（全件表示をデフォルト）
  const [mockupChipsExpanded, setMockupChipsExpanded] = useState(true);

  // スクレイピング状況
  const [scrapingStatus, setScrapingStatus] = useState(null);
  
  // 表のソート
  const [sortKey, setSortKey] = useState(null);
  const [sortOrder, setSortOrder] = useState('asc');
  
  // テーブルでの選択ID
  const [detailViewSelectedIds, setDetailViewSelectedIds] = useState(new Set());
  // サイドドロワー
  const [drawerItem, setDrawerItem] = useState(null);
  const [drawerTab, setDrawerTab] = useState('compare');
  const [afterIframeHeight, setAfterIframeHeight] = useState(null);
  // After モックアップ iframe (1400px viewport, 親要素にフィットする scale 動的計算)
  // - iframe DOM width = 1400px (Browser Rendering 撮影時 viewport と一致、ノートPC標準)
  // - scale = 親要素幅 / 1400 で動的計算 → 表示エリアにぴったり収まる
  // - 1920 ベースより約 1.37 倍の文字サイズで読みやすい
  const [compareIframeScale, setCompareIframeScale] = useState(0.5);
  const [soloIframeScale, setSoloIframeScale] = useState(0.7);
  const compareIframeContainerRef = useRef(null);
  const soloIframeContainerRef = useRef(null);
  // モックアップ生成中のID管理
  const [mockupGeneratingIds, setMockupGeneratingIds] = useState(new Set());
  // モックアップ生成失敗のID管理（自動発火ループ防止）
  const [mockupFailedIds, setMockupFailedIds] = useState(new Set());

  const queryClient = useQueryClient();
  const siteUrl = (selectedSite?.siteUrl || '').trim().replace(/\/+$/, '');

  // モックアップが生成済か判定（新フロー: mockupStorageUrl、旧フロー: mockupHtml のどちらかがあれば済）
  const hasMockup = (item) => !!(item && (item.mockupStorageUrl || item.mockupHtml));

  // 新フロー(snapshot_patch)のモックアップ HTML を fetch して srcDoc として iframe に渡す。
  //   理由: src=Storage URL だと cross-origin で iframe.contentDocument にアクセスできず、
  //         scrollHeight 即時取得が出来ないため初期高さが小さいまま固定されることがある。
  //         srcDoc であれば同一オリジン扱いとなり onLoad 内で scrollHeight が直接読める。
  const { data: drawerMockupHtml } = useQuery({
    queryKey: [
      'drawer-mockup-html',
      drawerItem?.id,
      drawerItem?.mockupGeneratedAt?.seconds || drawerItem?.mockupGeneratedAt?._seconds,
    ],
    queryFn: async () => {
      if (!drawerItem?.mockupStorageUrl) return null;
      try {
        // Storage は cache-control: max-age=60 のため、再生成直後でも古い HTML が
        // 返ることがある。生成時刻でキャッシュバスト + no-store で取得する。
        const ts = drawerItem?.mockupGeneratedAt?.seconds || drawerItem?.mockupGeneratedAt?._seconds || Date.now();
        const url = `${drawerItem.mockupStorageUrl}?v=${ts}`;
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) return null;
        return await res.text();
      } catch {
        return null;
      }
    },
    enabled: !!drawerItem?.mockupStorageUrl,
    staleTime: Infinity,
  });

  // モックアップ生成ハンドラ
  const handleGenerateMockup = async (item) => {
    if (mockupGeneratingIds.has(item.id)) return;
    setMockupGeneratingIds(prev => new Set([...prev, item.id]));
    // 再試行のため、成功/失敗にかかわらず failed 履歴はクリアしておく
    setMockupFailedIds(prev => {
      if (!prev.has(item.id)) return prev;
      const next = new Set(prev);
      next.delete(item.id);
      return next;
    });
    try {
      const generateMockup = httpsCallable(functions, 'generateImprovementMockup');
      await generateMockup({ siteId: selectedSiteId, improvementId: item.id });
      // 成功時の toast は出さない（UI上で Before/After が切り替わることで通知）
      queryClient.invalidateQueries({ queryKey: ['improvements', selectedSiteId] });
    } catch (e) {
      console.warn('[handleGenerateMockup] 失敗:', e?.message);
      setMockupFailedIds(prev => new Set([...prev, item.id]));
      toast.error(`モックアップ生成に失敗しました: ${e.message}`);
    } finally {
      setMockupGeneratingIds(prev => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  };

  // モックアップ再生成ハンドラ（既存 mockup フィールドを全消去 → 再実行）
  const handleRegenerateMockup = async (item) => {
    if (mockupGeneratingIds.has(item.id)) return;
    // 先にローカル描画を止める（古い iframe が生成中に映らないように）
    setMockupGeneratingIds(prev => new Set([...prev, item.id]));
    try {
      await updateDoc(doc(db, 'sites', selectedSiteId, 'improvements', item.id), {
        mockupHtml: deleteField(),
        mockupCss: deleteField(),
        mockupStorageUrl: deleteField(),
        mockupStoragePath: deleteField(),
        mockupSourceSnapshotPath: deleteField(),
        mockupPatchChanges: deleteField(),
        mockupPatchSummary: deleteField(),
        mockupMode: deleteField(),
        mockupGeneratedAt: deleteField(),
      });
      // Firestore クリア直後に React Query キャッシュを無効化し、
      // 「モックアップ未生成」UI を即座に表示する
      await queryClient.invalidateQueries({ queryKey: ['improvements', selectedSiteId] });
    } catch (e) {
      console.warn('[handleRegenerateMockup] フィールドクリア失敗:', e?.message);
    }
    // handleGenerateMockup 側でも mockupGeneratingIds に追加するが冪等
    handleGenerateMockup(item);
  };

  // ページタイトルを設定
  useEffect(() => {
    setPageTitle('改善する');
  }, []);

  // ダウンロードメニューの外側クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(e.target)) {
        setIsDownloadMenuOpen(false);
      }
    };
    if (isDownloadMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDownloadMenuOpen]);

  // スクレイピング状況を取得
  useEffect(() => {
    if (selectedSiteId) {
      fetchScrapingStatus();
    }
  }, [selectedSiteId]);

  const fetchScrapingStatus = async () => {
    try {
      const metaDoc = await getDoc(doc(db, 'sites', selectedSiteId, 'pageScrapingMeta', 'default'));
      if (metaDoc.exists()) {
        setScrapingStatus(metaDoc.data());
        return;
      }
      // pageScrapingMeta がなくても pageScrapingData に1件以上あれば、初回登録時のスクレイピング等で取得済みとみなす
      const dataSnap = await getDocs(
        query(collection(db, 'sites', selectedSiteId, 'pageScrapingData'), limit(1))
      );
      if (!dataSnap.empty) {
        setScrapingStatus({ hasDataOnly: true });
        return;
      }
      setScrapingStatus(null);
    } catch (err) {
      console.error('[fetchScrapingStatus] エラー:', err);
    }
  };

  // URLパラメータからタスク追加を処理
  useEffect(() => {
    const action = searchParams.get('action');
    
    // AI提案からの一括タスク追加
    if (action === 'add-from-ai') {
      const tasksParam = searchParams.get('tasks');
      if (tasksParam && selectedSiteId) {
        try {
          const tasks = JSON.parse(decodeURIComponent(tasksParam));
          handleAddTasksFromAI(tasks);
        } catch (error) {
          console.error('[Improve] AI提案の解析エラー:', error);
        }
      }
      // URLパラメータをクリア
      setSearchParams({});
      return;
    }
    
    // 単一タスク追加（既存機能）
    if (action === 'add') {
      const title = searchParams.get('title');
      const description = searchParams.get('description');
      
      if (title) {
        // 編集アイテムを設定してダイアログを開く
        setEditingItem({
          title: decodeURIComponent(title),
          description: description ? decodeURIComponent(description) : '',
          expectedImpact: '',
        });
        setIsDialogOpen(true);
        
        // URLパラメータをクリア
        setSearchParams({});
      }
    }
  }, [searchParams, setSearchParams, selectedSiteId]);

  // ページスクリーンショット取得（Before表示用）
  const { data: pageScreenshotsMap = {} } = useQuery({
    queryKey: ['pageScreenshots', selectedSiteId],
    queryFn: async () => {
      if (!selectedSiteId) return {};
      const map = {};
      // URLを正規化するヘルパー（末尾スラッシュ統一・小文字化）
      const normalizeUrl = (url) => {
        try {
          const u = new URL(url);
          u.hostname = u.hostname.toLowerCase();
          if (!u.pathname.endsWith('/') && !u.pathname.includes('.')) u.pathname += '/';
          return u.toString();
        } catch { return url; }
      };
      // pageScreenshots コレクションから取得
      // 改善ロジック統一化プラン (Phase 3-d):
      //   新ドキュメントは deviceType='pc'|'mobile' で 1 URL あたり 2 つ存在する。
      //   drawer の Before 表示は PC レイアウトを採用。
      //   旧ドキュメント (deviceType フィールドなし) は 'pc' とみなす。
      const ssSnap = await getDocs(collection(db, 'sites', selectedSiteId, 'pageScreenshots'));
      ssSnap.forEach(d => {
        if (d.id === '_meta') return;
        const data = d.data();
        if (!data.url || !data.screenshotUrl) return;
        if (data.deviceType === 'mobile') return; // PC のみ採用
        map[normalizeUrl(data.url)] = data.screenshotUrl;
      });
      // pageScrapingData からもスクショURLを取得（フォールバック）
      const scrapingSnap = await getDocs(collection(db, 'sites', selectedSiteId, 'pageScrapingData'));
      scrapingSnap.forEach(d => {
        const data = d.data();
        if (data.pageUrl && data.screenshotUrl) {
          const key = normalizeUrl(data.pageUrl);
          if (!map[key]) map[key] = data.screenshotUrl;
        }
      });
      return map;
    },
    enabled: !!selectedSiteId,
    staleTime: 5 * 60 * 1000,
  });

  // スクショ撮影完了をリアルタイム監視 → キャッシュ自動更新
  // 初回スナップショット(=リスナー張った時点)だけスキップし、以降はどんな変化でも invalidate
  const lastCapturedAtRef = useRef(null);
  const listenerInitializedRef = useRef(false);
  useEffect(() => {
    if (!selectedSiteId) return;
    listenerInitializedRef.current = false;
    lastCapturedAtRef.current = null;
    const metaRef = doc(db, 'sites', selectedSiteId, 'pageScreenshots', '_meta');
    const unsubscribe = onSnapshot(metaRef, (snap) => {
      const ts = snap.exists() ? (snap.data().lastCapturedAt?.toMillis?.() || null) : null;
      if (!listenerInitializedRef.current) {
        // 初回はあくまで現時点の値を記録するだけ（null でも記録する）
        lastCapturedAtRef.current = ts;
        listenerInitializedRef.current = true;
        return;
      }
      // 値が変わったら（null → ts でも ts1 → ts2 でも）キャッシュ invalidate
      if (ts !== lastCapturedAtRef.current) {
        lastCapturedAtRef.current = ts;
        queryClient.invalidateQueries({ queryKey: ['pageScreenshots', selectedSiteId] });
      }
    });
    return () => { unsubscribe(); };
  }, [selectedSiteId, queryClient]);

  // URLを正規化するヘルパー（Before照合用）
  const normalizeUrlForMatch = (url) => {
    try {
      const u = new URL(url);
      u.hostname = u.hostname.toLowerCase();
      if (!u.pathname.endsWith('/') && !u.pathname.includes('.')) u.pathname += '/';
      return u.toString();
    } catch { return url; }
  };

  // Before スクリーンショットURLを解決する関数（表示時に呼び出し）
  // 複数URL（カンマ区切り）の改善案にも対応: 撮影は先頭URLのみで実施するため、
  // 先頭URL → 正規化先頭URL → 原文字列 の順で検索
  const getBeforeScreenshotUrl = (targetPageUrl) => {
    if (!targetPageUrl) return null;
    const firstUrl = String(targetPageUrl).split(',')[0].trim();
    const candidates = [
      firstUrl && normalizeUrlForMatch(firstUrl),
      firstUrl,
      normalizeUrlForMatch(targetPageUrl),
      targetPageUrl,
    ].filter(Boolean);
    for (const key of candidates) {
      if (pageScreenshotsMap[key]) return pageScreenshotsMap[key];
    }
    return null;
  };

  // ステータス絞り込み（アーカイブ表示トグルは useQuery が依存するため最上位で宣言）
  const [showArchived, setShowArchived] = useState(false);

  // 改善課題データの取得
  const { data: improvements = [], isLoading: improvementsLoading } = useQuery({
    queryKey: ['improvements', selectedSiteId, showArchived],
    queryFn: async () => {
      if (!selectedSiteId) return [];

      const statusesToFetch = showArchived
        ? ['draft', 'in_progress', 'completed', 'archived']
        : ['draft', 'in_progress', 'completed'];
      const q = query(
        collection(db, 'sites', selectedSiteId, 'improvements'),
        where('status', 'in', statusesToFetch)
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
    },
    enabled: !!selectedSiteId,
  });

  // 方針選択モーダル（ImprovementFocusModal）は「AI改善案生成」ボタン押下時のみ開く。
  // ツアーガイドで案内するため、ページ表示時の自動オープンは廃止した。

  // ドロワーで表示中のアイテムをデータ更新に同期（モックアップ生成完了時など）
  useEffect(() => {
    if (drawerItem && improvements.length > 0) {
      const updated = improvements.find(i => i.id === drawerItem.id);
      if (updated && (
        updated.mockupHtml !== drawerItem.mockupHtml ||
        updated.mockupStorageUrl !== drawerItem.mockupStorageUrl
      )) {
        setDrawerItem(updated);
        // モックアップ生成完了時は「After」タブに自動切替（After 単体を大きく見せる）
        if (hasMockup(updated) && !hasMockup(drawerItem)) {
          setDrawerTab('after');
        }
        // 再生成時は auto-scroll 履歴をクリアして次の位置情報到着でスクロールが走るようにする
        if (updated.mockupStorageUrl !== drawerItem.mockupStorageUrl) {
          autoScrolledRef.current.delete(drawerItem.id);
          setMockupPositions([]);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [improvements]);

  // ドロワー開時に自動でモックアップ生成を発火する
  // （「生成する」ボタンは廃止済、未生成のモックアップ対象改善はドロワー開いた瞬間に自動生成）
  //
  // 依存配列に mockupGeneratingIds / mockupFailedIds を意図的に含めていない理由:
  //   これらは「発火条件の gate」であり「再発火のトリガー」ではないため。
  //   ドロワーID変化時のみ効果を再実行したい（gen 中の状態更新では再実行不要）。
  //   次回ドロワーが開いた時の新しいクロージャでは、最新の状態が参照されるので stale にならない。
  useEffect(() => {
    if (!drawerItem || !selectedSiteId) return;
    if (drawerItem.mockupSkipped) return;
    if (hasMockup(drawerItem)) return;
    if (!drawerItem.targetPageUrl) return;
    if (mockupGeneratingIds.has(drawerItem.id)) return;
    if (mockupFailedIds.has(drawerItem.id)) return; // 一度失敗したら手動再試行待ち
    handleGenerateMockup(drawerItem);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawerItem?.id, selectedSiteId]);

  // モックアップ対象の改善について、改善一覧がレンダーされた時点で
  // Before スクショを並列バックグラウンド撮影する（ユーザーがドロワーを開く頃には撮影済）
  // 併せてドロワー開時のフォールバック発火も行う（リストに無い edge case 保険）
  const capturedBeforeRef = useRef(new Set());

  const triggerBeforeCapture = (url) => {
    if (!url || !/^https?:\/\//i.test(url)) return;
    if (getBeforeScreenshotUrl(url)) return;
    if (capturedBeforeRef.current.has(url)) return;
    capturedBeforeRef.current.add(url);
    console.log('[Improve] captureBeforeScreenshot 呼出:', url);
    return httpsCallable(functions, 'captureBeforeScreenshot')({ siteId: selectedSiteId, targetPageUrl: url })
      .then((res) => {
        if (res?.data?.success) {
          console.log('[Improve] Before撮影完了:', url, res.data.alreadyExists ? '(既存)' : '(新規)');
        } else {
          console.warn('[Improve] Before撮影失敗:', url, res?.data?.reason);
        }
      })
      .catch((err) => {
        console.warn('[Improve] captureBeforeScreenshot エラー:', url, err?.message);
      });
  };

  // 改善一覧が取れた瞬間（= Gemini生成直後 or 既存再表示）に、モックアップ対象の
  // Before スクショを並列度4でバックグラウンド撮影する。ユーザーは即座に改善案を
  // 読み始められ、ドロワーを開く頃には Before が揃っている想定。
  useEffect(() => {
    if (!selectedSiteId || !improvements || improvements.length === 0) return;
    const targets = improvements
      .filter(item => !item.mockupSkipped && !hasMockup(item) && item.targetPageUrl)
      .map(item => String(item.targetPageUrl).split(',')[0].trim())
      .filter(url => url && /^https?:\/\//i.test(url))
      .filter(url => !getBeforeScreenshotUrl(url) && !capturedBeforeRef.current.has(url));
    const uniqueTargets = Array.from(new Set(targets));
    if (uniqueTargets.length === 0) return;

    const CONCURRENCY = 4;
    let index = 0;
    const worker = async () => {
      while (index < uniqueTargets.length) {
        const url = uniqueTargets[index++];
        await triggerBeforeCapture(url);
      }
    };
    for (let i = 0; i < Math.min(CONCURRENCY, uniqueTargets.length); i++) {
      worker();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [improvements, selectedSiteId]);

  // ドロワー開時のフォールバック発火（何らかの理由で一括発火が漏れた場合の保険）
  useEffect(() => {
    if (!drawerItem || !selectedSiteId) return;
    if (drawerItem.mockupSkipped || hasMockup(drawerItem)) return;
    const raw = drawerItem.targetPageUrl;
    if (!raw) return;
    const firstUrl = String(raw).split(',')[0].trim();
    triggerBeforeCapture(firstUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawerItem?.id, selectedSiteId]);

  // ドロワー切替時に自動スクロール履歴 + ハイライト + chip 展開状態をリセット
  useEffect(() => {
    autoScrolledRef.current.delete(drawerItem?.id);
    setHighlightedExcerpt(null);
    setHighlightedProposalNum(null);
    setMockupPositions([]);
    setMockupChipsExpanded(true);
  }, [drawerItem?.id]);

  // iframe 内のある位置まで外側コンテナをスクロール（chip クリック / 自動スクロール共通）
  function scrollContainerToPosition(pos) {
    if (!pos) return;
    // iframe は CSS transform: scale(...) で縮小表示されているため、
    // postMessage で受け取る pos.top (iframe 内座標) は表示上の高さに換算する必要がある。
    // 実表示 scale は ResizeObserver で算出した soloIframeScale / compareIframeScale を使う
    // (旧コードは固定値 1 / 0.5 を使っていたためスクロール位置が大きくズレていた)
    const scale = drawerTab === 'compare' ? compareIframeScale : soloIframeScale;
    const container = mockupScrollRef.current;
    if (!container) return;
    const iframe = container.querySelector('iframe[title="改善モックアップ"]');
    if (!iframe) return;
    const iframeRect = iframe.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const iframeTopInContainer = iframeRect.top - containerRect.top + container.scrollTop;
    const targetScrollTop = iframeTopInContainer + pos.top * scale - container.clientHeight * 0.25;
    container.scrollTo({ top: Math.max(0, targetScrollTop), behavior: 'smooth' });
  }

  // After iframe の親要素サイズを監視 → scale 動的計算
  // scale = 親幅 / 1400 で iframe content を表示エリアにぴったり収める (Browser Rendering viewport と一致)
  useEffect(() => {
    if (!drawerItem) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        if (w <= 0) continue;
        const scale = Math.min(w / 1400, 1);
        if (entry.target === compareIframeContainerRef.current) {
          setCompareIframeScale(scale);
        } else if (entry.target === soloIframeContainerRef.current) {
          setSoloIframeScale(scale);
        }
      }
    });
    if (compareIframeContainerRef.current) observer.observe(compareIframeContainerRef.current);
    if (soloIframeContainerRef.current) observer.observe(soloIframeContainerRef.current);
    return () => observer.disconnect();
  }, [drawerItem, drawerTab]);

  // iframe (snapshot_patch モックアップ) からの postMessage を受信
  // - __mockup_size: iframe の高さを反映
  // - __mockup_changed_positions: 最初の data-changed 要素まで自動スクロール（初回のみ）
  useEffect(() => {
    if (!drawerItem) return;
    function handleMessage(e) {
      if (!e.data || typeof e.data !== 'object') return;
      if (e.data.type === '__mockup_size') {
        if (e.data.height && typeof e.data.height === 'number') {
          setAfterIframeHeight(e.data.height);
        }
      } else if (e.data.type === '__mockup_changed_clicked') {
        // バッジクリック: active=false (2回目クリック) のときだけクリア
        // active=true のときは excerpt + 項目番号をセット
        if (e.data.active === false) {
          setHighlightedExcerpt(null);
          setHighlightedProposalNum(null);
          return;
        }
        const numRaw = e.data.num || '';
        const parsedNum = Number(numRaw);
        if (Number.isFinite(parsedNum) && parsedNum > 0) {
          setHighlightedProposalNum(parsedNum);
        }
        const label = String(e.data.label || '');
        const changes = drawerItem.mockupPatchChanges || [];
        const change = changes.find(c => (c?.change_label || '') === label);
        const excerpt = change?.description_excerpt || null;
        if (excerpt) setHighlightedExcerpt(excerpt);
        return;
      } else if (e.data.type === '__mockup_changed_hovered') {
        // バッジホバー → 左パネルの該当項目カードを黄色ハイライト + excerpt (旧形式フォールバック)
        const numRaw = e.data.num || '';
        const parsedNum = Number(numRaw);
        if (Number.isFinite(parsedNum) && parsedNum > 0) {
          setHighlightedProposalNum(parsedNum);
        }
        const label = String(e.data.label || '');
        const changes = drawerItem.mockupPatchChanges || [];
        const change = changes.find(c => (c?.change_label || '') === label);
        const excerpt = change?.description_excerpt || null;
        if (excerpt) setHighlightedExcerpt(excerpt);
        return;
      } else if (e.data.type === '__mockup_changed_deselected') {
        setHighlightedExcerpt(null);
        setHighlightedProposalNum(null);
        return;
      } else if (e.data.type === '__mockup_changed_positions') {
        const positions = e.data.positions;
        if (!Array.isArray(positions) || positions.length === 0) return;
        // chip クリック用に位置情報を保存（初期自動スクロールはユーザー要望で廃止）
        setMockupPositions(positions);
      }
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
    // drawerItem 全体を依存に入れる: mockupPatchChanges が再生成で更新されたときに
    // handler を新しいクロージャで再登録する（stale closure 対策）
  }, [drawerItem, drawerTab]);

  // 更新mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const improvementRef = doc(db, 'sites', selectedSiteId, 'improvements', id);
      await updateDoc(improvementRef, {
        ...data,
        updatedAt: new Date(),
      });
    },
    onSuccess: () => {
      // 「改善する」画面と「評価する」画面の両方のキャッシュを無効化
      queryClient.invalidateQueries({ queryKey: ['improvements', selectedSiteId] });
      queryClient.invalidateQueries({ queryKey: ['completed-improvements', selectedSiteId] });
    },
  });

  // 削除mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await deleteDoc(doc(db, 'sites', selectedSiteId, 'improvements', id));
    },
    onSuccess: () => {
      // 「改善する」画面と「評価する」画面の両方のキャッシュを無効化
      queryClient.invalidateQueries({ queryKey: ['improvements', selectedSiteId] });
      queryClient.invalidateQueries({ queryKey: ['completed-improvements', selectedSiteId] });
    },
  });

  // AI提案からの一括タスク追加
  const addTasksFromAIMutation = useMutation({
    mutationFn: async (tasks) => {
      const promises = tasks.map(task => {
        return addDoc(collection(db, 'sites', selectedSiteId, 'improvements'), {
          title: task.title || task.recommendation || 'AI提案タスク',
          description: task.description || task.detail || '',
          status: 'draft',
          expectedImpact: task.expectedImpact || '',
          order: Date.now(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          source: 'ai-analysis', // AI分析由来であることを記録
        });
      });
      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['improvements', selectedSiteId] });
      console.log('[Improve] AI提案からのタスク追加完了');
    },
  });

  const handleAddTasksFromAI = (tasks) => {
    if (!tasks || tasks.length === 0) return;
    console.log('[Improve] AI提案からタスク追加:', tasks);
    addTasksFromAIMutation.mutate(tasks);
  };

  const handleEvaluationSave = (evaluationData) => {
    if (evaluatingItem) {
      updateMutation.mutate(
        { id: evaluatingItem.id, data: evaluationData },
        {
          onSuccess: () => {
            setIsEvaluationOpen(false);
            setEvaluatingItem(null);
          }
        }
      );
    }
  };

  // status が in_progress に遷移したタイミングで実装検証用 Before スナップショットを取得
  // （バックグラウンドで fire-and-forget、UI はブロックしない）
  const triggerBeforeImplementationSnapshot = (improvementId) => {
    const captureFn = httpsCallable(functions, 'captureBeforeImplementationSnapshot');
    captureFn({ siteId: selectedSiteId, improvementId })
      .then((res) => {
        console.log('[ImplCheck] Before スナップショット取得:', res.data);
      })
      .catch((err) => {
        console.warn('[ImplCheck] Before スナップショット取得失敗:', err?.message);
      });
  };

  const handleStatusChange = (item, newStatus) => {
    if (item.status === newStatus) return;
    const updateData = { status: newStatus };
    if (newStatus === 'completed') {
      // Fast-path 対策: Before スナップショット未取得なら誘導ダイアログを表示
      const hasBeforeSnapshot = item?.implementationCheck?.beforeSnapshot?.capturedAt;
      if (!hasBeforeSnapshot) {
        setImplCheckGuideItem(item);
        setIsImplCheckGuideOpen(true);
        return;
      }
      // 完了ダイアログを表示（改善反映日入力 + 効果計測開始）
      setCompletionItem(item);
      setIsCompletionDialogOpen(true);
    } else if (newStatus === 'in_progress') {
      // 対応中に遷移した時点で Before スナップショットを取得（上書きあり）
      updateMutation.mutate({ id: item.id, data: updateData });
      triggerBeforeImplementationSnapshot(item.id);
      return;
    } else if (newStatus === 'archived') {
      // 見送り: archivedAt + archivedReason='skipped' を付与してアーカイブ
      updateData.archivedAt = serverTimestamp();
      updateData.archivedReason = 'skipped';
      updateMutation.mutate({ id: item.id, data: updateData }, {
        onSuccess: () => {
          toast.success('見送りとしてアーカイブしました');
          if (drawerItem?.id === item.id) closeDrawer();
        },
      });
    } else {
      // 完了→他ステータスへの差し戻し時: effectMeasurementをsuspendedに
      if (item.status === 'completed' && item.effectMeasurement) {
        updateData['effectMeasurement.status'] = 'suspended';
        updateData['emStatus'] = 'suspended';
      }
      updateMutation.mutate({ id: item.id, data: updateData });
    }
  };

  // 完了ダイアログの確認ハンドラー
  const handleCompletionConfirm = async ({ effectiveDate, generateNextStep }) => {
    if (!completionItem) return;
    setIsCompletionLoading(true);

    try {
      // 1. ステータスを完了に更新
      const updateData = {
        status: 'completed',
        completedAt: new Date().toISOString(),
        effectiveDate,
      };
      await updateMutation.mutateAsync({ id: completionItem.id, data: updateData });

      // 2. Before指標取得をバックグラウンドで実行
      const fetchBeforeMetricsFn = httpsCallable(functions, 'fetchBeforeMetrics');
      fetchBeforeMetricsFn({
        siteId: selectedSiteId,
        improvementId: completionItem.id,
        effectiveDate,
        category: completionItem.category || 'other',
        targetPageUrl: completionItem.targetPageUrl || null,
      }).then(() => {
        toast.success('効果計測のBefore指標を取得しました');
      }).catch((err) => {
        console.error('[CompletionConfirm] Before指標取得エラー:', err);
        toast.error('Before指標の取得に失敗しました。後で再取得できます。');
      });

      // 3. 次ステップ提案を生成（ユーザーが選択した場合）
      if (generateNextStep) {
        const generateFn = httpsCallable(functions, 'generateImprovements');
        generateFn({
          siteId: selectedSiteId,
          improvementFocus: 'auto',
          userNote: `前回完了した改善: 「${completionItem.title}」（カテゴリ: ${completionItem.category || 'other'}、期待効果: ${completionItem.expectedImpact || '不明'}）。この改善の次ステップとして最適な提案を1-2件生成してください。`,
          triggeredBy: 'completion',
          autoGenerated: true,
          startDate: dateRange?.from,
          endDate: dateRange?.to,
        }).then((result) => {
          const count = result.data?.count || 0;
          if (count > 0) {
            toast.success(`次ステップの改善提案を${count}件生成しました`);
            queryClient.invalidateQueries({ queryKey: ['improvements'] });
          }
        }).catch((err) => {
          console.error('[CompletionConfirm] 次ステップ提案生成エラー:', err);
          toast.error('次ステップ提案の生成に失敗しました');
        });
      }

      // 4. 完了ダイアログを閉じてEvaluationModalを表示
      setIsCompletionDialogOpen(false);
      setCompletionItem(null);
      setEvaluatingItem({ ...completionItem, ...updateData });
      setIsEvaluationOpen(true);
      toast.success('改善タスクを完了にしました');

    } catch (err) {
      console.error('[CompletionConfirm] Error:', err);
      toast.error('ステータスの更新に失敗しました');
    } finally {
      setIsCompletionLoading(false);
    }
  };

  // ステータス絞り込み + 検索 + 優先度/カテゴリ filter
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState(() => new Set(['high', 'medium', 'low']));
  const [categoryFilter, setCategoryFilter] = useState(() => new Set(['acquisition', 'content', 'design', 'feature', 'other']));

  // ステータス別件数（KPI バッジ用）
  const statusCounts = useMemo(() => {
    const counts = { all: 0, draft: 0, in_progress: 0, completed: 0, archived: 0 };
    for (const it of improvements) {
      const s = it.status || 'draft';
      counts.all++;
      if (counts[s] != null) counts[s]++;
    }
    return counts;
  }, [improvements]);

  const togglePriorityFilter = (val) => {
    setPriorityFilter(prev => {
      const next = new Set(prev);
      if (next.has(val)) next.delete(val); else next.add(val);
      return next;
    });
  };
  const toggleCategoryFilter = (val) => {
    setCategoryFilter(prev => {
      const next = new Set(prev);
      if (next.has(val)) next.delete(val); else next.add(val);
      return next;
    });
  };

  const filteredImprovements = useMemo(() => {
    let list = improvements;
    if (statusFilter !== 'all') {
      list = list.filter(item => (item.status || 'draft') === statusFilter);
    }
    // 優先度 filter（priorityFilter が空の場合は全件除外しない: 空セットのときは無視）
    if (priorityFilter.size > 0 && priorityFilter.size < 3) {
      list = list.filter(item => priorityFilter.has(item.priority || ''));
    }
    if (categoryFilter.size > 0 && categoryFilter.size < 5) {
      list = list.filter(item => categoryFilter.has(item.category || ''));
    }
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(item => {
        const t = (item.title || '').toLowerCase();
        const d = (item.description || '').toLowerCase();
        const u = (item.targetPageUrl || '').toLowerCase();
        return t.includes(q) || d.includes(q) || u.includes(q);
      });
    }
    return list;
  }, [improvements, statusFilter, priorityFilter, categoryFilter, searchQuery]);

  const categoryOrder = ['acquisition', 'content', 'design', 'feature', 'other'];
  const priorityOrder = ['high', 'medium', 'low'];
  const statusOrder = ['draft', 'in_progress', 'completed'];

  const sortedImprovements = useMemo(() => {
    const list = [...filteredImprovements];
    // デフォルト（sortKey 未指定時）は createdAt 降順（新しい順）
    if (!sortKey) {
      list.sort((a, b) => {
        const ta = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
        const tb = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
        return tb - ta;
      });
      return list;
    }
    list.sort((a, b) => {
      let va, vb;
      if (sortKey === 'category') {
        va = categoryOrder.indexOf(a.category || '') >= 0 ? categoryOrder.indexOf(a.category) : 999;
        vb = categoryOrder.indexOf(b.category || '') >= 0 ? categoryOrder.indexOf(b.category) : 999;
      } else if (sortKey === 'priority') {
        va = priorityOrder.indexOf(a.priority || '') >= 0 ? priorityOrder.indexOf(a.priority) : 999;
        vb = priorityOrder.indexOf(b.priority || '') >= 0 ? priorityOrder.indexOf(b.priority) : 999;
      } else if (sortKey === 'estimatedLaborHours') {
        va = a.estimatedLaborHours != null ? Number(a.estimatedLaborHours) : 1e9;
        vb = b.estimatedLaborHours != null ? Number(b.estimatedLaborHours) : 1e9;
      } else if (sortKey === 'status') {
        va = statusOrder.indexOf(a.status || '') >= 0 ? statusOrder.indexOf(a.status) : 999;
        vb = statusOrder.indexOf(b.status || '') >= 0 ? statusOrder.indexOf(b.status) : 999;
      } else return 0;
      if (va === vb) return 0;
      const dir = sortOrder === 'asc' ? 1 : -1;
      return va < vb ? -dir : dir;
    });
    return list;
  }, [filteredImprovements, sortKey, sortOrder]);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const toggleDetailViewSelection = (id) => {
    setDetailViewSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleDetailViewSelectAll = () => {
    if (detailViewSelectedIds.size >= sortedImprovements.length) {
      setDetailViewSelectedIds(new Set());
    } else {
      setDetailViewSelectedIds(new Set(sortedImprovements.map(i => i.id)));
    }
  };
  const clearDetailViewSelection = () => setDetailViewSelectedIds(new Set());

  const openDrawer = (item) => {
    setDrawerItem(item);
    // モックアップ生成済なら「After」を初期表示（After 単体を大きく見せる）
    // 未生成の場合は「並べて比較」（既存サイト + これからモックアップが生成される右枠）
    setDrawerTab(hasMockup(item) ? 'after' : 'compare');
    setAfterIframeHeight(null);
  };
  const closeDrawer = () => setDrawerItem(null);
  const navigateDrawer = (direction) => {
    if (!drawerItem) return;
    const idx = sortedImprovements.findIndex(i => i.id === drawerItem.id);
    const nextIdx = idx + direction;
    if (nextIdx >= 0 && nextIdx < sortedImprovements.length) {
      const nextItem = sortedImprovements[nextIdx];
      setDrawerItem(nextItem);
      setDrawerTab(hasMockup(nextItem) ? 'after' : 'compare');
      setAfterIframeHeight(null);
    }
  };

  const handleBulkDeleteDetailView = () => {
    const count = detailViewSelectedIds.size;
    if (count === 0) return;
    if (!window.confirm(`選択した${count}件の改善案を削除しますか？`)) return;
    const ids = Array.from(detailViewSelectedIds);
    Promise.allSettled(ids.map(id => deleteDoc(doc(db, 'sites', selectedSiteId, 'improvements', id))))
      .then((results) => {
        const failed = results.filter(r => r.status === 'rejected');
        queryClient.invalidateQueries({ queryKey: ['improvements', selectedSiteId] });
        setDetailViewSelectedIds(new Set());
        if (failed.length === 0) {
          toast.success(`${count}件を削除しました`);
        } else {
          toast.error(`${count - failed.length}件削除、${failed.length}件失敗しました`);
        }
      });
  };

  const handleBulkStatusChangeDetailView = (newStatus) => {
    const ids = Array.from(detailViewSelectedIds);
    if (ids.length === 0) return;
    // 一括完了は非対応（効果計測には個別の改善反映日入力が必要）
    if (newStatus === 'completed') {
      toast.error('一括での完了変更はできません。各タスクを個別に完了にしてください。');
      return;
    }
    const updateData = { status: newStatus };
    Promise.allSettled(ids.map(id => updateDoc(doc(db, 'sites', selectedSiteId, 'improvements', id), { ...updateData, updatedAt: new Date() })))
      .then((results) => {
        const failed = results.filter(r => r.status === 'rejected');
        queryClient.invalidateQueries({ queryKey: ['improvements', selectedSiteId] });
        queryClient.invalidateQueries({ queryKey: ['completed-improvements', selectedSiteId] });
        setDetailViewSelectedIds(new Set());
        if (failed.length === 0) {
          toast.success(`${ids.length}件のステータスを更新しました`);
        } else {
          toast.error(`${ids.length - failed.length}件更新、${failed.length}件失敗しました`);
        }
      });
  };

  if (isSiteLoading || !selectedSiteId) {
    return (
      <div data-tour="improve-header" className="flex flex-col h-full">
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner message="サイト情報を読み込んでいます..." />
        </div>
      </div>
    );
  }

  if (isFree) {
    return <UpgradeModal isOpen={true} onClose={() => navigate('/dashboard')} />;
  }

  return (
    <div data-tour="improve-header" className="flex flex-col h-full">
      <AnalysisHeader
          dateRange={null}
          setDateRange={null}
          showDateRange={false}
          showSiteInfo={false}
          showExport={false}
          improveActions={
            <>
              {/* AI改善案生成: viewer も実行可能（オーナーのプラン枠を消費） */}
              <Button
                variant="ai"
                data-tour={sortedImprovements.length === 0 ? undefined : 'improve-ai-generate'}
                onClick={() => {
                  if (!selectedSiteId) return;
                  setIsFocusModalOpen(true);
                }}
              >
                <Sparkles data-slot="icon" className="h-4 w-4" />
                AI改善案生成
              </Button>
              {/* 手動追加は viewer 不可 */}
              {!isViewer && (
                <Button
                  variant="primary"
                  data-tour={sortedImprovements.length === 0 ? undefined : 'improve-manual-add'}
                  onClick={() => {
                    setEditingItem(null);
                    setIsDialogOpen(true);
                  }}
                >
                  手動で追加
                </Button>
              )}
            </>
          }
          customDownload={
            improvements.length > 0 ? (() => {
              const canExport = checkCanGenerate('excelExport');
              return (
                <div className="relative" ref={downloadMenuRef}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => !isExporting && setIsDownloadMenuOpen(!isDownloadMenuOpen)}
                    disabled={isExporting}
                    className="h-10"
                    title="改善内容ダウンロード"
                  >
                    {isExporting ? (
                      <DotWaveSpinner size="xs" />
                    ) : (
                      <Download data-slot="icon" className="h-4 w-4" />
                    )}
                    <span>ダウンロード</span>
                  </Button>
                  {isDownloadMenuOpen && (
                    <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                      <button
                        onClick={async () => {
                          setIsDownloadMenuOpen(false);
                          if (!canExport) {
                            toast.error('今月のExcelエクスポート上限に達しました。');
                            return;
                          }
                          setIsExporting(true);
                          try {
                            await downloadImprovementsExcel(improvements, selectedSite?.siteName);
                            const incrementExportUsageFn = httpsCallable(functions, 'incrementExportUsage');
                            await incrementExportUsageFn({ type: 'excel' }).catch(() => {});
                            toast.success('Excelダウンロードが完了しました');
                          } catch (e) {
                            toast.error(e?.message || 'ダウンロードに失敗しました');
                          } finally {
                            setIsExporting(false);
                          }
                        }}
                        disabled={!canExport}
                        className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${!canExport ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-50'}`}
                      >
                        <ExcelIcon className="h-4 w-4" disabled={!canExport} />
                        Excel
                        {!canExport && <span className="ml-auto text-xs text-gray-400">上限</span>}
                      </button>
                    </div>
                  )}
                </div>
              );
            })() : null
          }
        />
      <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-dark">
        {/* コンテンツ */}
        <div className="mx-auto max-w-content px-3 sm:px-6 py-6 sm:py-10">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <div className="mb-1 flex items-center gap-3 flex-wrap">
                <h2 className="text-2xl font-bold text-dark dark:text-white">
                  改善する
                </h2>
                <TourHelpButton tourId="improve" />
              </div>
              {/* サイトマップ状況表示（AI改善案生成でこのデータを反映） */}
              {scrapingStatus && scrapingStatus.lastScrapedAt && (
                <p className="mt-1 text-body-color">
                  サイトマップデータ: 最終更新{' '}
                  {new Date(scrapingStatus.lastScrapedAt.toDate ? scrapingStatus.lastScrapedAt.toDate() : scrapingStatus.lastScrapedAt).toLocaleDateString('ja-JP')}{' '}
                  （{scrapingStatus.totalPagesScraped || 0}ページ取得済み・AI改善案に反映）
                </p>
              )}
              {scrapingStatus && scrapingStatus.hasDataOnly && (
                <p className="mt-1 text-body-color">
                  サイトマップデータ: 取得済み（初回登録時などのスクレイピング・AI改善案に反映）
                </p>
              )}
              {!scrapingStatus && (
                <p className="mt-1 text-amber-600 dark:text-amber-400">
                  サイトマップデータ未取得。管理画面から「スクレイピング開始」を実行すると、AI改善案の精度が向上します。
                </p>
              )}
              {/* 自動生成トグル */}
              <div data-tour="improve-auto-toggle" className="mt-2 flex items-center gap-2">
                <button
                  onClick={async () => {
                    const newVal = !selectedSite?.autoImprovementEnabled;
                    try {
                      await updateDoc(doc(db, 'sites', selectedSiteId), { autoImprovementEnabled: newVal });
                      toast.success(newVal ? '月次自動生成を有効にしました' : '月次自動生成を無効にしました');
                    } catch { toast.error('設定の変更に失敗しました'); }
                  }}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                    selectedSite?.autoImprovementEnabled ? 'bg-primary' : 'bg-gray-200 dark:bg-dark-3'
                  }`}
                >
                  <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow ring-0 transition-transform duration-200 ${
                    selectedSite?.autoImprovementEnabled ? 'translate-x-4' : 'translate-x-0'
                  }`} />
                </button>
                <span className="text-xs text-body-color">月次自動生成 {selectedSite?.autoImprovementEnabled ? 'ON' : 'OFF'}</span>
              </div>
            </div>
            {/* KPI バッジ（起案/対応中/完了 件数） */}
            {improvements.length > 0 && (
              <div className="flex items-center gap-[18px] px-[22px] py-[11px] bg-gradient-to-r from-blue-50 to-purple-50 dark:from-dark-3 dark:to-dark-2 rounded-lg">
                <div className="text-center">
                  <div className="text-[13px] text-body-color font-medium">起案</div>
                  <div className="text-xl font-bold text-dark dark:text-white">{statusCounts.draft}</div>
                </div>
                <div className="w-px h-10 bg-gray-200 dark:bg-dark-3"></div>
                <div className="text-center">
                  <div className="text-[13px] text-body-color font-medium">対応中</div>
                  <div className="text-xl font-bold text-blue-600 dark:text-blue-400">{statusCounts.in_progress}</div>
                </div>
                <div className="w-px h-10 bg-gray-200 dark:bg-dark-3"></div>
                <div className="text-center">
                  <div className="text-[13px] text-body-color font-medium">完了</div>
                  <div className="text-xl font-bold text-green-600 dark:text-green-400">{statusCounts.completed}</div>
                </div>
              </div>
            )}
          </div>

          {/* スマートツールバー */}
          {improvements.length > 0 && (
            <div data-tour="improve-status-filter" className="bg-white dark:bg-dark-2 rounded-lg shadow-sm mb-4">
              {/* 上段: 検索 + ステータスチップ */}
              <div className="p-3 border-b border-gray-100 dark:border-dark-3 flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[240px] max-w-md">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="改善案を検索..."
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-dark-3 dark:bg-dark rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-body-color font-medium">ステータス:</span>
                  {[
                    { key: 'all', label: 'すべて', count: statusCounts.all },
                    { key: 'draft', label: '起案', count: statusCounts.draft },
                    { key: 'in_progress', label: '対応中', count: statusCounts.in_progress },
                    { key: 'completed', label: '完了', count: statusCounts.completed },
                  ].map(t => (
                    <button
                      key={t.key}
                      onClick={() => setStatusFilter(t.key)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition ${
                        statusFilter === t.key
                          ? 'bg-primary text-white border-primary'
                          : 'bg-white dark:bg-dark border-gray-200 dark:border-dark-3 text-body-color hover:border-gray-400'
                      }`}
                    >
                      {t.label} ({t.count})
                    </button>
                  ))}
                  {showArchived && (
                    <button
                      onClick={() => setStatusFilter('archived')}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition ${
                        statusFilter === 'archived'
                          ? 'bg-gray-500 text-white border-gray-500'
                          : 'bg-white dark:bg-dark border-gray-200 dark:border-dark-3 text-gray-400 hover:border-gray-400'
                      }`}
                    >
                      アーカイブ ({statusCounts.archived})
                    </button>
                  )}
                </div>
                <label className="ml-auto inline-flex items-center gap-1.5 text-xs text-body-color cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showArchived}
                    onChange={(e) => {
                      const next = e.target.checked;
                      setShowArchived(next);
                      if (!next && statusFilter === 'archived') setStatusFilter('all');
                    }}
                    className="h-3.5 w-3.5 rounded border-stroke text-primary focus:ring-primary dark:border-dark-3"
                  />
                  アーカイブも表示
                </label>
              </div>

              {/* 下段: 優先度・カテゴリ filter */}
              <div className="px-3 py-2 bg-gray-50 dark:bg-dark/50 flex items-center gap-3 text-xs flex-wrap">
                <span className="text-body-color font-medium">優先度:</span>
                {[
                  { key: 'high', label: '高', cls: 'bg-red-100 text-red-700' },
                  { key: 'medium', label: '中', cls: 'bg-amber-100 text-amber-700' },
                  { key: 'low', label: '低', cls: 'bg-gray-100 text-gray-700' },
                ].map(p => (
                  <label key={p.key} className="inline-flex items-center gap-1 cursor-pointer">
                    <input type="checkbox" className="rounded" checked={priorityFilter.has(p.key)} onChange={() => togglePriorityFilter(p.key)} />
                    <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${p.cls}`}>{p.label}</span>
                  </label>
                ))}
                <span className="text-gray-300 dark:text-dark-3 mx-1">|</span>
                <span className="text-body-color font-medium">カテゴリ:</span>
                {[
                  { key: 'acquisition', label: '集客' },
                  { key: 'content', label: 'コンテンツ' },
                  { key: 'design', label: 'デザイン' },
                  { key: 'feature', label: '機能' },
                  { key: 'other', label: 'その他' },
                ].map(c => (
                  <label key={c.key} className="inline-flex items-center gap-1 cursor-pointer">
                    <input type="checkbox" className="rounded" checked={categoryFilter.has(c.key)} onChange={() => toggleCategoryFilter(c.key)} />
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-gray-100 text-gray-700">{c.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <ImprovementFocusModal
            isOpen={isFocusModalOpen}
            siteId={selectedSiteId}
            onClose={() => setIsFocusModalOpen(false)}
            onConfirm={async (improvementFocus, userNote) => {
              // プラン上限チェック（生成前）
              const remaining = getRemainingByType('improvement');
              if (remaining === 0) {
                setIsFocusModalOpen(false);
                setIsUpgradeModalOpen(true);
                return;
              }
              setIsGenerationModalOpen(true);
              setGenerationStatus('loading');
              try {
                await generateAndAddImprovements(
                  selectedSiteId,
                  currentUser?.email,
                  async (status, count, error) => {
                    setGenerationStatus(status);
                    if (status === 'success') {
                      // refetch を await で完了させてから state を変更することで、
                      // 「モーダル閉じた瞬間に空状態がチラ見えする」リグレッションを防ぐ
                      try {
                        await queryClient.refetchQueries({
                          queryKey: ['improvements', selectedSiteId],
                          type: 'active',
                        });
                      } catch (refetchErr) {
                        console.warn('[generateImprovements] refetch failed:', refetchErr?.message);
                      }
                      setIsGenerationModalOpen(false);
                      toast.success(`${count}件の改善案を追加しました`);
                    } else if (status === 'error') {
                      setIsGenerationModalOpen(false);
                      if (error && error.includes('上限に達しました')) {
                        setIsUpgradeModalOpen(true);
                      } else {
                        toast.error(error || '改善案の生成に失敗しました');
                      }
                    }
                  },
                  { improvementFocus, userNote, startDate: dateRange?.from, endDate: dateRange?.to }
                );
              } catch (err) {
                const msg = err?.message || '生成に失敗しました';
                setIsGenerationModalOpen(false);
                if (msg.includes('上限に達しました')) {
                  setIsUpgradeModalOpen(true);
                } else {
                  toast.error(msg);
                }
              }
            }}
          />

          {improvementsLoading ? (
            <LoadingSpinner message="改善課題を読み込んでいます..." />
          ) : (
            <>
              <div className="max-w-[1400px] mx-auto">
                {detailViewSelectedIds.size > 0 && !isViewer && (
                  <div className="mb-3 rounded-lg border border-primary/30 bg-blue-50 px-4 py-3 dark:bg-blue-900/20 dark:border-primary/30">
                    <div className="mb-2 text-sm font-medium text-dark dark:text-white">
                      選択中 {detailViewSelectedIds.size} 件 — 操作を選んでください
                    </div>
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-body-color shrink-0">編集</span>
                        <Button
                          variant="secondary"
                          type="button"
                          onClick={() => {
                            const firstId = Array.from(detailViewSelectedIds)[0];
                            const item = sortedImprovements.find((i) => i.id === firstId);
                            if (item) {
                              setEditingItem(item);
                              setIsDialogOpen(true);
                            }
                          }}
                        >
                          <Edit data-slot="icon" className="h-4 w-4" />
                          選択した1件を編集
                        </Button>
                        <Button
                          variant="ghost"
                          type="button"
                          onClick={clearDetailViewSelection}
                        >
                          選択解除
                        </Button>
                      </div>
                      <div className="h-6 w-px bg-stroke dark:bg-dark-3" aria-hidden />
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-body-color shrink-0">削除</span>
                        <Button
                          variant="danger"
                          type="button"
                          onClick={handleBulkDeleteDetailView}
                        >
                          <Trash2 data-slot="icon" className="h-4 w-4" />
                          選択した{detailViewSelectedIds.size}件を削除
                        </Button>
                      </div>
                      <div className="h-6 w-px bg-stroke dark:bg-dark-3" aria-hidden />
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-body-color shrink-0">ステータス</span>
                        <select
                          id="bulk-status-detail"
                          className="rounded border border-stroke bg-white px-2 py-1.5 text-sm text-dark dark:border-dark-3 dark:bg-dark-2 dark:text-white"
                        >
                          <option value="draft">{statusLabels.draft}</option>
                          <option value="in_progress">{statusLabels.in_progress}</option>
                        </select>
                        <Button
                          variant="primary"
                          type="button"
                          onClick={() => {
                            const sel = document.getElementById('bulk-status-detail');
                            if (sel) handleBulkStatusChangeDetailView(sel.value);
                          }}
                        >
                          変更
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
                <div data-tour="improve-table" className="rounded-xl border border-stroke dark:border-dark-3 overflow-x-auto overflow-y-visible bg-white dark:bg-dark-2">
                  <table className="w-full min-w-[900px] border-collapse text-sm table-fixed">
                    {sortedImprovements.length > 0 && (
                    <thead>
                      <tr>
                        {!isViewer && (
                          <th className="w-[48px] py-3 pl-4 pr-2 bg-gray-50 dark:bg-dark-3 border-b border-stroke dark:border-dark-3 text-center">
                            {sortedImprovements.length > 0 && (
                              <input
                                type="checkbox"
                                checked={detailViewSelectedIds.size === sortedImprovements.length && sortedImprovements.length > 0}
                                onChange={toggleDetailViewSelectAll}
                                className="h-4 w-4 rounded border-stroke text-primary focus:ring-primary dark:border-dark-3"
                                title="すべて選択"
                              />
                            )}
                          </th>
                        )}
                        <th className="w-[70px] min-w-[70px] text-left py-3 px-3 bg-gray-50 dark:bg-dark-3 text-sm font-semibold text-body-color border-b border-stroke dark:border-dark-3">
                          <button type="button" onClick={(e) => { e.stopPropagation(); handleSort('priority'); }} className="inline-flex items-center gap-0.5 hover:opacity-80 whitespace-nowrap" title="クリックで並び替え">
                            優先度
                            {sortKey === 'priority' && (sortOrder === 'asc' ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />)}
                          </button>
                        </th>
                        <th className="w-[110px] min-w-[110px] text-left py-3 px-4 bg-gray-50 dark:bg-dark-3 text-sm font-semibold text-body-color border-b border-stroke dark:border-dark-3">
                          <button type="button" onClick={() => handleSort('category')} className="inline-flex items-center gap-0.5 hover:opacity-80" title="クリックで並び替え">
                            カテゴリ
                            {sortKey === 'category' && (sortOrder === 'asc' ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />)}
                          </button>
                        </th>
                        <th className="min-w-[200px] text-left py-3 px-4 bg-gray-50 dark:bg-dark-3 text-sm font-semibold text-body-color border-b border-stroke dark:border-dark-3">改善内容</th>
                        <th className="w-[120px] min-w-[120px] py-3 px-2 bg-gray-50 dark:bg-dark-3 text-sm font-semibold text-body-color border-b border-stroke dark:border-dark-3 text-center whitespace-nowrap">モック</th>
                        <th className="w-[160px] min-w-[160px] text-left py-3 px-4 bg-gray-50 dark:bg-dark-3 text-sm font-semibold text-body-color border-b border-stroke dark:border-dark-3">
                          <button type="button" onClick={(e) => { e.stopPropagation(); handleSort('estimatedLaborHours'); }} className="inline-flex items-center gap-0.5 hover:opacity-80 whitespace-nowrap" title="クリックで並び替え">
                            目安料金・納期
                            {sortKey === 'estimatedLaborHours' && (sortOrder === 'asc' ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />)}
                          </button>
                        </th>
                        <th className="w-[180px] min-w-[180px] text-left py-3 px-4 bg-gray-50 dark:bg-dark-3 text-sm font-semibold text-body-color border-b border-stroke dark:border-dark-3">
                          <button type="button" onClick={(e) => { e.stopPropagation(); handleSort('status'); }} className="inline-flex items-center gap-0.5 hover:opacity-80" title="クリックで並び替え">
                            ステータス
                            {sortKey === 'status' && (sortOrder === 'asc' ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />)}
                          </button>
                        </th>
                      </tr>
                    </thead>
                    )}
                    <tbody>
                      {sortedImprovements.length === 0 ? (
                        <tr className="no-hover"><td colSpan={isViewer ? 6 : 7} className="py-20 px-6 text-center">
                          <div className="flex flex-col items-center gap-6 max-w-xl mx-auto">
                            {/* 見出し + 説明 */}
                            <div className="space-y-2">
                              <h2 className="text-xl font-bold text-dark dark:text-white">
                                {isViewer ? '改善案がありません' : 'まずはAIに改善案を作ってもらいましょう'}
                              </h2>
                              {!isViewer && (
                                <p className="text-sm text-body-color leading-relaxed">
                                  GA4・Search Console のデータとサイトマップから、<br />
                                  AIが成果につながる改善ポイントを自動抽出します。<br />
                                  生成にかかる時間は約30秒です。
                                </p>
                              )}
                            </div>

                            {/* AI 生成 CTA: viewer も実行可 */}
                            <Button
                              variant="ai"
                              size="lg"
                              data-tour="improve-empty-hero-cta"
                              onClick={() => {
                                if (!selectedSiteId) return;
                                setIsFocusModalOpen(true);
                              }}
                            >
                              <Sparkles data-slot="icon" className="h-5 w-5" />
                              AI改善案を生成する
                            </Button>

                            {/* 手動追加サブリンク: viewer 不可 */}
                            {!isViewer && (
                              <button
                                data-tour="improve-empty-manual-link"
                                onClick={() => {
                                  setEditingItem(null);
                                  setIsDialogOpen(true);
                                }}
                                className="text-xs text-body-color underline"
                              >
                                または手動で改善案を追加する
                              </button>
                            )}
                          </div>
                        </td></tr>
                      ) : (
                        sortedImprovements.map((item) => {
                          const isChecked = detailViewSelectedIds.has(item.id);
                          const isDrawerActive = drawerItem?.id === item.id;
                          const isArchived = item.status === 'archived';
                          return (
                            <tr
                              key={item.id}
                              onClick={() => openDrawer(item)}
                              className={`border-b border-gray-100 dark:border-dark-3 cursor-pointer transition-colors ${isArchived ? 'opacity-50' : ''} ${isDrawerActive ? 'bg-primary/5' : 'hover:bg-gray-50 dark:hover:bg-dark-3'}`}
                            >
                              {!isViewer && (
                                <td className="py-7 pl-4 pr-2 align-middle text-center" onClick={(e) => e.stopPropagation()}>
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => toggleDetailViewSelection(item.id)}
                                    className="h-4 w-4 rounded border-stroke text-primary focus:ring-primary dark:border-dark-3"
                                    title="選択"
                                  />
                                </td>
                              )}
                              <td className="py-3.5 px-3 align-middle">
                                {item.priority && priorityLabels[item.priority] && (
                                  <span className={`inline-block rounded px-2.5 py-0.5 text-sm font-medium whitespace-nowrap ${priorityColors[item.priority] || ''}`}>
                                    {priorityLabels[item.priority]}
                                  </span>
                                )}
                              </td>
                              <td className="py-3.5 px-4 align-middle">
                                {item.category && categoryLabels[item.category] && (
                                  <span className="inline-block rounded px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap bg-gray-100 text-gray-700 dark:bg-dark-3 dark:text-gray-300">
                                    {categoryLabels[item.category]}
                                  </span>
                                )}
                              </td>
                              <td className="py-3.5 px-4 align-middle">
                                <div className="text-sm font-medium text-dark dark:text-white leading-snug">{item.title}</div>
                                <div className="mt-1 flex items-center gap-2 text-[11px] text-body-color">
                                  {(item.targetPageUrl || '').trim() && (
                                    <a
                                      href={item.targetPageUrl.startsWith('http') ? item.targetPageUrl : `${siteUrl}${item.targetPageUrl.startsWith('/') ? '' : '/'}${item.targetPageUrl}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-primary/70 hover:text-primary hover:underline"
                                      title="対象ページを新しいタブで開く"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                                      対象ページ
                                    </a>
                                  )}
                                  {item.status === 'draft' && item.createdAt && (() => {
                                    const created = item.createdAt?.toDate ? item.createdAt.toDate() : new Date(item.createdAt);
                                    const days = Math.floor((Date.now() - created.getTime()) / (24 * 60 * 60 * 1000));
                                    if (days > 0) return <><span className="text-gray-300 dark:text-dark-3">·</span><span className={`${days > 60 ? 'text-red-500' : days > 30 ? 'text-amber-600' : 'text-body-color'}`}>{days}日前に提案</span></>;
                                    return null;
                                  })()}
                                </div>
                              </td>
                              <td className="py-3.5 px-2 align-middle text-center w-[100px] min-w-[100px]" onClick={(e) => e.stopPropagation()}>
                                {hasMockup(item) ? (
                                  <span className="inline-flex items-center gap-1 text-xs text-green-700 dark:text-green-400 font-medium" title="モックアップ生成済み">
                                    <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                    モック生成済
                                  </span>
                                ) : item.mockupSkipped ? (
                                  <span className="text-[11px] text-gray-400">対象外</span>
                                ) : item.targetPageUrl ? (
                                  <Button
                                    variant="ai"
                                    size="sm"
                                    title="モックアップを生成する"
                                    onClick={(e) => { e.stopPropagation(); handleGenerateMockup(item); }}
                                    disabled={mockupGeneratingIds.has(item.id)}
                                  >
                                    {mockupGeneratingIds.has(item.id) ? (
                                      <><DotWaveSpinner size="xs" />生成中</>
                                    ) : (
                                      <><Sparkles data-slot="icon" className="h-3 w-3" />モック生成</>
                                    )}
                                  </Button>
                                ) : (
                                  <span className="text-[11px] text-gray-400">対象外</span>
                                )}
                              </td>
                              <td className="py-3.5 px-4 align-middle">
                                <div className="text-xs font-semibold text-dark dark:text-white">{formatEstimatedPriceLabel(item.estimatedLaborHours)} <span className="text-[11px] font-normal text-body-color">（税別）</span></div>
                                <div className="text-[11px] text-body-color mt-0.5">{formatEstimatedDeliveryLabel(item.estimatedLaborHours)}</div>
                              </td>
                              <td className="py-3.5 px-4 align-middle w-[200px]" onClick={(e) => e.stopPropagation()}>
                                <StatusActionCell
                                  item={item}
                                  onStatusChange={handleStatusChange}
                                  isViewer={isViewer}
                                />
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* 修正内容を制作会社に相談するボタン */}
                {improvements.length > 0 && !isViewer && (
                  <div className="mt-6 flex justify-center">
                    <Button
                      variant="primary"
                      size="lg"
                      type="button"
                      onClick={() => setIsConsultationModalOpen(true)}
                    >
                      <Mail data-slot="icon" className="h-5 w-5" />
                      修正内容を制作会社に相談する
                    </Button>
                  </div>
                )}
              </div>

            </>
          )}
        </div>
      </main>

      <ImprovementDialog
        isOpen={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false);
          setEditingItem(null);
        }}
        onDeleted={() => setDrawerItem(null)}
        siteId={selectedSiteId}
        siteUrl={siteUrl}
        editingItem={editingItem}
        onCreated={(improvement) => {
          // 保存後に Before スクショと After モックアップを並列で起動
          // （連投の流れを止めないためバックグラウンド実行）
          const url = (improvement?.targetPageUrl || '').trim();
          if (url && improvement?.targetType !== 'new_page') {
            // Before スクショ（PSI 経由、約 10〜30 秒）
            triggerBeforeCapture(url);
          }
          if (url || improvement?.targetType === 'new_page') {
            // After モックアップ（CF Worker + Gemini、約 10〜20 秒）
            handleGenerateMockup(improvement).catch(() => {/* エラーは toast で表示済み */});
          }
        }}
        onRequestConsultation={() => {
          setIsConsultationModalOpen(true);
        }}
      />

      <CompletionDialog
        isOpen={isCompletionDialogOpen}
        onClose={() => {
          setIsCompletionDialogOpen(false);
          setCompletionItem(null);
        }}
        item={completionItem}
        onConfirm={handleCompletionConfirm}
        isLoading={isCompletionLoading}
      />

      <ImplementationCheckGuideDialog
        isOpen={isImplCheckGuideOpen}
        item={implCheckGuideItem}
        isLoading={false}
        onClose={() => {
          setIsImplCheckGuideOpen(false);
          setImplCheckGuideItem(null);
        }}
        onMoveToInProgress={() => {
          if (!implCheckGuideItem) return;
          const target = implCheckGuideItem;
          updateMutation.mutate({ id: target.id, data: { status: 'in_progress' } });
          triggerBeforeImplementationSnapshot(target.id);
          setIsImplCheckGuideOpen(false);
          setImplCheckGuideItem(null);
          toast.success('対応中に戻し、改善前の状態を記録しています');
        }}
        onProceedWithoutCheck={() => {
          if (!implCheckGuideItem) return;
          const target = implCheckGuideItem;
          setIsImplCheckGuideOpen(false);
          setImplCheckGuideItem(null);
          // 検証スキップの印として beforeSnapshot を null で明示的に記録（diff 側で verified=null 判定）
          updateDoc(doc(db, 'sites', selectedSiteId, 'improvements', target.id), {
            'implementationCheck.verificationSkipped': true,
          }).catch(() => {});
          setCompletionItem(target);
          setIsCompletionDialogOpen(true);
        }}
      />

      <EvaluationModal
        isOpen={isEvaluationOpen}
        onClose={() => {
          setIsEvaluationOpen(false);
          setEvaluatingItem(null);
        }}
        item={evaluatingItem}
        onSave={handleEvaluationSave}
      />

      {/* AI生成モーダル */}
      <AIGenerationModal
        isOpen={isGenerationModalOpen && generationStatus === 'loading'}
        onCancel={() => {
          setIsGenerationModalOpen(false);
          setGenerationStatus('loading');
        }}
      />

      {/* 修正を相談するボタン（テーブル下・中央配置） */}

      {/* 相談フォームモーダル */}
      <ConsultationFormModal
        isOpen={isConsultationModalOpen}
        onClose={() => setIsConsultationModalOpen(false)}
        siteName={selectedSite?.siteName}
        siteUrl={siteUrl}
        improvements={improvements}
        onSuccess={() => {
          setIsConsultationModalOpen(false);
          navigate('/improve/consultation/thanks');
        }}
      />

      {/* プランアップグレードモーダル（上限超過時） */}
      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
      />

      {/* サイドドロワー */}
      {drawerItem && (() => {
        const item = drawerItem;
        const currentIdx = sortedImprovements.findIndex(i => i.id === item.id);
        const hasPrev = currentIdx > 0;
        const hasNext = currentIdx < sortedImprovements.length - 1;
        const targetUrl = (item.targetPageUrl || '').trim();
        const fullTargetUrl = targetUrl ? (targetUrl.startsWith('http') ? targetUrl : `${siteUrl}${targetUrl.startsWith('/') ? '' : '/'}${targetUrl}`) : '';

        return createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6">
            {/* オーバーレイ（モーダルの背面） */}
            <div className="absolute inset-0 bg-black/40" onClick={closeDrawer} />

            {/* モーダル本体（中央配置、95vw × 95vh） */}
            <div className="relative bg-white dark:bg-dark-2 rounded-xl shadow-2xl flex flex-col overflow-hidden" style={{ width: '95vw', height: '95vh' }}>

              {/* ドロワーヘッダー */}
              <div className="px-6 py-4 border-b border-gray-200 dark:border-dark-3 shrink-0">
                <div className="flex items-start justify-between gap-4">
                  {/* 左: バッジ群 + タイトル */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      {item.priority && priorityLabels[item.priority] && (
                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${priorityColors[item.priority] || ''}`}>
                          優先度: {priorityLabels[item.priority]}
                        </span>
                      )}
                      {item.category && categoryLabels[item.category] && (
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-gray-100 text-gray-700 dark:bg-dark-3 dark:text-gray-300">
                          {categoryLabels[item.category]}
                        </span>
                      )}
                      {fullTargetUrl && (
                        <a href={fullTargetUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-xs text-primary hover:underline font-medium">
                          対象ページを開く
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      {item.status === 'draft' && item.createdAt && (() => {
                        const created = item.createdAt?.toDate ? item.createdAt.toDate() : new Date(item.createdAt);
                        const days = Math.floor((Date.now() - created.getTime()) / (24 * 60 * 60 * 1000));
                        if (days > 0) {
                          return (
                            <>
                              <span className="text-gray-300 dark:text-dark-3">·</span>
                              <span className={`text-[11px] font-medium ${days > 60 ? 'text-red-500' : days > 30 ? 'text-amber-600' : 'text-body-color'}`}>{days}日前に提案</span>
                            </>
                          );
                        }
                        return null;
                      })()}
                    </div>
                    <h2 className="text-lg font-bold text-dark dark:text-white leading-tight line-clamp-2">{item.title}</h2>
                  </div>
                  {/* 右: アクションボタン群 + ナビ + 閉じる */}
                  <div className="flex items-center gap-2 shrink-0">
                    {item.status === 'archived' ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={async () => {
                          await updateDoc(doc(db, 'sites', selectedSiteId, 'improvements', item.id), {
                            status: 'draft', isStale: false, archivedAt: null, archivedReason: null,
                          });
                          setDrawerItem({ ...item, status: 'draft' });
                          queryClient.invalidateQueries({ queryKey: ['improvements'] });
                          toast.success('提案を復元しました');
                        }}
                      >
                        起案に復元
                      </Button>
                    ) : (
                      <StatusActionCell
                        item={item}
                        onStatusChange={(item, newStatus) => {
                          handleStatusChange(item, newStatus);
                          if (newStatus !== 'completed') {
                            setDrawerItem({ ...item, status: newStatus });
                          }
                        }}
                        compact
                        horizontal
                        isViewer={isViewer}
                      />
                    )}
                    {!isViewer && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setEditingItem(item);
                          setIsDialogOpen(true);
                        }}
                      >
                        編集
                      </Button>
                    )}
                    {/* 共有: After モックアップの公開 URL を grow-reporter.com ベースで提供 */}
                    {/* Firebase Hosting rewrite (firebase.json: /page-mockups/** → serveMockup) で */}
                    {/* Storage の生 URL を隠して自社ドメインで配信 */}
                    {/* 外部共有目的なので localhost / staging でも常に本番ドメインを使う */}
                    {item.mockupStorageUrl && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={async () => {
                          // mockupStorageUrl から siteId / improvementId を抽出して自社ドメイン URL を組み立てる
                          // 形式: .../page-mockups/{siteId}/{improvementId}.html
                          const m = (item.mockupStorageUrl || '').match(/\/page-mockups\/([^/]+)\/([^/]+)\.html/);
                          if (!m) {
                            toast.error('モックアップ URL の解析に失敗しました');
                            return;
                          }
                          // exportImprovementsToExcel.js の MOCKUP_SHARE_BASE_URL と同期
                          const shareUrl = `https://grow-reporter.com/page-mockups/${m[1]}/${m[2]}.html`;
                          try {
                            await navigator.clipboard.writeText(shareUrl);
                            toast.success('After モックアップの共有 URL をコピーしました');
                          } catch (err) {
                            toast.error('クリップボードへのコピーに失敗しました');
                          }
                        }}
                        title="After モックアップの共有 URL をコピー"
                      >
                        <Share2 className="w-4 h-4" />
                        <span className="ml-1">共有</span>
                      </Button>
                    )}
                    {/* 前後ナビゲーション */}
                    <div className="flex items-center gap-0.5 ml-1">
                      <button
                        onClick={() => navigateDrawer(-1)}
                        disabled={!hasPrev}
                        className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-dark-3 p-2 rounded-lg transition disabled:opacity-30 disabled:cursor-not-allowed"
                        title="前の改善"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="text-xs text-gray-500 font-medium tabular-nums px-1">{currentIdx + 1} / {sortedImprovements.length}</span>
                      <button
                        onClick={() => navigateDrawer(1)}
                        disabled={!hasNext}
                        className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-dark-3 p-2 rounded-lg transition disabled:opacity-30 disabled:cursor-not-allowed"
                        title="次の改善"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                    <button onClick={closeDrawer} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-3" title="閉じる">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* ドロワーコンテンツ */}
              <div className="flex-1 overflow-hidden flex">

                {/* 左カラム: 改善内容（スクロール + sticky bottom） */}
                <div className={`shrink-0 border-r border-gray-100 dark:border-dark-3 flex flex-col ${hasMockup(item) || (item.targetPageUrl && !item.mockupSkipped) ? 'w-full sm:w-[540px]' : 'w-full border-r-0'}`}>
                  {/* 改善内容ヘッダー */}
                  <div className="px-6 py-3.5 border-b border-gray-100 dark:border-dark-3 bg-white dark:bg-dark-2 flex items-center shrink-0">
                    <h3 className="text-base font-bold text-gray-900 dark:text-white">改善内容</h3>
                  </div>

                  {/* スクロール可能エリア */}
                  <div className={`flex-1 overflow-y-auto px-6 py-5 ${!hasMockup(item) && (!item.targetPageUrl || item.mockupSkipped) ? 'max-w-3xl mx-auto w-full' : ''}`}>
                    {(() => {
                      const sections = parseDescriptionSections(item.description);
                      const renderWithHighlight = (text) => {
                        if (!text || !highlightedExcerpt) return text;
                        const idx = text.indexOf(highlightedExcerpt);
                        if (idx < 0) return text;
                        return (
                          <>
                            {text.slice(0, idx)}
                            <mark className="bg-yellow-200 dark:bg-yellow-300/40 text-inherit px-0.5 rounded transition-colors">
                              {highlightedExcerpt}
                            </mark>
                            {text.slice(idx + highlightedExcerpt.length)}
                          </>
                        );
                      };
                      if (sections.legacy !== undefined) {
                        return <p className="text-sm text-gray-700 dark:text-gray-300 leading-7">{renderWithHighlight(sections.legacy)}</p>;
                      }
                      return (
                        <>
                          {/* 現状の問題（アコーディオン、デフォ展開） */}
                          {sections.problem && (
                            <details className="mb-5 group" open>
                              <summary className="cursor-pointer list-none flex items-center justify-between hover:opacity-80">
                                <div className="text-[13px] font-bold text-primary tracking-wide">現状の問題</div>
                                <ChevronDown className="w-4 h-4 text-gray-400 transition-transform group-open:rotate-180" />
                              </summary>
                              <p className="text-sm text-gray-700 dark:text-gray-300 leading-7 pt-2">{renderWithHighlight(sections.problem)}</p>
                            </details>
                          )}

                          {/* 提案内容（常時展開、カード） */}
                          {sections.solution && (
                            <section className="mb-5">
                              <div className="text-[13px] font-bold text-primary tracking-wide mb-2">提案内容</div>
                              {sections.proposals ? (
                                <ol className="space-y-2.5">
                                  {sections.proposals.map((p) => (
                                    <li
                                      key={p.num}
                                      className={`flex gap-2.5 p-3 rounded-xl transition-colors ${
                                        highlightedProposalNum === p.num
                                          ? 'bg-yellow-100 dark:bg-yellow-300/20'
                                          : 'bg-gray-50 dark:bg-dark-3/40 hover:bg-gray-100 dark:hover:bg-dark-3/60'
                                      }`}
                                    >
                                      <span className="shrink-0 w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">
                                        {p.num}
                                      </span>
                                      <div className="flex-1 min-w-0">
                                        <div className="text-sm font-semibold text-gray-900 dark:text-white">{p.title}</div>
                                        {p.detail && (
                                          <p className="text-xs text-gray-700 dark:text-gray-300 leading-6 mt-1">{p.detail}</p>
                                        )}
                                      </div>
                                    </li>
                                  ))}
                                </ol>
                              ) : (
                                <p className="text-sm text-gray-700 dark:text-gray-300 leading-7">{renderWithHighlight(sections.solution)}</p>
                              )}
                            </section>
                          )}

                          {/* なぜ効くか（アコーディオン、デフォ展開） */}
                          {sections.rationale && (
                            <details className="mb-5 group" open>
                              <summary className="cursor-pointer list-none flex items-center justify-between hover:opacity-80">
                                <div className="text-[13px] font-bold text-primary tracking-wide">なぜ効くか</div>
                                <ChevronDown className="w-4 h-4 text-gray-400 transition-transform group-open:rotate-180" />
                              </summary>
                              <p className="text-sm text-gray-700 dark:text-gray-300 leading-7 pt-2">{renderWithHighlight(sections.rationale)}</p>
                            </details>
                          )}
                        </>
                      );
                    })()}

                    {/* 効果計測パネル（完了タスクのみ） */}
                    <EffectMeasurementPanel
                      item={item}
                      siteId={selectedSiteId}
                      onRefresh={() => {
                        queryClient.invalidateQueries({ queryKey: ['improvements', selectedSiteId] });
                        queryClient.invalidateQueries({ queryKey: ['completed-improvements', selectedSiteId] });
                      }}
                    />
                  </div>

                  {/* 固定ボトムパネル（スクロール非依存・常時表示） */}
                  <div className="border-t-2 border-gray-200 dark:border-dark-3 bg-white dark:bg-dark-2 px-5 py-2.5 shrink-0">
                    {item.expectedImpact && (
                      <div className="flex items-center gap-2 px-2.5 py-1.5 mb-2 rounded-lg bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20 border border-green-200 dark:border-green-800">
                        <TrendingUp className="w-3.5 h-3.5 text-green-700 dark:text-green-400 shrink-0" />
                        <span className="text-[11px] font-bold text-green-800 dark:text-green-300 shrink-0">期待する効果</span>
                        <span className="text-gray-300 dark:text-dark-3 shrink-0">·</span>
                        <p className="text-xs font-semibold text-gray-900 dark:text-white leading-snug">{item.expectedImpact}</p>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <div className="border border-gray-200 dark:border-dark-3 rounded-lg px-2.5 py-1 flex-1 flex items-baseline gap-1.5">
                        <span className="text-[10px] text-body-color font-medium shrink-0">料金</span>
                        <span className="font-bold text-gray-900 dark:text-white text-sm">{formatEstimatedPriceLabel(item.estimatedLaborHours)}</span>
                        <span className="text-[9px] text-gray-400">（税別）</span>
                      </div>
                      <div className="border border-gray-200 dark:border-dark-3 rounded-lg px-2.5 py-1 flex-1 flex items-baseline gap-1.5">
                        <span className="text-[10px] text-body-color font-medium shrink-0">納期</span>
                        <span className="font-bold text-gray-900 dark:text-white text-sm">{formatEstimatedDeliveryLabel(item.estimatedLaborHours)}</span>
                      </div>
                      <Button
                        variant="primary"
                        size="sm"
                        type="button"
                        onClick={() => setIsConsultationModalOpen(true)}
                        className="shrink-0"
                      >
                        <Mail data-slot="icon" className="w-3.5 h-3.5" />
                        制作会社に相談
                      </Button>
                    </div>
                  </div>
                </div>

                {/* 右カラム: モックアップ（モックアップ対象の場合のみ表示） */}
                {(hasMockup(item) || (item.targetPageUrl && !item.mockupSkipped)) && (
                <div ref={mockupScrollRef} className="flex-1 overflow-y-auto bg-gray-50 dark:bg-dark">
                  {/* 生成中は古い iframe を一切描画せずプレースホルダを表示 */}
                  {hasMockup(item) && !mockupGeneratingIds.has(item.id) ? (
                    <>
                      {/* タブ + タイトル + 変更 chip（統合ヘッダ、sticky） */}
                      {(() => {
                        // chips: 提案項目（左パネル ①②③）と 1:1 対応させるため num で dedupe
                        // - change_label 先頭の丸数字を提案項目番号として採用 (backend と同じロジック)
                        // - 同じ num に複数パッチがあっても 1 件のチップにまとめる
                        // - チップテキストは提案項目タイトル (parseProposals の title) を優先使用
                        //   → 左パネル提案見出し と チップ文字列 が一致して三位一体になる
                        const proposalsFromDesc = parseDescriptionSections(item.description || '').proposals || [];
                        const proposalTitleByNum = new Map(proposalsFromDesc.map(p => [p.num, p.title]));
                        const numToChip = new Map();
                        let fallbackCounter = 0;
                        for (const c of (Array.isArray(item.mockupPatchChanges) ? item.mockupPatchChanges : [])) {
                          const label = (c?.change_label || '変更').trim();
                          const firstChar = label.charAt(0);
                          const circled = CIRCLED_NUM_MAP[firstChar];
                          let num;
                          if (circled) {
                            num = circled;
                          } else {
                            // 丸数字なし: 同 label には同 num、新 label には fallback 採番
                            const existing = [...numToChip.values()].find(ch => ch.label === label);
                            if (existing) {
                              num = existing.num;
                            } else {
                              fallbackCounter++;
                              num = fallbackCounter;
                            }
                          }
                          if (numToChip.has(num)) continue; // 同 num は 1 件のみ
                          // 表示ラベルは提案項目タイトル優先 (なければ change_label を流用)
                          const displayText = proposalTitleByNum.get(num) || label;
                          // originalLabel は handleChipClick で description_excerpt を引くために保持
                          numToChip.set(num, { num, label: displayText, originalLabel: label });
                        }
                        const chips = [...numToChip.values()].sort((a, b) => a.num - b.num);
                        const showChips = chips.length > 0 && drawerTab !== 'before';
                        // 表示対象: 3 件以上かつ折り畳み中は先頭 2 件のみ、それ以外は全件
                        const COLLAPSE_THRESHOLD = 3;
                        const collapsible = chips.length >= COLLAPSE_THRESHOLD;
                        const shownChips = (collapsible && !mockupChipsExpanded) ? chips.slice(0, 2) : chips;
                        const remaining = chips.length - shownChips.length;
                        const handleChipClick = (chip) => {
                          const pos = mockupPositions.find(p => String(p.num) === String(chip.num));
                          if (pos) scrollContainerToPosition(pos);
                          setHighlightedProposalNum(chip.num);
                          // originalLabel は dedupe 前の元 change_label。description_excerpt を引くため
                          const change = item.mockupPatchChanges.find(c => (c?.change_label || '') === chip.originalLabel);
                          if (change?.description_excerpt) setHighlightedExcerpt(change.description_excerpt);
                        };
                        return (
                          <div className="sticky top-0 z-10 shrink-0">
                            {/* 1 段目: タイトル + 再生成 + 変更件数 | タブ（白背景 + 下罫線） */}
                            <div className="bg-white dark:bg-dark-2 border-b border-gray-200 dark:border-dark-3 px-6 py-3 flex items-center justify-between gap-3 flex-wrap">
                              <div className="flex items-center gap-2 min-w-0 flex-wrap">
                                <h3 className="shrink-0 text-base font-bold text-gray-800 dark:text-white">改善モックアップ</h3>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  pill
                                  onClick={(e) => { e.stopPropagation(); handleRegenerateMockup(item); }}
                                  disabled={mockupGeneratingIds.has(item.id)}
                                  className="shrink-0"
                                  title="モックアップを再生成"
                                >
                                  <RefreshCw data-slot="icon" className={`h-3 w-3 ${mockupGeneratingIds.has(item.id) ? 'animate-spin' : ''}`} />
                                  {mockupGeneratingIds.has(item.id) ? '生成中…' : '再生成'}
                                </Button>
                                {showChips && (
                                  <>
                                    <span className="shrink-0 text-gray-300 dark:text-dark-3">｜</span>
                                    <span className="shrink-0 text-xs font-bold text-primary">変更 {chips.length} 件</span>
                                  </>
                                )}
                              </div>
                              <div className="shrink-0 flex gap-0.5 bg-gray-200/70 dark:bg-dark-3 rounded-lg p-0.5">
                                {[
                                  { key: 'compare', label: '並べて比較' },
                                  { key: 'before', label: 'Before' },
                                  { key: 'after', label: 'After' },
                                ].map(tab => (
                                  <button
                                    key={tab.key}
                                    onClick={() => setDrawerTab(tab.key)}
                                    className={`px-4 py-1.5 rounded-md text-xs font-medium transition ${drawerTab === tab.key ? 'bg-white dark:bg-dark-2 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer'}`}
                                  >
                                    {tab.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                            {/* 2 段目: chips（変更内容バッジ）（白背景 + うっすら下罫線） */}
                            {showChips && (
                              <div className="bg-white dark:bg-dark-2 border-b border-gray-100 dark:border-dark-3 px-6 py-2.5 flex items-center gap-2 flex-wrap">
                                {shownChips.map(chip => {
                                  // 表示用ラベル: 先頭の丸数字とその後の空白を除去（バッジと重複するため）
                                  const displayLabel = chip.label.replace(/^[①②③④⑤⑥⑦⑧⑨⑩]\s*/, '');
                                  const isActive = highlightedProposalNum === chip.num;
                                  return (
                                  <button
                                    key={chip.num}
                                    onClick={() => handleChipClick(chip)}
                                    className={`shrink-0 inline-flex items-center gap-1.5 pl-1 pr-3 py-1 rounded-full transition cursor-pointer text-xs font-medium ${
                                      isActive
                                        ? 'bg-yellow-100 text-primary ring-2 ring-primary/30'
                                        : 'bg-gray-100 hover:bg-primary/10 text-gray-700 hover:text-primary'
                                    }`}
                                    title={displayLabel}
                                  >
                                    <span className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-bold">{chip.num}</span>
                                    <span className="whitespace-nowrap">{displayLabel}</span>
                                  </button>
                                  );
                                })}
                                {collapsible && !mockupChipsExpanded && remaining > 0 && (
                                  <button
                                    onClick={() => setMockupChipsExpanded(true)}
                                    className="shrink-0 inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-primary/10 hover:bg-primary/20 text-primary transition cursor-pointer text-xs font-semibold"
                                  >
                                    +{remaining} 件 <ChevronDown className="w-3 h-3" />
                                  </button>
                                )}
                                {collapsible && mockupChipsExpanded && (
                                  <button
                                    onClick={() => setMockupChipsExpanded(false)}
                                    className="ml-auto shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition cursor-pointer text-[11px]"
                                    title="折りたたむ"
                                  >
                                    <ChevronUp className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* 並べて比較 */}
                      {drawerTab === 'compare' && (
                        <div className="p-6">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <div className="text-xs font-semibold text-gray-400 mb-2">Before（現在）</div>
                              {/* ブラウザフレーム */}
                              <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-dark-3 shadow-lg">
                                <div className="flex items-center gap-2 bg-gray-100 dark:bg-dark-3 px-3 py-2 border-b border-gray-200 dark:border-dark-3">
                                  <div className="flex gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-full bg-red-400"></span>
                                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-400"></span>
                                    <span className="w-2.5 h-2.5 rounded-full bg-green-400"></span>
                                  </div>
                                  <div className="flex-1 mx-2 rounded bg-white dark:bg-dark-2 px-3 py-0.5 text-[10px] text-gray-400 truncate">{item.targetPageUrl || 'https://example.com'}</div>
                                </div>
                                <div className="bg-white dark:bg-dark-2">
                                  {(getBeforeScreenshotUrl(item.targetPageUrl)) ? (
                                    <img src={getBeforeScreenshotUrl(item.targetPageUrl)} alt="現在のページ" className="w-full h-auto" />
                                  ) : (
                                    <div className="flex h-[300px] flex-col items-center justify-center gap-2 text-xs text-body-color">
                                      <svg className="h-5 w-5 animate-spin text-primary/40" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                                      スクリーンショットを取得中です（最大30秒程度）
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-primary mb-2">After（改善案適用後）</div>
                              {/* ブラウザフレーム */}
                              <div className="rounded-xl overflow-hidden border border-primary/30 shadow-lg" style={{ height: afterIframeHeight ? `${afterIframeHeight * compareIframeScale + 44}px` : '2444px' }}>
                                <div className="flex items-center gap-2 bg-gray-100 dark:bg-dark-3 px-3 py-2 border-b border-gray-200 dark:border-dark-3">
                                  <div className="flex gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-full bg-red-400"></span>
                                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-400"></span>
                                    <span className="w-2.5 h-2.5 rounded-full bg-green-400"></span>
                                  </div>
                                  <div className="flex-1 mx-2 rounded bg-white dark:bg-dark-2 px-3 py-0.5 text-[10px] text-gray-400 truncate">{item.targetPageUrl || 'https://example.com'}</div>
                                </div>
                                <div ref={compareIframeContainerRef} className="bg-white dark:bg-dark-2 relative pt-3 overflow-hidden" style={{ height: afterIframeHeight ? `${afterIframeHeight * compareIframeScale + 12}px` : '2412px' }}>
                                  {item.mockupStorageUrl ? (
                                    drawerMockupHtml ? (
                                      <iframe
                                        title="改善モックアップ"
                                        srcDoc={drawerMockupHtml}
                                        className="absolute top-3 left-0 border-0"
                                        sandbox="allow-same-origin allow-scripts"
                                        onLoad={(e) => {
                                          try {
                                            const h = e.target.contentDocument?.documentElement?.scrollHeight;
                                            if (h) setAfterIframeHeight(h);
                                          } catch (_) {}
                                        }}
                                        style={{ height: afterIframeHeight ? `${afterIframeHeight}px` : '4800px', width: '1400px', transform: `scale(${compareIframeScale})`, transformOrigin: 'top left' }}
                                      />
                                    ) : (
                                      <div className="absolute inset-0 flex items-center justify-center text-xs text-body-color"><DotWaveSpinner /></div>
                                    )
                                  ) : (
                                    <iframe
                                      title="改善モックアップ"
                                      srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;overflow:hidden;}[data-changed]{outline:3px solid #3758F9;outline-offset:3px;border-radius:6px;position:relative;z-index:1;}[data-changed][data-num]::before{content:attr(data-num);position:absolute;bottom:100%;left:0;margin-bottom:6px;width:28px;height:28px;background:#3758F9;color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;box-shadow:0 2px 6px rgba(55,88,249,0.4);border:2px solid white;z-index:10001;pointer-events:auto;cursor:pointer;}[data-changed] [data-changed]{outline-color:rgba(55,88,249,0.55);outline-width:2px;}[data-changed] [data-changed]::before{width:24px;height:24px;font-size:12px;margin-bottom:8px;left:34px;background:#6366f1;}[data-changed] [data-changed] [data-changed]::before{left:64px;background:#818cf8;}${item.mockupCss || ''}</style></head><body>${item.mockupHtml}</body></html>`}
                                      className="absolute top-3 left-0 border-0"
                                      sandbox="allow-same-origin allow-scripts"
                                      onLoad={(e) => {
                                        try {
                                          const h = e.target.contentDocument?.documentElement?.scrollHeight;
                                          if (h) setAfterIframeHeight(h);
                                        } catch (_) {}
                                      }}
                                      style={{ height: afterIframeHeight ? `${afterIframeHeight}px` : '2000px', width: '1400px', transform: `scale(${compareIframeScale})`, transformOrigin: 'top left' }}
                                    />
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Before単体 */}
                      {drawerTab === 'before' && (
                        <div className="p-6">
                          <div className="text-xs font-semibold text-gray-400 mb-2">Before（現在）</div>
                          {/* ブラウザフレーム */}
                          <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-dark-3 shadow-lg">
                            <div className="flex items-center gap-2 bg-gray-100 dark:bg-dark-3 px-3 py-2 border-b border-gray-200 dark:border-dark-3">
                              <div className="flex gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-red-400"></span>
                                <span className="w-2.5 h-2.5 rounded-full bg-yellow-400"></span>
                                <span className="w-2.5 h-2.5 rounded-full bg-green-400"></span>
                              </div>
                              <div className="flex-1 mx-2 rounded bg-white dark:bg-dark-2 px-3 py-0.5 text-[10px] text-gray-400 truncate">{item.targetPageUrl || 'https://example.com'}</div>
                            </div>
                            <div className="bg-white dark:bg-dark-2">
                              {(getBeforeScreenshotUrl(item.targetPageUrl)) ? (
                                <img src={getBeforeScreenshotUrl(item.targetPageUrl)} alt="現在のページ" className="w-full h-auto" />
                              ) : (
                                <div className="flex h-[300px] flex-col items-center justify-center gap-2 text-xs text-body-color">
                                  <svg className="h-5 w-5 animate-spin text-primary/40" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                                  スクリーンショットを取得中です（最大30秒程度）
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* After単体 */}
                      {drawerTab === 'after' && (
                        <div className="p-6">
                          <div className="text-xs font-semibold text-primary mb-2">After（改善案適用後）</div>
                          {/* ブラウザフレーム */}
                          <div className="rounded-xl overflow-hidden border border-primary/30 shadow-lg">
                            <div className="flex items-center gap-2 bg-gray-100 dark:bg-dark-3 px-3 py-2 border-b border-gray-200 dark:border-dark-3">
                              <div className="flex gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-red-400"></span>
                                <span className="w-2.5 h-2.5 rounded-full bg-yellow-400"></span>
                                <span className="w-2.5 h-2.5 rounded-full bg-green-400"></span>
                              </div>
                              <div className="flex-1 mx-2 rounded bg-white dark:bg-dark-2 px-3 py-0.5 text-[10px] text-gray-400 truncate">{item.targetPageUrl || 'https://example.com'}</div>
                            </div>
                            <div ref={soloIframeContainerRef} className="bg-white dark:bg-dark-2 pt-3 relative overflow-hidden" style={{ height: afterIframeHeight ? `${afterIframeHeight * soloIframeScale + 12}px` : '4812px' }}>
                              {item.mockupStorageUrl ? (
                                drawerMockupHtml ? (
                                  <iframe
                                    title="改善モックアップ"
                                    srcDoc={drawerMockupHtml}
                                    className="absolute top-3 left-0 border-0"
                                    sandbox="allow-same-origin allow-scripts"
                                    onLoad={(e) => {
                                      try {
                                        const h = e.target.contentDocument?.documentElement?.scrollHeight;
                                        if (h) setAfterIframeHeight(h);
                                      } catch (_) {}
                                    }}
                                    style={{ height: afterIframeHeight ? `${afterIframeHeight}px` : '4800px', width: '1400px', transform: `scale(${soloIframeScale})`, transformOrigin: 'top left' }}
                                  />
                                ) : (
                                  <div className="absolute inset-0 flex items-center justify-center text-xs text-body-color"><DotWaveSpinner /></div>
                                )
                              ) : (
                                <iframe
                                  title="改善モックアップ"
                                  srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;overflow:hidden;}[data-changed]{outline:3px solid #3758F9;outline-offset:3px;border-radius:6px;position:relative;z-index:1;}[data-changed][data-num]::before{content:attr(data-num);position:absolute;bottom:100%;left:0;margin-bottom:6px;width:28px;height:28px;background:#3758F9;color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;box-shadow:0 2px 6px rgba(55,88,249,0.4);border:2px solid white;z-index:10001;pointer-events:auto;cursor:pointer;}[data-changed] [data-changed]{outline-color:rgba(55,88,249,0.55);outline-width:2px;}[data-changed] [data-changed]::before{width:24px;height:24px;font-size:12px;margin-bottom:8px;left:34px;background:#6366f1;}[data-changed] [data-changed] [data-changed]::before{left:64px;background:#818cf8;}${item.mockupCss || ''}</style></head><body>${item.mockupHtml}</body></html>`}
                                  className="absolute top-3 left-0 border-0"
                                  sandbox="allow-same-origin allow-scripts"
                                  onLoad={(e) => {
                                    try {
                                      const h = e.target.contentDocument?.documentElement?.scrollHeight;
                                      if (h) setAfterIframeHeight(h);
                                    } catch (_) {}
                                  }}
                                  style={{ height: afterIframeHeight ? `${afterIframeHeight}px` : '2000px', width: '1400px', transform: `scale(${soloIframeScale})`, transformOrigin: 'top left' }}
                                />
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  ) : item.targetPageUrl && !hasMockup(item) && !item.mockupSkipped ? (
                    <>
                      {/* ヘッダー（sticky） */}
                      <div className="sticky top-0 z-10 shrink-0 bg-white dark:bg-dark-2 border-b border-gray-200 dark:border-dark-3 px-6 py-3 flex items-center">
                        <h3 className="text-base font-bold text-gray-800 dark:text-white">改善モックアップ</h3>
                      </div>
                      {/* 並べて比較レイアウト: Before + After(未生成) */}
                      <div className="p-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* Before */}
                          <div>
                            <div className="text-xs font-semibold text-gray-400 mb-2">Before（現在）</div>
                            <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-dark-3 shadow-lg">
                              <div className="flex items-center gap-2 bg-gray-100 dark:bg-dark-3 px-3 py-2 border-b border-gray-200 dark:border-dark-3">
                                <div className="flex gap-1.5">
                                  <span className="w-2.5 h-2.5 rounded-full bg-red-400"></span>
                                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-400"></span>
                                  <span className="w-2.5 h-2.5 rounded-full bg-green-400"></span>
                                </div>
                                <div className="flex-1 mx-2 rounded bg-white dark:bg-dark-2 px-3 py-0.5 text-[10px] text-gray-400 truncate">{item.targetPageUrl}</div>
                              </div>
                              <div className="bg-white dark:bg-dark-2">
                                {getBeforeScreenshotUrl(item.targetPageUrl) ? (
                                  <img src={getBeforeScreenshotUrl(item.targetPageUrl)} alt="現在のページ" className="w-full h-auto" />
                                ) : (
                                  <div className="flex h-[300px] flex-col items-center justify-center gap-2 text-xs text-body-color">
                                  <svg className="h-5 w-5 animate-spin text-primary/40" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                                  スクリーンショットを取得中です（最大30秒程度）
                                </div>
                                )}
                              </div>
                            </div>
                          </div>
                          {/* After（未生成 / 生成中） */}
                          <div>
                            <div className="text-xs font-semibold text-primary mb-2">After（改善案適用後）</div>
                            <div className="rounded-xl overflow-hidden border border-primary/30 shadow-lg">
                              <div className="flex items-center gap-2 bg-gray-100 dark:bg-dark-3 px-3 py-2 border-b border-gray-200 dark:border-dark-3">
                                <div className="flex gap-1.5">
                                  <span className="w-2.5 h-2.5 rounded-full bg-red-400"></span>
                                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-400"></span>
                                  <span className="w-2.5 h-2.5 rounded-full bg-green-400"></span>
                                </div>
                                <div className="flex-1 mx-2 rounded bg-white dark:bg-dark-2 px-3 py-0.5 text-[10px] text-gray-400 truncate">{item.targetPageUrl}</div>
                              </div>
                              {/* 生成中/失敗時のプレースホルダ（白背景） */}
                              <div className="relative overflow-hidden bg-white dark:bg-dark-2" style={{ minHeight: '300px' }}>
                                <div className="relative z-10 flex flex-col items-center justify-center p-8" style={{ minHeight: '300px' }}>
                                  {mockupFailedIds.has(item.id) ? (
                                    // 失敗状態: 手動再試行ボタン
                                    <>
                                      <div className="mx-auto mb-3 h-14 w-14 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                                        <AlertCircle className="h-7 w-7 text-red-500" />
                                      </div>
                                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">モックアップ生成に失敗しました</p>
                                      <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">時間をおいてからお試しください</p>
                                      <Button
                                        variant="primary"
                                        size="lg"
                                        onClick={() => handleGenerateMockup(item)}
                                      >
                                        <RefreshCw data-slot="icon" className="h-4 w-4" />
                                        再試行する
                                      </Button>
                                    </>
                                  ) : (
                                    // デフォルト/生成中: ドロワー開時に自動発火するのでスピナー1種類でOK
                                    <>
                                      <div className="mb-3">
                                        <DotWaveSpinner size="md" />
                                      </div>
                                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">モックアップを生成中…</p>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : null}
                </div>
                )}
              </div>

              {/* ドロワーフッター（コンパクト：削除 + キーボードヒント） */}
              <div className="px-6 py-2.5 border-t border-gray-100 dark:border-dark-3 flex items-center justify-between shrink-0 bg-gray-50/80 dark:bg-dark-3">
                {!isViewer ? (
                  <Button
                    variant="danger-outline"
                    size="sm"
                    onClick={() => {
                      if (window.confirm('この改善案を削除しますか？')) {
                        deleteMutation.mutate(item.id);
                        closeDrawer();
                      }
                    }}
                  >
                    <Trash2 data-slot="icon" className="w-3.5 h-3.5" />
                    この改善案を削除
                  </Button>
                ) : <div />}
                <span className="text-[11px] text-gray-500">
                  <kbd className="px-1.5 py-0.5 bg-white dark:bg-dark-2 border border-gray-200 dark:border-dark-3 rounded text-[10px]">←</kbd>
                  <kbd className="ml-1 px-1.5 py-0.5 bg-white dark:bg-dark-2 border border-gray-200 dark:border-dark-3 rounded text-[10px]">→</kbd>
                  <span className="ml-1">前後の改善</span>
                  <span className="mx-2 text-gray-300 dark:text-dark-3">|</span>
                  <kbd className="px-1.5 py-0.5 bg-white dark:bg-dark-2 border border-gray-200 dark:border-dark-3 rounded text-[10px]">Esc</kbd>
                  <span className="ml-1">閉じる</span>
                </span>
              </div>
            </div>

          </div>,
          document.body
        );
      })()}
    </div>
  );
}

