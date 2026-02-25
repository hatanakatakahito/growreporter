import { httpsCallable } from 'firebase/functions';
import { functions, db } from '../config/firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { fetchComprehensiveDataForImprovement } from './comprehensiveDataFetcher';
import { format, subDays } from 'date-fns';

const JACCARD_THRESHOLD = 0.5;

function normalizeTitle(s) {
  return (s || '').trim().replace(/\s+/g, ' ');
}

function bigramSet(str) {
  const n = normalizeTitle(str);
  const set = new Set();
  for (let i = 0; i < n.length - 1; i++) {
    set.add(n.slice(i, i + 2));
  }
  return set;
}

function jaccardSimilarity(a, b) {
  const sa = bigramSet(a);
  const sb = bigramSet(b);
  if (sa.size === 0 && sb.size === 0) return 1;
  let intersection = 0;
  for (const x of sa) {
    if (sb.has(x)) intersection++;
  }
  const union = sa.size + sb.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * タイトルまたは説明文から対象ページパス（例: /contacts/）を抽出
 * @param {string} title
 * @param {string} description
 * @returns {string|null} 抽出したパス（見つからなければ null）
 */
function extractPathFromTitleOrDescription(title, description) {
  const text = [title, description].filter(Boolean).join(' ');
  if (!text || typeof text !== 'string') return null;
  // 括弧内のパス: (/path/) または （/path/）
  const parenMatch = text.match(/[（(](\/[^）)]*\/?)[）)]/);
  if (parenMatch && parenMatch[1]) {
    const p = parenMatch[1].trim();
    return p || '/';
  }
  // スラッシュで始まるパス: /path/ または /path
  const pathMatch = text.match(/(\/[a-zA-Z0-9/_.-]+)/);
  if (pathMatch && pathMatch[1]) return pathMatch[1];
  return null;
}

/**
 * AI改善案を生成して改善案一覧に追加する
 * @param {string} siteId - サイトID
 * @param {string} currentUserEmail - 現在のユーザーのメールアドレス
 * @param {function} onStatusChange - ステータス変更時のコールバック
 * @param {{ improvementFocus?: string, forceRegenerate?: boolean }} [options] - improvementFocus: 'balance'|'acquisition'|'conversion'|'branding'|'usability', forceRegenerate: キャッシュを無視
 * @returns {Promise<{success: boolean, count: number, error?: string}>} 処理結果
 */
export async function generateAndAddImprovements(siteId, currentUserEmail, onStatusChange, options = {}) {
  // ローディング状態を通知
  if (onStatusChange) {
    onStatusChange('loading');
  }
  
  try {
    // 直近30日の期間を計算
    const today = new Date();
    const thirtyDaysAgo = subDays(today, 30);
    const startDate = format(thirtyDaysAgo, 'yyyy-MM-dd');
    const endDate = format(today, 'yyyy-MM-dd');

    console.log('[generateAndAddImprovements] AI改善案生成開始:', { siteId, startDate, endDate });

    // Step 1: 既存の改善案を取得（draft + in_progress のみ）
    const existingSnap = await getDocs(collection(db, 'sites', siteId, 'improvements'));
    const existingImprovements = existingSnap.docs
      .filter(d => {
        const status = d.data().status;
        return status === 'draft' || status === 'in_progress';
      })
      .map(d => ({
        title: d.data().title || '',
        description: d.data().description || '',
      }));
    
    console.log('[generateAndAddImprovements] 既存の改善案（draft/in_progress）:', existingImprovements.length, '件');

    // Step 2: データ取得（365日分のデータ、直近30日重点）
    const comprehensiveData = await fetchComprehensiveDataForImprovement(siteId);
    console.log('[generateAndAddImprovements] データ取得完了');

    // Step 3: AI生成（既存改善案を含める）
    const generateAISummary = httpsCallable(functions, 'generateAISummary');
    const improvementFocus = options.improvementFocus || 'balance';
    const result = await generateAISummary({
      siteId,
      pageType: 'comprehensive_improvement',
      startDate,
      endDate,
      metrics: comprehensiveData,
      forceRegenerate: true,
      improvementFocus,
      existingImprovements,
    });

    console.log('[generateAndAddImprovements] AI生成完了:', result.data);

    const recommendations = result.data.recommendations || [];
    
    if (recommendations.length === 0) {
      console.warn('[generateAndAddImprovements] 推奨施策が0件です');
      if (onStatusChange) {
        onStatusChange('error', 0, '推奨施策が見つかりませんでした');
      }
      return { success: false, count: 0, error: '推奨施策が見つかりませんでした' };
    }

    // Step 2.5: 重複抑制（既存＋同一バッチ内）
    // 完了済みの改善案は除外（同じ提案でも再度取り組む価値があるため）
    const existingSnapForDedup = await getDocs(collection(db, 'sites', siteId, 'improvements'));
    const existingTitles = existingSnapForDedup.docs
      .filter(d => d.data().status !== 'completed')
      .map(d => normalizeTitle(d.data().title || ''));
    const existingDedupKeys = new Set(
      existingSnapForDedup.docs
        .filter(d => d.data().status !== 'completed')
        .map(d => (d.data().dedupKey || '').trim().toLowerCase())
        .filter(Boolean)
    );

    console.log('[generateAndAddImprovements] 既存の改善案:', existingTitles.length, '件');
    console.log('[generateAndAddImprovements] 既存のdedupKey:', Array.from(existingDedupKeys));
    console.log('[generateAndAddImprovements] 新規提案:', recommendations.length, '件');

    let filtered = [];
    const seenDedupKeys = new Set();
    for (const rec of recommendations) {
      const title = normalizeTitle(rec.title);
      const dedupKey = (rec.dedupKey || '').trim().toLowerCase();
      
      console.log('[generateAndAddImprovements] チェック中:', title, 'dedupKey:', dedupKey);
      
      if (dedupKey && existingDedupKeys.has(dedupKey)) {
        console.log('  → 既存のdedupKeyと重複のためスキップ');
        continue;
      }
      if (dedupKey && seenDedupKeys.has(dedupKey)) {
        console.log('  → 同一バッチ内のdedupKeyと重複のためスキップ');
        continue;
      }
      let tooSimilar = false;
      for (const existing of existingTitles) {
        const similarity = jaccardSimilarity(title, existing);
        if (similarity >= JACCARD_THRESHOLD) {
          console.log('  → 既存タイトルと類似度', similarity.toFixed(2), 'でスキップ:', existing);
          tooSimilar = true;
          break;
        }
      }
      if (tooSimilar) continue;
      
      for (const other of filtered) {
        const similarity = jaccardSimilarity(title, normalizeTitle(other.title));
        if (similarity >= JACCARD_THRESHOLD) {
          console.log('  → バッチ内タイトルと類似度', similarity.toFixed(2), 'でスキップ:', other.title);
          tooSimilar = true;
          break;
        }
      }
      if (tooSimilar) continue;
      
      console.log('  → 追加OK');
      if (dedupKey) seenDedupKeys.add(dedupKey);
      filtered.push(rec);
    }
    const toAdd = filtered;
    if (toAdd.length === 0) {
      console.warn('[generateAndAddImprovements] 重複のため追加する案が0件です');
      if (onStatusChange) {
        onStatusChange('success', 0);
      }
      return { success: true, count: 0 };
    }
    console.log('[generateAndAddImprovements] 重複除外後:', toAdd.length, '件');

    // Step 3: サイトURLを取得（対象ページのフルURL組み立て用）
    let siteUrl = '';
    try {
      const siteSnap = await getDoc(doc(db, 'sites', siteId));
      if (siteSnap.exists()) {
        siteUrl = (siteSnap.data().siteUrl || '').trim().replace(/\/+$/, '');
      }
    } catch (e) {
      console.warn('[generateAndAddImprovements] サイトURL取得スキップ:', e?.message);
    }

    // Step 4: 重複除外後の件数を Firestore に追加
    console.log('[generateAndAddImprovements] Firestoreに追加開始:', toAdd.length, '件');
    
    const buildTargetPageUrl = (pathOrUrl) => {
      if (!pathOrUrl || pathOrUrl === '/') return '';
      if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) return pathOrUrl;
      if (!siteUrl) return '';
      const path = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
      return `${siteUrl}${path}`;
    };

    const categoryMap = {
      content: 'content', コンテンツ: 'content', コンテント: 'content',
      design: 'design', デザイン: 'design',
      acquisition: 'acquisition', 集客: 'acquisition',
      feature: 'feature', 機能: 'feature',
      technical: 'other', 技術: 'other',
      other: 'other', その他: 'other',
    };
    const priorityMap = {
      high: 'high', 高: 'high',
      medium: 'medium', 中: 'medium',
      low: 'low', 低: 'low',
    };
    const normalizeCategory = (v) => {
      if (!v || typeof v !== 'string') return null;
      const key = v.trim().toLowerCase();
      return categoryMap[key] ?? (/^(content|design|acquisition|feature|other)$/.test(key) ? key : 'other');
    };
    const normalizePriority = (v) => {
      if (!v || typeof v !== 'string') return 'medium';
      const key = v.trim().toLowerCase();
      return priorityMap[key] || (priorityMap[key] === undefined && /^(high|medium|low)$/.test(key) ? key : 'medium');
    };

    const promises = toAdd.map(suggestion => {
      let targetPagePath = (suggestion.targetPagePath || suggestion.targetPageUrl || '').trim();
      if (!targetPagePath) {
        const extracted = extractPathFromTitleOrDescription(suggestion.title, suggestion.description);
        if (extracted && extracted !== '/') targetPagePath = extracted;
      }
      const targetPageUrl = buildTargetPageUrl(targetPagePath);
      const hours = suggestion.estimatedLaborHours;
      const estimatedLaborHours = (hours != null && !Number.isNaN(Number(hours)) && Number(hours) > 0)
        ? Number(hours)
        : null;
      return addDoc(collection(db, 'sites', siteId, 'improvements'), {
        title: suggestion.title,
        description: suggestion.description,
        status: 'draft',
        expectedImpact: suggestion.expectedImpact || '',
        targetPageUrl: targetPageUrl || '',
        targetArea: suggestion.targetArea || '',
        category: normalizeCategory(suggestion.category),
        priority: normalizePriority(suggestion.priority),
        estimatedLaborHours,
        targetPageScreenshotUrlPc: null,
        targetPageScreenshotUrlMobile: null,
        dedupKey: suggestion.dedupKey || null,
        order: Date.now(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: currentUserEmail || 'unknown',
        source: 'ai_generated',
      });
    });

    await Promise.all(promises);

    console.log('[generateAndAddImprovements] 追加完了');
    
    if (onStatusChange) {
      onStatusChange('success', toAdd.length);
    }
    
    return { success: true, count: toAdd.length };
    
  } catch (error) {
    console.error('[generateAndAddImprovements] エラー:', error);
    
    // エラー状態を通知
    if (onStatusChange) {
      onStatusChange('error', 0, error.message);
    }
    
    return { success: false, count: 0, error: error.message };
  }
}
