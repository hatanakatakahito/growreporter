import React from 'react';
import toast from 'react-hot-toast';
import { Save } from 'lucide-react';
import { Button } from '../ui/button';
import { useFinalizeCloseMeeting } from '../../hooks/useCloseMeetings';
import { buildCloseMeetingSnapshot } from '../../utils/closeMeetingSnapshot';

/**
 * ヘッダー用「保存」ボタン。現在のレポート内容（数値・グラフ・担当者メモ・各セクション考察）を
 * 「確定保存」として記録に焼き込む（status:'finalized'）。これで共有リンクの発行が可能になり、
 * 発行済みの共有リンクにも内容が反映される。
 * AI 総括は既存の保存済みを維持（未生成なら無し）。AI 総括の更新は「AI 総括」セクションの
 * 「この総括を確定保存」から行う。
 */
export default function SaveReportButton({ record, data, observationRange, comparisonRange, granularity }) {
  const finalizeMut = useFinalizeCloseMeeting();
  const recordId = record?.id;
  const ready = !!data?.kpi?.after;
  const isFinalized = record?.status === 'finalized';

  const handleSave = () => {
    if (!recordId) return;
    const ok = window.confirm(
      isFinalized
        ? '現在のレポート内容で保存（上書き）します。共有リンクを発行している場合は内容も更新されます。よろしいですか？'
        : '現在のレポート内容（数値・グラフ・メモ・考察）を保存します。保存すると共有リンクを発行できるようになります。よろしいですか？'
    );
    if (!ok) return;
    const snapshot = buildCloseMeetingSnapshot({ record, data, observationRange, comparisonRange, granularity });
    finalizeMut.mutate(
      { recordId, snapshot, aiSummary: record?.aiSummary || null },
      {
        onSuccess: () => toast.success('保存しました'),
        onError: (e) => toast.error(e?.message || '保存に失敗しました'),
      }
    );
  };

  return (
    <Button
      variant="primary"
      size="sm"
      onClick={handleSave}
      disabled={!ready || finalizeMut.isPending}
      title={!ready ? 'データ集計後に保存できます' : '現在の内容を確定保存（共有リンクに反映）'}
    >
      <Save className="h-4 w-4" />
      {finalizeMut.isPending ? '保存中…' : isFinalized ? '保存（上書き）' : '保存'}
    </Button>
  );
}
