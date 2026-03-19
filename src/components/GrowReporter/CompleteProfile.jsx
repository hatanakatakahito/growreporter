import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import logoImg from '../../assets/img/logo.svg';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { functions } from '../../config/firebase';

// イニシャル取得（表示名 or メールの先頭1〜2文字）
function getInitials(displayName, email) {
  if (displayName && displayName.trim()) {
    const parts = displayName.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase().slice(0, 2);
    return displayName.trim().slice(0, 2).toUpperCase();
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return '?';
}

export default function CompleteProfile() {
  const [formData, setFormData] = useState({
    company: '',
    name: '',
    phoneNumber: '',
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoLoadError, setPhotoLoadError] = useState(false);
  
  const { currentUser, userProfile, updateUserProfile } = useAuth();
  const navigate = useNavigate();

  // SSO写真URL（Auth を優先、なければ Firestore の photoURL）
  const photoURL = currentUser?.photoURL || userProfile?.photoURL || '';
  const showPhoto = photoURL && !photoLoadError;

  useEffect(() => {
    // 既に情報が入力済みの場合はサイト登録へ
    if (userProfile?.company && userProfile?.phoneNumber) {
      navigate('/sites/new');
    }

    // SSOで取得したdisplayNameをそのまま氏名にセット
    if (currentUser?.displayName && !formData.name) {
      setFormData(prev => ({
        ...prev,
        name: currentUser.displayName.trim()
      }));
    }
  }, [userProfile, navigate, currentUser, formData.name]);

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [id]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    // バリデーション
    if (!formData.company || !formData.name || !formData.phoneNumber) {
      setError('必須項目を入力してください');
      setIsSubmitting(false);
      return;
    }

    try {
      await updateUserProfile(currentUser.uid, {
        company: formData.company,
        name: formData.name,
        phoneNumber: formData.phoneNumber,
      });

      // ユーザー登録ログを記録（非同期で、エラーは無視）
      try {
        const logUserRegistration = httpsCallable(functions, 'logUserRegistration');
        await logUserRegistration({
          displayName: formData.name,
          plan: userProfile?.plan || 'free',
        });
      } catch (logError) {
        console.error('Log registration error:', logError);
        // ログ記録エラーは無視して処理を続行
      }
      
      // 初回登録完了後はサイト登録画面へ
      navigate('/sites/new');
    } catch (err) {
      console.error('Profile update error:', err);
      setError('情報の更新に失敗しました。もう一度お試しください。');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="relative z-10 flex min-h-screen items-center justify-center bg-gray-50 py-12 lg:py-20">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-[600px] overflow-hidden rounded-2xl bg-white shadow-lg dark:bg-dark-2">
          
          {/* ヘッダー（ブルー→紫グラデーション） */}
          <div className="bg-gradient-primary px-8 py-6 text-center">
            <div className="mb-3 flex items-center justify-center">
              <img 
                src={logoImg} 
                alt="GROW REPORTER" 
                className="h-10 w-auto brightness-0 invert"
              />
            </div>
            <h1 className="text-2xl font-bold text-white">
              追加情報の入力
            </h1>
            <p className="mt-2 text-sm text-white/90">
              サービスをご利用いただくために、以下の情報をご入力ください
            </p>
          </div>

          {/* フォームエリア */}
          <div className="px-8 py-8">
            {/* ユーザー情報表示（SSO写真 or イニシャル） */}
            <div className="mb-6 rounded-lg bg-gray-100 p-4 dark:bg-dark-3">
              <div className="flex items-center gap-3">
                {showPhoto ? (
                  <img
                    src={photoURL}
                    alt="Profile"
                    className="h-12 w-12 flex-shrink-0 rounded-full object-cover"
                    referrerPolicy="no-referrer"
                    onError={() => setPhotoLoadError(true)}
                  />
                ) : (
                  <div
                    className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white"
                    aria-hidden
                  >
                    {getInitials(currentUser?.displayName, currentUser?.email)}
                  </div>
                )}
                <div>
                  <p className="font-medium text-dark dark:text-white">
                    {currentUser?.displayName}
                  </p>
                  <p className="text-sm text-body-color">
                    {currentUser?.email}
                  </p>
                </div>
              </div>
            </div>

            {/* エラーメッセージ */}
            {error && (
              <div className="mb-6 flex items-start gap-3 rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                  <svg className="h-5 w-5 text-red" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-red dark:text-red-light">{error}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* 組織名 */}
              <div className="mb-5">
                <label htmlFor="company" className="mb-2.5 flex items-center gap-2 text-sm font-medium text-dark dark:text-white">
                  組織名
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="company"
                  value={formData.company}
                  onChange={handleChange}
                  placeholder="組織名を入力"
                  className="w-full rounded-md border border-stroke bg-transparent px-5 py-3 text-dark outline-none transition placeholder:text-dark-6 focus:border-primary dark:border-dark-3 dark:text-white dark:focus:border-primary"
                  required
                />
              </div>

              {/* 氏名 */}
              <div className="mb-5">
                <label htmlFor="name" className="mb-2.5 flex items-center gap-2 text-sm font-medium text-dark dark:text-white">
                  氏名
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="例: 山田 太郎"
                  className="w-full rounded-md border border-stroke bg-transparent px-5 py-3 text-dark outline-none transition placeholder:text-dark-6 focus:border-primary dark:border-dark-3 dark:text-white dark:focus:border-primary"
                  required
                />
              </div>

              {/* 電話番号 */}
              <div className="mb-5">
                <label htmlFor="phoneNumber" className="mb-2.5 flex items-center gap-2 text-sm font-medium text-dark dark:text-white">
                  電話番号
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  id="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={(e) => {
                    const cleaned = e.target.value.replace(/[-\s()]/g, '');
                    setFormData(prev => ({ ...prev, phoneNumber: cleaned }));
                  }}
                  placeholder="09012345678（ハイフンなし）"
                  className="w-full rounded-md border border-stroke bg-transparent px-5 py-3 text-dark outline-none transition placeholder:text-dark-6 focus:border-primary dark:border-dark-3 dark:text-white dark:focus:border-primary"
                  required
                />
                <p className="mt-1 text-xs text-body-color">※ハイフンは自動で削除されます</p>
              </div>

              {/* 送信ボタン */}
              <Button
                type="submit"
                color="blue"
                disabled={isSubmitting}
                className="w-full"
              >
                {isSubmitting ? '保存中...' : 'サイト登録へ'}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}

