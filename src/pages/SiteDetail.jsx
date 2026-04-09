import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { setPageTitle } from '../utils/pageTitle';
import { useSiteDetail } from '../hooks/useSiteDetail';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorAlert from '../components/common/ErrorAlert';
import DotWaveSpinner from '../components/common/DotWaveSpinner';
import { functions } from '../config/firebase';
import { db } from '../config/firebase';
import { doc, getDoc, getDocFromServer, updateDoc } from 'firebase/firestore';
import { Globe, BarChart3, CheckCircle, XCircle, Search, RefreshCw, Copy, Check, AlertCircle, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { SITE_TYPES, SITE_PURPOSES } from '../constants/siteOptions';
import { Button } from '@/components/ui/button';

/**
 * サイト詳細画面（ユーザー向け・オーナーまたは同一アカウントメンバー）
 * ユーザー情報セクションは表示しない
 */
export default function SiteDetail() {
  const { siteId } = useParams();
  const navigate = useNavigate();
  const { siteDetail, loading, error, refetch } = useSiteDetail(siteId);
  const [scrapingStatus, setScrapingStatus] = useState(null);
  const [isScrapingLoading, setIsScrapingLoading] = useState(false);
  const [scrapingError, setScrapingError] = useState(null);
  const [scrapingMessage, setScrapingMessage] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  useEffect(() => {
    setPageTitle('サイト詳細');
  }, []);

  useEffect(() => {
    if (siteId) {
      fetchScrapingStatus();
    }
  }, [siteId]);

  /** fromServer: true でキャッシュを避けてサーバーから取得（完了直後の更新反映用） */
  const fetchScrapingStatus = async (opts = {}) => {
    try {
      const metaRef = doc(db, 'sites', siteId, 'pageScrapingMeta', 'default');
      const metaDoc = opts.fromServer
        ? await getDocFromServer(metaRef)
        : await getDoc(metaRef);
      if (metaDoc.exists()) {
        setScrapingStatus(metaDoc.data());
      }
    } catch (err) {
      console.error('[fetchScrapingStatus] エラー:', err);
    }
  };

  const handleStartScraping = async () => {
    setIsScrapingLoading(true);
    setScrapingError(null);
    setScrapingMessage(null);

    try {
      const scrapeTop100Pages = httpsCallable(functions, 'scrapeTop100Pages');
      const result = await scrapeTop100Pages({ siteId, forceRescrape: true });

      if (result.data.success) {
        // ジョブ開始成功 → ローディング維持＆進捗メッセージ表示
        setScrapingMessage('スクレイピングを開始しました。完了まで数分かかります...');
        await fetchScrapingStatus();
        refetch();
        let seenInProgress = false;
        const intervalId = setInterval(async () => {
          const progressSnap = await getDocFromServer(doc(db, 'sites', siteId, 'scrapingProgress', 'default'));
          const status = progressSnap.exists() ? progressSnap.data().status : null;
          const progressData = progressSnap.exists() ? progressSnap.data() : null;
          if (status === 'in_progress') {
            seenInProgress = true;
            // 進捗メッセージがあれば表示
            if (progressData?.progressMessage) {
              setScrapingMessage(progressData.progressMessage);
            }
          }
          if (status === 'error') {
            clearInterval(intervalId);
            setIsScrapingLoading(false);
            setScrapingMessage(null);
            setScrapingError(progressData?.error || 'スクレイピング中にエラーが発生しました');
            return;
          }
          if (seenInProgress && status !== 'in_progress') {
            clearInterval(intervalId);
            await new Promise((r) => setTimeout(r, 800));
            await fetchScrapingStatus({ fromServer: true });
            refetch();
            const metaDoc = await getDocFromServer(doc(db, 'sites', siteId, 'pageScrapingMeta', 'default'));
            if (metaDoc.exists()) {
              const meta = metaDoc.data();
              setScrapingStatus(meta);
              const ok = meta.totalPagesScraped ?? 0;
              const ng = meta.totalPagesFailed ?? 0;
              setScrapingMessage(`スクレイピングが完了しました。成功: ${ok}ページ、失敗: ${ng}ページ`);
              setTimeout(() => setScrapingMessage(null), 10000);
            }
            setIsScrapingLoading(false);
          }
        }, 3000);
        setTimeout(() => {
          clearInterval(intervalId);
          setIsScrapingLoading(false);
        }, 10 * 60 * 1000);
        // ここではfinallyでローディングを消さないためreturn
        return;
      } else {
        throw new Error(result.data.message || 'スクレイピングの開始に失敗しました');
      }
    } catch (err) {
      console.error('[handleStartScraping] エラー:', err);
      setScrapingError(err.message);
      setIsScrapingLoading(false);
    }
  };

  const handleDeleteSite = async () => {
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      const deleteSiteFn = httpsCallable(functions, 'deleteSite');
      const result = await deleteSiteFn({ siteId });
      if (result.data.success) {
        navigate('/sites/list');
      }
    } catch (err) {
      console.error('サイト削除エラー:', err);
      setDeleteError(err.message || 'サイトの削除に失敗しました');
    } finally {
      setDeleteLoading(false);
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
    return (
      <div>
        <ErrorAlert message={error} onRetry={refetch} />
      </div>
    );
  }

  if (!siteDetail) {
    return null;
  }

  const needsGA4 = !siteDetail.hasGA4;
  const needsGSC = !siteDetail.hasGSC;
  const dashboardOrSettingsLink =
    needsGA4 || needsGSC ? (
      <Link
        to={`/sites/${siteId}/edit?step=${needsGA4 ? 2 : 3}`}
        className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-opacity-90"
      >
        <BarChart3 className="h-4 w-4" />
        サイト設定を開く
      </Link>
    ) : (
      <Link
        to={`/dashboard?siteId=${siteId}`}
        className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-opacity-90"
      >
        <BarChart3 className="h-4 w-4" />
        ダッシュボードを開く
      </Link>
    );

  return (
    <div className="w-full min-w-0">
      <div className="w-full !max-w-[1400px] mx-auto px-3 sm:px-6 py-6 sm:py-10 box-border" style={{ maxWidth: '1400px' }}>
        {/* ヘッダー（アカウント設定ページと同一構成） */}
        <div className="mb-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {siteDetail.siteName || '名称未設定'}
              </h1>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                <a
                  href={siteDetail.siteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {siteDetail.siteUrl}
                </a>
              </p>
            </div>
            {dashboardOrSettingsLink}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* 基本情報 */}
        <div className="rounded-lg border border-stroke bg-white p-6 shadow-sm dark:border-dark-3 dark:bg-dark-2">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-dark dark:text-white">
            <Globe className="h-5 w-5" />
            基本情報
          </h3>
          <div className="space-y-3">
            <div>
              <div className="text-sm text-body-color dark:text-dark-6">サイトID</div>
              <div className="font-mono text-sm text-dark dark:text-white">{siteDetail.siteId}</div>
            </div>
            <div>
              <div className="text-sm text-body-color dark:text-dark-6">業界・業種</div>
              <div className="text-dark dark:text-white">
                {Array.isArray(siteDetail.industry) && siteDetail.industry.length > 0
                  ? siteDetail.industry.join('、')
                  : '-'}
              </div>
            </div>
            <div>
              <div className="text-sm text-body-color dark:text-dark-6">サイト種別</div>
              <div className="text-dark dark:text-white">
                {(() => {
                  const raw = siteDetail.siteType;
                  if (!raw) return '-';
                  const values = Array.isArray(raw) ? raw : String(raw).split(',').map((v) => v.trim()).filter(Boolean);
                  if (values.length === 0) return '-';
                  return values.map((v) => SITE_TYPES.find((t) => t.value === v)?.label ?? v).join('、');
                })()}
              </div>
            </div>
            <div>
              <div className="text-sm text-body-color dark:text-dark-6">サイトの目的</div>
              <div className="text-dark dark:text-white">
                {Array.isArray(siteDetail.sitePurpose) && siteDetail.sitePurpose.length > 0
                  ? siteDetail.sitePurpose.map((v) => SITE_PURPOSES.find((p) => p.value === v)?.label ?? v).join('、')
                  : '-'}
              </div>
            </div>
            <div>
              <div className="text-sm text-body-color dark:text-dark-6">登録日</div>
              <div className="text-dark dark:text-white">
                {siteDetail.createdAt
                  ? new Date(siteDetail.createdAt).toLocaleString('ja-JP', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '-'}
              </div>
            </div>
          </div>
        </div>

        {/* データ収集設定 */}
        <div className="rounded-lg border border-stroke bg-white p-6 shadow-sm dark:border-dark-3 dark:bg-dark-2">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-dark dark:text-white">
            <BarChart3 className="h-5 w-5" />
            データ収集設定
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-dark dark:text-white">Google Analytics 4</div>
                <div className="text-sm text-body-color dark:text-dark-6">
                  {siteDetail.ga4PropertyId || '未設定'}
                </div>
              </div>
              {siteDetail.hasGA4 ? (
                <CheckCircle className="h-6 w-6 text-green-500" />
              ) : (
                <XCircle className="h-6 w-6 text-red-500" />
              )}
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-dark dark:text-white">Search Console</div>
                <div className="text-sm text-body-color dark:text-dark-6">
                  {siteDetail.gscSiteUrl || '未設定'}
                </div>
              </div>
              {siteDetail.hasGSC ? (
                <CheckCircle className="h-6 w-6 text-green-500" />
              ) : (
                <XCircle className="h-6 w-6 text-red-500" />
              )}
            </div>
          </div>
          {/* メタデータ・スクショ再取得 */}
          <div className="mt-4 border-t border-stroke pt-4 dark:border-dark-3">
            <button
              onClick={async () => {
                try {
                  toast.loading('メタデータ・スクリーンショットを再取得中...', { id: 'refresh-meta' });
                  const refresh = httpsCallable(functions, 'refreshSiteMetadataAndScreenshots', { timeout: 120_000 });
                  const result = await refresh({ siteId });
                  const fields = result.data?.updatedFields || [];
                  if (fields.length > 0) {
                    toast.success(`再取得完了（${fields.length}件更新）`, { id: 'refresh-meta' });
                  } else {
                    toast.success('再取得完了（更新なし）', { id: 'refresh-meta' });
                  }
                  refetch();
                } catch (e) {
                  toast.error(`再取得に失敗しました: ${e.message}`, { id: 'refresh-meta' });
                }
              }}
              className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              メタデータ・スクリーンショットを再取得
            </button>
          </div>
        </div>

        {/* AI使用状況 */}
        <div className="rounded-lg border border-stroke bg-white p-6 shadow-sm dark:border-dark-3 dark:bg-dark-2 lg:col-span-2">
          <h3 className="mb-4 text-lg font-semibold text-dark dark:text-white">
            AI使用状況（今月）
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-body-color dark:text-dark-6">AI分析サマリー</span>
              <span className="font-semibold text-dark dark:text-white">
                {siteDetail.aiUsage?.analysisCount || 0}回
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-body-color dark:text-dark-6">AI改善提案</span>
              <span className="font-semibold text-dark dark:text-white">
                {siteDetail.aiUsage?.improvementCount || 0}回
              </span>
            </div>
            <div className="border-t border-stroke pt-3 dark:border-dark-3">
              <div className="flex justify-between">
                <span className="font-medium text-dark dark:text-white">合計</span>
                <span className="font-bold text-primary">
                  {siteDetail.aiUsage?.totalCount || 0}回
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* コンバージョンイベント */}
        {siteDetail.conversionEvents && siteDetail.conversionEvents.length > 0 && (
          <div className="mt-6 rounded-lg border border-stroke bg-white p-6 shadow-sm dark:border-dark-3 dark:bg-dark-2">
          <h3 className="mb-4 text-lg font-semibold text-dark dark:text-white">
            コンバージョンイベント
          </h3>
          <div className="space-y-2">
            {siteDetail.conversionEvents.map((event, index) => {
              const eventDisplay =
                typeof event === 'string' ? event : event.displayName || event.eventName || 'Unknown';
              return (
                <div
                  key={index}
                  className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 dark:bg-dark-3"
                >
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-dark dark:text-white">{eventDisplay}</span>
                </div>
              );
            })}
            </div>
          </div>
        )}

        {/* ページスクレイピングデータ */}
        <div className="mt-6 rounded-lg border border-stroke bg-white p-6 shadow-sm dark:border-dark-3 dark:bg-dark-2">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-dark dark:text-white">
            ページスクレイピングデータ
          </h3>
          <Button
            color="blue"
            onClick={handleStartScraping}
            disabled={isScrapingLoading}
          >
            {isScrapingLoading ? (
              <>
                <RefreshCw data-slot="icon" className="h-4 w-4 animate-spin" />
                スクレイピング中...
              </>
            ) : (
              <>
                <Search data-slot="icon" className="h-4 w-4" />
                スクレイピング開始
              </>
            )}
          </Button>
        </div>

        <p className="mb-4 text-xs text-body-color dark:text-dark-6">
          GA4からアクセスが多い上位100ページをスクレイピングし、ページの詳細情報を取得します。AI改善案生成の精度向上に役立ちます。
        </p>

        {scrapingMessage && (
          <div className="mb-4 rounded-lg bg-green-50 p-4 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400">
            {scrapingMessage}
          </div>
        )}

        {scrapingError && (
          <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {scrapingError}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-body-color dark:text-dark-6">最終スクレイピング日時</div>
            <div className="mt-1 text-dark dark:text-white">
              {scrapingStatus?.lastScrapedAt
                ? new Date(
                    scrapingStatus.lastScrapedAt?.toDate ? scrapingStatus.lastScrapedAt.toDate() : scrapingStatus.lastScrapedAt
                  ).toLocaleString('ja-JP', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '未実行'}
            </div>
          </div>
          <div>
            <div className="text-sm text-body-color dark:text-dark-6">取得ページ数</div>
            <div className="mt-1 text-dark dark:text-white">
              {scrapingStatus?.totalPagesScraped || 0}ページ
            </div>
          </div>
          <div>
            <div className="text-sm text-body-color dark:text-dark-6">失敗ページ数</div>
            <div className="mt-1 text-dark dark:text-white">
              {scrapingStatus?.totalPagesFailed || 0}ページ
            </div>
          </div>
          <div>
            <div className="text-sm text-body-color dark:text-dark-6">処理時間</div>
            <div className="mt-1 text-dark dark:text-white">
              {scrapingStatus?.scrapingDuration
                ? `${Math.round(scrapingStatus.scrapingDuration / 1000)}秒`
                : '-'}
            </div>
          </div>
        </div>
        </div>

        {/* AI改善提案 */}
        <div className="mt-8 rounded-lg border border-stroke bg-white p-6 shadow-sm dark:border-dark-3 dark:bg-dark-2">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-dark dark:text-white">AI改善提案</h3>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-dark dark:text-white">月次自動生成</div>
              <p className="mt-0.5 text-xs text-body-color">月次スクレイピング後にAI改善提案を自動で再生成します。月間AI改善回数を1回消費します。</p>
            </div>
            <button
              onClick={async () => {
                const newVal = !siteDetail?.autoImprovementEnabled;
                try {
                  await updateDoc(doc(db, 'sites', siteId), { autoImprovementEnabled: newVal });
                  toast.success(newVal ? '自動生成を有効にしました' : '自動生成を無効にしました');
                  refetch();
                } catch (e) {
                  toast.error('設定の変更に失敗しました');
                }
              }}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                siteDetail?.autoImprovementEnabled ? 'bg-primary' : 'bg-gray-200 dark:bg-dark-3'
              }`}
            >
              <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform duration-200 ${
                siteDetail?.autoImprovementEnabled ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </button>
          </div>
          {siteDetail?.lastAutoImprovementAt && (
            <div className="mt-3 text-xs text-body-color">
              最終自動生成: {siteDetail.lastAutoImprovementAt.toDate ? siteDetail.lastAutoImprovementAt.toDate().toLocaleDateString('ja-JP') : new Date(siteDetail.lastAutoImprovementAt).toLocaleDateString('ja-JP')}
            </div>
          )}
        </div>

        {/* GTM連携（詳細スクロール深度+CTAクリック計測） */}
        <div className="mt-6 rounded-lg border border-stroke bg-white p-6 shadow-sm dark:border-dark-3 dark:bg-dark-2">
          <h3 className="mb-2 text-lg font-semibold text-dark dark:text-white">
            GTM連携（詳細行動分析）
          </h3>
          <p className="mb-4 text-xs text-body-color dark:text-dark-6">
            Googleタグマネージャーで以下を設定すると、スクロール深度（25/50/75/100%）とCTAクリックの詳細データが取得でき、コンテンツ分析の精度が向上します。
          </p>

          <div className="mb-4 rounded-lg bg-gray-50 p-4 dark:bg-dark-3">
            <div className="mb-3 text-sm font-semibold text-dark dark:text-white">セットアップ手順</div>
            <ol className="space-y-4 text-sm text-body-color dark:text-dark-6">
              <li className="flex gap-3">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">1</span>
                <div>
                  <span className="font-medium text-dark dark:text-white">トリガーを作成（スクロール深度）</span>
                  <div className="mt-1 text-xs">
                    GTM管理画面 → トリガー → 新規 → トリガーのタイプ「スクロール距離」を選択<br />
                    ・縦方向スクロール距離「割合」にチェック → <strong className="text-dark dark:text-white">25, 50, 75, 100</strong> を入力<br />
                    ・「1ページにつき1回」を選択 → トリガー名「GR - スクロール深度」で保存
                  </div>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">2</span>
                <div>
                  <span className="font-medium text-dark dark:text-white">トリガーを作成（CTAクリック）</span>
                  <div className="mt-1 text-xs">
                    トリガー → 新規 → トリガーのタイプ「リンクのみ」を選択<br />
                    ・「一部のリンククリック」→ Click Classes → 正規表現に一致 → <strong className="text-dark dark:text-white">(cta|btn|button|submit|contact|inquiry|download)</strong><br />
                    ・トリガー名「GR - CTAクリック」で保存
                  </div>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">3</span>
                <div>
                  <span className="font-medium text-dark dark:text-white">GA4イベントタグを作成（スクロール深度）</span>
                  <div className="mt-1 text-xs">
                    タグ → 新規 → タグの種類「Googleアナリティクス: GA4イベント」<br />
                    ・測定ID: サイトのGA4測定ID（G-XXXXXXXXXX）<br />
                    ・イベント名: <strong className="text-dark dark:text-white">gr_scroll_depth</strong><br />
                    ・イベントパラメータ: 名前 <strong>scroll_percentage</strong> 値 <strong>{'{{Scroll Depth Threshold}}'}</strong><br />
                    ・イベントパラメータ: 名前 <strong>page_path</strong> 値 <strong>{'{{Page Path}}'}</strong><br />
                    ・トリガー: Step 1で作成した「GR - スクロール深度」→ タグ名「GR - スクロール深度」で保存
                  </div>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">4</span>
                <div>
                  <span className="font-medium text-dark dark:text-white">GA4イベントタグを作成（CTAクリック）</span>
                  <div className="mt-1 text-xs">
                    タグ → 新規 → タグの種類「Googleアナリティクス: GA4イベント」<br />
                    ・測定ID: サイトのGA4測定ID（G-XXXXXXXXXX）<br />
                    ・イベント名: <strong className="text-dark dark:text-white">gr_cta_click</strong><br />
                    ・イベントパラメータ: 名前 <strong>click_text</strong> 値 <strong>{'{{Click Text}}'}</strong><br />
                    ・イベントパラメータ: 名前 <strong>click_url</strong> 値 <strong>{'{{Click URL}}'}</strong><br />
                    ・イベントパラメータ: 名前 <strong>page_path</strong> 値 <strong>{'{{Page Path}}'}</strong><br />
                    ・トリガー: Step 2で作成した「GR - CTAクリック」→ タグ名「GR - CTAクリック」で保存
                  </div>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">5</span>
                <div>
                  <span className="font-medium text-dark dark:text-white">プレビュー＆公開</span>
                  <div className="mt-0.5 text-xs">GTMのプレビューモードで動作確認し、問題なければ公開してください。データは翌日からコンテンツ分析画面に反映されます。</div>
                </div>
              </li>
            </ol>
          </div>

          <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 dark:border-blue-900/30 dark:bg-blue-900/10">
            <div className="flex gap-2">
              <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <div className="text-xs text-body-color dark:text-dark-6">
                <span className="font-medium text-dark dark:text-white">GTM未設定でも利用可能です。</span>
                GA4のデフォルトのスクロールイベント（90%到達）でコンテンツ分析は動作します。GTMを設定すると25/50/75/100%の詳細な深度とCTAクリックが追加で分析できるようになります。
              </div>
            </div>
          </div>
        </div>

        {/* サイト削除（最下部に控えめに配置） */}
        <div className="mt-16 flex justify-center pb-8">
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="text-xs text-gray-400 hover:text-red-500 transition dark:text-dark-6"
          >
            このサイトを削除する
          </button>
        </div>

        </div>
      </div>

      {/* 削除確認モーダル */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-dark-2">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                <AlertCircle className="h-6 w-6 text-red-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-dark dark:text-white">
                  サイト削除の確認
                </h3>
                <p className="text-sm text-body-color dark:text-dark-6">
                  この操作は取り消せません
                </p>
              </div>
            </div>

            <div className="mb-4 rounded-lg bg-gray-50 p-4 dark:bg-dark-3">
              <p className="text-sm font-medium text-dark dark:text-white">
                {siteDetail?.siteName || '名称未設定'}
              </p>
              <p className="text-xs text-body-color dark:text-dark-6">{siteDetail?.siteUrl}</p>
            </div>

            <p className="mb-4 text-sm text-red-500">
              サイトに紐づくすべてのデータが削除されます。
            </p>

            {deleteError && (
              <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20">
                {deleteError}
              </div>
            )}

            <div className="flex gap-3">
              <Button
                outline
                onClick={() => { setShowDeleteConfirm(false); setDeleteError(null); }}
                disabled={deleteLoading}
                className="flex-1"
              >
                キャンセル
              </Button>
              <Button
                color="red"
                onClick={handleDeleteSite}
                disabled={deleteLoading}
                className="flex-1"
              >
                {deleteLoading ? (
                  <>
                    <DotWaveSpinner size="xs" variant="white" />
                    削除中...
                  </>
                ) : (
                  '削除する'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
