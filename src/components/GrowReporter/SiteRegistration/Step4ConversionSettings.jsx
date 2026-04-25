import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { db } from '../../../config/firebase';
import { doc, getDoc } from 'firebase/firestore';

export default function Step4ConversionSettings({ siteData, setSiteData }) {
  const { currentUser } = useAuth();
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [error, setError] = useState(null);
  const [ga4Events, setGa4Events] = useState([]);
  const [selectedEvents, setSelectedEvents] = useState(siteData.conversionEvents || []);
  const [showEventModal, setShowEventModal] = useState(false);

  // GA4イベント一覧を取得
  useEffect(() => {
    const fetchGA4Events = async () => {
      if (!siteData.ga4PropertyId || !siteData.ga4OauthTokenId) {
        // GA4が未接続の場合はエラーメッセージを表示
        setError('GA4プロパティが接続されていません。上のGA4連携セクションで接続してください。');
        setGa4Events([]);
        return;
      }

      setIsLoadingEvents(true);
      setError(null);

      try {
        // トークンを取得（サイトオーナー配下。編集者で開く場合は siteData.userId）
        const ownerId = siteData.userId ?? currentUser?.uid;
        const tokenRef = doc(db, 'users', ownerId, 'oauth_tokens', siteData.ga4OauthTokenId);
        const tokenSnap = await getDoc(tokenRef);

        if (!tokenSnap.exists()) {
          throw new Error('GA4トークンが見つかりません');
        }

        const tokenData = tokenSnap.data();

        // アクセストークンの有効期限をチェック
        const expiresAt = tokenData.expires_at?.toDate ? tokenData.expires_at.toDate() : new Date(tokenData.expires_at);
        const now = new Date();

        if (expiresAt <= now) {
          setError('アクセストークンの有効期限が切れています。STEP 2で再接続してください。');
          setGa4Events([]);
          setIsLoadingEvents(false);
          return;
        }

        // GA4 Data API でイベント一覧を取得
        console.log('[ConversionSettings] GA4イベント取得開始');
        
        try {
          // 前月 1 日〜前月末日（当月は含めない）のイベントデータを取得し、
          // ユニークなイベント名を抽出する
          const today = new Date();
          const startOfPrevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
          const endOfPrevMonth = new Date(today.getFullYear(), today.getMonth(), 0); // 当月 0 日 = 前月末日
          const formatYMD = (d) => {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
          };
          const startDateStr = formatYMD(startOfPrevMonth);
          const endDateStr = formatYMD(endOfPrevMonth);
          const prevMonthLabel = `${startOfPrevMonth.getFullYear()}-${String(startOfPrevMonth.getMonth() + 1).padStart(2, '0')}`;

          const requestBody = {
            dateRanges: [
              {
                startDate: startDateStr,
                endDate: endDateStr,
              }
            ],
            dimensions: [
              { name: 'eventName' }
            ],
            metrics: [
              { name: 'eventCount' }
            ],
            limit: 100, // 最大100イベント
            orderBys: [
              {
                metric: { metricName: 'eventCount' },
                desc: true
              }
            ]
          };

          const response = await fetch(
            `https://analyticsdata.googleapis.com/v1beta/properties/${siteData.ga4PropertyId}:runReport`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${tokenData.access_token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(requestBody),
            }
          );

          if (!response.ok) {
            const errorData = await response.json();
            console.error('[ConversionSettings] GA4 APIエラー:', errorData);
            throw new Error(`GA4イベントの取得に失敗しました: ${errorData.error?.message || response.statusText}`);
          }

          const data = await response.json();
          console.log('[ConversionSettings] GA4データ取得成功:', data);

          // レスポンスからイベント一覧を抽出
          const rows = data.rows || [];
          const fetchedEvents = rows.map(row => {
            const eventName = row.dimensionValues[0].value;
            const eventCount = parseInt(row.metricValues[0].value);

            // イベント名からカテゴリを推測
            let category = 'custom';
            const lowerEventName = eventName.toLowerCase();
            
            if (lowerEventName.includes('purchase') || lowerEventName.includes('buy') || lowerEventName.includes('order') || lowerEventName === 'add_to_cart' || lowerEventName === 'begin_checkout') {
              category = 'purchase';
            } else if (lowerEventName.includes('lead') || lowerEventName.includes('form') || lowerEventName === 'sign_up' || lowerEventName.includes('contact') || lowerEventName === 'generate_lead') {
              category = 'lead';
            } else if (lowerEventName.includes('video') || lowerEventName.includes('download') || lowerEventName.includes('scroll') || lowerEventName.includes('engagement') || lowerEventName === 'file_download') {
              category = 'engagement';
            }

            // 表示名を生成（キャメルケースやスネークケースを読みやすく）
            let displayName = eventName
              .replace(/_/g, ' ')
              .replace(/([A-Z])/g, ' $1')
              .trim()
              .split(' ')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
              .join(' ');

            return {
              eventName: eventName,
              displayName: displayName,
              category: category,
              description: `前月 (${prevMonthLabel}): ${eventCount.toLocaleString()}回`,
            };
          });

          console.log('[ConversionSettings] 取得したイベント:', fetchedEvents.length, '件');

          // 標準イベントは含めず、GA4から取得したイベントのみを使用
          setGa4Events(fetchedEvents);

        } catch (apiError) {
          console.error('[ConversionSettings] GA4 API呼び出しエラー:', apiError);
          setError(`GA4イベントの取得に失敗しました: ${apiError.message}`);
          setGa4Events([]);
        }

      } catch (err) {
        console.error('[ConversionSettings] イベント取得エラー:', err);
        setError('イベントの取得に失敗しました。');
        setGa4Events([]);
      } finally {
        setIsLoadingEvents(false);
      }
    };

    fetchGA4Events();
  }, [siteData.ga4PropertyId, siteData.ga4OauthTokenId]);

  // 既存の選択状態を復元
  useEffect(() => {
    if (siteData.conversionEvents && siteData.conversionEvents.length > 0) {
      setSelectedEvents(siteData.conversionEvents);
    }
  }, [siteData.conversionEvents]);

  // イベントの選択/選択解除
  const handleEventToggle = (event) => {
    const isSelected = selectedEvents.some(e => e.eventName === event.eventName);

    if (isSelected) {
      // 選択解除
      const newSelectedEvents = selectedEvents.filter(e => e.eventName !== event.eventName);
      setSelectedEvents(newSelectedEvents);
      setSiteData(prev => ({
        ...prev,
        conversionEvents: newSelectedEvents,
      }));
    } else {
      // 選択
      const newEvent = {
        eventName: event.eventName,
        displayName: event.displayName,
        description: event.description || '',
        category: event.category,
        isActive: true,
      };
      const newSelectedEvents = [...selectedEvents, newEvent];
      setSelectedEvents(newSelectedEvents);
      setSiteData(prev => ({
        ...prev,
        conversionEvents: newSelectedEvents,
      }));
    }
  };

  // イベントの削除
  const handleRemoveEvent = (eventName) => {
    const newSelectedEvents = selectedEvents.filter(e => e.eventName !== eventName);
    setSelectedEvents(newSelectedEvents);
    setSiteData(prev => ({
      ...prev,
      conversionEvents: newSelectedEvents,
    }));
  };

  // イベントが選択されているかチェック
  const isEventSelected = (eventName) => {
    return selectedEvents.some(e => e.eventName === eventName);
  };

  // 選択されたイベントの情報を取得
  const getSelectedEvent = (eventName) => {
    return selectedEvents.find(e => e.eventName === eventName);
  };

  return (
    <div className="space-y-6">
      {/* エラーメッセージ */}
      {error && (
        <div className="flex items-center gap-3 rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
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

      {/* GA4イベントから選択ボタン */}
      <div>
        <button
          onClick={() => setShowEventModal(true)}
          disabled={isLoadingEvents || ga4Events.length === 0}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-stroke bg-white px-6 py-4 text-sm font-medium text-dark transition hover:bg-gray-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:hover:bg-dark-3"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {isLoadingEvents ? 'イベントを読み込み中...' : 
           ga4Events.length === 0 ? 'GA4イベントが見つかりません' :
           `GA4イベントから選択 (${ga4Events.length}件)`}
        </button>
      </div>

      {/* 選択中のイベント一覧 */}
      {selectedEvents.length > 0 && (
        <div className="rounded-lg border border-stroke bg-gray-50 p-6 dark:border-dark-3 dark:bg-dark-3">
          <h4 className="mb-4 text-base font-semibold text-dark dark:text-white">
            選択中のコンバージョンイベント: {selectedEvents.length}件
          </h4>
          <ul className="space-y-2">
            {selectedEvents.map((event) => (
              <li key={event.eventName} className="flex items-center justify-between rounded-md border border-stroke bg-white p-3 dark:border-dark-3 dark:bg-dark-2">
                <div className="flex items-center gap-3">
                  <svg className="h-5 w-5 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-medium text-dark dark:text-white">{event.displayName}</span>
                </div>
                <button
                  onClick={() => handleRemoveEvent(event.eventName)}
                  className="text-red-600 transition hover:text-red-700 dark:text-red-400 dark:hover:text-red-500"
                  title="削除"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* GA4イベント選択モーダル */}
      {showEventModal && (
        <div className="!fixed !inset-0 !z-[9999] flex items-center justify-center overflow-y-auto bg-black/50 p-4" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
          <div className="my-auto w-full max-w-3xl rounded-lg bg-white shadow-xl dark:bg-dark-2">
            {/* ヘッダー */}
            <div className="flex items-center justify-between border-b border-stroke px-6 py-4 dark:border-dark-3">
              <h3 className="text-lg font-semibold text-dark dark:text-white">
                GA4イベントを選択
              </h3>
              <button
                onClick={() => setShowEventModal(false)}
                className="text-body-color transition hover:text-dark dark:hover:text-white"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* コンテンツ */}
            <div className="max-h-[50vh] overflow-y-auto p-6">
              <div className="space-y-2">
                {ga4Events.map((event) => {
                  const selected = isEventSelected(event.eventName);

                  return (
                    <div
                      key={event.eventName}
                      className={`rounded-md border p-3 transition cursor-pointer ${
                        selected
                          ? 'border-primary bg-primary/5 dark:bg-primary/10'
                          : 'border-stroke bg-white hover:bg-gray-50 dark:border-dark-3 dark:bg-dark-2 dark:hover:bg-dark-3'
                      }`}
                      onClick={() => handleEventToggle(event)}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => {}}
                          className="h-4 w-4 cursor-pointer rounded border-stroke text-primary focus:ring-2 focus:ring-primary dark:border-dark-3"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-dark dark:text-white">
                            {event.displayName}
                          </div>
                          <div className="mt-0.5 flex items-center gap-2 text-xs text-body-color">
                            <code className="rounded bg-gray-100 px-1.5 py-0.5 dark:bg-dark-3">{event.eventName}</code>
                            {event.description && (
                              <span>• {event.description}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* フッター */}
            <div className="flex items-center justify-between border-t border-stroke px-6 py-4 dark:border-dark-3">
              <p className="text-sm text-body-color">
                {selectedEvents.length}件選択中
              </p>
              <Button
                onClick={() => setShowEventModal(false)}
                variant="primary"
              >
                完了
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

