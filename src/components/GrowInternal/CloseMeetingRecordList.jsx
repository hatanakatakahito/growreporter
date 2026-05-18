import React, { useMemo, useState } from 'react';
import { Plus, MoreVertical, Trash2, ChevronRight, CalendarDays } from 'lucide-react';
import { Button } from '../ui/button';
import { recordDisplayLabel, meetingSessionLabel, fmtDate } from './closeMeetingFormat';

/**
 * サイトのリニューアル記録一覧（launchDate でグループ化）
 *  - 各グループ = 同じ「リニューアル公開日」のクローズMTG + アフターMTG #2, #3...
 *  - 各グループ末尾に「+ アフターMTG を追加」ボタン（親 = type==='close' の record に対して）
 *  - クローズMTG にアフターが紐付いていれば、クローズMTG 自体は削除不可（サーバ側でブロック）
 */
export default function CloseMeetingRecordList({ records = [], onOpen, onNew, onAddAfter, onDelete, deleting = false }) {
  const [menuFor, setMenuFor] = useState(null);

  // launchDate でグループ化し、各グループ内は seq 昇順（クローズMTG → アフターMTG #2 → #3 ...）
  const groups = useMemo(() => {
    const map = new Map();
    for (const rec of records) {
      const key = rec.launchDate || '__unknown__';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(rec);
    }
    // launchDate 降順（新しい順）
    const sortedKeys = [...map.keys()].sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));
    return sortedKeys.map((launchDate) => {
      const items = map.get(launchDate).slice().sort((a, b) => {
        const sa = Number.isFinite(a.meetingSeq) ? a.meetingSeq : 1;
        const sb = Number.isFinite(b.meetingSeq) ? b.meetingSeq : 1;
        return sa - sb;
      });
      const closeRecord = items.find((r) => (r.meetingType || 'close') === 'close') || items[0];
      const hasChildren = items.some((r) => r.meetingType === 'after');
      return { launchDate, items, closeRecord, hasChildren };
    });
  }, [records]);

  const handleDelete = (rec) => {
    setMenuFor(null);
    if (window.confirm(`「${meetingSessionLabel(rec)}（${recordDisplayLabel(rec)}）」を削除しますか？この操作は取り消せません。`)) {
      onDelete(rec.id);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-800">リニューアル記録</h2>
        <Button variant="primary" onClick={onNew}>
          <Plus className="h-4 w-4" />
          新規リニューアル記録を作成
        </Button>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-lg border border-stroke bg-white p-12 text-center">
          <p className="text-body-color">
            まだリニューアル記録がありません。「新規リニューアル記録を作成」から公開日を登録してください。
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {groups.map((group) => (
            <li key={group.launchDate} className="rounded-xl border border-stroke bg-white p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <CalendarDays className="h-4 w-4 text-slate-400" />
                <span>{recordDisplayLabel(group.closeRecord)}</span>
                <span className="text-xs font-normal text-slate-400">（公開日 {fmtDate(group.launchDate)}）</span>
              </div>
              <ul className="space-y-2">
                {group.items.map((rec) => {
                  const isClose = (rec.meetingType || 'close') === 'close';
                  const canDelete = rec.status !== 'finalized' && !(isClose && group.hasChildren);
                  return (
                    <li
                      key={rec.id}
                      className="flex items-center justify-between rounded-lg border border-stroke bg-white px-4 py-3 transition hover:bg-gray-50"
                    >
                      <button type="button" className="flex flex-1 items-center gap-4 text-left" onClick={() => onOpen(rec.id)}>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
                            <span
                              className={`inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
                                isClose ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'
                              }`}
                            >
                              {meetingSessionLabel(rec)}
                            </span>
                            {rec.label && <span className="truncate text-slate-600">{rec.label}</span>}
                          </div>
                          <div className="mt-0.5 text-xs text-slate-500">
                            {rec.meetingDate ? `MTG 実施日 ${fmtDate(rec.meetingDate)}` : 'MTG 実施日 未設定'}
                            {rec.createdByEmail ? ` / 作成 ${rec.createdByEmail}` : ''}
                          </div>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            rec.status === 'finalized' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {rec.status === 'finalized' ? '確定済み' : '下書き'}
                        </span>
                      </button>
                      <div className="ml-3 flex items-center gap-1">
                        <Button variant="secondary" size="sm" onClick={() => onOpen(rec.id)}>
                          開く
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                        {canDelete && (
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setMenuFor(menuFor === rec.id ? null : rec.id)}
                              className="rounded p-1.5 text-slate-400 transition hover:bg-gray-100 hover:text-slate-600"
                              aria-label="メニュー"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>
                            {menuFor === rec.id && (
                              <div className="absolute right-0 top-full z-10 mt-1 w-32 rounded-lg border border-stroke bg-white py-1 shadow-lg">
                                <button
                                  type="button"
                                  onClick={() => handleDelete(rec)}
                                  disabled={deleting}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  削除
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
              {group.closeRecord && (
                <div className="mt-3 flex justify-end">
                  <Button variant="ghost" size="sm" onClick={() => onAddAfter(group.closeRecord)}>
                    <Plus className="h-3.5 w-3.5" />
                    アフターMTG を追加
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
