import { useState, useEffect } from 'react';
import { X, CheckCircle, Calendar, TrendingUp, Sparkles } from 'lucide-react';

/**
 * 改善タスク完了ダイアログ
 * 改善反映日の入力とBefore/After自動計測の開始確認
 * + 次ステップ提案の確認チェックボックス
 */
export default function CompletionDialog({ isOpen, onClose, item, onConfirm, isLoading }) {
  const [effectiveDate, setEffectiveDate] = useState('');
  const [generateNextStep, setGenerateNextStep] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setEffectiveDate(new Date().toISOString().split('T')[0]);
      setGenerateNextStep(false);
    }
  }, [isOpen]);

  const handleConfirm = () => {
    onConfirm({ effectiveDate, generateNextStep });
  };

  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-lg bg-white p-6 dark:bg-dark-2">
        {/* ヘッダー */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-6 w-6 text-green-500" />
            <h3 className="text-xl font-semibold text-dark dark:text-white">
              改善タスクを完了にする
            </h3>
          </div>
          {!isLoading && (
            <button
              onClick={onClose}
              className="rounded-lg p-2 hover:bg-gray-2 dark:hover:bg-dark-3"
            >
              <X className="h-5 w-5 text-body-color" />
            </button>
          )}
        </div>

        {/* タスク情報 */}
        <div className="mb-6 rounded-lg border border-stroke bg-gray-2 p-4 dark:border-dark-3 dark:bg-dark-3">
          <h4 className="mb-1 font-medium text-dark dark:text-white">{item.title}</h4>
          {item.description && (
            <p className="text-sm text-body-color line-clamp-2">{item.description}</p>
          )}
        </div>

        {/* 改善反映日 */}
        <div className="mb-6">
          <label htmlFor="effective-date" className="mb-2 flex items-center gap-2 text-sm font-medium text-dark dark:text-white">
            <Calendar className="h-4 w-4 text-body-color" />
            改善反映日
          </label>
          <input
            id="effective-date"
            type="date"
            value={effectiveDate}
            onChange={(e) => setEffectiveDate(e.target.value)}
            className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-dark outline-none focus:border-primary dark:border-dark-3 dark:text-white"
          />
          <p className="mt-1.5 text-xs text-body-color">
            改善が実際にサイトに反映された日付を入力してください。デフォルトは本日です。
          </p>
        </div>

        {/* 自動計測の説明 */}
        <div className="mb-6 rounded-lg border border-stroke bg-gray-2 p-4 dark:border-dark-3 dark:bg-dark-3">
          <div className="mb-2 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-dark dark:text-white">効果の自動計測を開始します</span>
          </div>
          <ul className="space-y-1 text-xs text-body-color">
            <li>• 改善反映日の前14日間（Before）と後14日間（After）のデータを比較します</li>
            <li>• Before指標は完了時に自動取得されます</li>
            <li>• After指標は14日後に自動取得され、AIが効果を評価します</li>
            <li>• 結果は「評価する」画面で確認できます</li>
          </ul>
        </div>

        {/* 次ステップ提案 */}
        <label className="mb-6 flex items-start gap-3 cursor-pointer rounded-lg border border-stroke p-4 hover:bg-gray-2 dark:border-dark-3 dark:hover:bg-dark-3">
          <input
            type="checkbox"
            checked={generateNextStep}
            onChange={(e) => setGenerateNextStep(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-stroke text-primary focus:ring-primary dark:border-dark-3"
          />
          <div>
            <div className="flex items-center gap-1.5 text-sm font-medium text-dark dark:text-white">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              この改善の次ステップとしてAI提案を生成する
            </div>
            <p className="mt-0.5 text-xs text-body-color">
              完了タスクの内容と期待効果をもとに、次に取り組むべき改善提案を1-2件自動生成します。月間AI改善回数を1回消費します。
            </p>
          </div>
        </label>

        {/* アクションボタン */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="rounded-lg border border-stroke px-4 py-2 text-sm font-medium text-dark hover:bg-gray-2 disabled:opacity-50 dark:border-dark-3 dark:text-white dark:hover:bg-dark-3"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!effectiveDate || isLoading}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
          >
            {isLoading ? '計測を開始中...' : '完了にして計測を開始'}
          </button>
        </div>
      </div>
    </div>
  );
}
