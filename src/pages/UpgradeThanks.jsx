import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, X } from 'lucide-react';
import { setPageTitle } from '../utils/pageTitle';

/**
 * プランアップグレードお問い合わせ送信完了（サンクスページ）
 * GA4 コンバージョン計測用 - URL: /thanks
 */
export default function UpgradeThanks() {
  const navigate = useNavigate();

  useEffect(() => { setPageTitle('送信完了'); }, []);

  // 5秒後に自動でダッシュボードへ戻る
  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/dashboard', { replace: true });
    }, 5000);
    return () => clearTimeout(timer);
  }, [navigate]);

  const handleClose = () => {
    navigate('/dashboard', { replace: true });
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
          プランアップグレードのお問い合わせを承りました。<br />
          担当者より折り返しご連絡いたします。
        </p>

        <p className="text-sm text-body-color/70">
          5秒後に自動で戻ります...
        </p>
      </div>
    </div>
  );
}
