import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import logoImg from '../../assets/img/logo.svg';
import { httpsCallable } from 'firebase/functions';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { functions, db } from '../../config/firebase';
import BusinessPlanFormFields, { BUSINESS_FORM_INITIAL } from '../common/BusinessPlanFormFields';

function getInitials(displayName, email) {
  if (displayName && displayName.trim()) {
    const parts = displayName.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase().slice(0, 2);
    return displayName.trim().slice(0, 2).toUpperCase();
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return '?';
}

export default function CompleteProfile() {
  const [formData, setFormData] = useState({ company: '', lastName: '', firstName: '', phoneNumber: '' });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoLoadError, setPhotoLoadError] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('free');
  const [businessForm, setBusinessForm] = useState(BUSINESS_FORM_INITIAL);

  const { currentUser, userProfile, updateUserProfile } = useAuth();
  const navigate = useNavigate();

  const photoURL = currentUser?.photoURL || userProfile?.photoURL || '';
  const showPhoto = photoURL && !photoLoadError;

  // sessionStorageからビジネスプラン選択を復元
  useEffect(() => {
    const savedPlan = sessionStorage.getItem('selectedPlan');
    if (savedPlan === 'business') {
      setSelectedPlan('business');
      const savedForm = sessionStorage.getItem('pendingBusinessPlan');
      if (savedForm) {
        try { setBusinessForm(JSON.parse(savedForm)); } catch { /* ignore */ }
      }
    }
  }, []);

  useEffect(() => {
    if (userProfile?.company && userProfile?.phoneNumber) {
      navigate('/sites/new');
    }
    // displayNameを姓・名に分割して自動入力
    if (currentUser?.displayName && !formData.lastName) {
      const parts = currentUser.displayName.trim().split(/\s+/);
      if (parts.length >= 2) {
        setFormData(prev => ({ ...prev, lastName: parts[0], firstName: parts.slice(1).join(' ') }));
      } else {
        setFormData(prev => ({ ...prev, lastName: parts[0] || '' }));
      }
    }
  }, [userProfile, navigate, currentUser, formData.lastName]);

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const updateBusinessField = useCallback((field, value) => {
    setBusinessForm(prev => ({ ...prev, [field]: value }));
  }, []);

  const inputClass = 'w-full rounded-md border border-stroke bg-transparent px-5 py-3 text-dark outline-none transition placeholder:text-dark-6 focus:border-primary dark:border-dark-3 dark:text-white dark:focus:border-primary';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    if (!formData.company || !formData.lastName || !formData.firstName || !formData.phoneNumber) {
      setError('必須項目を入力してください');
      setIsSubmitting(false);
      return;
    }

    try {
      const displayName = `${formData.lastName} ${formData.firstName}`;

      await updateUserProfile(currentUser.uid, {
        company: formData.company,
        name: displayName,
        lastName: formData.lastName,
        firstName: formData.firstName,
        phoneNumber: formData.phoneNumber,
      });

      // ビジネスプラン: upgradeInquiries作成
      if (selectedPlan === 'business') {
        try {
          await addDoc(collection(db, 'upgradeInquiries'), {
            uid: currentUser.uid,
            selectedPlan: 'business',
            companyName: formData.company.trim(),
            department: businessForm.department.trim(),
            lastName: formData.lastName.trim(),
            firstName: formData.firstName.trim(),
            phone: formData.phoneNumber.trim(),
            email: currentUser.email,
            zipCode: businessForm.zipCode.trim(),
            prefecture: businessForm.prefecture.trim(),
            city: businessForm.city.trim(),
            building: businessForm.building.trim(),
            paymentTiming: businessForm.paymentTiming,
            startDatePref: businessForm.startDatePref,
            startMonth: businessForm.startDatePref === 'preferred' ? businessForm.startMonth : null,
            message: businessForm.message.trim(),
            status: 'new',
            source: 'registration_sso',
            createdAt: serverTimestamp(),
          });
        } catch (inquiryErr) {
          console.error('[CompleteProfile] upgradeInquiry作成エラー:', inquiryErr);
        }
        sessionStorage.removeItem('pendingBusinessPlan');
        sessionStorage.removeItem('selectedPlan');
      }

      // ユーザー登録ログ
      try {
        const logUserRegistration = httpsCallable(functions, 'logUserRegistration');
        await logUserRegistration({ displayName, plan: 'free' });
      } catch (logError) {
        console.error('Log registration error:', logError);
      }

      navigate(selectedPlan === 'business' ? '/sites/new?business_inquiry=1' : '/sites/new');
    } catch (err) {
      console.error('Profile update error:', err);
      setError('情報の更新に失敗しました。もう一度お試しください。');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="relative z-10 flex min-h-screen items-center justify-center bg-gray-50 py-12 lg:py-20">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-[600px] overflow-hidden rounded-2xl bg-white shadow-lg dark:bg-dark-2">
          <div className="bg-gradient-primary px-8 py-6 text-center">
            <div className="mb-3 flex items-center justify-center">
              <img src={logoImg} alt="GROW REPORTER" className="h-10 w-auto brightness-0 invert" />
            </div>
            <h1 className="text-2xl font-bold text-white">追加情報の入力</h1>
            <p className="mt-2 text-sm text-white/90">サービスをご利用いただくために、以下の情報をご入力ください</p>
          </div>

          <div className="px-8 py-8">
            {/* ユーザー情報 */}
            <div className="mb-6 rounded-lg bg-gray-100 p-4 dark:bg-dark-3">
              <div className="flex items-center gap-3">
                {showPhoto ? (
                  <img src={photoURL} alt="Profile" className="h-12 w-12 flex-shrink-0 rounded-full object-cover"
                    referrerPolicy="no-referrer" onError={() => setPhotoLoadError(true)} />
                ) : (
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white">
                    {getInitials(currentUser?.displayName, currentUser?.email)}
                  </div>
                )}
                <div>
                  <p className="font-medium text-dark dark:text-white">{currentUser?.displayName}</p>
                  <p className="text-sm text-body-color">{currentUser?.email}</p>
                </div>
              </div>
            </div>

            {/* プラン選択カード */}
            <div className="mb-6 grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setSelectedPlan('free')}
                className={`relative rounded-xl border-2 px-4 py-3 text-left transition ${selectedPlan === 'free' ? 'border-blue-500' : 'border-stroke hover:border-gray-300 dark:border-dark-3'}`}>
                <div className="flex items-center gap-2">
                  <div className={`h-3 w-3 rounded-full border-4 ${selectedPlan === 'free' ? 'border-blue-500' : 'border-gray-300 dark:border-dark-4'}`} />
                  <span className="text-sm font-semibold text-dark dark:text-white">無料プラン</span>
                </div>
                <div className="mt-0.5 pl-5 text-xs text-body-color dark:text-dark-6">¥0 / データ閲覧</div>
              </button>
              <button type="button" onClick={() => setSelectedPlan('business')}
                className={`relative rounded-xl border-2 px-4 py-3 text-left transition ${selectedPlan === 'business' ? 'border-pink-500' : 'border-stroke hover:border-gray-300 dark:border-dark-3'}`}>
                <span className="absolute -top-2 right-3 rounded-full bg-gradient-to-r from-blue-500 to-pink-500 px-2 py-0.5 text-[9px] font-bold text-white">おすすめ</span>
                <div className="flex items-center gap-2">
                  <div className={`h-3 w-3 rounded-full border-4 ${selectedPlan === 'business' ? 'border-pink-500' : 'border-gray-300 dark:border-dark-4'}`} />
                  <span className="text-sm font-semibold text-dark dark:text-white">ビジネスプラン</span>
                </div>
                <div className="mt-0.5 pl-5 text-xs text-body-color dark:text-dark-6">¥49,800/月 / 全機能</div>
              </button>
            </div>

            {error && (
              <div className="mb-6 flex items-start gap-3 rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-700 dark:text-red-400">{error}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* 組織名 */}
              <div className="mb-5">
                <label htmlFor="company" className="mb-2.5 flex items-center gap-2 text-sm font-medium text-dark dark:text-white">
                  組織名 <span className="text-red-500">*</span>
                </label>
                <input type="text" id="company" value={formData.company} onChange={handleChange}
                  placeholder="組織名を入力" className={inputClass} required />
              </div>

              {/* 部署名 */}
              <div className="mb-5">
                <label className="mb-2.5 block text-sm font-medium text-dark dark:text-white">部署名</label>
                <input type="text" value={businessForm.department} onChange={(e) => updateBusinessField('department', e.target.value)}
                  placeholder="マーケティング部" className={inputClass} />
              </div>

              {/* 姓・名（全プラン共通） */}
              <div className="mb-5 grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-2.5 block text-sm font-medium text-dark dark:text-white">姓 <span className="text-red-500">*</span></label>
                  <input type="text" value={formData.lastName}
                    onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                    placeholder="山田" required className={inputClass} />
                </div>
                <div>
                  <label className="mb-2.5 block text-sm font-medium text-dark dark:text-white">名 <span className="text-red-500">*</span></label>
                  <input type="text" value={formData.firstName}
                    onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                    placeholder="太郎" required className={inputClass} />
                </div>
              </div>

              {/* 電話番号 */}
              <div className="mb-5">
                <label htmlFor="phoneNumber" className="mb-2.5 flex items-center gap-2 text-sm font-medium text-dark dark:text-white">
                  電話番号 <span className="text-red-500">*</span>
                </label>
                <input type="tel" id="phoneNumber" value={formData.phoneNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value.replace(/[-\s()]/g, '') }))}
                  placeholder="09012345678（ハイフンなし）" className={inputClass} required />
                <p className="mt-1 text-xs text-body-color">※ハイフンは自動で削除されます</p>
              </div>

              {/* ビジネスプラン追加項目 */}
              {selectedPlan === 'business' && (
                <div className="mb-5 space-y-4">
                  <BusinessPlanFormFields
                    form={businessForm}
                    updateField={updateBusinessField}
                    setForm={setBusinessForm}
                    inputClass={inputClass}
                    labelClass="mb-1.5 block text-sm font-medium text-dark dark:text-white"
                    showDepartmentField={false}
                    showNameFields={false}
                    showPhoneField={false}
                    showEmailField={false}
                    radioNamePrefix="cp_"
                  />
                </div>
              )}

              <Button type="submit" color="blue" disabled={isSubmitting} className="w-full">
                {isSubmitting ? '保存中...' : selectedPlan === 'business' ? 'ビジネスプランに申し込む' : 'サイト登録へ'}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
