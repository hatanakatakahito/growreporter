/**
 * AIチャット専用ページ
 * ChatGPT型レイアウト: 左パネル（会話一覧）+ 右パネル（チャット画面）
 */
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSite } from '../contexts/SiteContext';
import { useAuth } from '../contexts/AuthContext';
import { usePlan } from '../hooks/usePlan';
import { db, functions } from '../config/firebase';
import { httpsCallable } from 'firebase/functions';
import { setPageTitle } from '../utils/pageTitle';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  MessageSquare, Plus, Send, Paperclip, X, Search, Archive, Trash2,
  MoreHorizontal, Share2, Lock, Loader2, Sparkles, ChevronLeft, Menu,
  FileText, Image, Table, Download, AlertCircle, BarChart3, Lightbulb,
  StopCircle, Maximize2, Copy, Check, ImageDown, RefreshCw,
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import toast from 'react-hot-toast';

const CHART_COLORS = ['#3758F9', '#13C296', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'xlsx', 'csv', 'pptx', 'docx'];
const MAX_FILE_SIZE = 20 * 1024 * 1024;

const PROSE_CLASSES = 'prose prose-sm max-w-none text-dark dark:text-gray-300 dark:prose-invert';

// ReactMarkdownのテーブル等にインラインでスタイルを適用するcomponents定義
const MARKDOWN_COMPONENTS = {
  table: ({ children }) => <ExpandableTable>{children}</ExpandableTable>,
  thead: ({ children }) => (
    <thead style={{ backgroundColor: '#ffffff' }}>{children}</thead>
  ),
  th: ({ children, style }) => (
    <th style={{ ...style, backgroundColor: '#ffffff', border: '1px solid #DFE4EA', padding: '8px 12px', fontSize: '13px', fontWeight: 600, color: '#1B2559', whiteSpace: 'nowrap' }}>{children}</th>
  ),
  td: ({ children, style }) => (
    <td style={{ ...style, backgroundColor: '#ffffff', border: '1px solid #DFE4EA', padding: '8px 12px', fontSize: '14px', color: '#1B2559', whiteSpace: 'nowrap' }}>{children}</td>
  ),
  code: ({ children, className }) => {
    if (className) {
      // コードブロック
      return <code className={className} style={{ display: 'block', background: '#1f2937', color: '#f3f4f6', padding: '16px', borderRadius: '8px', fontSize: '12px', overflowX: 'auto' }}>{children}</code>;
    }
    // インラインコード
    return <code style={{ background: '#f3f4f6', padding: '2px 6px', borderRadius: '4px', fontSize: '12px', color: '#dc2626' }}>{children}</code>;
  },
  blockquote: ({ children }) => (
    <blockquote style={{ borderLeft: '4px solid rgba(55,88,249,0.3)', paddingLeft: '16px', fontStyle: 'italic', color: '#637381', margin: '12px 0' }}>{children}</blockquote>
  ),
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: '#3758F9', textDecoration: 'none' }}>{children}</a>
  ),
  strong: ({ children }) => (
    <strong style={{ color: '#1B2559', fontWeight: 700 }}>{children}</strong>
  ),
};

const DEFAULT_SUGGEST_QUESTIONS = [
  '前月分のアクセス状況を表組でまとめて',
  '前月分と前年同月分を比較して表組でまとめて',
  '今月のコンバージョン数を内訳別で教えて',
  '現在のアクセス状況についてどんな状況か教えて',
  '最も改善すべきページはどこ？',
  'SEOで改善できるキーワードは？',
];

// ページ種別に応じた動的サジェスト質問
const PAGE_SUGGEST_QUESTIONS = {
  day: [
    'アクセスが急増/急減した日とその原因は？',
    '曜日ごとのアクセス傾向を教えて',
  ],
  week: [
    '曜日ごとのアクセスパターンを分析して',
    '平日と週末のアクセス差はどのくらい？',
  ],
  hour: [
    '時間帯別のアクセスピークはいつ？',
    'アクセスが少ない時間帯に改善できることは？',
  ],
  month: [
    '月別のトレンドを前年と比較して',
    '成長率が最も高い月と低い月は？',
  ],
  summary: [
    '全体サマリーで最も注目すべき変化は？',
    '改善の優先順位をつけるとしたら？',
  ],
  users: [
    'ユーザー属性の特徴を教えて',
    'ターゲットユーザーにリーチできている？',
  ],
  channels: [
    'チャネル別の前年比較を表組で教えて',
    '弱いチャネルを強化するにはどうすればいい？',
  ],
  keywords: [
    '順位が改善できそうなキーワードは？',
    '前年と比べてKW順位はどう変化した？',
  ],
  referrals: [
    '参照元サイトで注目すべきものは？',
    '新しい流入経路を開拓するには？',
  ],
  pages: [
    'PVが高いのにCVが低いページは？',
    'ページ別のエンゲージメント率を比較して',
  ],
  'page-categories': [
    'カテゴリ別で最も改善余地があるのは？',
    'カテゴリ別のCV貢献度を教えて',
  ],
  'landing-pages': [
    'ランディングページの直帰率が高いのはどこ？',
    'LPごとのCV率を比較して',
  ],
  conversions: [
    'CV数の月別推移と傾向を教えて',
    'CVを増やすための具体的な施策は？',
  ],
  'reverse-flow': [
    'CVに至る最も効果的な導線は？',
    'CV直前で離脱が多いページは？',
  ],
  'page-flow': [
    'ユーザーが離脱しやすい遷移パターンは？',
    'トップページからの理想的な遷移先は？',
  ],
  comprehensive: [
    'サイト全体で最も優先すべき課題は？',
    'この分析結果をもとに改善提案をして',
  ],
};

export default function AIChat() {
  const { selectedSite, selectedSiteId } = useSite();
  const { currentUser } = useAuth();
  const { plan, getRemainingByType, isFree } = usePlan();
  const [searchParams] = useSearchParams();

  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sessionMenuId, setSessionMenuId] = useState(null);
  const [editingTitleId, setEditingTitleId] = useState(null);
  const [editTitleValue, setEditTitleValue] = useState('');
  const [showNewSessionDialog, setShowNewSessionDialog] = useState(false);
  const [newSessionTitle, setNewSessionTitle] = useState('');

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { setPageTitle('AIチャット'); }, []);

  // 遷移元ページに応じた動的サジェスト質問を構築
  const fromPage = searchParams.get('from') || '';
  const suggestQuestions = useMemo(() => {
    const pageQuestions = PAGE_SUGGEST_QUESTIONS[fromPage] || [];
    // ページ固有の質問（最大2件）+ デフォルト質問から残りを埋める（合計6件）
    const combined = [...pageQuestions];
    for (const q of DEFAULT_SUGGEST_QUESTIONS) {
      if (combined.length >= 6) break;
      if (!combined.includes(q)) combined.push(q);
    }
    return combined.slice(0, 6);
  }, [fromPage]);

  // 会話一覧の読み込み
  const loadSessions = useCallback(async () => {
    if (!selectedSiteId) return;
    setIsLoading(true);
    try {
      const fn = httpsCallable(functions, 'getChatSessions');
      const result = await fn({ siteId: selectedSiteId, includeArchived: false });
      setSessions(result.data.sessions || []);
    } catch (e) {
      console.error('セッション取得エラー:', e);
    } finally {
      setIsLoading(false);
    }
  }, [selectedSiteId]);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  // セッション選択時にメッセージを読み込み（Cloud Function経由）
  const loadMessages = useCallback(async (sessionId) => {
    if (!selectedSiteId || !sessionId) return;
    try {
      const fn = httpsCallable(functions, 'getChatMessages');
      const result = await fn({ siteId: selectedSiteId, sessionId });
      setMessages(result.data.messages || []);
    } catch (e) {
      console.error('メッセージ取得エラー:', e);
      // フォールバック: Firestore直接読み取り
      try {
        const { doc, getDoc } = await import('firebase/firestore');
        const sessionDoc = await getDoc(doc(db, 'sites', selectedSiteId, 'chatSessions', sessionId));
        if (sessionDoc.exists()) {
          setMessages(sessionDoc.data().messages || []);
        }
      } catch (e2) {
        console.error('メッセージ取得フォールバックエラー:', e2);
      }
    }
  }, [selectedSiteId]);

  useEffect(() => {
    if (activeSessionId) loadMessages(activeSessionId);
    else setMessages([]);
  }, [activeSessionId, loadMessages]);

  // スクロール
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 残り回数
  const remaining = getRemainingByType('chat');
  const isLimitReached = remaining === 0;

  // メッセージ送信
  const handleSend = async () => {
    if (!inputText.trim() && attachments.length === 0) return;
    if (isSending || isLimitReached) return;

    const text = inputText.trim();
    setInputText('');
    setIsSending(true);

    // UIに即座にユーザーメッセージを表示
    const userMsg = { role: 'user', text, attachments: attachments.map(a => ({ name: a.name, type: a.type, size: a.size })), userName: currentUser?.displayName || currentUser?.email?.split('@')[0] || '', userPhoto: currentUser?.photoURL || '', timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);

    try {
      const attachmentData = await Promise.all(attachments.map(async (file) => {
        const buffer = await file.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
        return {
          name: file.name,
          contentType: file.type,
          size: file.size,
          data: base64,
        };
      }));

      const fn = httpsCallable(functions, 'aiChat');
      const result = await fn({
        siteId: selectedSiteId,
        sessionId: activeSessionId || null,
        message: text,
        attachments: attachmentData,
      });

      const { sessionId: newSessionId, message: aiMsg } = result.data;

      // 新規セッションの場合
      if (!activeSessionId && newSessionId) {
        setActiveSessionId(newSessionId);
        loadSessions();
      }

      // AI回答を表示
      setMessages(prev => [...prev, {
        role: 'model',
        text: aiMsg.text,
        chartData: aiMsg.chartData,
        improvementData: aiMsg.improvementData,
        timestamp: new Date().toISOString(),
      }]);

      setAttachments([]);
    } catch (e) {
      console.error('送信エラー:', e);
      const errorMessage = e.message?.includes('上限') ? e.message : '回答の生成に失敗しました。';
      setMessages(prev => [...prev, { role: 'error', text: errorMessage, timestamp: new Date().toISOString() }]);
    } finally {
      setIsSending(false);
    }
  };

  // Enter送信
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Ctrl+Vで画像をペースト
  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const imageFiles = [];
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) imageFiles.push(file);
      }
    }
    if (imageFiles.length > 0) {
      e.preventDefault();
      addFiles(imageFiles);
    }
  };

  // ファイル添付
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    addFiles(files);
    e.target.value = '';
  };

  const addFiles = (files) => {
    const valid = files.filter(f => {
      const ext = f.name.split('.').pop().toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(ext)) { toast.error(`未対応の形式です: .${ext}`); return false; }
      if (f.size > MAX_FILE_SIZE) { toast.error(`ファイルサイズが上限（20MB）を超えています`); return false; }
      return true;
    });
    if (attachments.length + valid.length > 5) { toast.error('添付は最大5件までです'); return; }
    setAttachments(prev => [...prev, ...valid]);
  };

  // ドラッグ&ドロップ
  const handleDrop = (e) => {
    e.preventDefault();
    addFiles(Array.from(e.dataTransfer.files));
  };

  // 新規セッション
  const handleNewSession = () => {
    setActiveSessionId(null);
    setMessages([]);
    setShowSidebar(false);
  };

  // セッション操作
  const handleDeleteSession = async (id) => {
    if (!window.confirm('この会話を削除しますか？')) return;
    try {
      const fn = httpsCallable(functions, 'deleteChatSession');
      await fn({ siteId: selectedSiteId, sessionId: id });
      if (activeSessionId === id) { setActiveSessionId(null); setMessages([]); }
      loadSessions();
      toast.success('会話を削除しました');
    } catch { toast.error('削除に失敗しました'); }
    setSessionMenuId(null);
  };



  const handleSaveTitle = async (id) => {
    if (!editTitleValue.trim()) return;
    try {
      const fn = httpsCallable(functions, 'updateChatSession');
      await fn({ siteId: selectedSiteId, sessionId: id, title: editTitleValue.trim() });
      loadSessions();
    } catch { toast.error('タイトルの更新に失敗しました'); }
    setEditingTitleId(null);
  };

  // 改善タスク追加
  const handleAddImprovement = async (improvementData) => {
    try {
      const fn = httpsCallable(functions, 'addImprovementFromChat');
      await fn({ siteId: selectedSiteId, improvement: improvementData });
      toast.success('改善タスクに追加しました');
    } catch { toast.error('追加に失敗しました'); }
  };

  // エクスポート（Markdown記号・:::ブロックを除去してプレーンテキスト化）
  const handleExport = () => {
    const cleanMarkdown = (md) => {
      return (md || '')
        .replace(/:::(chart|improvement)\s*\{[\s\S]*?\}\s*:::/g, '[グラフ/提案データ]') // :::ブロック除去
        .replace(/\*\*(.*?)\*\*/g, '$1')  // 太字
        .replace(/\*(.*?)\*/g, '$1')      // 斜体
        .replace(/#{1,6}\s/g, '')         // 見出し
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // リンク
        .replace(/`([^`]+)`/g, '$1')      // インラインコード
        .trim();
    };
    const text = messages.filter(m => m.role !== 'error').map(m => {
      const role = m.role === 'user' ? 'あなた' : 'AI';
      return `[${role}]\n${cleanMarkdown(m.text)}\n`;
    }).join('\n---\n\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-${activeSessionId || 'new'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 検索
  const filteredSessions = searchQuery
    ? sessions.filter(s => (s.title || '').toLowerCase().includes(searchQuery.toLowerCase()) || (s.lastMessage || '').toLowerCase().includes(searchQuery.toLowerCase()))
    : sessions;

  // Freeプラン: ダミーチャット+ロック
  if (isFree) {
    const BusinessPlanLockOverlay = React.lazy(() => import('../components/common/BusinessPlanLockOverlay'));
    return (
      <div className="flex h-full">
        <React.Suspense fallback={null}>
          <BusinessPlanLockOverlay>
            <div className="flex h-[600px] w-full">
              {/* 左パネル */}
              <div className="w-72 shrink-0 border-r border-stroke bg-white dark:border-dark-3 dark:bg-dark-2 flex flex-col">
                <div className="p-4 border-b border-stroke dark:border-dark-3">
                  <div className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white">
                    <Plus className="h-4 w-4" /> 新しいチャット
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {['先月のアクセス減少の原因分析', 'コンバージョン改善の提案', 'SEO対策の優先順位について'].map((t, i) => (
                    <div key={i} className={`rounded-lg px-3 py-2.5 text-sm cursor-pointer ${i === 0 ? 'bg-primary/10 text-primary font-medium' : 'text-body-color hover:bg-gray-50'}`}>
                      <div className="truncate">{t}</div>
                      <div className="text-xs text-body-color mt-0.5">3月{28 - i}日</div>
                    </div>
                  ))}
                </div>
              </div>
              {/* 右パネル */}
              <div className="flex-1 flex flex-col bg-gray-50 dark:bg-dark">
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  <div className="flex justify-end">
                    <div className="max-w-md rounded-2xl bg-primary/10 px-4 py-3 text-sm text-dark dark:text-white">
                      先月のアクセスが減少した原因を教えてください
                    </div>
                  </div>
                  <div className="flex justify-start gap-3">
                    <div className="shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                      <Sparkles className="h-4 w-4 text-white" />
                    </div>
                    <div className="max-w-lg rounded-2xl bg-white px-5 py-4 text-sm text-dark shadow-sm dark:bg-dark-2 dark:text-white leading-relaxed">
                      <p>先月のアクセス減少の主な要因を分析しました。</p>
                      <p className="mt-3 font-semibold">主な原因：</p>
                      <ul className="mt-1 space-y-1 text-body-color">
                        <li>・オーガニック検索の流入が前月比-18%減少</li>
                        <li>・主要キーワード「社員寮 東京」の順位が5位→12位に下落</li>
                        <li>・モバイルからのセッションが-22%と大幅減</li>
                      </ul>
                      <p className="mt-3 font-semibold">推奨アクション：</p>
                      <ul className="mt-1 space-y-1 text-body-color">
                        <li>1. 順位が下がったキーワードのコンテンツを更新</li>
                        <li>2. モバイル表示速度の改善（Core Web Vitals確認）</li>
                        <li>3. 内部リンク構造の見直しでクローラビリティ向上</li>
                      </ul>
                    </div>
                  </div>
                </div>
                <div className="border-t border-stroke p-4 bg-white dark:bg-dark-2 dark:border-dark-3">
                  <div className="flex items-center gap-2 rounded-xl border border-stroke px-4 py-3 dark:border-dark-3">
                    <Paperclip className="h-4 w-4 text-body-color" />
                    <span className="flex-1 text-sm text-body-color">メッセージを入力...</span>
                    <Send className="h-4 w-4 text-body-color" />
                  </div>
                </div>
              </div>
            </div>
          </BusinessPlanLockOverlay>
        </React.Suspense>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-gray-50 dark:bg-dark">
      {/* 左パネル: 会話一覧 */}
      <div className={`${showSidebar ? 'w-72' : 'w-0'} shrink-0 border-r border-stroke dark:border-dark-3 bg-white dark:bg-dark-2 flex flex-col transition-all overflow-hidden`}>
        {/* ヘッダー */}
        <div className="p-4 border-b border-stroke dark:border-dark-3">
          <button onClick={handleNewSession}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/90 transition">
            <Plus className="h-4 w-4" /> 新しい会話
          </button>
        </div>

        {/* 検索 */}
        <div className="px-4 py-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-body-color" />
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="会話を検索..." className="w-full rounded-lg border border-stroke bg-transparent pl-9 pr-3 py-2 text-sm focus:border-primary focus:outline-none dark:border-dark-3 dark:text-white" />
          </div>
        </div>

        {/* 一覧 */}
        <div className="flex-1 overflow-y-auto">
          {filteredSessions.map(s => (
            <div key={s.id} onClick={() => { setActiveSessionId(s.id); setShowSidebar(window.innerWidth >= 768); }}
              className={`group relative px-4 py-3 cursor-pointer border-b border-gray-50 dark:border-dark-3 transition-colors ${activeSessionId === s.id ? 'bg-primary/5 border-l-2 border-l-primary' : 'hover:bg-gray-50 dark:hover:bg-dark-3 border-l-2 border-l-transparent'}`}>
              {editingTitleId === s.id ? (
                <input autoFocus value={editTitleValue} onChange={e => setEditTitleValue(e.target.value)}
                  onBlur={() => handleSaveTitle(s.id)} onKeyDown={e => { if (e.key === 'Enter') handleSaveTitle(s.id); if (e.key === 'Escape') setEditingTitleId(null); }}
                  className="w-full text-sm border border-primary rounded px-1 py-0.5 dark:bg-dark-3 dark:text-white" />
              ) : (
                <div className="text-sm font-medium text-dark dark:text-white truncate">{s.title || '無題の会話'}</div>
              )}
              <div className="flex items-center gap-2 mt-1 text-xs text-body-color">
                <span>{s.turnCount || 0}ターン</span>
                {s.updatedAt && <span>{new Date(s.updatedAt).toLocaleDateString('ja-JP')}</span>}
              </div>
              {/* メニュー */}
              <button onClick={e => { e.stopPropagation(); setSessionMenuId(sessionMenuId === s.id ? null : s.id); }}
                className="absolute right-2 top-3 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-200 dark:hover:bg-dark-3">
                <MoreHorizontal className="h-4 w-4 text-body-color" />
              </button>
              {sessionMenuId === s.id && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setSessionMenuId(null)} />
                  <div className="absolute right-2 top-10 z-20 w-40 rounded-lg border border-stroke bg-white py-1 shadow-lg dark:border-dark-3 dark:bg-dark-2">
                    <button onClick={() => { setEditingTitleId(s.id); setEditTitleValue(s.title || ''); setSessionMenuId(null); }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-xs text-dark hover:bg-gray-50 dark:text-white dark:hover:bg-dark-3">
                      <FileText className="h-3.5 w-3.5" /> タイトル編集
                    </button>
                    <hr className="my-1 border-stroke dark:border-dark-3" />
                    <button onClick={() => handleDeleteSession(s.id)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                      <Trash2 className="h-3.5 w-3.5" /> 削除
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
          {filteredSessions.length === 0 && !isLoading && (
            <div className="p-4 text-center text-sm text-body-color">会話がありません</div>
          )}
        </div>
      </div>

      {/* 右パネル: チャット画面 */}
      <div className="flex-1 flex flex-col min-w-0" onDragOver={e => e.preventDefault()} onDrop={handleDrop}>
        {/* チャットヘッダー */}
        <div className="flex items-center gap-3 border-b border-stroke dark:border-dark-3 bg-white dark:bg-dark-2 px-4 py-3 shrink-0">
          <button onClick={() => setShowSidebar(!showSidebar)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-3 lg:hidden">
            <Menu className="h-5 w-5 text-body-color" />
          </button>
          <button onClick={() => setShowSidebar(!showSidebar)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-3 hidden lg:block">
            {showSidebar ? <ChevronLeft className="h-5 w-5 text-body-color" /> : <Menu className="h-5 w-5 text-body-color" />}
          </button>
          <Sparkles className="h-5 w-5 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-dark dark:text-white truncate">
              AIチャット {selectedSite?.siteName ? `- ${selectedSite.siteName}` : ''}
            </h2>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {messages.length > 0 && (
              <>
                <button onClick={handleExport} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-3" title="テキストエクスポート">
                  <Download className="h-4 w-4 text-body-color" />
                </button>
                {activeSessionId && (
                  <button onClick={() => {
                    if (window.confirm('この会話を終了しますか？\n会話履歴と添付ファイルは残ります。')) {
                      const fn = httpsCallable(functions, 'endChatSession');
                      fn({ siteId: selectedSiteId, sessionId: activeSessionId })
                        .then(() => { toast.success('会話を終了しました'); loadSessions(); })
                        .catch(() => toast.error('操作に失敗しました'));
                    }
                  }} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-3" title="会話を終了">
                    <StopCircle className="h-4 w-4 text-body-color" />
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* メッセージ表示エリア */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          {messages.length === 0 ? (
            /* 新規チャット: サマリー + サジェスト */
            <div className="mx-auto max-w-2xl">
              <div className="mb-8 text-center">
                <Sparkles className="mx-auto mb-4 h-12 w-12 text-primary/30" />
                <h3 className="text-xl font-bold text-dark dark:text-white mb-2">AIに質問する</h3>
                <p className="text-sm text-body-color">{selectedSite?.siteName || 'サイト'}のアクセスデータに基づいて回答します</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {suggestQuestions.map((q, i) => (
                  <button key={i} onClick={() => { setInputText(q); inputRef.current?.focus(); }}
                    className="rounded-lg border border-stroke p-3 text-left text-sm text-dark hover:bg-white dark:border-dark-3 dark:text-white dark:hover:bg-dark-3 transition"
                    style={{ background: 'rgba(255, 255, 255, 0.50)' }}>
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* メッセージ一覧 */
            <div className="mx-auto max-w-3xl space-y-6">
              {messages.map((msg, i) => {
                // 最後のユーザーメッセージかどうか判定
                const isLastUserMsg = msg.role === 'user' && !messages.slice(i + 1).some(m => m.role === 'user');
                return (
                  <ChatMessage key={i} message={msg} onAddImprovement={handleAddImprovement}
                    isLast={isLastUserMsg}
                    onRetry={msg.role === 'error' && i === messages.length - 1 && !isSending ? () => {
                      // エラーメッセージを削除して、直前のユーザーメッセージを再送信
                      const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
                      if (!lastUserMsg) return;
                      setMessages(prev => prev.filter((_, j) => j !== i));
                      setIsSending(true);
                      const fn = httpsCallable(functions, 'aiChat');
                      fn({ siteId: selectedSiteId, sessionId: activeSessionId, message: lastUserMsg.text, attachments: [] })
                        .then(result => {
                          const { message: aiMsg } = result.data;
                          setMessages(prev => [...prev, { role: 'model', text: aiMsg.text, chartData: aiMsg.chartData, improvementData: aiMsg.improvementData, timestamp: new Date().toISOString() }]);
                        })
                        .catch(() => {
                          setMessages(prev => [...prev, { role: 'error', text: '回答の生成に失敗しました。', timestamp: new Date().toISOString() }]);
                        })
                        .finally(() => setIsSending(false));
                    } : null}
                    onEdit={isLastUserMsg && !isSending ? (newText) => {
                      // 最後のユーザーメッセージ以降を削除して、編集テキストで再送信
                      setMessages(prev => prev.slice(0, i));
                      setInputText(newText);
                      // 少し待ってから自動送信
                      setTimeout(() => {
                        setInputText('');
                        // 直接送信処理を呼ぶ
                        const userMsg = { role: 'user', text: newText, attachments: [], timestamp: new Date().toISOString() };
                        setMessages(prev => [...prev, userMsg]);
                        setIsSending(true);
                        const fn = httpsCallable(functions, 'aiChat');
                        fn({ siteId: selectedSiteId, sessionId: activeSessionId, message: newText, attachments: [] })
                          .then(result => {
                            const { message: aiMsg } = result.data;
                            setMessages(prev => [...prev, { role: 'model', text: aiMsg.text, chartData: aiMsg.chartData, improvementData: aiMsg.improvementData, timestamp: new Date().toISOString() }]);
                          })
                          .catch(e => {
                            setMessages(prev => [...prev, { role: 'error', text: '回答の生成に失敗しました。', timestamp: new Date().toISOString() }]);
                          })
                          .finally(() => setIsSending(false));
                      }, 100);
                    } : null}
                  />
                );
              })}
              {isSending && (
                <div className="flex items-center gap-3 text-sm text-body-color">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  AIが回答中...
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* 添付ファイルプレビュー */}
        {attachments.length > 0 && (
          <div className="border-t border-stroke dark:border-dark-3 bg-white dark:bg-dark-2 px-4 py-2">
            <div className="flex gap-2 flex-wrap">
              {attachments.map((f, i) => (
                <div key={i} className="flex items-center gap-1.5 rounded-lg border border-stroke bg-gray-50 px-2.5 py-1.5 text-xs dark:border-dark-3 dark:bg-dark-3">
                  {f.type.startsWith('image/') ? <Image className="h-3.5 w-3.5 text-blue-500" /> : <FileText className="h-3.5 w-3.5 text-body-color" />}
                  <span className="max-w-[120px] truncate text-dark dark:text-white">{f.name}</span>
                  <button onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))}>
                    <X className="h-3 w-3 text-body-color hover:text-red-500" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 入力欄 */}
        <div className="border-t border-stroke dark:border-dark-3 bg-white dark:bg-dark-2 px-4 py-3 shrink-0">
          <div className="mx-auto max-w-3xl">
            {isLimitReached ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-center text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400">
                今月のAIチャット回数に達しました。プランをアップグレードしてください。
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-xl border border-stroke bg-white px-2 py-1.5 shadow-sm dark:border-dark-3 dark:bg-dark-2">
                <button onClick={() => fileInputRef.current?.click()} className="shrink-0 flex h-9 w-9 items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-dark-3" title="ファイル添付">
                  <Paperclip className="h-5 w-5 text-body-color" />
                </button>
                <input ref={fileInputRef} type="file" multiple accept={ALLOWED_EXTENSIONS.map(e => `.${e}`).join(',')} onChange={handleFileSelect} className="hidden" />
                <textarea ref={inputRef} value={inputText} onChange={e => setInputText(e.target.value)} onKeyDown={handleKeyDown} onPaste={handlePaste}
                  placeholder="メッセージを入力... (Enter で送信、Shift+Enter で改行)"
                  rows={1}
                  className="flex-1 resize-none bg-transparent px-2 py-2 text-sm text-dark placeholder:text-body-color/50 focus:outline-none dark:text-white"
                  style={{ height: '36px', maxHeight: '120px' }}
                  onInput={e => { e.target.style.height = '36px'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'; }}
                />
                <button onClick={handleSend} disabled={isSending || (!inputText.trim() && attachments.length === 0)}
                  className="shrink-0 flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-50 transition">
                  {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- チャットメッセージコンポーネント ---
// --- 改善提案カード ---
function ImprovementCard({ data, onAdd }) {
  const [added, setAdded] = useState(false);

  const handleAdd = async () => {
    if (added || !onAdd) return;
    await onAdd(data);
    setAdded(true);
  };

  return (
    <div className="rounded-lg bg-amber-50/50 p-4 dark:bg-amber-900/10 my-3">
      <div className="flex items-center gap-2 mb-2">
        <Lightbulb className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        <span className="text-sm font-semibold text-dark dark:text-white">{data.title}</span>
      </div>
      {data.description && (
        <div className={PROSE_CLASSES + ' mb-3'}>
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={MARKDOWN_COMPONENTS}>{data.description}</ReactMarkdown>
        </div>
      )}
      {onAdd && (
        <button onClick={handleAdd} disabled={added}
          className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-medium text-white shadow-sm transition ${
            added
              ? 'bg-green-500 cursor-default'
              : 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 hover:shadow-md'
          }`}>
          {added ? (
            <><Check className="h-3.5 w-3.5" /> 追加しました</>
          ) : (
            <><Plus className="h-3.5 w-3.5" /> 改善タスクに追加</>
          )}
        </button>
      )}
    </div>
  );
}

function UserAvatar() {
  const { currentUser } = useAuth();
  const photoURL = currentUser?.photoURL;
  const displayName = currentUser?.displayName || currentUser?.email || 'U';

  return (
    <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
      {photoURL ? (
        <img src={photoURL} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
      ) : (
        <span className="text-xs font-bold text-primary">{displayName.charAt(0).toUpperCase()}</span>
      )}
    </div>
  );
}

function ChatMessage({ message, onAddImprovement, onEdit, isLast, onRetry }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState('');

  if (message.role === 'error') {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
        <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm text-red-700 dark:text-red-400">{message.text}</p>
          {onRetry && (
            <button onClick={onRetry} className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/30">
              <RefreshCw className="h-3.5 w-3.5" /> 再試行
            </button>
          )}
        </div>
      </div>
    );
  }

  const isUser = message.role === 'user';

  const handleStartEdit = () => {
    setEditText(message.text);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditText('');
  };

  const handleSubmitEdit = () => {
    if (editText.trim() && onEdit) {
      onEdit(editText.trim());
      setIsEditing(false);
    }
  };

  return (
    <div className={`group flex gap-3 ${isUser ? 'justify-end' : ''}`}>
      {!isUser && (
        <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
      )}
      <div className={`max-w-[85%] ${isUser ? '' : 'space-y-3'}`}>
        {isUser ? (
          isEditing ? (
            /* 編集モード */
            <div className="flex flex-col gap-2">
              <textarea
                autoFocus
                value={editText}
                onChange={e => setEditText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmitEdit(); } if (e.key === 'Escape') handleCancelEdit(); }}
                className="rounded-xl border border-primary bg-white px-4 py-2.5 text-sm text-dark focus:outline-none dark:bg-dark-2 dark:text-white"
                rows={Math.min(editText.split('\n').length + 1, 5)}
              />
              <div className="flex gap-2 justify-end">
                <button onClick={handleCancelEdit} className="rounded-lg px-3 py-1 text-xs text-body-color hover:bg-gray-100 dark:hover:bg-dark-3">キャンセル</button>
                <button onClick={handleSubmitEdit} className="rounded-lg bg-primary px-3 py-1 text-xs text-white hover:bg-primary/90">送信</button>
              </div>
            </div>
          ) : (
            /* 通常表示 */
            <div className="relative">
              <div className="bg-primary text-white rounded-2xl px-4 py-2.5">
                <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                {message.attachments?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {message.attachments.map((a, i) => (
                      <span key={i} className="inline-flex items-center gap-1 rounded bg-white/20 px-2 py-0.5 text-xs">
                        <Paperclip className="h-3 w-3" />{a.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              {/* 編集ボタン（最後のユーザーメッセージのみ） */}
              {isLast && onEdit && (
                <button onClick={handleStartEdit}
                  className="absolute -left-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-gray-200 dark:hover:bg-dark-3"
                  title="編集して再送信">
                  <svg className="h-3.5 w-3.5 text-body-color" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                </button>
              )}
            </div>
          )
        ) : (
          <>
            {/* マークダウン + インライングラフ + 改善提案レンダリング */}
            <MessageContent text={message.text} chartData={message.chartData} onAddImprovement={onAddImprovement} />

            {/* バックエンドで検出された改善提案（フォールバック） */}
            {message.improvementData && !message.text.includes(':::improvement') && (
              <ImprovementCard data={message.improvementData} onAdd={onAddImprovement} />
            )}
          </>
        )}
      </div>
      {isUser && (
        <UserAvatar />
      )}
    </div>
  );
}

// --- グラフコンポーネント ---
// --- 拡大モーダル ---
function ExpandModal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-5xl max-h-[90vh] overflow-auto rounded-xl bg-white p-6 shadow-2xl dark:bg-dark-2" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          {title && <h3 className="text-lg font-bold text-dark dark:text-white">{title}</h3>}
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-3">
            <X className="h-5 w-5 text-body-color" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// --- 拡大可能なテーブル（コピー機能付き） ---
function ExpandableTable({ children }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const tableRef = useRef(null);

  const handleCopy = async () => {
    if (!tableRef.current) return;
    // テーブルHTMLからタブ区切りテキストを生成（Excel/スプレッドシート貼り付け対応）
    const rows = tableRef.current.querySelectorAll('tr');
    const text = Array.from(rows).map(row => {
      const cells = row.querySelectorAll('th, td');
      return Array.from(cells).map(c => c.textContent.trim()).join('\t');
    }).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('テーブルをコピーしました');
      setTimeout(() => setCopied(false), 2000);
    } catch { toast.error('コピーに失敗しました'); }
  };

  const tableContent = (
    <table ref={tableRef} style={{ borderCollapse: 'collapse', width: '100%', fontSize: '14px' }}>{children}</table>
  );

  const actionButtons = (
    <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
      <button onClick={handleCopy}
        className="rounded-md bg-white/90 p-1.5 shadow-sm border border-stroke hover:bg-gray-50 dark:bg-dark-2/90 dark:border-dark-3"
        title="テーブルをコピー">
        {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5 text-body-color" />}
      </button>
      <button onClick={() => setExpanded(true)}
        className="rounded-md bg-white/90 p-1.5 shadow-sm border border-stroke hover:bg-gray-50 dark:bg-dark-2/90 dark:border-dark-3"
        title="拡大表示">
        <Maximize2 className="h-3.5 w-3.5 text-body-color" />
      </button>
    </div>
  );

  return (
    <>
      <div className="group relative my-3 rounded-lg border border-stroke dark:border-dark-3" style={{ overflowX: 'auto' }}>
        {tableContent}
        {actionButtons}
      </div>
      <ExpandModal isOpen={expanded} onClose={() => setExpanded(false)} title="テーブル">
        <div className="flex justify-end mb-3">
          <button onClick={handleCopy}
            className="inline-flex items-center gap-1.5 rounded-md border border-stroke px-3 py-1.5 text-xs font-medium text-dark hover:bg-gray-50 dark:border-dark-3 dark:text-white">
            {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'コピーしました' : 'テーブルをコピー'}
          </button>
        </div>
        <div style={{ overflowX: 'auto' }}>{tableContent}</div>
      </ExpandModal>
    </>
  );
}

// --- グラフコンポーネント（拡大+コピー対応） ---
function ChatChart({ data }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  if (!data?.type || !data?.data) return null;

  // グラフデータをタブ区切りテキストとしてコピー
  const handleCopyData = async () => {
    const headers = [data.xKey || 'name', ...(data.yKeys || ['value'])];
    const rows = data.data.map(row => headers.map(h => row[h] ?? '').join('\t'));
    const text = headers.join('\t') + '\n' + rows.join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('グラフデータをコピーしました');
      setTimeout(() => setCopied(false), 2000);
    } catch { toast.error('コピーに失敗しました'); }
  };

  const renderChart = (height) => (
    <ResponsiveContainer width="100%" height={height}>
        {data.type === 'line' ? (
          <LineChart data={data.data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={data.xKey || 'name'} tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            {(data.yKeys || ['value']).map((key, i) => (
              <Line key={key} type="monotone" dataKey={key} stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2} />
            ))}
          </LineChart>
        ) : data.type === 'bar' ? (
          <BarChart data={data.data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={data.xKey || 'name'} tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            {(data.yKeys || ['value']).map((key, i) => (
              <Bar key={key} dataKey={key} fill={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </BarChart>
        ) : data.type === 'pie' ? (
          <PieChart>
            <Pie data={data.data} dataKey={data.yKeys?.[0] || 'value'} nameKey={data.xKey || 'name'} cx="50%" cy="50%" outerRadius={80}>
              {data.data.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        ) : null}
    </ResponsiveContainer>
  );

  return (
    <>
      <div className="group relative rounded-lg border border-stroke p-4 dark:border-dark-3 my-3">
        {data.title && <div className="mb-3 text-sm font-semibold text-dark dark:text-white">{data.title}</div>}
        {renderChart(250)}
        <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
          <button onClick={handleCopyData}
            className="rounded-md bg-white/90 p-1.5 shadow-sm border border-stroke hover:bg-gray-50 dark:bg-dark-2/90 dark:border-dark-3"
            title="データをコピー">
            {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5 text-body-color" />}
          </button>
          <button onClick={() => setExpanded(true)}
            className="rounded-md bg-white/90 p-1.5 shadow-sm border border-stroke hover:bg-gray-50 dark:bg-dark-2/90 dark:border-dark-3"
            title="拡大表示">
            <Maximize2 className="h-3.5 w-3.5 text-body-color" />
          </button>
        </div>
      </div>
      <ExpandModal isOpen={expanded} onClose={() => setExpanded(false)} title={data.title || 'グラフ'}>
        <div className="flex justify-end mb-3">
          <button onClick={handleCopyData}
            className="inline-flex items-center gap-1.5 rounded-md border border-stroke px-3 py-1.5 text-xs font-medium text-dark hover:bg-gray-50 dark:border-dark-3 dark:text-white">
            {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'コピーしました' : 'データをコピー'}
          </button>
        </div>
        {renderChart(450)}
      </ExpandModal>
    </>
  );
}

// --- メッセージコンテンツ（マークダウン + インライングラフ） ---
/**
 * マークダウンテーブルが壊れている場合の修復処理
 * - パイプ区切りテーブルはそのまま通す
 * - スペース区切りの表っぽい行をパイプテーブルに変換
 */
function preprocessMarkdownTables(text) {
  // 行単位で処理（パイプテーブルはそのまま通し、スペース区切りは変換）
  const lines = text.split('\n');
  const result = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();

    // 空行やマークダウン記号で始まる行はスキップ
    if (!line || line.startsWith('#') || line.startsWith('-') || line.startsWith('*') || line.startsWith('>') || line.startsWith('|') || line.startsWith(':::')) {
      result.push(lines[i]);
      i++;
      continue;
    }

    // 2つ以上の連続スペース（またはタブ）で区切られたカラムが3つ以上ある行
    const columns = line.split(/[\t]|\s{2,}/).filter(Boolean);
    if (columns.length >= 3 && columns.length <= 8) {
      let tableLines = [columns];
      let j = i + 1;
      while (j < lines.length) {
        const nextLine = lines[j].trim();
        if (!nextLine) break;
        const nextCols = nextLine.split(/[\t]|\s{2,}/).filter(Boolean);
        if (nextCols.length >= 2 && Math.abs(nextCols.length - columns.length) <= 1) {
          while (nextCols.length < columns.length) nextCols.push('');
          tableLines.push(nextCols.slice(0, columns.length));
          j++;
        } else {
          break;
        }
      }

      // 3行以上連続でテーブルと判定
      if (tableLines.length >= 3) {
        result.push('| ' + tableLines[0].join(' | ') + ' |');
        result.push('| ' + tableLines[0].map(() => '---').join(' | ') + ' |');
        for (let k = 1; k < tableLines.length; k++) {
          result.push('| ' + tableLines[k].join(' | ') + ' |');
        }
        i = j;
        continue;
      }
    }

    result.push(lines[i]);
    i++;
  }

  return result.join('\n');
}

function MessageContent({ text, chartData, onAddImprovement }) {
  // テーブル前処理を無効化してデバッグ（テキストをそのまま渡す）
  const processedText = text;

  // :::chart ... ::: と :::improvement ... ::: ブロックを分割してレンダリング
  const parts = [];
  const blockRegex = /:::(chart|improvement)\s*(\{[\s\S]*?\})\s*:::/g;
  let lastIndex = 0;
  let match;

  while ((match = blockRegex.exec(processedText)) !== null) {
    if (match.index > lastIndex) {
      const before = processedText.substring(lastIndex, match.index).trim();
      if (before) parts.push({ type: 'text', content: before });
    }
    try {
      const json = JSON.parse(match[2]);
      parts.push({ type: match[1], content: json });
    } catch {
      parts.push({ type: 'text', content: match[0] });
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < processedText.length) {
    const remaining = processedText.substring(lastIndex).trim();
    if (remaining) parts.push({ type: 'text', content: remaining });
  }

  // partsが空の場合
  if (parts.length === 0) {
    parts.push({ type: 'text', content: processedText });
  }

  // 別途バックエンドで検出されたchartDataがある場合
  if (chartData && !parts.some(p => p.type === 'chart')) {
    parts.push({ type: 'chart', content: chartData });
  }

  return (
    <div className="space-y-3">
      {parts.map((part, i) => {
        if (part.type === 'chart') {
          return <ChatChart key={i} data={part.content} />;
        }
        if (part.type === 'improvement') {
          return <ImprovementCard key={i} data={part.content} onAdd={onAddImprovement} />;
        }
        if (!part.content) return null;
        return (
          <div key={i} className={PROSE_CLASSES}>
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={MARKDOWN_COMPONENTS}>{part.content}</ReactMarkdown>
          </div>
        );
      })}
    </div>
  );
}
