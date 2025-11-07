import { useEffect, useState } from 'react';
import { setPageTitle } from '../../../utils/pageTitle';
import { useAdmin } from '../../../hooks/useAdmin';
import { usePlanConfig } from '../../../hooks/usePlanConfig';
import { hasPermission } from '../../../constants/adminRoles';
import { PLAN_TYPES } from '../../../constants/plans';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import ErrorAlert from '../../../components/common/ErrorAlert';
import { Settings, Save, AlertCircle, RefreshCw } from 'lucide-react';

/**
 * プラン設定画面
 */
export default function PlanSettings() {
  const { adminRole } = useAdmin();
  const { planConfig, loading, error, updateConfig, refetch } = usePlanConfig();
  const [formData, setFormData] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    setPageTitle('プラン設定');
  }, []);

  useEffect(() => {
    if (planConfig) {
      setFormData(planConfig);
    }
  }, [planConfig]);

  const canEdit = hasPermission(adminRole, 'EDIT_PLAN_CONFIG');

  const handleChange = (plan, field, value) => {
    setFormData((prev) => ({
      ...prev,
      [plan]: {
        ...prev[plan],
        [field]: value === '' ? null : parseInt(value, 10),
      },
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!canEdit) {
      setFormError('プラン設定の変更権限がありません');
      return;
    }

    setFormError('');
    setIsSaving(true);

    try {
      await updateConfig(formData, 'プラン制限値の変更');
      setSuccessMessage('プラン設定を保存しました');
      setTimeout(() => setSuccessMessage(''), 5000);
      refetch();
    } catch (err) {
      setFormError(err.message || '保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (confirm('変更内容を破棄してもよろしいですか？')) {
      setFormData(planConfig);
      setFormError('');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return <ErrorAlert message={error} />;
  }

  return (
    <div>
      {/* ヘッダー */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-dark dark:text-white">プラン設定</h2>
        <p className="mt-1 text-sm text-body-color dark:text-dark-6">
          各プランの制限値を管理
        </p>
      </div>

      {/* 成功メッセージ */}
      {successMessage && (
        <div className="mb-4 rounded-lg bg-green-50 p-4 text-sm text-green-600 dark:bg-green-900/20">
          {successMessage}
        </div>
      )}

      {/* エラーメッセージ */}
      {formError && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-4 text-sm text-red-600 dark:bg-red-900/20">
          <AlertCircle className="h-5 w-5" />
          <span>{formError}</span>
        </div>
      )}

      {/* 権限について */}
      {!canEdit && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-orange-50 p-4 text-sm text-orange-600 dark:bg-orange-900/20">
          <AlertCircle className="h-5 w-5" />
          <span>プラン設定の変更は「管理者」ロールのみ可能です。</span>
        </div>
      )}

      {/* プラン設定フォーム */}
      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* 無料プラン */}
          <div className="rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
            <div className="mb-4 flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-gradient-to-r from-blue-400 to-blue-600"></div>
              <h3 className="text-lg font-semibold text-dark dark:text-white">
                無料プラン
              </h3>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                  サイト登録数上限
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.free?.maxSites ?? ''}
                  onChange={(e) => handleChange('free', 'maxSites', e.target.value)}
                  disabled={!canEdit}
                  className="w-full rounded-lg border border-stroke bg-white px-4 py-2 text-dark focus:border-primary focus:outline-none disabled:opacity-50 dark:border-dark-3 dark:bg-dark dark:text-white"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                  AI分析サマリー（月間）
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.free?.aiSummaryLimit ?? ''}
                  onChange={(e) => handleChange('free', 'aiSummaryLimit', e.target.value)}
                  disabled={!canEdit}
                  className="w-full rounded-lg border border-stroke bg-white px-4 py-2 text-dark focus:border-primary focus:outline-none disabled:opacity-50 dark:border-dark-3 dark:bg-dark dark:text-white"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                  AI改善提案（月間）
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.free?.aiImprovementLimit ?? ''}
                  onChange={(e) => handleChange('free', 'aiImprovementLimit', e.target.value)}
                  disabled={!canEdit}
                  className="w-full rounded-lg border border-stroke bg-white px-4 py-2 text-dark focus:border-primary focus:outline-none disabled:opacity-50 dark:border-dark-3 dark:bg-dark dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* スタンダードプラン */}
          <div className="rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
            <div className="mb-4 flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-gradient-to-r from-red-400 to-pink-600"></div>
              <h3 className="text-lg font-semibold text-dark dark:text-white">
                スタンダードプラン
              </h3>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                  サイト登録数上限
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.standard?.maxSites ?? ''}
                  onChange={(e) => handleChange('standard', 'maxSites', e.target.value)}
                  disabled={!canEdit}
                  className="w-full rounded-lg border border-stroke bg-white px-4 py-2 text-dark focus:border-primary focus:outline-none disabled:opacity-50 dark:border-dark-3 dark:bg-dark dark:text-white"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                  AI分析サマリー（月間）
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.standard?.aiSummaryLimit ?? ''}
                  onChange={(e) => handleChange('standard', 'aiSummaryLimit', e.target.value)}
                  disabled={!canEdit}
                  className="w-full rounded-lg border border-stroke bg-white px-4 py-2 text-dark focus:border-primary focus:outline-none disabled:opacity-50 dark:border-dark-3 dark:bg-dark dark:text-white"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                  AI改善提案（月間）
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.standard?.aiImprovementLimit ?? ''}
                  onChange={(e) => handleChange('standard', 'aiImprovementLimit', e.target.value)}
                  disabled={!canEdit}
                  className="w-full rounded-lg border border-stroke bg-white px-4 py-2 text-dark focus:border-primary focus:outline-none disabled:opacity-50 dark:border-dark-3 dark:bg-dark dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* プレミアムプラン */}
          <div className="rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
            <div className="mb-4 flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600"></div>
              <h3 className="text-lg font-semibold text-dark dark:text-white">
                プレミアムプラン
              </h3>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                  サイト登録数上限
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.premium?.maxSites ?? ''}
                  onChange={(e) => handleChange('premium', 'maxSites', e.target.value)}
                  disabled={!canEdit}
                  className="w-full rounded-lg border border-stroke bg-white px-4 py-2 text-dark focus:border-primary focus:outline-none disabled:opacity-50 dark:border-dark-3 dark:bg-dark dark:text-white"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                  AI分析サマリー（月間）
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.premium?.aiSummaryLimit ?? ''}
                  onChange={(e) => handleChange('premium', 'aiSummaryLimit', e.target.value)}
                  disabled={!canEdit}
                  className="w-full rounded-lg border border-stroke bg-white px-4 py-2 text-dark focus:border-primary focus:outline-none disabled:opacity-50 dark:border-dark-3 dark:bg-dark dark:text-white"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                  AI改善提案（月間）
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.premium?.aiImprovementLimit ?? ''}
                  onChange={(e) => handleChange('premium', 'aiImprovementLimit', e.target.value)}
                  disabled={!canEdit}
                  className="w-full rounded-lg border border-stroke bg-white px-4 py-2 text-dark focus:border-primary focus:outline-none disabled:opacity-50 dark:border-dark-3 dark:bg-dark dark:text-white"
                />
              </div>
            </div>

            <div className="mt-4 rounded-lg bg-gray-50 p-3 text-xs text-body-color dark:bg-dark-3 dark:text-dark-6">
              ※ -1 を設定すると「無制限」として扱われます
            </div>
          </div>
        </div>

        {/* ボタン */}
        {canEdit && (
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={handleReset}
              disabled={isSaving}
              className="flex items-center gap-2 rounded-lg border border-stroke bg-white px-6 py-2 font-medium text-dark transition hover:bg-gray-2 disabled:opacity-50 dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:hover:bg-dark-3"
            >
              <RefreshCw className="h-4 w-4" />
              リセット
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2 font-medium text-white transition hover:bg-primary/90 disabled:opacity-50"
            >
              {isSaving ? <LoadingSpinner /> : <Save className="h-4 w-4" />}
              {isSaving ? '保存中...' : '保存'}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}

