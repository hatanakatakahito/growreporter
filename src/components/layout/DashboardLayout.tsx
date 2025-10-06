'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/authContext';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { UserProfileService } from '@/lib/user/userProfileService';
import { UserProfile } from '@/types/user';

interface DashboardLayoutProps {
  children: React.ReactNode;
  siteInfo?: {
    startDate?: string;
    endDate?: string;
    scope?: string;
    propertyId?: string;
    siteName?: string;
    siteUrl?: string;
    dateRangeType?: string;
    onDateRangeChange?: (type: string, customStart?: string, customEnd?: string) => void;
  };
}

export default function DashboardLayout({ children, siteInfo }: DashboardLayoutProps) {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dateRangeDropdownOpen, setDateRangeDropdownOpen] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // プロファイル情報を取得
  useEffect(() => {
    if (!user) return;

    const loadProfile = async () => {
      try {
        const profileData = await UserProfileService.getUserProfile(user.uid);
        setProfile(profileData);
      } catch (error) {
        console.error('プロファイル取得エラー:', error);
      }
    };

    loadProfile();
  }, [user]);

  const handleLogout = async () => {
    await signOut();
    router.push('/');
  };

  // 表示名を生成
  const getDisplayName = () => {
    if (profile?.profile?.lastName && profile?.profile?.firstName) {
      return `${profile.profile.lastName} ${profile.profile.firstName}`;
    }
    return user?.displayName || user?.email || 'ユーザー';
  };

  // アバターのイニシャルを生成
  const getInitial = () => {
    if (profile?.profile?.lastName) {
      return profile.profile.lastName.charAt(0);
    }
    return user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'U';
  };

  return (
    <section className="relative flex min-h-screen w-full items-start bg-gray-2 dark:bg-dark">
      {/* Sidebar */}
      <div
        className={`shadow-card fixed top-0 left-0 z-40 flex h-screen w-full max-w-[300px] flex-col justify-between overflow-y-auto bg-white duration-200 dark:bg-dark-2 xl:translate-x-0 scrollbar-hide ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <div>
          {/* Logo */}
          <div className="px-10 pt-10 pb-9">
            <Link href="/dashboard">
              <img 
                src="/logo.svg" 
                alt="GrowReporter" 
                className="h-8 w-auto"
              />
            </Link>
          </div>

          {/* Navigation */}
          <nav>
            <ul>
              <li>
                <Link
                  href="/dashboard"
                  className={`relative flex items-center gap-2.5 border-r-4 py-[10px] pr-10 pl-9 text-base font-medium duration-200 ${
                    pathname === '/dashboard'
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-transparent text-body-color hover:border-primary hover:bg-primary/5 dark:text-dark-6'
                  }`}
                >
                  <svg className="fill-current" width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6.10322 0.956299H2.53135C1.5751 0.956299 0.787598 1.7438 0.787598 2.70005V6.27192C0.787598 7.22817 1.5751 8.01567 2.53135 8.01567H6.10322C7.05947 8.01567 7.84697 7.22817 7.84697 6.27192V2.72817C7.8751 1.7438 7.0876 0.956299 6.10322 0.956299ZM6.60947 6.30005C6.60947 6.5813 6.38447 6.8063 6.10322 6.8063H2.53135C2.2501 6.8063 2.0251 6.5813 2.0251 6.30005V2.72817C2.0251 2.44692 2.2501 2.22192 2.53135 2.22192H6.10322C6.38447 2.22192 6.60947 2.44692 6.60947 2.72817V6.30005Z" fill=""/>
                    <path d="M15.4689 0.956299H11.8971C10.9408 0.956299 10.1533 1.7438 10.1533 2.70005V6.27192C10.1533 7.22817 10.9408 8.01567 11.8971 8.01567H15.4689C16.4252 8.01567 17.2127 7.22817 17.2127 6.27192V2.72817C17.2127 1.7438 16.4252 0.956299 15.4689 0.956299ZM15.9752 6.30005C15.9752 6.5813 15.7502 6.8063 15.4689 6.8063H11.8971C11.6158 6.8063 11.3908 6.5813 11.3908 6.30005V2.72817C11.3908 2.44692 11.6158 2.22192 11.8971 2.22192H15.4689C15.7502 2.22192 15.9752 2.44692 15.9752 2.72817V6.30005Z" fill=""/>
                    <path d="M6.10322 9.92822H2.53135C1.5751 9.92822 0.787598 10.7157 0.787598 11.672V15.2438C0.787598 16.2001 1.5751 16.9876 2.53135 16.9876H6.10322C7.05947 16.9876 7.84697 16.2001 7.84697 15.2438V11.7001C7.8751 10.7157 7.0876 9.92822 6.10322 9.92822ZM6.60947 15.272C6.60947 15.5532 6.38447 15.7782 6.10322 15.7782H2.53135C2.2501 15.7782 2.0251 15.5532 2.0251 15.272V11.7001C2.0251 11.4188 2.2501 11.1938 2.53135 11.1938H6.10322C6.38447 11.1938 6.60947 11.4188 6.60947 11.7001V15.272Z" fill=""/>
                    <path d="M15.4689 9.92822H11.8971C10.9408 9.92822 10.1533 10.7157 10.1533 11.672V15.2438C10.1533 16.2001 10.9408 16.9876 11.8971 16.9876H15.4689C16.4252 16.9876 17.2127 16.2001 17.2127 15.2438V11.7001C17.2127 10.7157 16.4252 9.92822 15.4689 9.92822ZM15.9752 15.272C15.9752 15.5532 15.7502 15.7782 15.4689 15.7782H11.8971C11.6158 15.7782 11.3908 15.5532 11.3908 15.272V11.7001C11.3908 11.4188 11.6158 11.1938 11.8971 11.1938H15.4689C15.7502 11.1938 15.9752 11.4188 15.9752 11.7001V15.272Z" fill=""/>
                  </svg>
                  ダッシュボード
                </Link>
              </li>
              <li>
                <Link
                  href="/summary"
                  className={`relative flex items-center gap-2.5 border-r-4 py-[10px] pr-10 pl-9 text-base font-medium duration-200 ${
                    pathname === '/summary'
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-transparent text-body-color hover:border-primary hover:bg-primary/5 dark:text-dark-6'
                  }`}
                >
                  <svg className="fill-current" width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1.43425 7.5093H2.278C2.44675 7.5093 2.55925 7.3968 2.58737 7.31243L2.98112 6.32805H5.90612L6.27175 7.31243C6.328 7.48118 6.46862 7.5093 6.58112 7.5093H7.453C7.76237 7.48118 7.87487 7.25618 7.76237 7.03118L5.428 1.4343C5.37175 1.26555 5.3155 1.23743 5.14675 1.23743H3.88112C3.76862 1.23743 3.59987 1.29368 3.57175 1.4343L1.153 7.08743C1.0405 7.2843 1.20925 7.5093 1.43425 7.5093ZM4.47175 2.98118L5.3155 5.17493H3.59987L4.47175 2.98118Z" fill=""/>
                    <path d="M10.1249 2.5031H16.8749C17.2124 2.5031 17.5218 2.22185 17.5218 1.85623C17.5218 1.4906 17.2405 1.20935 16.8749 1.20935H10.1249C9.7874 1.20935 9.47803 1.4906 9.47803 1.85623C9.47803 2.22185 9.75928 2.5031 10.1249 2.5031Z" fill=""/>
                    <path d="M16.8749 6.2156H10.1249C9.7874 6.2156 9.47803 6.49685 9.47803 6.86248C9.47803 7.22810 9.75928 7.50935 10.1249 7.50935H16.8749C17.2124 7.50935 17.5218 7.22810 17.5218 6.86248C17.5218 6.49685 17.2124 6.2156 16.8749 6.2156Z" fill=""/>
                    <path d="M16.8749 10.9219H1.12489C0.787391 10.9219 0.478027 11.2031 0.478027 11.5687C0.478027 11.9344 0.759277 12.2156 1.12489 12.2156H16.8749C17.2124 12.2156 17.5218 11.9344 17.5218 11.5687C17.5218 11.2031 17.2124 10.9219 16.8749 10.9219Z" fill=""/>
                    <path d="M16.8749 15.6281H1.12489C0.787391 15.6281 0.478027 15.9094 0.478027 16.275C0.478027 16.6406 0.759277 16.9219 1.12489 16.9219H16.8749C17.2124 16.9219 17.5218 16.6406 17.5218 16.275C17.5218 15.9094 17.2124 15.6281 16.8749 15.6281Z" fill=""/>
                  </svg>
                  全体サマリー
                </Link>
              </li>
              <li>
                <Link
                  href="/site-settings"
                  className={`relative flex items-center gap-2.5 border-r-4 py-[10px] pr-10 pl-9 text-base font-medium duration-200 ${
                    pathname === '/site-settings'
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-transparent text-body-color hover:border-primary hover:bg-primary/5 dark:text-dark-6'
                  }`}
                >
                  <svg className="fill-current" width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9.0002 0.562622C6.9377 0.562622 5.2502 2.25012 5.2502 4.31262C5.2502 6.37512 6.9377 8.06262 9.0002 8.06262C11.0627 8.06262 12.7502 6.37512 12.7502 4.31262C12.7502 2.25012 11.0627 0.562622 9.0002 0.562622ZM9.0002 6.82512C7.62519 6.82512 6.4877 5.68762 6.4877 4.31262C6.4877 2.93762 7.62519 1.80012 9.0002 1.80012C10.3752 1.80012 11.5127 2.93762 11.5127 4.31262C11.5127 5.68762 10.3752 6.82512 9.0002 6.82512Z" fill=""/>
                    <path d="M15.7502 9.29987H2.2502C1.2939 9.29987 0.506394 10.0874 0.506394 11.0436V15.8311C0.506394 16.7874 1.2939 17.5749 2.2502 17.5749H15.7502C16.7064 17.5749 17.4939 16.7874 17.4939 15.8311V11.0436C17.4939 10.0874 16.7064 9.29987 15.7502 9.29987ZM16.2564 15.8311C16.2564 16.1124 16.0314 16.3374 15.7502 16.3374H2.2502C1.96895 16.3374 1.74395 16.1124 1.74395 15.8311V11.0436C1.74395 10.7624 1.96895 10.5374 2.2502 10.5374H15.7502C16.0314 10.5374 16.2564 10.7624 16.2564 11.0436V15.8311Z" fill=""/>
                  </svg>
                  サイト設定
                </Link>
              </li>
              <li>
                <Link
                  href="/analysis"
                  className={`relative flex items-center gap-2.5 border-r-4 py-[10px] pr-10 pl-9 text-base font-medium duration-200 ${
                    pathname === '/analysis'
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-transparent text-body-color hover:border-primary hover:bg-primary/5 dark:text-dark-6'
                  }`}
                >
                  <svg className="fill-current" width="18" height="19" viewBox="0 0 18 19" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <g clipPath="url(#clip0_130_9756)">
                      <path d="M15.7501 0.55835H2.2501C1.29385 0.55835 0.506348 1.34585 0.506348 2.3021V7.53335C0.506348 8.4896 1.29385 9.2771 2.2501 9.2771H15.7501C16.7063 9.2771 17.4938 8.4896 17.4938 7.53335V2.3021C17.4938 1.34585 16.7063 0.55835 15.7501 0.55835ZM16.2563 7.53335C16.2563 7.8146 16.0313 8.0396 15.7501 8.0396H2.2501C1.96885 8.0396 1.74385 7.8146 1.74385 7.53335V2.3021C1.74385 2.02085 1.96885 1.79585 2.2501 1.79585H15.7501C16.0313 1.79585 16.2563 2.02085 16.2563 2.3021V7.53335Z" fill=""/>
                      <path d="M6.13135 10.9646H2.2501C1.29385 10.9646 0.506348 11.7521 0.506348 12.7083V15.8021C0.506348 16.7583 1.29385 17.5458 2.2501 17.5458H6.13135C7.0876 17.5458 7.8751 16.7583 7.8751 15.8021V12.7083C7.8751 11.7521 7.0876 10.9646 6.13135 10.9646ZM6.6376 15.8021C6.6376 16.0833 6.4126 16.3083 6.13135 16.3083H2.2501C1.96885 16.3083 1.74385 16.0833 1.74385 15.8021V12.7083C1.74385 12.4271 1.96885 12.2021 2.2501 12.2021H6.13135C6.4126 12.2021 6.6376 12.4271 6.6376 12.7083V15.8021Z" fill=""/>
                      <path d="M15.75 10.9646H11.8688C10.9125 10.9646 10.125 11.7521 10.125 12.7083V15.8021C10.125 16.7583 10.9125 17.5458 11.8688 17.5458H15.75C16.7063 17.5458 17.4938 16.7583 17.4938 15.8021V12.7083C17.4938 11.7521 16.7063 10.9646 15.75 10.9646ZM16.2562 15.8021C16.2562 16.0833 16.0312 16.3083 15.75 16.3083H11.8688C11.5875 16.3083 11.3625 16.0833 11.3625 15.8021V12.7083C11.3625 12.4271 11.5875 12.2021 11.8688 12.2021H15.75C16.0312 12.2021 16.2562 12.4271 16.2562 12.7083V15.8021Z" fill=""/>
                    </g>
                    <defs>
                      <clipPath id="clip0_130_9756">
                        <rect width="18" height="18" fill="white" transform="translate(0 0.052124)"/>
                      </clipPath>
                    </defs>
                  </svg>
                  データ分析
                </Link>
              </li>
              <li>
                <Link
                  href="/kpi"
                  className={`relative flex items-center gap-2.5 border-r-4 py-[10px] pr-10 pl-9 text-base font-medium duration-200 ${
                    pathname === '/kpi'
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-transparent text-body-color hover:border-primary hover:bg-primary/5 dark:text-dark-6'
                  }`}
                >
                  <svg className="fill-current" width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M15.7499 2.9812H14.2874V2.36245C14.2874 2.02495 14.0062 1.71558 13.6405 1.71558C13.2749 1.71558 12.9937 1.99683 12.9937 2.36245V2.9812H4.97803V2.36245C4.97803 2.02495 4.69678 1.71558 4.33115 1.71558C3.96553 1.71558 3.68428 1.99683 3.68428 2.36245V2.9812H2.2499C1.29365 2.9812 0.478027 3.79683 0.478027 4.75308V5.42183C0.478027 5.98433 0.871527 6.46245 1.40615 6.59058V15.2562C1.40615 16.2124 2.19365 16.9999 3.1499 16.9999H14.8218C15.778 16.9999 16.5655 16.2124 16.5655 15.2562V6.59058C17.0718 6.46245 17.4937 5.98433 17.4937 5.42183V4.75308C17.5218 3.79683 16.7062 2.9812 15.7499 2.9812ZM1.77178 5.42183V4.75308C1.77178 4.47183 2.0249 4.21871 2.27803 4.21871H3.74053V4.8937C3.74053 5.23121 4.02178 5.54058 4.3874 5.54058C4.75303 5.54058 5.03428 5.25933 5.03428 4.8937V4.21871H13.0499V4.8937C13.0499 5.23121 13.3312 5.54058 13.6968 5.54058C14.0624 5.54058 14.3437 5.25933 14.3437 4.8937V4.21871H15.778C16.0593 4.21871 16.3124 4.47183 16.3124 4.75308V5.42183C16.3124 5.70308 16.0593 5.9562 15.778 5.9562H2.2499C1.99678 5.9562 1.77178 5.70308 1.77178 5.42183ZM15.2718 15.7062H2.72803C2.47491 15.7062 2.22178 15.453 2.22178 15.1718V7.24995H15.778V15.1718C15.778 15.453 15.5249 15.7062 15.2718 15.7062Z" fill=""/>
                    <path d="M6.02491 9.70308C5.65929 9.70308 5.37804 9.98433 5.37804 10.3499V13.8374C5.37804 14.2031 5.65929 14.4843 6.02491 14.4843C6.39054 14.4843 6.67179 14.2031 6.67179 13.8374V10.3499C6.67179 9.98433 6.39054 9.70308 6.02491 9.70308Z" fill=""/>
                    <path d="M9.02491 9.28748C8.65929 9.28748 8.37804 9.56873 8.37804 9.93435V13.8593C8.37804 14.2249 8.65929 14.5062 9.02491 14.5062C9.39054 14.5062 9.67179 14.2249 9.67179 13.8593V9.93435C9.67179 9.56873 9.39054 9.28748 9.02491 9.28748Z" fill=""/>
                    <path d="M12.0249 10.9812C11.6593 10.9812 11.378 11.2624 11.378 11.6281V13.8374C11.378 14.2031 11.6593 14.4843 12.0249 14.4843C12.3905 14.4843 12.6718 14.2031 12.6718 13.8374V11.6281C12.6718 11.2624 12.3905 10.9812 12.0249 10.9812Z" fill=""/>
                  </svg>
                  KPI管理
                </Link>
              </li>
              <li>
                <Link
                  href="/history"
                  className={`relative flex items-center gap-2.5 border-r-4 py-[10px] pr-10 pl-9 text-base font-medium duration-200 ${
                    pathname === '/history'
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-transparent text-body-color hover:border-primary hover:bg-primary/5 dark:text-dark-6'
                  }`}
                >
                  <svg className="fill-current" width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9.0002 7.79065C11.0814 7.79065 12.7689 6.1594 12.7689 4.1344C12.7689 2.1094 11.0814 0.478149 9.0002 0.478149C6.91895 0.478149 5.23145 2.1094 5.23145 4.1344C5.23145 6.1594 6.91895 7.79065 9.0002 7.79065ZM9.0002 1.7719C10.3783 1.7719 11.5033 2.84065 11.5033 4.16252C11.5033 5.48440 10.3783 6.55315 9.0002 6.55315C7.62207 6.55315 6.49707 5.48440 6.49707 4.16252C6.49707 2.84065 7.62207 1.7719 9.0002 1.7719Z" fill=""/>
                    <path d="M10.8283 9.05627H7.17207C4.16269 9.05627 1.71582 11.5313 1.71582 14.5406V16.875C1.71582 17.2125 1.99707 17.5219 2.3627 17.5219C2.72832 17.5219 3.00957 17.2407 3.00957 16.875V14.5406C3.00957 12.2344 4.89394 10.3219 7.22832 10.3219H10.8564C13.1627 10.3219 15.0752 12.2063 15.0752 14.5406V16.875C15.0752 17.2125 15.3564 17.5219 15.7221 17.5219C16.0877 17.5219 16.3689 17.2407 16.3689 16.875V14.5406C16.2846 11.5313 13.8377 9.05627 10.8283 9.05627Z" fill=""/>
                  </svg>
                  分析履歴
                </Link>
              </li>
              
              {/* Divider */}
              <li>
                <div className="mx-9 my-5 h-px bg-stroke dark:bg-dark-3"></div>
              </li>

              <li>
                <Link
                  href="/profile"
                  className={`relative flex items-center border-r-4 py-[10px] pr-10 pl-9 text-base font-medium duration-200 ${
                    pathname === '/profile'
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-transparent text-body-color hover:border-primary hover:bg-primary/5 dark:text-dark-6'
                  }`}
                >
                  アカウント
                </Link>
              </li>
              
              {user?.email === 'admin@example.com' && (
                <li>
                  <Link
                    href="/admin"
                    className={`relative flex items-center border-r-4 py-[10px] pr-10 pl-9 text-base font-medium duration-200 ${
                      pathname === '/admin'
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-transparent text-body-color hover:border-primary hover:bg-primary/5 dark:text-dark-6'
                    }`}
                  >
                    管理者パネル
                  </Link>
                </li>
              )}

              <li>
                <button
                  onClick={handleLogout}
                  className="relative flex w-full items-center border-r-4 border-transparent py-[10px] pr-10 pl-9 text-base font-medium text-body-color duration-200 hover:border-primary hover:bg-primary/5 dark:text-dark-6"
                >
                  ログアウト
                </button>
              </li>
            </ul>
          </nav>
        </div>

        {/* User Profile */}
        <div className="p-10">
          <div className="flex items-center">
            <div className="mr-4 h-[50px] w-full max-w-[50px] rounded-full">
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt="profile"
                  className="h-full w-full rounded-full object-cover object-center"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center rounded-full bg-primary text-white">
                  {getInitial()}
                </div>
              )}
            </div>
            <div>
              <h6 className="text-base font-medium text-dark dark:text-white">
                {getDisplayName()}
              </h6>
              <p className="text-body-color dark:text-dark-6 text-sm">
                {user?.email}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative flex flex-1 flex-col xl:ml-[300px]">
        {/* Header */}
        <header className="sticky top-0 z-30 flex w-full bg-white dark:bg-dark-2">
          <div className="flex flex-grow items-center justify-between px-4 py-4 md:px-6 2xl:px-11">
            <div className="flex items-center gap-2 sm:gap-4">
              {/* Hamburger Toggle */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="block xl:hidden"
              >
                <svg
                  className="fill-current"
                  width="20"
                  height="18"
                  viewBox="0 0 20 18"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M19 8.175H2.98748L9.36248 1.6875C9.69998 1.35 9.69998 0.825 9.36248 0.4875C9.02498 0.15 8.49998 0.15 8.16248 0.4875L0.399976 8.3625C0.0624756 8.7 0.0624756 9.225 0.399976 9.5625L8.16248 17.4375C8.31248 17.5875 8.53748 17.7 8.76248 17.7C8.98748 17.7 9.17498 17.625 9.36248 17.475C9.69998 17.1375 9.69998 16.6125 9.36248 16.275L3.02498 9.8625H19C19.45 9.8625 19.825 9.4875 19.825 9.0375C19.825 8.55 19.45 8.175 19 8.175Z" />
                </svg>
              </button>

              {/* Site Info */}
              {siteInfo && (
                <div className="hidden items-center gap-3 lg:flex">
                  {/* Date Range Selector */}
                  <div className="relative">
                    <button
                      onClick={() => setDateRangeDropdownOpen(!dateRangeDropdownOpen)}
                      className="flex items-center gap-2 text-sm text-body-color hover:text-primary dark:text-dark-6"
                    >
                      {siteInfo.startDate && siteInfo.endDate 
                        ? `${siteInfo.startDate} - ${siteInfo.endDate}`
                        : '日付範囲を選択'}
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>

                    {/* Dropdown Menu */}
                    {dateRangeDropdownOpen && (
                      <div className="absolute left-0 top-full z-50 mt-2 w-64 rounded-md border border-stroke bg-white p-3 shadow-lg dark:border-dark-3 dark:bg-dark-2">
                        <div className="space-y-2">
                          <button
                            onClick={() => {
                              siteInfo.onDateRangeChange?.('last_month');
                              setDateRangeDropdownOpen(false);
                              setShowDatePicker(false);
                            }}
                            className={`w-full rounded px-3 py-2 text-left text-sm hover:bg-gray-2 dark:hover:bg-dark-3 ${
                              siteInfo.dateRangeType === 'last_month' ? 'bg-primary/10 text-primary' : 'text-dark dark:text-white'
                            }`}
                          >
                            前月
                          </button>
                          <button
                            onClick={() => {
                              setShowDatePicker(true);
                            }}
                            className={`w-full rounded px-3 py-2 text-left text-sm hover:bg-gray-2 dark:hover:bg-dark-3 ${
                              siteInfo.dateRangeType === 'custom' ? 'bg-primary/10 text-primary' : 'text-dark dark:text-white'
                            }`}
                          >
                            カスタム
                          </button>

                          {/* Custom Date Picker */}
                          {showDatePicker && (
                            <div className="mt-3 space-y-3 border-t border-stroke pt-3 dark:border-dark-3">
                              <div>
                                <label className="mb-1 block text-xs text-body-color dark:text-dark-6">開始日</label>
                                <input
                                  type="date"
                                  value={customStartDate}
                                  onChange={(e) => setCustomStartDate(e.target.value)}
                                  className="w-full rounded border border-stroke bg-transparent px-2 py-1.5 text-sm text-dark outline-none dark:border-dark-3 dark:text-white"
                                />
                              </div>
                              <div>
                                <label className="mb-1 block text-xs text-body-color dark:text-dark-6">終了日</label>
                                <input
                                  type="date"
                                  value={customEndDate}
                                  onChange={(e) => setCustomEndDate(e.target.value)}
                                  className="w-full rounded border border-stroke bg-transparent px-2 py-1.5 text-sm text-dark outline-none dark:border-dark-3 dark:text-white"
                                />
                              </div>
                              <button
                                onClick={() => {
                                  if (customStartDate && customEndDate) {
                                    siteInfo.onDateRangeChange?.('custom', customStartDate, customEndDate);
                                    setDateRangeDropdownOpen(false);
                                  }
                                }}
                                disabled={!customStartDate || !customEndDate}
                                className="w-full rounded bg-primary px-3 py-2 text-sm text-white hover:bg-opacity-90 disabled:opacity-50"
                              >
                                適用
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="h-4 w-px bg-stroke dark:bg-dark-3"></div>
                  <span className="text-sm text-body-color dark:text-dark-6">
                    {siteInfo.scope || '全体'}
                  </span>
                  <div className="h-4 w-px bg-stroke dark:bg-dark-3"></div>
                  <span className="text-sm text-dark dark:text-white">
                    {siteInfo.siteName || '-'} - GA4 {siteInfo.propertyId ? `(${siteInfo.propertyId})` : '()'}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 2xsm:gap-7">
              {/* User Dropdown */}
              <div className="relative">
                <button 
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-3"
                >
                  <span className="hidden text-right lg:block">
                    <span className="block text-sm font-medium text-dark dark:text-white">
                      {getDisplayName()}
                    </span>
                    <span className="block text-xs text-body-color dark:text-dark-6">
                      {user?.email}
                    </span>
                  </span>

                  <span className="h-12 w-12 rounded-full">
                    {user?.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt="User"
                        className="h-full w-full rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center rounded-full bg-primary text-white">
                        {getInitial()}
                      </div>
                    )}
                  </span>

                  <svg
                    className={`hidden fill-current sm:block transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
                    width="12"
                    height="8"
                    viewBox="0 0 12 8"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M0.410765 0.910734C0.736202 0.585297 1.26384 0.585297 1.58928 0.910734L6.00002 5.32148L10.4108 0.910734C10.7362 0.585297 11.2638 0.585297 11.5893 0.910734C11.9147 1.23617 11.9147 1.76381 11.5893 2.08924L6.58928 7.08924C6.26384 7.41468 5.7362 7.41468 5.41077 7.08924L0.410765 2.08924C0.0853277 1.76381 0.0853277 1.23617 0.410765 0.910734Z"
                    />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {dropdownOpen && (
                  <div className="absolute right-0 mt-4 flex w-62.5 flex-col rounded-sm border border-stroke bg-white shadow-default dark:border-dark-3 dark:bg-dark-2">
                    <ul className="flex flex-col overflow-y-auto border-b border-stroke dark:border-dark-3">
                      <li>
                        <button
                          onClick={() => {
                            setDropdownOpen(false);
                            router.push('/profile');
                          }}
                          className="flex w-full gap-3.5 px-6 py-4 text-sm font-medium hover:bg-gray-2 dark:hover:bg-dark-3 lg:text-base"
                        >
                          <svg
                            className="fill-current"
                            width="22"
                            height="22"
                            viewBox="0 0 22 22"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path d="M11 9.62499C8.42188 9.62499 6.35938 7.59687 6.35938 5.12187C6.35938 2.64687 8.42188 0.618744 11 0.618744C13.5781 0.618744 15.6406 2.64687 15.6406 5.12187C15.6406 7.59687 13.5781 9.62499 11 9.62499ZM11 2.16562C9.28125 2.16562 7.90625 3.50624 7.90625 5.12187C7.90625 6.73749 9.28125 8.07812 11 8.07812C12.7188 8.07812 14.0938 6.73749 14.0938 5.12187C14.0938 3.50624 12.7188 2.16562 11 2.16562Z" />
                            <path d="M17.7719 21.4156H4.2281C3.5406 21.4156 2.9906 20.8656 2.9906 20.1781V17.0844C2.9906 13.7156 5.7406 10.9656 9.10935 10.9656H12.925C16.2937 10.9656 19.0437 13.7156 19.0437 17.0844V20.1781C19.0094 20.8312 18.4594 21.4156 17.7719 21.4156ZM4.53748 19.8687H17.4969V17.0844C17.4969 14.575 15.4344 12.5125 12.925 12.5125H9.07498C6.5656 12.5125 4.5031 14.575 4.5031 17.0844V19.8687H4.53748Z" />
                          </svg>
                          アカウント
                        </button>
                      </li>
                      <li>
                        <button
                          onClick={() => {
                            setDropdownOpen(false);
                            router.push('/admin');
                          }}
                          className="flex w-full gap-3.5 px-6 py-4 text-sm font-medium hover:bg-gray-2 dark:hover:bg-dark-3 lg:text-base"
                        >
                          <svg
                            className="fill-current"
                            width="22"
                            height="22"
                            viewBox="0 0 22 22"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path d="M17.6687 1.44374C17.1187 0.893744 16.4312 0.618744 15.675 0.618744H7.42498C6.25623 0.618744 5.25935 1.58124 5.25935 2.78437V4.12499H4.29685C3.88435 4.12499 3.50623 4.46874 3.50623 4.91562C3.50623 5.36249 3.84998 5.70624 4.29685 5.70624H5.25935V10.2781H4.29685C3.88435 10.2781 3.50623 10.6219 3.50623 11.0687C3.50623 11.4812 3.84998 11.8594 4.29685 11.8594H5.25935V16.4312H4.29685C3.88435 16.4312 3.50623 16.775 3.50623 17.2219C3.50623 17.6687 3.84998 18.0125 4.29685 18.0125H5.25935V19.25C5.25935 20.4187 6.22185 21.4156 7.42498 21.4156H15.675C17.2218 21.4156 18.4937 20.1437 18.5281 18.5969V3.40937C18.4937 2.68437 18.2187 1.95937 17.6687 1.44374ZM16.9469 18.5625C16.9469 19.2844 16.3625 19.8344 15.6406 19.8344H7.3906C7.04685 19.8344 6.77185 19.5594 6.77185 19.2156V17.875H8.6281C9.0406 17.875 9.41873 17.5312 9.41873 17.0844C9.41873 16.6375 9.07498 16.2937 8.6281 16.2937H6.77185V11.7906H8.6281C9.0406 11.7906 9.41873 11.4469 9.41873 11C9.41873 10.5875 9.07498 10.2094 8.6281 10.2094H6.77185V5.63749H8.6281C9.0406 5.63749 9.41873 5.29374 9.41873 4.84687C9.41873 4.39999 9.07498 4.05624 8.6281 4.05624H6.77185V2.74999C6.77185 2.40624 7.04685 2.13124 7.3906 2.13124H15.6406C15.9844 2.13124 16.2937 2.26874 16.5687 2.50937C16.8094 2.74999 16.9469 3.09374 16.9469 3.43749V18.5625Z" />
                          </svg>
                          管理者パネル
                        </button>
                      </li>
                    </ul>
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        handleLogout();
                      }}
                      className="flex gap-3.5 px-6 py-4 text-sm font-medium hover:bg-gray-2 dark:hover:bg-dark-3 lg:text-base"
                    >
                      <svg
                        className="fill-current"
                        width="22"
                        height="22"
                        viewBox="0 0 22 22"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path d="M15.5375 0.618744H11.6531C10.7594 0.618744 10.0031 1.37499 10.0031 2.26874V4.64062C10.0031 5.05312 10.3469 5.39687 10.7594 5.39687C11.1719 5.39687 11.55 5.05312 11.55 4.64062V2.23437C11.55 2.16562 11.5844 2.13124 11.6531 2.13124H15.5375C16.3625 2.13124 17.0156 2.78437 17.0156 3.60937V18.3562C17.0156 19.1812 16.3625 19.8344 15.5375 19.8344H11.6531C11.5844 19.8344 11.55 19.8 11.55 19.7312V17.3594C11.55 16.9469 11.2062 16.6031 10.7594 16.6031C10.3125 16.6031 10.0031 16.9469 10.0031 17.3594V19.7312C10.0031 20.625 10.7594 21.3812 11.6531 21.3812H15.5375C17.2219 21.3812 18.5625 20.0062 18.5625 18.3562V3.64374C18.5625 1.95937 17.1875 0.618744 15.5375 0.618744Z" />
                        <path d="M6.05001 11.7563H12.2031C12.6156 11.7563 12.9594 11.4125 12.9594 11C12.9594 10.5875 12.6156 10.2438 12.2031 10.2438H6.08439L8.21564 8.07813C8.52501 7.76875 8.52501 7.2875 8.21564 6.97812C7.90626 6.66875 7.42501 6.66875 7.11564 6.97812L3.67814 10.4844C3.36876 10.7938 3.36876 11.275 3.67814 11.5844L7.11564 15.0906C7.25314 15.2281 7.45939 15.3312 7.66564 15.3312C7.87189 15.3312 8.04376 15.2625 8.21564 15.125C8.52501 14.8156 8.52501 14.3344 8.21564 14.025L6.05001 11.7563Z" />
                      </svg>
                      ログアウト
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="mx-auto w-full max-w-screen-2xl p-4 md:p-6 2xl:p-10">
          {children}
        </main>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/20 xl:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}
    </section>
  );
}