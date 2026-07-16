import { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../config/firebase';
import { Dialog, DialogTitle, DialogBody, DialogActions } from '../ui/dialog';
import { Button } from '../ui/button';
import { ArrowLeft, AlertTriangle, Globe } from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * サイト所有権取り戻しモーダル
 * 誤操作 / 顧客退会対応 / サポート時に admin がサイトを取り戻す。
 *
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {() => void} props.onClose
 * @param {Array<{id, siteName, siteUrl}>} props.targetSites - 取り戻し対象サイト
 * @param {Object} [props.currentOwner] - 現在のオーナー (表示用)
 * @param {() => void} [props.onReversed]
 */
export default function SiteReverseTransferModal({
  isOpen, onClose, targetSites = [], currentOwner = null, onReversed,
}) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClose = () => {
    if (isLoading) return;
    onClose();
  };

  const handleExecute = async () => {
    if (targetSites.length === 0) {
      toast.error('対象サイトがありません');
      return;
    }
    setIsLoading(true);
    try {
      const fn = httpsCallable(functions, 'adminReverseSiteOwnership');
      const result = await fn({ siteIds: targetSites.map(s => s.id) });
      if (result.data?.success) {
        toast.success(`${result.data.reversedCount} 件のサイトを取り戻しました`);
        if (result.data.failedSites?.length > 0) {
          toast(`${result.data.failedSites.length} 件失敗 (詳細は ActivityLogs)`);
        }
        onReversed?.();
        onClose();
      } else {
        toast.error(`取り戻し失敗: 全て失敗 (${result.data.failedSites?.length || 0} 件)`);
      }
    } catch (err) {
      toast.error(`取り戻し失敗: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={handleClose} size="lg">
      <DialogTitle>
        <div className="flex items-center gap-2">
          <ArrowLeft className="h-5 w-5 text-amber-600" />
          サイトを取り戻す
        </div>
      </DialogTitle>

      <DialogBody>
        <div className="space-y-4">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/50 dark:bg-amber-900/20">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-800 dark:text-amber-200">
                取り戻すと、現在のオーナーのダッシュボードから該当サイトが消えます。誤操作のリカバリーや顧客退会時にご利用ください。
              </p>
            </div>
          </div>

          {currentOwner && (
            <div className="text-sm">
              <span className="text-body-color">現在のオーナー:</span>{' '}
              <span className="font-medium">
                {currentOwner.name
                  || `${currentOwner.lastName || ''} ${currentOwner.firstName || ''}`.trim()
                  || currentOwner.email}
              </span>{' '}
              <span className="text-xs text-body-color">({currentOwner.email})</span>
            </div>
          )}

          <div>
            <p className="text-sm font-medium mb-2">対象 ({targetSites.length} 件):</p>
            <ul className="space-y-1">
              {targetSites.map(site => (
                <li key={site.id} className="flex items-center gap-2 text-sm text-body-color">
                  <Globe className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">
                    {site.siteName || site.id}
                    {site.siteUrl && <span className="text-xs ml-1">— {site.siteUrl}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800 dark:border-blue-900/50 dark:bg-blue-900/20 dark:text-blue-200">
            ※ 取り戻し後は OAuth トークン参照先 (admin) はそのまま、サイト所有者だけが admin に戻ります。
          </div>
        </div>
      </DialogBody>

      <DialogActions>
        <Button variant="ghost" onClick={handleClose} disabled={isLoading}>キャンセル</Button>
        <Button variant="danger-outline" onClick={handleExecute} disabled={isLoading}>
          {isLoading ? '取り戻し中...' : '取り戻す'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
