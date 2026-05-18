import React from 'react';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorAlert from '../common/ErrorAlert';
import CloseMeetingNotice from './CloseMeetingNotice';
import ConsultantNotesForm from './ConsultantNotesForm';
import KpiSummaryCards from './KpiSummaryCards';
import TimelineChart from './TimelineChart';
import BreakdownTable from './BreakdownTable';
import KpiTargetTable from './KpiTargetTable';
import CloseMeetingAiSummary from './CloseMeetingAiSummary';
import { BREAKDOWN_COLUMNS } from './closeMeetingFormat';

// セクション見出しのアイコン（線アイコン）
const IconChannel = (
  <svg className="h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10" strokeWidth="1.7" /><path d="M12 2v10l7 4" strokeWidth="1.7" /></svg>
);
const IconPage = (
  <svg className="h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" strokeWidth="1.7" /><path d="M14 2v6h6M8 13h8M8 17h5" strokeWidth="1.7" /></svg>
);
const IconDevice = (
  <svg className="h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="2" y="3" width="20" height="14" rx="2" strokeWidth="1.7" /><path d="M8 21h8M12 17v4" strokeWidth="1.7" /></svg>
);

function observationDays(range) {
  if (!range?.from || !range?.to) return null;
  const d = Math.round((new Date(range.to) - new Date(range.from)) / 86400000) + 1;
  return Number.isFinite(d) && d > 0 ? d : null;
}

function aiExcerptOf(record) {
  const s = record?.aiSummary?.summary;
  if (!s || typeof s !== 'string') return null;
  const trimmed = s.trim();
  return trimmed.length > 150 ? `${trimmed.slice(0, 150)}…` : trimmed;
}

/**
 * クローズMTGレポート本体（C案レイアウト：1スクロール・各セクションを白カード化）
 *  注意バナー → 担当者メモ → サマリー指標（先頭にAI要旨）→ 公開前後の推移
 *  → チャネル別 → ページ別 → デバイス別 → KPI予実 → AI総括（公開後・全文）
 */
export default function CloseMeetingReport({
  data,
  record,
  selectedSite,
  onSaveNotes,
  launchDate,
  observationRange,
  comparisonRange,
  granularity,
}) {
  const {
    kpi,
    timeseries,
    breakdowns,
    isLoadingKpi,
    isLoadingTimeline,
    isLoadingBreakdowns,
    isErrorKpi,
    errorKpi,
    refetch,
    gscError,
  } = data || {};

  if (isErrorKpi) {
    return <ErrorAlert message={errorKpi?.message || 'GA4 データの取得に失敗しました。連携状態をご確認ください。'} onRetry={refetch} />;
  }

  const hasComparison = !!kpi?.hasComparison;
  const kpiList = selectedSite?.kpiSettings?.kpiList;
  const obsDays = observationDays(observationRange);

  return (
    <div className="space-y-5">
      <CloseMeetingNotice
        comparisonMode={comparisonRange?.mode}
        observationPartial={observationRange?.partial}
        remainingDays={observationRange?.remainingDays}
        hasComparison={hasComparison}
        comparisonRange={comparisonRange}
      />

      {gscError && (
        <div className="rounded-md bg-amber-50 px-3.5 py-2.5 text-sm text-amber-700">
          Search Console のデータを取得できませんでした（未連携または再連携が必要な可能性があります）。GSC 指標は「—」表示になります。
        </div>
      )}

      {record && onSaveNotes && (
        <ConsultantNotesForm key={`cm-notes-${record.id}`} notes={record.consultantNotes} onSave={onSaveNotes} />
      )}

      {isLoadingKpi ? (
        <div className="rounded-xl border border-stroke bg-white shadow-sm"><LoadingSpinner message="サマリー指標を集計中…" /></div>
      ) : (
        <KpiSummaryCards kpi={kpi} aiExcerpt={aiExcerptOf(record)} />
      )}

      {isLoadingTimeline ? (
        <div className="rounded-xl border border-stroke bg-white shadow-sm"><LoadingSpinner message="時系列データを集計中…" /></div>
      ) : (
        <TimelineChart timeseries={timeseries} launchDate={launchDate} granularity={granularity} />
      )}

      {isLoadingBreakdowns ? (
        <div className="rounded-xl border border-stroke bg-white shadow-sm"><LoadingSpinner message="ブレイクダウンを集計中…" /></div>
      ) : (
        <>
          <BreakdownTable title="チャネル別（公開前 → 公開後）" icon={IconChannel} breakdown={breakdowns?.channels} columns={BREAKDOWN_COLUMNS.channels} defaultColumns={['sessions']} hasComparison={hasComparison} />
          <BreakdownTable title="ページ別（公開前 → 公開後・上位20）" icon={IconPage} breakdown={breakdowns?.pages} columns={BREAKDOWN_COLUMNS.pages} defaultColumns={['screenPageViews']} hasComparison={hasComparison} topN={20} />
          <BreakdownTable title="デバイス別（公開前 → 公開後）" icon={IconDevice} breakdown={breakdowns?.devices} columns={BREAKDOWN_COLUMNS.devices} defaultColumns={['sessions']} hasComparison={hasComparison} />
        </>
      )}

      {!isLoadingKpi && kpi?.after && Array.isArray(kpiList) && kpiList.length > 0 && (
        <KpiTargetTable kpiList={kpiList} actuals={kpi.after} observationDays={obsDays} />
      )}

      {record && (
        <CloseMeetingAiSummary
          key={`cm-ai-${record.id}`}
          record={record}
          data={data}
          observationRange={observationRange}
          comparisonRange={comparisonRange}
          granularity={granularity}
        />
      )}
    </div>
  );
}
