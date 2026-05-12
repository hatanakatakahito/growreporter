import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';
import { useSite } from '../../contexts/SiteContext';
import AnalysisHeader from '../../components/Analysis/AnalysisHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import {
  useCloseMeetingsList,
  useCloseMeeting,
  useCreateCloseMeeting,
  useUpdateCloseMeeting,
  useDeleteCloseMeeting,
} from '../../hooks/useCloseMeetings';
import { useCloseMeetingData } from '../../hooks/useCloseMeetingData';
import {
  normalizeObservationRange,
  getComparisonRange,
  getTimelineRange,
  pickGranularity,
} from '../../utils/closeMeetingPeriod';
import NewCloseMeetingModal from '../../components/GrowInternal/NewCloseMeetingModal';
import CloseMeetingRecordList from '../../components/GrowInternal/CloseMeetingRecordList';
import CloseMeetingHeader from '../../components/GrowInternal/CloseMeetingHeader';
import CloseMeetingReport from '../../components/GrowInternal/CloseMeetingReport';
import ShareLinkButton from '../../components/GrowInternal/ShareLinkButton';
import CopyMinutesButton from '../../components/GrowInternal/CopyMinutesButton';

const PAGE_TITLE = 'クローズミーティング';
const DEFAULT_COMPARISON = { mode: 'yoy' };

function EmptyBox({ children }) {
  return (
    <div className="rounded-lg border border-stroke bg-white p-12 text-center">
      <p className="text-body-color">{children}</p>
    </div>
  );
}

function PageShell({ children }) {
  return (
    <div className="flex h-full flex-col">
      <AnalysisHeader showDateRange={false} showExport={false} showSiteInfo={false} />
      <main className="flex-1 overflow-y-auto bg-gray-50">
        <div className="mx-auto max-w-content px-3 py-6 sm:px-6 sm:py-10">{children}</div>
      </main>
    </div>
  );
}

/**
 * GrowGroup 社内用: クローズミーティング画面（ルート: /grow-internal/close-meeting）
 * - 対象サイトは SiteContext の選択中サイト（ヘッダーは分析画面と同じ AnalysisHeader を使用）
 * - ?recordId 無し → リニューアル記録 0件:作成モーダル / 1件:自動でその記録へ / 2件以上:一覧
 * - ?recordId 有り → そのレポート（サブツールバー + サマリーKPI + 公開前後の推移）
 */
export default function CloseMeeting() {
  const { selectedSite } = useSite();
  const siteId = selectedSite?.id || null;
  const hasGSCConnection = !!(selectedSite?.gscSiteUrl && selectedSite?.gscOauthTokenId);

  const [searchParams, setSearchParams] = useSearchParams();
  const recordId = searchParams.get('recordId');
  const [modalOpen, setModalOpen] = useState(false);
  const [obsRange, setObsRange] = useState(null);
  const [comparison, setComparison] = useState(DEFAULT_COMPARISON);
  // 「1件なら自動でその記録へ」は初回のみ。一覧へ戻るボタンと衝突しないようガード
  const autoRedirectedRef = useRef(false);
  // 「前年同期データ無し → 公開前同期間に自動フォールバック」は記録ごとに1回だけ
  const fellBackRef = useRef(false);

  const listQuery = useCloseMeetingsList(siteId);
  const recordQuery = useCloseMeeting(recordId);
  const createMut = useCreateCloseMeeting();
  const updateMut = useUpdateCloseMeeting();
  const deleteMut = useDeleteCloseMeeting();

  const record = recordQuery.data;
  const recordKey = record
    ? [
        record.id,
        record.launchDate,
        record.observationRange?.from || '',
        record.observationRange?.to || '',
        record.comparison?.mode || 'yoy',
        record.comparison?.range?.from || '',
        record.comparison?.range?.to || '',
      ].join('|')
    : null;

  // 観測期間・比較設定をローカル state に保持（記録から初期化）
  useEffect(() => {
    fellBackRef.current = false;
    if (record) {
      setObsRange(normalizeObservationRange(record.observationRange, record.launchDate));
      setComparison(record.comparison?.mode ? record.comparison : DEFAULT_COMPARISON);
    } else {
      setObsRange(null);
      setComparison(DEFAULT_COMPARISON);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordKey]);

  // 記録が 1 件だけのとき、recordId 未指定なら自動でその記録へ（初回のみ。
  // 以降は「一覧へ戻る」が機能するよう自動遷移しない）
  useEffect(() => {
    if (!recordId && !autoRedirectedRef.current && Array.isArray(listQuery.data) && listQuery.data.length === 1) {
      autoRedirectedRef.current = true;
      setSearchParams({ recordId: listQuery.data[0].id }, { replace: true });
    }
  }, [recordId, listQuery.data, setSearchParams]);

  // 表示中の記録が現在の選択サイトと異なる（サイト切替後など）→ 一覧へ戻す
  useEffect(() => {
    if (recordId && record && siteId && record.siteId !== siteId) {
      setSearchParams({}, { replace: true });
    }
  }, [recordId, record, siteId, setSearchParams]);

  const observationRange = obsRange;
  const comparisonRange = useMemo(
    () => (observationRange ? getComparisonRange(observationRange, comparison) : null),
    [observationRange, comparison]
  );
  const timelineRange = useMemo(
    () => (record?.launchDate && observationRange ? getTimelineRange(record.launchDate, observationRange) : null),
    [record?.launchDate, observationRange]
  );
  const granularity = useMemo(() => (observationRange ? pickGranularity(observationRange) : 'day'), [observationRange]);

  const reportData = useCloseMeetingData({
    siteId,
    observationRange: observationRange || {},
    comparisonRange: comparisonRange || {},
    timelineRange: timelineRange || {},
    granularity,
    hasGSCConnection,
  });

  // 前年同期にデータが無ければ「公開前同期間」へ自動フォールバック（記録ごとに1回）
  useEffect(() => {
    if (!fellBackRef.current && record && comparison.mode === 'yoy' && reportData.comparisonLikelyEmpty) {
      fellBackRef.current = true;
      setComparison({ mode: 'prevPeriod' });
    }
  }, [record, comparison.mode, reportData.comparisonLikelyEmpty]);

  // --- handlers ---
  const goToRecord = (id) => setSearchParams({ recordId: id });
  const goToList = () => setSearchParams({});

  const handleCreate = (launchDate) => {
    if (!siteId) return;
    createMut.mutate(
      { siteId, launchDate },
      {
        onSuccess: (rec) => {
          setModalOpen(false);
          if (rec?.id) setSearchParams({ recordId: rec.id });
          toast.success('リニューアル記録を作成しました');
        },
        onError: (e) => toast.error(e?.message || '作成に失敗しました'),
      }
    );
  };

  const handleDelete = (id) => {
    deleteMut.mutate(
      { recordId: id },
      {
        onSuccess: () => toast.success('記録を削除しました'),
        onError: (e) => toast.error(e?.message || '削除に失敗しました'),
      }
    );
  };

  const handleUpdateRecord = (patch) => {
    if (!record) return;
    updateMut.mutate(
      { recordId: record.id, patch },
      {
        onSuccess: () => toast.success('保存しました'),
        onError: (e) => toast.error(e?.message || '更新に失敗しました'),
      }
    );
  };

  // 担当者メモの保存（「保存」ボタン押下時）
  const handleSaveNotes = (consultantNotes) => {
    if (!record) return;
    updateMut.mutate(
      { recordId: record.id, patch: { consultantNotes } },
      {
        onSuccess: () => toast.success('メモを保存しました'),
        onError: (e) => toast.error(e?.message || 'メモの保存に失敗しました'),
      }
    );
  };

  const handleObservationChange = (next) => {
    if (!record || !next?.from || !next?.to) return;
    const normalized = normalizeObservationRange(next, record.launchDate);
    setObsRange(normalized);
    updateMut.mutate({ recordId: record.id, patch: { observationRange: { from: normalized.from, to: normalized.to } } });
  };

  const handleComparisonChange = (next) => {
    if (!record || !next?.mode) return;
    const payload = { mode: next.mode };
    if (next.mode === 'custom') {
      const r = next.range || (comparisonRange?.from ? { from: comparisonRange.from, to: comparisonRange.to } : null);
      if (!r) return; // 観測期間未確定なら何もしない
      payload.range = r;
    }
    setComparison(payload);
    updateMut.mutate({ recordId: record.id, patch: { comparison: payload } });
  };

  // --- render ---
  if (!siteId) {
    return (
      <PageShell>
        <h1 className="mb-4 text-xl font-bold text-slate-800">{PAGE_TITLE}</h1>
        <EmptyBox>サイトが選択されていません。サイトを選択してから開いてください。</EmptyBox>
      </PageShell>
    );
  }

  // レポート画面（recordId 指定あり）
  if (recordId) {
    if (recordQuery.isLoading || !obsRange) {
      return (
        <PageShell>
          <LoadingSpinner message="記録を読み込み中…" />
        </PageShell>
      );
    }
    if (recordQuery.isError || !record) {
      return (
        <PageShell>
          <button onClick={goToList} className="mb-4 inline-flex items-center gap-1 text-sm text-primary hover:underline">
            <ArrowLeft className="h-3.5 w-3.5" />
            リニューアル記録一覧へ
          </button>
          <EmptyBox>記録が見つかりませんでした。</EmptyBox>
        </PageShell>
      );
    }
    return (
      <PageShell>
        <button onClick={goToList} className="mb-3 inline-flex items-center gap-1 text-sm text-primary hover:underline">
          <ArrowLeft className="h-3.5 w-3.5" />
          リニューアル記録一覧へ
        </button>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-bold text-slate-800">{PAGE_TITLE}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <CopyMinutesButton
              siteName={selectedSite?.siteName}
              siteUrl={selectedSite?.siteUrl}
              record={record}
              data={reportData}
              observationRange={observationRange}
              comparisonRange={comparisonRange}
            />
            <ShareLinkButton record={record} />
          </div>
        </div>
        <CloseMeetingHeader
          record={record}
          records={listQuery.data || []}
          onSelectRecord={goToRecord}
          onNewRecord={() => setModalOpen(true)}
          onUpdateRecord={handleUpdateRecord}
          observationRange={observationRange}
          onObservationChange={handleObservationChange}
          comparison={comparison}
          comparisonRange={comparisonRange}
          onComparisonChange={handleComparisonChange}
        />
        <div className="mt-8">
          <CloseMeetingReport
            data={reportData}
            record={record}
            selectedSite={selectedSite}
            onSaveNotes={handleSaveNotes}
            launchDate={record.launchDate}
            observationRange={observationRange}
            comparisonRange={comparisonRange}
            granularity={granularity}
          />
        </div>
        <NewCloseMeetingModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onCreate={handleCreate}
          creating={createMut.isPending}
          siteName={selectedSite?.siteName}
        />
      </PageShell>
    );
  }

  // 記録一覧（recordId 指定なし）
  return (
    <PageShell>
      <h1 className="mb-4 text-xl font-bold text-slate-800">{PAGE_TITLE}</h1>
      {listQuery.isLoading ? (
        <LoadingSpinner message="記録を読み込み中…" />
      ) : (
        <CloseMeetingRecordList
          records={listQuery.data || []}
          onOpen={goToRecord}
          onNew={() => setModalOpen(true)}
          onDelete={handleDelete}
          deleting={deleteMut.isPending}
        />
      )}
      <NewCloseMeetingModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreate={handleCreate}
        creating={createMut.isPending}
        siteName={selectedSite?.siteName}
      />
    </PageShell>
  );
}
