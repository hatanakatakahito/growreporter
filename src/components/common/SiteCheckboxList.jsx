import { Globe, CheckCircle, Circle } from 'lucide-react';

/**
 * サイト選択用の共通チェックボックスリスト
 *
 * 同じ UI が複数モーダル (AssignSitesModal / InviteMemberModal / RoleManagementModal /
 * SiteTransferModal) で使われていたため共通化。
 *
 * @param {Object} props
 * @param {Array<{id, siteName, siteUrl, url}>} props.sites - 表示するサイト一覧
 * @param {string[]} props.selectedSiteIds - 選択中のサイト ID 配列
 * @param {(siteId: string) => void} props.onToggle - サイトのトグル
 * @param {boolean} [props.disabled=false]
 * @param {string} [props.emptyMessage='サイトが登録されていません。'] - サイト 0 件のときの文言
 * @param {string} [props.maxHeight='max-h-72'] - tailwind class for max height
 */
export default function SiteCheckboxList({
  sites = [],
  selectedSiteIds = [],
  onToggle,
  disabled = false,
  emptyMessage = 'サイトが登録されていません。',
  maxHeight = 'max-h-72',
}) {
  const selectedSet = Array.isArray(selectedSiteIds) ? new Set(selectedSiteIds) : selectedSiteIds;
  const isSelected = (id) => (selectedSet instanceof Set ? selectedSet.has(id) : selectedSiteIds.includes(id));

  if (!sites || sites.length === 0) {
    return (
      <div className="rounded-lg border border-stroke bg-gray-50 p-3 text-sm text-body-color dark:border-dark-3 dark:bg-dark-3">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={`${maxHeight} space-y-1 overflow-y-auto rounded-lg border border-stroke bg-white p-2 dark:border-dark-3 dark:bg-dark`}>
      {sites.map((site) => {
        const checked = isSelected(site.id);
        return (
          <button
            type="button"
            key={site.id}
            onClick={() => onToggle?.(site.id)}
            disabled={disabled}
            className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${
              checked ? 'bg-primary/5' : 'hover:bg-gray-50 dark:hover:bg-dark-3'
            }`}
          >
            {checked ? (
              <CheckCircle className="h-5 w-5 flex-shrink-0 text-primary" />
            ) : (
              <Circle className="h-5 w-5 flex-shrink-0 text-gray-300" />
            )}
            <Globe className="h-4 w-4 flex-shrink-0 text-body-color" />
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium text-dark dark:text-white">
                {site.siteName || site.url || site.siteUrl || '(名称未設定)'}
              </div>
              {(site.url || site.siteUrl) && (
                <div className="truncate text-xs text-body-color">{site.url || site.siteUrl}</div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
