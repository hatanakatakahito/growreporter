import React, { useState, useEffect, useRef } from 'react';
import { BUSINESS_MODELS } from '../../../constants/businessModels';
import { SITE_ROLES } from '../../../constants/siteRoles';
import { INDUSTRY_MINOR_BY_MAJOR } from '../../../constants/industriesV2';
import {
  inferSiteRole,
  inferIndustry,
  inferBusinessModel,
} from '../../../constants/taxonomyMigration';
import { storage, functions } from '../../../config/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';
import toast from 'react-hot-toast';
import { Upload, X, Sparkles, Wand2 } from 'lucide-react';
import DotWaveSpinner from '../../common/DotWaveSpinner';
import SingleSelectField from './SingleSelectField';
import IndustryPickerV2 from './IndustryPickerV2';
import { useInferSiteTaxonomy } from '../../../hooks/useInferSiteTaxonomy';
import { SCREENSHOT_DISPLAY_HEIGHT_PX } from '../../../constants/screenshotDisplay';

// legacy サイト(taxonomyVersion !== 2)から V2 4軸を推定するヘルパー
function inferV2FromLegacy(data) {
  if (!data) return null;
  const legacySiteType = Array.isArray(data.siteType)
    ? data.siteType
    : data.siteType
      ? [data.siteType]
      : [];
  const legacySitePurpose = Array.isArray(data.sitePurpose)
    ? data.sitePurpose
    : data.sitePurpose
      ? [data.sitePurpose]
      : [];
  const legacyIndustry = Array.isArray(data.industry)
    ? data.industry
    : data.industry
      ? [data.industry]
      : [];

  const { role } = inferSiteRole(legacySiteType, legacySitePurpose);
  const { major, minor } = inferIndustry(legacyIndustry);
  const { model } = inferBusinessModel(data.businessType, role);

  return {
    businessModel: model || '',
    industryMajor: major || '',
    industryMinor: minor || '',
    siteRole: role || '',
    inferred: true,
  };
}

export default function Step1BasicInfo({ siteData, setSiteData, step1LatestRef, mode = 'new' }) {
  const isV2 = Number(siteData.taxonomyVersion) === 2;
  const legacyInferred = !isV2 && mode === 'edit' ? inferV2FromLegacy(siteData) : null;

  const [formData, setFormData] = useState({
    siteName: siteData.siteName || '',
    siteUrl: siteData.siteUrl || '',
    businessModel: siteData.businessModel || legacyInferred?.businessModel || '',
    industryMajor: siteData.industryMajor || legacyInferred?.industryMajor || '',
    industryMinor: siteData.industryMinor || legacyInferred?.industryMinor || '',
    siteRole: siteData.siteRole || legacyInferred?.siteRole || '',
    metaTitle: siteData.metaTitle || '',
    metaDescription: siteData.metaDescription || '',
  });

  // legacy から推定した値を表示するためのフラグ（ユーザー確認を促すヒント）
  const [inferredFields, setInferredFields] = useState(
    legacyInferred
      ? {
          businessModel: !!legacyInferred.businessModel,
          industryMajor: !!legacyInferred.industryMajor,
          industryMinor: !!legacyInferred.industryMinor,
          siteRole: !!legacyInferred.siteRole,
        }
      : {}
  );

  const [errors, setErrors] = useState({});
  const [pcScreenshot, setPcScreenshot] = useState(siteData.pcScreenshotUrl || null);
  const [mobileScreenshot, setMobileScreenshot] = useState(siteData.mobileScreenshotUrl || null);
  const [isManualUploading, setIsManualUploading] = useState(false);
  const [isMetadataFetching, setIsMetadataFetching] = useState(false);
  const [isScreenshotFetching, setIsScreenshotFetching] = useState(false);
  const [screenshotProgress, setScreenshotProgress] = useState('');

  // タクソノミー V2 の URL 自動判定
  const { mutateAsync: inferTaxonomy, isPending: isInferringTaxonomy } = useInferSiteTaxonomy();

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

    const incomingIsV2 = Number(siteData.taxonomyVersion) === 2;
    const incomingLegacy = !incomingIsV2 ? inferV2FromLegacy(siteData) : null;

    setFormData({
      siteName: siteData.siteName || '',
      siteUrl: siteData.siteUrl || '',
      businessModel: siteData.businessModel || incomingLegacy?.businessModel || '',
      industryMajor: siteData.industryMajor || incomingLegacy?.industryMajor || '',
      industryMinor: siteData.industryMinor || incomingLegacy?.industryMinor || '',
      siteRole: siteData.siteRole || incomingLegacy?.siteRole || '',
      metaTitle: siteData.metaTitle || '',
      metaDescription: siteData.metaDescription || '',
    });
    setInferredFields(
      incomingLegacy
        ? {
            businessModel: !siteData.businessModel && !!incomingLegacy.businessModel,
            industryMajor: !siteData.industryMajor && !!incomingLegacy.industryMajor,
            industryMinor: !siteData.industryMinor && !!incomingLegacy.industryMinor,
            siteRole: !siteData.siteRole && !!incomingLegacy.siteRole,
          }
        : {}
    );
    setPcScreenshot(siteData.pcScreenshotUrl || null);
    setMobileScreenshot(siteData.mobileScreenshotUrl || null);
  }, [
    mode,
    siteData.siteName,
    siteData.siteUrl,
    siteData.businessModel,
    siteData.industryMajor,
    siteData.industryMinor,
    siteData.siteRole,
    siteData.taxonomyVersion,
    siteData.metaTitle,
    siteData.metaDescription,
    siteData.pcScreenshotUrl,
    siteData.mobileScreenshotUrl,
  ]);

  // フォームデータが変更されたら親に通知
  useEffect(() => {
    const payload = {
      ...formData,
      // 新規サイト登録/編集時は必ず V2 スキーマで保存
      taxonomyVersion: 2,
      // legacy 推定値を含むかどうか（親の saveSiteData でログに使う可能性がある）
      pcScreenshotUrl: pcScreenshot || null,
      mobileScreenshotUrl: mobileScreenshot || null,
    };
    if (step1LatestRef) step1LatestRef.current = payload;
    setSiteData((prev) => ({ ...prev, ...payload }));
  }, [formData, pcScreenshot, mobileScreenshot, setSiteData, step1LatestRef]);

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
    if (errors[id]) setErrors((prev) => ({ ...prev, [id]: '' }));
  };

  const setField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
    // ユーザーが確定操作したフィールドは「推定」バッジを消す
    if (inferredFields[field]) {
      setInferredFields((prev) => ({ ...prev, [field]: false }));
    }
  };

  const handleIndustryChange = ({ major, minor }) => {
    setFormData((prev) => ({
      ...prev,
      industryMajor: major,
      industryMinor: minor,
    }));
    if (errors.industryMajor || errors.industryMinor) {
      setErrors((prev) => ({ ...prev, industryMajor: '', industryMinor: '' }));
    }
    setInferredFields((prev) => ({
      ...prev,
      industryMajor: false,
      industryMinor: false,
    }));
  };

  const validateUrl = (url) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleUrlBlur = async () => {
    const url = formData.siteUrl?.trim();
    if (!url) return;

    if (!validateUrl(url)) {
      setErrors((prev) => ({
        ...prev,
        siteUrl: '正しいURL形式で入力してください（例: https://example.com）',
      }));
      return;
    }

    // URLが有効な場合、メタデータとスクショがまだ無ければ自動取得
    if (!formData.metaTitle && !pcScreenshot) {
      try {
        await handleAutoFetchMetadata();
      } catch (error) {
        console.error('[Step1] メタデータ取得失敗:', error);
      }
      try {
        await handleAutoFetchScreenshots();
      } catch (error) {
        console.error('[Step1] スクショ取得失敗:', error);
      }
    }
  };

  const handleAutoFetchMetadata = async () => {
    const url = formData.siteUrl?.trim();
    if (!url || !validateUrl(url)) {
      alert('正しいURLを入力してください');
      return;
    }
    setIsMetadataFetching(true);
    setFormData((prev) => ({ ...prev, metaTitle: '取得中...', metaDescription: '取得中...' }));

    try {
      const fetchMetadata = httpsCallable(functions, 'fetchMetadata');
      const result = await fetchMetadata({ siteUrl: url });
      const { metadata } = result.data;
      setFormData((prev) => ({
        ...prev,
        metaTitle: metadata.title || metadata.ogTitle || '',
        metaDescription: metadata.description || metadata.ogDescription || '',
      }));
      if (!metadata.title && !metadata.description) {
        alert('メタ情報が見つかりませんでした。手動で入力してください。');
      }
    } catch (error) {
      console.error('Auto fetch metadata error:', error);
      setFormData((prev) => ({ ...prev, metaTitle: '', metaDescription: '' }));
      console.warn('[Step1] メタ情報の自動取得に失敗しました。手動で入力してください。');
    } finally {
      setIsMetadataFetching(false);
    }
  };

  const handleImageUpload = async (file, type) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('ファイルサイズは5MB以下にしてください');
      return;
    }
    if (!file.type.startsWith('image/')) {
      alert('画像ファイルを選択してください');
      return;
    }
    setIsManualUploading(true);
    try {
      const tempId = siteData.id || `temp_${Date.now()}`;
      const fileName = `screenshots/${tempId}/${type}_${Date.now()}.${file.name.split('.').pop()}`;
      const storageRef = ref(storage, fileName);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      if (type === 'pc') setPcScreenshot(downloadURL);
      else setMobileScreenshot(downloadURL);
    } catch (error) {
      console.error('Upload error:', error);
      alert('アップロードに失敗しました: ' + error.message);
    } finally {
      setIsManualUploading(false);
    }
  };

  const handleImageRemove = (type) => {
    if (type === 'pc') setPcScreenshot(null);
    else setMobileScreenshot(null);
  };

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
      setScreenshotProgress('PC版のスクリーンショットを取得中... (1/2)');
      const pcResult = await captureScreenshot({ siteUrl: url, deviceType: 'pc' });
      setPcScreenshot(pcResult.data.imageUrl);
      setScreenshotProgress('スマホ版のスクリーンショットを取得中... (2/2)');
      const mobileResult = await captureScreenshot({ siteUrl: url, deviceType: 'mobile' });
      setMobileScreenshot(mobileResult.data.imageUrl);
      setScreenshotProgress('');
    } catch (error) {
      console.error('Screenshot error:', error);
      setScreenshotProgress('');
      console.warn('[Step1] スクリーンショットの自動取得に失敗しました。手動でアップロードしてください。');
    } finally {
      setIsScreenshotFetching(false);
      setScreenshotProgress('');
    }
  };

  // 推定値だった場合のヒント
  const legacyHint = '旧データから推定しました。必要に応じて修正してください。';
  const aiHint = 'AIがURLから推定しました。必要に応じて修正してください。';

  // URL からタクソノミー V2 を AI 推定して 4 フィールドをプレフィル
  const handleInferTaxonomy = async () => {
    const url = formData.siteUrl?.trim();
    if (!url) {
      toast.error('先にサイトURLを入力してください');
      return;
    }
    if (!validateUrl(url)) {
      setErrors((prev) => ({
        ...prev,
        siteUrl: '正しいURL形式で入力してください',
      }));
      return;
    }
    try {
      const result = await inferTaxonomy({
        siteUrl: url,
        siteName: formData.siteName || '',
        siteId: siteData.id || '',
      });
      setFormData((prev) => ({
        ...prev,
        businessModel: result.businessModel || prev.businessModel,
        industryMajor: result.industryMajor || prev.industryMajor,
        industryMinor: result.industryMinor || prev.industryMinor,
        siteRole: result.siteRole || prev.siteRole,
      }));
      setInferredFields({
        businessModel: !!result.businessModel,
        industryMajor: !!result.industryMajor,
        industryMinor: !!result.industryMinor,
        siteRole: !!result.siteRole,
        _byAI: true,
      });
      if (result.confidence === 'low') {
        toast.success('AIで推定しました（信頼度: 低め。内容をご確認ください）', { duration: 5000 });
      } else {
        toast.success(`AIで自動判定しました（信頼度: ${result.confidence === 'high' ? '高' : '中'}）`);
      }
    } catch (error) {
      console.error('[Step1] タクソノミー自動判定エラー:', error);
      const msg = error?.message || '自動判定に失敗しました。手入力で設定してください。';
      toast.error(msg, { duration: 6000 });
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

      {/* AI 自動判定ボタン（タクソノミー V2） */}
      <div className="flex items-center justify-between rounded-lg border border-dashed border-primary/40 bg-gradient-to-r from-primary-blue/5 to-primary-purple/5 px-4 py-3 dark:border-primary/30">
        <div>
          <p className="text-sm font-medium text-dark dark:text-white">
            URLから業種・サイト役割を自動判定
          </p>
          <p className="mt-0.5 text-xs text-body-color dark:text-dark-6">
            サイトURLをもとに、AIが以下の4項目を推定します。推定後も自由に修正可能です。
          </p>
        </div>
        <button
          type="button"
          onClick={handleInferTaxonomy}
          disabled={isInferringTaxonomy || !formData.siteUrl}
          className="flex items-center gap-1.5 whitespace-nowrap rounded-md bg-gradient-primary px-4 py-2 text-xs font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isInferringTaxonomy ? (
            <>
              <DotWaveSpinner size="xs" variant="white" />
              判定中...
            </>
          ) : (
            <>
              <Wand2 className="h-3.5 w-3.5" />
              AIで自動判定
            </>
          )}
        </button>
      </div>

      {/* ビジネスモデル */}
      <SingleSelectField
        label="ビジネスモデル"
        required
        options={BUSINESS_MODELS}
        value={formData.businessModel}
        onChange={(v) => setField('businessModel', v)}
        error={errors.businessModel}
        placeholder="ビジネスモデルを選択"
        hint={
          inferredFields.businessModel
            ? inferredFields._byAI
              ? aiHint
              : legacyHint
            : undefined
        }
      />

      {/* 業種（大分類・小分類） */}
      <IndustryPickerV2
        industryMajor={formData.industryMajor}
        industryMinor={formData.industryMinor}
        onChange={handleIndustryChange}
        errors={{ major: errors.industryMajor, minor: errors.industryMinor }}
        hints={{
          major: inferredFields.industryMajor
            ? inferredFields._byAI
              ? aiHint
              : legacyHint
            : undefined,
          minor: inferredFields.industryMinor
            ? inferredFields._byAI
              ? aiHint
              : legacyHint
            : undefined,
        }}
      />

      {/* サイト役割 */}
      <SingleSelectField
        label="サイト役割"
        required
        options={SITE_ROLES}
        value={formData.siteRole}
        onChange={(v) => setField('siteRole', v)}
        error={errors.siteRole}
        placeholder="サイト役割を選択"
        hint={
          inferredFields.siteRole ? (inferredFields._byAI ? aiHint : legacyHint) : undefined
        }
      />

      {/* サイトタイトル（編集モード時のみ） */}
      {mode === 'edit' && (
        <div>
          <div className="mb-2.5 flex items-center justify-between">
            <label
              htmlFor="metaTitle"
              className="flex items-center gap-2 text-sm font-medium text-dark dark:text-white"
            >
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
                <DotWaveSpinner size="xs" variant="white" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
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
                  <DotWaveSpinner size="xs" />
                  <span>メタ情報を取得中...</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* サイト説明文（編集モード時のみ） */}
      {mode === 'edit' && (
        <div>
          <label
            htmlFor="metaDescription"
            className="mb-2.5 flex items-center gap-2 text-sm font-medium text-dark dark:text-white"
          >
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
                  <DotWaveSpinner size="xs" />
                  <span>メタ情報を取得中...</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* スクリーンショット（編集モード時のみ） */}
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
              className="flex items-center gap-1 rounded bg-primary px-4 py-2 text-xs font-medium text-white transition hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isScreenshotFetching ? (
                <DotWaveSpinner size="xs" variant="white" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              {isScreenshotFetching ? '取得中...' : '自動取得'}
            </button>
          </div>

          {screenshotProgress && (
            <div className="mb-4 flex items-center gap-3 rounded-md border-2 border-primary/30 bg-primary/10 px-4 py-3">
              <DotWaveSpinner size="sm" />
              <div className="flex-1">
                <p className="text-sm font-medium text-primary">{screenshotProgress}</p>
                <p className="mt-0.5 text-xs font-medium text-primary/70">
                  処理には10-20秒程度かかります
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {/* PC */}
            <div>
              <p className="mb-2 text-xs font-medium text-body-color">PC</p>
              {pcScreenshot ? (
                <div className="relative">
                  <img
                    src={pcScreenshot}
                    alt="PCスクリーンショット"
                    className="w-full rounded-md border border-stroke object-contain dark:border-dark-3"
                    style={{
                      height: `${SCREENSHOT_DISPLAY_HEIGHT_PX}px`,
                      objectFit: 'contain',
                    }}
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
                <label
                  className={`flex w-full flex-col items-center justify-center rounded-md border-2 border-dashed border-stroke bg-gray-1 transition dark:border-dark-3 dark:bg-dark-2 ${
                    isManualUploading
                      ? 'cursor-not-allowed opacity-60'
                      : 'cursor-pointer hover:bg-gray-2 dark:hover:bg-dark-3'
                  }`}
                  style={{ height: `${SCREENSHOT_DISPLAY_HEIGHT_PX}px` }}
                >
                  {isManualUploading ? (
                    <>
                      <div className="mb-2">
                        <DotWaveSpinner size="md" />
                      </div>
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

            {/* スマホ */}
            <div>
              <p className="mb-2 text-xs font-medium text-body-color">スマホ</p>
              {mobileScreenshot ? (
                <div className="relative">
                  <img
                    src={mobileScreenshot}
                    alt="スマホスクリーンショット"
                    className="w-full rounded-md border border-stroke object-contain dark:border-dark-3"
                    style={{
                      height: `${SCREENSHOT_DISPLAY_HEIGHT_PX}px`,
                      objectFit: 'contain',
                    }}
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
                <label
                  className={`flex w-full flex-col items-center justify-center rounded-md border-2 border-dashed border-stroke bg-gray-1 transition dark:border-dark-3 dark:bg-dark-2 ${
                    isManualUploading
                      ? 'cursor-not-allowed opacity-60'
                      : 'cursor-pointer hover:bg-gray-2 dark:hover:bg-dark-3'
                  }`}
                  style={{ height: `${SCREENSHOT_DISPLAY_HEIGHT_PX}px` }}
                >
                  {isManualUploading ? (
                    <>
                      <div className="mb-2">
                        <DotWaveSpinner size="md" />
                      </div>
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
