'use client';

import { useEffect, useState } from 'react';

interface DemographicsData {
  ageData: Array<{
    age: string;
    users: number;
    percentage: number;
  }>;
  regionData: Array<{
    region: string;
    users: number;
    percentage: number;
  }>;
  deviceData: Array<{
    deviceCategory: string;
    users: number;
    percentage: number;
  }>;
}

export default function UsersPDFPage() {
  const [data, setData] = useState<DemographicsData | null>(null);
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
        
        // デモグラフィックデータを取得
        const demographicsResponse = await fetch(`${baseUrl}/api/ga4/demographics?propertyId=300476400&startDate=2025-09-01&endDate=2025-09-30`, {
          method: 'GET',
          headers: {
            'x-user-id': userId
          }
        });

        const demographics = demographicsResponse.ok ? await demographicsResponse.json() : null;
        setData(demographics);
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

  if (!data) {
    return (
      <div className="min-h-screen bg-white p-8">
        <div className="text-center">
          <div className="text-lg text-red-600">データの取得に失敗しました</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-4xl mx-auto">
        {/* ヘッダー */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            ユーザー分析レポート
          </h1>
          <p className="text-gray-600">
            期間: 2025年9月1日 - 2025年9月30日
          </p>
        </div>

        {/* 年齢分布 */}
        {data.ageData && data.ageData.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              年齢分布
            </h2>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="space-y-3">
                {data.ageData.map((age, index) => (
                  <div key={index} className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0">
                    <div className="font-medium text-gray-900">{age.age}</div>
                    <div className="text-sm text-gray-600">
                      {age.users.toLocaleString()}人 ({age.percentage.toFixed(1)}%)
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 地域分布（上位10地域） */}
        {data.regionData && data.regionData.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              地域分布（上位10地域）
            </h2>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="space-y-3">
                {data.regionData.slice(0, 10).map((region, index) => (
                  <div key={index} className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0">
                    <div className="font-medium text-gray-900">{region.region}</div>
                    <div className="text-sm text-gray-600">
                      {region.users.toLocaleString()}人 ({region.percentage.toFixed(1)}%)
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* デバイス分布 */}
        {data.deviceData && data.deviceData.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              デバイス分布
            </h2>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="space-y-3">
                {data.deviceData.map((device, index) => (
                  <div key={index} className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0">
                    <div className="font-medium text-gray-900">{device.deviceCategory}</div>
                    <div className="text-sm text-gray-600">
                      {device.users.toLocaleString()}人 ({device.percentage.toFixed(1)}%)
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


