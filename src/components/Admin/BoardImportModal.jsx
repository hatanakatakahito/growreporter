import { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../config/firebase';
import { Dialog, DialogTitle, DialogBody, DialogActions } from '../ui/dialog';
import { Button } from '../ui/button';
import { Download, AlertCircle, CheckCircle2, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * board から見積を取り込んで upgradeInquiries を作成するモーダル（§15）
 *
 * フロー:
 *   ① 入力ステップ: board 案件 ID 入力 → プレビュー取得（dryRun）
 *   ② プレビューステップ: 顧客情報・明細・判別結果を表示
 *   ③ オプション選択ステップ: ユーザー作成 / mergeStrategy などを選択
 *   ④ 取り込み実行
 *   ⑤ 完了
 */
export default function BoardImportModal({ isOpen, onClose, onImported }) {
  const [step, setStep] = useState('input'); // input | preview | done
  const [boardProjectId, setBoardProjectId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [createUser, setCreateUser] = useState(false);
  const [mergeStrategy, setMergeStrategy] = useState('add');
  const [importResult, setImportResult] = useState(null);

  const reset = () => {
    setStep('input');
    setBoardProjectId('');
    setPreviewData(null);
    setCreateUser(false);
    setMergeStrategy('add');
    setImportResult(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handlePreview = async () => {
    if (!boardProjectId.trim()) {
      toast.error('board 案件 ID を入力してください');
      return;
    }
    setIsLoading(true);
    try {
      const fn = httpsCallable(functions, 'importBoardProject');
      const result = await fn({
        boardProjectId: boardProjectId.trim(),
        dryRun: true,
      });
      if (result.data?.success) {
        setPreviewData(result.data);
        setStep('preview');
      } else {
        toast.error('プレビュー取得に失敗しました');
      }
    } catch (err) {
      console.error('[BoardImportModal] preview error:', err);
      toast.error(err?.message || 'プレビュー取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async () => {
    if (!previewData || previewData.isDuplicate) return;
    setIsLoading(true);
    try {
      const fn = httpsCallable(functions, 'importBoardProject');
      const result = await fn({
        boardProjectId: boardProjectId.trim(),
        dryRun: false,
        createUserIfMissing: createUser && !previewData.existingUserMatchedUid,
        mergeStrategy,
      });
      if (result.data?.success) {
        setImportResult(result.data);
        setStep('done');
        toast.success('取り込みが完了しました');
        if (onImported) onImported(result.data);
      } else {
        toast.error('取り込みに失敗しました');
      }
    } catch (err) {
      console.error('[BoardImportModal] import error:', err);
      toast.error(err?.message || '取り込みに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const labelClass = 'text-xs font-medium text-body-color dark:text-dark-6';
  const valueClass = 'text-sm text-dark dark:text-white';

  // ── ステップ 1: 入力 ──
  if (step === 'input') {
    return (
      <Dialog open={isOpen} onClose={handleClose} size="lg">
        <DialogTitle>
          <div className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            board から見積を取り込む
          </div>
        </DialogTitle>
        <DialogBody>
          <p className="mb-4 text-sm text-body-color dark:text-dark-6">
            board 上で先行作成された案件の ID を入力してください。プレビュー画面で内容を確認したうえで取り込み実行できます。
          </p>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-dark dark:text-white">board 案件 ID</span>
            <input
              type="text"
              value={boardProjectId}
              onChange={(e) => setBoardProjectId(e.target.value)}
              placeholder="例: 96026646"
              className="w-full rounded-lg border border-stroke bg-white px-4 py-2.5 text-sm text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:bg-dark dark:text-white"
              disabled={isLoading}
              onKeyDown={(e) => { if (e.key === 'Enter') handlePreview(); }}
            />
          </label>
          <p className="mt-2 text-xs text-body-color">
            ※ board の案件詳細画面の URL末尾に表示される数字 ID です
          </p>
          <a
            href="https://the-board.jp/projects"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            board で案件を確認する
            <ExternalLink className="h-3 w-3" />
          </a>
        </DialogBody>
        <DialogActions>
          <Button variant="ghost" onClick={handleClose} disabled={isLoading}>キャンセル</Button>
          <Button variant="primary" onClick={handlePreview} disabled={isLoading || !boardProjectId.trim()}>
            {isLoading ? '取得中...' : 'プレビューを取得'}
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  // ── ステップ 2: プレビュー + オプション選択 ──
  if (step === 'preview' && previewData) {
    const extras = Number(previewData.extraSitesCount) || 0;
    const isDuplicate = previewData.isDuplicate;
    const matched = !!previewData.existingUserMatchedUid;
    const existingExtras = previewData.existingExtraSites?.extraSitesCount ?? 0;

    return (
      <Dialog open={isOpen} onClose={handleClose} size="2xl">
        <DialogTitle>取り込みプレビュー</DialogTitle>
        <DialogBody className="!overflow-y-auto" style={{ maxHeight: 'calc(85vh - 140px)' }}>
          {isDuplicate && (
            <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 p-3 dark:bg-red-900/20">
              <AlertCircle className="mt-0.5 h-4 w-4 text-red-600" />
              <div className="text-sm text-red-700 dark:text-red-300">
                この board 案件は既に inquiry <code className="font-mono">{previewData.duplicateInquiryId}</code> として取り込み済みです。
                重複取り込みはできません。
              </div>
            </div>
          )}

          {previewData.warnings?.length > 0 && (
            <div className="mb-4 rounded-lg bg-orange-50 p-3 dark:bg-orange-900/20">
              <div className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-orange-700 dark:text-orange-300">
                <AlertCircle className="h-4 w-4" /> 警告
              </div>
              <ul className="ml-5 list-disc text-xs text-orange-700 dark:text-orange-300">
                {previewData.warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </div>
          )}

          {/* 顧客情報 */}
          <div className="mb-4 rounded-lg border border-stroke p-4 dark:border-dark-3">
            <h4 className="mb-2 text-sm font-semibold text-dark dark:text-white">顧客情報（board）</h4>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <div className={labelClass}>組織名</div>
                <div className={valueClass}>{previewData.boardClient?.name || '-'}</div>
              </div>
              <div>
                <div className={labelClass}>担当者</div>
                <div className={valueClass}>
                  {previewData.primaryContact
                    ? `${previewData.primaryContact.last_name || ''} ${previewData.primaryContact.first_name || ''}`.trim()
                    : '-'}
                </div>
              </div>
              <div>
                <div className={labelClass}>メール</div>
                <div className={valueClass}>{previewData.primaryContact?.email || '-'}</div>
              </div>
              <div>
                <div className={labelClass}>電話番号</div>
                <div className={valueClass}>{previewData.boardClient?.tel || '-'}</div>
              </div>
              <div>
                <div className={labelClass}>住所</div>
                <div className={`${valueClass} col-span-1`}>
                  {previewData.boardClient
                    ? `${previewData.boardClient.zip ? '〒' + previewData.boardClient.zip + ' ' : ''}${previewData.boardClient.pref || ''}${previewData.boardClient.address1 || ''}${previewData.boardClient.address2 || ''}`.trim() || '-'
                    : '-'}
                </div>
              </div>
            </div>
          </div>

          {/* 契約 + 自動判別 */}
          <div className="mb-4 rounded-lg border border-stroke p-4 dark:border-dark-3">
            <h4 className="mb-2 text-sm font-semibold text-dark dark:text-white">契約情報・自動判別</h4>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <div className={labelClass}>契約期間</div>
                <div className={valueClass}>
                  {previewData.contractStartDate || '-'} 〜 {previewData.contractEndDate || '-'}
                </div>
              </div>
              <div>
                <div className={labelClass}>支払いタイミング</div>
                <div className={valueClass}>{previewData.paymentTiming === 'bulk' ? '一括請求' : '定期請求'}</div>
              </div>
              <div>
                <div className={labelClass}>申込種別（自動判別）</div>
                <div className={valueClass}>
                  <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-semibold ${
                    previewData.inquiryType === 'addon_only'
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {previewData.inquiryType === 'addon_only' ? '追加サイトオプションのみ' : '新規ビジネスプラン'}
                  </span>
                </div>
              </div>
              <div>
                <div className={labelClass}>追加サイト数</div>
                <div className={valueClass}>
                  {extras > 0 ? `${extras} サイト × ${previewData.extraSitesMonths} ヶ月` : 'なし'}
                </div>
              </div>
            </div>
          </div>

          {/* 見積明細 */}
          {previewData.estimateDetails?.length > 0 && (
            <div className="mb-4 rounded-lg border border-stroke p-4 dark:border-dark-3">
              <h4 className="mb-2 text-sm font-semibold text-dark dark:text-white">見積明細</h4>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-body-color dark:text-dark-6">
                    <th className="py-1">品目</th>
                    <th className="py-1 text-right">単価</th>
                    <th className="py-1 text-right">数量</th>
                    <th className="py-1 text-right">小計</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.estimateDetails.map((d, i) => (
                    <tr key={i} className="border-t border-stroke dark:border-dark-3">
                      <td className="py-1 text-dark dark:text-white">{d.description}</td>
                      <td className="py-1 text-right">¥{d.unit_price.toLocaleString()}</td>
                      <td className="py-1 text-right">{d.quantity}{d.unit}</td>
                      <td className="py-1 text-right font-medium text-dark dark:text-white">
                        ¥{(d.unit_price * d.quantity).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-2 text-right text-sm font-semibold text-dark dark:text-white">
                税抜合計: ¥{Number(previewData.boardEstimateTotal || 0).toLocaleString()}
              </div>
            </div>
          )}

          {/* ユーザー紐付け */}
          <div className="mb-4 rounded-lg border border-stroke p-4 dark:border-dark-3">
            <h4 className="mb-2 text-sm font-semibold text-dark dark:text-white">ユーザー紐付け</h4>
            {matched ? (
              <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
                <CheckCircle2 className="h-4 w-4" />
                既存 grow-reporter ユーザーが見つかりました（uid: <code className="font-mono">{previewData.existingUserMatchedUid}</code>）
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-orange-600 dark:text-orange-400">
                  <AlertCircle className="h-4 w-4" />
                  該当する grow-reporter ユーザーが見つかりません
                </div>
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={createUser}
                    onChange={(e) => setCreateUser(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-stroke text-primary"
                    disabled={isDuplicate}
                  />
                  <div>
                    <div className="text-dark dark:text-white">ユーザーアカウントも同時に作成する</div>
                    <div className="text-xs text-body-color">
                      ※ アカウント作成後、メールは送信されません。準備完了後に <code>/admin/users/{`{uid}`}</code> から「アカウント情報をメールで送信」ボタンで通知してください。
                    </div>
                  </div>
                </label>
              </div>
            )}
          </div>

          {/* mergeStrategy（既存 extras との競合解決） */}
          {matched && existingExtras > 0 && extras > 0 && (
            <div className="mb-4 rounded-lg border-2 border-orange-200 bg-orange-50 p-4 dark:border-orange-900/40 dark:bg-orange-900/10">
              <h4 className="mb-2 text-sm font-semibold text-orange-700 dark:text-orange-300">
                <AlertCircle className="mr-1 inline h-4 w-4" />
                既存 extras との競合
              </h4>
              <p className="mb-2 text-xs text-orange-700 dark:text-orange-300">
                対象ユーザーは既に extras={existingExtras} サイトを持っています。
                board 取り込みでは extras={extras} サイトです。どう取り扱いますか？
              </p>
              <div className="space-y-1.5">
                {[
                  { value: 'add', label: '加算', desc: `既存 ${existingExtras} + 取り込み ${extras} = ${existingExtras + extras} サイト` },
                  { value: 'overwrite', label: '上書き', desc: `取り込みの ${extras} サイトで置き換え` },
                  { value: 'max', label: '最大値', desc: `${Math.max(existingExtras, extras)} サイト（既存と取り込みの大きい方）` },
                ].map((opt) => (
                  <label key={opt.value} className="flex items-start gap-2 text-xs">
                    <input
                      type="radio"
                      name="mergeStrategy"
                      value={opt.value}
                      checked={mergeStrategy === opt.value}
                      onChange={(e) => setMergeStrategy(e.target.value)}
                      className="mt-0.5 h-3.5 w-3.5 text-primary"
                    />
                    <div>
                      <div className="font-medium text-dark dark:text-white">{opt.label}</div>
                      <div className="text-orange-700 dark:text-orange-300">{opt.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}
        </DialogBody>
        <DialogActions>
          <Button variant="ghost" onClick={() => setStep('input')} disabled={isLoading}>戻る</Button>
          <Button
            variant="primary"
            onClick={handleImport}
            disabled={isLoading || isDuplicate}
          >
            {isLoading ? '取り込み中...' : '取り込みを実行'}
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  // ── ステップ 3: 完了 ──
  if (step === 'done' && importResult) {
    return (
      <Dialog open={isOpen} onClose={handleClose} size="lg">
        <DialogTitle>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            取り込み完了
          </div>
        </DialogTitle>
        <DialogBody>
          <div className="mb-4 rounded-lg bg-green-50 p-4 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-300">
            board 案件 <code className="font-mono">{boardProjectId}</code> を grow-reporter に取り込みました。
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className={labelClass}>新 inquiry ID:</span>
              <code className="font-mono text-dark dark:text-white">{importResult.inquiryId}</code>
            </div>
            <div className="flex items-center gap-2">
              <span className={labelClass}>申込種別:</span>
              <span className={valueClass}>{importResult.inquiryType === 'addon_only' ? '追加サイトオプション' : '新規ビジネスプラン'}</span>
            </div>
            {importResult.uid && (
              <div className="flex items-center gap-2">
                <span className={labelClass}>紐付け uid:</span>
                <code className="font-mono text-dark dark:text-white">{importResult.uid}</code>
                {importResult.userCreatedDuringImport && (
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                    取り込み時に作成
                  </span>
                )}
              </div>
            )}
            {!importResult.uid && (
              <div className="rounded-lg bg-orange-50 p-3 text-xs text-orange-700 dark:bg-orange-900/20 dark:text-orange-300">
                ユーザー未紐付け。/admin/users から adminCreateUser でアカウント作成して inquiry と紐付けてください。
              </div>
            )}
          </div>

          {importResult.userCreatedDuringImport && importResult.uid && (
            <div className="mt-4 rounded-lg border border-primary/30 bg-blue-50 p-3 text-xs dark:border-primary/30 dark:bg-blue-900/10">
              <p className="mb-2 font-medium text-dark dark:text-white">次のアクション</p>
              <ol className="ml-5 list-decimal space-y-1 text-body-color dark:text-dark-6">
                <li>必要なら adminCreateSite でサイト登録を代行</li>
                <li>準備完了後、/admin/users/{importResult.uid} で「アカウント情報をメールで送信」ボタン押下</li>
                <li>顧客がパスワード設定 → ログイン</li>
                <li>このページに戻り、inquiry のステータスを「契約中」に変更してプラン反映</li>
              </ol>
              <a
                href={`/admin/users/${importResult.uid}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-primary hover:underline"
              >
                ユーザー詳細を開く <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}
        </DialogBody>
        <DialogActions>
          <Button variant="primary" onClick={handleClose}>閉じる</Button>
        </DialogActions>
      </Dialog>
    );
  }

  return null;
}
