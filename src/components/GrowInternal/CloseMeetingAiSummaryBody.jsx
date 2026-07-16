import React from 'react';
import { FileText, ThumbsUp, ListTodo } from 'lucide-react';

/**
 * AI 総括（公開後）の本文：総括 / 良くなった点 / 残課題・次に取り組むこと の 3 ブロック。
 * 社内画面（CloseMeetingAiSummary）と共有リンクページ（SharedCloseMeeting）で共通利用。
 * 各セクションは色付きラベルバッジ＋淡い背景で見やすく。外側のカード枠は呼び出し側が用意する。
 */
const SECTION_THEMES = {
  summary: { Icon: FileText, label: '総括', wrap: 'bg-primary/[0.04]', badge: 'bg-primary/10 text-primary', dot: 'bg-primary' },
  good: { Icon: ThumbsUp, label: '良くなった点', wrap: 'bg-emerald-50/60', badge: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  next: { Icon: ListTodo, label: '残課題・次に取り組むこと', wrap: 'bg-amber-50/60', badge: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
};

function SectionLabel({ theme }) {
  const { Icon, label, badge } = theme;
  return (
    <div className={`mb-2 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[13px] font-bold ${badge}`}>
      <Icon className="h-4 w-4" />
      {label}
    </div>
  );
}

function ListSection({ themeKey, items }) {
  if (!Array.isArray(items) || items.length === 0) return null;
  const theme = SECTION_THEMES[themeKey];
  return (
    <div className={`rounded-lg px-4 py-3 ${theme.wrap}`}>
      <SectionLabel theme={theme} />
      <ul className="space-y-1.5 text-sm leading-7 text-slate-800">
        {items.map((g, i) => (
          <li key={i} className="flex gap-2">
            <span className={`mt-[11px] h-1.5 w-1.5 shrink-0 rounded-full ${theme.dot}`} />
            <span>{g}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const isEmpty = (s) => !s || (!s.summary && !(s.goodPoints || []).length && !(s.nextActions || []).length);

export default function CloseMeetingAiSummaryBody({ summary }) {
  if (isEmpty(summary)) return null;
  return (
    <div className="space-y-4">
      <div className={`rounded-lg px-4 py-3 ${SECTION_THEMES.summary.wrap}`}>
        <SectionLabel theme={SECTION_THEMES.summary} />
        <p className="whitespace-pre-wrap text-sm leading-7 text-slate-800">{summary.summary || '—'}</p>
      </div>
      <ListSection themeKey="good" items={summary.goodPoints} />
      <ListSection themeKey="next" items={summary.nextActions} />
    </div>
  );
}
