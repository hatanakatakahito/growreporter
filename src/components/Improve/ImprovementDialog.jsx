import React, { useState, useEffect, useRef, useMemo } from 'react';
import { RefreshCw, Sparkles, ChevronDown, ChevronRight, X, Loader2, AlertCircle, Mail, Pencil, Lightbulb, Check, Plus, Image as ImageIcon, Link as LinkIcon } from 'lucide-react';
import { db, functions, storage } from '../../config/firebase';
import { httpsCallable } from 'firebase/functions';
import { collection, addDoc, updateDoc, doc, deleteDoc, query, where, getDocs } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { Dialog, DialogTitle, DialogBody, DialogActions } from '../ui/dialog';
import { Button } from '../ui/button';
import DotWaveSpinner from '../common/DotWaveSpinner';
import toast from 'react-hot-toast';

const TARGET_TYPES = [
  { value: 'existing_single', label: '既存ページ', desc: '特定の URL 1 つ' },
  { value: 'existing_template', label: '同テンプレ複数ページ', desc: '商品詳細・事例詳細など' },
  { value: 'new_page', label: '新規ページ', desc: '新しく作りたいページ' },
];

const SECTION_PRESETS = [
  { value: 'header', label: 'ヘッダー' },
  { value: 'first_view', label: 'ファーストビュー' },
  { value: 'body', label: '本文' },
  { value: 'cta', label: 'CTA' },
  { value: 'form', label: 'フォーム' },
  { value: 'faq', label: 'FAQ' },
  { value: 'footer', label: 'フッター' },
  { value: 'other', label: 'その他...' },
];

const INTENT_EXAMPLES = [
  '例: お問い合わせフォームの項目が多すぎるので減らしたい',
  '例: ダウンロードボタンを目立たせたい',
  '例: FAQ がわかりにくいので整理してほしい',
  '例: ファーストビューで何のサービスかすぐわかるようにしたい',
];

const MAX_REF_URLS = 3;
const MAX_REF_IMAGES = 3;
const MAX_IMAGE_SIZE_MB = 5;

// 丸数字 → 算用数字マップ
const CIRCLED_NUM_MAP = { '①':1,'②':2,'③':3,'④':4,'⑤':5,'⑥':6,'⑦':7,'⑧':8,'⑨':9,'⑩':10 };

function parseProposals(text) {
  if (!text || typeof text !== 'string') return null;
  const re = /([①②③④⑤⑥⑦⑧⑨⑩])\s*([\s\S]*?)(?=[①②③④⑤⑥⑦⑧⑨⑩]|$)/g;
  const items = [];
  let m;
  while ((m = re.exec(text)) !== null) {
    const num = CIRCLED_NUM_MAP[m[1]];
    const body = (m[2] || '').trim();
    if (!body) continue;
    const nlIdx = body.indexOf('\n');
    const fullColonIdx = body.indexOf('：');
    const halfColonIdx = body.indexOf(':');
    const candidates = [nlIdx, fullColonIdx, halfColonIdx].filter(i => i >= 0);
    let splitIdx = candidates.length ? Math.min(...candidates) : -1;
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
  if (result.solution) {
    const proposals = parseProposals(result.solution);
    if (proposals) result.proposals = proposals;
  }
  return result;
}

// 想定工数から目安料金（税別）を返す（既存ロジックと同等の簡易版）
function formatEstimatedPriceLabel(hours) {
  if (hours == null || Number.isNaN(Number(hours))) return '—';
  const h = Number(hours);
  const total = Math.round(h * 8000);  // 時給 8000 円目安（GrowReporter 相当）
  return `${total.toLocaleString()}円〜`;
}

function formatEstimatedDeliveryLabel(hours) {
  if (hours == null || Number.isNaN(Number(hours))) return '—';
  const h = Number(hours);
  if (h <= 1) return '1営業日〜';
  if (h <= 4) return '2営業日〜';
  if (h <= 8) return '3営業日〜';
  if (h <= 16) return '5営業日〜';
  if (h <= 40) return '10営業日〜';
  return '20営業日〜';
}

function emptyAiInput() {
  return {
    targetType: 'existing_single',
    targetPageUrl: '',
    userIntent: '',
    targetSection: null,
    targetSectionDetail: '',
    referenceUrls: [''],
    referenceImageUrls: [],
  };
}

function emptyManualForm() {
  return {
    title: '',
    description: '',
    expectedImpact: '',
    targetPageUrl: '',
    targetArea: '',
    category: '',
    priority: '',
    estimatedLaborHours: '',
  };
}

// 相対パス・URL を絶対 URL に正規化（既存 generateImprovements の buildTargetPageUrl と同等）
function normalizeTargetPageUrl(pathOrUrl, siteUrl) {
  const v = (pathOrUrl || '').trim();
  if (!v || v === '/') return '';
  if (v.startsWith('http://') || v.startsWith('https://')) return v;
  if (!siteUrl) return v; // siteUrl が無ければそのまま
  const base = siteUrl.replace(/\/+$/, '');
  const path = v.startsWith('/') ? v : `/${v}`;
  return `${base}${path}`;
}

export default function ImprovementDialog({ isOpen, onClose, siteId, siteUrl, editingItem, onDeleted, onCreated, onRequestConsultation }) {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const isEditMode = !!editingItem?.id;

  // モード: 'ai_assist' | 'manual'
  const [mode, setMode] = useState('ai_assist');
  // フェーズ: 'input' | 'expanding' | 'preview' | 'manual'
  const [phase, setPhase] = useState('input');

  // AI 補完モード入力
  const [aiInput, setAiInput] = useState(emptyAiInput);
  // 補完中
  const [isExpanding, setIsExpanding] = useState(false);
  const abortRef = useRef(null);
  const [expandError, setExpandError] = useState(null);
  // 補完結果（編集可能なフォームへ）
  const [previewForm, setPreviewForm] = useState(emptyManualForm);
  const [similarityWarning, setSimilarityWarning] = useState(null);
  // プレビュー: 整形ビュー or 編集（テキストエリア）
  const [previewEditMode, setPreviewEditMode] = useState(false);

  // 純手動モードフォーム
  const [formData, setFormData] = useState(emptyManualForm);

  // 連続投入履歴
  const [recentlyAdded, setRecentlyAdded] = useState([]);

  // 詳細オプション展開
  const [showAdvanced, setShowAdvanced] = useState(false);

  // ページサジェスト（pageScrapingData）
  const [pageSuggestions, setPageSuggestions] = useState([]);
  const [showUrlSuggest, setShowUrlSuggest] = useState(false);
  const urlInputRef = useRef(null);

  // 保存中
  const [isSaving, setIsSaving] = useState(false);
  const [isFetchingScreenshot, setIsFetchingScreenshot] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // 例文プレースホルダ（毎回ランダム）
  const intentPlaceholder = useMemo(() => {
    return INTENT_EXAMPLES.join('\n');
  }, []);

  // ==================== 初期化・編集モード ====================

  useEffect(() => {
    if (!isOpen) return;
    if (isEditMode) {
      // 編集モード: 強制純手動
      setMode('manual');
      setPhase('manual');
      setFormData({
        title: editingItem.title || '',
        description: editingItem.description || '',
        expectedImpact: editingItem.expectedImpact || '',
        targetPageUrl: (editingItem.targetPageUrl || '').trim(),
        targetArea: editingItem.targetArea || '',
        category: editingItem.category || '',
        priority: editingItem.priority || '',
        estimatedLaborHours: editingItem.estimatedLaborHours != null && editingItem.estimatedLaborHours !== ''
          ? String(editingItem.estimatedLaborHours)
          : '',
      });
    } else {
      // 新規追加モード
      setMode('ai_assist');
      setPhase('input');
      setRecentlyAdded([]);
      // localStorage 下書き復元（recentlyAdded はセッション限定なので復元しない）
      const draftKey = `improveDraft.${siteId}`;
      try {
        const raw = localStorage.getItem(draftKey);
        if (raw) {
          const draft = JSON.parse(raw);
          if (draft?.aiInput) setAiInput(draft.aiInput);
          if (draft?.aiInput?.userIntent) {
            toast.success('前回の下書きを復元しました', { duration: 2500 });
          }
        }
      } catch (_) {
        // ignore
      }
    }
  }, [isOpen, editingItem, siteId, isEditMode]);

  // 下書き自動保存（AI 補完入力中、debounce）
  // recentlyAdded はセッション限定なので保存しない（次回開時にクリーン）
  useEffect(() => {
    if (!isOpen || isEditMode || mode !== 'ai_assist') return;
    const draftKey = `improveDraft.${siteId}`;
    const t = setTimeout(() => {
      try {
        const hasContent = aiInput.userIntent?.trim() || aiInput.targetPageUrl?.trim();
        if (hasContent) {
          localStorage.setItem(draftKey, JSON.stringify({ aiInput }));
        } else {
          localStorage.removeItem(draftKey);
        }
      } catch (_) {
        // ignore
      }
    }, 500);
    return () => clearTimeout(t);
  }, [aiInput, isOpen, siteId, isEditMode, mode]);

  // ページサジェスト fetch
  useEffect(() => {
    if (!isOpen || !siteId || mode !== 'ai_assist') return;
    (async () => {
      try {
        const snap = await getDocs(collection(db, 'sites', siteId, 'pageScrapingData'));
        const list = [];
        snap.forEach(d => {
          const data = d.data();
          if (data.pageUrl) {
            list.push({
              url: data.pageUrl,
              metaTitle: data.metaTitle || '',
              pageViews: typeof data.pageViews === 'number' ? data.pageViews : 0,
            });
          }
        });
        list.sort((a, b) => b.pageViews - a.pageViews);
        setPageSuggestions(list);
      } catch (e) {
        console.warn('[ImprovementDialog] pageSuggestions fetch failed:', e.message);
      }
    })();
  }, [isOpen, siteId, mode]);

  // ==================== AI 補完実行 ====================

  const handleExpand = async () => {
    if (!aiInput.userIntent?.trim()) {
      toast.error('改善方向を入力してください');
      return;
    }
    if (aiInput.targetType !== 'new_page' && !aiInput.targetPageUrl?.trim()) {
      toast.error('対象ページの URL を入力してください');
      return;
    }

    setIsExpanding(true);
    setExpandError(null);
    setPhase('expanding');
    abortRef.current = new AbortController();

    try {
      const expandFn = httpsCallable(functions, 'expandManualImprovement');
      // AbortController と httpsCallable の連携: タイマーで監視（httpsCallable は signal 未対応）
      const cancelPromise = new Promise((_, reject) => {
        abortRef.current.signal.addEventListener('abort', () => {
          reject(new Error('CANCELED'));
        });
      });
      // URL を正規化してから送信（captureFullSnapshot は絶対 URL 必須）
      const normalizedTargetUrl = aiInput.targetType === 'new_page'
        ? null
        : normalizeTargetPageUrl(aiInput.targetPageUrl, siteUrl);
      const normalizedRefUrls = aiInput.referenceUrls
        .map(u => (u || '').trim())
        .filter(u => u && /^https?:\/\//i.test(u));
      const callPromise = expandFn({
        siteId,
        targetType: aiInput.targetType,
        targetPageUrl: normalizedTargetUrl,
        userIntent: aiInput.userIntent.trim(),
        targetSection: aiInput.targetSection,
        targetSectionDetail: aiInput.targetSection === 'other' ? aiInput.targetSectionDetail : null,
        referenceUrls: normalizedRefUrls,
        referenceImageUrls: aiInput.referenceImageUrls,
      });
      const result = await Promise.race([callPromise, cancelPromise]);
      const data = result?.data;
      if (!data || !data.title) {
        throw new Error('AI 補完の結果が空でした');
      }

      // プレビューフォームに展開
      setPreviewForm({
        title: data.title || '',
        description: data.description || '',
        expectedImpact: data.expectedImpact || '',
        targetPageUrl: aiInput.targetType === 'new_page' ? '' : (aiInput.targetPageUrl || '').trim(),
        targetArea: data.targetArea || '',
        category: data.category || '',
        priority: data.priority || '',
        estimatedLaborHours: data.estimatedLaborHours != null ? String(data.estimatedLaborHours) : '',
      });
      setSimilarityWarning(Array.isArray(data.similarityWarning) ? data.similarityWarning : null);
      setPreviewEditMode(false);
      setPhase('preview');
    } catch (err) {
      if (err.message === 'CANCELED') {
        // ユーザーキャンセル: 入力フェーズへ戻す
        setPhase('input');
        return;
      }
      console.error('[ImprovementDialog] AI 補完エラー:', err);
      setExpandError(err.message || 'AI 補完に失敗しました');
      // 純手動モードへ自動切替（入力テキストは維持して formData に流し込み）
      setFormData({
        ...emptyManualForm(),
        title: '',
        description: aiInput.userIntent || '',
        targetPageUrl: aiInput.targetType === 'new_page' ? '' : (aiInput.targetPageUrl || '').trim(),
        targetArea: aiInput.targetSection === 'other' ? (aiInput.targetSectionDetail || '') : '',
      });
      setMode('manual');
      setPhase('manual');
      toast.error('AI 補完に失敗しました。手動入力に切り替えました');
    } finally {
      setIsExpanding(false);
      abortRef.current = null;
    }
  };

  const handleCancelExpand = () => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    setPhase('input');
  };

  // ==================== 保存処理（AI 補完結果 / 純手動 共通） ====================

  const saveImprovement = async ({ goToConsultation = false } = {}) => {
    const data = phase === 'preview' ? previewForm : formData;
    if (!data.title?.trim() || !data.description?.trim()) {
      toast.error('タイトルと説明は必須です');
      return null;
    }
    setIsSaving(true);
    try {
      // 重複チェック（新規時のみ）
      if (!isEditMode) {
        const q = query(
          collection(db, 'sites', siteId, 'improvements'),
          where('title', '==', data.title.trim())
        );
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          if (!window.confirm('同じタイトルの改善案が既にあります。それでも保存しますか？')) {
            return null;
          }
        }
      }

      const hoursVal = (data.estimatedLaborHours || '').toString().trim();
      const estimatedLaborHours = (hoursVal !== '' && !Number.isNaN(Number(hoursVal)) && Number(hoursVal) > 0)
        ? Number(hoursVal)
        : null;
      // URL 正規化: 相対パス → 絶対 URL（PSI / captureFullSnapshot は絶対 URL 必須）
      const normalizedUrl = normalizeTargetPageUrl(data.targetPageUrl, siteUrl);
      const improvementData = {
        title: data.title.trim(),
        description: data.description.trim(),
        expectedImpact: (data.expectedImpact || '').trim(),
        targetPageUrl: normalizedUrl,
        targetArea: (data.targetArea || '').trim(),
        category: data.category?.trim() || null,
        priority: data.priority?.trim() || null,
        estimatedLaborHours,
        status: editingItem?.status || 'draft',
        updatedAt: new Date(),
      };

      // AI 補完の場合は targetType / 参考資料も保存
      if (phase === 'preview') {
        improvementData.targetType = aiInput.targetType;
        if (aiInput.referenceImageUrls?.length) {
          improvementData.referenceImageUrls = aiInput.referenceImageUrls;
        }
        const refs = aiInput.referenceUrls.filter(u => u && u.trim());
        if (refs.length > 0) improvementData.referenceUrls = refs;
        improvementData.source = 'manual_ai_assist';
      } else if (!isEditMode) {
        improvementData.source = 'manual';
      }

      let savedId = editingItem?.id;
      if (isEditMode) {
        await updateDoc(doc(db, 'sites', siteId, 'improvements', editingItem.id), improvementData);
      } else {
        improvementData.createdAt = new Date();
        improvementData.createdBy = currentUser.email;
        const docRef = await addDoc(collection(db, 'sites', siteId, 'improvements'), improvementData);
        savedId = docRef.id;
      }

      queryClient.invalidateQueries({ queryKey: ['improvements', siteId] });

      // onCreated コールバック（モックアップ自動生成のため）
      if (!isEditMode && savedId && onCreated) {
        onCreated({ id: savedId, ...improvementData });
      }

      // localStorage 下書きクリア（連投継続のため、入力欄のみクリア）
      if (!isEditMode) {
        const draftKey = `improveDraft.${siteId}`;
        try {
          localStorage.removeItem(draftKey);
        } catch (_) {}
      }

      // 「相談する」へ動線
      if (goToConsultation && onRequestConsultation) {
        onRequestConsultation({ id: savedId, ...improvementData });
        onClose();
        return savedId;
      }

      // 保存成功 → ダイアログを閉じる（連続投入は廃止）
      toast.success(`「${improvementData.title}」を追加しました`, { duration: 2000 });
      onClose();

      return savedId;
    } catch (err) {
      console.error('[ImprovementDialog] 保存エラー:', err);
      toast.error(`保存に失敗しました: ${err.message || '不明なエラー'}`);
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editingItem?.id) return;
    if (!window.confirm('この改善案を削除しますか？')) return;
    try {
      await deleteDoc(doc(db, 'sites', siteId, 'improvements', editingItem.id));
      queryClient.invalidateQueries({ queryKey: ['improvements', siteId] });
      queryClient.invalidateQueries({ queryKey: ['completed-improvements', siteId] });
      onDeleted?.();
      onClose();
    } catch (err) {
      console.error('[ImprovementDialog] 削除エラー:', err);
      toast.error('削除に失敗しました: ' + (err?.message || ''));
    }
  };

  // ==================== 参考画像アップロード ====================

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const remaining = MAX_REF_IMAGES - aiInput.referenceImageUrls.length;
    if (remaining <= 0) {
      toast.error(`参考画像は最大 ${MAX_REF_IMAGES} 枚まで`);
      return;
    }
    const toUpload = files.slice(0, remaining);
    setIsUploadingImage(true);
    const newUrls = [];
    try {
      for (const file of toUpload) {
        if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
          toast.error(`${file.name}: ${MAX_IMAGE_SIZE_MB}MB を超えるためスキップ`);
          continue;
        }
        const tempId = Math.random().toString(36).slice(2);
        const path = `improvement-references/${siteId}/${tempId}/${file.name}`;
        const sref = storageRef(storage, path);
        await uploadBytes(sref, file);
        const url = await getDownloadURL(sref);
        newUrls.push(url);
      }
      setAiInput(prev => ({ ...prev, referenceImageUrls: [...prev.referenceImageUrls, ...newUrls] }));
      if (newUrls.length > 0) toast.success(`${newUrls.length} 枚アップロードしました`);
    } catch (err) {
      console.error('[ImprovementDialog] 画像アップロードエラー:', err);
      toast.error('画像のアップロードに失敗しました');
    } finally {
      setIsUploadingImage(false);
      e.target.value = ''; // 同じファイル再選択可能に
    }
  };

  const removeImage = (url) => {
    setAiInput(prev => ({ ...prev, referenceImageUrls: prev.referenceImageUrls.filter(u => u !== url) }));
  };

  // ==================== URL サジェスト ====================

  const filteredSuggestions = useMemo(() => {
    const q = (aiInput.targetPageUrl || '').toLowerCase().trim();
    if (!q) return pageSuggestions.slice(0, 8);
    return pageSuggestions
      .filter(p => p.url.toLowerCase().includes(q))
      .slice(0, 8);
  }, [pageSuggestions, aiInput.targetPageUrl]);

  // ==================== レンダリング ====================

  const dialogTitle = isEditMode
    ? '改善案を編集'
    : (mode === 'ai_assist' ? '改善案を追加（AI で補完）' : '改善案を追加（手動入力）');

  return (
    <Dialog open={isOpen} onClose={onClose} size="3xl" className="flex max-h-[90vh] flex-col">
      <DialogTitle>
        <div className="flex items-center justify-between gap-3">
          <span>{dialogTitle}</span>
          {!isEditMode && (
            <label className="flex items-center gap-1.5 text-xs text-gray-500 font-normal cursor-pointer">
              <input
                type="checkbox"
                checked={mode === 'manual'}
                onChange={(e) => {
                  setMode(e.target.checked ? 'manual' : 'ai_assist');
                  setPhase(e.target.checked ? 'manual' : 'input');
                }}
                className="rounded"
              />
              AI 補完を使わず手動入力
            </label>
          )}
        </div>
      </DialogTitle>

      <DialogBody className="min-h-0 overflow-y-auto">
        {/* AI 補完: 入力フェーズ */}
        {phase === 'input' && (
          <div className="space-y-5">
            {/* 対象タイプ */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-white mb-2">どこを改善したいですか？</label>
              <div className="grid grid-cols-3 gap-2">
                {TARGET_TYPES.map(t => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setAiInput(prev => ({ ...prev, targetType: t.value, targetPageUrl: t.value === 'new_page' ? '' : prev.targetPageUrl }))}
                    className={`px-3 py-2.5 rounded-lg text-left transition ${
                      aiInput.targetType === t.value
                        ? 'border-2 border-primary bg-primary/5 text-primary'
                        : 'border border-gray-200 dark:border-dark-3 bg-white dark:bg-dark hover:bg-gray-50 dark:hover:bg-dark-3 text-gray-700 dark:text-gray-200'
                    }`}
                  >
                    <div className="text-sm font-semibold">{t.label}</div>
                    <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* URL 入力（既存系のみ） */}
            {aiInput.targetType !== 'new_page' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-white mb-2">対象ページ URL</label>
                <div className="relative">
                  <input
                    ref={urlInputRef}
                    type="text"
                    value={aiInput.targetPageUrl}
                    onChange={(e) => {
                      setAiInput(prev => ({ ...prev, targetPageUrl: e.target.value }));
                      setShowUrlSuggest(true);
                    }}
                    onFocus={() => setShowUrlSuggest(true)}
                    onBlur={() => setTimeout(() => setShowUrlSuggest(false), 200)}
                    placeholder="/document/download-single/"
                    className="w-full rounded-lg border border-gray-300 dark:border-dark-3 bg-white dark:bg-dark px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  />
                  {showUrlSuggest && filteredSuggestions.length > 0 && (
                    <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white dark:bg-dark-2 border border-gray-200 dark:border-dark-3 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                      <div className="px-3 py-1.5 text-[10px] text-gray-400 font-semibold border-b border-gray-100 dark:border-dark-3">PV 順</div>
                      {filteredSuggestions.map((s, i) => (
                        <button
                          key={i}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setAiInput(prev => ({ ...prev, targetPageUrl: s.url }));
                            setShowUrlSuggest(false);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-dark-3"
                        >
                          <div className="text-sm text-gray-900 dark:text-white">{s.url}</div>
                          <div className="text-[11px] text-gray-500 truncate">
                            {s.metaTitle || '(メタタイトルなし)'} · PV {s.pageViews}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 改善方向 */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-white mb-2">
                どう改善したいですか？ <span className="text-red-500">*</span>
              </label>
              <textarea
                value={aiInput.userIntent}
                onChange={(e) => setAiInput(prev => ({ ...prev, userIntent: e.target.value }))}
                rows={4}
                placeholder={intentPlaceholder}
                className="w-full rounded-lg border border-gray-300 dark:border-dark-3 bg-white dark:bg-dark px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none"
              />
              <p className="text-[11px] text-gray-500 mt-1">日常の言葉で OK。専門用語は不要です。</p>
            </div>

            {/* 詳細オプション（折りたたみ） */}
            <details
              className="group rounded-xl border border-gray-200 dark:border-dark-3 overflow-hidden"
              open={showAdvanced}
              onToggle={(e) => setShowAdvanced(e.currentTarget.open)}
            >
              <summary className="cursor-pointer list-none flex items-center justify-between py-3 px-4 bg-gray-50 dark:bg-dark-3 hover:bg-gray-100 dark:hover:bg-dark-4 group-open:border-b group-open:border-gray-200 dark:group-open:border-dark-3">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 inline-flex items-center gap-1.5">
                  <ChevronRight className="w-4 h-4 transition-transform group-open:rotate-90" />
                  詳細オプション
                  <span className="text-[10px] text-gray-400 font-normal">(任意)</span>
                </span>
                <span className="text-[11px] text-gray-500">対象セクション・参考画像・参考URL</span>
              </summary>
              <div className="p-5 bg-white dark:bg-dark-2 space-y-5">
                {/* 対象セクション */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                    対象セクション
                    <span className="text-[10px] text-gray-400 font-normal ml-1">— ページ内の特定箇所だけに絞りたい場合</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {SECTION_PRESETS.map(s => (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => setAiInput(prev => ({ ...prev, targetSection: prev.targetSection === s.value ? null : s.value }))}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                          aiInput.targetSection === s.value
                            ? 'border border-primary bg-primary text-white shadow-sm'
                            : 'border border-gray-200 dark:border-dark-3 bg-white dark:bg-dark text-gray-700 dark:text-gray-300 hover:border-primary hover:bg-primary/5'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                  {aiInput.targetSection === 'other' && (
                    <input
                      type="text"
                      value={aiInput.targetSectionDetail}
                      onChange={(e) => setAiInput(prev => ({ ...prev, targetSectionDetail: e.target.value }))}
                      placeholder="例: フッター上の商品リスト"
                      className="mt-2 w-full rounded-lg border border-gray-200 dark:border-dark-3 bg-white dark:bg-dark px-3 py-2 text-xs"
                    />
                  )}
                </div>

                <div className="border-t border-gray-100 dark:border-dark-3"></div>

                {/* 参考画像 */}
                <div>
                  <label className="block mb-2 flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 inline-flex items-center gap-1">
                      <ImageIcon className="w-4 h-4" />
                      参考画像
                      <span className="text-[10px] text-gray-400 font-normal ml-1">— 言葉で説明しにくい時に / {MAX_IMAGE_SIZE_MB}MB 以下</span>
                    </span>
                    {aiInput.referenceImageUrls.length > 0 && (
                      <span className="text-[11px] font-bold text-green-700 inline-flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        {aiInput.referenceImageUrls.length} / {MAX_REF_IMAGES} 枚 添付済み
                      </span>
                    )}
                  </label>
                  {aiInput.referenceImageUrls.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                      {aiInput.referenceImageUrls.map((url, i) => (
                        <div key={i} className="relative group">
                          <img
                            src={url}
                            alt={`参考画像 ${i + 1}`}
                            className="w-24 h-24 object-cover rounded border-2 border-white shadow-sm"
                            onError={(e) => { e.target.src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22%23ccc%22%3E%3Cpath d=%22M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z%22/%3E%3C/svg%3E'; }}
                          />
                          <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] text-center py-0.5 rounded-b">
                            画像 {i + 1}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeImage(url)}
                            className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 shadow"
                            title="削除"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {aiInput.referenceImageUrls.length < MAX_REF_IMAGES && (
                    <label className={`cursor-pointer block border-2 border-dashed rounded-lg p-3 text-center transition ${isUploadingImage ? 'border-primary bg-primary/5' : 'border-gray-200 dark:border-dark-3 hover:border-primary'}`}>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        capture="environment"
                        onChange={handleImageUpload}
                        className="hidden"
                        disabled={isUploadingImage}
                      />
                      {isUploadingImage ? (
                        <div className="text-xs text-primary font-semibold inline-flex items-center gap-1.5">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          アップロード中…
                        </div>
                      ) : (
                        <div className="text-xs text-gray-500">
                          <ImageIcon className="w-4 h-4 inline mr-1" />
                          {aiInput.referenceImageUrls.length === 0 ? 'クリックまたはドラッグで画像をアップロード' : `あと ${MAX_REF_IMAGES - aiInput.referenceImageUrls.length} 枚追加可能`}
                        </div>
                      )}
                    </label>
                  )}
                </div>

                <div className="border-t border-gray-100 dark:border-dark-3"></div>

                {/* 参考 URL */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2 inline-flex items-center gap-1">
                    <LinkIcon className="w-4 h-4" />
                    参考 URL
                    <span className="text-[10px] text-gray-400 font-normal ml-1">— 他社サイトを参考にしたい時 / 最大 {MAX_REF_URLS} 件</span>
                  </label>
                  <div className="space-y-1.5">
                    {aiInput.referenceUrls.map((url, i) => (
                      <div key={i} className="flex gap-1.5">
                        <input
                          type="url"
                          value={url}
                          onChange={(e) => {
                            const next = [...aiInput.referenceUrls];
                            next[i] = e.target.value;
                            setAiInput(prev => ({ ...prev, referenceUrls: next }));
                          }}
                          placeholder="https://example.com/"
                          className="flex-1 rounded-lg border border-gray-200 dark:border-dark-3 bg-white dark:bg-dark px-3 py-1.5 text-xs"
                        />
                        {aiInput.referenceUrls.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const next = aiInput.referenceUrls.filter((_, idx) => idx !== i);
                              setAiInput(prev => ({ ...prev, referenceUrls: next.length === 0 ? [''] : next }));
                            }}
                            className="text-gray-400 hover:text-red-500 px-1"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  {aiInput.referenceUrls.length < MAX_REF_URLS && (
                    <button
                      type="button"
                      onClick={() => setAiInput(prev => ({ ...prev, referenceUrls: [...prev.referenceUrls, ''] }))}
                      className="mt-1.5 text-xs text-primary hover:underline inline-flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      もう 1 件追加
                    </button>
                  )}
                </div>
              </div>
            </details>
          </div>
        )}

        {/* AI 補完: 補完中フェーズ */}
        {phase === 'expanding' && (
          <div className="py-16 flex flex-col items-center justify-center">
            <DotWaveSpinner size="lg" />
            <h3 className="mt-6 mb-2 text-xl font-semibold text-dark dark:text-white">
              AI が改善案を作成中です
            </h3>
            <p className="text-center text-sm text-gray-600 dark:text-gray-400">
              ページの構造を読み取り、改善内容を組み立てています。<br />
              通常 10〜30 秒かかります。
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancelExpand}
              className="mt-8"
            >
              キャンセル
            </Button>
          </div>
        )}

        {/* AI 補完: プレビュー & 編集フェーズ */}
        {phase === 'preview' && (
          <div className="space-y-4">
            {/* 戻るボタン + 編集切替 + 再補完 */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => { setPhase('input'); setSimilarityWarning(null); setPreviewEditMode(false); }}
                className="text-xs text-gray-500 hover:text-gray-700 inline-flex items-center gap-1"
              >
                ← 入力に戻る
              </button>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setPreviewEditMode(prev => !prev)}
                  className="text-xs text-gray-500 hover:text-gray-700 inline-flex items-center gap-1"
                >
                  <Pencil className="w-3 h-3" />
                  {previewEditMode ? '整形ビューに戻る' : '編集'}
                </button>
                <button
                  type="button"
                  onClick={handleExpand}
                  disabled={isExpanding}
                  className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                >
                  <RefreshCw className={`w-3 h-3 ${isExpanding ? 'animate-spin' : ''}`} />
                  もう一度 AI で作成
                </button>
              </div>
            </div>

            {/* 類似改善警告 */}
            {similarityWarning && similarityWarning.length > 0 && (
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900 dark:text-amber-200 flex-1">
                  <div className="font-semibold mb-1">類似する改善案があります:</div>
                  {similarityWarning.map(w => (
                    <div key={w.id} className="ml-3">・{w.title} <span className="text-gray-500">(類似度 {Math.round(w.score * 100)}%)</span></div>
                  ))}
                </div>
              </div>
            )}

            {/* タイトル（常時編集可能） */}
            <div className="rounded-lg border border-gray-200 dark:border-dark-3 px-4 py-3 bg-white dark:bg-dark">
              <input
                type="text"
                value={previewForm.title}
                onChange={(e) => setPreviewForm(prev => ({ ...prev, title: e.target.value }))}
                className="w-full bg-transparent text-base font-bold text-gray-900 dark:text-white outline-none"
                placeholder="改善案のタイトル"
              />
            </div>

            {previewEditMode ? (
              /* === 編集モード: テキストエリア === */
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-primary mb-1.5">改善内容（テキスト編集）</label>
                  <textarea
                    value={previewForm.description}
                    onChange={(e) => setPreviewForm(prev => ({ ...prev, description: e.target.value }))}
                    rows={14}
                    className="w-full rounded-lg border border-gray-300 dark:border-dark-3 bg-white dark:bg-dark px-3 py-2 text-sm leading-7 font-mono"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">【現状の問題】【提案内容】【なぜ効くか】の構造を保持して編集してください</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-primary mb-1.5">カテゴリ</label>
                    <select
                      value={previewForm.category}
                      onChange={(e) => setPreviewForm(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 dark:border-dark-3 bg-white dark:bg-dark px-3 py-2 text-sm"
                    >
                      <option value="">選択しない</option>
                      <option value="acquisition">集客</option>
                      <option value="content">コンテンツ</option>
                      <option value="design">デザイン</option>
                      <option value="feature">機能</option>
                      <option value="other">その他</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-primary mb-1.5">優先度</label>
                    <select
                      value={previewForm.priority}
                      onChange={(e) => setPreviewForm(prev => ({ ...prev, priority: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 dark:border-dark-3 bg-white dark:bg-dark px-3 py-2 text-sm"
                    >
                      <option value="">選択しない</option>
                      <option value="high">高</option>
                      <option value="medium">中</option>
                      <option value="low">低</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-primary mb-1.5">期待する効果（参考情報）</label>
                  <input
                    type="text"
                    value={previewForm.expectedImpact}
                    onChange={(e) => setPreviewForm(prev => ({ ...prev, expectedImpact: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 dark:border-dark-3 bg-white dark:bg-dark px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-primary mb-1.5">想定工数（時間）</label>
                  <input
                    type="number"
                    min="0.5"
                    max="100"
                    step="0.5"
                    value={previewForm.estimatedLaborHours}
                    onChange={(e) => setPreviewForm(prev => ({ ...prev, estimatedLaborHours: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 dark:border-dark-3 bg-white dark:bg-dark px-3 py-2 text-sm"
                  />
                </div>
              </div>
            ) : (
              /* === 整形ビューモード（ドロワー風） === */
              <div className="space-y-4">
                {(() => {
                  const sections = parseDescriptionSections(previewForm.description);
                  if (sections.legacy !== undefined) {
                    return (
                      <div className="rounded-lg bg-gray-50 dark:bg-dark-3 p-4">
                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-7 whitespace-pre-wrap">{sections.legacy}</p>
                      </div>
                    );
                  }
                  return (
                    <>
                      {/* 現状の問題（アコーディオン、デフォ展開） */}
                      {sections.problem && (
                        <details className="group" open>
                          <summary className="cursor-pointer list-none flex items-center justify-between hover:opacity-80">
                            <div className="text-[13px] font-bold text-primary tracking-wide">現状の問題</div>
                            <ChevronDown className="w-4 h-4 text-gray-400 transition-transform group-open:rotate-180" />
                          </summary>
                          <p className="text-sm text-gray-700 dark:text-gray-300 leading-7 pt-2">{sections.problem}</p>
                        </details>
                      )}

                      {/* 提案内容（カード） */}
                      {sections.solution && (
                        <section>
                          <div className="text-[13px] font-bold text-primary tracking-wide mb-2">提案内容</div>
                          {sections.proposals ? (
                            <ol className="space-y-2.5">
                              {sections.proposals.map((p) => (
                                <li
                                  key={p.num}
                                  className="flex gap-2.5 p-3 rounded-xl bg-gray-50 dark:bg-dark-3/40"
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
                            <p className="text-sm text-gray-700 dark:text-gray-300 leading-7">{sections.solution}</p>
                          )}
                        </section>
                      )}

                      {/* なぜ効くか（アコーディオン、デフォ展開） */}
                      {sections.rationale && (
                        <details className="group" open>
                          <summary className="cursor-pointer list-none flex items-center justify-between hover:opacity-80">
                            <div className="text-[13px] font-bold text-primary tracking-wide">なぜ効くか</div>
                            <ChevronDown className="w-4 h-4 text-gray-400 transition-transform group-open:rotate-180" />
                          </summary>
                          <p className="text-sm text-gray-700 dark:text-gray-300 leading-7 pt-2">{sections.rationale}</p>
                        </details>
                      )}
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* 純手動モード（既存 UI 流用） */}
        {phase === 'manual' && (
          <form id="improvement-form" onSubmit={(e) => { e.preventDefault(); saveImprovement(); }} className="space-y-4">
            {expandError && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-start gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div className="text-xs text-red-900 dark:text-red-200 flex-1">
                  <div className="font-semibold">AI 補完に失敗しました。</div>
                  <div>手動で入力してください。{expandError && `(${expandError})`}</div>
                </div>
                <button
                  type="button"
                  onClick={() => { setExpandError(null); setMode('ai_assist'); setPhase('input'); }}
                  className="text-xs text-red-700 hover:text-red-900 underline shrink-0"
                >
                  AI 補完に戻る
                </button>
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                タイトル <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-dark outline-none focus:border-primary dark:border-dark-3 dark:text-white"
                placeholder="例: トップページのファーストビュー改善"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                説明 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={8}
                className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-dark outline-none focus:border-primary dark:border-dark-3 dark:text-white resize-none"
                placeholder="改善内容の詳細を記述してください"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                対象ページURL <span className="text-body-color font-normal">（任意）</span>
              </label>
              <input
                type="text"
                value={formData.targetPageUrl}
                onChange={(e) => setFormData({ ...formData, targetPageUrl: e.target.value })}
                className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-dark outline-none focus:border-primary dark:border-dark-3 dark:text-white"
                placeholder="例: https://example.com/pricing または /path/"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                対象箇所 <span className="text-body-color font-normal">（任意）</span>
              </label>
              <input
                type="text"
                value={formData.targetArea}
                onChange={(e) => setFormData({ ...formData, targetArea: e.target.value })}
                className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-dark outline-none focus:border-primary dark:border-dark-3 dark:text-white"
                placeholder="例: ヒーロー、CTA、フッター"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                期待効果 <span className="text-body-color font-normal">（任意）</span>
              </label>
              <input
                type="text"
                value={formData.expectedImpact}
                onChange={(e) => setFormData({ ...formData, expectedImpact: e.target.value })}
                className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-dark outline-none focus:border-primary dark:border-dark-3 dark:text-white"
                placeholder="例: CVR 10%向上を期待"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">カテゴリー</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-dark outline-none focus:border-primary dark:border-dark-3 dark:text-white"
                >
                  <option value="">選択しない</option>
                  <option value="acquisition">集客</option>
                  <option value="content">コンテンツ</option>
                  <option value="design">デザイン</option>
                  <option value="feature">機能</option>
                  <option value="other">その他</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">優先度</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-dark outline-none focus:border-primary dark:border-dark-3 dark:text-white"
                >
                  <option value="">選択しない</option>
                  <option value="high">高</option>
                  <option value="medium">中</option>
                  <option value="low">低</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                想定工数（時間） <span className="text-body-color font-normal">（任意）</span>
              </label>
              <input
                type="number"
                min="0.5"
                max="100"
                step="0.5"
                value={formData.estimatedLaborHours}
                onChange={(e) => setFormData({ ...formData, estimatedLaborHours: e.target.value })}
                className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-dark outline-none focus:border-primary dark:border-dark-3 dark:text-white"
                placeholder="例: 2"
              />
            </div>

            {editingItem?.id && formData.targetPageUrl?.trim() && (
              <div>
                <button
                  type="button"
                  onClick={async () => {
                    const url = formData.targetPageUrl.trim();
                    if (!url) return;
                    setIsFetchingScreenshot(true);
                    try {
                      // CF Worker Browser Rendering 経由で PC + Mobile を 1 アクセスで取得
                      const captureBeforeScreenshot = httpsCallable(functions, 'captureBeforeScreenshot');
                      const res = await captureBeforeScreenshot({ siteId, targetPageUrl: url });
                      const updates = { updatedAt: new Date() };
                      if (res?.data?.pc?.screenshotUrl) updates.targetPageScreenshotUrlPc = res.data.pc.screenshotUrl;
                      if (res?.data?.mobile?.screenshotUrl) updates.targetPageScreenshotUrlMobile = res.data.mobile.screenshotUrl;
                      if (Object.keys(updates).length > 1) {
                        await updateDoc(doc(db, 'sites', siteId, 'improvements', editingItem.id), updates);
                        queryClient.invalidateQueries({ queryKey: ['improvements', siteId] });
                      }
                    } catch (e) {
                      console.error('[ImprovementDialog] スクショ取得エラー:', e);
                      toast.error('スクショの取得に失敗しました。');
                    } finally {
                      setIsFetchingScreenshot(false);
                    }
                  }}
                  disabled={isFetchingScreenshot}
                  className="inline-flex items-center gap-2 rounded-lg border border-stroke bg-white px-4 py-2 text-sm font-medium text-dark hover:bg-gray-50 dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:hover:bg-dark-3 disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 ${isFetchingScreenshot ? 'animate-spin' : ''}`} />
                  {isFetchingScreenshot ? '取得中...' : 'スクショを再取得'}
                </button>
              </div>
            )}
          </form>
        )}
      </DialogBody>

      <DialogActions>
        {/* 編集モード: 削除 + キャンセル + 保存 */}
        {isEditMode && (
          <>
            <Button variant="danger-outline" onClick={handleDelete} className="sm:mr-auto">削除</Button>
            <Button variant="ghost" onClick={onClose} disabled={isSaving}>キャンセル</Button>
            <Button variant="primary" type="submit" form="improvement-form" disabled={isSaving}>
              {isSaving ? '保存中...' : '保存'}
            </Button>
          </>
        )}

        {/* AI 補完モード: 入力 → 補完ボタン */}
        {!isEditMode && phase === 'input' && (
          <>
            <Button variant="ghost" onClick={onClose} disabled={isSaving}>キャンセル</Button>
            <Button
              variant="primary"
              onClick={handleExpand}
              disabled={isExpanding || !aiInput.userIntent?.trim() || (aiInput.targetType !== 'new_page' && !aiInput.targetPageUrl?.trim())}
            >
              <Sparkles className="w-4 h-4" />
              AI で改善案を作成 →
            </Button>
          </>
        )}

        {/* AI 補完モード: プレビュー → 見送り・保存 */}
        {!isEditMode && phase === 'preview' && (
          <>
            <Button variant="ghost" onClick={onClose} disabled={isSaving}>見送り</Button>
            <Button variant="primary" onClick={() => saveImprovement()} disabled={isSaving}>
              {isSaving ? '保存中...' : '保存する'}
            </Button>
          </>
        )}

        {/* 純手動モード（新規・エラー時） */}
        {!isEditMode && phase === 'manual' && (
          <>
            <Button variant="ghost" onClick={onClose} disabled={isSaving}>キャンセル</Button>
            <Button variant="primary" type="submit" form="improvement-form" disabled={isSaving}>
              {isSaving ? '保存中...' : '保存'}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
