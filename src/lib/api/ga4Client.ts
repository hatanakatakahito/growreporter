/**
 * GA4クライアント
 * GA4 Data APIへのリクエストを抽象化
 */

export interface GA4ReportRequest {
  propertyId: string;
  dateRanges: Array<{ startDate: string; endDate: string }>;
  metrics: Array<{ name: string }>;
  dimensions?: Array<{ name: string }>;
  dimensionFilter?: any; // GA4 APIのdimensionFilter構造
  orderBys?: Array<{
    metric?: { metricName: string };
    dimension?: { dimensionName: string };
    desc?: boolean;
  }>;
  limit?: number;
  offset?: number;
}

export interface GA4ReportResponse {
  dimensionHeaders?: Array<{ name: string }>;
  metricHeaders?: Array<{ name: string; type: string }>;
  rows?: Array<{
    dimensionValues?: Array<{ value: string }>;
    metricValues?: Array<{ value: string }>;
  }>;
  rowCount?: number;
  metadata?: any;
}

/**
 * 日付を YYYY-MM-DD 形式に変換（GA4 API要求形式）
 */
function formatDateForGA4(dateStr: string): string {
  // "30daysAgo", "today" などの相対日付はそのまま返す
  if (dateStr.includes('daysAgo') || dateStr === 'today' || dateStr === 'yesterday') {
    return dateStr;
  }
  
  // すでに YYYY-MM-DD 形式の場合はそのまま返す
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  
  // YYYYMMDD 形式を YYYY-MM-DD に変換
  if (/^\d{8}$/.test(dateStr)) {
    return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
  }
  
  return dateStr;
}

/**
 * GA4 Data APIにレポートリクエストを送信
 */
export async function runGA4Report(
  accessToken: string,
  request: GA4ReportRequest
): Promise<GA4ReportResponse> {
  const { propertyId, dateRanges, ...restRequest } = request;
  
  // propertyIdの形式を確認（数値のみの場合は "properties/" プレフィックスを削除）
  let cleanPropertyId = propertyId;
  if (propertyId.startsWith('properties/')) {
    cleanPropertyId = propertyId.replace('properties/', '');
  }
  
  // 日付範囲を GA4 API の形式に変換
  const formattedDateRanges = dateRanges.map(range => ({
    startDate: formatDateForGA4(range.startDate),
    endDate: formatDateForGA4(range.endDate)
  }));
  
  const reportRequest = {
    ...restRequest,
    dateRanges: formattedDateRanges
  };
  
  const apiUrl = `https://analyticsdata.googleapis.com/v1beta/properties/${cleanPropertyId}:runReport`;

  console.log('📊 GA4 API リクエスト送信:', {
    propertyId: cleanPropertyId,
    dateRanges: formattedDateRanges,
    metricsCount: reportRequest.metrics.length,
    dimensionsCount: reportRequest.dimensions?.length || 0
  });

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(reportRequest),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ GA4 API エラー:', {
      status: response.status,
      statusText: response.statusText,
      error: errorText
    });
    
    throw new Error(`GA4 API request failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  console.log('✅ GA4 API レスポンス受信:', {
    rowCount: data.rowCount || 0,
    hasRows: !!data.rows
  });

  return data;
}
