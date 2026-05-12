import React, { useState } from 'react';
import { Plus, MoreVertical, Trash2, ChevronRight } from 'lucide-react';
import { Button } from '../ui/button';
import { recordDisplayLabel, fmtDate } from './closeMeetingFormat';

/**
 * サイトのリニューアル記録一覧（カードリスト）
 * - 記録が 1 件のときは呼び出し側で一覧をスキップして直接レポートに行く想定
 * - 下書き(draft)のみ「…」メニューから削除可
 */
export default function CloseMeetingRecordList({ records = [], onOpen, onNew, onDelete, deleting = false }) {
  const [menuFor, setMenuFor] = useState(null);

  const handleDelete = (rec) => {
    setMenuFor(null);
    if (window.confirm(`「${recordDisplayLabel(rec)}」を削除しますか？この操作は取り消せません。`)) {
      onDelete(rec.id);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-800">リニューアル記録</h2>
        <Button variant="primary" onClick={onNew}>
          <Plus className="h-4 w-4" />
          新規リニューアル記録を作成
        </Button>
      </div>

      {records.length === 0 ? (
        <div className="rounded-lg border border-stroke bg-white p-12 text-center">
          <p className="text-body-color">
            まだリニューアル記録がありません。「新規リニューアル記録を作成」から公開日を登録してください。
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {records.map((rec) => (
            <li
              key={rec.id}
              className="flex items-center justify-between rounded-lg border border-stroke bg-white px-4 py-3 transition hover:bg-gray-50"
            >
              <button type="button" className="flex flex-1 items-center gap-4 text-left" onClick={() => onOpen(rec.id)}>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-slate-800">{recordDisplayLabel(rec)}</div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    公開日 {fmtDate(rec.launchDate)}
                    {rec.meetingDate ? ` / クローズMTG ${fmtDate(rec.meetingDate)}` : ''}
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
                {rec.status !== 'finalized' && (
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
          ))}
        </ul>
      )}
    </div>
  );
}
