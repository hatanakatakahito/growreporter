import React, { useState, useEffect } from 'react';
import { useSite } from '../contexts/SiteContext';
import Sidebar from '../components/Layout/Sidebar';
import AnalysisHeader from '../components/Analysis/AnalysisHeader';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { Eye, Star, Trash2 } from 'lucide-react';
import { setPageTitle } from '../utils/pageTitle';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { db } from '../config/firebase';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import EvaluationDialog from '../components/Reports/EvaluationDialog';

export default function Reports() {
  const { selectedSite, selectedSiteId } = useSite();
  const [evaluatingItem, setEvaluatingItem] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  // ページタイトルを設定
  useEffect(() => {
    setPageTitle('評価する');
  }, []);

  // 完了済み改善課題データの取得
  const { data: completedImprovements = [], isLoading: improvementsLoading } = useQuery({
    queryKey: ['completed-improvements', selectedSiteId],
    queryFn: async () => {
      if (!selectedSiteId) return [];
      
      const q = query(
        collection(db, 'improvements'),
        where('siteId', '==', selectedSiteId),
        where('status', '==', 'completed')
      );
      
      const querySnapshot = await getDocs(q);
      const improvements = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      
      // 完了日でソート（新しい順）
      return improvements.sort((a, b) => {
        const aDate = a.completedAt ? new Date(a.completedAt) : new Date(0);
        const bDate = b.completedAt ? new Date(b.completedAt) : new Date(0);
        return bDate - aDate;
      });
    },
    enabled: !!selectedSiteId,
  });

  const categoryColors = {
    acquisition: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
    content: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300',
    design: 'bg-pink-100 text-pink-800 dark:bg-pink-900/20 dark:text-pink-300',
    feature: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
    other: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300',
  };

  const categoryLabels = {
    acquisition: '集客',
    content: 'コンテンツ',
    design: 'デザイン',
    feature: '機能',
    other: 'その他',
  };

  const ratingLabels = {
    5: '大変良い',
    4: '良い',
    3: '普通',
    2: 'やや不満',
    1: '改善が必要',
  };

  const ratingColors = {
    5: 'text-green-600',
    4: 'text-blue-600',
    3: 'text-yellow-600',
    2: 'text-orange-600',
    1: 'text-red-600',
  };

  // 削除mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await deleteDoc(doc(db, 'improvements', id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['completed-improvements', selectedSiteId] });
    },
  });

  const handleEvaluate = (item) => {
    setEvaluatingItem(item);
    setIsDialogOpen(true);
  };

  const handleDelete = (id, title) => {
    if (window.confirm(`「${title}」を削除しますか？`)) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <>
      <Sidebar />
      <main className="ml-64 flex-1 bg-gray-50 dark:bg-dark">
        {/* ヘッダー */}
        <AnalysisHeader
          dateRange={null}
          setDateRange={null}
          showDateRange={false}
          showSiteInfo={true}
        />

        {/* コンテンツ */}
        <div className="mx-auto max-w-7xl px-6 py-10">
          <div className="mb-6">
            <h2 className="mb-1 text-2xl font-bold text-dark dark:text-white">
              評価する
            </h2>
            <p className="text-body-color">
              {selectedSite?.siteName} の完了した改善課題の評価と成果を記録
            </p>
          </div>

          {improvementsLoading ? (
            <LoadingSpinner message="評価データを読み込んでいます..." />
          ) : completedImprovements.length === 0 ? (
            <div className="rounded-lg border border-stroke bg-white p-12 text-center dark:border-dark-3 dark:bg-dark-2">
              <p className="text-body-color">
                評価待ちの完了課題はありません
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-stroke bg-white dark:border-dark-3 dark:bg-dark-2">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-stroke dark:border-dark-3">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-dark dark:text-white">
                        タイトル
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-dark dark:text-white">
                        カテゴリー
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-dark dark:text-white">
                        完了日
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-dark dark:text-white">
                        評価
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-dark dark:text-white">
                        期待効果
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-dark dark:text-white">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {completedImprovements.map((item) => (
                      <tr 
                        key={item.id}
                        className="border-b border-stroke last:border-0 dark:border-dark-3"
                      >
                        <td className="px-4 py-3">
                          <span className="font-medium text-dark dark:text-white">
                            {item.title}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${categoryColors[item.category]}`}>
                            {categoryLabels[item.category]}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-body-color">
                            {item.completedAt
                              ? format(new Date(item.completedAt), 'yyyy/MM/dd', { locale: ja })
                              : '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {item.rating ? (
                            <div className="flex items-center gap-2">
                              <div className={`flex ${ratingColors[item.rating]}`}>
                                {[...Array(item.rating)].map((_, i) => (
                                  <Star key={i} className="h-4 w-4 fill-current" />
                                ))}
                              </div>
                              <span className="text-sm text-body-color">
                                {ratingLabels[item.rating]}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-body-color">未評価</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="max-w-xs truncate text-sm text-body-color">
                            {item.expectedImpact || '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleEvaluate(item)}
                              className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-dark hover:bg-gray-2 dark:text-white dark:hover:bg-dark-3"
                            >
                              <Eye className="h-4 w-4" />
                              {item.rating ? '詳細' : '評価'}
                            </button>
                            <button
                              onClick={() => handleDelete(item.id, item.title)}
                              disabled={deleteMutation.isPending}
                              className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-red-900/20"
                            >
                              <Trash2 className="h-4 w-4" />
                              削除
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>

      <EvaluationDialog
        isOpen={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false);
          setEvaluatingItem(null);
        }}
        item={evaluatingItem}
      />
    </>
  );
}

