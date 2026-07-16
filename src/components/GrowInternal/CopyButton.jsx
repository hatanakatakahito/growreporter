import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { Copy, Check, Image as ImageIcon } from 'lucide-react';
import { copyHtmlTable, copyChartAsPng, copyHtmlBlock } from '../../utils/reportClipboard';

/**
 * クローズMTG画面のコピーボタン（Notion 等への貼り付け対応）
 *
 * variant:
 *   - 'html-table'   : getTarget() が返す <table>（または table を含む要素）を HTML+テキストでコピー
 *   - 'chart-image'  : getTarget() が返す要素内の <svg> を PNG 化してコピー（非対応ブラウザは DL）
 *   - 'report-html'  : getHtml() の HTML（見出し+表+グラフ画像など）をまとめてコピー
 */
export default function CopyButton({
  variant = 'html-table',
  getTarget,
  getHtml,
  getPlainText,
  label,
  filename = 'chart.png',
  className = '',
}) {
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const resolve = (v) => (typeof v === 'function' ? v() : v);

  const handleClick = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (variant === 'html-table') {
        const ok = await copyHtmlTable(resolve(getTarget));
        if (!ok) {
          toast.error('コピーに失敗しました');
          return;
        }
        toast.success('表をコピーしました（Notion 等に貼り付けできます）');
      } else if (variant === 'chart-image') {
        const res = await copyChartAsPng(resolve(getTarget), filename);
        if (!res) {
          toast.error('画像のコピーに失敗しました');
          return;
        }
        if (res === 'download') {
          toast.success('画像をダウンロードしました（このブラウザはクリップボード画像に未対応）');
        } else {
          toast.success('グラフを画像としてコピーしました');
        }
      } else if (variant === 'report-html') {
        const html = await resolve(getHtml);
        const text = typeof getPlainText === 'function' ? getPlainText() : getPlainText;
        const ok = await copyHtmlBlock(html, text);
        if (!ok) {
          toast.error('コピーに失敗しました');
          return;
        }
        toast.success('レポートをコピーしました（Notion 等に貼り付けできます）');
      }
      setDone(true);
      setTimeout(() => setDone(false), 1500);
    } catch (e) {
      console.error('[CopyButton]', e);
      toast.error('コピーに失敗しました');
    } finally {
      setBusy(false);
    }
  };

  const Icon = done ? Check : variant === 'chart-image' ? ImageIcon : Copy;
  const defaultLabel =
    variant === 'chart-image'
      ? '画像としてコピー'
      : variant === 'report-html'
        ? 'レポート全体をコピー'
        : '表をコピー';

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      className={`inline-flex items-center gap-1.5 rounded-lg border border-stroke bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-gray-50 disabled:opacity-50 ${className}`}
    >
      <Icon className="h-3.5 w-3.5 text-slate-400" />
      {label || defaultLabel}
    </button>
  );
}
