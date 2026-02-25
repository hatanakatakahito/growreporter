import React, { useState, useEffect } from 'react';
import { Mail, Save, Send, CheckCircle } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../../config/firebase';
import { useAuth } from '../../../contexts/AuthContext';

/**
 * メール通知設定画面（管理者用）
 * 全ユーザー共通の週次・月次レポート配信設定
 */
export default function EmailNotifications() {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testSending, setTestSending] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState(null);

  // 週次レポート設定
  const [weeklyEnabled, setWeeklyEnabled] = useState(false);
  const [weeklyDay, setWeeklyDay] = useState(1); // 月曜日
  const [weeklyHour, setWeeklyHour] = useState(9);

  // 月次レポート設定
  const [monthlyEnabled, setMonthlyEnabled] = useState(false);
  const [monthlyDay, setMonthlyDay] = useState(1);
  const [monthlyHour, setMonthlyHour] = useState(9);

  // 設定の読み込み
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const docRef = doc(db, 'systemSettings', 'emailNotifications');
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        
        // 週次レポート
        if (data.weeklyReport) {
          setWeeklyEnabled(data.weeklyReport.enabled || false);
          setWeeklyDay(data.weeklyReport.dayOfWeek ?? 1);
          setWeeklyHour(data.weeklyReport.hour ?? 9);
        }

        // 月次レポート
        if (data.monthlyReport) {
          setMonthlyEnabled(data.monthlyReport.enabled || false);
          setMonthlyDay(data.monthlyReport.dayOfMonth ?? 1);
          setMonthlyHour(data.monthlyReport.hour ?? 9);
        }
      }
    } catch (err) {
      console.error('設定の読み込みエラー:', err);
      setError('設定の読み込みに失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  // 設定の保存
  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      const docRef = doc(db, 'systemSettings', 'emailNotifications');
      await setDoc(docRef, {
        weeklyReport: {
          enabled: weeklyEnabled,
          dayOfWeek: weeklyDay,
          hour: weeklyHour,
        },
        monthlyReport: {
          enabled: monthlyEnabled,
          dayOfMonth: monthlyDay,
          hour: monthlyHour,
        },
        updatedAt: new Date(),
        updatedBy: currentUser?.uid || 'unknown',
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('保存エラー:', err);
      setError('設定の保存に失敗しました: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // テスト送信
  const handleTestSend = async () => {
    try {
      setTestSending(true);
      setError(null);

      const sendTestEmail = httpsCallable(functions, 'sendTestReportEmail');
      await sendTestEmail({
        recipientEmail: currentUser?.email,
        reportType: 'weekly', // または 'monthly'
      });

      alert('テストメールを送信しました。受信トレイをご確認ください。');
    } catch (err) {
      console.error('テスト送信エラー:', err);
      setError('テストメールの送信に失敗しました: ' + err.message);
    } finally {
      setTestSending(false);
    }
  };

  const dayOfWeekOptions = [
    { value: 0, label: '日曜日' },
    { value: 1, label: '月曜日' },
    { value: 2, label: '火曜日' },
    { value: 3, label: '水曜日' },
    { value: 4, label: '木曜日' },
    { value: 5, label: '金曜日' },
    { value: 6, label: '土曜日' },
  ];

  const hourOptions = Array.from({ length: 24 }, (_, i) => ({
    value: i,
    label: `${String(i).padStart(2, '0')}:00`,
  }));

  const dayOfMonthOptions = Array.from({ length: 28 }, (_, i) => ({
    value: i + 1,
    label: `${i + 1}日`,
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        <span className="ml-3 text-body-color">読み込み中...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ページタイトル */}
      <div>
        <h2 className="text-2xl font-bold text-dark dark:text-white">メール通知設定</h2>
        <p className="mt-1 text-sm text-body-color">
          全ユーザー共通のレポート配信スケジュールを設定します
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {saveSuccess && (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
          <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
          <p className="text-sm text-green-600 dark:text-green-400">設定を保存しました</p>
        </div>
      )}

      {/* 週次レポート設定 */}
      <div className="rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
        <div className="mb-6 flex items-center gap-3">
          <Mail className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-dark dark:text-white">週次レポート</h3>
        </div>

        <div className="space-y-4">
          {/* 有効/無効 */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="weeklyEnabled"
              checked={weeklyEnabled}
              onChange={(e) => setWeeklyEnabled(e.target.checked)}
              className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary"
            />
            <label htmlFor="weeklyEnabled" className="text-sm font-medium text-dark dark:text-white">
              週次レポートを配信する
            </label>
          </div>

          {weeklyEnabled && (
            <>
              {/* 配信曜日 */}
              <div>
                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                  配信曜日
                </label>
                <select
                  value={weeklyDay}
                  onChange={(e) => setWeeklyDay(Number(e.target.value))}
                  className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-dark outline-none focus:border-primary dark:border-dark-3 dark:text-white"
                >
                  {dayOfWeekOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* 配信時刻 */}
              <div>
                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                  配信時刻
                </label>
                <select
                  value={weeklyHour}
                  onChange={(e) => setWeeklyHour(Number(e.target.value))}
                  className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-dark outline-none focus:border-primary dark:border-dark-3 dark:text-white"
                >
                  {hourOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
                <p className="text-xs text-blue-900 dark:text-blue-100">
                  ※ユーザーが「メール通知を受け取る」を有効にしている場合のみ送信されます
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 月次レポート設定 */}
      <div className="rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
        <div className="mb-6 flex items-center gap-3">
          <Mail className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-dark dark:text-white">月次レポート</h3>
        </div>

        <div className="space-y-4">
          {/* 有効/無効 */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="monthlyEnabled"
              checked={monthlyEnabled}
              onChange={(e) => setMonthlyEnabled(e.target.checked)}
              className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary"
            />
            <label htmlFor="monthlyEnabled" className="text-sm font-medium text-dark dark:text-white">
              月次レポートを配信する
            </label>
          </div>

          {monthlyEnabled && (
            <>
              {/* 配信日 */}
              <div>
                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                  配信日
                </label>
                <select
                  value={monthlyDay}
                  onChange={(e) => setMonthlyDay(Number(e.target.value))}
                  className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-dark outline-none focus:border-primary dark:border-dark-3 dark:text-white"
                >
                  {dayOfMonthOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-body-color">
                  ※29-31日は設定できません（全ての月に存在しないため）
                </p>
              </div>

              {/* 配信時刻 */}
              <div>
                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                  配信時刻
                </label>
                <select
                  value={monthlyHour}
                  onChange={(e) => setMonthlyHour(Number(e.target.value))}
                  className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-dark outline-none focus:border-primary dark:border-dark-3 dark:text-white"
                >
                  {hourOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
                <p className="text-xs text-blue-900 dark:text-blue-100">
                  ※ユーザーが「メール通知を受け取る」を有効にしている場合のみ送信されます
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 送信される指標 */}
      <div className="rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
        <h3 className="mb-4 text-lg font-semibold text-dark dark:text-white">送信される指標</h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            '訪問者数',
            'ユーザー数',
            '表示回数',
            '平均PV',
            'ENG率',
            'CV数',
            'CVR',
            '前週比/前月比',
          ].map((metric, index) => (
            <div
              key={index}
              className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 dark:bg-dark-3"
            >
              <CheckCircle className="h-4 w-4 text-primary" />
              <span className="text-sm text-dark dark:text-white">{metric}</span>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-body-color">
          ※Phase 2で指標のカスタマイズが可能になります
        </p>
      </div>

      {/* アクションボタン */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-white transition hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? '保存中...' : '設定を保存'}
        </button>

        <button
          onClick={handleTestSend}
          disabled={testSending}
          className="flex items-center gap-2 rounded-lg border border-stroke bg-white px-6 py-3 text-sm font-medium text-dark transition hover:bg-gray-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:hover:bg-dark-3"
        >
          <Send className="h-4 w-4" />
          {testSending ? '送信中...' : '管理者にテスト送信'}
        </button>
      </div>

      {/* 注意事項 */}
      <div className="rounded-lg border border-stroke bg-gray-50 p-6 dark:border-dark-3 dark:bg-dark-3">
        <h4 className="mb-3 text-sm font-semibold text-dark dark:text-white">
          📌 メール通知について
        </h4>
        <ul className="space-y-2 text-xs text-body-color">
          <li>• レポートは各ユーザーの登録済みサイトごとに送信されます</li>
          <li>• ユーザーが「メール通知を受け取る」を無効にしている場合は送信されません</li>
          <li>• 週次レポートは過去7日間、月次レポートは前月1ヶ月間のデータが含まれます</li>
          <li>• Cloud Schedulerの設定は別途Firebase Consoleで必要です</li>
        </ul>
      </div>
    </div>
  );
}
