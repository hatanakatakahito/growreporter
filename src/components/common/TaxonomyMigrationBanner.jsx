import React from 'react';
import { AlertTriangle, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * サイトのタクソノミー(業種・役割・ビジネスモデル)が未移行 or 自動推定未確定の場合に表示するバナー。
 *
 * 表示条件 (呼び出し側で判定):
 *  - siteData.taxonomyVersion !== 2
 *  - または siteData.needsManualReclassify === true
 *
 * @param {Object} props
 * @param {string} props.siteId - 対象サイトID（編集画面への導線に使用）
 * @param {'user' | 'admin'} [props.variant='user'] - 'admin' の場合は「再分類モーダル」を開くボタン
 * @param {function(): void} [props.onReclassifyClick] - admin variant で使うコールバック
 * @param {string} [props.className] - 追加クラス
 */
export default function TaxonomyMigrationBanner({
  siteId,
  variant = 'user',
  onReclassifyClick,
  className = '',
}) {
  return (
    <div
      className={`flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-900/20 ${className}`}
      role="status"
    >
      <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
      <div className="flex-1">
        <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
          サイト情報の分類を更新してください
        </p>
        <p className="mt-1 text-xs text-amber-800 dark:text-amber-300/90">
          ビジネスモデル・業種・サイト役割の新しい分類体系に移行すると、AI 分析と改善提案の精度が向上します。
        </p>
        {variant === 'admin' ? (
          <button
            type="button"
            onClick={onReclassifyClick}
            className="mt-3 inline-flex items-center gap-1 rounded border border-amber-400 bg-white px-3 py-1.5 text-xs font-medium text-amber-800 transition hover:bg-amber-100 dark:border-amber-600 dark:bg-amber-900/30 dark:text-amber-200 dark:hover:bg-amber-900/50"
          >
            タクソノミーを再分類
          </button>
        ) : (
          siteId && (
            <Link
              to={`/sites/${siteId}/edit?step=1`}
              className="mt-3 inline-flex items-center gap-1 rounded border border-amber-400 bg-white px-3 py-1.5 text-xs font-medium text-amber-800 transition hover:bg-amber-100 dark:border-amber-600 dark:bg-amber-900/30 dark:text-amber-200 dark:hover:bg-amber-900/50"
            >
              サイト情報を編集
              <ExternalLink className="h-3 w-3" />
            </Link>
          )
        )}
      </div>
    </div>
  );
}
