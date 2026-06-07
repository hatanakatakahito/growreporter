import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { X } from 'lucide-react';
import { Button } from '../ui/button';
import { recordDisplayLabel, fmtDate } from './closeMeetingFormat';
import { getDefaultAfterObservationRange } from '../../utils/closeMeetingPeriod';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const isDate = (s) => DATE_RE.test(s || '') && !Number.isNaN(Date.parse(s));

/**
 * MTG 記録の作成モーダル
 *  - mode='close'            : 新規リニューアル（クローズMTG #1）— 公開日のみ入力
 *  - mode='after'            : 既存リニューアルへのアフターMTG 追加 — MTG 実施日を入力
 *                              ※ launchDate / 担当者メモは親（parentRecord）から継承される
 *  - mode='after-standalone' : クローズMTG なしでアフターMTG から開始 — 公開日 + MTG 実施日を入力
 *                              ※ 同 (siteId, launchDate) に既存系列があればサーバ側で自動合流（一本化）
 */
export default function NewCloseMeetingModal({
  open,
  mode = 'close',
  onClose,
  onCreate,
  creating = false,
  siteName = '',
  parentRecord = null,
}) {
  const [launchDate, setLaunchDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [meetingDate, setMeetingDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [error, setError] = useState('');

  const isChildAfter = mode === 'after';
  const isStandaloneAfter = mode === 'after-standalone';
  const showLaunchInput = mode === 'close' || isStandaloneAfter;
  const showMeetingInput = isChildAfter || isStandaloneAfter;

  // モード切替・モーダル開閉・親変更のたびに入力値をリセット
  useEffect(() => {
    if (!open) return;
    setError('');
    setLaunchDate(format(new Date(), 'yyyy-MM-dd'));
    setMeetingDate(format(new Date(), 'yyyy-MM-dd'));
  }, [open, mode, parentRecord?.id]);

  if (!open) return null;

  const handleCreate = () => {
    if (isChildAfter) {
      if (!parentRecord?.id) {
        setError('親の記録が指定されていません');
        return;
      }
      if (!isDate(meetingDate)) {
        setError('MTG 実施日（YYYY-MM-DD）を入力してください');
        return;
      }
      setError('');
      onCreate({
        parentRecordId: parentRecord.id,
        meetingDate,
        observationRange: getDefaultAfterObservationRange(meetingDate),
      });
      return;
    }
    if (isStandaloneAfter) {
      if (!isDate(launchDate)) {
        setError('リニューアル公開日（YYYY-MM-DD）を入力してください');
        return;
      }
      if (!isDate(meetingDate)) {
        setError('MTG 実施日（YYYY-MM-DD）を入力してください');
        return;
      }
      if (launchDate > meetingDate) {
        setError('MTG 実施日は公開日より後の日付にしてください');
        return;
      }
      setError('');
      onCreate({
        meetingType: 'after',
        launchDate,
        meetingDate,
        observationRange: getDefaultAfterObservationRange(meetingDate),
      });
      return;
    }
    // close
    if (!isDate(launchDate)) {
      setError('公開日（YYYY-MM-DD）を入力してください');
      return;
    }
    setError('');
    onCreate({ launchDate });
  };

  const title = isChildAfter
    ? 'アフターMTG を追加'
    : isStandaloneAfter
      ? 'アフターMTG から開始'
      : '新規リニューアル記録を作成';

  const obsPreview = isDate(meetingDate) ? getDefaultAfterObservationRange(meetingDate) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-stroke px-5 py-3">
          <h3 className="text-base font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 transition hover:text-slate-600" aria-label="閉じる">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-5 py-4">
          <p className="mb-3 text-sm text-slate-600">
            {isChildAfter ? (
              `「${recordDisplayLabel(parentRecord)}」のアフターMTG を追加します。MTG 実施日を入力してください。担当者メモは現在の記録からコピーされ、追加後に独立して編集できます。`
            ) : isStandaloneAfter ? (
              <>
                {siteName && <span className="font-medium text-slate-800">{siteName}</span>} の
                クロージングMTG を終えた案件で、アフターMTG からレポートを開始します。リニューアル公開日と MTG 実施日を入力してください。
              </>
            ) : (
              <>
                {siteName && <span className="font-medium text-slate-800">{siteName}</span>} のリニューアル公開日を入力してください。
              </>
            )}
          </p>

          {isChildAfter && parentRecord?.launchDate && (
            <div className="mb-3 rounded-md bg-gray-50 px-3 py-2 text-xs text-slate-600">
              <span className="font-medium text-slate-700">リニューアル公開日</span>: {fmtDate(parentRecord.launchDate)}
            </div>
          )}

          {showLaunchInput && (
            <div className="mb-3">
              <label htmlFor="cm-launch-date" className="block text-sm font-medium text-slate-700">
                リニューアル公開日
              </label>
              <input
                id="cm-launch-date"
                type="date"
                value={launchDate}
                onChange={(e) => setLaunchDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-stroke px-3 py-2 text-sm text-slate-800 focus:border-primary focus:outline-none"
              />
              {isStandaloneAfter && (
                <p className="mt-1 text-xs text-slate-500">
                  グラフの公開ライン・参考情報に使用します（比較は前期間が既定）。
                </p>
              )}
            </div>
          )}

          {showMeetingInput && (
            <div>
              <label htmlFor="cm-meeting-date" className="block text-sm font-medium text-slate-700">
                MTG 実施日
              </label>
              <input
                id="cm-meeting-date"
                type="date"
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-stroke px-3 py-2 text-sm text-slate-800 focus:border-primary focus:outline-none"
              />
              <p className="mt-1 text-xs text-slate-500">
                観測期間は MTG 実施日の前月（{obsPreview ? `${fmtDate(obsPreview.from)}〜${fmtDate(obsPreview.to)}` : '—'}）を初期値とします。レポート画面で変更可能です。
              </p>
            </div>
          )}

          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose} disabled={creating}>
              キャンセル
            </Button>
            <Button type="button" variant="primary" onClick={handleCreate} disabled={creating}>
              {creating ? '作成中…' : isChildAfter ? '追加' : '作成'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
