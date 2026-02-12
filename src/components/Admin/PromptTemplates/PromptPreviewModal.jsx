import { X } from 'lucide-react';
import { renderPromptPreview } from '../../../utils/promptSampleData';
import { useState, useEffect } from 'react';

/**
 * プロンプトプレビューモーダル
 */
export default function PromptPreviewModal({ isOpen, onClose, template, pageType }) {
  const [renderedPrompt, setRenderedPrompt] = useState('');

  useEffect(() => {
    if (isOpen && template && pageType) {
      try {
        const rendered = renderPromptPreview(template, pageType);
        setRenderedPrompt(rendered);
      } catch (error) {
        setRenderedPrompt(`プレビューのレンダリングに失敗しました: ${error.message}`);
      }
    }
  }, [isOpen, template, pageType]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black bg-opacity-50 p-4">
      <div className="relative w-full max-w-4xl rounded-lg bg-white shadow-xl dark:bg-dark-2">
        {/* ヘッダー */}
        <div className="flex items-center justify-between border-b border-stroke p-6 dark:border-dark-3">
          <div>
            <h2 className="text-xl font-semibold text-dark dark:text-white">
              プロンプトプレビュー
            </h2>
            <p className="mt-1 text-sm text-body-color">
              サンプルデータでレンダリングされたプロンプトを確認できます
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-body-color transition hover:bg-gray-2 dark:hover:bg-dark-3"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* コンテンツ */}
        <div className="max-h-[70vh] overflow-y-auto p-6">
          <div className="rounded-lg border border-stroke bg-gray-1 p-4 dark:border-dark-3 dark:bg-dark">
            <pre className="whitespace-pre-wrap break-words font-mono text-sm text-dark dark:text-white">
              {renderedPrompt}
            </pre>
          </div>

          {/* 注意事項 */}
          <div className="mt-4 rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>💡 ヒント:</strong> 
              このプレビューはサンプルデータを使用しています。実際のAI分析では、サイトの実データが使用されます。
            </p>
          </div>
        </div>

        {/* フッター */}
        <div className="flex justify-end border-t border-stroke p-6 dark:border-dark-3">
          <button
            onClick={onClose}
            className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-white transition hover:bg-primary/90"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}

