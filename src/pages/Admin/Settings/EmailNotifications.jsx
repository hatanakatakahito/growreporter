import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Mail, Save, Send, CheckCircle, AlertTriangle, Search, ChevronDown } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../../config/firebase';
import { useAuth } from '../../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { setPageTitle } from '../../../utils/pageTitle';

/**
 * メール通知設定画面（管理者用）
 * 全ユーザー共通の週次・月次レポート配信設定 + テスト送信
 */
export default function EmailNotifications() {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => { setPageTitle('メール通知設定'); }, []);

  // 週次レポート設定
  const [weeklyEnabled, setWeeklyEnabled] = useState(false);
  const [weeklyDay, setWeeklyDay] = useState(1); // 月曜日
  const [weeklyHour, setWeeklyHour] = useState(9);

  // 月次レポート設定
  const [monthlyEnabled, setMonthlyEnabled] = useState(false);
  const [monthlyDay, setMonthlyDay] = useState(1);
  const [monthlyHour, setMonthlyHour] = useState(9);

  // テスト送信関連
  const [users, setUsers] = useState([]);
  const [sites, setSites] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [sitesLoading, setSitesLoading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedSiteId, setSelectedSiteId] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const userDropdownRef = useRef(null);
  const [sendingType, setSendingType] = useState(null); // 'weekly' | 'monthly' | 'alert' | null

  // 設定の読み込み
  useEffect(() => {
    loadSettings();
    loadUsersAndSites();
  }, []);

  // ドロップダウン外クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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

  const loadUsersAndSites = async () => {
    try {
      setUsersLoading(true);
      setSitesLoading(true);

      const [usersResult, sitesResult] = await Promise.all([
        httpsCallable(functions, 'getAdminUsers')({ limit: 200, sortBy: 'createdAt', sortOrder: 'desc' }),
        httpsCallable(functions, 'getAdminSites')({ limit: 200, sortBy: 'siteName', sortOrder: 'asc' }),
      ]);

      if (usersResult.data.success) {
        setUsers(usersResult.data.data.users);
      }
      if (sitesResult.data.success) {
        setSites(sitesResult.data.data.sites);
      }
    } catch (err) {
      console.error('ユーザー/サイト読み込みエラー:', err);
    } finally {
      setUsersLoading(false);
      setSitesLoading(false);
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

  // ユーザー検索フィルタ
  const filteredUsers = useMemo(() => {
    if (!userSearch.trim()) return users;
    const q = userSearch.toLowerCase();
    return users.filter(
      (u) =>
        u.displayName?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.company?.toLowerCase().includes(q)
    );
  }, [users, userSearch]);

  // 選択ユーザーのサイト一覧
  const userSites = useMemo(() => {
    if (!selectedUserId) return [];
    return sites.filter((s) => s.userId === selectedUserId);
  }, [sites, selectedUserId]);

  // 選択中のユーザー情報
  const selectedUser = useMemo(() => {
    return users.find((u) => u.uid === selectedUserId) || null;
  }, [users, selectedUserId]);

  // ユーザー選択時にサイトをリセット
  const handleUserChange = (uid) => {
    setSelectedUserId(uid);
    setSelectedSiteId('');
  };

  // テスト送信
  const handleTestSend = async (reportType) => {
    if (!selectedUser) {
      toast.error('送信先ユーザーを選択してください');
      return;
    }
    if (!selectedSiteId) {
      toast.error('対象サイトを選択してください');
      return;
    }

    const typeLabels = { weekly: '週次レポート', monthly: '月次レポート', alert: 'アラート通知' };

    try {
      setSendingType(reportType);
      const sendTestEmail = httpsCallable(functions, 'sendTestReportEmail');
      await sendTestEmail({
        recipientEmail: selectedUser.email,
        reportType,
        siteId: selectedSiteId,
      });

      const siteName = userSites.find((s) => s.siteId === selectedSiteId)?.siteName || selectedSiteId;
      toast.success(`${typeLabels[reportType]}を ${selectedUser.email} に送信しました（${siteName}）`);
    } catch (err) {
      console.error('テスト送信エラー:', err);
      toast.error(`送信失敗: ${err.message}`);
    } finally {
      setSendingType(null);
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

      {/* 週次・月次レポート設定（横並び） */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
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
                    className="w-full rounded-lg border border-stroke bg-white dark:bg-dark px-4 py-3 text-dark outline-none focus:border-primary dark:border-dark-3 dark:text-white"
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
                    className="w-full rounded-lg border border-stroke bg-white dark:bg-dark px-4 py-3 text-dark outline-none focus:border-primary dark:border-dark-3 dark:text-white"
                  >
                    {hourOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
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
                    className="w-full rounded-lg border border-stroke bg-white dark:bg-dark px-4 py-3 text-dark outline-none focus:border-primary dark:border-dark-3 dark:text-white"
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
                    className="w-full rounded-lg border border-stroke bg-white dark:bg-dark px-4 py-3 text-dark outline-none focus:border-primary dark:border-dark-3 dark:text-white"
                  >
                    {hourOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

              </>
            )}
          </div>
        </div>
      </div>

      {/* 送信される指標 */}
      <div className="rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
        <h3 className="mb-4 text-lg font-semibold text-dark dark:text-white">送信される指標</h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            'セッション数',
            'ユーザー数',
            '表示回数',
            '平均PV',
            'エンゲージメント率',
            '直帰率',
            'CV数 / CVR',
            '前期比較',
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
      </div>

      {/* 保存ボタン */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-white transition hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? '保存中...' : '設定を保存'}
        </button>
      </div>

      {/* テスト送信セクション */}
      <div className="rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
        <div className="mb-6 flex items-center gap-3">
          <Send className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-dark dark:text-white">テスト送信</h3>
        </div>

        <div className="space-y-4">
          {/* ユーザー検索・選択（コンボボックス） */}
          <div>
            <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
              送信先ユーザー
            </label>
            <div className="relative" ref={userDropdownRef}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-body-color" />
                <input
                  type="text"
                  value={userDropdownOpen ? userSearch : (selectedUser ? `${selectedUser.displayName || '(名前なし)'} (${selectedUser.email})` : '')}
                  onChange={(e) => {
                    setUserSearch(e.target.value);
                    if (!userDropdownOpen) setUserDropdownOpen(true);
                  }}
                  onFocus={() => {
                    setUserDropdownOpen(true);
                    setUserSearch('');
                  }}
                  placeholder={usersLoading ? '読み込み中...' : 'ユーザーを検索・選択...'}
                  disabled={usersLoading}
                  className="w-full rounded-lg border border-stroke bg-white dark:bg-dark py-3 pl-10 pr-10 text-sm text-dark outline-none focus:border-primary dark:border-dark-3 dark:text-white"
                />
                <ChevronDown
                  className={`absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 cursor-pointer text-body-color transition-transform ${userDropdownOpen ? 'rotate-180' : ''}`}
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                />
              </div>
              {userDropdownOpen && (
                <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-stroke bg-white shadow-lg dark:border-dark-3 dark:bg-dark-2">
                  {filteredUsers.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-body-color">該当するユーザーがいません</div>
                  ) : (
                    filteredUsers.map((user) => (
                      <div
                        key={user.uid}
                        onClick={() => {
                          handleUserChange(user.uid);
                          setUserDropdownOpen(false);
                          setUserSearch('');
                        }}
                        className={`cursor-pointer px-4 py-2.5 text-sm transition hover:bg-primary/10 ${
                          selectedUserId === user.uid
                            ? 'bg-primary/5 font-medium text-primary'
                            : 'text-dark dark:text-white'
                        }`}
                      >
                        {user.displayName || '(名前なし)'} ({user.email})
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* サイト選択 */}
          <div>
            <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
              対象サイト
            </label>
            <select
              value={selectedSiteId}
              onChange={(e) => setSelectedSiteId(e.target.value)}
              disabled={!selectedUserId || sitesLoading}
              className="w-full rounded-lg border border-stroke bg-white dark:bg-dark px-4 py-3 text-dark outline-none focus:border-primary disabled:cursor-not-allowed disabled:opacity-50 dark:border-dark-3 dark:text-white"
            >
              <option value="">
                {!selectedUserId
                  ? 'まずユーザーを選択してください'
                  : userSites.length === 0
                    ? 'このユーザーにサイトはありません'
                    : 'サイトを選択してください'}
              </option>
              {userSites.map((site) => (
                <option key={site.siteId} value={site.siteId}>
                  {site.siteName || site.siteUrl || site.siteId}
                  {!site.hasGA4 ? ' (GA4未設定)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* 送信先情報 */}
          {selectedUser && selectedSiteId && (
            <div className="rounded-lg bg-gray-50 p-3 dark:bg-dark-3">
              <p className="text-xs text-body-color">
                送信先: <span className="font-medium text-dark dark:text-white">{selectedUser.email}</span>
                {' / '}
                サイト: <span className="font-medium text-dark dark:text-white">
                  {userSites.find((s) => s.siteId === selectedSiteId)?.siteName || selectedSiteId}
                </span>
              </p>
            </div>
          )}

          {/* 送信ボタン群 */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => handleTestSend('weekly')}
              disabled={!selectedUserId || !selectedSiteId || sendingType !== null}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Mail className="h-4 w-4" />
              {sendingType === 'weekly' ? '送信中...' : '週次レポート送信'}
            </button>

            <button
              onClick={() => handleTestSend('monthly')}
              disabled={!selectedUserId || !selectedSiteId || sendingType !== null}
              className="flex items-center gap-2 rounded-lg bg-secondary px-4 py-2.5 text-sm font-medium text-white transition hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Mail className="h-4 w-4" />
              {sendingType === 'monthly' ? '送信中...' : '月次レポート送信'}
            </button>

            <button
              onClick={() => handleTestSend('alert')}
              disabled={!selectedUserId || !selectedSiteId || sendingType !== null}
              className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <AlertTriangle className="h-4 w-4" />
              {sendingType === 'alert' ? '送信中...' : 'アラート通知送信'}
            </button>
          </div>

          <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
            <p className="text-xs text-blue-900 dark:text-blue-100">
              ※実際のGA4データを使用してテスト送信します。週次・月次は前期間のデータ、アラートはサイトの最新アラート（なければサンプル）が送信されます。
            </p>
          </div>
        </div>
      </div>

      {/* 注意事項 */}
      <div className="rounded-lg border border-stroke bg-gray-50 p-6 dark:border-dark-3 dark:bg-dark-3">
        <h4 className="mb-3 text-sm font-semibold text-dark dark:text-white">
          メール通知について
        </h4>
        <ul className="space-y-2 text-xs text-body-color">
          <li>・ レポートは各ユーザーの登録済みサイトごとに送信されます</li>
          <li>・ ユーザーが「メール通知を受け取る」を無効にしている場合は送信されません</li>
          <li>・ 週次レポートは過去7日間、月次レポートは前月1ヶ月間のデータが含まれます</li>
          <li>・ Cloud Schedulerの設定は別途Firebase Consoleで必要です</li>
        </ul>
      </div>
    </div>
  );
}
