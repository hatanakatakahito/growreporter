import React, { useState, useEffect } from 'react';
import { SITE_TYPES, BUSINESS_TYPES } from '../../../constants/siteOptions';

export default function Step1BasicInfo({ siteData, setSiteData }) {
  const [formData, setFormData] = useState({
    siteName: siteData.siteName || '',
    siteUrl: siteData.siteUrl || '',
    siteType: siteData.siteType || '',
    businessType: siteData.businessType || '',
  });

  const [errors, setErrors] = useState({});

  // フォームデータが変更されたら親コンポーネントに通知
  useEffect(() => {
    setSiteData(prev => ({
      ...prev,
      ...formData,
    }));
  }, [formData, setSiteData]);

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
    if (formData.siteUrl && !validateUrl(formData.siteUrl)) {
      setErrors(prev => ({
        ...prev,
        siteUrl: '正しいURL形式で入力してください（例: https://example.com）',
      }));
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

    </div>
  );
}
