import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * プロフィール編集画面（アカウント設定から遷移）
 */
export default function ProfileEdit() {
  const { currentUser, userProfile, updateUserProfile, resetPassword } = useAuth();
  const navigate = useNavigate();
  const [passwordResetSent, setPasswordResetSent] = useState(false);
  const [formData, setFormData] = useState({
    company: '',
    lastName: '',
    firstName: '',
    phoneNumber: '',
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (userProfile) {
      setFormData({
        company: userProfile.company || '',
        lastName: userProfile.lastName || '',
        firstName: userProfile.firstName || '',
        phoneNumber: userProfile.phoneNumber || '',
      });
    }
  }, [userProfile]);

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    if (!formData.company || !formData.lastName || !formData.firstName || !formData.phoneNumber) {
      setError('必須項目を入力してください');
      setIsSubmitting(false);
      return;
    }
    try {
      await updateUserProfile(currentUser.uid, {
        company: formData.company,
        lastName: formData.lastName,
        firstName: formData.firstName,
        phoneNumber: formData.phoneNumber,
      });
      navigate('/account/settings');
    } catch (err) {
      console.error('Profile update error:', err);
      setError('情報の更新に失敗しました。もう一度お試しください。');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!userProfile) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="text-gray-600">読み込み中...</div>
      </div>
    );
  }

  // メール・パスワードでログインしている場合のみパスワード変更可能（SSOユーザーは対象外）
  const isEmailPasswordUser = currentUser?.providerData?.some((p) => p.providerId === 'password') ?? false;

  return (
    <div className="w-full min-w-0 flex justify-center">
      <div className="w-full max-w-[900px] mx-auto px-6 py-10 box-border">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">プロフィールを編集</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            組織情報と担当者名を変更できます
          </p>
        </div>

        <div className="bg-white dark:bg-dark-2 shadow-sm rounded-lg p-6 w-full">
          {error && (
            <div className="mb-6 rounded-lg bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="company" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                組織名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="company"
                value={formData.company}
                onChange={handleChange}
                placeholder="組織名を入力"
                className="w-full rounded-md border border-stroke bg-transparent px-4 py-2.5 text-dark outline-none focus:border-primary dark:border-dark-3 dark:text-white"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  姓 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="姓"
                  className="w-full rounded-md border border-stroke bg-transparent px-4 py-2.5 text-dark outline-none focus:border-primary dark:border-dark-3 dark:text-white"
                  required
                />
              </div>
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="名"
                  className="w-full rounded-md border border-stroke bg-transparent px-4 py-2.5 text-dark outline-none focus:border-primary dark:border-dark-3 dark:text-white"
                  required
                />
              </div>
            </div>
            <div>
              <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                電話番号 <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                id="phoneNumber"
                value={formData.phoneNumber}
                onChange={(e) => {
                  const cleaned = e.target.value.replace(/[-\s()]/g, '');
                  setFormData((prev) => ({ ...prev, phoneNumber: cleaned }));
                }}
                placeholder="09012345678（ハイフンなし）"
                className="w-full rounded-md border border-stroke bg-transparent px-4 py-2.5 text-dark outline-none focus:border-primary dark:border-dark-3 dark:text-white"
                required
              />
              <p className="mt-1 text-xs text-gray-500">※ハイフンは自動で削除されます</p>
            </div>

            {/* メールアドレス・パスワード */}
            <div className="border-t border-gray-200 dark:border-dark-3 pt-5 mt-6">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">メールアドレス・パスワード</h3>
              <div className="rounded-lg bg-gray-50 dark:bg-dark-3 p-4 space-y-3">
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">現在のメールアドレス</span>
                  <p className="text-sm font-medium text-gray-900 dark:text-white mt-0.5">{currentUser?.email}</p>
                </div>
                <div>
                  {isEmailPasswordUser ? (
                    <>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                        パスワードを変更するには、下のボタンからリセット用メールを送信し、メール内のリンクで新しいパスワードを設定してください。
                      </p>
                      {passwordResetSent ? (
                        <p className="text-sm text-green-600 dark:text-green-400">リセット用メールを送信しました。届いたメールのリンクからパスワードを変更してください。</p>
                      ) : (
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await resetPassword(currentUser.email);
                              setPasswordResetSent(true);
                            } catch (err) {
                              setError(err.message || 'メールの送信に失敗しました');
                            }
                          }}
                          className="text-sm text-primary hover:underline font-medium"
                        >
                          パスワードリセットメールを送信
                        </button>
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      GoogleやMicrosoftアカウントで登録されているユーザーはパスワードの変更はできません。
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => navigate('/account/settings')}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-dark-3 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-3"
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? '保存中...' : '保存する'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
