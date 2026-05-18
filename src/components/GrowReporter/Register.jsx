import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import logoImg from '../../assets/img/logo.svg';
import { httpsCallable } from 'firebase/functions';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { functions, db } from '../../config/firebase';
import { auth } from '../../config/firebase';
import BusinessPlanFormFields, { BUSINESS_FORM_INITIAL } from '../common/BusinessPlanFormFields';
import { checkPasswordStrength, strengthLabel } from '../../utils/passwordStrength';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isFromInvitation, setIsFromInvitation] = useState(false);
  const [isLoadingInvitation, setIsLoadingInvitation] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('free');
  const [businessForm, setBusinessForm] = useState(BUSINESS_FORM_INITIAL);

  const { signup, loginWithGoogle, loginWithMicrosoft, fetchUserProfile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/sites/new';

  // URLパラメータからプラン自動選択
  useEffect(() => {
    const planParam = searchParams.get('plan');
    if (planParam === 'business') {
      setSelectedPlan('business');
    }
  }, [searchParams]);

  // 招待トークンから情報を取得
  useEffect(() => {
    const fetchInvitationInfo = async () => {
      const redirectParam = searchParams.get('redirect');
      if (!redirectParam || !redirectParam.includes('accept-invitation')) return;
      const tokenMatch = redirectParam.match(/token=([^&]+)/);
      if (!tokenMatch) return;

      const token = tokenMatch[1];
      setIsLoadingInvitation(true);
      try {
        const getInvitationByToken = httpsCallable(functions, 'getInvitationByToken');
        const result = await getInvitationByToken({ token });
        const invitation = result.data;
        if (invitation) {
          setEmail(invitation.email);
          setCompanyName(invitation.accountOwnerName || '');
          setIsFromInvitation(true);
        }
      } catch (err) {
        console.error('[Register] Error fetching invitation:', err);
      } finally {
        setIsLoadingInvitation(false);
      }
    };
    fetchInvitationInfo();
  }, [searchParams]);

  const updateBusinessField = useCallback((field, value) => {
    setBusinessForm(prev => ({ ...prev, [field]: value }));
  }, []);

  const inputClass = 'w-full rounded-md border border-stroke bg-transparent px-4 py-2.5 text-sm text-dark outline-none focus:border-primary focus-visible:shadow-none dark:border-dark-3 dark:text-white';
  const labelClass = 'mb-2 flex items-center gap-2 text-sm font-medium text-dark dark:text-white';

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    if (!companyName || !phoneNumber) {
      setError('すべての必須項目を入力してください');
      setIsSubmitting(false);
      return;
    }

    if (!businessForm.lastName || !businessForm.firstName) {
      setError('姓・名を入力してください');
      setIsSubmitting(false);
      return;
    }

    // セキュリティ (Phase 4-A-10): パスワード強度を検証。
    //   旧仕様 6 文字以上 → 新仕様 8 文字以上 + 大文字・小文字・数字・記号のうち 3 種類以上。
    const strengthCheck = checkPasswordStrength(password);
    if (!strengthCheck.ok) {
      setError(strengthCheck.reason || 'パスワードが弱すぎます');
      setIsSubmitting(false);
      return;
    }

    if (!agreedToTerms) {
      setError('利用規約とプライバシーポリシーに同意してください');
      setIsSubmitting(false);
      return;
    }

    try {
      const displayName = `${businessForm.lastName} ${businessForm.firstName}`;

      await signup(email, password, {
        displayName,
        name: displayName,
        company: companyName,
        department: businessForm.department || '',
        phoneNumber,
        lastName: businessForm.lastName,
        firstName: businessForm.firstName,
        zipCode: businessForm.zipCode || '',
        prefecture: businessForm.prefecture || '',
        city: businessForm.city || '',
        building: businessForm.building || '',
      });

      // ビジネスプラン: upgradeInquiries作成
      if (selectedPlan === 'business') {
        try {
          await addDoc(collection(db, 'upgradeInquiries'), {
            uid: auth.currentUser.uid,
            selectedPlan: 'business',
            companyName: companyName.trim(),
            department: businessForm.department.trim(),
            lastName: businessForm.lastName.trim(),
            firstName: businessForm.firstName.trim(),
            phone: phoneNumber.trim(),
            email: email.trim(),
            zipCode: businessForm.zipCode.trim(),
            prefecture: businessForm.prefecture.trim(),
            city: businessForm.city.trim(),
            building: businessForm.building.trim(),
            paymentTiming: businessForm.paymentTiming,
            startDatePref: businessForm.startDatePref,
            startMonth: businessForm.startDatePref === 'preferred' ? businessForm.startMonth : null,
            message: businessForm.message.trim(),
            status: 'new',
            source: 'registration',
            createdAt: serverTimestamp(),
          });
        } catch (inquiryErr) {
          console.error('[Register] upgradeInquiry作成エラー:', inquiryErr);
        }
      }

      // 招待経由の処理
      if (isFromInvitation) {
        try {
          const tokenMatch = redirectUrl.match(/token=([^&]+)/);
          if (tokenMatch) {
            const token = tokenMatch[1];
            const acceptInvitation = httpsCallable(functions, 'acceptInvitation');
            await acceptInvitation({ token });
          }
        } catch (inviteError) {
          console.error('[Register] Failed to auto-accept invitation:', inviteError);
          navigate(redirectUrl);
          return;
        }
        navigate('/dashboard');
      } else {
        navigate(selectedPlan === 'business' ? '/sites/new?business_inquiry=1' : redirectUrl);
      }
    } catch (err) {
      console.error('Register error:', err);
      let errorMessage = '登録エラーが発生しました';
      if (err.code === 'auth/email-already-in-use') errorMessage = 'このメールアドレスは既に使用されています';
      else if (err.code === 'auth/invalid-email') errorMessage = 'メールアドレスの形式が正しくありません';
      else if (err.code === 'auth/weak-password') errorMessage = 'パスワードが弱すぎます。6文字以上で入力してください';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setIsSubmitting(true);
    if (selectedPlan === 'business') {
      sessionStorage.setItem('pendingBusinessPlan', JSON.stringify(businessForm));
      sessionStorage.setItem('selectedPlan', 'business');
    }
    try {
      const userCredential = await loginWithGoogle();
      setTimeout(async () => {
        const profile = await fetchUserProfile(userCredential.user.uid);
        if (!profile?.company || !profile?.phoneNumber) {
          navigate('/register/complete');
        } else {
          navigate(redirectUrl);
        }
      }, 500);
    } catch (err) {
      console.error('Google sign in error:', err);
      let errorMessage = 'Google認証エラーが発生しました';
      if (err.code === 'auth/popup-closed-by-user') errorMessage = '認証がキャンセルされました';
      else if (err.code === 'auth/popup-blocked') errorMessage = 'ポップアップがブロックされました';
      setError(errorMessage);
      setIsSubmitting(false);
    }
  };

  const handleMicrosoftSignIn = async () => {
    setError('');
    setIsSubmitting(true);
    if (selectedPlan === 'business') {
      sessionStorage.setItem('pendingBusinessPlan', JSON.stringify(businessForm));
      sessionStorage.setItem('selectedPlan', 'business');
    }
    try {
      const userCredential = await loginWithMicrosoft();
      setTimeout(async () => {
        const profile = await fetchUserProfile(userCredential.user.uid);
        if (!profile?.company || !profile?.phoneNumber) {
          navigate('/register/complete');
        } else {
          navigate(redirectUrl);
        }
      }, 500);
    } catch (err) {
      console.error('Microsoft sign in error:', err);
      let errorMessage = 'Microsoft認証エラーが発生しました';
      if (err.code === 'auth/popup-closed-by-user') errorMessage = '認証がキャンセルされました';
      else if (err.code === 'auth/popup-blocked') errorMessage = 'ポップアップがブロックされました';
      setError(errorMessage);
      setIsSubmitting(false);
    }
  };

  return (
    <section className="relative z-10 flex min-h-screen items-center justify-center py-12 lg:py-20" style={{ backgroundColor: 'rgb(244, 244, 244)' }}>
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-[820px] overflow-hidden rounded-2xl bg-white shadow-lg dark:bg-dark-2">
          {/* ロゴエリア */}
          <div className="bg-gradient-primary px-8 py-6 text-center">
            <div className="flex items-center justify-center">
              <img src={logoImg} alt="グローレポータ" className="h-10 w-auto brightness-0 invert" />
            </div>
            {isFromInvitation && (
              <h2 className="mt-2 text-lg font-bold text-white">招待を受けてアカウント作成</h2>
            )}
          </div>

          {/* フォームエリア */}
          <div className="flex w-full items-center justify-center px-20 py-10">
            <div className="w-full">
              {/* ログイン/新規登録タブ */}
              {!isFromInvitation && (
                <div className="mb-4 flex gap-2 rounded-lg bg-gray-100 p-1 dark:bg-dark-3">
                  <Link to="/login" className="flex-1 rounded-md px-4 py-2.5 text-center text-sm font-medium transition-all text-body-color hover:text-dark dark:text-dark-6 dark:hover:text-white">
                    ログイン
                  </Link>
                  <button type="button" className="flex-1 rounded-md px-4 py-2.5 text-sm font-medium transition-all bg-white text-dark shadow-sm dark:bg-dark-2 dark:text-white">
                    新規登録
                  </button>
                </div>
              )}

              {/* プラン選択カード（招待経由は非表示） */}
              {!isFromInvitation && (
                <div className="mb-6">
                <p className="mb-2 text-xs text-body-color dark:text-dark-6">プランを選択</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedPlan('free')}
                    className={`rounded-xl border-2 px-4 py-3 text-center transition ${
                      selectedPlan === 'free'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10'
                        : 'border-stroke bg-white hover:border-gray-300 dark:border-dark-3 dark:bg-dark-2'
                    }`}
                  >
                    <div className={`text-sm font-bold ${selectedPlan === 'free' ? 'text-blue-600' : 'text-dark dark:text-white'}`}>無料プラン</div>
                    <div className="text-[11px] text-body-color dark:text-dark-6">¥0 / データ閲覧</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedPlan('business')}
                    className={`relative rounded-xl border-2 px-4 py-3 text-center transition ${
                      selectedPlan === 'business'
                        ? 'border-pink-500 bg-pink-50 dark:bg-pink-900/10'
                        : 'border-stroke bg-white hover:border-gray-300 dark:border-dark-3 dark:bg-dark-2'
                    }`}
                  >
                    <span className="absolute -top-2 right-3 rounded-full bg-gradient-business px-2 py-0.5 text-[9px] font-bold text-white">おすすめ</span>
                    <div className={`text-sm font-bold ${selectedPlan === 'business' ? 'text-pink-600' : 'text-dark dark:text-white'}`}>ビジネスプラン</div>
                    <div className="text-[11px] text-body-color dark:text-dark-6">¥49,800/月 / 全機能</div>
                  </button>
                </div>
                </div>
              )}

              {/* エラーメッセージ */}
              {error && (
                <div className="mb-6 flex items-start gap-3 rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                    <svg className="h-5 w-5 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h5 className="mb-1 text-sm font-semibold text-red-800 dark:text-red-300">エラー</h5>
                    <p className="text-sm leading-relaxed text-red-700 dark:text-red-400">{error}</p>
                  </div>
                  <button onClick={() => setError('')} className="flex-shrink-0 text-red-400 hover:text-red-600">
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              )}

              {/* SSOボタン（招待経由は非表示） */}
              {!isFromInvitation && (
                <>
                  <p className="mb-2 text-xs text-body-color dark:text-dark-6">外部アカウントで登録</p>
                  <div className="flex gap-2">
                    <Button type="button" variant="secondary" size="lg" onClick={handleGoogleSignIn} disabled={isSubmitting} className="flex-1 py-3">
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><g clipPath="url(#clip0_google_reg)"><path d="M19.9895 10.1871C19.9895 9.36767 19.9214 8.76973 19.7742 8.14966H10.1992V11.848H15.8195C15.7062 12.7671 15.0943 14.1512 13.7346 15.0813L13.7155 15.2051L16.7429 17.4969L16.9527 17.5174C18.879 15.7789 19.9895 13.221 19.9895 10.1871Z" fill="#4285F4"/><path d="M10.1993 19.9313C12.9527 19.9313 15.2643 19.0454 16.9527 17.5174L13.7346 15.0813C12.8734 15.6682 11.7176 16.0779 10.1993 16.0779C7.50243 16.0779 5.21352 14.3395 4.39759 11.9366L4.27799 11.9465L1.13003 14.3273L1.08887 14.4391C2.76588 17.6945 6.21061 19.9313 10.1993 19.9313Z" fill="#34A853"/><path d="M4.39748 11.9366C4.18219 11.3166 4.05759 10.6521 4.05759 9.96565C4.05759 9.27909 4.18219 8.61473 4.38615 7.99466L4.38045 7.8626L1.19304 5.44366L1.08875 5.49214C0.397576 6.84305 0.000976562 8.36008 0.000976562 9.96565C0.000976562 11.5712 0.397576 13.0882 1.08875 14.4391L4.39748 11.9366Z" fill="#FBBC05"/><path d="M10.1993 3.85336C12.1142 3.85336 13.406 4.66168 14.1425 5.33718L17.0207 2.59107C15.253 0.985496 12.9527 0 10.1993 0C6.2106 0 2.76588 2.23672 1.08887 5.49214L4.38626 7.99466C5.21352 5.59183 7.50242 3.85336 10.1993 3.85336Z" fill="#EB4335"/></g><defs><clipPath id="clip0_google_reg"><rect width="20" height="20" fill="white"/></clipPath></defs></svg>
                      Google
                    </Button>
                    <Button type="button" variant="secondary" size="lg" onClick={handleMicrosoftSignIn} disabled={isSubmitting} className="flex-1 py-3">
                      <svg width="20" height="20" viewBox="0 0 21 21" fill="none"><path d="M0 0H10V10H0V0Z" fill="#F25022"/><path d="M11 0H21V10H11V0Z" fill="#7FBA00"/><path d="M0 11H10V21H0V11Z" fill="#00A4EF"/><path d="M11 11H21V21H11V11Z" fill="#FFB900"/></svg>
                      Microsoft
                    </Button>
                  </div>
                  {/* 区切り線 */}
                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200 dark:border-dark-3"></div></div>
                    <div className="relative flex justify-center"><span className="bg-white px-3 text-xs text-body-color dark:bg-dark-2">または</span></div>
                  </div>
                </>
              )}

              {isFromInvitation && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg dark:bg-blue-900/20 dark:border-blue-800">
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    <strong>{companyName}</strong> への招待を受けています。アカウントを作成して参加しましょう。
                  </p>
                </div>
              )}

              <form onSubmit={handleRegister}>
                {/* 組織名 */}
                <div className="mb-6">
                  <label className={labelClass}>
                    組織名 <span className="text-red-500">*</span>
                    {isFromInvitation && <span className="text-xs text-gray-500">（招待元）</span>}
                  </label>
                  <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="組織名を入力" required readOnly={isFromInvitation}
                    className={`${inputClass} ${isFromInvitation ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed' : ''}`} />
                </div>

                {/* 部署名 */}
                <div className="mb-4">
                  <label className={labelClass}>部署名</label>
                  <input type="text" value={businessForm.department} onChange={(e) => updateBusinessField('department', e.target.value)}
                    placeholder="マーケティング部" className={inputClass} />
                </div>

                {/* 姓・名（全プラン共通） */}
                <div className="mb-4 grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>姓 <span className="text-red-500">*</span></label>
                    <input type="text" value={businessForm.lastName} onChange={(e) => updateBusinessField('lastName', e.target.value)}
                      placeholder="山田" required className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>名 <span className="text-red-500">*</span></label>
                    <input type="text" value={businessForm.firstName} onChange={(e) => updateBusinessField('firstName', e.target.value)}
                      placeholder="太郎" required className={inputClass} />
                  </div>
                </div>

                {/* 電話番号 */}
                <div className="mb-6">
                  <label className={labelClass}>電話番号 <span className="text-red-500">*</span></label>
                  <input type="tel" value={phoneNumber}
                    onChange={(e) => {
                      // 全角→半角変換 + ハイフン・空白・括弧を自動削除（ProfileEdit と統一）
                      const cleaned = e.target.value
                        .replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
                        .replace(/[-\s()ー−‐―]/g, '')
                        .replace(/[^0-9]/g, '');
                      setPhoneNumber(cleaned);
                    }}
                    placeholder="09012345678（ハイフンなし）" required className={inputClass} />
                  <p className="mt-1 text-xs text-body-color">※ハイフンは自動で削除されます</p>
                </div>

                {/* メールアドレス */}
                <div className="mb-6">
                  <label className={labelClass}>
                    メールアドレス <span className="text-red-500">*</span>
                    {isFromInvitation && <span className="text-xs text-gray-500">（招待先）</span>}
                  </label>
                  <div className="relative">
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                      placeholder="メールアドレスを入力" required readOnly={isFromInvitation}
                      className={`${inputClass} pr-11 ${isFromInvitation ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed' : ''}`} />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2">
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M3.33331 5.83333L10 10.8333L16.6666 5.83333" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><rect x="2.5" y="4.16667" width="15" height="11.6667" rx="2" stroke="#9CA3AF" strokeWidth="1.5"/></svg>
                    </span>
                  </div>
                </div>

                {/* パスワード */}
                <div className="mb-5">
                  <label className={labelClass}>パスワード <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <input type={showPassword ? "text" : "password"} value={password}
                      onChange={(e) => setPassword(e.target.value)} placeholder="8文字以上、3種類以上の文字種を含む" required
                      className={`${inputClass} pr-11`} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPassword ? (
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M3.26 11.6C2.83 10.79 2.83 9.21 3.26 8.4C4.42 6.13 7.03 4 10 4C12.97 4 15.58 6.13 16.74 8.4C17.17 9.21 17.17 10.79 16.74 11.6C15.58 13.87 12.97 16 10 16C7.03 16 4.42 13.87 3.26 11.6Z" stroke="currentColor" strokeWidth="1.5"/><circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5"/><line x1="3" y1="3" x2="17" y2="17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M3.26 11.6C2.83 10.79 2.83 9.21 3.26 8.4C4.42 6.13 7.03 4 10 4C12.97 4 15.58 6.13 16.74 8.4C17.17 9.21 17.17 10.79 16.74 11.6C15.58 13.87 12.97 16 10 16C7.03 16 4.42 13.87 3.26 11.6Z" stroke="currentColor" strokeWidth="1.5"/><circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5"/></svg>
                      )}
                    </button>
                  </div>
                  {/* パスワード強度メーター (Phase 4-A-10) */}
                  {password && (() => {
                    const strength = checkPasswordStrength(password);
                    const label = strengthLabel(strength.score);
                    return (
                      <div className="mt-2">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded bg-gray-200 overflow-hidden">
                            <div className="h-full transition-all" style={{ width: `${label.percent}%`, backgroundColor: label.color }} />
                          </div>
                          <span className="text-xs font-medium" style={{ color: label.color }}>{label.label}</span>
                        </div>
                        {!strength.ok && strength.reason && (
                          <p className="mt-1 text-xs text-red-600">{strength.reason}</p>
                        )}
                      </div>
                    );
                  })()}
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
                      radioNamePrefix="reg_"
                    />
                  </div>
                )}

                {/* 利用規約 */}
                <div className="mb-4">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input type="checkbox" checked={agreedToTerms} onChange={(e) => setAgreedToTerms(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" />
                    <span className="text-sm text-body-color dark:text-dark-6">
                      <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">利用規約</a>
                      、<a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">プライバシーポリシー</a>
                      、<a href="/commercial-transaction" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">特定商取引法に基づく表記</a>
                      に同意します
                    </span>
                  </label>
                </div>

                {/* 送信ボタン */}
                <Button
                  type="submit"
                  variant={selectedPlan === 'business' ? 'upgrade' : 'primary'}
                  size="lg"
                  disabled={isSubmitting}
                  className="mt-[10px] mb-4 w-full"
                >
                  {isSubmitting ? '処理中...' : selectedPlan === 'business' ? 'ビジネスプランに申し込む' : 'アカウントを作成'}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
