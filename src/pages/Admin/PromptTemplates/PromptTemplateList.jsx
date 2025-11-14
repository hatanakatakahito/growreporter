import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Edit, Copy, Trash2, Power, PowerOff } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../../../config/firebase';
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc, setDoc, Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';

/**
 * プロンプトテンプレート一覧画面
 */
export default function PromptTemplateList() {
  const [filterPageType, setFilterPageType] = useState('all');
  const queryClient = useQueryClient();

  // ページタイプの選択肢
  const pageTypes = [
    { value: 'all', label: '全て' },
    { value: 'dashboard', label: 'ダッシュボード' },
    { value: 'summary', label: '全体サマリー' },
    { value: 'users', label: 'ユーザー属性' },
    { value: 'day', label: '日別分析' },
    { value: 'week', label: '曜日別分析' },
    { value: 'hour', label: '時間帯別分析' },
    { value: 'channels', label: '集客チャネル' },
    { value: 'keywords', label: '流入キーワード' },
    { value: 'referrals', label: '被リンク元' },
    { value: 'pages', label: 'ページ別' },
    { value: 'pageCategories', label: 'ページ分類別' },
    { value: 'landingPages', label: 'ランディングページ' },
    { value: 'fileDownloads', label: 'ファイルダウンロード' },
    { value: 'externalLinks', label: '外部リンククリック' },
    { value: 'conversions', label: 'コンバージョン一覧' },
    { value: 'reverseFlow', label: '逆算フロー' },
    { value: 'pageFlow', label: 'ページフロー' },
  ];

  // Firestoreからプロンプトテンプレート取得
  const { data: templates = [], isLoading, error } = useQuery({
    queryKey: ['promptTemplates', filterPageType],
    queryFn: async () => {
      const templatesRef = collection(db, 'promptTemplates');
      let q;
      
      if (filterPageType === 'all') {
        q = query(templatesRef);
      } else {
        q = query(templatesRef, where('pageType', '==', filterPageType));
      }
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          pageTypeLabel: pageTypes.find(p => p.value === data.pageType)?.label || data.pageType,
          updatedAt: data.updatedAt ? format(data.updatedAt.toDate(), 'yyyy/MM/dd HH:mm') : '-',
        };
      }).sort((a, b) => {
        // アクティブ順、更新日時降順
        if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
        return b.updatedAt.localeCompare(a.updatedAt);
      });
    },
  });

  // アクティブ切替
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ templateId, isActive }) => {
      const templateRef = doc(db, 'promptTemplates', templateId);
      await updateDoc(templateRef, {
        isActive: !isActive,
        updatedAt: Timestamp.now(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['promptTemplates']);
    },
  });

  // 削除
  const deleteMutation = useMutation({
    mutationFn: async (templateId) => {
      const templateRef = doc(db, 'promptTemplates', templateId);
      await deleteDoc(templateRef);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['promptTemplates']);
    },
  });

  // 複製
  const duplicateMutation = useMutation({
    mutationFn: async (template) => {
      const newId = `${template.pageType}_copy_${Date.now()}`;
      const newTemplateRef = doc(db, 'promptTemplates', newId);
      await setDoc(newTemplateRef, {
        ...template,
        id: undefined,
        title: `${template.title} (コピー)`,
        isActive: false,
        isDefault: false,
        usageCount: 0,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        createdBy: 'admin',
      });
      return newId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['promptTemplates']);
      alert('複製しました');
    },
  });

  const handleToggleActive = async (template) => {
    if (window.confirm(`${template.title}を${template.isActive ? '非アクティブ' : 'アクティブ'}にしますか？`)) {
      toggleActiveMutation.mutate({ templateId: template.id, isActive: template.isActive });
    }
  };

  const handleDelete = async (template) => {
    if (template.isDefault) {
      alert('デフォルトテンプレートは削除できません');
      return;
    }
    if (window.confirm(`${template.title}を削除しますか？この操作は取り消せません。`)) {
      deleteMutation.mutate(template.id);
    }
  };

  const handleDuplicate = async (template) => {
    duplicateMutation.mutate(template);
  };

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark dark:text-white">
            プロンプト管理
          </h1>
          <p className="mt-1 text-sm text-body-color">
            AI分析のプロンプトテンプレートを管理します
          </p>
        </div>
        <Link
          to="/admin/prompt-templates/new"
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-opacity-90"
        >
          <Plus className="h-4 w-4" />
          新規作成
        </Link>
      </div>

      {/* フィルター */}
      <div className="rounded-lg border border-stroke bg-white p-4 dark:border-dark-3 dark:bg-dark-2">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-dark dark:text-white">
            ページタイプ:
          </label>
          <select
            value={filterPageType}
            onChange={(e) => setFilterPageType(e.target.value)}
            className="rounded-md border border-stroke bg-transparent px-4 py-2 text-sm text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:text-white"
          >
            {pageTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* テンプレート一覧 */}
      <div className="rounded-lg border border-stroke bg-white dark:border-dark-3 dark:bg-dark-2">
        {isLoading ? (
          <div className="p-12 text-center">
            <p className="text-body-color">読み込み中...</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center">
            <p className="text-red-500">エラー: {error.message}</p>
          </div>
        ) : templates.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-body-color">
              プロンプトテンプレートがありません。
              <br />
              「新規作成」ボタンから最初のテンプレートを作成してください。
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-stroke dark:border-dark-3">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-dark dark:text-white">
                    ページタイプ
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-dark dark:text-white">
                    タイトル
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-dark dark:text-white">
                    バージョン
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-dark dark:text-white">
                    ステータス
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-dark dark:text-white">
                    使用回数
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-dark dark:text-white">
                    最終更新
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-dark dark:text-white">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody>
                {templates.map((template) => (
                  <tr
                    key={template.id}
                    className="border-b border-stroke dark:border-dark-3"
                  >
                    <td className="px-6 py-4 text-sm text-dark dark:text-white">
                      {template.pageTypeLabel}
                    </td>
                    <td className="px-6 py-4 text-sm text-dark dark:text-white">
                      {template.title}
                    </td>
                    <td className="px-6 py-4 text-sm text-body-color">
                      v{template.version}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {template.isActive ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-200">
                          <Power className="h-3 w-3" />
                          アクティブ
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                          <PowerOff className="h-3 w-3" />
                          非アクティブ
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center text-sm text-body-color">
                      {template.usageCount?.toLocaleString() || 0}
                    </td>
                    <td className="px-6 py-4 text-sm text-body-color">
                      {template.updatedAt}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/admin/prompt-templates/${template.id}/edit`}
                          className="rounded p-1.5 text-dark transition hover:bg-gray-2 dark:text-white dark:hover:bg-dark-3"
                          title="編集"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => handleDuplicate(template)}
                          className="rounded p-1.5 text-dark transition hover:bg-gray-2 dark:text-white dark:hover:bg-dark-3"
                          title="複製"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleToggleActive(template)}
                          className="rounded p-1.5 text-dark transition hover:bg-gray-2 dark:text-white dark:hover:bg-dark-3"
                          title={template.isActive ? '非アクティブにする' : 'アクティブにする'}
                        >
                          {template.isActive ? (
                            <PowerOff className="h-4 w-4" />
                          ) : (
                            <Power className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDelete(template)}
                          disabled={template.isDefault}
                          className="rounded p-1.5 text-red-500 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-red-900/20"
                          title={template.isDefault ? 'デフォルトテンプレートは削除できません' : '削除'}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

