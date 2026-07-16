import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { Globe, ChevronDown, Search, Check, Plus } from 'lucide-react';

/**
 * ヘッダー用サイト切替セレクター
 * - フルラウンドのピル型トリガー（アイコンバッジ + サイト名）
 * - 検索付きリッチドロップダウン（頭文字アバター + URL + 新規登録導線）
 * 旧: ネイティブ <select>。Headless UI Popover に置き換え。
 */
export default function SiteSwitcher({ sites = [], selectedSite, onChange }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const getHost = (url) => {
    if (!url) return '';
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return url
        .replace(/^https?:\/\//, '')
        .replace(/^www\./, '')
        .replace(/\/.*$/, '');
    }
  };

  const getInitial = (name) => (name || '?').trim().charAt(0) || '?';

  const filteredSites =
    query.trim() === ''
      ? sites
      : sites.filter((s) => {
          const q = query.trim().toLowerCase();
          return (
            (s.siteName || '').toLowerCase().includes(q) ||
            (s.siteUrl || '').toLowerCase().includes(q)
          );
        });

  return (
    <Popover className="relative">
      {({ open }) => (
        <>
          <PopoverButton className="group flex items-center gap-2 rounded-lg border border-white/60 bg-white/[0.72] py-1.5 pl-1.5 pr-3.5 text-sm font-semibold text-dark shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] backdrop-blur-[16px] backdrop-saturate-[1.8] transition-all duration-300 hover:-translate-y-px hover:bg-white/[0.85] hover:shadow-[0_12px_40px_-8px_rgba(0,0,0,0.08)] focus:outline-none">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-purple text-[11px] font-bold text-white">
              {selectedSite ? getInitial(selectedSite.siteName) : <Globe className="h-3.5 w-3.5" />}
            </span>
            <span className="max-w-[16rem] truncate">
              {selectedSite?.siteName || 'サイトを選択'}
            </span>
            <ChevronDown
              className={`h-3.5 w-3.5 shrink-0 text-body-color transition-transform ${open ? 'rotate-180' : ''}`}
              strokeWidth={2.5}
            />
          </PopoverButton>

          <PopoverPanel
            anchor="bottom start"
            focus
            className="z-50 mt-2 w-80 rounded-2xl border border-stroke bg-white p-1.5 shadow-[0_4px_16px_rgba(17,24,39,0.06)] focus:outline-none"
          >
            {({ close }) => (
              <>
                {/* 検索 */}
                <div className="p-1.5">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-body-color" />
                    <input
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="サイトを検索…"
                      className="w-full rounded-full border border-stroke bg-gray-50 py-2 pl-9 pr-3 text-sm text-dark placeholder:text-body-color focus:border-primary focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>

                <p className="px-3 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-body-color">
                  サイトを切り替え（{sites.length}件）
                </p>

                {/* リスト */}
                <div className="max-h-72 overflow-y-auto px-0.5 pb-0.5">
                  {filteredSites.length === 0 ? (
                    <p className="px-3 py-6 text-center text-sm text-body-color">
                      該当するサイトがありません
                    </p>
                  ) : (
                    filteredSites.map((site) => {
                      const isSelected = selectedSite?.id === site.id;
                      return (
                        <button
                          key={site.id}
                          type="button"
                          onClick={() => {
                            onChange?.(site.id);
                            setQuery('');
                            close();
                          }}
                          className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-gray-50 ${
                            isSelected ? 'bg-primary/5' : ''
                          }`}
                        >
                          <span
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                              isSelected
                                ? 'bg-gradient-to-br from-primary to-primary-purple text-white'
                                : 'bg-gray-100 text-body-color'
                            }`}
                          >
                            {getInitial(site.siteName)}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span
                              className={`block truncate text-sm text-dark ${
                                isSelected ? 'font-semibold' : 'font-medium'
                              }`}
                            >
                              {site.siteName}
                            </span>
                            <span className="block truncate text-[11px] text-body-color">
                              {getHost(site.siteUrl)}
                            </span>
                          </span>
                          {isSelected && (
                            <Check className="h-4 w-4 shrink-0 text-primary" strokeWidth={2.5} />
                          )}
                        </button>
                      );
                    })
                  )}
                </div>

                {/* 新規サイト登録 */}
                <div className="mt-1 border-t border-stroke pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setQuery('');
                      close();
                      navigate('/sites/new');
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-primary transition-colors hover:bg-primary/5"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Plus className="h-4 w-4" />
                    </span>
                    新規サイト登録
                  </button>
                </div>
              </>
            )}
          </PopoverPanel>
        </>
      )}
    </Popover>
  );
}
