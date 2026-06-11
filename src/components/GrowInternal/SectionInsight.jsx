import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { Sparkles, Pencil, X as XIcon, Check, EyeOff, Eye } from 'lucide-react';
import { Button } from '../ui/button';
import { useCloseMeetingSectionInsight } from '../../hooks/useCloseMeetings';

/**
 * 各セクション末尾に添える「身近め」な AI 考察（再生成・手動編集つき）。
 * 各セクションカードの footer として描画する想定（上に区切り線つき）。
 *
 * @param {string} recordId
 * @param {string} sectionKey         summary | timeline | channels | keywords | pages | devices | kpiTarget
 * @param {Object} insight            record.sectionInsights[sectionKey]（{text, generatedAt, edited}）
 * @param {string[]} dataLines        生成時に AI へ渡すこのセクションのデータ行
 * @param {string} comparisonModeLabel
 * @param {boolean} hasComparison
 * @param {boolean} disabled          データ未取得などで生成不可
 * @param {boolean} readOnly          共有ページ等。テキスト表示のみ（ボタンなし）
 */
export default function SectionInsight({
  recordId,
  sectionKey,
  insight = null,
  dataLines = [],
  comparisonModeLabel = '公開前',
  hasComparison = true,
  disabled = false,
  readOnly = false,
}) {
  const mut = useCloseMeetingSectionInsight();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [hidden, setHidden] = useState(false);

  const text = insight?.text || '';
  const busy = mut.isPending;

  // 読み取り専用（共有ページ）: テキストが無ければ何も出さない。非表示トグルつき。
  if (readOnly) {
    if (!text) return null;
    return (
      <div className="rounded-md bg-slate-50 p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
            <Sparkles className="h-3.5 w-3.5 text-slate-400" />
            AI 考察
          </div>
          <button
            type="button"
            onClick={() => setHidden((h) => !h)}
            className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            {hidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            {hidden ? '表示' : '非表示'}
          </button>
        </div>
        {!hidden && <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{text}</p>}
      </div>
    );
  }

  const runGenerate = () => {
    if (!recordId) return;
    mut.mutate(
      {
        recordId,
        sectionKey,
        mode: 'generate',
        payload: { dataLines, comparisonModeLabel, hasComparison },
      },
      {
        onSuccess: (s) => toast.success(s ? 'AI 考察を生成しました' : 'AI から有効な応答が得られませんでした'),
        onError: (e) => toast.error(e?.message || 'AI 考察の生成に失敗しました'),
      }
    );
  };

  const startEdit = () => {
    setDraft(text);
    setEditing(true);
  };
  const saveEdit = () => {
    mut.mutate(
      { recordId, sectionKey, mode: 'save', text: (draft || '').trim() },
      {
        onSuccess: () => {
          setEditing(false);
          toast.success('考察を保存しました');
        },
        onError: (e) => toast.error(e?.message || '保存に失敗しました'),
      }
    );
  };

  return (
    <div className="rounded-md bg-slate-50 p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
          <Sparkles className="h-3.5 w-3.5 text-slate-400" />
          AI 考察
          {insight?.generatedAt && !editing && (
            <span className="font-normal text-slate-400">
              {insight.edited ? '編集' : '生成'}: {new Date(insight.generatedAt).toLocaleString('ja-JP')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {!hidden && (editing ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={busy}>
                <XIcon className="h-3.5 w-3.5" />
                キャンセル
              </Button>
              <Button variant="primary" size="sm" onClick={saveEdit} disabled={busy}>
                <Check className="h-3.5 w-3.5" />
                {busy ? '保存中…' : '保存'}
              </Button>
            </>
          ) : (
            <>
              <Button variant="ai" size="sm" onClick={runGenerate} disabled={busy || disabled}>
                <Sparkles className="h-3.5 w-3.5" />
                {busy ? '生成中…' : text ? '再生成' : 'AI 考察を生成'}
              </Button>
              {text && (
                <Button variant="ghost" size="sm" onClick={startEdit} disabled={busy}>
                  <Pencil className="h-3.5 w-3.5" />
                  手動編集
                </Button>
              )}
            </>
          ))}
          {!editing && (
            <button
              type="button"
              onClick={() => setHidden((h) => !h)}
              className="flex items-center gap-1 rounded px-1.5 py-1 text-[11px] text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              title={hidden ? '考察を表示' : '考察を非表示'}
            >
              {hidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              {hidden ? '表示' : '非表示'}
            </button>
          )}
        </div>
      </div>

      {hidden ? null : editing ? (
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
          className="w-full rounded-md border border-stroke px-3 py-2 text-sm leading-7 text-slate-800 placeholder:text-slate-300 focus:border-primary focus:outline-none"
          placeholder="このセクションの考察を入力（クライアントに添える一言）"
        />
      ) : text ? (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{text}</p>
      ) : (
        <p className="text-[13px] text-slate-400">
          {disabled
            ? 'データの取得後に考察を生成できます。'
            : '「AI 考察を生成」を押すと、このセクションの数値をもとに短い考察を作成します。'}
        </p>
      )}
    </div>
  );
}
