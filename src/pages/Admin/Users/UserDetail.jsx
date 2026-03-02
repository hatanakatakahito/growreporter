import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { setPageTitle } from '../../../utils/pageTitle';
import { useAdminUserDetail } from '../../../hooks/useAdminUserDetail';
import { useCustomLimits } from '../../../hooks/useCustomLimits';
import { getPlanDisplayName, getPlanBadgeColor } from '../../../constants/plans';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import ErrorAlert from '../../../components/common/ErrorAlert';
import PlanChangeModal from '../../../components/Admin/PlanChangeModal';
import CustomLimitsModal from '../../../components/Admin/CustomLimitsModal';
import AdminCreateSiteModal from '../../../components/Admin/AdminCreateSiteModal';
import {
  ArrowLeft,
  User,
  Mail,
  Calendar,
  TrendingUp,
  Globe,
  BarChart3,
  Sparkles,
  Edit2,
  Clock,
  Trash2,
  Building2,
  CheckCircle,
  XCircle,
  Save,
  Plus
} from 'lucide-react';
import { doc, getDoc, updateDoc, deleteField, onSnapshot } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../../config/firebase';
import { PLANS } from '../../../constants/plans';

/**
 * ユーザー詳細画面
 */
export default function UserDetail() {
  const { uid } = useParams();
  const navigate = useNavigate();
  const { userDetail, loading, error, refetch } = useAdminUserDetail(uid);
  const { getCustomLimits, setCustomLimits, removeCustomLimits } = useCustomLimits();
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showCustomLimitsModal, setShowCustomLimitsModal] = useState(false);
  const [showCreateSiteModal, setShowCreateSiteModal] = useState(false);
  const [customLimits, setCustomLimitsData] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingActiveSites, setEditingActiveSites] = useState(false);
  const [editActiveSiteIds, setEditActiveSiteIds] = useState([]);
  const [isSavingActiveSites, setIsSavingActiveSites] = useState(false);
  const [liveActiveSiteIds, setLiveActiveSiteIds] = useState(null);

  useEffect(() => {
    setPageTitle('ユーザー詳細');
  }, []);

  // Firestoreからリアルタイムで activeSiteIds を取得
  useEffect(() => {
    if (!uid) return;
    const unsubscribe = onSnapshot(doc(db, 'users', uid), (snapshot) => {
      if (snapshot.exists()) {
        setLiveActiveSiteIds(snapshot.data().activeSiteIds || null);
      }
    });
    return () => unsubscribe();
  }, [uid]);

  // 個別制限を読み込む
  useEffect(() => {
    if (uid) {
      loadCustomLimits();
    }
  }, [uid]);

  const loadCustomLimits = async () => {
    try {
      const limits = await getCustomLimits(uid);
      setCustomLimitsData(limits);
    } catch (err) {
      console.error('個別制限の読み込みエラー:', err);
    }
  };

  // プラン変更成功
  const handlePlanChangeSuccess = (message) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 5000);
    refetch(); // データを再取得
  };

  // 個別制限保存
  const handleSaveCustomLimits = async (limits, validUntil, reason) => {
    await setCustomLimits(uid, limits, validUntil, reason);
    setSuccessMessage('個別制限を設定しました');
    setTimeout(() => setSuccessMessage(''), 5000);
    await loadCustomLimits();
  };

  // 個別制限削除
  const handleRemoveCustomLimits = async () => {
    if (!confirm('個別制限を削除してもよろしいですか？プラン標準値に戻ります。')) {
      return;
    }

    try {
      await removeCustomLimits(uid, '管理者による削除');
      setSuccessMessage('個別制限を削除しました');
      setTimeout(() => setSuccessMessage(''), 5000);
      await loadCustomLimits();
    } catch (err) {
      console.error('個別制限の削除エラー:', err);
    }
  };

  // ユーザー削除
  const handleDeleteUser = async () => {
    const userName = getUserName();
    
    // 確認ダイアログ1回目
    if (!confirm(`【警告】${userName}さんを完全に削除しますか？\n\nこのユーザーに関連するすべてのデータ（サイト、メモ、AI分析キャッシュなど）が削除されます。\n\nこの操作は取り消せません。`)) {
      return;
    }
    
    // 確認ダイアログ2回目（二重確認）
    if (!confirm(`本当に削除してもよろしいですか？\n\nユーザー: ${userName}\nメールアドレス: ${userDetail?.email}\n\n削除後は復元できません。`)) {
      return;
    }

    try {
      setIsDeleting(true);
      const deleteUser = httpsCallable(functions, 'deleteUser');
      const result = await deleteUser({
        targetUserId: uid,
        reason: '管理者による削除',
      });
      
      const d = result.data.deletedData || {};
      const scrapingLine = (d.pageScrapingData || d.scrapingProgress || d.scrapingJobs || d.scrapingErrors)
        ? `\n- スクレイピング: ページデータ${d.pageScrapingData || 0}件, 進捗${d.scrapingProgress || 0}件, ジョブ${d.scrapingJobs || 0}件, エラー${d.scrapingErrors || 0}件`
        : '';
      alert(`削除が完了しました。\n\n${result.data.message}\n\n削除されたデータ：\n- サイト: ${d.sites || 0}件\n- メモ: ${d.notes || 0}件\n- トークン: ${d.tokens || 0}件\n- AI分析キャッシュ: ${d.aiCache || 0}件\n- レポート: ${d.reports || 0}件${scrapingLine}`);
      
      // ユーザー一覧に戻る
      navigate('/admin/users');
    } catch (err) {
      console.error('ユーザー削除エラー:', err);
      alert(`削除に失敗しました: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };


  // 有効サイト編集を開始
  const handleStartEditActiveSites = () => {
    setEditActiveSiteIds(liveActiveSiteIds || []);
    setEditingActiveSites(true);
  };

  // 有効サイト編集でトグル
  const handleToggleActiveSite = (siteId) => {
    setEditActiveSiteIds(prev =>
      prev.includes(siteId) ? prev.filter(id => id !== siteId) : [...prev, siteId]
    );
  };

  // 有効サイト保存（Firestoreに直接書き込み）
  const handleSaveActiveSites = async () => {
    try {
      setIsSavingActiveSites(true);
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        activeSiteIds: editActiveSiteIds.length > 0 ? editActiveSiteIds : deleteField(),
      });
      setSuccessMessage('有効サイトを更新しました');
      setTimeout(() => setSuccessMessage(''), 5000);
      setEditingActiveSites(false);
      refetch();
    } catch (err) {
      console.error('有効サイト保存エラー:', err);
      alert(`保存に失敗しました: ${err.message}`);
    } finally {
      setIsSavingActiveSites(false);
    }
  };

  // ユーザー名を取得（lastName + firstName 優先、なければdisplayName）
  const getUserName = () => {
    if (userDetail?.lastName && userDetail?.firstName) {
      return `${userDetail.lastName} ${userDetail.firstName}`;
    }
    return userDetail?.displayName || userDetail?.email || 'Unknown';
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return <ErrorAlert message={error} onRetry={refetch} />;
  }

  if (!userDetail) {
    return (
      <div className="rounded-lg border border-stroke bg-white p-12 text-center dark:border-dark-3 dark:bg-dark-2">
        <p className="text-body-color dark:text-dark-6">ユーザー情報が見つかりません</p>
      </div>
    );
  }

  return (
    <div>
      {/* ヘッダー */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/admin/users')}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-stroke bg-white transition hover:bg-gray-2 dark:border-dark-3 dark:bg-dark-2 dark:hover:bg-dark-3"
          >
            <ArrowLeft className="h-5 w-5 text-dark dark:text-white" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-dark dark:text-white">
              ユーザー詳細
            </h2>
            <p className="mt-1 text-sm text-body-color dark:text-dark-6">
              {getUserName()}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowPlanModal(true)}
            disabled={isDeleting}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-opacity-90 disabled:opacity-50"
          >
            <Edit2 className="h-4 w-4" />
            プラン変更
          </button>
          <button
            onClick={handleDeleteUser}
            disabled={isDeleting}
            className="flex items-center gap-2 rounded-lg border-2 border-red-500 bg-white px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:bg-dark-2 dark:hover:bg-red-900/20"
          >
            <Trash2 className="h-4 w-4" />
            {isDeleting ? '削除中...' : 'ユーザーを削除'}
          </button>
        </div>
      </div>

      {/* 成功メッセージ */}
      {successMessage && (
        <div className="mb-4 rounded-lg bg-green-50 p-4 text-sm text-green-600 dark:bg-green-900/20">
          {successMessage}
        </div>
      )}

      {/* 基本情報 */}
      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* プロフィール */}
        <div className="rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
          <div className="mb-4 flex items-center gap-4">
            {userDetail.photoURL ? (
              <img
                src={userDetail.photoURL}
                alt={getUserName()}
                className="h-16 w-16 rounded-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-2xl font-semibold text-primary">
                {getUserName().charAt(0)}
              </div>
            )}
            <div>
              <h3 className="text-lg font-semibold text-dark dark:text-white">
                {getUserName()}
              </h3>
              <p className="text-sm text-body-color dark:text-dark-6">
                {userDetail.email}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-body-color dark:text-dark-6">
              <Mail className="h-4 w-4" />
              <span>{userDetail.email}</span>
            </div>
            {(userDetail.company != null && userDetail.company !== '') && (
              <div className="flex items-center gap-2 text-sm text-body-color dark:text-dark-6">
                <Building2 className="h-4 w-4" />
                <span>組織名: {userDetail.company}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-body-color dark:text-dark-6">
              <Calendar className="h-4 w-4" />
              <span>
                登録日: {userDetail.createdAt ? new Date(userDetail.createdAt).toLocaleDateString('ja-JP') : '-'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-body-color dark:text-dark-6">
              <Clock className="h-4 w-4" />
              <span>
                最終ログイン: {userDetail.lastLoginAt ? new Date(userDetail.lastLoginAt).toLocaleDateString('ja-JP') : '-'}
              </span>
            </div>
          </div>
        </div>

        {/* プラン情報 */}
        <div className="rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-dark dark:text-white">現在のプラン</h3>
            <span className={`inline-block rounded-full px-3 py-1 text-sm font-semibold ${getPlanBadgeColor(userDetail.plan)}`}>
              {getPlanDisplayName(userDetail.plan)}
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="text-body-color dark:text-dark-6">サイト登録数</span>
                <span className="font-semibold text-dark dark:text-white">
                  {userDetail.usage.sites}
                </span>
              </div>
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="text-body-color dark:text-dark-6">AI分析使用</span>
                <span className="font-semibold text-dark dark:text-white">
                  {userDetail.usage.aiSummaryUsage} / {userDetail.usage.aiSummaryLimit || '無制限'}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-dark-3">
                <div
                  className="h-full rounded-full bg-purple-500"
                  style={{
                    width: userDetail.usage.aiSummaryLimit > 0
                      ? `${Math.min((userDetail.usage.aiSummaryUsage / userDetail.usage.aiSummaryLimit) * 100, 100)}%`
                      : '0%'
                  }}
                />
              </div>
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="text-body-color dark:text-dark-6">AI改善使用</span>
                <span className="font-semibold text-dark dark:text-white">
                  {userDetail.usage.aiImprovementUsage} / {userDetail.usage.aiImprovementLimit || '無制限'}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-dark-3">
                <div
                  className="h-full rounded-full bg-orange-500"
                  style={{
                    width: userDetail.usage.aiImprovementLimit > 0
                      ? `${Math.min((userDetail.usage.aiImprovementUsage / userDetail.usage.aiImprovementLimit) * 100, 100)}%`
                      : '0%'
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 今月のAI使用状況 */}
        <div className="rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
          <h3 className="mb-4 text-lg font-semibold text-dark dark:text-white">今月のAI使用</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg bg-purple-50 p-4 dark:bg-purple-900/20">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/10">
                  <BarChart3 className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-xs text-body-color dark:text-dark-6">分析サマリー</p>
                  <p className="text-sm font-medium text-dark dark:text-white">AI分析回数</p>
                </div>
              </div>
              <span className="text-2xl font-bold text-dark dark:text-white">
                {userDetail.aiUsageThisMonth?.analysisCount || 0}
              </span>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-orange-50 p-4 dark:bg-orange-900/20">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500/10">
                  <Sparkles className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-xs text-body-color dark:text-dark-6">改善提案</p>
                  <p className="text-sm font-medium text-dark dark:text-white">AI改善案生成回数</p>
                </div>
              </div>
              <span className="text-2xl font-bold text-dark dark:text-white">
                {userDetail.aiUsageThisMonth?.improvementCount || 0}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* サイト一覧 */}
      <div className="mb-6 rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-dark dark:text-white">登録サイト一覧</h3>
          <div className="flex gap-2">
            {/* サイト登録ボタン */}
            <button
              onClick={() => setShowCreateSiteModal(true)}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-opacity-90"
            >
              <Plus className="h-4 w-4" />
              サイト登録
            </button>
            {/* 有効サイト管理 */}
            {userDetail.sites && userDetail.sites.length > 1 && (
              editingActiveSites ? (
                <>
                  <button
                    onClick={() => setEditingActiveSites(false)}
                    disabled={isSavingActiveSites}
                    className="rounded-lg border border-stroke px-4 py-2 text-sm font-medium text-body-color transition hover:bg-gray-2 disabled:opacity-50 dark:border-dark-3 dark:hover:bg-dark-3"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={handleSaveActiveSites}
                    disabled={isSavingActiveSites || editActiveSiteIds.length === 0}
                    className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-opacity-90 disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    {isSavingActiveSites ? '保存中...' : '保存'}
                  </button>
                </>
              ) : (
                <button
                  onClick={handleStartEditActiveSites}
                  className="flex items-center gap-2 rounded-lg bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition hover:bg-primary/20"
                >
                  <Edit2 className="h-4 w-4" />
                  有効サイト管理
                </button>
              )
            )}
          </div>
        </div>

        {/* 編集モード時の説明 */}
        {editingActiveSites && (
          <div className="mb-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
            有効にするサイトを選択してください。プラン上限（{PLANS[userDetail.plan]?.features?.maxSites || 1}サイト）を超えるサイトがある場合、選択されたサイトのみがユーザーに表示されます。
            チェックを全て外すとフィルタが解除されます。
          </div>
        )}

        {/* 現在のactiveSiteIds表示（編集モード外） */}
        {!editingActiveSites && liveActiveSiteIds && liveActiveSiteIds.length > 0 && (
          <div className="mb-4 rounded-lg bg-yellow-50 p-3 text-sm text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400">
            有効サイト制限が適用されています（{liveActiveSiteIds.length}サイトが有効）
          </div>
        )}

        {userDetail.sites && userDetail.sites.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {userDetail.sites.map((site) => {
              const isActive = !liveActiveSiteIds || liveActiveSiteIds.length === 0 || liveActiveSiteIds.includes(site.id);
              const isEditActive = editActiveSiteIds.includes(site.id);

              return (
                <div
                  key={site.id}
                  className={`relative rounded-lg border p-4 text-left transition ${
                    editingActiveSites
                      ? isEditActive
                        ? 'border-primary bg-blue-50 dark:bg-blue-900/20'
                        : 'border-stroke bg-gray-100 opacity-60 dark:border-dark-3 dark:bg-dark-3'
                      : isActive
                        ? 'border-stroke bg-gray-50 dark:border-dark-3 dark:bg-dark-3'
                        : 'border-stroke bg-gray-100 opacity-50 dark:border-dark-3 dark:bg-dark-3'
                  }`}
                >
                  {/* 編集モード: チェックボックス */}
                  {editingActiveSites && (
                    <button
                      type="button"
                      onClick={() => handleToggleActiveSite(site.id)}
                      className="absolute right-3 top-3 z-10"
                    >
                      {isEditActive ? (
                        <CheckCircle className="h-6 w-6 text-primary" />
                      ) : (
                        <XCircle className="h-6 w-6 text-gray-300 dark:text-dark-4" />
                      )}
                    </button>
                  )}

                  {/* 非編集モード: 状態バッジ */}
                  {!editingActiveSites && liveActiveSiteIds && liveActiveSiteIds.length > 0 && (
                    <span className={`absolute right-3 top-3 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      isActive
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                    }`}>
                      {isActive ? '有効' : '無効'}
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => editingActiveSites ? handleToggleActiveSite(site.id) : navigate(`/admin/sites/${site.id}`)}
                    className="w-full text-left"
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <Globe className="h-5 w-5 text-primary" />
                      <h4 className="font-medium text-dark dark:text-white">{site.siteName || site.url}</h4>
                    </div>
                    <p className="mb-2 text-sm text-body-color dark:text-dark-6">{site.url}</p>
                    <div className="flex items-center justify-between text-xs text-body-color dark:text-dark-6">
                      <span>登録: {site.createdAt ? new Date(site.createdAt).toLocaleDateString('ja-JP') : '-'}</span>
                      <span className={`rounded-full px-2 py-1 ${site.setupCompleted ? 'bg-green-100 text-green-600 dark:bg-green-900/20' : 'bg-orange-100 text-orange-600 dark:bg-orange-900/20'}`}>
                        {site.setupCompleted ? '完了' : '設定中'}
                      </span>
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-center text-body-color dark:text-dark-6">登録されているサイトがありません</p>
        )}
      </div>

      {/* 個別制限 */}
      <div className="mb-6 rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-dark dark:text-white">個別制限</h3>
          <div className="flex gap-2">
            {customLimits && (
              <button
                onClick={handleRemoveCustomLimits}
                className="rounded-lg border border-red-500 bg-white px-4 py-2 text-sm font-medium text-red-500 transition hover:bg-red-50 dark:bg-dark-2 dark:hover:bg-red-900/20"
              >
                削除
              </button>
            )}
            <button
              onClick={() => setShowCustomLimitsModal(true)}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-opacity-90"
            >
              <Edit2 className="h-4 w-4" />
              {customLimits ? '編集' : '設定'}
            </button>
          </div>
        </div>

        {customLimits ? (
          <div className="space-y-4">
            <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
              <p className="text-sm text-blue-600 dark:text-blue-400">
                このユーザーには個別制限が設定されています。プラン標準値よりも優先されます。
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-lg border border-stroke bg-gray-50 p-4 dark:border-dark-3 dark:bg-dark-3">
                <p className="mb-1 text-xs text-body-color dark:text-dark-6">サイト登録数上限</p>
                <p className="text-2xl font-bold text-dark dark:text-white">
                  {customLimits.limits?.maxSites !== null && customLimits.limits?.maxSites !== undefined
                    ? (customLimits.limits.maxSites >= 999999 ? '無制限' : customLimits.limits.maxSites)
                    : 'プラン標準'}
                </p>
              </div>

              <div className="rounded-lg border border-stroke bg-gray-50 p-4 dark:border-dark-3 dark:bg-dark-3">
                <p className="mb-1 text-xs text-body-color dark:text-dark-6">AI分析サマリー（月間）</p>
                <p className="text-2xl font-bold text-dark dark:text-white">
                  {customLimits.limits?.aiSummaryMonthly !== null && customLimits.limits?.aiSummaryMonthly !== undefined
                    ? (customLimits.limits.aiSummaryMonthly >= 999999 ? '無制限' : customLimits.limits.aiSummaryMonthly)
                    : 'プラン標準'}
                </p>
              </div>

              <div className="rounded-lg border border-stroke bg-gray-50 p-4 dark:border-dark-3 dark:bg-dark-3">
                <p className="mb-1 text-xs text-body-color dark:text-dark-6">AI改善提案（月間）</p>
                <p className="text-2xl font-bold text-dark dark:text-white">
                  {customLimits.limits?.aiImprovementMonthly !== null && customLimits.limits?.aiImprovementMonthly !== undefined
                    ? (customLimits.limits.aiImprovementMonthly >= 999999 ? '無制限' : customLimits.limits.aiImprovementMonthly)
                    : 'プラン標準'}
                </p>
              </div>
            </div>

            <div className="space-y-2 text-sm text-body-color dark:text-dark-6">
              <div className="flex items-center justify-between">
                <span>有効期限:</span>
                <span className="font-medium text-dark dark:text-white">
                  {customLimits.validUntil
                    ? new Date(customLimits.validUntil).toLocaleDateString('ja-JP')
                    : '無期限'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>設定理由:</span>
                <span className="font-medium text-dark dark:text-white">{customLimits.reason || '-'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>設定者:</span>
                <span className="font-medium text-dark dark:text-white">{customLimits.setByName || '-'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>最終更新:</span>
                <span className="font-medium text-dark dark:text-white">
                  {customLimits.updatedAt
                    ? new Date(customLimits.updatedAt).toLocaleString('ja-JP')
                    : '-'}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-center text-body-color dark:text-dark-6">
            個別制限は設定されていません。プラン標準値が適用されます。
          </p>
        )}
      </div>

      {/* プラン変更履歴 */}
      <div className="rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
        <h3 className="mb-4 text-lg font-semibold text-dark dark:text-white">プラン変更履歴</h3>
        
        {userDetail.planChangeHistory && userDetail.planChangeHistory.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-stroke bg-gray-50 dark:border-dark-3 dark:bg-dark-3">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-dark dark:text-white">
                    変更日時
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-dark dark:text-white">
                    変更前
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-dark dark:text-white">
                    変更後
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-dark dark:text-white">
                    理由
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-dark dark:text-white">
                    変更者
                  </th>
                </tr>
              </thead>
              <tbody>
                {userDetail.planChangeHistory.map((history, index) => (
                  <tr key={history.id || index} className="border-b border-stroke dark:border-dark-3">
                    <td className="px-4 py-3 text-sm text-body-color dark:text-dark-6">
                      {history.changedAt ? new Date(history.changedAt).toLocaleString('ja-JP') : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2 py-1 text-xs font-semibold ${getPlanBadgeColor(history.oldPlan)}`}>
                        {getPlanDisplayName(history.oldPlan)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2 py-1 text-xs font-semibold ${getPlanBadgeColor(history.newPlan)}`}>
                        {getPlanDisplayName(history.newPlan)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-body-color dark:text-dark-6">
                      {history.reason || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-body-color dark:text-dark-6">
                      {history.changedByEmail || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center text-body-color dark:text-dark-6">プラン変更履歴がありません</p>
        )}
      </div>

      {/* プラン変更モーダル */}
      {showPlanModal && (
        <PlanChangeModal
          user={userDetail}
          onClose={() => setShowPlanModal(false)}
          onSuccess={handlePlanChangeSuccess}
        />
      )}

      {/* 個別制限モーダル */}
      {showCustomLimitsModal && (
        <CustomLimitsModal
          user={userDetail}
          currentLimits={customLimits}
          onClose={() => setShowCustomLimitsModal(false)}
          onSave={handleSaveCustomLimits}
        />
      )}

      {/* サイト登録モーダル */}
      {showCreateSiteModal && (
        <AdminCreateSiteModal
          targetUserId={uid}
          targetUserName={getUserName()}
          onClose={() => setShowCreateSiteModal(false)}
          onSuccess={(message) => {
            setSuccessMessage(message);
            setTimeout(() => setSuccessMessage(''), 5000);
            refetch();
          }}
        />
      )}

    </div>
  );
}

