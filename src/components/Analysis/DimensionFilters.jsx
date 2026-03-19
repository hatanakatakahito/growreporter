import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Filter, ChevronDown, ChevronLeft, X, Search, Check } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../config/firebase';

/**
 * 利用可能なGA4ディメンション一覧
 */
const ALL_DIMENSIONS = [
  { key: 'sessionDefaultChannelGroup', label: 'チャネル', category: '集客' },
  { key: 'sessionSourceMedium', label: '参照元 / メディア', category: '集客' },
  { key: 'sessionSource', label: '参照元', category: '集客' },
  { key: 'sessionMedium', label: 'メディア', category: '集客' },
  { key: 'landingPagePlusQueryString', label: 'ランディングページ', category: 'ページ' },
  { key: 'pagePath', label: 'ページパス', category: 'ページ' },
  { key: 'deviceCategory', label: 'デバイス', category: 'ユーザー' },
  { key: 'country', label: '国', category: 'ユーザー' },
  { key: 'region', label: '地域', category: 'ユーザー' },
  { key: 'city', label: '市区町村', category: 'ユーザー' },
  { key: 'operatingSystem', label: 'OS', category: 'テクノロジー' },
  { key: 'browser', label: 'ブラウザ', category: 'テクノロジー' },
];

/**
 * ディメンション値の取得・選択パネル
 */
function DimensionValuePanel({ dimensionDef, siteId, startDate, endDate, selectedValues, onSelect, onBack }) {
  const [searchQuery, setSearchQuery] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);

  const { data: dimensionValues, isLoading } = useQuery({
    queryKey: ['ga4-dimension-values', siteId, startDate, endDate, dimensionDef.key],
    queryFn: async () => {
      const fetchGA4 = httpsCallable(functions, 'fetchGA4Data');
      const result = await fetchGA4({
        siteId,
        startDate,
        endDate,
        metrics: ['sessions'],
        dimensions: [dimensionDef.key],
      });
      const rows = result.data?.rows || [];
      return rows
        .map(row => ({
          value: row[dimensionDef.key],
          sessions: parseInt(row.sessions || 0),
        }))
        .filter(r => r.value && r.value !== '(not set)')
        .sort((a, b) => b.sessions - a.sessions);
    },
    enabled: !!siteId && !!startDate && !!endDate,
    staleTime: 10 * 60 * 1000,
  });

  const filteredValues = useMemo(() => {
    if (!dimensionValues) return [];
    if (!searchQuery.trim()) return dimensionValues;
    const q = searchQuery.trim().toLowerCase();
    return dimensionValues.filter(v => v.value.toLowerCase().includes(q));
  }, [dimensionValues, searchQuery]);

  const handleToggle = (value) => {
    const newSelected = selectedValues.includes(value)
      ? selectedValues.filter(v => v !== value)
      : [...selectedValues, value];
    onSelect(newSelected);
  };

  return (
    <>
      {/* ヘッダー: 戻るボタン + ディメンション名 */}
      <div className="flex items-center gap-2 border-b border-stroke px-3 py-2">
        <button onClick={onBack} className="rounded p-0.5 text-body-color hover:text-dark">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-medium text-dark">{dimensionDef.label}</span>
      </div>

      {/* 検索 */}
      <div className="border-b border-stroke p-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-body-color" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="検索..."
            className="w-full rounded-md border border-stroke bg-gray-1 py-1.5 pl-8 pr-3 text-sm text-dark placeholder:text-body-color/60 focus:border-primary focus:outline-none"
          />
        </div>
      </div>

      {/* 値リスト */}
      <div className="max-h-64 overflow-y-auto p-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="ml-2 text-sm text-body-color">読み込み中...</span>
          </div>
        ) : filteredValues.length === 0 ? (
          <div className="py-4 text-center text-sm text-body-color">
            {searchQuery ? '一致する項目がありません' : 'データがありません'}
          </div>
        ) : (
          filteredValues.map((item) => {
            const isChecked = selectedValues.includes(item.value);
            return (
              <button
                key={item.value}
                onClick={() => handleToggle(item.value)}
                className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                  isChecked ? 'bg-primary/5 text-primary' : 'text-dark hover:bg-gray-1'
                }`}
              >
                <div className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border ${
                  isChecked ? 'border-primary bg-primary' : 'border-stroke'
                }`}>
                  {isChecked && <Check className="h-3 w-3 text-white" />}
                </div>
                <span className="flex-1 truncate">{item.value}</span>
                <span className="flex-shrink-0 text-xs text-body-color">
                  {item.sessions.toLocaleString()}
                </span>
              </button>
            );
          })
        )}
      </div>

      {/* クリアボタン */}
      {selectedValues.length > 0 && (
        <div className="border-t border-stroke px-3 py-2">
          <button
            onClick={() => onSelect([])}
            className="text-xs text-body-color hover:text-primary"
          >
            この条件をクリア
          </button>
        </div>
      )}
    </>
  );
}

/**
 * ディメンションフィルタコンポーネント
 * 「ディメンションフィルタ」ボタンから全ディメンションを選択可能
 */
export default function DimensionFilters({
  siteId,
  startDate,
  endDate,
  filters = {},
  onFiltersChange,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDimension, setSelectedDimension] = useState(null);
  const dropdownRef = useRef(null);

  // 外側クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
        setSelectedDimension(null);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // カテゴリ別にグループ化
  const groupedDimensions = useMemo(() => {
    const groups = {};
    ALL_DIMENSIONS.forEach(dim => {
      if (!groups[dim.category]) groups[dim.category] = [];
      groups[dim.category].push(dim);
    });
    return groups;
  }, []);

  if (!siteId || !startDate || !endDate) return null;

  const activeFilterKeys = Object.keys(filters).filter(k => filters[k]?.length > 0);
  const hasActiveFilters = activeFilterKeys.length > 0;

  const handleOpenDimension = (dimDef) => {
    setSelectedDimension(dimDef);
  };

  const handleSelectValues = (dimensionKey, values) => {
    const newFilters = { ...filters };
    if (values.length === 0) {
      delete newFilters[dimensionKey];
    } else {
      newFilters[dimensionKey] = values;
    }
    onFiltersChange(newFilters);
  };

  const handleRemoveFilter = (dimensionKey) => {
    const newFilters = { ...filters };
    delete newFilters[dimensionKey];
    onFiltersChange(newFilters);
  };

  const handleToggleDropdown = () => {
    if (isOpen) {
      setIsOpen(false);
      setSelectedDimension(null);
    } else {
      setIsOpen(true);
      setSelectedDimension(null);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* メインボタン */}
      <div ref={dropdownRef} className="relative">
        <button
          onClick={handleToggleDropdown}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-all ${
            hasActiveFilters
              ? 'border-primary bg-primary/5 text-primary font-medium'
              : 'border-stroke bg-white text-body-color hover:border-primary/50 hover:text-dark'
          }`}
        >
          <Filter className="h-3.5 w-3.5" />
          <span>フィルタ設定</span>
          {hasActiveFilters && (
            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
              {activeFilterKeys.length}
            </span>
          )}
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* ドロップダウンパネル */}
        {isOpen && (
          <div className="absolute left-0 top-full z-50 mt-1 w-80 rounded-lg border border-stroke bg-white shadow-lg">
            {selectedDimension ? (
              /* Step 2: 値選択 */
              <DimensionValuePanel
                dimensionDef={selectedDimension}
                siteId={siteId}
                startDate={startDate}
                endDate={endDate}
                selectedValues={filters[selectedDimension.key] || []}
                onSelect={(values) => handleSelectValues(selectedDimension.key, values)}
                onBack={() => setSelectedDimension(null)}
              />
            ) : (
              /* Step 1: ディメンション一覧 */
              <div className="max-h-80 overflow-y-auto py-1">
                {Object.entries(groupedDimensions).map(([category, dims]) => (
                  <div key={category}>
                    <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-body-color/60">
                      {category}
                    </div>
                    {dims.map(dim => {
                      const activeCount = (filters[dim.key] || []).length;
                      return (
                        <button
                          key={dim.key}
                          onClick={() => handleOpenDimension(dim)}
                          className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm text-dark transition-colors hover:bg-gray-1"
                        >
                          <span>{dim.label}</span>
                          {activeCount > 0 && (
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                              {activeCount}件
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* アクティブなフィルタをタグ表示 */}
      {activeFilterKeys.map(dimKey => {
        const dim = ALL_DIMENSIONS.find(d => d.key === dimKey);
        const values = filters[dimKey];
        if (!dim || !values || values.length === 0) return null;
        return (
          <div
            key={dimKey}
            className="flex items-center gap-1 rounded-full border border-primary/30 bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary"
          >
            <span className="max-w-[200px] truncate">
              {dim.label}: {values.length === 1 ? values[0] : `${values.length}件`}
            </span>
            <button
              onClick={() => handleRemoveFilter(dimKey)}
              className="ml-0.5 rounded-full p-0.5 hover:bg-primary/10"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        );
      })}

      {/* 全クリアボタン */}
      {hasActiveFilters && (
        <button
          onClick={() => onFiltersChange({})}
          className="flex items-center gap-1 rounded-full px-2 py-1.5 text-xs text-body-color hover:text-primary"
        >
          <X className="h-3 w-3" />
          すべてクリア
        </button>
      )}
    </div>
  );
}

/**
 * filtersオブジェクトをGA4 API用のdimensionFilterに変換
 */
export function buildGA4DimensionFilter(filters) {
  if (!filters || Object.keys(filters).length === 0) return null;

  const filterExpressions = Object.entries(filters)
    .filter(([, values]) => values && values.length > 0)
    .map(([dimensionKey, values]) => ({
      filter: {
        fieldName: dimensionKey,
        inListFilter: { values },
      },
    }));

  if (filterExpressions.length === 0) return null;
  if (filterExpressions.length === 1) return filterExpressions[0];

  return {
    andGroup: { expressions: filterExpressions },
  };
}
