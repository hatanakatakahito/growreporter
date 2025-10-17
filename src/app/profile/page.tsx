'use client';

/**
 * 👤 アカウント編集ページ
 * ユーザー情報の表示と編集
 */

import { useAuth } from '@/lib/auth/authContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { UserProfileService } from '@/lib/user/userProfileService';
import { UserProfile } from '@/types/user';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import Loading from '@/components/common/Loading';

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sendingPasswordReset, setSendingPasswordReset] = useState(false);
  
  // フォーム状態
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [company, setCompany] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [industry, setIndustry] = useState('');
  const [emailNotifications, setEmailNotifications] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
      return;
    }
    
    if (!user) return;
    
    const loadProfile = async () => {
      try {
        const profileData = await UserProfileService.getUserProfile(user.uid);
        if (profileData) {
          setProfile(profileData);
          setFirstName(profileData.profile?.firstName || '');
          setLastName(profileData.profile?.lastName || '');
          setCompany(profileData.profile?.company || '');
          setPhoneNumber(profileData.profile?.phoneNumber || '');
          setIndustry(profileData.profile?.businessType || '');
          setEmailNotifications(true); // デフォルト値を設定
        }
      } catch (err) {
        console.error('アカウント情報取得エラー:', err);
        setError('アカウント情報の読み込みに失敗しました');
      } finally {
        setLoading(false);
      }
    };
    
    loadProfile();
  }, [user, authLoading, router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;
    
    setSaving(true);
    setError(null);
    
    try {
      const displayName = lastName && firstName ? `${lastName} ${firstName}` : '';
      
      await UserProfileService.updateUserProfile(user.uid, {
        displayName: displayName || undefined,
        profile: {
          firstName,
          lastName,
          company,
          phoneNumber,
        },
      });
      
      // await UserProfileService.logActivity(user.uid, {
      //   type: 'profile_updated',
      //   description: 'アカウント情報を更新しました',
      //   details: {
      //     displayName,
      //     company,
      //   },
      // });
      
      alert('アカウント情報を保存しました');
    } catch (err) {
      console.error('保存エラー:', err);
      setError('保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!user || !user.email) {
      alert('メールアドレスが取得できませんでした。');
      return;
    }
    
    if (!confirm(`パスワードリセットメールを ${user.email} に送信します。\n\nよろしいですか？`)) {
      return;
    }
    
    try {
      setSendingPasswordReset(true);
      await sendPasswordResetEmail(auth, user.email);
      alert(`パスワードリセットメールを ${user.email} に送信しました。\n\nメールをご確認の上、リンクをクリックしてパスワードをリセットしてください。`);
    } catch (err: any) {
      console.error('❌ パスワードリセットエラー:', err);
      let errorMessage = 'パスワードリセットメールの送信に失敗しました。';
      
      if (err.code === 'auth/user-not-found') {
        errorMessage = 'ユーザーが見つかりませんでした。';
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = '無効なメールアドレスです。';
      } else if (err.code === 'auth/too-many-requests') {
        errorMessage = 'リクエストが多すぎます。しばらく待ってから再度お試しください。';
      }
      
      alert(`エラー: ${errorMessage}`);
    } finally {
      setSendingPasswordReset(false);
    }
  };
  
  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-2 dark:bg-dark">
        <div className="text-center">
          <Loading size={64} />
          <p className="mt-4 text-body-color dark:text-dark-6">読み込み中...</p>
        </div>
      </div>
    );
  }
  
  if (!user || !profile) {
    return null;
  }

  // メール/パスワード認証かGoogle認証かを判定
  const isEmailPasswordAuth = user.providerData.some(provider => provider.providerId === 'password');
  
  return (
    <DashboardLayout>
      <div className="mx-auto max-w-screen-2xl p-4 md:p-6 2xl:p-10">
        {/* Page Header - Mega Template準拠 */}
        <div className="mb-6">
          <h2 className="mb-2 text-2xl font-semibold text-dark dark:text-white">
            アカウント設定
          </h2>
          <p className="text-sm font-medium text-body-color dark:text-dark-6">
            アカウント情報の確認と編集
          </p>
        </div>
        
        <div className="grid gap-8 lg:grid-cols-3">
          {/* メインコンテンツ */}
          <div className="lg:col-span-2">
            <div className="rounded-lg border border-stroke bg-white p-12 dark:border-dark-3 dark:bg-dark-2">
                <form onSubmit={handleSave}>
                  {error && (
                    <div className="mb-6 rounded-md border border-red-200 bg-red-50 p-3.5 dark:border-red-900/50 dark:bg-red-900/20">
                      <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
                    </div>
                  )}
                  
                  {/* 基本情報 */}
                  <div className="mb-7">
                    <div className="mb-4">
                      <label className="mb-2 flex items-center gap-2 text-sm font-medium text-dark dark:text-white">
                        組織名
                        <span className="rounded bg-red-500 px-1.5 py-0.5 text-xs text-white">必須</span>
                      </label>
                      <input
                        type="text"
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        placeholder="組織名を入力"
                        className="w-full rounded-md border border-stroke bg-transparent px-3 py-3 text-sm text-body-color outline-none focus:border-primary focus-visible:shadow-none dark:border-dark-3 dark:text-white"
                      />
                    </div>
                    
                    <div className="mb-4 grid grid-cols-2 gap-4">
                      <div>
                        <label className="mb-2 flex items-center gap-2 text-sm font-medium text-dark dark:text-white">
                          姓
                          <span className="rounded bg-red-500 px-1.5 py-0.5 text-xs text-white">必須</span>
                        </label>
                        <input
                          type="text"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          placeholder="姓を入力"
                          className="w-full rounded-md border border-stroke bg-transparent px-3 py-3 text-sm text-body-color outline-none focus:border-primary focus-visible:shadow-none dark:border-dark-3 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="mb-2 flex items-center gap-2 text-sm font-medium text-dark dark:text-white">
                          名
                          <span className="rounded bg-red-500 px-1.5 py-0.5 text-xs text-white">必須</span>
                        </label>
                        <input
                          type="text"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          placeholder="名を入力"
                          className="w-full rounded-md border border-stroke bg-transparent px-3 py-3 text-sm text-body-color outline-none focus:border-primary focus-visible:shadow-none dark:border-dark-3 dark:text-white"
                        />
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <label className="mb-2 flex items-center gap-2 text-sm font-medium text-dark dark:text-white">
                        電話番号
                        <span className="rounded bg-red-500 px-1.5 py-0.5 text-xs text-white">必須</span>
                      </label>
                      <input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="電話番号を入力"
                        className="w-full rounded-md border border-stroke bg-transparent px-3 py-3 text-sm text-body-color outline-none focus:border-primary focus-visible:shadow-none dark:border-dark-3 dark:text-white"
                      />
                    </div>

                    <div className="mb-4">
                      <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                        業界・業種
                      </label>
                      <select
                        value={industry}
                        onChange={(e) => setIndustry(e.target.value)}
                        className="w-full rounded-md border border-stroke bg-transparent px-3 py-3 text-sm text-body-color outline-none focus:border-primary focus-visible:shadow-none dark:border-dark-3 dark:text-white"
                      >
                        <option value="">選択してください</option>
                        <option value="インターネット、通信事業">インターネット、通信事業</option>
                        <option value="製造業">製造業</option>
                        <option value="小売業">小売業</option>
                        <option value="金融・保険業">金融・保険業</option>
                        <option value="不動産業">不動産業</option>
                        <option value="飲食・宿泊業">飲食・宿泊業</option>
                        <option value="医療・福祉">医療・福祉</option>
                        <option value="教育">教育</option>
                        <option value="サービス業">サービス業</option>
                        <option value="その他">その他</option>
                      </select>
                    </div>

                    <div className="mb-4">
                      <label className="mb-2 flex items-center gap-2 text-sm font-medium text-dark dark:text-white">
                        メールアドレス
                        <span className="rounded bg-red-500 px-1.5 py-0.5 text-xs text-white">必須</span>
                      </label>
                      <input
                        type="email"
                        value={user.email || ''}
                        disabled
                        className="w-full rounded-md border border-stroke bg-transparent px-3 py-3 text-sm text-body-color outline-none focus:border-primary focus-visible:shadow-none dark:border-dark-3 dark:text-white"
                      />
                      <p className="mt-1.5 text-xs font-medium text-body-color dark:text-dark-6">
                        メールアドレスは変更できません
                      </p>
                    </div>
                  </div>
                  
                  <div className="my-7 border-t border-stroke dark:border-dark-3"></div>
                  
                  {/* 通知設定 */}
                  <div className="mb-7">
                    <h3 className="mb-4 text-lg font-semibold text-dark dark:text-white">通知設定</h3>
                    
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={emailNotifications}
                        onChange={(e) => setEmailNotifications(e.target.checked)}
                        className="mr-3 h-5 w-5 rounded border-stroke text-primary focus:ring-2 focus:ring-primary dark:border-dark-3"
                      />
                      <span className="text-sm font-medium text-body-color dark:text-dark-6">
                        メール通知を受け取る
                      </span>
                    </label>
                  </div>
                  
                  {/* 保存ボタン */}
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="submit"
                      disabled={saving}
                      className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-3 text-base font-medium text-white transition hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {saving ? '保存中...' : '保存'}
                    </button>
                    <button
                      type="button"
                      onClick={() => router.push('/dashboard')}
                      className="inline-flex items-center justify-center rounded-md border border-stroke px-5 py-3 text-base font-medium text-dark transition hover:bg-gray-2 dark:border-dark-3 dark:text-white dark:hover:bg-dark-3"
                    >
                      キャンセル
                    </button>
                  </div>
                </form>
              </div>
              
              {/* パスワード変更セクション */}
              {isEmailPasswordAuth ? (
                <div className="mt-6 rounded-lg border border-stroke bg-white p-12 dark:border-dark-3 dark:bg-dark-2">
                  <h3 className="mb-4 text-lg font-semibold text-dark dark:text-white">パスワード変更</h3>
                  <p className="mb-4 text-sm font-medium text-body-color dark:text-dark-6">
                    パスワードをリセットするには、登録されているメールアドレスにリセットリンクを送信します。
                  </p>
                  <button
                    onClick={handlePasswordReset}
                    disabled={sendingPasswordReset}
                    className="inline-flex items-center justify-center rounded-md bg-secondary px-5 py-3 text-base font-medium text-white transition hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                    {sendingPasswordReset ? '送信中...' : 'パスワードリセットメールを送信'}
                  </button>
                </div>
              ) : (
                <div className="mt-6 rounded-lg border border-stroke border-l-4 border-l-primary bg-white p-12 dark:border-dark-3 dark:bg-dark-2">
                  <div className="flex items-start">
                    <svg className="mr-3 h-6 w-6 flex-shrink-0 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <h4 className="mb-1 text-base font-semibold text-dark dark:text-white">Google認証を使用中</h4>
                      <p className="text-sm font-medium text-body-color dark:text-dark-6">
                        パスワードはGoogleアカウントで管理されています。パスワードを変更する場合は、Googleアカウントの設定から行ってください。
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* サイドバー */}
            <div>
              {/* プラン情報 */}
              <div className="rounded-lg border border-stroke bg-white p-12 dark:border-dark-3 dark:bg-dark-2">
                <h3 className="mb-4 text-lg font-semibold text-dark dark:text-white">プラン</h3>
                {profile.subscription ? (
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-body-color dark:text-dark-6">現在のプラン</p>
                      <div className="mt-1.5 inline-block rounded-full bg-primary px-3 py-1 text-sm font-medium text-white">
                        {profile.subscription.plan.toUpperCase()}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-sm font-medium text-body-color dark:text-dark-6">
                    プラン情報はありません
                  </p>
                )}
              </div>
              
              {/* アカウント情報 */}
              <div className="mt-6 rounded-lg border border-stroke bg-white p-12 dark:border-dark-3 dark:bg-dark-2">
                <h3 className="mb-4 text-lg font-semibold text-dark dark:text-white">アカウント情報</h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="font-medium text-body-color dark:text-dark-6">登録日</p>
                    <p className="mt-1 font-medium text-dark dark:text-white">
                      {profile.metadata?.createdAt?.toDate().toLocaleString('ja-JP', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-body-color dark:text-dark-6">最終ログイン</p>
                    <p className="mt-1 font-medium text-dark dark:text-white">
                      {profile.usage?.lastLogin?.toDate().toLocaleString('ja-JP', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) || 'N/A'}
                    </p>
                  </div>
                </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
