import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { INDUSTRIES } from '../../constants/industries';
import logoImg from '../../assets/img/logo.svg';

export default function CompleteProfile() {
  const [formData, setFormData] = useState({
    company: '',
    lastName: '',
    firstName: '',
    phoneNumber: '',
    industry: '',
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { currentUser, userProfile, updateUserProfile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // 既に情報が入力済みの場合はダッシュボードへ
    if (userProfile?.company && userProfile?.phoneNumber && userProfile?.industry) {
      navigate('/dashboard');
    }

    // SSOで取得したdisplayNameを姓名に分割して初期値として設定
    if (currentUser?.displayName && !formData.lastName && !formData.firstName) {
      const displayName = currentUser.displayName.trim();
      
      // スペースで分割（全角・半角両対応）
      const nameParts = displayName.split(/[\s　]+/);
      
      if (nameParts.length >= 2) {
        // 2つ以上の部分がある場合: 最初を姓、残りを名として結合
        setFormData(prev => ({
          ...prev,
          lastName: nameParts[0],
          firstName: nameParts.slice(1).join(' ')
        }));
      } else {
        // スペースがない場合: 全体を姓として設定
        setFormData(prev => ({
          ...prev,
          lastName: displayName,
          firstName: ''
        }));
      }
    }
  }, [userProfile, navigate, currentUser, formData.lastName, formData.firstName]);

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
    if (!formData.company || !formData.lastName || !formData.firstName || !formData.phoneNumber || !formData.industry) {
      setError('すべての項目を入力してください');
      setIsSubmitting(false);
      return;
    }

    try {
      await updateUserProfile(currentUser.uid, {
        company: formData.company,
        lastName: formData.lastName,
        firstName: formData.firstName,
        phoneNumber: formData.phoneNumber,
        industry: formData.industry,
      });
      
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
          
          {/* ヘッダー */}
          <div className="bg-primary px-8 py-6 text-center">
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
            {/* ユーザー情報表示 */}
            <div className="mb-6 rounded-lg bg-gray-100 p-4 dark:bg-dark-3">
              <div className="flex items-center gap-3">
                {currentUser?.photoURL && (
                  <img 
                    src={currentUser.photoURL} 
                    alt="Profile" 
                    className="h-12 w-12 rounded-full"
                  />
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
                  <span className="rounded bg-red-500 px-1.5 py-0.5 text-xs text-white">必須</span>
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

              {/* 姓・名 */}
              <div className="mb-5 grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="lastName" className="mb-2.5 flex items-center gap-2 text-sm font-medium text-dark dark:text-white">
                    姓
                    <span className="rounded bg-red-500 px-1.5 py-0.5 text-xs text-white">必須</span>
                  </label>
                  <input
                    type="text"
                    id="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    placeholder="姓を入力"
                    className="w-full rounded-md border border-stroke bg-transparent px-5 py-3 text-dark outline-none transition placeholder:text-dark-6 focus:border-primary dark:border-dark-3 dark:text-white dark:focus:border-primary"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="firstName" className="mb-2.5 flex items-center gap-2 text-sm font-medium text-dark dark:text-white">
                    名
                    <span className="rounded bg-red-500 px-1.5 py-0.5 text-xs text-white">必須</span>
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    placeholder="名を入力"
                    className="w-full rounded-md border border-stroke bg-transparent px-5 py-3 text-dark outline-none transition placeholder:text-dark-6 focus:border-primary dark:border-dark-3 dark:text-white dark:focus:border-primary"
                    required
                  />
                </div>
              </div>

              {/* 電話番号 */}
              <div className="mb-5">
                <label htmlFor="phoneNumber" className="mb-2.5 flex items-center gap-2 text-sm font-medium text-dark dark:text-white">
                  電話番号
                  <span className="rounded bg-red-500 px-1.5 py-0.5 text-xs text-white">必須</span>
                </label>
                <input
                  type="tel"
                  id="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  placeholder="電話番号を入力"
                  className="w-full rounded-md border border-stroke bg-transparent px-5 py-3 text-dark outline-none transition placeholder:text-dark-6 focus:border-primary dark:border-dark-3 dark:text-white dark:focus:border-primary"
                  required
                />
              </div>

              {/* 業界・業種 */}
              <div className="mb-6">
                <label htmlFor="industry" className="mb-2.5 flex items-center gap-2 text-sm font-medium text-dark dark:text-white">
                  業界・業種
                  <span className="rounded bg-red-500 px-1.5 py-0.5 text-xs text-white">必須</span>
                </label>
                <div className="relative">
                  <select
                    id="industry"
                    value={formData.industry}
                    onChange={handleChange}
                    className="w-full appearance-none rounded-md border border-stroke bg-transparent px-5 py-3 text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:text-white dark:focus:border-primary"
                    required
                  >
                    <option value="" disabled>選択してください</option>
                    {INDUSTRIES.map((industry) => (
                      <option key={industry} value={industry}>{industry}</option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M5 7.5L10 12.5L15 7.5" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                </div>
              </div>

              {/* 送信ボタン */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-md bg-primary px-4 py-3 text-center text-sm font-medium text-white hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? '保存中...' : 'サイト登録へ'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}

