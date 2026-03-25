import React, { useState } from 'react';
import { Download, Send } from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { functions, storage } from '../../config/firebase';
import { downloadImprovementsExcel, exportImprovementsToExcel } from '../../utils/exportImprovementsToExcel';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Dialog, DialogTitle, DialogBody, DialogActions } from '../ui/dialog';
import { Button } from '../ui/button';

/**
 * サイト改善相談フォームモーダル
 * 制作会社（info@grow-reporter.com）へ相談を送信
 */
export default function ConsultationFormModal({ isOpen, onClose, siteName, siteUrl, improvements, onSuccess }) {
  const { userProfile } = useAuth();
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  // ユーザー名を取得
  const getUserName = () => {
    if (userProfile?.lastName && userProfile?.firstName) {
      return `${userProfile.lastName} ${userProfile.firstName}`;
    }
    return userProfile?.displayName || '';
  };

  const handleDownloadExcel = async () => {
    if (!improvements || improvements.length === 0) {
      toast.error('改善案がありません');
      return;
    }
    try {
      await downloadImprovementsExcel(improvements, siteName);
      toast.success('Excelをダウンロードしました');
    } catch (e) {
      toast.error(e?.message || 'ダウンロードに失敗しました');
    }
  };

  // Excel を Storage にアップロードしてダウンロードURLを取得
  const uploadExcelToStorage = async () => {
    if (!improvements || improvements.length === 0) return { url: '', fileName: '' };
    try {
      const blob = await exportImprovementsToExcel(improvements, siteName);
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const safeName = (siteName || 'サイト').replace(/[/\\:*?"<>|]/g, '_').trim() || 'サイト';
      const excelFileName = `${safeName}_サイト改善案_${dateStr}.xlsx`;
      const storagePath = `consultation_excels/${dateStr}_${Date.now()}_${excelFileName}`;
      const storageRef = ref(storage, storagePath);
      await uploadBytes(storageRef, blob, { contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const downloadUrl = await getDownloadURL(storageRef);
      return { url: downloadUrl, fileName: excelFileName };
    } catch (e) {
      console.error('[ConsultationFormModal] Excelアップロードエラー:', e);
      toast.error('Excel添付に失敗しました。相談内容のみ送信されます。');
      return { url: '', fileName: '' };
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSending(true);
    try {
      const { url: excelDownloadUrl, fileName: excelFileName } = await uploadExcelToStorage();

      const submitConsultation = httpsCallable(functions, 'submitImprovementConsultation');
      await submitConsultation({
        siteName: siteName || '',
        siteUrl: siteUrl || '',
        message: message.trim(),
        userName: getUserName(),
        excelDownloadUrl,
        excelFileName,
      });
      toast.success('送信しました');
      onSuccess?.();
    } catch (err) {
      console.error('[ConsultationFormModal] 送信エラー:', err);
      toast.error(err?.message || '送信に失敗しました');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} size="lg">
      <DialogTitle>修正を相談する</DialogTitle>

      <DialogBody>
        <form id="consultation-form" onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-dark dark:text-white">サイト名</label>
            <div className="w-full rounded-lg border border-stroke bg-gray-50 px-4 py-3 text-sm text-body-color dark:border-dark-3 dark:bg-dark-3">
              {siteName || '（未設定）'}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-dark dark:text-white">サイトURL</label>
            <div className="w-full rounded-lg border border-stroke bg-gray-50 px-4 py-3 text-sm text-body-color dark:border-dark-3 dark:bg-dark-3">
              {siteUrl || '（未設定）'}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
              メッセージ（任意）
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-dark outline-none focus:border-primary dark:border-dark-3 dark:text-white"
              placeholder="ご要望やご質問があればご記入ください"
            />
          </div>

          <div className="rounded-lg border border-stroke bg-gray-50 p-4 dark:border-dark-3 dark:bg-dark-3">
            <p className="mb-2 text-sm text-body-color">
              改善内容の詳細は Excel でダウンロードできます。
            </p>
            <button
              type="button"
              onClick={handleDownloadExcel}
              className="inline-flex items-center gap-2 rounded-lg border border-primary bg-white px-4 py-2 text-sm font-medium text-primary transition hover:bg-primary/5 dark:bg-dark-2"
            >
              <Download className="h-4 w-4" />
              改善内容の Excel をダウンロード
            </button>
          </div>
        </form>
      </DialogBody>

      <DialogActions>
        <Button plain onClick={onClose} disabled={isSending}>
          キャンセル
        </Button>
        <Button color="blue" type="submit" form="consultation-form" disabled={isSending}>
          <Send className="h-4 w-4" data-slot="icon" />
          {isSending ? '送信中...' : '送信'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
