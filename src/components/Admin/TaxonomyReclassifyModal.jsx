import { useState, useEffect } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../config/firebase';
import { Dialog, DialogTitle, DialogDescription, DialogBody, DialogActions } from '../ui/dialog';
import { Button } from '../ui/button';
import DotWaveSpinner from '../common/DotWaveSpinner';
import SingleSelectField from '../GrowReporter/SiteRegistration/SingleSelectField';
import IndustryPickerV2 from '../GrowReporter/SiteRegistration/IndustryPickerV2';
import { BUSINESS_MODELS } from '../../constants/businessModels';
import { SITE_ROLES } from '../../constants/siteRoles';
import { useInferSiteTaxonomy } from '../../hooks/useInferSiteTaxonomy';
import { Wand2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * 管理者向けタクソノミー V2 再分類モーダル。
 *
 * 移行スクリプトで needsManualReclassify=true が付与されたサイトや、
 * 管理者が任意に分類を修正したい場合に使用する。
 *
 * @param {Object} props
 * @param {Object} props.site - 対象サイト (siteId, siteName, siteUrl, businessModel, industryMajor, industryMinor, siteRole を含む)
 * @param {function(): void} props.onClose
 * @param {function(): void} [props.onSuccess] - 確定成功後のコールバック（一覧再取得など）
 */
export default function TaxonomyReclassifyModal({ site, onClose, onSuccess }) {
  const [form, setForm] = useState({
    businessModel: site?.businessModel || '',
    industryMajor: site?.industryMajor || '',
    industryMinor: site?.industryMinor || '',
    siteRole: site?.siteRole || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { mutateAsync: inferTaxonomy, isPending: isInferring } = useInferSiteTaxonomy();

  useEffect(() => {
    setForm({
      businessModel: site?.businessModel || '',
      industryMajor: site?.industryMajor || '',
      industryMinor: site?.industryMinor || '',
      siteRole: site?.siteRole || '',
    });
  }, [site?.siteId]);

  const canSubmit =
    !!form.businessModel && !!form.industryMajor && !!form.industryMinor && !!form.siteRole;

  const handleInfer = async () => {
    if (!site?.siteUrl) {
      toast.error('サイトURLが取得できません');
      return;
    }
    try {
      const result = await inferTaxonomy({
        siteUrl: site.siteUrl,
        siteName: site.siteName || '',
        siteId: site.siteId,
      });
      setForm({
        businessModel: result.businessModel || form.businessModel,
        industryMajor: result.industryMajor || form.industryMajor,
        industryMinor: result.industryMinor || form.industryMinor,
        siteRole: result.siteRole || form.siteRole,
      });
      toast.success(
        `AIで推定しました（信頼度: ${
          result.confidence === 'high' ? '高' : result.confidence === 'medium' ? '中' : '低'
        }）`
      );
    } catch (e) {
      toast.error(e?.message || 'AI推定に失敗しました');
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      const callable = httpsCallable(functions, 'adminUpdateSiteTaxonomy');
      await callable({
        siteId: site.siteId,
        businessModel: form.businessModel,
        industryMajor: form.industryMajor,
        industryMinor: form.industryMinor,
        siteRole: form.siteRole,
      });
      toast.success('タクソノミーを更新しました');
      onSuccess?.();
      onClose();
    } catch (e) {
      console.error('[TaxonomyReclassifyModal] 更新エラー:', e);
      setError(e?.message || '更新に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={!!site} onClose={onClose} size="2xl">
      <DialogTitle>タクソノミー（業種・役割）を再分類</DialogTitle>
      <DialogDescription>
        {site?.siteName || '（サイト名未設定）'} の業種・サイト役割を新しい分類体系で確定します
      </DialogDescription>

      <DialogBody>
        <div className="mb-4 rounded-lg bg-gray-50 p-3 text-xs text-body-color dark:bg-dark-3">
          <div className="flex gap-2">
            <span className="shrink-0 font-medium text-dark dark:text-white">URL:</span>
            <span className="break-all">{site?.siteUrl}</span>
          </div>
          {site?.needsManualReclassify && (
            <div className="mt-2 flex items-start gap-2 rounded border border-amber-300 bg-amber-50 p-2 text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-200">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                自動推定が不確定でした。内容を確認して確定してください。
              </span>
            </div>
          )}
        </div>

        {/* AI 再推定ボタン */}
        <div className="mb-4 flex items-center justify-between rounded-lg border border-dashed border-primary/40 bg-gradient-to-r from-primary-blue/5 to-primary-purple/5 px-3 py-2">
          <p className="text-xs text-body-color dark:text-dark-6">
            このサイトのURLをもとにAIで再推定できます
          </p>
          <Button
            variant="ai"
            size="sm"
            type="button"
            onClick={handleInfer}
            disabled={isInferring}
          >
            {isInferring ? (
              <>
                <DotWaveSpinner size="xs" variant="white" />
                判定中...
              </>
            ) : (
              <>
                <Wand2 data-slot="icon" />
                AIで再推定
              </>
            )}
          </Button>
        </div>

        <div className="space-y-4">
          <SingleSelectField
            label="ビジネスモデル"
            required
            options={BUSINESS_MODELS}
            value={form.businessModel}
            onChange={(v) => setForm((prev) => ({ ...prev, businessModel: v }))}
            placeholder="ビジネスモデルを選択"
          />
          <IndustryPickerV2
            industryMajor={form.industryMajor}
            industryMinor={form.industryMinor}
            onChange={({ major, minor }) =>
              setForm((prev) => ({ ...prev, industryMajor: major, industryMinor: minor }))
            }
          />
          <SingleSelectField
            label="サイト役割"
            required
            options={SITE_ROLES}
            value={form.siteRole}
            onChange={(v) => setForm((prev) => ({ ...prev, siteRole: v }))}
            placeholder="サイト役割を選択"
          />
        </div>

        {error && (
          <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20">
            {error}
          </div>
        )}
      </DialogBody>

      <DialogActions>
        <Button variant="ghost" onClick={onClose} disabled={loading}>
          キャンセル
        </Button>
        <Button variant="primary" onClick={handleSubmit} disabled={!canSubmit || loading}>
          {loading ? (
            <>
              <DotWaveSpinner size="xs" variant="white" />
              更新中...
            </>
          ) : (
            '確定して保存'
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
