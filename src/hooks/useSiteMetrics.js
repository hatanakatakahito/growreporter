import { useGA4Data } from './useGA4Data';
import { useGSCData } from './useGSCData';
import { useSite } from '../contexts/SiteContext';

/**
 * サイトの全指標（GA4 + GSC）を取得するカスタムフック
 * @param {string} siteId - サイトID
 * @param {string} startDate - 開始日 (YYYY-MM-DD)
 * @param {string} endDate - 終了日 (YYYY-MM-DD)
 * @returns {object} - GA4とGSCのデータ、ローディング状態、エラー状態
 */
export function useSiteMetrics(siteId, startDate, endDate) {
  const { selectedSite } = useSite();
  
  // Search Console未連携の場合をチェック
  const hasGSCConnection = selectedSite?.gscSiteUrl && selectedSite?.gscOauthTokenId;
  
  // ダッシュボード用の基本メトリクスを取得
  const ga4Query = useGA4Data(
    siteId,
    startDate,
    endDate,
    ['sessions', 'totalUsers', 'newUsers', 'screenPageViews', 'engagementRate', 'conversions'],
    []
  );
  const gscQuery = useGSCData(siteId, startDate, endDate);

  // データを統合
  const data = ga4Query.data || gscQuery.data ? {
    metrics: {
      sessions: ga4Query.data?.metrics?.sessions || 0,
      totalUsers: ga4Query.data?.metrics?.totalUsers || 0,
      newUsers: ga4Query.data?.metrics?.newUsers || 0,
      pageViews: ga4Query.data?.metrics?.screenPageViews || 0,
      engagementRate: ga4Query.data?.metrics?.engagementRate || 0,
      conversions: ga4Query.data?.metrics?.totalConversions || 0, // 総コンバージョン数
      clicks: gscQuery.data?.metrics?.clicks || 0,
      impressions: gscQuery.data?.metrics?.impressions || 0,
      ctr: gscQuery.data?.metrics?.ctr || 0,
      position: gscQuery.data?.metrics?.position || 0,
    },
    // コンバージョン内訳（オブジェクト）を追加
    conversions: ga4Query.data?.metrics?.conversions || {},
  } : null;

  return {
    // 統合データ
    data,
    
    // 個別データ
    ga4: ga4Query.data,
    gsc: gscQuery.data,
    
    // ローディング状態
    isLoading: ga4Query.isLoading || gscQuery.isLoading,
    isGA4Loading: ga4Query.isLoading,
    isGSCLoading: gscQuery.isLoading,
    
    // エラー状態
    isError: ga4Query.isError || gscQuery.isError,
    isGA4Error: ga4Query.isError,
    isGSCError: gscQuery.isError,
    error: ga4Query.error || gscQuery.error,
    ga4Error: ga4Query.error,
    gscError: gscQuery.error,
    
    // 再取得
    refetch: () => {
      ga4Query.refetch();
      gscQuery.refetch();
    },
    refetchGA4: ga4Query.refetch,
    refetchGSC: gscQuery.refetch,
    
    // その他の状態
    isFetching: ga4Query.isFetching || gscQuery.isFetching,
  };
}

