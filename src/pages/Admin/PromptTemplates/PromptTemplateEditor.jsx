import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Eye, RotateCcw } from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { db } from '../../../config/firebase';
import { doc, getDoc, setDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../../config/firebase';
import PromptPreviewModal from '../../../components/Admin/PromptTemplates/PromptPreviewModal';

/**
 * プロンプトテンプレート編集画面
 */
export default function PromptTemplateEditor() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isNew = !id;

  const [formData, setFormData] = useState({
    pageType: 'dashboard',
    title: '',
    description: '',
    template: '',
    version: '1.0',
    isActive: true,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  // ページタイプの選択肢
  const pageTypes = [
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
  ];

  // Firestoreからデータ取得（編集時）
  const { data: template, isLoading } = useQuery({
    queryKey: ['promptTemplate', id],
    queryFn: async () => {
      if (!id) return null;
      const templateRef = doc(db, 'promptTemplates', id);
      const templateDoc = await getDoc(templateRef);
      if (!templateDoc.exists()) {
        throw new Error('テンプレートが見つかりません');
      }
      return { id: templateDoc.id, ...templateDoc.data() };
    },
    enabled: !isNew && !!id,
  });

  // データ読み込み後にフォームにセット
  useEffect(() => {
    if (template) {
      setFormData({
        pageType: template.pageType || 'dashboard',
        title: template.title || '',
        description: template.description || '',
        template: template.template || '',
        version: template.version || '1.0',
        isActive: template.isActive !== undefined ? template.isActive : true,
      });
    }
  }, [template]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSave = async () => {
    // バリデーション
    if (!formData.title.trim()) {
      alert('タイトルを入力してください');
      return;
    }
    if (!formData.template.trim()) {
      alert('プロンプトテンプレートを入力してください');
      return;
    }

    setIsSaving(true);
    try {
      const now = Timestamp.now();

      console.log('[PromptEditor] Saving...', { isNew, id, formData });

      if (isNew) {
        // 新規作成
        const newId = `${formData.pageType}_custom_${Date.now()}`;
        const newTemplateRef = doc(db, 'promptTemplates', newId);
        const dataToSave = {
          ...formData,
          isDefault: false,
          usageCount: 0,
          createdAt: now,
          updatedAt: now,
          createdBy: 'admin',
          availableVariableSets: [],
        };
        console.log('[PromptEditor] Creating new template:', newId, dataToSave);
        await setDoc(newTemplateRef, dataToSave);
        console.log('[PromptEditor] Save successful');
        alert('保存しました');
        navigate('/admin/prompt-templates');
      } else {
        // 更新
        const templateRef = doc(db, 'promptTemplates', id);
        const dataToUpdate = {
          pageType: formData.pageType,
          title: formData.title,
          description: formData.description,
          template: formData.template,
          version: formData.version,
          isActive: formData.isActive,
          updatedAt: now,
          updatedBy: 'admin',
        };
        console.log('[PromptEditor] Updating template:', id, dataToUpdate);
        await updateDoc(templateRef, dataToUpdate);
        console.log('[PromptEditor] Update successful');
        alert('更新しました');
        // 一覧に戻らずに現在のページをリロードして最新データを表示
        window.location.reload();
      }
    } catch (error) {
      console.error('[PromptEditor] Save error:', error);
      alert(`保存に失敗しました: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePreview = () => {
    setIsPreviewOpen(true);
  };

  const handleRestoreDefault = async () => {
    if (!confirm('このプロンプトをデフォルトに戻しますか？\n\n現在の内容は失われますが、保存前であればブラウザの再読み込みで元に戻せます。')) {
      return;
    }

    setIsRestoring(true);
    try {
      const getDefaultPrompt = httpsCallable(functions, 'getDefaultPrompt');
      const result = await getDefaultPrompt({ pageType: formData.pageType });
      
      if (result.data && result.data.template) {
        setFormData({
          ...formData,
          template: result.data.template,
          title: result.data.title,
          description: result.data.description,
        });
        alert('デフォルトプロンプトを読み込みました。\n\n保存ボタンをクリックして反映してください。');
      } else {
        throw new Error('デフォルトプロンプトが見つかりませんでした');
      }
    } catch (error) {
      console.error('[PromptEditor] Restore default error:', error);
      alert(`デフォルトプロンプトの取得に失敗しました: ${error.message}`);
    } finally {
      setIsRestoring(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-body-color">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/admin/prompt-templates')}
            className="rounded-lg p-2 text-dark transition hover:bg-gray-2 dark:text-white dark:hover:bg-dark-3"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-dark dark:text-white">
              {isNew ? '新規プロンプト作成' : 'プロンプト編集'}
            </h1>
            <p className="mt-1 text-sm text-body-color">
              AI分析のプロンプトテンプレートを{isNew ? '作成' : '編集'}します
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePreview}
            className="flex items-center gap-2 rounded-lg border border-stroke px-4 py-2 text-sm font-medium text-dark transition hover:bg-gray-2 dark:border-dark-3 dark:text-white dark:hover:bg-dark-3"
          >
            <Eye className="h-4 w-4" />
            プレビュー
          </button>
          {!isNew && (
            <button
              onClick={handleRestoreDefault}
              disabled={isRestoring}
              className="flex items-center gap-2 rounded-lg border border-orange-500 px-4 py-2 text-sm font-medium text-orange-500 transition hover:bg-orange-50 dark:hover:bg-orange-900/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RotateCcw className="h-4 w-4" />
              {isRestoring ? '取得中...' : 'デフォルトに戻す'}
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving || isLoading}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {isSaving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>

      {/* フォーム */}
      <div className="space-y-6 rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
        {/* ページタイプ */}
        <div>
          <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
            ページタイプ <span className="text-red-500">*</span>
          </label>
          <select
            name="pageType"
            value={formData.pageType}
            onChange={handleChange}
            className="w-full rounded-md border border-stroke bg-transparent px-4 py-3 text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:text-white"
          >
            {pageTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* タイトル */}
        <div>
          <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
            タイトル <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="例: ダッシュボード - デフォルト"
            className="w-full rounded-md border border-stroke bg-transparent px-4 py-3 text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:text-white"
          />
        </div>

        {/* 説明 */}
        <div>
          <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
            説明
          </label>
          <input
            type="text"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="例: 優秀なWebアクセス解析士、4軸構成"
            className="w-full rounded-md border border-stroke bg-transparent px-4 py-3 text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:text-white"
          />
        </div>

        {/* バージョン */}
        <div>
          <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
            バージョン
          </label>
          <input
            type="text"
            name="version"
            value={formData.version}
            onChange={handleChange}
            placeholder="例: 1.0"
            className="w-full rounded-md border border-stroke bg-transparent px-4 py-3 text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:text-white"
          />
        </div>

        {/* プロンプトテンプレート */}
        <div>
          <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
            プロンプトテンプレート <span className="text-red-500">*</span>
          </label>
          <textarea
            name="template"
            value={formData.template}
            onChange={handleChange}
            rows="20"
            placeholder="プロンプトテンプレートを入力してください..."
            className="w-full rounded-md border border-stroke bg-transparent px-4 py-3 font-mono text-sm text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:text-white"
          />
          <p className="mt-2 text-sm text-body-color">
            変数: ${'{metrics.users}'}, ${'{period}'}, ${'{site.siteName}'} など
          </p>
        </div>

        {/* アクティブフラグ */}
        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="isActive"
              checked={formData.isActive}
              onChange={handleChange}
              className="h-4 w-4 rounded border-stroke text-primary focus:ring-2 focus:ring-primary dark:border-dark-3"
            />
            <span className="text-sm font-medium text-dark dark:text-white">
              このプロンプトをアクティブにする
            </span>
          </label>
          <p className="mt-1 text-sm text-body-color">
            アクティブなプロンプトがAI分析で使用されます
          </p>
        </div>
      </div>

      {/* プレビューモーダル */}
      <PromptPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        template={formData.template}
        pageType={formData.pageType}
      />
    </div>
  );
}

