import React from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import { Dialog, DialogBody, DialogActions } from '../ui/dialog';
import { Button } from '../ui/button';

/**
 * AI改善案生成モーダル
 * @param {boolean} isOpen - モーダルの表示状態
 * @param {'loading' | 'success' | 'error'} status - 処理ステータス
 * @param {number} count - 追加された改善案の件数
 * @param {string} error - エラーメッセージ
 * @param {function} onClose - モーダルを閉じる
 */
export default function AIGenerationModal({
  isOpen,
  status,
  count = 0,
  error = '',
  onClose
}) {
  const isLoading = status === 'loading';
  const isSuccess = status === 'success';
  const isError = status === 'error';

  const loadingMessage = { title: 'AI改善案を生成中...', desc: 'ただいまデータを分析しサイト改善を作成しています。' };

  return (
    <Dialog open={isOpen} onClose={isLoading ? () => {} : onClose} size="md">
      <DialogBody>
        {/* ローディング中 */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-primary-mid shadow-lg"></div>
            <h3 className="mb-2 mt-4 text-xl font-semibold text-dark dark:text-white">
              {loadingMessage.title}
            </h3>
            <p className="text-center text-sm text-body-color">
              {loadingMessage.desc}<br />
              少々お待ちください。
            </p>
          </div>
        )}

        {/* 成功 */}
        {isSuccess && (
          <div className="flex flex-col items-center justify-center py-4">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="mb-2 text-xl font-semibold text-dark dark:text-white">
              {count}件の改善案を追加しました
            </h3>
            <p className="text-center text-sm text-body-color">
              改善案一覧に改善案が追加されました。
            </p>
          </div>
        )}

        {/* エラー */}
        {isError && (
          <div className="flex flex-col items-center justify-center py-4">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
              <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="mb-2 text-xl font-semibold text-dark dark:text-white">
              生成に失敗しました
            </h3>
            <p className="text-center text-sm text-body-color">
              {error || 'AI改善案の生成中にエラーが発生しました。'}
            </p>
          </div>
        )}
      </DialogBody>

      {(isSuccess || isError) && (
        <DialogActions>
          <Button color="blue" onClick={onClose}>
            閉じる
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
}
