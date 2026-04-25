import React, { useEffect, useRef, useState } from 'react';

/**
 * サイト登録 Step1（基本情報）
 *
 * 新 1 画面縦長レイアウトに合わせて siteName / siteUrl のみを扱う。
 * metaTitle / metaDescription / スクリーンショットはサイト登録後の
 * onScrapingJobCreated / onSiteChanged が自動取得するため、この画面からは削除。
 *
 * 業種・サイト役割・ビジネスモデルもこの画面では入力させない。
 * 登録完了後のスクレイピング処理で AI が 100 ページ分の情報を踏まえて自動判定する。
 */
export default function Step1BasicInfo({ siteData, setSiteData, step1LatestRef, mode = 'new' }) {
  const [formData, setFormData] = useState({
    siteName: siteData.siteName || '',
    siteUrl: siteData.siteUrl || '',
  });
  const [errors, setErrors] = useState({});

  // 編集モードで親が非同期取得した siteData をフォームに反映
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
    });
  }, [mode, siteData.siteName, siteData.siteUrl]);

  // フォームデータが変更されたら親に通知
  useEffect(() => {
    const payload = {
      ...formData,
      taxonomyVersion: 2,
    };
    if (step1LatestRef) step1LatestRef.current = payload;
    setSiteData((prev) => ({ ...prev, ...payload }));
  }, [formData, setSiteData, step1LatestRef]);

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
    if (errors[id]) setErrors((prev) => ({ ...prev, [id]: '' }));
  };

  const validateUrl = (url) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleUrlBlur = () => {
    const url = formData.siteUrl?.trim();
    if (!url) return;
    if (!validateUrl(url)) {
      setErrors((prev) => ({
        ...prev,
        siteUrl: '正しいURL形式で入力してください（例: https://example.com）',
      }));
    }
  };

  return (
    <div className="space-y-6">
      {/* サイト名 */}
      <div>
        <label
          htmlFor="siteName"
          className="mb-2.5 flex items-center gap-2 text-sm font-medium text-dark dark:text-white"
        >
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
        {errors.siteName && <p className="mt-1 text-sm text-red-500">{errors.siteName}</p>}
      </div>

      {/* サイトURL */}
      <div>
        <label
          htmlFor="siteUrl"
          className="mb-2.5 flex items-center gap-2 text-sm font-medium text-dark dark:text-white"
        >
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
        {errors.siteUrl && <p className="mt-1 text-sm text-red-500">{errors.siteUrl}</p>}
      </div>
    </div>
  );
}
