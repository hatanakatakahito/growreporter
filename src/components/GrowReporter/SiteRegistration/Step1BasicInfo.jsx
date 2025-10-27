import React, { useState, useEffect } from 'react';
import { SITE_TYPES, BUSINESS_TYPES } from '../../../constants/siteOptions';
import { storage, functions } from '../../../config/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';
import { Upload, X } from 'lucide-react';

export default function Step1BasicInfo({ siteData, setSiteData }) {
  const [formData, setFormData] = useState({
    siteName: siteData.siteName || '',
    siteUrl: siteData.siteUrl || '',
    siteType: siteData.siteType || '',
    businessType: siteData.businessType || '',
    metaTitle: siteData.metaTitle || '',
    metaDescription: siteData.metaDescription || '',
  });

  const [errors, setErrors] = useState({});
  const [pcScreenshot, setPcScreenshot] = useState(siteData.pcScreenshotUrl || null);
  const [mobileScreenshot, setMobileScreenshot] = useState(siteData.mobileScreenshotUrl || null);
  const [isUploading, setIsUploading] = useState(false);
  const [isAutoFetching, setIsAutoFetching] = useState(false);

  // フォームデータが変更されたら親コンポーネントに通知
  useEffect(() => {
    setSiteData(prev => ({
      ...prev,
      ...formData,
      pcScreenshotUrl: pcScreenshot,
      mobileScreenshotUrl: mobileScreenshot,
    }));
  }, [formData, pcScreenshot, mobileScreenshot, setSiteData]);

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [id]: value,
    }));
    
    // エラーをクリア
    if (errors[id]) {
      setErrors(prev => ({
        ...prev,
        [id]: '',
      }));
    }
  };

  const validateUrl = (url) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  // URL入力時のバリデーション
  const handleUrlBlur = () => {
    const url = formData.siteUrl?.trim();
    
    if (url && !validateUrl(url)) {
      setErrors(prev => ({
        ...prev,
        siteUrl: '正しいURL形式で入力してください（例: https://example.com）',
      }));
    }
  };

  // メタ情報の自動取得
  const handleAutoFetchMetadata = async () => {
    const url = formData.siteUrl?.trim();
    
    if (!url || !validateUrl(url)) {
      alert('正しいURLを入力してください');
      return;
    }
    
    setIsAutoFetching(true);
    
    // 一時的にローディング表示
    setFormData(prev => ({
      ...prev,
      metaTitle: '取得中...',
      metaDescription: '取得中...',
    }));
    
    try {
      // CORSプロキシ経由でHTML取得
      const response = await fetch(
        `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`
      );
      const data = await response.json();
      const html = data.contents;
      
      // シンプルな正規表現でパース
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
      
      setFormData(prev => ({
        ...prev,
        metaTitle: titleMatch?.[1]?.trim() || '',
        metaDescription: descMatch?.[1]?.trim() || '',
      }));
      
      alert('メタ情報を取得しました');
      
    } catch (error) {
      console.error('Auto fetch metadata error:', error);
      alert('メタ情報の取得に失敗しました。手動で入力してください。');
      // 失敗したら空欄に戻す（手動入力可能）
      setFormData(prev => ({
        ...prev,
        metaTitle: '',
        metaDescription: '',
      }));
    } finally {
      setIsAutoFetching(false);
    }
  };

  // 画像アップロード処理
  const handleImageUpload = async (file, type) => {
    if (!file) return;

    // ファイルサイズチェック (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('ファイルサイズは5MB以下にしてください');
      return;
    }

    // ファイルタイプチェック
    if (!file.type.startsWith('image/')) {
      alert('画像ファイルを選択してください');
      return;
    }

    setIsUploading(true);

    try {
      // 一時的なIDを生成（サイトIDがない場合）
      const tempId = siteData.id || `temp_${Date.now()}`;
      const fileName = `screenshots/${tempId}/${type}_${Date.now()}.${file.name.split('.').pop()}`;
      const storageRef = ref(storage, fileName);

      // Firebase Storageにアップロード
      await uploadBytes(storageRef, file);

      // ダウンロードURLを取得
      const downloadURL = await getDownloadURL(storageRef);

      // 状態を更新
      if (type === 'pc') {
        setPcScreenshot(downloadURL);
      } else {
        setMobileScreenshot(downloadURL);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('アップロードに失敗しました: ' + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  // 画像削除
  const handleImageRemove = (type) => {
    if (type === 'pc') {
      setPcScreenshot(null);
    } else {
      setMobileScreenshot(null);
    }
  };

  // スクリーンショットの自動取得
  const handleAutoFetchScreenshots = async () => {
    const url = formData.siteUrl?.trim();
    
    if (!url || !validateUrl(url)) {
      alert('正しいURLを入力してください');
      return;
    }
    
    setIsUploading(true);
    
    try {
      const captureScreenshot = httpsCallable(functions, 'captureScreenshot');
      
      console.log('[handleAutoFetchScreenshots] Starting screenshot capture...');
      
      // PC版とスマホ版を順次取得（メモリ節約のため並列→順次に変更）
      console.log('[handleAutoFetchScreenshots] Capturing mobile screenshot...');
      const mobileResult = await captureScreenshot({ siteUrl: url, deviceType: 'mobile' });
      setMobileScreenshot(mobileResult.data.imageUrl);
      
      console.log('[handleAutoFetchScreenshots] Capturing PC screenshot...');
      const pcResult = await captureScreenshot({ siteUrl: url, deviceType: 'pc' });
      setPcScreenshot(pcResult.data.imageUrl);
      
      console.log('[handleAutoFetchScreenshots] Screenshots captured successfully');
      
      alert('スクリーンショットを取得しました');
      
    } catch (error) {
      console.error('Screenshot error:', error);
      alert(`スクリーンショットの取得に失敗しました: ${error.message}\n手動でアップロードしてください。`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* サイト名 */}
      <div>
        <label htmlFor="siteName" className="mb-2.5 flex items-center gap-2 text-sm font-medium text-dark dark:text-white">
          サイト名
          <span className="rounded bg-red-500 px-1.5 py-0.5 text-xs text-white">必須</span>
        </label>
        <input
          type="text"
          id="siteName"
          value={formData.siteName}
          onChange={handleChange}
          placeholder="例: GROW REPORTER"
          className="w-full rounded-md border border-stroke bg-transparent px-5 py-3 text-dark outline-none transition placeholder:text-dark-6 focus:border-primary dark:border-dark-3 dark:text-white dark:focus:border-primary"
          required
        />
        {errors.siteName && (
          <p className="mt-1 text-sm text-red-500">{errors.siteName}</p>
        )}
      </div>

      {/* サイトURL */}
      <div>
        <label htmlFor="siteUrl" className="mb-2.5 flex items-center gap-2 text-sm font-medium text-dark dark:text-white">
          サイトURL
          <span className="rounded bg-red-500 px-1.5 py-0.5 text-xs text-white">必須</span>
        </label>
        <input
          type="url"
          id="siteUrl"
          value={formData.siteUrl}
          onChange={handleChange}
          onBlur={handleUrlBlur}
          placeholder="https://example.com"
          className="w-full rounded-md border border-stroke bg-transparent px-5 py-3 text-dark outline-none transition placeholder:text-dark-6 focus:border-primary dark:border-dark-3 dark:text-white dark:focus:border-primary"
          required
        />
        {errors.siteUrl && (
          <p className="mt-1 text-sm text-red-500">{errors.siteUrl}</p>
        )}
      </div>

      {/* サイト種別 */}
      <div>
        <label htmlFor="siteType" className="mb-2.5 flex items-center gap-2 text-sm font-medium text-dark dark:text-white">
          サイト種別
          <span className="rounded bg-red-500 px-1.5 py-0.5 text-xs text-white">必須</span>
        </label>
        <div className="relative">
          <select
            id="siteType"
            value={formData.siteType}
            onChange={handleChange}
            className="w-full appearance-none rounded-md border border-stroke bg-transparent px-5 py-3 text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:text-white dark:focus:border-primary"
            required
          >
            <option value="" disabled>選択してください</option>
            {SITE_TYPES.map((type) => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5 7.5L10 12.5L15 7.5" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
        </div>
      </div>

      {/* ビジネス形態 */}
      <div>
        <label htmlFor="businessType" className="mb-2.5 flex items-center gap-2 text-sm font-medium text-dark dark:text-white">
          ビジネス形態
          <span className="rounded bg-red-500 px-1.5 py-0.5 text-xs text-white">必須</span>
        </label>
        <div className="relative">
          <select
            id="businessType"
            value={formData.businessType}
            onChange={handleChange}
            className="w-full appearance-none rounded-md border border-stroke bg-transparent px-5 py-3 text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:text-white dark:focus:border-primary"
            required
          >
            <option value="" disabled>選択してください</option>
            {BUSINESS_TYPES.map((type) => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5 7.5L10 12.5L15 7.5" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
        </div>
      </div>

      {/* サイトタイトル */}
      <div>
        <div className="mb-2.5 flex items-center justify-between">
          <label htmlFor="metaTitle" className="flex items-center gap-2 text-sm font-medium text-dark dark:text-white">
            サイトタイトル
            <span className="rounded bg-gray-400 px-1.5 py-0.5 text-xs text-white">任意</span>
          </label>
          <button
            type="button"
            onClick={handleAutoFetchMetadata}
            disabled={isAutoFetching || !formData.siteUrl}
            className="flex items-center gap-1 rounded bg-primary px-4 py-2 text-xs font-medium text-white transition hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {isAutoFetching ? '取得中...' : '自動取得'}
          </button>
        </div>
        <input
          type="text"
          id="metaTitle"
          value={formData.metaTitle}
          onChange={handleChange}
          disabled={isAutoFetching}
          placeholder="サイトのタイトルを入力してください"
          className="w-full rounded-md border border-stroke bg-transparent px-5 py-3 text-dark outline-none transition placeholder:text-dark-6 focus:border-primary disabled:cursor-not-allowed disabled:opacity-60 dark:border-dark-3 dark:text-white dark:focus:border-primary"
        />
      </div>

      {/* サイト説明文 */}
      <div>
        <label htmlFor="metaDescription" className="mb-2.5 flex items-center gap-2 text-sm font-medium text-dark dark:text-white">
          サイト説明文
          <span className="rounded bg-gray-400 px-1.5 py-0.5 text-xs text-white">任意</span>
        </label>
        <textarea
          id="metaDescription"
          value={formData.metaDescription}
          onChange={handleChange}
          disabled={isAutoFetching}
          placeholder="サイトの説明文を入力してください"
          rows={3}
          className="w-full rounded-md border border-stroke bg-transparent px-5 py-3 text-dark outline-none transition placeholder:text-dark-6 focus:border-primary disabled:cursor-not-allowed disabled:opacity-60 dark:border-dark-3 dark:text-white dark:focus:border-primary"
        />
      </div>

      {/* スクリーンショット */}
      <div>
        <div className="mb-2.5 flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm font-medium text-dark dark:text-white">
            スクリーンショット
            <span className="rounded bg-gray-400 px-1.5 py-0.5 text-xs text-white">任意</span>
          </label>
          <button
            type="button"
            onClick={handleAutoFetchScreenshots}
            disabled={!formData.siteUrl || isUploading}
            className="flex items-center gap-1 rounded bg-primary px-4 py-2 text-xs font-medium text-white transition hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {isUploading ? '取得中...' : '自動取得'}
          </button>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          {/* PCスクリーンショット */}
          <div>
            <p className="mb-2 text-xs font-medium text-body-color">PC</p>
            {pcScreenshot ? (
              <div className="relative">
                <img
                  src={pcScreenshot}
                  alt="PCスクリーンショット"
                  className="w-full rounded-md border border-stroke object-contain dark:border-dark-3"
                  style={{ height: '250px', objectFit: 'contain' }}
                />
                <button
                  type="button"
                  onClick={() => handleImageRemove('pc')}
                  className="absolute right-2 top-2 rounded-full bg-red-500 p-1 text-white hover:bg-red-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <label className="flex w-full cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-stroke bg-gray-1 transition hover:bg-gray-2 dark:border-dark-3 dark:bg-dark-2 dark:hover:bg-dark-3" style={{ height: '250px' }}>
                <Upload className="mb-2 h-8 w-8 text-body-color" />
                <span className="text-sm text-body-color">
                  {isUploading ? 'アップロード中...' : 'クリックして画像を選択'}
                </span>
                <span className="mt-1 text-xs text-body-color">PNG, JPG (最大5MB)</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleImageUpload(e.target.files[0], 'pc')}
                  disabled={isUploading}
                />
              </label>
            )}
          </div>

          {/* スマホスクリーンショット */}
          <div>
            <p className="mb-2 text-xs font-medium text-body-color">スマホ</p>
            {mobileScreenshot ? (
              <div className="relative">
                <img
                  src={mobileScreenshot}
                  alt="スマホスクリーンショット"
                  className="w-full rounded-md border border-stroke object-contain dark:border-dark-3"
                  style={{ height: '250px', objectFit: 'contain' }}
                />
                <button
                  type="button"
                  onClick={() => handleImageRemove('mobile')}
                  className="absolute right-2 top-2 rounded-full bg-red-500 p-1 text-white hover:bg-red-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <label className="flex w-full cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-stroke bg-gray-1 transition hover:bg-gray-2 dark:border-dark-3 dark:bg-dark-2 dark:hover:bg-dark-3" style={{ height: '250px' }}>
                <Upload className="mb-2 h-8 w-8 text-body-color" />
                <span className="text-sm text-body-color">
                  {isUploading ? 'アップロード中...' : 'クリックして画像を選択'}
                </span>
                <span className="mt-1 text-xs text-body-color">PNG, JPG (最大5MB)</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleImageUpload(e.target.files[0], 'mobile')}
                  disabled={isUploading}
                />
              </label>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
