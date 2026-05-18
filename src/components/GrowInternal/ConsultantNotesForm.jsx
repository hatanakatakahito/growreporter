import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { Button } from '../ui/button';

const FIELDS = ['background', 'challenge', 'purpose', 'qualitativeGoal', 'quantitativeGoal', 'remarks'];

const normalize = (notes) => ({
  background: (notes?.background || '').trim(),
  challenge: (notes?.challenge || '').trim(),
  purpose: (notes?.purpose || '').trim(),
  qualitativeGoal: (notes?.qualitativeGoal || '').trim(),
  quantitativeGoal: (notes?.quantitativeGoal || '').trim(),
  remarks: (notes?.remarks || '').trim(),
});

const hasAnyContent = (notes) => FIELDS.some((k) => !!(notes?.[k] && String(notes[k]).trim()));

/**
 * 担当者メモ（すべて任意・アコーディオン開閉式・白カード）。
 * 入力内容は「保存」ボタンで記録に保存し、AI 総括（公開後）の生成時に参照する。
 * 項目: 背景 / 課題 / 目的 / 定性目標 / 定量目標 / 備考
 */
export default function ConsultantNotesForm({ notes, onSave, saving = false }) {
  const [open, setOpen] = useState(() => hasAnyContent(notes));
  const [background, setBackground] = useState('');
  const [challenge, setChallenge] = useState('');
  const [purpose, setPurpose] = useState('');
  const [qualitativeGoal, setQualitativeGoal] = useState('');
  const [quantitativeGoal, setQuantitativeGoal] = useState('');
  const [remarks, setRemarks] = useState('');

  useEffect(() => {
    setBackground(notes?.background || '');
    setChallenge(notes?.challenge || '');
    setPurpose(notes?.purpose || '');
    setQualitativeGoal(notes?.qualitativeGoal || '');
    setQuantitativeGoal(notes?.quantitativeGoal || '');
    setRemarks(notes?.remarks || '');
  }, [notes]);

  const current = useMemo(
    () => ({
      background: background.trim(),
      challenge: challenge.trim(),
      purpose: purpose.trim(),
      qualitativeGoal: qualitativeGoal.trim(),
      quantitativeGoal: quantitativeGoal.trim(),
      remarks: remarks.trim(),
    }),
    [background, challenge, purpose, qualitativeGoal, quantitativeGoal, remarks],
  );
  const saved = normalize(notes);
  const dirty = FIELDS.some((k) => current[k] !== saved[k]);

  const save = () => {
    if (!dirty || saving) return;
    onSave(current);
  };

  const taProps = (value, setter) => ({
    value,
    onChange: (e) => setter(e.target.value),
    rows: 3,
    className:
      'mt-1.5 w-full rounded-md border border-stroke px-3 py-2 text-sm text-slate-800 placeholder:text-slate-300 focus:border-primary focus:outline-none',
  });

  const filled = hasAnyContent(notes);

  return (
    <section className="overflow-hidden rounded-xl border border-stroke bg-white shadow-sm">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between gap-2 px-5 py-3.5">
        <span className="flex items-center gap-2 text-[15px] font-semibold text-slate-800">
          <svg className="h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M11 5h10M11 12h10M11 19h10M3 5l2 2 3-3M3 12l2 2 3-3M3 19l2 2 3-3" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          担当者メモ <span className="font-normal text-sm text-slate-400">（任意）</span>
          {filled && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">入力あり</span>}
        </span>
        <ChevronDown className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="border-t border-stroke px-5 py-4">
          <p className="mb-3 text-[13px] text-slate-500">
            背景・課題・目的・目標（定性・定量）・備考を保存すると、AI 分析時に加味されます（空欄のままでも作成できます）。
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-600">背景</label>
              <textarea {...taProps(background, setBackground)} placeholder="リニューアル前の状況・経緯" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">課題</label>
              <textarea {...taProps(challenge, setChallenge)} placeholder="リニューアル前に抱えていた課題" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">目的</label>
              <textarea {...taProps(purpose, setPurpose)} placeholder="このリニューアルで実現したかったこと（狙い）" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">定性目標</label>
              <textarea {...taProps(qualitativeGoal, setQualitativeGoal)} placeholder="ありたい状態（例: 訪問者がサービス内容を理解した上で問い合わせる）" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">定量目標</label>
              <textarea {...taProps(quantitativeGoal, setQuantitativeGoal)} placeholder="数値目標（例: CV数 月50件、CVR 1%）" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">備考</label>
              <textarea
                {...taProps(remarks, setRemarks)}
                placeholder="補足事項（例: CV＝予約完了イベント / GA4プロパティを4/1に再作成のため公開前データなし / リニューアル範囲は予約システム＋下層ページ 等）"
              />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-end gap-3">
            {!dirty && filled && (
              <span className="flex items-center gap-1 text-xs text-slate-400">
                <Check className="h-3.5 w-3.5" />
                保存済み
              </span>
            )}
            {dirty && <span className="text-xs text-amber-600">未保存の変更があります</span>}
            <Button variant="primary" size="sm" onClick={save} disabled={!dirty || saving}>
              {saving ? '保存中…' : '保存'}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
