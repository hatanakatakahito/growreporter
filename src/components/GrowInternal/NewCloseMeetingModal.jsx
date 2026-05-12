import React, { useState } from 'react';
import { format } from 'date-fns';
import { X } from 'lucide-react';
import { Button } from '../ui/button';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * 新規リニューアル記録の作成モーダル（入力は公開日のみ）
 */
export default function NewCloseMeetingModal({ open, onClose, onCreate, creating = false, siteName = '' }) {
  const [launchDate, setLaunchDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [error, setError] = useState('');

  if (!open) return null;

  const handleCreate = () => {
    if (!DATE_RE.test(launchDate) || Number.isNaN(Date.parse(launchDate))) {
      setError('公開日（YYYY-MM-DD）を入力してください');
      return;
    }
    setError('');
    onCreate(launchDate);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-stroke px-5 py-3">
          <h3 className="text-base font-semibold text-slate-800">新規リニューアル記録を作成</h3>
          <button onClick={onClose} className="text-slate-400 transition hover:text-slate-600" aria-label="閉じる">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-5 py-4">
          <p className="mb-3 text-sm text-slate-600">
            {siteName && <span className="font-medium text-slate-800">{siteName}</span>} のリニューアル公開日を入力してください。
          </p>
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
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose} disabled={creating}>
              キャンセル
            </Button>
            <Button type="button" variant="primary" onClick={handleCreate} disabled={creating}>
              {creating ? '作成中…' : '作成'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
