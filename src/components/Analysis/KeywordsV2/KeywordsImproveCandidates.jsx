import React, { useState, useMemo } from 'react';
import { AlertTriangle, Zap, Copy, Loader2, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import { generateKeywordTitleSuggestions } from '../../../hooks/useGSCKeywordsV2';

/**
 * 改善候補タブ:
 *  - CTR 損失 KW のリスト
 *  - 各 KW カードクリックで AI Title/Description 提案 3 パターン展開
 *  - generateKeywordTitleSuggestionsV2 を on-demand 呼び出し → Firestore にキャッシュ
 */
export default function KeywordsImproveCandidates({ siteId, data }) {
  const keywords = data?.keywords || [];

  const candidates = useMemo(() => {
    return keywords
      .filter((k) => k.ctrLossFlag && k.potentialClicks > 0)
      .sort((a, b) => b.potentialClicks - a.potentialClicks)
      .slice(0, 20);
  }, [keywords]);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-100 space-y-1.5">
        <div className="flex items-start gap-2">
          <Info className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            <strong>検索結果には出ているのに、あまりクリックされていないキーワード</strong>を集めました。
          </div>
        </div>
        <div className="pl-6">
          ページのタイトル文や説明文を少し変えるだけで、もっとアクセスを増やせる可能性があります。気になるキーワードのカードをクリックすると、<strong>AI がタイトル / 説明文の改善案を 3 パターン</strong>提案します。
        </div>
      </div>

      {candidates.length === 0 ? (
        <div className="rounded-lg border border-stroke bg-white p-12 text-center dark:border-dark-3 dark:bg-dark-2">
          <p className="text-body-color">改善候補のキーワードはありません（CTR 損失なし）</p>
        </div>
      ) : (
        candidates.map((kw) => <CandidateCard key={kw.query} siteId={siteId} kw={kw} />)
      )}
    </div>
  );
}

function CandidateCard({ siteId, kw }) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState(null);
  const [currentTitle, setCurrentTitle] = useState('');
  const [error, setError] = useState(null);

  const handleExpand = async () => {
    if (expanded) {
      setExpanded(false);
      return;
    }
    setExpanded(true);
    if (suggestions) return;
    setLoading(true);
    setError(null);
    try {
      const result = await generateKeywordTitleSuggestions(siteId, kw);
      setSuggestions(result.suggestions);
      setCurrentTitle(result.currentTitle || '');
    } catch (e) {
      setError(e?.message || 'AI 提案の生成に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const copy = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('コピーしました');
  };

  return (
    <div className="rounded-lg border border-stroke bg-white p-5 dark:border-dark-3 dark:bg-dark-2">
      <div className="flex items-start justify-between mb-3 gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="rounded-md bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 px-2 py-0.5 text-[11px] font-bold inline-flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              CTR 損失
            </span>
            <h4 className="text-base font-bold text-dark dark:text-white">{kw.query}</h4>
          </div>
          <div className="flex items-center gap-3 text-xs text-body-color flex-wrap">
            <span>表示 {(kw.impressions || 0).toLocaleString()} / クリック {(kw.clicks || 0).toLocaleString()} / <span className="font-mono">CTR {((kw.ctr || 0) * 100).toFixed(1)}%</span></span>
            <span className="text-rose-600 dark:text-rose-400">
              同順位帯平均から <span className="font-bold">{kw.ctrLossDelta ?? 0} pt</span>
            </span>
            {kw.topPage && (
              <span className="text-primary truncate font-mono">対象LP: {kw.topPage}</span>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-xs text-body-color">伸びしろ</div>
          <div className="text-lg font-bold text-emerald-600">
            +{(kw.potentialClicks || 0).toLocaleString()} クリック/月
          </div>
        </div>
      </div>

      <button
        onClick={handleExpand}
        className="w-full text-left rounded-md border border-stroke dark:border-dark-3 px-3 py-2 hover:border-primary text-sm text-primary inline-flex items-center gap-2"
      >
        <Zap className="h-4 w-4" />
        {expanded ? '閉じる' : suggestions ? 'AI 改善案を再表示' : 'AI 改善案 3 パターンを生成'}
      </button>

      {expanded && (
        <div className="mt-4">
          {loading && (
            <div className="rounded-md bg-slate-50 dark:bg-dark-3 p-4 text-center text-sm text-body-color inline-flex items-center justify-center gap-2 w-full">
              <Loader2 className="h-4 w-4 animate-spin" />
              AI が現在の Title/Description を解析しています...
            </div>
          )}

          {error && (
            <div className="rounded-md bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800 dark:bg-rose-900/20 dark:border-rose-800 dark:text-rose-200">
              {error}
            </div>
          )}

          {suggestions && (
            <>
              {currentTitle && (
                <div className="rounded-md bg-slate-50 p-3 mb-3 dark:bg-dark-3">
                  <div className="text-[10px] uppercase tracking-wide text-body-color font-semibold mb-1">現在の Title</div>
                  <div className="text-sm text-body-color line-through">{currentTitle}</div>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {suggestions.map((s, i) => (
                  <div key={i} className="rounded-md border border-purple-200 bg-purple-50/40 p-3 dark:bg-purple-900/10 dark:border-purple-800">
                    <div className="text-[10px] uppercase tracking-wide text-purple-700 dark:text-purple-300 font-semibold mb-1">
                      AI 提案 {String.fromCharCode(65 + i)} — {s.label}
                    </div>
                    <div className="text-sm font-semibold text-dark dark:text-white mb-2 leading-snug">{s.title}</div>
                    {s.description && (
                      <div className="text-xs text-body-color mb-2 leading-relaxed">{s.description}</div>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={() => copy(s.title)}
                        className="text-[11px] text-purple-700 dark:text-purple-300 hover:underline inline-flex items-center gap-1"
                      >
                        <Copy className="h-3 w-3" /> Title コピー
                      </button>
                      {s.description && (
                        <button
                          onClick={() => copy(s.description)}
                          className="text-[11px] text-purple-700 dark:text-purple-300 hover:underline inline-flex items-center gap-1"
                        >
                          <Copy className="h-3 w-3" /> Desc コピー
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
