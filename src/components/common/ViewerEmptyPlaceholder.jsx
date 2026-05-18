import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';
import { Eye, User, LogOut } from 'lucide-react';

/**
 * 閲覧者専用のプレースホルダー画面
 *
 * オーナーが閲覧サイトを 1 つも割り当てていない viewer に表示される。
 * - サイト一覧やサイドバーは隠す
 * - プロフィール編集とログアウトのみ可能
 */
export default function ViewerEmptyPlaceholder() {
  const { userProfile, logout } = useAuth();
  const userName = userProfile?.name
    || (userProfile?.lastName && userProfile?.firstName
      ? `${userProfile.lastName} ${userProfile.firstName}`
      : '')
    || userProfile?.displayName
    || userProfile?.email
    || '閲覧者';

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#f0f2f8] px-4 py-8">
      <div className="w-full max-w-xl rounded-2xl border border-stroke bg-white p-10 shadow-sm dark:border-dark-3 dark:bg-dark-2">
        <div className="mb-6 flex items-center justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Eye className="h-8 w-8 text-primary" />
          </div>
        </div>
        <h1 className="mb-3 text-center text-2xl font-bold text-dark dark:text-white">
          閲覧サイトの割当をお待ちください
        </h1>
        <p className="mb-2 text-center text-sm text-body-color dark:text-dark-6">
          {userName} さん、グローレポータへようこそ。
        </p>
        <p className="mb-8 text-center text-sm leading-relaxed text-body-color dark:text-dark-6">
          現在、閲覧可能なサイトがまだ割り当てられていません。
          <br />
          オーナーがサイトを割り当てると、ここに分析ダッシュボードが表示されます。
        </p>

        <div className="mb-6 rounded-lg bg-blue-50 p-4 text-sm text-blue-700 dark:bg-blue-900/20 dark:text-blue-200">
          <p className="font-medium">権限について</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-relaxed">
            <li>あなたの権限は <strong>閲覧者</strong> です</li>
            <li>割り当てられたサイトのみ分析データを閲覧できます</li>
            <li>サイトの編集や設定変更はできません</li>
          </ul>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button variant="secondary" href="/account/settings?tab=profile">
            <User data-slot="icon" />
            プロフィールを編集
          </Button>
          <Button variant="ghost" type="button" onClick={logout}>
            <LogOut data-slot="icon" />
            ログアウト
          </Button>
        </div>

        <p className="mt-8 text-center text-xs text-gray-400">
          サイトを割り当てる権限はオーナーにあります。お困りの場合はオーナーへご連絡ください。
        </p>
      </div>
    </div>
  );
}
