import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../config/firebase';
import { AlertCircle } from 'lucide-react';
import Step1BasicInfo from '../GrowReporter/SiteRegistration/Step1BasicInfo';
import { Dialog, DialogTitle, DialogDescription, DialogBody, DialogActions } from '../ui/dialog';
import { Button } from '../ui/button';
import DotWaveSpinner from '../common/DotWaveSpinner';

/**
 * 管理者サイト登録モーダル（Step1BasicInfo再利用）
 * 作成後にサイト登録ウィザード（Step2~5）へ遷移
 *
 * 業種・サイト役割・ビジネスモデルはこのフォームで入力させない。
 * サイト登録完了後のスクレイピング処理で AI が 100ページ情報を踏まえて自動判定する。
 */
export default function AdminCreateSiteModal({ targetUserId, targetUserName, onClose, onSuccess }) {
  const navigate = useNavigate();
  const [siteData, setSiteData] = useState({
    siteName: '',
    siteUrl: '',
    taxonomyVersion: 2,
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

  // バリデーション（業種はAIが自動判定するため、管理者も入力不要）
  const isValid = () => {
    const data = getLatestData();
    const isMetadataLoading = data.metaTitle === '取得中...' || data.metaDescription === '取得中...';
    return !!(data.siteName && data.siteUrl && !isMetadataLoading);
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
        // 業種系はサイト登録後のスクレイピング完了時に AI が自動判定するため送らない
        taxonomyVersion: 2,
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
      <Dialog open={true} onClose={() => { setShowConfirm(false); setError(null); }} size="md">
        <DialogBody>
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
            <p className="text-xs text-body-color dark:text-dark-6">
              ※ 業種・サイト役割・ビジネスモデルはサイト登録完了後、スクレイピング結果をもとにAIが自動判定します。
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20">
              {error}
            </div>
          )}
        </DialogBody>

        <DialogActions>
          <Button plain onClick={() => { setShowConfirm(false); setError(null); }} disabled={loading}>
            戻る
          </Button>
          <Button color="blue" onClick={handleCreate} disabled={loading}>
            {loading ? (
              <>
                <DotWaveSpinner size="xs" variant="white" />
                登録中...
              </>
            ) : (
              'サイトを登録'
            )}
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  // サイト情報入力フォーム
  return (
    <Dialog open={true} onClose={onClose} size="4xl">
      <DialogTitle>サイト登録</DialogTitle>
      <DialogDescription>{targetUserName}さんのサイトを登録します</DialogDescription>

      <form id="create-site-form" onSubmit={handleSubmit}>
        <DialogBody>
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
        </DialogBody>
      </form>

      <DialogActions>
        <Button plain onClick={onClose}>
          キャンセル
        </Button>
        <Button color="blue" type="submit" form="create-site-form" disabled={!isValid()}>
          確認画面へ
        </Button>
      </DialogActions>
    </Dialog>
  );
}
