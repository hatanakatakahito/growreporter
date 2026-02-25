import React, { useState, useEffect, useRef } from 'react';
import { SITE_TYPES, SITE_PURPOSES } from '../../../constants/siteOptions';
import { INDUSTRIES } from '../../../constants/industries';
import { storage, functions } from '../../../config/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';
import { Upload, X, Loader2 } from 'lucide-react';
import MultiSelectField from './MultiSelectField';
import { SCREENSHOT_DISPLAY_HEIGHT_PX } from '../../../constants/screenshotDisplay';

const INDUSTRY_OPTIONS = INDUSTRIES.map((s) => ({ value: s, label: s }));

export default function Step1BasicInfo({ siteData, setSiteData, step1LatestRef, mode = 'new' }) {
  const [formData, setFormData] = useState({
    siteName: siteData.siteName || '',
    siteUrl: siteData.siteUrl || '',
    industry: Array.isArray(siteData.industry) ? siteData.industry : (siteData.industry ? [siteData.industry] : []),
    siteType: siteData.siteType || [],
    sitePurpose: siteData.sitePurpose || [],
    metaTitle: siteData.metaTitle || '',
    metaDescription: siteData.metaDescription || '',
  });

  const [errors, setErrors] = useState({});
  const [pcScreenshot, setPcScreenshot] = useState(siteData.pcScreenshotUrl || null);
  const [mobileScreenshot, setMobileScreenshot] = useState(siteData.mobileScreenshotUrl || null);
  const [isManualUploading, setIsManualUploading] = useState(false); // 手動アップロード中
  const [isMetadataFetching, setIsMetadataFetching] = useState(false); // メタ情報取得中
  const [isScreenshotFetching, setIsScreenshotFetching] = useState(false); // スクリーンショット取得中
  const [screenshotProgress, setScreenshotProgress] = useState(''); // スクリーンショット進行状況

  // 編集モードで親が非同期取得した siteData をフォームに反映（サイト管理の編集から遷移時など）
  const lastSyncedSiteUrl = useRef(null);
  useEffect(() => {
    if (mode !== 'edit') return;
    const url = siteData.siteUrl || '';
    if (!url) {
      lastSyncedSiteUrl.current = null;
      return;
    }
    if (lastSyncedSiteUrl.current === url) return;
    lastSyncedSiteUrl.current = url;
    setFormData({
      siteName: siteData.siteName || '',
      siteUrl: siteData.siteUrl || '',
      industry: Array.isArray(siteData.industry) ? siteData.industry : (siteData.industry ? [siteData.industry] : []),
      siteType: Array.isArray(siteData.siteType) ? siteData.siteType : (siteData.siteType ? [siteData.siteType] : []),
      sitePurpose: Array.isArray(siteData.sitePurpose) ? siteData.sitePurpose : (siteData.sitePurpose ? [siteData.sitePurpose] : []),
      metaTitle: siteData.metaTitle || '',
      metaDescription: siteData.metaDescription || '',
    });
    setPcScreenshot(siteData.pcScreenshotUrl || null);
    setMobileScreenshot(siteData.mobileScreenshotUrl || null);
  }, [mode, siteData.siteName, siteData.siteUrl, siteData.industry, siteData.siteType, siteData.sitePurpose, siteData.metaTitle, siteData.metaDescription, siteData.pcScreenshotUrl, siteData.mobileScreenshotUrl]);

  // フォームデータが変更されたら親に通知＋保存時に確実に使うよう ref にも保持
  useEffect(() => {
    const payload = {
      ...formData,
      pcScreenshotUrl: pcScreenshot || null,
      mobileScreenshotUrl: mobileScreenshot || null,
    };
    if (step1LatestRef) step1LatestRef.current = payload;
    setSiteData(prev => ({ ...prev, ...payload }));
  }, [formData, pcScreenshot, mobileScreenshot, setSiteData, step1LatestRef]);

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

  // URL入力時のバリデーション＋自動取得
  const handleUrlBlur = async () => {
    const url = formData.siteUrl?.trim();
    
    if (!url) return;
    
    if (!validateUrl(url)) {
      setErrors(prev => ({
        ...prev,
        siteUrl: '正しいURL形式で入力してください（例: https://example.com）',
      }));
      return;
    }
    
    // URLが有効な場合、メタデータとスクショがまだ無ければ自動取得
    if (!formData.metaTitle && !pcScreenshot) {
      console.log('[Step1] URL入力完了 - メタデータとスクショを自動取得開始');
      try {
        await handleAutoFetchMetadata();
        console.log('[Step1] メタデータ取得完了');
      } catch (error) {
        console.error('[Step1] メタデータ取得失敗:', error);
      }
      
      try {
        await handleAutoFetchScreenshots();
        console.log('[Step1] スクショ取得完了');
      } catch (error) {
        console.error('[Step1] スクショ取得失敗:', error);
      }
    }
  };

  // メタ情報の自動取得
  const handleAutoFetchMetadata = async () => {
    const url = formData.siteUrl?.trim();
    
    if (!url || !validateUrl(url)) {
      alert('正しいURLを入力してください');
      return;
    }
    
    setIsMetadataFetching(true);
    
    // 一時的にローディング表示
    setFormData(prev => ({
      ...prev,
      metaTitle: '取得中...',
      metaDescription: '取得中...',
    }));
    
    try {
      // Firebase Functionsを使用してメタデータを取得
      const fetchMetadata = httpsCallable(functions, 'fetchMetadata');
      const result = await fetchMetadata({ siteUrl: url });
      
      const { metadata } = result.data;
      
      setFormData(prev => ({
        ...prev,
        metaTitle: metadata.title || metadata.ogTitle || '',
        metaDescription: metadata.description || metadata.ogDescription || '',
      }));
      
      if (!metadata.title && !metadata.description) {
        alert('メタ情報が見つかりませんでした。手動で入力してください。');
      }
      
    } catch (error) {
      console.error('Auto fetch metadata error:', error);
      // 失敗したら空欄に戻す（手動入力可能）
      setFormData(prev => ({
        ...prev,
        metaTitle: '',
        metaDescription: '',
      }));
      // 自動取得時はアラートを出さない（ユーザー体験を損なわないため）
      console.warn('[Step1] メタ情報の自動取得に失敗しました。手動で入力してください。');
    } finally {
      setIsMetadataFetching(false);
    }
  };

  // 画像アップロード処理（手動アップロード）
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

    setIsManualUploading(true);

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
      
      console.log(`[handleImageUpload] ${type} screenshot uploaded successfully`);
    } catch (error) {
      console.error('Upload error:', error);
      alert('アップロードに失敗しました: ' + error.message);
    } finally {
      setIsManualUploading(false);
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
    
    setIsScreenshotFetching(true);
    setScreenshotProgress('スクリーンショット取得を開始しています...');
    
    try {
      const captureScreenshot = httpsCallable(functions, 'captureScreenshot');
      
      console.log('[handleAutoFetchScreenshots] Starting screenshot capture...');
      
      // 当初のStep1と同じ: PC版を先に取得
      setScreenshotProgress('PC版のスクリーンショットを取得中... (1/2)');
      console.log('[handleAutoFetchScreenshots] Capturing PC screenshot...');
      const pcResult = await captureScreenshot({ siteUrl: url, deviceType: 'pc' });
      setPcScreenshot(pcResult.data.imageUrl);
      console.log('[handleAutoFetchScreenshots] PC screenshot captured');
      
      // スマホ版を取得
      setScreenshotProgress('スマホ版のスクリーンショットを取得中... (2/2)');
      console.log('[handleAutoFetchScreenshots] Capturing mobile screenshot...');
      const mobileResult = await captureScreenshot({ siteUrl: url, deviceType: 'mobile' });
      setMobileScreenshot(mobileResult.data.imageUrl);
      console.log('[handleAutoFetchScreenshots] Mobile screenshot captured');
      
      setScreenshotProgress('');
      console.log('[handleAutoFetchScreenshots] Screenshots captured successfully');
      
    } catch (error) {
      console.error('Screenshot error:', error);
      setScreenshotProgress('');
      // 自動取得時はアラートを出さない（ユーザー体験を損なわないため）
      console.warn('[Step1] スクリーンショットの自動取得に失敗しました。手動でアップロードしてください。');
    } finally {
      setIsScreenshotFetching(false);
      setScreenshotProgress('');
    }
  };

  return (
    <div className="space-y-6">
      {/* サイト名 */}
      <div>
        <label htmlFor="siteName" className="mb-2.5 flex items-center gap-2 text-sm font-medium text-dark dark:text-white">
          サイト名
          <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="siteName"
          value={formData.siteName}
          onChange={handleChange}
          placeholder="例: GROW REPORTER"
          className="w-full rounded-md border border-stroke bg-white px-5 py-3 text-dark outline-none transition placeholder:text-gray-400 focus:border-primary-mid focus:ring-2 focus:ring-primary-mid/20 dark:border-dark-3 dark:bg-dark dark:text-white dark:focus:border-primary-mid"
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
          <span className="text-red-500">*</span>
        </label>
        <input
          type="url"
          id="siteUrl"
          value={formData.siteUrl}
          onChange={handleChange}
          onBlur={handleUrlBlur}
          placeholder="https://example.com"
          className="w-full rounded-md border border-stroke bg-white px-5 py-3 text-dark outline-none transition placeholder:text-gray-400 focus:border-primary-mid focus:ring-2 focus:ring-primary-mid/20 dark:border-dark-3 dark:bg-dark dark:text-white dark:focus:border-primary-mid"
          required
        />
        {errors.siteUrl && (
          <p className="mt-1 text-sm text-red-500">{errors.siteUrl}</p>
        )}
      </div>

      {/* 業界・業種（複数選択・必須） */}
      <MultiSelectField
        label="業界・業種"
        required
        options={INDUSTRY_OPTIONS}
        value={formData.industry}
        onChange={(next) => {
          setFormData(prev => ({ ...prev, industry: next }));
          if (errors.industry) setErrors(prev => ({ ...prev, industry: '' }));
        }}
        error={errors.industry}
        placeholder="業界・業種を選択"
      />

      {/* サイト種別（複数選択・必須） */}
      <MultiSelectField
        label="サイト種別"
        required
        options={SITE_TYPES}
        value={formData.siteType}
        onChange={(next) => {
          setFormData(prev => ({ ...prev, siteType: next }));
          if (errors.siteType) setErrors(prev => ({ ...prev, siteType: '' }));
        }}
        error={errors.siteType}
        placeholder="サイト種別を選択"
      />

      {/* サイトの目的（複数選択） */}
      <MultiSelectField
        label="サイトの目的"
        required
        options={SITE_PURPOSES}
        value={formData.sitePurpose}
        onChange={(next) => {
          setFormData(prev => ({ ...prev, sitePurpose: next }));
          if (errors.sitePurpose) setErrors(prev => ({ ...prev, sitePurpose: '' }));
        }}
        error={errors.sitePurpose}
        placeholder="サイトの目的を選択"
      />

      {/* サイトタイトル（編集モード時のみ表示） */}
      {mode === 'edit' && (
        <div>
          <div className="mb-2.5 flex items-center justify-between">
            <label htmlFor="metaTitle" className="flex items-center gap-2 text-sm font-medium text-dark dark:text-white">
              サイトタイトル
              <span className="rounded bg-gray-400 px-1.5 py-0.5 text-xs text-white">任意</span>
            </label>
            <button
              type="button"
              onClick={handleAutoFetchMetadata}
              disabled={isMetadataFetching || !formData.siteUrl}
              className="flex items-center gap-1 rounded bg-primary px-4 py-2 text-xs font-medium text-white transition hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isMetadataFetching ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
              {isMetadataFetching ? '取得中...' : '自動取得'}
            </button>
          </div>
          <div className="relative">
            <input
              type="text"
              id="metaTitle"
              value={formData.metaTitle}
              onChange={handleChange}
              disabled={isMetadataFetching}
              placeholder="サイトのタイトルを入力してください"
              className="w-full rounded-md border border-stroke bg-transparent px-5 py-3 text-dark outline-none transition placeholder:text-dark-6 focus:border-primary disabled:cursor-not-allowed disabled:opacity-60 dark:border-dark-3 dark:text-white dark:focus:border-primary"
            />
            {isMetadataFetching && (
              <div className="absolute inset-0 flex items-center justify-center rounded-md bg-primary/10 backdrop-blur-sm dark:bg-primary/20">
                <div className="flex items-center gap-2 text-sm font-medium text-primary">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>メタ情報を取得中...</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* サイト説明文（編集モード時のみ表示） */}
      {mode === 'edit' && (
        <div>
          <label htmlFor="metaDescription" className="mb-2.5 flex items-center gap-2 text-sm font-medium text-dark dark:text-white">
            サイト説明文
            <span className="rounded bg-gray-400 px-1.5 py-0.5 text-xs text-white">任意</span>
          </label>
          <div className="relative">
            <textarea
              id="metaDescription"
              value={formData.metaDescription}
              onChange={handleChange}
              disabled={isMetadataFetching}
              placeholder="サイトの説明文を入力してください"
              rows={3}
              className="w-full rounded-md border border-stroke bg-white px-5 py-3 text-dark outline-none transition placeholder:text-gray-400 focus:border-primary-mid focus:ring-2 focus:ring-primary-mid/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-dark-3 dark:bg-dark dark:text-white dark:focus:border-primary-mid"
            />
            {isMetadataFetching && (
              <div className="absolute inset-0 flex items-center justify-center rounded-md bg-primary/10 backdrop-blur-sm dark:bg-primary/20">
                <div className="flex items-center gap-2 text-sm font-medium text-primary">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>メタ情報を取得中...</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* スクリーンショット（編集モード時のみ表示） */}
      {mode === 'edit' && (
        <div>
        <div className="mb-2.5 flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm font-medium text-dark dark:text-white">
            スクリーンショット
            <span className="rounded bg-gray-400 px-1.5 py-0.5 text-xs text-white">任意</span>
          </label>
          <button
            type="button"
            onClick={handleAutoFetchScreenshots}
            disabled={!formData.siteUrl || isScreenshotFetching}
            className="flex items-center gap-1 rounded bg-primary px-4 py-2 text-xs font-medium text-white transition hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isScreenshotFetching ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
            {isScreenshotFetching ? '取得中...' : '自動取得'}
          </button>
        </div>
        
        {/* 進行状況インジケーター */}
        {screenshotProgress && (
          <div className="mb-4 flex items-center gap-3 rounded-md border-2 border-primary/30 bg-primary/10 px-4 py-3">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <div className="flex-1">
              <p className="text-sm font-medium text-primary">{screenshotProgress}</p>
              <p className="mt-0.5 text-xs font-medium text-primary/70">処理には10-20秒程度かかります</p>
            </div>
          </div>
        )}
        
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
                  style={{ height: `${SCREENSHOT_DISPLAY_HEIGHT_PX}px`, objectFit: 'contain' }}
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
              <label className={`flex w-full flex-col items-center justify-center rounded-md border-2 border-dashed border-stroke bg-gray-1 transition dark:border-dark-3 dark:bg-dark-2 ${isManualUploading ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-gray-2 dark:hover:bg-dark-3'}`} style={{ height: `${SCREENSHOT_DISPLAY_HEIGHT_PX}px` }}>
                {isManualUploading ? (
                  <>
                    <Loader2 className="mb-2 h-8 w-8 animate-spin text-primary" />
                    <span className="text-sm text-primary">アップロード中...</span>
                  </>
                ) : (
                  <>
                    <Upload className="mb-2 h-8 w-8 text-body-color" />
                    <span className="text-sm text-body-color">クリックして画像を選択</span>
                    <span className="mt-1 text-xs text-body-color">PNG, JPG (最大5MB)</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleImageUpload(e.target.files[0], 'pc')}
                  disabled={isManualUploading}
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
                  style={{ height: `${SCREENSHOT_DISPLAY_HEIGHT_PX}px`, objectFit: 'contain' }}
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
              <label className={`flex w-full flex-col items-center justify-center rounded-md border-2 border-dashed border-stroke bg-gray-1 transition dark:border-dark-3 dark:bg-dark-2 ${isManualUploading ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-gray-2 dark:hover:bg-dark-3'}`} style={{ height: `${SCREENSHOT_DISPLAY_HEIGHT_PX}px` }}>
                {isManualUploading ? (
                  <>
                    <Loader2 className="mb-2 h-8 w-8 animate-spin text-primary" />
                    <span className="text-sm text-primary">アップロード中...</span>
                  </>
                ) : (
                  <>
                    <Upload className="mb-2 h-8 w-8 text-body-color" />
                    <span className="text-sm text-body-color">クリックして画像を選択</span>
                    <span className="mt-1 text-xs text-body-color">PNG, JPG (最大5MB)</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleImageUpload(e.target.files[0], 'mobile')}
                  disabled={isManualUploading}
                />
              </label>
            )}
          </div>
        </div>
        </div>
      )}

    </div>
  );
}
