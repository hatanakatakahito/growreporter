import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../config/firebase';
import { X, AlertCircle } from 'lucide-react';
import Step1BasicInfo from '../GrowReporter/SiteRegistration/Step1BasicInfo';

/**
 * 管理者サイト登録モーダル（Step1BasicInfo再利用）
 * 作成後にサイト登録ウィザード（Step2~5）へ遷移
 */
export default function AdminCreateSiteModal({ targetUserId, targetUserName, onClose, onSuccess }) {
  const navigate = useNavigate();
  const [siteData, setSiteData] = useState({
    siteName: '',
    siteUrl: '',
    industry: [],
    siteType: [],
    sitePurpose: [],
    metaTitle: '',
    metaDescription: '',
    pcScreenshotUrl: '',
    mobileScreenshotUrl: '',
  });
  const step1LatestRef = useRef({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);

  // Step1LatestRefの値をマージして最新データを取得
  const getLatestData = () => ({
    ...siteData,
    ...step1LatestRef.current,
  });

  // バリデーション
  const isValid = () => {
    const data = getLatestData();
    const isMetadataLoading = data.metaTitle === '取得中...' || data.metaDescription === '取得中...';
    return !!(
      data.siteName &&
      data.siteUrl &&
      Array.isArray(data.industry) && data.industry.length > 0 &&
      Array.isArray(data.siteType) && data.siteType.length > 0 &&
      Array.isArray(data.sitePurpose) && data.sitePurpose.length > 0 &&
      !isMetadataLoading
    );
  };

  // サイト作成実行
  const handleCreate = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = getLatestData();
      const adminCreateSite = httpsCallable(functions, 'adminCreateSite');
      const result = await adminCreateSite({
        targetUserId,
        siteName: data.siteName,
        siteUrl: data.siteUrl,
        industry: data.industry,
        siteType: data.siteType,
        sitePurpose: data.sitePurpose,
        metaTitle: data.metaTitle || '',
        metaDescription: data.metaDescription || '',
        pcScreenshotUrl: data.pcScreenshotUrl || '',
        mobileScreenshotUrl: data.mobileScreenshotUrl || '',
      });

      if (result.data.success) {
        const siteId = result.data.siteId;
        onClose();
        // サイト登録ウィザードのStep2（GA4連携）へ遷移
        navigate(`/sites/${siteId}/edit?step=2`);
      } else {
        throw new Error('サイト作成に失敗しました');
      }
    } catch (err) {
      console.error('サイト作成エラー:', err);
      setError(err.message || 'サイト作成に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setShowConfirm(true);
  };

  // 確認ダイアログ
  if (showConfirm) {
    const data = getLatestData();
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-dark-2">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <AlertCircle className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-dark dark:text-white">
                サイト登録の確認
              </h3>
              <p className="text-sm text-body-color dark:text-dark-6">
                以下の内容でサイトを登録します
              </p>
            </div>
          </div>

          <div className="mb-6 space-y-3 rounded-lg bg-gray-50 p-4 dark:bg-dark-3">
            <div>
              <p className="text-xs text-body-color dark:text-dark-6">対象ユーザー</p>
              <p className="text-sm font-medium text-dark dark:text-white">{targetUserName}</p>
            </div>
            <div>
              <p className="text-xs text-body-color dark:text-dark-6">サイト名</p>
              <p className="text-sm font-medium text-dark dark:text-white">{data.siteName}</p>
            </div>
            <div>
              <p className="text-xs text-body-color dark:text-dark-6">サイトURL</p>
              <p className="text-sm font-medium text-dark dark:text-white">{data.siteUrl}</p>
            </div>
            <div>
              <p className="text-xs text-body-color dark:text-dark-6">業種</p>
              <p className="text-sm text-dark dark:text-white">{data.industry?.join('、') || '未選択'}</p>
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => { setShowConfirm(false); setError(null); }}
              disabled={loading}
              className="flex-1 rounded-lg border border-stroke bg-white px-4 py-2 text-sm font-medium text-dark transition hover:bg-gray-2 disabled:opacity-50 dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:hover:bg-dark-3"
            >
              戻る
            </button>
            <button
              onClick={handleCreate}
              disabled={loading}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
                  登録中...
                </>
              ) : (
                'サイトを登録'
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // サイト情報入力フォーム
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white shadow-xl dark:bg-dark-2">
        {/* ヘッダー */}
        <div className="flex items-center justify-between border-b border-stroke p-6 dark:border-dark-3">
          <div>
            <h2 className="text-xl font-semibold text-dark dark:text-white">
              サイト登録
            </h2>
            <p className="mt-1 text-sm text-body-color dark:text-dark-6">
              {targetUserName}さんのサイトを登録します
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-body-color transition hover:bg-gray-100 dark:hover:bg-dark-3"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step1BasicInfo 再利用 */}
        <form onSubmit={handleSubmit} className="p-6">
          <Step1BasicInfo
            siteData={siteData}
            setSiteData={setSiteData}
            step1LatestRef={step1LatestRef}
            mode="new"
          />

          {/* エラー表示 */}
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20">
              {error}
            </div>
          )}

          {/* ボタン */}
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-stroke bg-white px-4 py-2 text-sm font-medium text-dark transition hover:bg-gray-2 dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:hover:bg-dark-3"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={!isValid()}
              className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary/90 disabled:opacity-50"
            >
              確認画面へ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
