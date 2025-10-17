'use client';

import { useEffect, useState } from 'react';

interface SummaryData {
  metrics: {
    totalUsers: number;
    newUsers: number;
    sessions: number;
    activeUsers: number;
    engagementRate: number;
    screenPageViews: number;
    averageSessionDuration: number;
    conversions: number;
    conversionRate: number;
  };
  monthly: {
    monthlyData: Array<{
      displayName: string;
      sessions: number;
      conversions: number;
    }>;
  };
}

export default function SummaryPDFPage() {
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // URLパラメータからuserIdを取得
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('userId');
    
    if (!userId) {
      setLoading(false);
      return;
    }

    // データを取得
    const fetchData = async () => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        
        // GA4メトリクスを取得
        const metricsResponse = await fetch(`${baseUrl}/api/ga4/metrics`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': userId
          },
          body: JSON.stringify({
            propertyId: '300476400',
            startDate: '2025-09-01',
            endDate: '2025-09-30'
          })
        });

        // 月別データを取得
        const monthlyResponse = await fetch(`${baseUrl}/api/ga4/monthly-data`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': userId
          },
          body: JSON.stringify({
            propertyId: '300476400',
            endDate: '2025-09-30'
          })
        });

        const metrics = metricsResponse.ok ? await metricsResponse.json() : null;
        const monthly = monthlyResponse.ok ? await monthlyResponse.json() : null;

        setData({ metrics, monthly });
      } catch (error) {
        console.error('データ取得エラー:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-white p-8">
        <div className="text-center">
          <div className="text-lg">データを読み込み中...</div>
        </div>
      </div>
    );
  }

  if (!data || !data.metrics) {
    return (
      <div className="min-h-screen bg-white p-8">
        <div className="text-center">
          <div className="text-lg text-red-600">データの取得に失敗しました</div>
        </div>
      </div>
    );
  }

  const { metrics, monthly } = data;

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-4xl mx-auto">
        {/* ヘッダー */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            全体サマリーレポート
          </h1>
          <p className="text-gray-600">
            期間: 2025年9月1日 - 2025年9月30日
          </p>
        </div>

        {/* 主要メトリクス */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            主要メトリクス
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-sm text-blue-600 font-medium">総ユーザー数</div>
              <div className="text-2xl font-bold text-blue-900">
                {metrics.totalUsers.toLocaleString()}
              </div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-sm text-green-600 font-medium">新規ユーザー数</div>
              <div className="text-2xl font-bold text-green-900">
                {metrics.newUsers.toLocaleString()}
              </div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-sm text-purple-600 font-medium">セッション数</div>
              <div className="text-2xl font-bold text-purple-900">
                {metrics.sessions.toLocaleString()}
              </div>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="text-sm text-orange-600 font-medium">ページビュー数</div>
              <div className="text-2xl font-bold text-orange-900">
                {metrics.screenPageViews.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* エンゲージメント指標 */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            エンゲージメント指標
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-indigo-50 p-4 rounded-lg">
              <div className="text-sm text-indigo-600 font-medium">エンゲージメント率</div>
              <div className="text-2xl font-bold text-indigo-900">
                {metrics.engagementRate.toFixed(1)}%
              </div>
            </div>
            <div className="bg-pink-50 p-4 rounded-lg">
              <div className="text-sm text-pink-600 font-medium">平均セッション時間</div>
              <div className="text-2xl font-bold text-pink-900">
                {Math.round(metrics.averageSessionDuration)}秒
              </div>
            </div>
            <div className="bg-teal-50 p-4 rounded-lg">
              <div className="text-sm text-teal-600 font-medium">平均ページビュー</div>
              <div className="text-2xl font-bold text-teal-900">
                {(metrics.screenPageViews / metrics.sessions).toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        {/* コンバージョン指標 */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            コンバージョン指標
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="text-sm text-red-600 font-medium">コンバージョン数</div>
              <div className="text-2xl font-bold text-red-900">
                {metrics.conversions.toLocaleString()}
              </div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="text-sm text-yellow-600 font-medium">コンバージョン率</div>
              <div className="text-2xl font-bold text-yellow-900">
                {metrics.conversionRate.toFixed(2)}%
              </div>
            </div>
          </div>
        </div>

        {/* 月別トレンド */}
        {monthly && monthly.monthlyData && (
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              月別トレンド（過去3ヶ月）
            </h2>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="space-y-3">
                {monthly.monthlyData.slice(0, 3).map((month, index) => (
                  <div key={index} className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0">
                    <div className="font-medium text-gray-900">{month.displayName}</div>
                    <div className="text-sm text-gray-600">
                      セッション: {month.sessions.toLocaleString()}, 
                      コンバージョン: {month.conversions}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* フッター */}
        <div className="text-center text-sm text-gray-500 mt-8">
          生成日時: {new Date().toLocaleString('ja-JP')}
        </div>
      </div>
    </div>
  );
}


