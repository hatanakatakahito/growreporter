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
            <div className="relative">
              <div className="h-20 w-20 rounded-full border-4 border-gray-200 dark:border-dark-3"></div>
              <div className="absolute top-0 left-0 h-20 w-20 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
            </div>
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

