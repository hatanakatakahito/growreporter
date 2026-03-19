import { useState } from 'react';
import { AlertCircle, Check, ArrowUpCircle } from 'lucide-react';
import { useSite } from '../../contexts/SiteContext';
import UpgradeModal from './UpgradeModal';
import { Dialog, DialogBody, DialogActions } from '../ui/dialog';
import { Button } from '../ui/button';

/**
 * サイト選択モーダル（ダウングレード時）
 * プラン上限を超えるサイトがある場合、有効にするサイトを選択させる
 */
export default function SiteSelectionModal() {
  const { needsSiteSelection, allSites, maxSites, confirmSiteSelection } = useSite();
  const [selectedIds, setSelectedIds] = useState([]);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  const handleToggle = (siteId) => {
    if (maxSites === 1) {
      // 1サイトのみの場合はラジオボタン的に動作
      setSelectedIds([siteId]);
    } else {
      setSelectedIds(prev => {
        if (prev.includes(siteId)) {
          return prev.filter(id => id !== siteId);
        }
        if (prev.length >= maxSites) return prev;
        return [...prev, siteId];
      });
    }
  };

  const handleConfirm = () => {
    if (selectedIds.length === 0 || selectedIds.length > maxSites) return;
    confirmSiteSelection(selectedIds);
  };

  return (
    <>
      <Dialog open={needsSiteSelection} onClose={() => {}} size="lg">
        {/* カスタムヘッダー */}
        <div className="-mx-(--gutter) -mt-(--gutter) border-b border-stroke bg-gradient-to-r from-blue-500 to-pink-500 p-6 dark:border-dark-3 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
              <AlertCircle className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                有効にするサイトを選択してください
              </h2>
              <p className="mt-1 text-sm text-white/80">
                現在のプランでは最大{maxSites}サイトまで利用可能です
              </p>
            </div>
          </div>
        </div>

        <DialogBody>
          <p className="mb-4 text-sm text-body-color">
            登録サイト数（{allSites.length}サイト）がプランの上限を超えています。利用するサイトを{maxSites}つ選択してください。
          </p>

          <div className="space-y-3">
            {allSites.map((site) => {
              const isSelected = selectedIds.includes(site.id);
              return (
                <button
                  key={site.id}
                  onClick={() => handleToggle(site.id)}
                  className={`w-full rounded-lg border-2 p-4 text-left transition ${
                    isSelected
                      ? 'border-primary bg-blue-50 dark:bg-blue-900/20'
                      : 'border-stroke hover:border-primary/50 dark:border-dark-3 dark:hover:border-dark-4'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 transition ${
                      isSelected
                        ? 'border-primary bg-primary'
                        : 'border-gray-300 dark:border-dark-4'
                    }`}>
                      {isSelected && <Check className="h-4 w-4 text-white" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-dark dark:text-white">
                        {site.siteName}
                      </p>
                      <p className="truncate text-xs text-body-color">{site.siteUrl}</p>
                    </div>
                    {/* GA4/GSC連携状況 */}
                    <div className="flex flex-shrink-0 gap-1.5">
                      {site.ga4PropertyId && (
                        <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-900/20 dark:text-green-400">
                          GA4
                        </span>
                      )}
                      {site.gscSiteUrl && (
                        <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
                          GSC
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <p className="mt-4 text-xs text-body-color">
            ※ 選択しなかったサイトのデータは保持されます。プランをアップグレードすると再度アクセスできます。
          </p>
        </DialogBody>

        <DialogActions>
          <Button
            outline
            onClick={() => setIsUpgradeModalOpen(true)}
          >
            <ArrowUpCircle className="h-4 w-4" />
            プランをアップグレードする
          </Button>
          <Button
            color="blue"
            onClick={handleConfirm}
            disabled={selectedIds.length === 0 || selectedIds.length > maxSites}
          >
            選択したサイトを有効にする（{selectedIds.length}/{maxSites}）
          </Button>
        </DialogActions>
      </Dialog>

      {/* アップグレードモーダル */}
      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
      />
    </>
  );
}
