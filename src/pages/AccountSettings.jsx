import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/Layout/MainLayout';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { setPageTitle } from '../utils/pageTitle';
import { INDUSTRIES } from '../constants/industries';
import { Info, Loader2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

/**
 * アカウント設定画面
 * ユーザー情報の確認と変更
 */
export default function AccountSettings() {
  const { currentUser, userProfile, updateUserProfile } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    company: '',
    lastName: '',
    firstName: '',
    phoneNumber: '',
    industry: '',
    email: '',
    notificationSettings: {
      emailNotifications: true,
    },
  });
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // ページタイトルを設定
  useEffect(() => {
    setPageTitle('アカウント設定');
  }, []);

  // ユーザープロファイルをフォームにセット
  useEffect(() => {
    if (currentUser && userProfile) {
      setFormData({
        company: userProfile.company || '',
        lastName: userProfile.lastName || '',
        firstName: userProfile.firstName || '',
        phoneNumber: userProfile.phoneNumber || '',
        industry: userProfile.industry || '',
        email: currentUser.email || '',
        notificationSettings: userProfile.notificationSettings || {
          emailNotifications: true,
        },
      });
    }
  }, [currentUser, userProfile]);

  const handleSave = async () => {
    if (!currentUser) return;

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      await updateUserProfile(currentUser.uid, {
        company: formData.company,
        lastName: formData.lastName,
        firstName: formData.firstName,
        phoneNumber: formData.phoneNumber,
        industry: formData.industry,
        notificationSettings: formData.notificationSettings,
      });
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error updating profile:', error);
      setSaveError('設定の保存に失敗しました。もう一度お試しください。');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    navigate(-1);
  };

  if (!currentUser || !userProfile) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold text-dark dark:text-white">
            アカウント設定
          </h1>
          <p className="text-body-color dark:text-dark-6">
            アカウント情報の確認と変更
          </p>
        </div>

        {saveSuccess && (
          <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950">
            <p className="text-green-800 dark:text-green-200">
              設定を保存しました
            </p>
          </div>
        )}

        {saveError && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              <p className="text-red-800 dark:text-red-200">{saveError}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* 左側：メインフォーム */}
          <div className="lg:col-span-2">
            <div className="rounded-lg border border-stroke bg-white p-8 dark:border-dark-3 dark:bg-dark-2">
              <div className="space-y-6">
                {/* 組織名 */}
                <div className="space-y-2">
                  <label
                    htmlFor="company"
                    className="flex items-center gap-2 text-base font-medium text-dark dark:text-white"
                  >
                    組織名
                    <span className="rounded bg-red px-2 py-0.5 text-xs text-white">
                      必須
                    </span>
                  </label>
                  <input
                    id="company"
                    type="text"
                    value={formData.company}
                    onChange={(e) =>
                      setFormData({ ...formData, company: e.target.value })
                    }
                    placeholder="株式会社サンプル"
                    className="h-12 w-full rounded-lg border border-stroke bg-transparent px-4 text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:text-white"
                  />
                </div>

                {/* 姓・名 */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label
                      htmlFor="lastName"
                      className="flex items-center gap-2 text-base font-medium text-dark dark:text-white"
                    >
                      姓
                      <span className="rounded bg-red px-2 py-0.5 text-xs text-white">
                        必須
                      </span>
                    </label>
                    <input
                      id="lastName"
                      type="text"
                      value={formData.lastName}
                      onChange={(e) =>
                        setFormData({ ...formData, lastName: e.target.value })
                      }
                      placeholder="山田"
                      className="h-12 w-full rounded-lg border border-stroke bg-transparent px-4 text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor="firstName"
                      className="flex items-center gap-2 text-base font-medium text-dark dark:text-white"
                    >
                      名
                      <span className="rounded bg-red px-2 py-0.5 text-xs text-white">
                        必須
                      </span>
                    </label>
                    <input
                      id="firstName"
                      type="text"
                      value={formData.firstName}
                      onChange={(e) =>
                        setFormData({ ...formData, firstName: e.target.value })
                      }
                      placeholder="太郎"
                      className="h-12 w-full rounded-lg border border-stroke bg-transparent px-4 text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:text-white"
                    />
                  </div>
                </div>

                {/* 電話番号 */}
                <div className="space-y-2">
                  <label
                    htmlFor="phoneNumber"
                    className="flex items-center gap-2 text-base font-medium text-dark dark:text-white"
                  >
                    電話番号
                    <span className="rounded bg-red px-2 py-0.5 text-xs text-white">
                      必須
                    </span>
                  </label>
                  <input
                    id="phoneNumber"
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, phoneNumber: e.target.value })
                    }
                    placeholder="09012345678"
                    className="h-12 w-full rounded-lg border border-stroke bg-transparent px-4 text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:text-white"
                  />
                </div>

                {/* 業界・業種 */}
                <div className="space-y-2">
                  <label
                    htmlFor="industry"
                    className="flex items-center gap-2 text-base font-medium text-dark dark:text-white"
                  >
                    業界・業種
                    <span className="rounded bg-red px-2 py-0.5 text-xs text-white">
                      必須
                    </span>
                  </label>
                  <select
                    id="industry"
                    value={formData.industry}
                    onChange={(e) =>
                      setFormData({ ...formData, industry: e.target.value })
                    }
                    className="h-12 w-full rounded-lg border border-stroke bg-transparent px-4 text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:text-white"
                  >
                    <option value="">選択してください</option>
                    {INDUSTRIES.map((industry) => (
                      <option key={industry} value={industry}>
                        {industry}
                      </option>
                    ))}
                  </select>
                </div>

                {/* メールアドレス */}
                <div className="space-y-2">
                  <label
                    htmlFor="email"
                    className="flex items-center gap-2 text-base font-medium text-dark dark:text-white"
                  >
                    メールアドレス
                    <span className="rounded bg-red px-2 py-0.5 text-xs text-white">
                      必須
                    </span>
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={formData.email}
                    disabled
                    className="h-12 w-full rounded-lg border border-stroke bg-gray-100 px-4 text-dark outline-none dark:border-dark-3 dark:bg-dark-3 dark:text-white"
                  />
                  <p className="text-xs text-body-color dark:text-dark-6">
                    メールアドレスは変更できません
                  </p>
                  
                  {/* Google認証を使用中 */}
                  <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950">
                    <div className="flex items-start gap-2">
                      <Info className="h-4 w-4 flex-shrink-0 text-blue-600 dark:text-blue-400" />
                      <div className="text-sm text-blue-800 dark:text-blue-200">
                        <strong>Google認証を使用中</strong>
                        <br />
                        パスワードはGoogleアカウントで管理されています。パスワードを変更する場合は、Googleアカウントの設定から行ってください。
                      </div>
                    </div>
                  </div>
                </div>

                {/* 通知設定 */}
                <div className="space-y-4 border-t border-stroke pt-4 dark:border-dark-3">
                  <h3 className="text-lg font-semibold text-dark dark:text-white">
                    通知設定
                  </h3>
                  <div className="flex items-center space-x-2">
                    <input
                      id="emailNotifications"
                      type="checkbox"
                      checked={formData.notificationSettings.emailNotifications}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          notificationSettings: {
                            ...formData.notificationSettings,
                            emailNotifications: e.target.checked,
                          },
                        })
                      }
                      className="h-5 w-5 rounded border-stroke text-primary focus:ring-2 focus:ring-primary dark:border-dark-3"
                    />
                    <label
                      htmlFor="emailNotifications"
                      className="cursor-pointer text-base text-dark dark:text-white"
                    >
                      メール通知を受け取る
                    </label>
                  </div>
                </div>

                {/* 保存・キャンセルボタン */}
                <div className="flex gap-3 pt-6">
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex h-12 items-center justify-center rounded-lg bg-primary px-8 text-base font-medium text-white transition hover:bg-primary/90 disabled:opacity-50"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        保存中...
                      </>
                    ) : (
                      '保存'
                    )}
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={isSaving}
                    className="h-12 rounded-lg border border-stroke bg-transparent px-8 text-base font-medium text-dark transition hover:bg-gray-100 disabled:opacity-50 dark:border-dark-3 dark:text-white dark:hover:bg-dark-3"
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 右側：プランとアカウント情報 */}
          <div className="space-y-6">
            {/* プラン */}
            <div className="rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
              <h3 className="mb-4 text-lg font-semibold text-dark dark:text-white">
                プラン
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="mb-2 text-sm text-body-color dark:text-dark-6">
                    現在のプラン
                  </p>
                  <span className="inline-block rounded bg-primary px-3 py-1 text-sm font-medium text-white">
                    FREE
                  </span>
                </div>
              </div>
            </div>

            {/* アカウント情報 */}
            <div className="rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
              <h3 className="mb-4 text-lg font-semibold text-dark dark:text-white">
                アカウント情報
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="mb-1 text-sm text-body-color dark:text-dark-6">
                    登録日
                  </p>
                  <p className="text-base font-medium text-dark dark:text-white">
                    {userProfile?.createdAt?.toDate
                      ? format(
                          userProfile.createdAt.toDate(),
                          'yyyy/MM/dd HH:mm',
                          { locale: ja }
                        )
                      : '-'}
                  </p>
                </div>
                <div>
                  <p className="mb-1 text-sm text-body-color dark:text-dark-6">
                    最終更新
                  </p>
                  <p className="text-base font-medium text-dark dark:text-white">
                    {userProfile?.updatedAt?.toDate
                      ? format(
                          userProfile.updatedAt.toDate(),
                          'yyyy/MM/dd HH:mm',
                          { locale: ja }
                        )
                      : '-'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

