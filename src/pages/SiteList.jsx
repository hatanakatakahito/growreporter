import React, { useState, useEffect } from 'react';
import { setPageTitle } from '../utils/pageTitle';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../config/firebase';
import { collection, query, where, getDocs, deleteDoc, doc, orderBy } from 'firebase/firestore';
import MainLayout from '../components/Layout/MainLayout';

export default function SiteList() {
  const [sites, setSites] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // ページタイトルを設定
  useEffect(() => {
    setPageTitle('サイト一覧');
  }, []);

  // サイト一覧を取得
  useEffect(() => {
    const fetchSites = async () => {
      if (!currentUser) return;

      setIsLoading(true);
      try {
        console.log('[SiteList] ユーザーID:', currentUser.uid);
        
        const q = query(
          collection(db, 'sites'),
          where('userId', '==', currentUser.uid)
        );
        
        const querySnapshot = await getDocs(q);
        console.log('[SiteList] 取得したサイト数:', querySnapshot.size);
        
        const sitesData = querySnapshot.docs.map(doc => {
          const data = doc.data();
          console.log('[SiteList] サイトデータ:', doc.id, data);
          return {
            id: doc.id,
            ...data,
          };
        });
        
        // クライアント側でソート（createdAtがない場合に備えて）
        sitesData.sort((a, b) => {
          const aTime = a.createdAt?.toDate?.() || new Date(0);
          const bTime = b.createdAt?.toDate?.() || new Date(0);
          return bTime - aTime;
        });
        
        setSites(sitesData);
      } catch (error) {
        console.error('[SiteList] Error fetching sites:', error);
        alert('サイト一覧の取得に失敗しました: ' + error.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSites();
  }, [currentUser]);

  // サイト削除
  const handleDelete = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'sites', deleteTarget.id));
      setSites(sites.filter(site => site.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (error) {
      console.error('Error deleting site:', error);
      alert('削除に失敗しました: ' + error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  // 日付フォーマット
  const formatDate = (timestamp) => {
    if (!timestamp) return '-';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  if (isLoading) {
    return (
      <MainLayout title="サイト管理" subtitle="分析対象のサイトを登録・管理します">
        <div className="flex min-h-[60vh] items-center justify-center p-6">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            <p className="mt-4 text-body-color">読み込み中...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout
      title="サイト管理"
      subtitle="分析対象のサイトを登録・管理します"
      action={
        <Link
          to="/sites/new"
          className="flex items-center gap-2 rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-white transition hover:bg-opacity-90"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          新規サイト登録
        </Link>
      }
    >
      <div className="p-6">
        {sites.length === 0 ? (
          // サイトが登録されていない場合
          <div className="mx-auto max-w-2xl pt-20">
            <div className="rounded-xl border border-stroke bg-white p-12 text-center shadow-sm dark:border-dark-3 dark:bg-dark-2">
              <h2 className="mb-3 text-2xl font-bold text-dark dark:text-white">
                サイトが登録されていません
              </h2>
              <p className="mb-8 text-body-color">
                分析を始めるには、まずサイトを登録してください。
              </p>
              <Link
                to="/sites/new"
                className="inline-flex items-center gap-2 rounded-md bg-primary px-8 py-3 text-sm font-medium text-white transition hover:bg-opacity-90"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                最初のサイトを登録する
              </Link>
            </div>
          </div>
        ) : (
          // サイト一覧表示
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {sites.map((site) => (
              <div
                key={site.id}
                className="rounded-lg border border-stroke bg-white shadow-sm transition hover:shadow-md dark:border-dark-3 dark:bg-dark-2"
              >
                {/* カードヘッダー */}
                <div className="border-b border-stroke p-4 dark:border-dark-3">
                  <h3 className="mb-1 text-base font-bold text-dark dark:text-white truncate">
                    {site.siteName}
                  </h3>
                  <a
                    href={site.siteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-primary hover:underline truncate"
                  >
                    {site.siteUrl}
                    <svg className="h-3 w-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>

                {/* カードコンテンツ */}
                <div className="p-4 space-y-3">
                  {/* 連携状況 */}
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center gap-2">
                      {site.ga4PropertyId ? (
                        <>
                          <svg className="h-3.5 w-3.5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span className="text-body-color">GA4連携済み</span>
                        </>
                      ) : (
                        <>
                          <svg className="h-3.5 w-3.5 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          <span className="text-body-color">GA4未連携</span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {site.gscSiteUrl ? (
                        <>
                          <svg className="h-3.5 w-3.5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span className="text-body-color">GSC連携済み</span>
                        </>
                      ) : (
                        <>
                          <svg className="h-3.5 w-3.5 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          <span className="text-body-color">GSC未連携</span>
                        </>
                      )}
                    </div>
                    {site.conversionEvents && site.conversionEvents.length > 0 && (
                      <div className="flex items-center gap-2">
                        <svg className="h-3.5 w-3.5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-body-color">
                          CV設定: {site.conversionEvents.length}件
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 登録日 */}
                  <div className="border-t border-stroke pt-3 dark:border-dark-3">
                    <p className="text-xs text-body-color">
                      登録日: {formatDate(site.createdAt)}
                    </p>
                  </div>

                  {/* アクションボタン */}
                  <div className="flex gap-2 border-t border-stroke pt-3 dark:border-dark-3">
                    <Link
                      to={`/sites/${site.id}/edit?step=1`}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-stroke px-3 py-2 text-xs font-medium text-dark transition hover:bg-gray-2 dark:border-dark-3 dark:text-white dark:hover:bg-dark-3"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      編集
                    </Link>
                    <button
                      onClick={() => setDeleteTarget(site)}
                      className="rounded-md border border-red-200 px-3 py-2 text-red-600 transition hover:bg-red-50 dark:border-red-900/30 dark:text-red-400 dark:hover:bg-red-900/20"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 削除確認モーダル */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-dark-2">
            <h3 className="mb-2 text-xl font-bold text-dark dark:text-white">
              サイトを削除しますか？
            </h3>
            <p className="mb-6 text-sm text-body-color">
              「{deleteTarget.siteName}」を削除します。この操作は取り消せません。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="flex-1 rounded-md border border-stroke px-4 py-2.5 text-sm font-medium text-dark transition hover:bg-gray-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-dark-3 dark:text-white dark:hover:bg-dark-3"
              >
                キャンセル
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 rounded-md bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isDeleting ? '削除中...' : '削除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}

