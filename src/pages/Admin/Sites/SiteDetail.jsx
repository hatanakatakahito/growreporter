import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { setPageTitle } from '../../../utils/pageTitle';
import { useAdminSiteDetail } from '../../../hooks/useAdminSiteDetail';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import ErrorAlert from '../../../components/common/ErrorAlert';
import { functions } from '../../../config/firebase';
import { ArrowLeft, Globe, User, BarChart3, AlertTriangle, CheckCircle, XCircle, Search, RefreshCw, MousePointerClick, Camera, Monitor, Smartphone } from 'lucide-react';
import { SITE_TYPES, SITE_PURPOSES } from '../../../constants/siteOptions';

/**
 * サイト詳細画面（管理者用）
 */
export default function AdminSiteDetail() {
  const { siteId } = useParams();
  const navigate = useNavigate();
  const { siteDetail, loading, error, refetch } = useAdminSiteDetail(siteId);
  const [scrapingStatus, setScrapingStatus] = useState(null);
  const [isScrapingLoading, setIsScrapingLoading] = useState(false);
  const [scrapingError, setScrapingError] = useState(null);
  const [scrapingMessage, setScrapingMessage] = useState(null);
  const [isScreenshotLoading, setIsScreenshotLoading] = useState(false);
  const [screenshotMessage, setScreenshotMessage] = useState(null);
  const [screenshotError, setScreenshotError] = useState(null);

  useEffect(() => {
    setPageTitle('サイト詳細');
  }, []);

  // スクレイピングデータの取得
  useEffect(() => {
    if (siteId) {
      fetchScrapingStatus();
    }
  }, [siteId]);

  /** @param {{ fromServer?: boolean }} opts - fromServer: true でキャッシュを避けてサーバーから取得（完了直後の更新反映用） */
  const fetchScrapingStatus = async (opts = {}) => {
    try {
      const { doc, getDoc, getDocFromServer } = await import('firebase/firestore');
      const { db } = await import('../../../config/firebase');
      const metaRef = doc(db, 'sites', siteId, 'pageScrapingMeta', 'default');
      const metaDoc = opts.fromServer
        ? await getDocFromServer(metaRef)
        : await getDoc(metaRef);
      if (metaDoc.exists()) {
        const data = metaDoc.data();
        if (opts.fromServer && data.lastScrapedAt) {
          const t = data.lastScrapedAt.toDate ? data.lastScrapedAt.toDate() : data.lastScrapedAt;
          console.log('[fetchScrapingStatus] サーバーから取得', { lastScrapedAt: t?.toISOString?.(), totalPagesScraped: data.totalPagesScraped });
        }
        setScrapingStatus(data);
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
        await fetchScrapingStatus();
        refetch();
        const { doc } = await import('firebase/firestore');
        const { db } = await import('../../../config/firebase');
        let seenInProgress = false;
        let pollCount = 0;
        const intervalId = setInterval(async () => {
          pollCount += 1;
          const { getDocFromServer } = await import('firebase/firestore');
          const progressRef = doc(db, 'sites', siteId, 'scrapingProgress', 'default');
          const progressSnap = await getDocFromServer(progressRef);
          const status = progressSnap.exists() ? progressSnap.data().status : null;
          const progressData = progressSnap.exists() ? progressSnap.data() : null;
          console.log('[Scraping] ポール', pollCount, 'status=', status, 'seenInProgress=', seenInProgress, 'progressData=', progressData ? { status: progressData.status, error: progressData.error, updatedAt: progressData.updatedAt?.toDate?.()?.toISOString?.() } : null);
          if (status === 'in_progress') {
            seenInProgress = true;
          }
          // バックエンドで失敗した場合: ポーリングを止めてエラー内容を表示
          if (status === 'error') {
            clearInterval(intervalId);
            const errorMsg = progressData?.error || 'スクレイピング中にエラーが発生しました';
            console.error('[Scraping] バックエンドでエラー', errorMsg);
            setScrapingError(errorMsg);
            return;
          }
          if (seenInProgress && status !== 'in_progress') {
            clearInterval(intervalId);
            console.log('[Scraping] 完了と判定（status=', status, '）。800ms待機後にmeta取得');
            await new Promise((r) => setTimeout(r, 800));
            await fetchScrapingStatus({ fromServer: true });
            refetch();
            const metaRef = doc(db, 'sites', siteId, 'pageScrapingMeta', 'default');
            const metaDoc = await getDocFromServer(metaRef);
            if (metaDoc.exists()) {
              const meta = metaDoc.data();
              const lastScrapedAt = meta.lastScrapedAt;
              const lastScrapedAtStr = lastScrapedAt?.toDate ? lastScrapedAt.toDate().toISOString() : (lastScrapedAt ? String(lastScrapedAt) : null);
              console.log('[Scraping] pageScrapingMeta取得', { totalPagesScraped: meta.totalPagesScraped, totalPagesFailed: meta.totalPagesFailed, lastScrapedAt: lastScrapedAtStr, metaKeys: Object.keys(meta) });
              setScrapingStatus(meta);
              const ok = meta.totalPagesScraped ?? 0;
              const ng = meta.totalPagesFailed ?? 0;
              setScrapingMessage(`スクレイピングが完了しました。成功: ${ok}ページ、失敗: ${ng}ページ`);
              setTimeout(() => setScrapingMessage(null), 10000);
            } else {
              console.warn('[Scraping] pageScrapingMeta が存在しません');
            }
          }
        }, 3000);
        setTimeout(() => clearInterval(intervalId), 5 * 60 * 1000);
      } else {
        throw new Error(result.data.message || 'スクレイピングの開始に失敗しました');
      }
    } catch (err) {
      console.error('[handleStartScraping] エラー:', err);
      setScrapingError(err.message);
    } finally {
      setIsScrapingLoading(false);
    }
  };

  const handleRefreshScreenshots = async () => {
    setIsScreenshotLoading(true);
    setScreenshotError(null);
    setScreenshotMessage(null);
    try {
      const refresh = httpsCallable(functions, 'refreshSiteMetadataAndScreenshots', { timeout: 120_000 });
      const result = await refresh({ siteId });
      if (result.data?.success) {
        const fields = result.data.updatedFields || [];
        const updated = [];
        if (fields.includes('pcScreenshotUrl')) updated.push('PC');
        if (fields.includes('mobileScreenshotUrl')) updated.push('モバイル');
        setScreenshotMessage(updated.length > 0
          ? `${updated.join('・')}のスクリーンショットを更新しました`
          : 'メタデータを更新しました（スクリーンショットの変更なし）');
        refetch();
        setTimeout(() => setScreenshotMessage(null), 10000);
      }
    } catch (err) {
      console.error('[handleRefreshScreenshots] エラー:', err);
      setScreenshotError(err.message || 'スクリーンショットの再取得に失敗しました');
    } finally {
      setIsScreenshotLoading(false);
    }
  };

  // ユーザー名を取得（lastName + firstName 優先、なければdisplayName）
  const getUserName = () => {
    const user = siteDetail?.user;
    if (user?.lastName && user?.firstName) {
      return `${user.lastName} ${user.firstName}`;
    }
    return user?.displayName || '-';
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
        <button
          onClick={() => navigate('/admin/sites')}
          className="mb-4 flex items-center gap-2 text-sm text-body-color hover:text-primary dark:text-dark-6"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>サイト一覧に戻る</span>
        </button>
        <ErrorAlert message={error} onRetry={refetch} />
      </div>
    );
  }

  if (!siteDetail) {
    return null;
  }

  return (
    <div>
      {/* 戻るボタン */}
      <button
        onClick={() => navigate('/admin/sites')}
        className="mb-6 flex items-center gap-2 text-sm text-body-color hover:text-primary dark:text-dark-6"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>サイト一覧に戻る</span>
      </button>

      {/* ヘッダー */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-dark dark:text-white">
            {siteDetail.siteName || '名称未設定'}
          </h2>
          <a
            href={siteDetail.siteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 text-sm text-primary hover:underline"
          >
            {siteDetail.siteUrl}
          </a>
        </div>
        
        {/* ダッシュボードまたはサイト設定へのリンク */}
        {!siteDetail.isOrphan && (() => {
          // GA4とGSCの未設定状況を確認
          const needsGA4 = !siteDetail.hasGA4;
          const needsGSC = !siteDetail.hasGSC;
          
          // 両方設定済みならダッシュボードへ、未設定があればサイト設定へ
          if (needsGA4 || needsGSC) {
            // 未設定がある場合はサイト設定画面へ（STEP2またはSTEP3）
            const step = needsGA4 ? 2 : 3;
            return (
              <Link
                to={`/sites/${siteId}/edit?step=${step}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-opacity-90"
              >
                <BarChart3 className="h-4 w-4" />
                サイト設定を開く
              </Link>
            );
          } else {
            // 設定済みの場合はダッシュボードへ
            return (
              <Link
                to={`/dashboard?siteId=${siteId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-opacity-90"
              >
                <BarChart3 className="h-4 w-4" />
                ダッシュボードを開く
              </Link>
            );
          }
        })()}
      </div>

      {/* 孤立サイト警告 */}
      {siteDetail.isOrphan && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-900/20">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertTriangle className="h-5 w-5" />
            <span className="font-medium">孤立サイト</span>
          </div>
          <p className="mt-1 text-sm text-red-600/80 dark:text-red-400/80">
            このサイトのユーザーは削除されています。サイトの削除を検討してください。
          </p>
        </div>
      )}

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
                  : (siteDetail.user?.industry || '-')}
              </div>
            </div>
            <div>
              <div className="text-sm text-body-color dark:text-dark-6">サイト種別</div>
              <div className="text-dark dark:text-white">
                {(() => {
                  const raw = siteDetail.siteType;
                  if (!raw) return '-';
                  const values = Array.isArray(raw) ? raw : String(raw).split(',').map(v => v.trim()).filter(Boolean);
                  if (values.length === 0) return '-';
                  return values.map(v => SITE_TYPES.find(t => t.value === v)?.label ?? v).join('、');
                })()}
              </div>
            </div>
            <div>
              <div className="text-sm text-body-color dark:text-dark-6">サイトの目的</div>
              <div className="text-dark dark:text-white">
                {Array.isArray(siteDetail.sitePurpose) && siteDetail.sitePurpose.length > 0
                  ? siteDetail.sitePurpose.map(v => SITE_PURPOSES.find(p => p.value === v)?.label ?? v).join('、')
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

        {/* ユーザー情報 */}
        <div className="rounded-lg border border-stroke bg-white p-6 shadow-sm dark:border-dark-3 dark:bg-dark-2">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-dark dark:text-white">
            <User className="h-5 w-5" />
            ユーザー情報
          </h3>
          {siteDetail.user ? (
            <div className="space-y-3">
              <div>
                <div className="text-sm text-body-color dark:text-dark-6">名前</div>
                <div className="text-dark dark:text-white">{getUserName()}</div>
              </div>
              <div>
                <div className="text-sm text-body-color dark:text-dark-6">メールアドレス</div>
                <div className="text-dark dark:text-white">{siteDetail.user.email || '-'}</div>
              </div>
              <div>
                <div className="text-sm text-body-color dark:text-dark-6">プラン</div>
                <div className="text-dark dark:text-white">
                  {siteDetail.user.plan === 'free' && '無料プラン'}
                  {siteDetail.user.plan === 'standard' && 'スタンダードプラン'}
                  {siteDetail.user.plan === 'premium' && 'プレミアムプラン'}
                  {!['free', 'standard', 'premium'].includes(siteDetail.user.plan) && siteDetail.user.plan}
                </div>
              </div>
              <div className="pt-3">
                <Link
                  to={`/admin/users/${siteDetail.user.uid}`}
                  className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  ユーザー詳細を見る →
                </Link>
              </div>
            </div>
          ) : (
            <div className="text-red-600 dark:text-red-400">
              ユーザー情報が見つかりません（孤立サイト）
            </div>
          )}
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
        </div>

        {/* AI使用状況 */}
        <div className="rounded-lg border border-stroke bg-white p-6 shadow-sm dark:border-dark-3 dark:bg-dark-2">
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

        {/* ヒートマップ利用状況 */}
        <div className="rounded-lg border border-stroke bg-white p-6 shadow-sm dark:border-dark-3 dark:bg-dark-2">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-dark dark:text-white">
            <MousePointerClick className="h-5 w-5" />
            ヒートマップ利用状況（今月）
          </h3>
          {(() => {
            const pvUsage = siteDetail.heatmapPvUsage || 0;
            const pvLimit = 10000;
            const samplingRate = siteDetail.heatmapSamplingRate ?? 1.0;
            const percentage = Math.min((pvUsage / pvLimit) * 100, 100);
            const isNearLimit = percentage >= 80;
            const isExceeded = percentage >= 100;

            return (
              <div className="space-y-4">
                <div>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="text-body-color dark:text-dark-6">PV使用量</span>
                    <span className="font-semibold text-dark dark:text-white">
                      {pvUsage.toLocaleString()} / {pvLimit.toLocaleString()} PV
                    </span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-dark-3">
                    <div
                      className={`h-full transition-all ${isExceeded ? 'bg-red-500' : isNearLimit ? 'bg-yellow-500' : 'bg-primary'}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  {isExceeded && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">月間上限に達しています</p>
                  )}
                  {isNearLimit && !isExceeded && (
                    <p className="mt-1 text-xs text-yellow-700 dark:text-yellow-400">上限の{Math.round(percentage)}%に到達</p>
                  )}
                </div>
                <div className="flex justify-between">
                  <span className="text-body-color dark:text-dark-6">サンプリングレート</span>
                  <span className="font-semibold text-dark dark:text-white">
                    {Math.round(samplingRate * 100)}%
                  </span>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* スクリーンショット */}
      <div className="mt-6 rounded-lg border border-stroke bg-white p-6 shadow-sm dark:border-dark-3 dark:bg-dark-2">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-dark dark:text-white">
            <Camera className="h-5 w-5" />
            サイトスクリーンショット
          </h3>
          <button
            onClick={handleRefreshScreenshots}
            disabled={isScreenshotLoading}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isScreenshotLoading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                再取得中...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                スクリーンショット再取得
              </>
            )}
          </button>
        </div>

        {screenshotMessage && (
          <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400">
            {screenshotMessage}
          </div>
        )}
        {screenshotError && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {screenshotError}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* PC */}
          <div>
            <div className="mb-2 flex items-center gap-1.5 text-sm font-medium text-body-color dark:text-dark-6">
              <Monitor className="h-4 w-4" />
              PC
            </div>
            {siteDetail.pcScreenshotUrl ? (
              <div className="overflow-hidden rounded-lg border border-stroke dark:border-dark-3">
                <img
                  src={siteDetail.pcScreenshotUrl}
                  alt="PC screenshot"
                  className="w-full object-cover"
                />
              </div>
            ) : (
              <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-stroke bg-gray-50 dark:border-dark-3 dark:bg-dark-3">
                <span className="text-sm text-body-color">未取得</span>
              </div>
            )}
          </div>

          {/* モバイル */}
          <div>
            <div className="mb-2 flex items-center gap-1.5 text-sm font-medium text-body-color dark:text-dark-6">
              <Smartphone className="h-4 w-4" />
              モバイル
            </div>
            {siteDetail.mobileScreenshotUrl ? (
              <div className="mx-auto max-w-[200px] overflow-hidden rounded-lg border border-stroke dark:border-dark-3">
                <img
                  src={siteDetail.mobileScreenshotUrl}
                  alt="Mobile screenshot"
                  className="w-full object-cover"
                />
              </div>
            ) : (
              <div className="mx-auto flex h-40 max-w-[200px] items-center justify-center rounded-lg border border-dashed border-stroke bg-gray-50 dark:border-dark-3 dark:bg-dark-3">
                <span className="text-sm text-body-color">未取得</span>
              </div>
            )}
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
              // イベントが文字列かオブジェクトかを判定
              const eventName = typeof event === 'string' ? event : (event.eventName || event.displayName || 'Unknown');
              const eventDisplay = typeof event === 'string' ? event : (event.displayName || event.eventName || 'Unknown');
              
              return (
                <div
                  key={index}
                  className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 dark:bg-dark-3"
                >
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <div className="flex-1">
                    <span className="text-dark dark:text-white">{eventDisplay}</span>
                    {typeof event === 'object' && event.description && (
                      <div className="text-xs text-body-color dark:text-dark-6">
                        {event.description}
                      </div>
                    )}
                  </div>
                  {typeof event === 'object' && event.isActive !== undefined && (
                    <span className={`text-xs ${event.isActive ? 'text-green-600' : 'text-gray-400'}`}>
                      {event.isActive ? '有効' : '無効'}
                    </span>
                  )}
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
          <div className="flex items-center gap-2">
            <button
              onClick={handleStartScraping}
              disabled={isScrapingLoading}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
            {isScrapingLoading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                スクレイピング中...
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                スクレイピング開始
              </>
            )}
            </button>
          </div>
        </div>

        <p className="mb-4 text-xs text-body-color dark:text-dark-6">
          GA4からアクセスが多い上位100ページをスクレイピングし、ページの詳細情報（メタ情報、見出し構造、コンテンツ量など）を取得します。AI改善案生成の精度向上に役立ちます。
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

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-body-color dark:text-dark-6">最終スクレイピング日時</div>
            <div className="mt-1 text-dark dark:text-white">
              {scrapingStatus?.lastScrapedAt
                ? new Date(scrapingStatus.lastScrapedAt.toDate ? scrapingStatus.lastScrapedAt.toDate() : scrapingStatus.lastScrapedAt).toLocaleString('ja-JP', {
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
      
    </div>
  );
}

