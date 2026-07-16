import React from 'react';
import { Dialog, DialogTitle, DialogBody } from '../ui/dialog';
import FeedbackForm from './FeedbackForm';

/**
 * 意見箱・お問い合わせモーダル（'feedback:open' イベントで開く）。
 * 入力部は FeedbackForm に切り出してあり、アカウント設定画面のタブと共通。
 */
export default function FeedbackModal({ isOpen, onClose }) {
  return (
    <Dialog open={isOpen} onClose={onClose} size="lg">
      <DialogTitle>意見箱・お問い合わせ</DialogTitle>
      <DialogBody>
        <p className="mb-4 text-sm text-body-color">ご質問・ご要望・不具合報告などお気軽にお送りください</p>
        <FeedbackForm key={isOpen ? 'open' : 'closed'} source="feedback_modal" onSubmitted={onClose} />
      </DialogBody>
    </Dialog>
  );
}
