'use client';

/**
 * 目標KPI設定ページ
 * - コンバージョン設定
 * - KPI設定
 */

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/lib/auth/authContext';
import { useRouter } from 'next/navigation';
import { ConversionService, ConversionEvent } from '@/lib/conversion/conversionService';
import { GA4DataService } from '@/lib/api/ga4DataService';

export default function GoalSettingsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'conversion' | 'kpi'>('conversion');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // コンバージョン設定
  const [ga4Events, setGa4Events] = useState<Array<{ eventName: string; eventCount: number }>>([]);
  const [selectedConversions, setSelectedConversions] = useState<ConversionEvent[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);

  // KPI設定
  const [kpiSettings, setKpiSettings] = useState({
    targetUsers: '',
    targetSessions: '',
    targetPageviews: '',
    targetConversions: '',
    targetConversionRate: '',
    targetEngagementRate: ''
  });

  // GA4プロパティIDを取得
  useEffect(() => {
    if (!user) return;

    const fetchPropertyId = async () => {
      try {
        console.log('🔍 GA4プロパティID取得開始');
        const response = await fetch('/api/datasources/list', {
          headers: { 'x-user-id': user.uid }
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('📊 取得したデータソース情報:', data);
          const propertyId = data.selectedGA4PropertyId?.replace('properties/', '') || null;
          console.log('✅ GA4プロパティID:', propertyId);
          setSelectedPropertyId(propertyId);
        } else {
          console.error('❌ データソース取得失敗:', response.status);
        }
      } catch (err) {
        console.error('❌ プロパティID取得エラー:', err);
      }
    };

    fetchPropertyId();
  }, [user]);

  // 既存のコンバージョン定義を読み込み
  useEffect(() => {
    if (!user) return;

    const loadConversions = async () => {
      try {
        const conversions = await ConversionService.getConversions(user.uid);
        console.log('📋 読み込んだコンバージョン:', conversions);
        setSelectedConversions(conversions);
      } catch (err) {
        console.error('コンバージョン読み込みエラー:', err);
      }
    };

    loadConversions();
  }, [user]);

  // GA4イベント一覧を取得
  const handleFetchEvents = async () => {
    if (!user || !selectedPropertyId) {
      setError('GA4プロパティが設定されていません。');
      return;
    }

    try {
      setIsLoadingEvents(true);
      setError(null);

      // 過去30日間のイベントを取得
      const today = new Date();
      const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      const formatDate = (date: Date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}${m}${d}`;
      };

      const events = await GA4DataService.getEvents(
        user.uid,
        selectedPropertyId,
        formatDate(thirtyDaysAgo),
        formatDate(today)
      );

      setGa4Events(events);
      setSuccess('イベントを取得しました！');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('イベント取得エラー:', err);
      setError('イベントの取得に失敗しました。');
    } finally {
      setIsLoadingEvents(false);
    }
  };

  // コンバージョンを追加
  const handleAddConversion = async (eventName: string) => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);

      const newConversion: Omit<ConversionEvent, 'id' | 'createdAt' | 'updatedAt'> = {
        userId: user.uid,
        eventName,
        displayName: eventName,
        isActive: true
      };

      const conversionId = await ConversionService.addConversion(newConversion);
      
      // ローカルステートを更新
      setSelectedConversions([
        ...selectedConversions,
        {
          ...newConversion,
          id: conversionId,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]);

      setSuccess('コンバージョンを追加しました！');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('コンバージョン追加エラー:', err);
      setError('コンバージョンの追加に失敗しました。');
    } finally {
      setIsLoading(false);
    }
  };

  // コンバージョンを削除
  const handleRemoveConversion = async (conversionId: string) => {
    if (!user) return;

    console.log('🗑️ 削除するコンバージョンID:', conversionId);
    console.log('📋 削除前のコンバージョン一覧:', selectedConversions);

    try {
      setIsLoading(true);
      setError(null);

      await ConversionService.deleteConversion(user.uid, conversionId);
      
      console.log('✅ Firestoreから削除完了');
      
      // Firestoreから最新のデータを再取得して確実に反映
      const updatedConversions = await ConversionService.getConversions(user.uid);
      console.log('📋 Firestoreから再取得したコンバージョン:', updatedConversions);
      setSelectedConversions(updatedConversions);

      setSuccess('コンバージョンを削除しました！');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('コンバージョン削除エラー:', err);
      setError('コンバージョンの削除に失敗しました。');
    } finally {
      setIsLoading(false);
    }
  };

  // KPI設定を保存
  const handleSaveKPI = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);

      // Firestoreに保存（実装は後ほど）
      // TODO: KPI設定を保存するサービスを実装

      setSuccess('KPI設定を保存しました！');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('KPI保存エラー:', err);
      setError('KPI設定の保存に失敗しました。');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardLayout>
      {!user ? (
        <div className="flex min-h-[400px] items-center justify-center">
          <p className="text-body-color dark:text-dark-6">読み込み中...</p>
        </div>
      ) : (
      <div className="mx-auto max-w-screen-2xl p-4 md:p-6 2xl:p-10">
        {/* ページヘッダー */}
        <div className="mb-6">
          <h1 className="mb-2 text-3xl font-bold text-dark dark:text-white">
            目標KPI設定
          </h1>
          <p className="text-body-color dark:text-dark-6">
            コンバージョンとKPIの目標値を設定します
          </p>
        </div>

        {/* エラー・成功メッセージ */}
        {error && (
          <div className="mb-6 rounded-md border-l-4 border-red-500 bg-red-50 p-4 dark:bg-red-900/20">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}
        {success && (
          <div className="mb-6 rounded-md border-l-4 border-green-500 bg-green-50 p-4 dark:bg-green-900/20">
            <p className="text-sm text-green-800 dark:text-green-200">{success}</p>
          </div>
        )}

        {/* タブ切り替え */}
        <div className="mb-6 flex gap-2 border-b border-stroke dark:border-dark-3">
          <button
            onClick={() => setActiveTab('conversion')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'conversion'
                ? 'border-b-2 border-primary text-primary'
                : 'text-body-color hover:text-primary dark:text-dark-6'
            }`}
          >
            コンバージョン設定
          </button>
          <button
            onClick={() => setActiveTab('kpi')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'kpi'
                ? 'border-b-2 border-primary text-primary'
                : 'text-body-color hover:text-primary dark:text-dark-6'
            }`}
          >
            KPI設定
          </button>
        </div>

        {/* コンバージョン設定 */}
        {activeTab === 'conversion' && (
          <div className="space-y-6">
            {/* イベント取得ボタン */}
            <div className="rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
              <h2 className="mb-4 text-xl font-semibold text-dark dark:text-white">
                GA4イベントを取得
              </h2>
              <p className="mb-4 text-sm text-body-color dark:text-dark-6">
                過去30日間に発生したGA4イベントを取得して、コンバージョンとして定義できます。
              </p>
              {!selectedPropertyId && (
                <div className="mb-4 rounded-md bg-yellow-50 p-3 dark:bg-yellow-900/20">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    ⚠️ GA4プロパティが設定されていません。先に<a href="/site-settings" className="underline">サイト設定</a>でGoogle Analyticsを接続してください。
                  </p>
                </div>
              )}
              <button
                onClick={handleFetchEvents}
                disabled={isLoadingEvents || !selectedPropertyId}
                className="rounded-md bg-primary px-6 py-3 text-white hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoadingEvents ? 'イベント取得中...' : 'イベントを取得'}
              </button>
            </div>

            {/* イベント一覧 */}
            {ga4Events.length > 0 && (
              <div className="rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
                <h2 className="mb-4 text-xl font-semibold text-dark dark:text-white">
                  利用可能なイベント
                </h2>
                <div className="space-y-2">
                  {ga4Events.map((event) => {
                    const isSelected = selectedConversions.some(c => c.eventName === event.eventName);
                    return (
                      <div
                        key={event.eventName}
                        className="flex items-center justify-between rounded-md border border-stroke p-4 dark:border-dark-3"
                      >
                        <div>
                          <p className="font-medium text-dark dark:text-white">{event.eventName}</p>
                          <p className="text-sm text-body-color dark:text-dark-6">
                            発生回数: {event.eventCount.toLocaleString()}
                          </p>
                        </div>
                        <button
                          onClick={() => isSelected ? null : handleAddConversion(event.eventName)}
                          disabled={isSelected || isLoading}
                          className={`rounded-md px-4 py-2 text-sm font-medium ${
                            isSelected
                              ? 'bg-gray-3 text-body-color cursor-not-allowed dark:bg-dark-3'
                              : 'bg-primary text-white hover:bg-opacity-90'
                          }`}
                        >
                          {isSelected ? '追加済み' : '追加'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 定義済みコンバージョン */}
            <div className="rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
              <h2 className="mb-4 text-xl font-semibold text-dark dark:text-white">
                定義済みコンバージョン
              </h2>
              {selectedConversions.length === 0 ? (
                <p className="text-body-color dark:text-dark-6">
                  まだコンバージョンが定義されていません。
                </p>
              ) : (
                <div className="space-y-2">
                  {selectedConversions.map((conversion, index) => (
                    <div
                      key={conversion.id || `conversion-${index}`}
                      className="flex items-center justify-between rounded-md border border-stroke p-4 dark:border-dark-3"
                    >
                      <div>
                        <p className="font-medium text-dark dark:text-white">{conversion.displayName}</p>
                        <p className="text-sm text-body-color dark:text-dark-6">
                          イベント名: {conversion.eventName}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRemoveConversion(conversion.id)}
                        disabled={isLoading}
                        className="rounded-md bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90 disabled:opacity-50"
                      >
                        削除
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* KPI設定 */}
        {activeTab === 'kpi' && (
          <div className="rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
            <h2 className="mb-6 text-xl font-semibold text-dark dark:text-white">
              目標KPI設定
            </h2>
            <p className="mb-6 text-sm text-body-color dark:text-dark-6">
              月次の目標値を設定します。設定した目標値は各レポート画面で参照できます。
            </p>

            <div className="space-y-4">
              {/* 目標ユーザー数 */}
              <div>
                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                  目標ユーザー数（月次）
                </label>
                <input
                  type="number"
                  value={kpiSettings.targetUsers}
                  onChange={(e) => setKpiSettings({ ...kpiSettings, targetUsers: e.target.value })}
                  className="w-full rounded-md border border-stroke bg-transparent px-4 py-3 text-dark outline-none focus:border-primary dark:border-dark-3 dark:text-white"
                  placeholder="10000"
                />
              </div>

              {/* 目標セッション数 */}
              <div>
                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                  目標セッション数（月次）
                </label>
                <input
                  type="number"
                  value={kpiSettings.targetSessions}
                  onChange={(e) => setKpiSettings({ ...kpiSettings, targetSessions: e.target.value })}
                  className="w-full rounded-md border border-stroke bg-transparent px-4 py-3 text-dark outline-none focus:border-primary dark:border-dark-3 dark:text-white"
                  placeholder="15000"
                />
              </div>

              {/* 目標ページビュー数 */}
              <div>
                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                  目標ページビュー数（月次）
                </label>
                <input
                  type="number"
                  value={kpiSettings.targetPageviews}
                  onChange={(e) => setKpiSettings({ ...kpiSettings, targetPageviews: e.target.value })}
                  className="w-full rounded-md border border-stroke bg-transparent px-4 py-3 text-dark outline-none focus:border-primary dark:border-dark-3 dark:text-white"
                  placeholder="30000"
                />
              </div>

              {/* 目標コンバージョン数 */}
              <div>
                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                  目標コンバージョン数（月次）
                </label>
                <input
                  type="number"
                  value={kpiSettings.targetConversions}
                  onChange={(e) => setKpiSettings({ ...kpiSettings, targetConversions: e.target.value })}
                  className="w-full rounded-md border border-stroke bg-transparent px-4 py-3 text-dark outline-none focus:border-primary dark:border-dark-3 dark:text-white"
                  placeholder="100"
                />
              </div>

              {/* 目標コンバージョン率 */}
              <div>
                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                  目標コンバージョン率（%）
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={kpiSettings.targetConversionRate}
                  onChange={(e) => setKpiSettings({ ...kpiSettings, targetConversionRate: e.target.value })}
                  className="w-full rounded-md border border-stroke bg-transparent px-4 py-3 text-dark outline-none focus:border-primary dark:border-dark-3 dark:text-white"
                  placeholder="2.0"
                />
              </div>

              {/* 目標エンゲージメント率 */}
              <div>
                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                  目標エンゲージメント率（%）
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={kpiSettings.targetEngagementRate}
                  onChange={(e) => setKpiSettings({ ...kpiSettings, targetEngagementRate: e.target.value })}
                  className="w-full rounded-md border border-stroke bg-transparent px-4 py-3 text-dark outline-none focus:border-primary dark:border-dark-3 dark:text-white"
                  placeholder="65.0"
                />
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleSaveKPI}
                  disabled={isLoading}
                  className="rounded-md bg-primary px-6 py-3 text-white hover:bg-opacity-90 disabled:opacity-50"
                >
                  {isLoading ? '保存中...' : 'KPI設定を保存'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 戻るボタン */}
        <div className="mt-6">
          <button
            onClick={() => router.push('/summary')}
            className="rounded-md border border-stroke px-6 py-3 text-dark hover:bg-gray-2 dark:border-dark-3 dark:text-white"
          >
            ダッシュボードに戻る
          </button>
        </div>
      </div>
      )}
    </DashboardLayout>
  );
}

