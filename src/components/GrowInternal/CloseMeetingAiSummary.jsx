import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { Sparkles, Save, Pencil, X as XIcon, Check } from 'lucide-react';
import { Button } from '../ui/button';
import { useGenerateCloseMeetingSummary, useFinalizeCloseMeeting } from '../../hooks/useCloseMeetings';
import { comparisonModeLabel } from '../../utils/closeMeetingPeriod';
import { KPI_GROUPS, formatMetricValue } from './closeMeetingFormat';
import { formatChangePercent } from '../../utils/comparisonHelpers';
import CloseMeetingAiSummaryBody from './CloseMeetingAiSummaryBody';

function buildKpiLines(kpi) {
  const after = kpi?.after;
  if (!after) return [];
  const comp = kpi?.comparison;
  const changes = kpi?.changes || {};
  const has = !!kpi?.hasComparison;
  return KPI_GROUPS.flatMap((g) => g.metrics).map((m) => ({
    label: m.label,
    afterText: formatMetricValue(after[m.key], m.format),
    beforeText: has && comp ? formatMetricValue(comp[m.key], m.format) : '',
    changeText: has ? formatChangePercent(changes[m.key]) : '',
  }));
}

function fmtBreakdownRow(r, keyField, metricKey, fmt, withChange) {
  const name = r[keyField] || '(なし)';
  const v = formatMetricValue(r[metricKey], fmt);
  const c = withChange && r[`${metricKey}_change`] != null ? `（${formatChangePercent(r[`${metricKey}_change`])}）` : '';
  return `${name}: ${v}${c}`;
}

function buildBreakdownBlocks(breakdowns, hasComparison) {
  const blocks = [];
  const channels = breakdowns?.channels;
  if (channels?.rows?.length) {
    const sorted = [...channels.rows].sort((a, b) => (Number(b.sessions) || 0) - (Number(a.sessions) || 0)).slice(0, 8);
    blocks.push({ title: 'チャネル別（公開後セッション・上位）', lines: sorted.map((r) => fmtBreakdownRow(r, channels.keyField, 'sessions', 'number', hasComparison)) });
  }
  const devices = breakdowns?.devices;
  if (devices?.rows?.length) {
    blocks.push({ title: 'デバイス別', lines: devices.rows.map((r) => fmtBreakdownRow(r, devices.keyField, 'sessions', 'number', hasComparison)) });
  }
  const pages = breakdowns?.pages;
  if (pages?.rows?.length) {
    if (hasComparison) {
      const withPrev = pages.rows.filter((r) => r.screenPageViews_change != null);
      const gained = [...withPrev].sort((a, b) => (b.screenPageViews_change || 0) - (a.screenPageViews_change || 0)).slice(0, 5);
      const lost = [...withPrev].sort((a, b) => (a.screenPageViews_change || 0) - (b.screenPageViews_change || 0)).slice(0, 5);
      if (gained.length) blocks.push({ title: 'ページ別: PV が伸びたページ（上位）', lines: gained.map((r) => fmtBreakdownRow(r, pages.keyField, 'screenPageViews', 'number', true)) });
      if (lost.length) blocks.push({ title: 'ページ別: PV が落ちたページ（上位）', lines: lost.map((r) => fmtBreakdownRow(r, pages.keyField, 'screenPageViews', 'number', true)) });
      const noPrev = pages.rows.length - withPrev.length;
      if (noPrev > 0) blocks.push({ title: 'ページ別: 補足', lines: [`公開前データと突合できなかったページ: ${noPrev} 件（URL 構造の変更等の可能性）`] });
    } else {
      const top = [...pages.rows].sort((a, b) => (Number(b.screenPageViews) || 0) - (Number(a.screenPageViews) || 0)).slice(0, 8);
      blocks.push({ title: 'ページ別（公開後 PV・上位）', lines: top.map((r) => fmtBreakdownRow(r, pages.keyField, 'screenPageViews', 'number', false)) });
    }
  }
  return blocks;
}

/** "a\nb\n" ⇄ ['a','b']（編集フォーム用：1行1項目） */
const linesToText = (arr) => (Array.isArray(arr) ? arr : []).join('\n');
const textToLines = (text) => String(text || '').split('\n').map((s) => s.trim()).filter(Boolean);

/**
 * AI 総括（公開後）。Gemini で生成 →（必要なら手動編集）→「この総括を確定保存」で snapshot ＋ aiSummary を記録に焼き込む。
 */
export default function CloseMeetingAiSummary({ record, data, observationRange, comparisonRange, granularity }) {
  const genMut = useGenerateCloseMeetingSummary();
  const finalizeMut = useFinalizeCloseMeeting();
  const [localSummary, setLocalSummary] = useState(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ summary: '', goodPoints: '', nextActions: '' });

  const saved = record?.aiSummary || null;
  const displayed = localSummary || saved;
  // localSummary が立っている＝AI 生成 or 手動編集の作業中（確定保存で null に戻す）
  const isUnsaved = !!localSummary;
  const recordId = record?.id;

  const startEdit = () => {
    if (!displayed) return;
    setDraft({
      summary: displayed.summary || '',
      goodPoints: linesToText(displayed.goodPoints),
      nextActions: linesToText(displayed.nextActions),
    });
    setEditing(true);
  };
  const cancelEdit = () => setEditing(false);
  const applyEdit = () => {
    const next = {
      ...(displayed || {}),
      summary: (draft.summary || '').trim(),
      goodPoints: textToLines(draft.goodPoints),
      nextActions: textToLines(draft.nextActions),
      generatedAt: displayed?.generatedAt || new Date().toISOString(),
    };
    setLocalSummary(next);
    setEditing(false);
    toast.success('編集を反映しました（確定保存で記録に反映されます）');
  };

  const handleGenerate = () => {
    if (!recordId) return;
    const payload = {
      observationRange: { from: observationRange?.from, to: observationRange?.to },
      comparisonRange: comparisonRange?.from ? { from: comparisonRange.from, to: comparisonRange.to } : null,
      comparisonModeLabel: comparisonModeLabel(comparisonRange?.mode),
      kpiLines: buildKpiLines(data?.kpi),
      breakdownBlocks: buildBreakdownBlocks(data?.breakdowns, !!data?.kpi?.hasComparison),
      kpiActualsLines: null,
    };
    genMut.mutate(
      { recordId, payload },
      {
        onSuccess: (s) => {
          if (s) {
            setLocalSummary(s);
            toast.success('AI 総括を生成しました');
          } else {
            toast.error('AI から有効な応答が得られませんでした');
          }
        },
        onError: (e) => toast.error(e?.message || 'AI 生成に失敗しました'),
      }
    );
  };

  const handleFinalize = () => {
    if (!recordId || !displayed) return;
    const ok = window.confirm(
      record?.status === 'finalized'
        ? '確定保存（上書き）します。共有リンクを発行している場合は内容も更新されます。よろしいですか？'
        : '現在の数値・グラフ・AI 総括を「確定」として保存します。よろしいですか？'
    );
    if (!ok) return;
    const pages = data?.breakdowns?.pages;
    const snapshot = {
      period: {
        observation: observationRange ? { from: observationRange.from, to: observationRange.to } : null,
        comparison: comparisonRange?.from ? { from: comparisonRange.from, to: comparisonRange.to } : null,
        comparisonMode: comparisonRange?.mode || null,
        granularity: granularity || null,
        isPartial: !!observationRange?.partial,
      },
      kpi: data?.kpi || null,
      timeseries: data?.timeseries || [],
      breakdowns: {
        channels: data?.breakdowns?.channels || null,
        devices: data?.breakdowns?.devices || null,
        pages: pages ? { ...pages, rows: (pages.rows || []).slice(0, 50) } : null,
      },
      notesSnapshot: record?.consultantNotes || {},
    };
    finalizeMut.mutate(
      { recordId, snapshot, aiSummary: displayed },
      {
        onSuccess: () => {
          setLocalSummary(null);
          toast.success('確定保存しました');
        },
        onError: (e) => toast.error(e?.message || '確定保存に失敗しました'),
      }
    );
  };

  return (
    <section id="cm-ai-summary" className="overflow-hidden rounded-xl border border-stroke bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stroke px-5 py-3.5">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold text-slate-800">
          <svg className="h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M12 2a7 7 0 00-4 12.7V17a2 2 0 002 2h4a2 2 0 002-2v-2.3A7 7 0 0012 2zM9 22h6" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          AI 総括（公開後）
          {displayed && (
            isUnsaved ? (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-600">未保存</span>
            ) : record?.status === 'finalized' ? (
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">確定保存済み</span>
            ) : null
          )}
          {displayed?.generatedAt && <span className="text-xs font-normal text-slate-400">生成: {new Date(displayed.generatedAt).toLocaleString('ja-JP')}</span>}
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          {editing ? (
            <>
              <Button variant="ghost" size="sm" onClick={cancelEdit}>
                <XIcon className="h-4 w-4" />
                キャンセル
              </Button>
              <Button variant="primary" size="sm" onClick={applyEdit}>
                <Check className="h-4 w-4" />
                編集を反映
              </Button>
            </>
          ) : (
            <>
              <Button variant="ai" size="sm" onClick={handleGenerate} disabled={genMut.isPending || !data?.kpi?.after}>
                <Sparkles className="h-4 w-4" />
                {genMut.isPending ? '生成中…' : displayed ? '再生成' : 'AI 総括を生成'}
              </Button>
              {displayed && (
                <Button variant="ghost" size="sm" onClick={startEdit}>
                  <Pencil className="h-4 w-4" />
                  手動編集
                </Button>
              )}
              {displayed && (
                <Button variant="primary" size="sm" onClick={handleFinalize} disabled={finalizeMut.isPending}>
                  <Save className="h-4 w-4" />
                  {finalizeMut.isPending ? '保存中…' : 'この総括を確定保存'}
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="p-5">
        {!displayed ? (
          <div className="rounded-md border border-dashed border-stroke p-8 text-center text-sm text-body-color">
            「AI 総括を生成」を押すと、担当者メモと公開前後の数値をもとに、クライアント説明用の総括（総括 / 良くなった点 / 残課題・次アクション）を生成します。
          </div>
        ) : editing ? (
          <div className="space-y-5">
            <p className="rounded-md bg-slate-50 px-3 py-2 text-[12px] text-slate-500">
              AI が出した内容をそのまま編集できます。「良くなった点」「残課題・次に取り組むこと」は 1 行 1 項目（最大 8 項目）。編集後は「編集を反映」→「この総括を確定保存」で記録に反映されます。
            </p>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-600">総括</label>
              <textarea
                value={draft.summary}
                onChange={(e) => setDraft((d) => ({ ...d, summary: e.target.value }))}
                rows={6}
                className="w-full rounded-md border border-stroke px-3 py-2 text-sm leading-7 text-slate-800 placeholder:text-slate-300 focus:border-primary focus:outline-none"
                placeholder="公開前後の変化の総括"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-600">良くなった点（1 行 1 項目）</label>
              <textarea
                value={draft.goodPoints}
                onChange={(e) => setDraft((d) => ({ ...d, goodPoints: e.target.value }))}
                rows={5}
                className="w-full rounded-md border border-stroke px-3 py-2 text-sm leading-7 text-slate-800 placeholder:text-slate-300 focus:border-primary focus:outline-none"
                placeholder={'例）スマホのCV数が前年同期比 +30%\n例）TOPページの直帰率が改善'}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-600">残課題・次に取り組むこと（1 行 1 項目）</label>
              <textarea
                value={draft.nextActions}
                onChange={(e) => setDraft((d) => ({ ...d, nextActions: e.target.value }))}
                rows={5}
                className="w-full rounded-md border border-stroke px-3 py-2 text-sm leading-7 text-slate-800 placeholder:text-slate-300 focus:border-primary focus:outline-none"
                placeholder={'例）下層ページの導線を見直す\n例）フォーム到達率の計測を追加する'}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <CloseMeetingAiSummaryBody summary={displayed} />
            <p className="border-t border-stroke pt-3 text-[11px] text-slate-400">※ AI による自動生成です（手動編集可）。クライアント提出前に内容を必ずご確認ください。</p>
          </div>
        )}
      </div>
    </section>
  );
}
