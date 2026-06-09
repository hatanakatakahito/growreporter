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
  getDefaultAfterObservationRange,
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

/**
 * 登録サイトURLのパス配下に集計を限定するためのパス前方一致を導出。
 * 例: https://example.com/recruit/ → '/recruit/'。ルート（/）や URL 不正なら null（＝サイト全体）。
 * 採用サイト等、GA4/GSC がドメイン全体だが特定ディレクトリのみ見たいケース向け。
 */
function derivePathScope(siteUrl) {
  if (!siteUrl || typeof siteUrl !== 'string') return null;
  try {
    const p = new URL(siteUrl).pathname || '/';
    if (p === '/' || p === '') return null;
    return p.endsWith('/') ? p : `${p}/`;
  } catch {
    return null;
  }
}
// アフターMTG（2回目以降の振り返り）は「前期間（前月比）」を既定比較とする
const DEFAULT_AFTER_COMPARISON = { mode: 'prevPeriod' };
const defaultComparisonFor = (rec) =>
  rec?.meetingType === 'after' ? DEFAULT_AFTER_COMPARISON : DEFAULT_COMPARISON;

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
  // 登録URLにパスがあれば、その配下のみに集計を限定（例: 採用サイト /recruit/）
  const pathScope = derivePathScope(selectedSite?.siteUrl);

  const [searchParams, setSearchParams] = useSearchParams();
  const recordId = searchParams.get('recordId');
  // 'close' = 新規リニューアル作成 / 'after' = 既存リニューアルへアフター追加
  const [modalState, setModalState] = useState({ open: false, mode: 'close', parentRecord: null });
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
  // アフターMTG で observationRange 未保存の場合は MTG 実施日の前月を初期値とする
  useEffect(() => {
    fellBackRef.current = false;
    if (record) {
      if (record.observationRange?.from && record.observationRange?.to) {
        setObsRange(normalizeObservationRange(record.observationRange, record.launchDate));
      } else if (record.meetingType === 'after' && record.meetingDate) {
        setObsRange(getDefaultAfterObservationRange(record.meetingDate));
      } else {
        setObsRange(normalizeObservationRange(record.observationRange, record.launchDate));
      }
      setComparison(record.comparison?.mode ? record.comparison : defaultComparisonFor(record));
    } else {
      setObsRange(null);
      setComparison(DEFAULT_COMPARISON);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordKey]);

  // サイト切替時は自動遷移ガードをリセット（各サイトで「1件なら自動でその記録へ」を1回ずつ効かせる）
  useEffect(() => {
    autoRedirectedRef.current = false;
  }, [siteId]);

  // 記録が 1 件だけのとき、recordId 未指定なら自動でその記録へ（クローズ/単独アフターどちらも対象）。
  // 複数MTG ある場合は一覧で選ばせる（「一覧へ戻る」も機能するよう自動遷移は初回のみ）
  useEffect(() => {
    if (recordId || autoRedirectedRef.current) return;
    const list = listQuery.data;
    if (!Array.isArray(list) || list.length !== 1) return;
    autoRedirectedRef.current = true;
    setSearchParams({ recordId: list[0].id }, { replace: true });
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
    () => (observationRange ? getTimelineRange(record?.launchDate, observationRange, record?.meetingType) : null),
    [record?.launchDate, record?.meetingType, observationRange]
  );
  const granularity = useMemo(() => (observationRange ? pickGranularity(observationRange) : 'day'), [observationRange]);

  const reportData = useCloseMeetingData({
    siteId,
    observationRange: observationRange || {},
    comparisonRange: comparisonRange || {},
    timelineRange: timelineRange || {},
    granularity,
    hasGSCConnection,
    pathPrefix: pathScope,
  });

  // 前年同期にデータが無ければ「公開前同期間」へ自動フォールバック（クローズMTG のみ・記録ごとに1回）
  // アフターMTG は既定が prevPeriod のためフォールバック不要
  useEffect(() => {
    if (
      !fellBackRef.current &&
      record &&
      record.meetingType !== 'after' &&
      comparison.mode === 'yoy' &&
      reportData.comparisonLikelyEmpty
    ) {
      fellBackRef.current = true;
      setComparison({ mode: 'prevPeriod' });
    }
  }, [record, comparison.mode, reportData.comparisonLikelyEmpty]);

  // --- handlers ---
  const goToRecord = (id) => setSearchParams({ recordId: id });
  const goToList = () => setSearchParams({});

  const closeModal = () => setModalState({ open: false, mode: 'close', parentRecord: null });
  const openNewRenewalModal = () => setModalState({ open: true, mode: 'close', parentRecord: null });
  const openStandaloneAfterModal = () => setModalState({ open: true, mode: 'after-standalone', parentRecord: null });
  const openAddAfterModal = (parent) => {
    if (!parent?.id) return;
    setModalState({ open: true, mode: 'after', parentRecord: parent });
  };

  const handleCreate = (payload) => {
    // payload のパターン:
    //   クローズMTG          : { launchDate }
    //   アフターMTG（既存系列）: { parentRecordId, meetingDate, observationRange }
    //   アフターMTG（単独起点）: { meetingType:'after', launchDate, meetingDate, observationRange }
    const isChildAfter = !!payload?.parentRecordId;
    const isStandaloneAfter = !isChildAfter && payload?.meetingType === 'after';
    // 単独アフター・クローズはどちらも siteId が必要（子アフターは親から解決）
    if (!isChildAfter && !siteId) return;
    const args = isChildAfter ? payload : { siteId, ...payload };
    createMut.mutate(args, {
      onSuccess: (rec) => {
        closeModal();
        if (rec?.id) setSearchParams({ recordId: rec.id });
        toast.success(
          isChildAfter || isStandaloneAfter ? 'アフターMTG を追加しました' : 'リニューアル記録を作成しました'
        );
      },
      onError: (e) => toast.error(e?.message || '作成に失敗しました'),
    });
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
        {pathScope && (
          <div className="mb-4 flex items-start gap-1.5 rounded-md bg-blue-50 px-3.5 py-2.5 text-[13px] text-blue-700">
            <svg className="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="9" strokeWidth="1.7" /><path d="M12 8h.01M11 12h1v4h1" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
            このレポートは登録URLのパス（<span className="font-semibold">{pathScope}</span> 配下）に限定して集計しています。GA4/GSC はサイト全体ですが、本画面のみページパスで絞り込んでいます（セッション/ユーザー/CV は当該パスを含むセッションの近似値）。
          </div>
        )}
        <CloseMeetingHeader
          record={record}
          records={listQuery.data || []}
          onSelectRecord={goToRecord}
          onNewRecord={openNewRenewalModal}
          onAddAfter={() => {
            // アフター追加時の親 = 自身がクローズなら自身、アフターなら parentRecordId or 同 launchDate のクローズMTG
            const parent =
              (record.meetingType || 'close') === 'close'
                ? record
                : (listQuery.data || []).find(
                    (r) => r.launchDate === record.launchDate && (r.meetingType || 'close') === 'close'
                  ) || record;
            openAddAfterModal(parent);
          }}
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
          open={modalState.open}
          mode={modalState.mode}
          parentRecord={modalState.parentRecord}
          onClose={closeModal}
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
          onNew={openNewRenewalModal}
          onStartAfter={openStandaloneAfterModal}
          onAddAfter={openAddAfterModal}
          onDelete={handleDelete}
          deleting={deleteMut.isPending}
        />
      )}
      <NewCloseMeetingModal
        open={modalState.open}
        mode={modalState.mode}
        parentRecord={modalState.parentRecord}
        onClose={closeModal}
        onCreate={handleCreate}
        creating={createMut.isPending}
        siteName={selectedSite?.siteName}
      />
    </PageShell>
  );
}
