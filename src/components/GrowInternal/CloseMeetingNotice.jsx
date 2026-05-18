import React from 'react';
import { AlertTriangle, Clock } from 'lucide-react';
import { comparisonModeLabel } from '../../utils/closeMeetingPeriod';
import { fmtDate } from './closeMeetingFormat';

/**
 * クローズMTGレポート冒頭の注意（出すものが無ければ何も描画しない）
 * - 計測中（観測期間が未来終端にかかっている）→ アンバーのバナー
 * - 公開前データ無し / 比較対象＝旧サイト（公開前同期間・カスタム）→ アンバーのバナー
 * 「公開前」= 比較期間 の説明はサブツールバー（CloseMeetingHeader）側に集約済み。
 */
export default function CloseMeetingNotice({ comparisonMode, observationPartial = false, remainingDays = 0, hasComparison = true, comparisonRange }) {
  const rangeText =
    comparisonRange?.from && comparisonRange?.to ? `（${fmtDate(comparisonRange.from)} 〜 ${fmtDate(comparisonRange.to)}）` : '';
  const showOldSiteWarning = hasComparison && (comparisonMode === 'prevPeriod' || comparisonMode === 'custom');

  if (!observationPartial && hasComparison && !showOldSiteWarning) return null;

  return (
    <div className="space-y-2">
      {observationPartial && (
        <div className="flex items-center gap-2 rounded-md bg-amber-50 px-3.5 py-2.5 text-[13px] text-amber-700">
          <Clock className="h-4 w-4 shrink-0" />
          計測期間中です（観測期間の終端まであと {remainingDays} 日）。表示中の数値は途中経過です。
        </div>
      )}

      {!hasComparison ? (
        <div className="flex items-start gap-2 rounded-md bg-amber-50 px-3.5 py-2.5 text-[13px] text-amber-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          公開前の計測データがありません（GA4 プロパティがリニューアル時に新規作成された等）。公開後の実数のみ表示しています。
        </div>
      ) : showOldSiteWarning ? (
        <div className="flex items-start gap-2 rounded-md bg-amber-50 px-3.5 py-2.5 text-[13px] text-amber-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          比較対象は {comparisonModeLabel(comparisonMode)}{rangeText}（旧サイト）です。URL 構造の変更などで一部ページが突合できない場合があります。
        </div>
      ) : null}
    </div>
  );
}
