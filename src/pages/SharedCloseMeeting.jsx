import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AlertCircle, ChevronDown } from 'lucide-react';
import { useSharedCloseMeeting } from '../hooks/useSharedCloseMeeting';
import LoadingSpinner from '../components/common/LoadingSpinner';
import KpiSummaryCards from '../components/GrowInternal/KpiSummaryCards';
import TimelineChart from '../components/GrowInternal/TimelineChart';
import BreakdownTable from '../components/GrowInternal/BreakdownTable';
import CloseMeetingAiSummaryBody from '../components/GrowInternal/CloseMeetingAiSummaryBody';
import { BREAKDOWN_COLUMNS, fmtDate } from '../components/GrowInternal/closeMeetingFormat';

/** 「YYYY年M月D日 H時MM分」（秒は出さない） */
function fmtJpDateTime(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${d.getHours()}時${String(d.getMinutes()).padStart(2, '0')}分`;
}

function NotesDisplay({ notes }) {
  const [open, setOpen] = useState(true);
  const items = [
    ['背景', notes?.background],
    ['課題', notes?.challenge],
    ['目的', notes?.purpose],
    ['定性目標', notes?.qualitativeGoal],
    ['定量目標', notes?.quantitativeGoal],
    ['備考', notes?.remarks],
  ].filter(([, v]) => v && String(v).trim());
  const measures = Array.isArray(notes?.measures) ? notes.measures.filter(Boolean) : [];
  if (items.length === 0 && measures.length === 0) return null;
  return (
    <section className="overflow-hidden rounded-xl border border-stroke bg-white shadow-sm">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between gap-2 px-5 py-3.5 text-left">
        <span className="text-base font-semibold text-slate-800">プロジェクト設定</span>
        <ChevronDown className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="border-t border-stroke px-5 py-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {items.map(([label, value]) => (
              <div key={label}>
                <div className="text-sm font-medium text-slate-600">{label}</div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">{value}</p>
              </div>
            ))}
            {measures.length > 0 && (
              <div className="sm:col-span-2">
                <div className="text-sm font-medium text-slate-600">実施施策</div>
                <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-slate-800">
                  {measures.map((m, i) => (
                    <li key={i}>{m}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function AiSummaryDisplay({ aiSummary }) {
  if (!aiSummary || (!aiSummary.summary && !(aiSummary.goodPoints || []).length && !(aiSummary.nextActions || []).length)) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold text-slate-800">公開後の総括</h2>
      <div className="rounded-lg border border-stroke bg-white p-5">
        <CloseMeetingAiSummaryBody summary={aiSummary} />
      </div>
    </section>
  );
}

/**
 * 共有リンクの公開ページ（ログイン不要・読取専用）。/share/close-meeting/:token
 * 確定保存された snapshot のみを表示。GA4/GSC は呼ばない。
 */
export default function SharedCloseMeeting() {
  const { token } = useParams();
  const { data, isLoading, isError, error } = useSharedCloseMeeting(token);

  // タイトル + noindex メタ（クライアント側。検索除外はホスティングの X-Robots-Tag でも担保）
  useEffect(() => {
    const prevTitle = document.title;
    if (data?.siteName) document.title = `${data.siteName} リニューアル公開後レポート`;
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    return () => {
      document.title = prevTitle;
      if (meta.parentNode) meta.parentNode.removeChild(meta);
    };
  }, [data?.siteName]);

  const snapshot = data?.snapshot || null;
  const period = snapshot?.period || {};
  const hasComparison = !!snapshot?.kpi?.hasComparison;
  const breakdowns = snapshot?.breakdowns || {};

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-content px-4 py-8 sm:px-6">
        {isLoading ? (
          <LoadingSpinner message="レポートを読み込み中…" />
        ) : isError ? (
          <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <p className="mt-4 text-base font-medium text-slate-700">このレポートは表示できません</p>
            <p className="mt-1 text-sm text-slate-500">{error?.message || 'リンクが無効か、有効期限が切れている可能性があります。'}</p>
          </div>
        ) : !snapshot ? (
          <div className="rounded-lg border border-stroke bg-white p-12 text-center text-body-color">レポートの内容がありません。</div>
        ) : (
          <div className="space-y-10">
            {/* 最小限ヘッダー */}
            <div className="border-b border-stroke pb-4">
              <h1 className="text-xl font-bold text-slate-800">{data.siteName || 'サイト'} リニューアル公開後レポート</h1>
              <p className="mt-1 text-sm text-slate-500">
                {data.label ? `${data.label} / ` : ''}リニューアル公開日: {fmtDate(data.launchDate)}
                {period?.observation?.from ? ` / 観測期間: ${fmtDate(period.observation.from)} 〜 ${fmtDate(period.observation.to)}` : ''}
              </p>
              {data.siteUrl && (
                <a href={data.siteUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                  {data.siteUrl}
                </a>
              )}
            </div>

            <NotesDisplay notes={data.consultantNotes} />

            {snapshot.kpi && <KpiSummaryCards kpi={snapshot.kpi} hideCopy />}

            {Array.isArray(snapshot.timeseries) && snapshot.timeseries.length > 0 && (
              <TimelineChart timeseries={snapshot.timeseries} launchDate={data.launchDate} granularity={period?.granularity || 'day'} hideCopy />
            )}

            {breakdowns.channels?.rows?.length > 0 && (
              <BreakdownTable title="チャネル別（公開前 → 公開後）" breakdown={breakdowns.channels} columns={BREAKDOWN_COLUMNS.channels} defaultColumns={['sessions']} hasComparison={hasComparison} hideCopy />
            )}
            {breakdowns.pages?.rows?.length > 0 && (
              <BreakdownTable title="ページ別（公開前 → 公開後）" breakdown={breakdowns.pages} columns={BREAKDOWN_COLUMNS.pages} defaultColumns={['screenPageViews']} hasComparison={hasComparison} topN={20} hideCopy />
            )}
            {breakdowns.devices?.rows?.length > 0 && (
              <BreakdownTable title="デバイス別（公開前 → 公開後）" breakdown={breakdowns.devices} columns={BREAKDOWN_COLUMNS.devices} defaultColumns={['sessions']} hasComparison={hasComparison} hideCopy />
            )}

            <AiSummaryDisplay aiSummary={data.aiSummary} />

            <div className="border-t border-stroke pt-4 text-xs text-slate-400">
              本レポートは限定公開リンクです。
              {snapshot.generatedAt ? ` 集計日時: ${fmtJpDateTime(snapshot.generatedAt)}` : ''}
              {data.expiresAt ? ` / 公開期限: ${fmtJpDateTime(data.expiresAt)}` : ''}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
