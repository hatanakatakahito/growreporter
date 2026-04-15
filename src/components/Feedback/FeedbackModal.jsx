import React, { useEffect, useState } from 'react';
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { X, Paperclip } from 'lucide-react';
import toast from 'react-hot-toast';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';

const CATEGORY_OPTIONS = [
  { value: 'usage', label: '使い方について' },
  { value: 'feature', label: '機能開発について' },
  { value: 'bug', label: 'バグ、不具合' },
  { value: 'other', label: 'その他' },
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export default function FeedbackModal({ isOpen, onClose }) {
  const { currentUser, userProfile } = useAuth();

  const [companyName, setCompanyName] = useState('');
  const [lastName, setLastName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState('');
  const [message, setMessage] = useState('');
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // モーダルを開くたびにユーザー情報を自動入力
  useEffect(() => {
    if (!isOpen) return;
    setCompanyName(userProfile?.company || '');
    setLastName(userProfile?.lastName || '');
    setFirstName(userProfile?.firstName || '');
    setEmail(currentUser?.email || userProfile?.email || '');
    setCategory('');
    setMessage('');
    setFile(null);
  }, [isOpen, userProfile, currentUser]);

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) {
      setFile(null);
      return;
    }
    if (f.size > MAX_FILE_SIZE) {
      toast.error('ファイルサイズは10MB以下にしてください');
      e.target.value = '';
      return;
    }
    setFile(f);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser?.uid) {
      toast.error('ログインが必要です');
      return;
    }
    if (!category) {
      toast.error('種別を選択してください');
      return;
    }
    if (!message.trim()) {
      toast.error('お問い合わせ内容を入力してください');
      return;
    }

    setSubmitting(true);
    try {
      let attachmentUrl = null;
      let attachmentFileName = null;
      if (file) {
        const path = `feedback_attachments/${currentUser.uid}/${Date.now()}_${file.name}`;
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, file, { contentType: file.type });
        attachmentUrl = await getDownloadURL(storageRef);
        attachmentFileName = file.name;
      }

      const categoryLabel =
        CATEGORY_OPTIONS.find((c) => c.value === category)?.label || category;

      await addDoc(collection(db, 'userFeedback'), {
        uid: currentUser.uid,
        companyName: companyName.trim(),
        lastName: lastName.trim(),
        firstName: firstName.trim(),
        email: email.trim(),
        category,
        categoryLabel,
        message: message.trim(),
        attachmentUrl,
        attachmentFileName,
        status: 'new',
        source: 'feedback_modal',
        createdAt: serverTimestamp(),
      });

      toast.success('お問い合わせを送信しました。ありがとうございます。');
      onClose();
    } catch (err) {
      console.error('[FeedbackModal] 送信エラー:', err);
      toast.error('送信に失敗しました。時間をおいて再度お試しください。');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-[60]">
      <DialogBackdrop className="fixed inset-0 z-[60] bg-black/50" />
      <div className="fixed inset-0 z-[61] flex items-center justify-center p-4">
        <DialogPanel className="relative w-full max-w-xl rounded-2xl bg-white shadow-xl dark:bg-dark-2 max-h-[90vh] flex flex-col">
          {/* ヘッダー */}
          <div className="flex items-start justify-between border-b border-stroke px-6 py-4 dark:border-dark-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-body-color">
                意見箱
              </p>
              <DialogTitle className="mt-1 text-lg font-bold text-dark dark:text-white">
                お問い合わせフォーム
              </DialogTitle>
              <p className="mt-1 text-xs text-body-color">
                ご質問・ご要望・不具合報告などお気軽にお送りください
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1 text-body-color hover:bg-gray-100 dark:hover:bg-dark-3"
              aria-label="閉じる"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* 本体 */}
          <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
              {/* 組織名 */}
              <div>
                <label className="mb-1 block text-sm font-medium text-dark dark:text-white">
                  組織名
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full rounded-lg border border-stroke bg-white px-3 py-2 text-sm text-dark focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark dark:text-white"
                  placeholder="組織名"
                />
              </div>

              {/* 姓・名 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-dark dark:text-white">
                    姓
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full rounded-lg border border-stroke bg-white px-3 py-2 text-sm text-dark focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark dark:text-white"
                    placeholder="山田"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-dark dark:text-white">
                    名
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full rounded-lg border border-stroke bg-white px-3 py-2 text-sm text-dark focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark dark:text-white"
                    placeholder="太郎"
                  />
                </div>
              </div>

              {/* メールアドレス */}
              <div>
                <label className="mb-1 block text-sm font-medium text-dark dark:text-white">
                  メールアドレス
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-stroke bg-white px-3 py-2 text-sm text-dark focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark dark:text-white"
                  placeholder="sample@example.com"
                />
              </div>

              {/* 種別 */}
              <div>
                <label className="mb-1 block text-sm font-medium text-dark dark:text-white">
                  種別 <span className="text-red-500">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  required
                  className="w-full rounded-lg border border-stroke bg-white px-3 py-2 text-sm text-dark focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark dark:text-white"
                >
                  <option value="">選択してください</option>
                  {CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* お問い合わせ内容 */}
              <div>
                <label className="mb-1 block text-sm font-medium text-dark dark:text-white">
                  お問い合わせ内容 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  rows={6}
                  className="w-full rounded-lg border border-stroke bg-white px-3 py-2 text-sm text-dark focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark dark:text-white"
                  placeholder="詳細をご記入ください"
                />
              </div>

              {/* 添付資料 */}
              <div>
                <label className="mb-1 block text-sm font-medium text-dark dark:text-white">
                  添付資料 <span className="text-xs font-normal text-body-color">（任意・10MBまで）</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-stroke px-3 py-3 text-sm text-body-color hover:border-primary hover:text-primary dark:border-dark-3">
                  <Paperclip className="h-4 w-4" />
                  <span>{file ? file.name : 'ファイルを選択'}</span>
                  <input type="file" onChange={handleFileChange} className="hidden" />
                </label>
              </div>
            </div>

            {/* フッター */}
            <div className="flex items-center justify-end gap-2 border-t border-stroke px-6 py-4 dark:border-dark-3">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="rounded-md border border-stroke px-4 py-2 text-sm font-medium text-dark hover:bg-gray-50 disabled:opacity-50 dark:border-dark-3 dark:text-white dark:hover:bg-dark-3"
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
              >
                {submitting ? '送信中...' : '送信する'}
              </button>
            </div>
          </form>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
