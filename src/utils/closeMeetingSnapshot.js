/**
 * クローズMTG「確定保存」用の snapshot を組み立てる。
 * 共有リンクに焼き込む数値・時系列・ブレイクダウン・担当者メモ・各セクション考察をまとめる。
 * ヘッダーの「保存」ボタン（SaveReportButton）と AI 総括セクションの「この総括を確定保存」で共用。
 * AI 総括（aiSummary）は呼び出し側で別途 finalize に渡す（ここには含めない）。
 */
export function buildCloseMeetingSnapshot({ record, data, observationRange, comparisonRange, granularity }) {
  const pages = data?.breakdowns?.pages;
  return {
    meeting: {
      type: record?.meetingType || 'close',
      seq: record?.meetingSeq || 1,
      date: record?.meetingDate || null,
      label: record?.label || '',
    },
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
      conversionItems: data?.breakdowns?.conversionItems || null,
      pages: pages ? { ...pages, rows: (pages.rows || []).slice(0, 50) } : null,
    },
    notesSnapshot: record?.consultantNotes || {},
    // 各セクションの AI 考察（確定時点のものを焼き込み。共有レポートでも表示）
    sectionInsights: record?.sectionInsights || {},
  };
}
