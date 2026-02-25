import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, X } from 'lucide-react';

/**
 * サイト改善相談送信完了（サンクスモーダル）
 * コンバージョン測定用 - URL切り替えでトリガー
 */
export default function ImproveConsultationThanks() {
  const navigate = useNavigate();

  // 3秒後に自動で改善ページへ戻る
  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/improve', { replace: true });
    }, 3000);
    return () => clearTimeout(timer);
  }, [navigate]);

  const handleClose = () => {
    navigate('/improve', { replace: true });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-md rounded-lg bg-white p-8 text-center shadow-xl dark:bg-dark-2">
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 rounded-lg p-2 text-body-color hover:bg-gray-100 dark:text-dark-6 dark:hover:bg-dark-3"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-6 flex justify-center">
          <div className="rounded-full bg-green-100 p-4 dark:bg-green-900/20">
            <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
          </div>
        </div>

        <h1 className="mb-4 text-2xl font-bold text-dark dark:text-white">
          送信完了
        </h1>

        <p className="mb-2 text-body-color">
          サイト改善のご相談を承りました。<br />
          担当者より折り返しご連絡いたします。
        </p>

        <p className="text-sm text-body-color/70">
          3秒後に自動で戻ります...
        </p>
      </div>
    </div>
  );
}
