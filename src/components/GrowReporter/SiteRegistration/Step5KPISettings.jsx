import React, { useState, useEffect } from 'react';

export default function Step5KPISettings({ siteData, setSiteData }) {
  const [error, setError] = useState(null);
  const [selectedMetric, setSelectedMetric] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [kpiList, setKpiList] = useState(siteData.kpiSettings?.kpiList || []);

  // 基本指標のプリセット
  const BASIC_METRICS = [
    { value: 'users', label: 'ユーザー数' },
    { value: 'sessions', label: 'セッション数' },
    { value: 'pageviews', label: 'ページビュー数' },
    { value: 'engagement_rate', label: 'エンゲージメント率 (%)' },
    { value: 'target_sessions', label: '目標セッション数' },
    { value: 'target_users', label: '目標ユーザー数' },
    { value: 'target_conversions', label: '目標コンバージョン数' },
    { value: 'target_conversion_rate', label: '目標コンバージョン率 (%)' },
  ];

  // コンバージョンイベントを指標として追加
  const CONVERSION_METRICS = (siteData.conversionEvents || []).map(event => ({
    value: `conversion_${event.eventName}`,
    label: event.displayName,
    eventName: event.eventName,
    isConversion: true,
  }));

  // 全指標をマージ
  const ALL_METRICS = [
    ...BASIC_METRICS,
    ...CONVERSION_METRICS,
  ];

  // 初期化: 既存のKPIを復元
  useEffect(() => {
    if (siteData.kpiSettings?.kpiList) {
      setKpiList(siteData.kpiSettings.kpiList);
    }
  }, [siteData.kpiSettings]);

  // KPIの追加
  const handleAddKPI = (e) => {
    e.preventDefault();
    setError(null);

    // バリデーション
    if (!selectedMetric) {
      setError('目標を選択してください');
      return;
    }

    if (!targetValue || parseFloat(targetValue) <= 0) {
      setError('目標値は0より大きい数値を入力してください');
      return;
    }

    // 重複チェック
    if (kpiList.some(kpi => kpi.metric === selectedMetric)) {
      setError('この指標は既に追加されています');
      return;
    }

    // 選択された指標の情報を取得
    const metricInfo = ALL_METRICS.find(m => m.value === selectedMetric);
    
    const newKPI = {
      id: `kpi_${Date.now()}`,
      metric: selectedMetric,
      label: metricInfo?.label || selectedMetric,
      target: parseFloat(targetValue),
      period: 'monthly',
      isActive: true,
      isConversion: metricInfo?.isConversion || false,
      eventName: metricInfo?.eventName || null,
    };

    const newKpiList = [...kpiList, newKPI];
    setKpiList(newKpiList);

    // フォームをリセット
    setSelectedMetric('');
    setTargetValue('');
  };

  // KPIの削除
  const handleRemoveKPI = (kpiId) => {
    const newKpiList = kpiList.filter(kpi => kpi.id !== kpiId);
    setKpiList(newKpiList);
  };

  // 親コンポーネントにデータを反映
  useEffect(() => {
    // 基本KPIの値を計算
    const targetSessions = kpiList.find(k => k.metric === 'target_sessions')?.target || 0;
    const targetUsers = kpiList.find(k => k.metric === 'target_users')?.target || 0;
    const targetConversions = kpiList.find(k => k.metric === 'target_conversions')?.target || 0;
    const targetConversionRate = kpiList.find(k => k.metric === 'target_conversion_rate')?.target || 0;

    setSiteData(prev => ({
      ...prev,
      kpiSettings: {
        targetSessions,
        targetUsers,
        targetConversions,
        targetConversionRate,
        kpiList,
      },
    }));
  }, [kpiList, setSiteData]);

  // 選択可能な指標（まだ追加されていないもの）
  const availableMetrics = ALL_METRICS.filter(
    metric => !kpiList.some(kpi => kpi.metric === metric.value)
  );

  return (
    <div className="space-y-6">
      {/* 説明 */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/30 dark:bg-blue-900/20">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
            <svg className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
              サイトの目標値（KPI）を設定してください
            </p>
            <p className="mt-1 text-xs text-blue-700 dark:text-blue-400">
              設定したKPIは分析画面で継続的に表示され、目標達成状況を確認できます。
            </p>
          </div>
        </div>
      </div>

      {/* エラーメッセージ */}
      {error && (
        <div className="flex items-start gap-3 rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <svg className="h-5 w-5 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800 dark:text-red-300">{error}</p>
          </div>
        </div>
      )}

      {/* カスタムKPI設定（任意） */}
      <div className="rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
        <h3 className="mb-4 text-lg font-semibold text-dark dark:text-white">
          カスタムKPI設定（任意）
        </h3>
        
        <form onSubmit={handleAddKPI} className="space-y-4">
          <div className="flex gap-3">
            {/* 目標選択 */}
            <div className="flex-1">
              <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                目標
              </label>
              <div className="relative">
                <select
                  value={selectedMetric}
                  onChange={(e) => setSelectedMetric(e.target.value)}
                  className="w-full appearance-none rounded-md border border-stroke bg-transparent px-4 py-2 text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:text-white dark:focus:border-primary"
                >
                  <option value="">選択してください</option>
                  
                  {/* 基本指標 */}
                  <optgroup label="基本指標">
                    {BASIC_METRICS.filter(m => !kpiList.some(kpi => kpi.metric === m.value)).map((metric) => (
                      <option key={metric.value} value={metric.value}>
                        {metric.label}
                      </option>
                    ))}
                  </optgroup>
                  
                  {/* コンバージョン */}
                  {CONVERSION_METRICS.length > 0 && (
                    <optgroup label="コンバージョン">
                      {CONVERSION_METRICS.filter(m => !kpiList.some(kpi => kpi.metric === m.value)).map((metric) => (
                        <option key={metric.value} value={metric.value}>
                          {metric.label}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5 7.5L10 12.5L15 7.5" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
              </div>
            </div>

            {/* 目標値（月間） */}
            <div className="flex-1">
              <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                目標値（月間）
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
                placeholder="数値を入力"
                className="w-full rounded-md border border-stroke bg-transparent px-4 py-2 text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:text-white dark:focus:border-primary"
              />
            </div>

            {/* 追加ボタン */}
            <div className="flex items-end">
              <button
                type="submit"
                disabled={!selectedMetric || !targetValue}
                className="rounded-md bg-primary px-8 py-2 text-sm font-medium text-white transition hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                追加
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* 設定済みKPI一覧 */}
      {kpiList.length > 0 && (
        <div className="space-y-2">
          {kpiList.map((kpi) => (
            <div
              key={kpi.id}
              className="flex items-center justify-between rounded-md border border-stroke bg-white p-4 dark:border-dark-3 dark:bg-dark-2"
            >
              <div className="flex-1">
                <div className="font-medium text-dark dark:text-white">
                  {kpi.label}
                </div>
                <div className="mt-1 text-sm text-body-color">
                  目標値: {kpi.target.toLocaleString()}
                </div>
              </div>
              <button
                onClick={() => handleRemoveKPI(kpi.id)}
                className="text-red-600 transition hover:text-red-700 dark:text-red-400 dark:hover:text-red-500"
                title="削除"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* スキップ可能の注意 */}
      {kpiList.length === 0 && (
        <div className="rounded-lg border border-stroke bg-white p-4 dark:border-dark-3 dark:bg-dark-2">
          <p className="text-sm text-body-color">
            ℹ️ KPI設定は任意です。後から設定することもできます。
          </p>
        </div>
      )}
    </div>
  );
}
