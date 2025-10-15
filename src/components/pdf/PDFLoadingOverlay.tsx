'use client';

/**
 * PDF生成中のローディングオーバーレイ
 */

interface PDFLoadingOverlayProps {
  isVisible: boolean;
  currentPage?: number;
  totalPages?: number;
  message?: string;
}

export default function PDFLoadingOverlay({
  isVisible,
  currentPage,
  totalPages,
  message = 'PDF生成中...'
}: PDFLoadingOverlayProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-white dark:bg-dark-2 rounded-lg shadow-2xl p-8 max-w-md w-full mx-4">
        <div className="text-center">
          {/* ローディングアニメーション */}
          <div className="mb-6 flex justify-center">
            <svg
              className="animate-spin"
              width="80"
              height="80"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle
                className="text-gray-200 dark:text-gray-600"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="fill-primary"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>

          {/* メッセージ */}
          <h3 className="text-xl font-semibold text-dark dark:text-white mb-2">
            {message}
          </h3>

          {/* プログレス情報 */}
          {currentPage !== undefined && totalPages !== undefined && (
            <div className="mt-4">
              <p className="text-sm text-body-color dark:text-dark-6 mb-2">
                {currentPage} / {totalPages} ページを処理中
              </p>
              <div className="w-full bg-gray-200 dark:bg-dark-3 rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(currentPage / totalPages) * 100}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* 注意事項 */}
          <p className="mt-4 text-xs text-body-color dark:text-dark-6">
            画面を閉じないでお待ちください
          </p>
        </div>
      </div>
    </div>
  );
}
