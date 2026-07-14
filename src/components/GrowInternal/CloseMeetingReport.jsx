import React from 'react';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorAlert from '../common/ErrorAlert';
import CloseMeetingNotice from './CloseMeetingNotice';
import ConsultantNotesForm from './ConsultantNotesForm';
import KpiSummaryCards from './KpiSummaryCards';
import TimelineChart from './TimelineChart';
import BreakdownTable from './BreakdownTable';
import CloseMeetingAiSummary from './CloseMeetingAiSummary';
import SectionInsight from './SectionInsight';
import { BREAKDOWN_COLUMNS, CV_ITEM_COLUMNS, KEYWORD_COLUMNS } from './closeMeetingFormat';
import { comparisonModeLabel } from '../../utils/closeMeetingPeriod';
import {
  summaryLines,
  timelineLines,
  channelsLines,
  devicesLines,
  conversionItemsLines,
  pagesLines,
  keywordsLines,
} from '../../utils/closeMeetingInsightLines';

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
const IconKeyword = (
  <svg className="h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="11" cy="11" r="7" strokeWidth="1.7" /><path d="M21 21l-4.3-4.3" strokeWidth="1.7" strokeLinecap="round" /></svg>
);
const IconConversion = (
  <svg className="h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="9" strokeWidth="1.7" /><circle cx="12" cy="12" r="4.5" strokeWidth="1.7" /><circle cx="12" cy="12" r="0.5" strokeWidth="1.7" /></svg>
);

function aiExcerptOf(record) {
  const s = record?.aiSummary?.summary;
  if (!s || typeof s !== 'string') return null;
  const trimmed = s.trim();
  return trimmed.length > 150 ? `${trimmed.slice(0, 150)}…` : trimmed;
}

/**
 * クローズMTGレポート本体（C案レイアウト：1スクロール・各セクションを白カード化）
 *  注意バナー → 担当者メモ → サマリー指標（先頭にAI要旨）→ 公開前後の推移
 *  → チャネル別 → ページ別 → デバイス別 → コンバージョン項目別 → AI総括（公開後・全文）
 */
export default function CloseMeetingReport({
  data,
  record,
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
    isLoadingKeywords,
    hasGSC,
    isErrorKpi,
    errorKpi,
    refetch,
    gscError,
  } = data || {};

  if (isErrorKpi) {
    return <ErrorAlert message={errorKpi?.message || 'GA4 データの取得に失敗しました。連携状態をご確認ください。'} onRetry={refetch} />;
  }

  const hasComparison = !!kpi?.hasComparison;
  const meetingType = record?.meetingType || 'close';

  // 各セクション AI 考察の共通プロパティ
  const recordId = record?.id;
  const insights = record?.sectionInsights || {};
  const compLabel = comparisonModeLabel(comparisonRange?.mode, meetingType);
  const renderInsight = (sectionKey, dataLines, disabled = false) => (
    <SectionInsight
      recordId={recordId}
      sectionKey={sectionKey}
      insight={insights[sectionKey]}
      dataLines={dataLines}
      comparisonModeLabel={compLabel}
      hasComparison={hasComparison}
      disabled={disabled || !recordId}
    />
  );

  return (
    <div className="space-y-5">
      <CloseMeetingNotice
        meetingType={meetingType}
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
        <KpiSummaryCards
          kpi={kpi}
          meetingType={meetingType}
          aiExcerpt={aiExcerptOf(record)}
          collapsible
          footer={renderInsight('summary', summaryLines(kpi, meetingType), !kpi?.after)}
        />
      )}

      {isLoadingTimeline ? (
        <div className="rounded-xl border border-stroke bg-white shadow-sm"><LoadingSpinner message="時系列データを集計中…" /></div>
      ) : (
        <TimelineChart
          timeseries={timeseries}
          launchDate={launchDate}
          meetingType={meetingType}
          granularity={granularity}
          collapsible
          footer={renderInsight('timeline', timelineLines(timeseries, granularity), !timeseries?.length)}
        />
      )}

      {isLoadingBreakdowns ? (
        <div className="rounded-xl border border-stroke bg-white shadow-sm"><LoadingSpinner message="ブレイクダウンを集計中…" /></div>
      ) : (
        <>
          <BreakdownTable title="チャネル別" meetingType={meetingType} icon={IconChannel} breakdown={breakdowns?.channels} columns={BREAKDOWN_COLUMNS.channels} defaultColumns={['sessions']} hasComparison={hasComparison} collapsible
            footer={renderInsight('channels', channelsLines(breakdowns?.channels, hasComparison), !breakdowns?.channels?.rows?.length)} />
          {hasGSC && !gscError && (
            isLoadingKeywords ? (
              <div className="rounded-xl border border-stroke bg-white shadow-sm"><LoadingSpinner message="キーワード流入を集計中…" /></div>
            ) : (
              <BreakdownTable title="キーワード流入（上位20）" meetingType={meetingType} icon={IconKeyword} breakdown={breakdowns?.keywords} columns={KEYWORD_COLUMNS} defaultColumns={['clicks']} hasComparison={hasComparison} topN={20} collapsible
                footer={renderInsight('keywords', keywordsLines(breakdowns?.keywords, hasComparison), !breakdowns?.keywords?.rows?.length)} />
            )
          )}
          <BreakdownTable title="ページ別（上位20）" meetingType={meetingType} icon={IconPage} breakdown={breakdowns?.pages} columns={BREAKDOWN_COLUMNS.pages} defaultColumns={['screenPageViews']} hasComparison={hasComparison} topN={20} collapsible
            footer={renderInsight('pages', pagesLines(breakdowns?.pages, hasComparison), !breakdowns?.pages?.rows?.length)} />
          <BreakdownTable title="デバイス別" meetingType={meetingType} icon={IconDevice} breakdown={breakdowns?.devices} columns={BREAKDOWN_COLUMNS.devices} defaultColumns={['sessions']} hasComparison={hasComparison} collapsible
            footer={renderInsight('devices', devicesLines(breakdowns?.devices, hasComparison), !breakdowns?.devices?.rows?.length)} />
          <BreakdownTable title="コンバージョン項目別" meetingType={meetingType} icon={IconConversion} breakdown={breakdowns?.conversionItems} columns={CV_ITEM_COLUMNS} defaultColumns={['conversions']} hasComparison={hasComparison} collapsible defaultView="table"
            footer={renderInsight('conversionItems', conversionItemsLines(breakdowns?.conversionItems, hasComparison), !breakdowns?.conversionItems?.rows?.length)} />
        </>
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
