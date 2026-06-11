import React from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * セクションカードのヘッダー左に置く折りたたみトグル（シェブロン）。
 * collapsed=true で右向き（-90deg）、false で下向き。
 */
export default function CollapseToggle({ collapsed, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="-ml-1 mr-0.5 rounded p-0.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
      title={collapsed ? '展開する' : '折りたたむ'}
      aria-label={collapsed ? '展開する' : '折りたたむ'}
    >
      <ChevronDown className={`h-4 w-4 transition-transform ${collapsed ? '-rotate-90' : ''}`} />
    </button>
  );
}
