import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Dialog, DialogTitle, DialogDescription, DialogBody, DialogActions } from '../ui/dialog';
import { Button } from '../ui/button';

const FOCUS_OPTIONS = [
  { value: 'balance', label: 'バランス（まんべんなく）', description: '集客・成果・デザイン・使いやすさを総合的に分析' },
  { value: 'acquisition', label: '集客力の向上', description: 'チャネル別流入・SEO・SNS・広告からサイト訪問数を増やす' },
  { value: 'conversion', label: 'コンバージョン（成果）の向上', description: 'CV導線・フォーム・CTA・逆算フローからCVRを改善' },
  { value: 'branding', label: 'ブランディングの向上', description: 'ビジュアル・トンマナ・世界観など「らしさ」の表現を改善' },
  { value: 'usability', label: 'ユーザービリティの向上', description: 'ページ別の離脱・表示速度・UI・アクセシビリティを改善' },
];

/**
 * AI改善案生成前に「どの成果を優先するか」を選択するモーダル
 */
export default function ImprovementFocusModal({ isOpen, onClose, onConfirm }) {
  const [focus, setFocus] = useState('balance');
  const [userNote, setUserNote] = useState('');

  const handleConfirm = () => {
    onConfirm(focus, userNote.trim());
    onClose();
  };

  return (
    <Dialog open={isOpen} onClose={onClose} size="2xl">
      <DialogTitle>
        <span className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          どの成果を優先して改善案を出しますか？
        </span>
      </DialogTitle>
      <DialogDescription>
        方針に合わせてAIが改善案を生成します。
      </DialogDescription>
      <DialogBody>
        <div className="space-y-2">
          {FOCUS_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition ${
                focus === opt.value
                  ? 'border-primary bg-primary/5 dark:bg-primary/10'
                  : 'border-stroke hover:bg-gray-50 dark:border-dark-3 dark:hover:bg-dark-3'
              }`}
            >
              <input
                type="radio"
                name="improvementFocus"
                value={opt.value}
                checked={focus === opt.value}
                onChange={() => setFocus(opt.value)}
                className="h-4 w-4 text-primary"
              />
              <div>
                <span className="text-sm font-medium text-dark dark:text-white">{opt.label}</span>
                {opt.description && <p className="mt-0.5 text-xs text-body-color">{opt.description}</p>}
              </div>
            </label>
          ))}
        </div>

        {/* 備考欄 */}
        <div className="mt-4">
          <label className="mb-1.5 block text-sm font-medium text-dark dark:text-white">
            備考（任意）
          </label>
          <p className="mb-2 text-xs text-body-color">
            改善したい方向性や具体的な内容があれば記入してください。記入内容を最優先で反映します。
          </p>
          <textarea
            value={userNote}
            onChange={(e) => setUserNote(e.target.value)}
            placeholder="例: お問い合わせフォームのコンバージョン率を上げたい、採用ページを新設したい など"
            rows={3}
            maxLength={500}
            className="w-full rounded-lg border border-stroke px-3 py-2 text-sm text-dark placeholder:text-body-color/50 focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark dark:text-white"
          />
          {userNote.length > 0 && (
            <div className="mt-1 text-right text-[11px] text-body-color">{userNote.length}/500</div>
          )}
        </div>
      </DialogBody>
      <DialogActions>
        <Button plain onClick={onClose}>
          キャンセル
        </Button>
        <Button color="blue" onClick={handleConfirm}>
          生成する
        </Button>
      </DialogActions>
    </Dialog>
  );
}
