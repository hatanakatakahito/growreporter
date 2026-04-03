import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Check, Send, ArrowRight } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { PLANS, PLAN_TYPES, getPlanBadgeColor } from '../../constants/plans';
import toast from 'react-hot-toast';
import { Dialog, DialogBody, DialogActions } from '../ui/dialog';
import { Button } from '../ui/button';

/**
 * Businessプランアップグレードモーダル
 * Businessプラン訴求 → お問い合わせフォーム
 */
export default function UpgradeModal({ isOpen, onClose, initialStep = 'compare' }) {
  const navigate = useNavigate();
  const { userProfile, currentUser } = useAuth();
  const [step, setStep] = useState(initialStep);
  const [companyName, setCompanyName] = useState('');
  const [userName, setUserName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [formInitialized, setFormInitialized] = useState(false);

  const businessPlan = PLANS[PLAN_TYPES.BUSINESS];

  const initFormFields = () => {
    if (!formInitialized && userProfile) {
      const name = (userProfile.lastName && userProfile.firstName)
        ? `${userProfile.lastName} ${userProfile.firstName}`
        : (userProfile.displayName || '');
      setCompanyName(userProfile.company || '');
      setUserName(name);
      setEmail(currentUser?.email || userProfile.email || '');
      setFormInitialized(true);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSending(true);
    try {
      await addDoc(collection(db, 'upgradeInquiries'), {
        uid: currentUser?.uid || null,
        selectedPlan: 'business',
        companyName: companyName.trim(),
        userName: userName.trim(),
        email: email.trim() || currentUser?.email || '',
        message: message.trim(),
        status: 'new',
        createdAt: serverTimestamp(),
      });
      handleClose();
      navigate('/thanks');
    } catch (err) {
      console.error('[UpgradeModal] 送信エラー:', err);
      toast.error('送信に失敗しました。しばらくしてから再度お試しください。');
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    setStep(initialStep);
    setCompanyName('');
    setUserName('');
    setEmail('');
    setMessage('');
    setFormInitialized(false);
    onClose();
  };

  if (isOpen && step === 'form' && !formInitialized) {
    initFormFields();
  }

  // ── お問い合わせフォーム ──
  if (step === 'form') {
    return (
      <Dialog open={isOpen} onClose={handleClose} size="lg">
        <div className="-mx-(--gutter) -mt-(--gutter) border-b border-stroke bg-gradient-to-r from-red-400 to-pink-600 px-6 py-4 dark:border-dark-3 rounded-t-2xl">
          <h3 className="text-xl font-semibold text-white">Businessプランのお問い合わせ</h3>
        </div>

        <form id="upgrade-form" onSubmit={handleSubmit}>
          <DialogBody>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-dark dark:text-white">会社名</label>
                <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 text-sm text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:text-white" placeholder="株式会社〇〇" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-dark dark:text-white">お名前 <span className="text-red-500">*</span></label>
                <input type="text" value={userName} onChange={(e) => setUserName(e.target.value)} required
                  className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 text-sm text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:text-white" placeholder="山田 太郎" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-dark dark:text-white">メールアドレス <span className="text-red-500">*</span></label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                  className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 text-sm text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:text-white" placeholder="example@company.com" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-dark dark:text-white">ご質問・ご要望</label>
                <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3}
                  className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 text-sm text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:text-white" placeholder="ご不明点があればお気軽にお書きください" />
              </div>
            </div>
          </DialogBody>
          <DialogActions>
            <Button plain onClick={handleClose}>キャンセル</Button>
            <Button type="submit" form="upgrade-form" color="pink" disabled={isSending}>
              {isSending ? '送信中...' : <><Send className="h-4 w-4" /> 送信する</>}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    );
  }

  // ── Businessプラン訴求 ──
  return (
    <Dialog open={isOpen} onClose={handleClose} size="lg">
      <div className="-mx-(--gutter) -mt-(--gutter) border-b border-stroke bg-gradient-to-r from-red-400 to-pink-600 px-6 py-5 dark:border-dark-3 rounded-t-2xl text-center">
        <Sparkles className="mx-auto mb-2 h-8 w-8 text-white" />
        <h3 className="text-2xl font-bold text-white">Businessプラン</h3>
        <p className="mt-1 text-pink-100">AIの力でサイト改善を本格的に推進</p>
      </div>

      <DialogBody>
        <div className="text-center mb-6">
          <span className="text-3xl font-bold text-dark dark:text-white">¥{businessPlan.price.toLocaleString()}</span>
          <span className="text-sm text-body-color"> / 月（税別）</span>
        </div>

        <div className="space-y-3">
          {[
            'AI分析サマリー（無制限）',
            'AI改善提案（無制限）',
            'AIチャット（無制限）',
            '改善タスク管理・効果測定',
            'PPTX・Excelレポート',
            `最大${businessPlan.features.maxSites}サイト登録`,
            'メンバー招待（無制限）',
            'アラート通知（AI仮説付き）',
            '週次・月次レポートメール',
            `サポート: ${businessPlan.features.support}`,
          ].map((feature, i) => (
            <div key={i} className="flex items-center gap-3">
              <Check className="h-5 w-5 shrink-0 text-pink-500" />
              <span className="text-sm text-dark dark:text-white">{feature}</span>
            </div>
          ))}
        </div>
      </DialogBody>

      <DialogActions>
        <Button plain onClick={handleClose}>閉じる</Button>
        <Button color="pink" onClick={() => { initFormFields(); setStep('form'); }}>
          <Send className="h-4 w-4" /> お問い合わせ
        </Button>
        <Button outline onClick={() => navigate('/plan-info')}>
          <ArrowRight className="h-4 w-4" /> プラン詳細
        </Button>
      </DialogActions>
    </Dialog>
  );
}
