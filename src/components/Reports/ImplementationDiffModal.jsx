import { X, CheckCircle, AlertTriangle, HelpCircle } from 'lucide-react';

/**
 * 実装検証の Before/After 差分モーダル
 *
 * バッジ（検証済/変化未検出/検証不能）クリックで開き、
 * - 変更が検出されたフィールド一覧
 * - Before/After の主要フィールド対比
 * - Before/After スクショの左右対比
 * を表示する。
 */

const FIELD_LABELS = {
  metaTitle: 'メタタイトル',
  metaDescription: 'メタディスクリプション',
  headingStructure: '見出し構造',
  textLength: '文章量',
  ctaButtons: 'CTA ボタン',
  forms: 'フォーム',
  mainText: '本文テキスト',
};

function VerifiedBadge({ verified }) {
  if (verified === true) {
    return (
      <div className="inline-flex items-center gap-2 rounded-lg bg-green-100 px-3 py-1.5 dark:bg-green-900/30">
        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
        <span className="text-sm font-medium text-green-800 dark:text-green-300">実装検証済み</span>
      </div>
    );
  }
  if (verified === false) {
    return (
      <div className="inline-flex items-center gap-2 rounded-lg bg-amber-100 px-3 py-1.5 dark:bg-amber-900/30">
        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        <span className="text-sm font-medium text-amber-800 dark:text-amber-300">変化未検出</span>
      </div>
    );
  }
  return (
    <div className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-1.5 dark:bg-gray-700">
      <HelpCircle className="h-4 w-4 text-gray-500 dark:text-gray-400" />
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">検証不能</span>
    </div>
  );
}

function TextCompareRow({ label, before, after, changed }) {
  return (
    <div className={`rounded-lg border p-3 ${changed ? 'border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-900/10' : 'border-stroke bg-gray-50 dark:border-dark-3 dark:bg-dark-3'}`}>
      <div className="mb-1 flex items-center gap-2">
        <span className="text-xs font-semibold text-dark dark:text-white">{label}</span>
        {changed && <span className="rounded bg-amber-500 px-1.5 py-0.5 text-[10px] font-medium text-white">変更</span>}
      </div>
      <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
        <div>
          <div className="mb-0.5 text-[10px] text-body-color">Before</div>
          <div className="text-dark dark:text-white break-words">{before || '—'}</div>
        </div>
        <div>
          <div className="mb-0.5 text-[10px] text-body-color">After</div>
          <div className="text-dark dark:text-white break-words">{after || '—'}</div>
        </div>
      </div>
    </div>
  );
}

export default function ImplementationDiffModal({ isOpen, onClose, item }) {
  if (!isOpen || !item) return null;

  const ic = item.implementationCheck || {};
  const before = ic.beforeSnapshot || {};
  const after = ic.afterSnapshot || {};
  const diff = ic.diffResult || {};
  const verified = diff.implementationVerified;
  const changedFields = Array.isArray(diff.changedFields) ? diff.changedFields : [];
  const isChanged = (field) => changedFields.includes(field);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-lg bg-white shadow-xl dark:bg-dark-2">
        {/* ヘッダー */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-stroke bg-white px-6 py-4 dark:border-dark-3 dark:bg-dark-2">
          <div>
            <h3 className="text-lg font-semibold text-dark dark:text-white">実装検証の詳細</h3>
            <p className="mt-0.5 text-xs text-body-color">{item.title}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-body-color hover:bg-gray-100 dark:hover:bg-dark-3"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* コンテンツ */}
        <div className="space-y-5 px-6 py-5">
          {/* ステータス */}
          <div className="flex flex-col gap-2">
            <VerifiedBadge verified={verified} />
            {verified === null && diff.verificationError && (
              <p className="text-sm text-body-color">理由: {diff.verificationError}</p>
            )}
            {verified === false && (
              <p className="text-sm text-body-color">
                ページに有意な変更が検出されませんでした。実装されていない、または変更が小さすぎる可能性があります。
              </p>
            )}
            {verified === true && changedFields.length > 0 && (
              <p className="text-sm text-body-color">
                変更検出: {changedFields.map(f => FIELD_LABELS[f] || f).join('、')}
              </p>
            )}
          </div>

          {/* スクショ対比 */}
          {(before.screenshotUrl || after.screenshotUrl) && (
            <div>
              <div className="mb-2 text-sm font-semibold text-dark dark:text-white">スクリーンショット対比</div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <div className="mb-1 text-xs text-body-color">Before</div>
                  {before.screenshotUrl ? (
                    <img src={before.screenshotUrl} alt="Before" className="w-full rounded-lg border border-stroke dark:border-dark-3" />
                  ) : (
                    <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-stroke text-xs text-body-color dark:border-dark-3">取得なし</div>
                  )}
                </div>
                <div>
                  <div className="mb-1 text-xs text-body-color">After</div>
                  {after.screenshotUrl ? (
                    <img src={after.screenshotUrl} alt="After" className="w-full rounded-lg border border-stroke dark:border-dark-3" />
                  ) : (
                    <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-stroke text-xs text-body-color dark:border-dark-3">取得なし</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* テキスト対比 */}
          {(before.metaTitle || after.metaTitle || before.metaDescription || after.metaDescription) && (
            <div>
              <div className="mb-2 text-sm font-semibold text-dark dark:text-white">テキスト対比</div>
              <div className="space-y-2">
                <TextCompareRow
                  label={FIELD_LABELS.metaTitle}
                  before={before.metaTitle}
                  after={after.metaTitle}
                  changed={isChanged('metaTitle')}
                />
                <TextCompareRow
                  label={FIELD_LABELS.metaDescription}
                  before={before.metaDescription}
                  after={after.metaDescription}
                  changed={isChanged('metaDescription')}
                />
              </div>
            </div>
          )}

          {/* 構造変化（見出し・CTA・フォーム） */}
          {(isChanged('headingStructure') || isChanged('ctaButtons') || isChanged('forms') || isChanged('textLength') || isChanged('mainText')) && (
            <div>
              <div className="mb-2 text-sm font-semibold text-dark dark:text-white">構造的変化</div>
              <div className="space-y-2 text-xs">
                {isChanged('headingStructure') && (
                  <div className="rounded border border-amber-200 bg-amber-50 p-2 dark:border-amber-900/40 dark:bg-amber-900/10">
                    <strong>見出し構造: </strong>
                    h1={before.headingStructure?.h1 || 0} → {after.headingStructure?.h1 || 0} /
                    h2={before.headingStructure?.h2 || 0} → {after.headingStructure?.h2 || 0} /
                    h3={before.headingStructure?.h3 || 0} → {after.headingStructure?.h3 || 0}
                  </div>
                )}
                {isChanged('textLength') && (
                  <div className="rounded border border-amber-200 bg-amber-50 p-2 dark:border-amber-900/40 dark:bg-amber-900/10">
                    <strong>文章量: </strong>
                    {before.textLength || 0} 文字 → {after.textLength || 0} 文字
                  </div>
                )}
                {isChanged('ctaButtons') && (
                  <div className="rounded border border-amber-200 bg-amber-50 p-2 dark:border-amber-900/40 dark:bg-amber-900/10">
                    <strong>CTA ボタン: </strong>
                    {(before.ctaButtons || []).length} 個 → {(after.ctaButtons || []).length} 個
                  </div>
                )}
                {isChanged('forms') && (
                  <div className="rounded border border-amber-200 bg-amber-50 p-2 dark:border-amber-900/40 dark:bg-amber-900/10">
                    <strong>フォーム: </strong>
                    {(before.forms || []).length} 個 → {(after.forms || []).length} 個
                  </div>
                )}
                {isChanged('mainText') && (
                  <div className="rounded border border-amber-200 bg-amber-50 p-2 dark:border-amber-900/40 dark:bg-amber-900/10">
                    <strong>本文テキスト: </strong>
                    類似度 {diff.textSimilarity != null ? (diff.textSimilarity * 100).toFixed(1) : '—'}%（大きな書き換えあり）
                  </div>
                )}
              </div>
            </div>
          )}

          {/* URL 情報 */}
          {(before.targetUrl || after.targetUrl) && (
            <div className="rounded-lg bg-gray-50 p-3 text-xs text-body-color dark:bg-dark-3">
              <div>対象 URL: {before.targetUrl || after.targetUrl}</div>
              {before.isGlobalImprovement && (
                <div className="mt-1">※ サイト全体向け改善のため、トップページで代表検品</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
