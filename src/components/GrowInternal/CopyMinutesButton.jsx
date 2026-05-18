import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { ClipboardList } from 'lucide-react';
import { Button } from '../ui/button';
import { copyHtmlBlock } from '../../utils/reportClipboard';
import { buildCloseMeetingMinutes } from '../../utils/closeMeetingMinutes';

/**
 * 本画面（クローズミーティング）の内容を「議事録」として HTML でクリップボードへ。
 * Notion / Word / Google Docs にそのまま貼り付けると見出し＋表＋箇条書きになる。
 */
export default function CopyMinutesButton({ siteName, siteUrl, record, data, observationRange, comparisonRange }) {
  const [busy, setBusy] = useState(false);
  const kpi = data?.kpi || null;
  const breakdowns = data?.breakdowns || null;
  const hasComparison = !!kpi?.hasComparison;
  const ready = !!kpi?.after || !!record?.aiSummary;

  const handleClick = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const { html, text } = buildCloseMeetingMinutes({
        siteName,
        siteUrl,
        record,
        kpi,
        breakdowns,
        observationRange,
        comparisonRange,
        hasComparison,
      });
      const ok = await copyHtmlBlock(html, text);
      if (ok) toast.success('議事録としてコピーしました（Notion 等に貼り付けできます）');
      else toast.error('コピーに失敗しました');
    } catch (e) {
      console.error('[CopyMinutesButton]', e);
      toast.error('コピーに失敗しました');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={handleClick}
      disabled={busy || !ready}
      title={!ready ? 'データ集計後にコピーできます' : '画面の内容を Notion 等へ貼り付けられる形式でコピー'}
    >
      <ClipboardList className="h-4 w-4" />
      {busy ? 'コピー中…' : '議事録へコピー'}
    </Button>
  );
}
