'use client';

import Loading from './Loading';

interface PDFLoadingOverlayProps {
  isVisible: boolean;
  currentPage?: string;
  totalPages?: number;
  currentIndex?: number;
  status?: 'generating' | 'completed' | 'error';
}

export default function PDFLoadingOverlay({ 
  isVisible, 
  currentPage, 
  totalPages, 
  currentIndex,
  status = 'generating'
}: PDFLoadingOverlayProps) {
  if (!isVisible) return null;

  const progress = totalPages && currentIndex !== undefined 
    ? Math.round(((currentIndex + 1) / totalPages) * 100) 
    : 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 shadow-xl">
        <div className="text-center">
          {/* 統一されたローディングアニメーション */}
          <div className="mb-6">
            {status === 'generating' && <Loading size={64} />}
            {status === 'completed' && (
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
            {status === 'error' && (
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            )}
          </div>
          
          {/* タイトル */}
          <h3 className="text-xl font-bold text-gray-800 mb-4">
            {status === 'generating' && 'エクスポート準備中...'}
            {status === 'completed' && 'エクスポート完了！'}
            {status === 'error' && 'エクスポートエラー'}
          </h3>
          
          {/* 現在のページ情報 */}
          {status === 'generating' && currentPage && (
            <p className="text-gray-600 mb-4">
              現在処理中: <span className="font-semibold text-blue-600">{currentPage}</span>
            </p>
          )}
          
          {/* 進捗バー */}
          {status === 'generating' && totalPages && currentIndex !== undefined && (
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>進捗</span>
                <span>{currentIndex + 1} / {totalPages}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-500 mt-2">{progress}% 完了</p>
            </div>
          )}
          
          {/* メッセージ */}
          <p className="text-gray-600 text-sm">
            {status === 'generating' && 'しばらくお待ちください。エクスポートの準備には時間がかかる場合があります。'}
            {status === 'completed' && 'すべてのファイルが正常にダウンロードされました。'}
            {status === 'error' && 'エクスポート中にエラーが発生しました。ブラウザのコンソールで詳細を確認してください。'}
          </p>
        </div>
      </div>
    </div>
  );
}
