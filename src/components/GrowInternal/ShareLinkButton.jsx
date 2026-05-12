import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Share2, ChevronDown, Link2, Link2Off, RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';
import { useManageCloseMeetingShareLink } from '../../hooks/useCloseMeetings';

function shareUrlFor(token) {
  if (!token) return '';
  return `${window.location.origin}/share/close-meeting/${token}`;
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success('共有リンクをコピーしました');
  } catch {
    toast.error('クリップボードへのコピーに失敗しました');
  }
}

/**
 * 共有リンクの発行 / コピー / 無効化 / 再発行ボタン。
 * 確定保存(finalized)前は無効（ツールチップ案内）。発行すると 90 日で自動失効。
 */
export default function ShareLinkButton({ record }) {
  const mut = useManageCloseMeetingShareLink();
  const [menuOpen, setMenuOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setMenuOpen(false);
    };
    if (menuOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const recordId = record?.id;
  const isFinalized = record?.status === 'finalized';
  const share = record?.share || null;
  const active = !!(share?.enabled && share?.token);
  const url = active ? shareUrlFor(share.token) : '';
  const expText = share?.expiresAt ? `有効期限: ${new Date(share.expiresAt).toLocaleDateString('ja-JP')}` : '';

  const handleMain = () => {
    if (!isFinalized) {
      toast('「確定保存」してから共有できます');
      return;
    }
    if (active) {
      copyToClipboard(url);
      return;
    }
    mut.mutate(
      { recordId, action: 'create' },
      {
        onSuccess: (s) => {
          if (s?.token) copyToClipboard(shareUrlFor(s.token));
          else toast.error('共有リンクの発行に失敗しました');
        },
        onError: (e) => toast.error(e?.message || '共有リンクの発行に失敗しました'),
      }
    );
  };

  const handleRevoke = () => {
    setMenuOpen(false);
    if (!window.confirm('共有リンクを無効化します。現在の URL は閲覧できなくなります。よろしいですか？')) return;
    mut.mutate(
      { recordId, action: 'revoke' },
      { onSuccess: () => toast.success('共有リンクを無効化しました'), onError: (e) => toast.error(e?.message || '無効化に失敗しました') }
    );
  };

  const handleRegenerate = () => {
    setMenuOpen(false);
    if (!window.confirm('共有リンクを再発行します。現在の URL は無効になります。よろしいですか？')) return;
    mut.mutate(
      { recordId, action: 'regenerate' },
      {
        onSuccess: (s) => {
          if (s?.token) copyToClipboard(shareUrlFor(s.token));
          toast.success('共有リンクを再発行しました');
        },
        onError: (e) => toast.error(e?.message || '再発行に失敗しました'),
      }
    );
  };

  return (
    <div className="relative inline-flex items-center" ref={ref}>
      <Button
        variant={active ? 'secondary' : 'primary'}
        size="sm"
        onClick={handleMain}
        disabled={mut.isPending || !isFinalized}
        title={!isFinalized ? '「確定保存」すると共有できます' : ''}
      >
        <Share2 className="h-4 w-4" />
        {mut.isPending ? '処理中…' : active ? '共有リンクをコピー' : '共有リンクを発行'}
      </Button>
      {active && (
        <>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="ml-1 rounded-md border border-stroke bg-white px-1.5 py-1.5 text-slate-500 transition hover:bg-gray-50"
            aria-label="共有リンクのメニュー"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full z-30 mt-1 w-72 rounded-lg border border-stroke bg-white py-1 text-sm shadow-lg">
              <div className="break-all px-3 py-2 text-xs text-slate-400">{url}</div>
              {expText && <div className="px-3 pb-1 text-[11px] text-slate-400">{expText}</div>}
              <div className="my-1 border-t border-stroke" />
              <button
                onClick={() => {
                  setMenuOpen(false);
                  copyToClipboard(url);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-slate-700 transition hover:bg-gray-50"
              >
                <Link2 className="h-3.5 w-3.5" />URL をコピー
              </button>
              <button onClick={handleRegenerate} className="flex w-full items-center gap-2 px-3 py-2 text-left text-slate-700 transition hover:bg-gray-50">
                <RefreshCw className="h-3.5 w-3.5" />再発行（旧 URL を無効化）
              </button>
              <button onClick={handleRevoke} className="flex w-full items-center gap-2 px-3 py-2 text-left text-red-600 transition hover:bg-red-50">
                <Link2Off className="h-3.5 w-3.5" />共有を無効化
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
