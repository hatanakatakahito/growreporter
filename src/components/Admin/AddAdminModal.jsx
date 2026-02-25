import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertCircle, Shield, UserPlus } from 'lucide-react';
import { ADMIN_ROLES, getAdminRoleLabel, getAdminRoleDescription } from '../../constants/adminRoles';
import { useAdminManagement } from '../../hooks/useAdminManagement';
import LoadingSpinner from '../common/LoadingSpinner';

/**
 * 管理者追加モーダル
 * ポータルで body 直下に描画し、親レイアウトの影響で崩れないようにする
 */
export default function AddAdminModal({ onClose, onSuccess }) {
  const { addAdmin } = useAdminManagement();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState(ADMIN_ROLES.VIEWER);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setError('メールアドレスを入力してください');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const result = await addAdmin(email, role, reason);
      onSuccess(result.message || '管理者を追加しました');
    } catch (err) {
      setError(err.message || '管理者の追加に失敗しました');
      setLoading(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
      <div
        className="flex max-h-[90vh] w-full min-w-[320px] max-w-lg flex-col overflow-hidden rounded-lg border border-stroke bg-white shadow-xl dark:border-dark-3 dark:bg-dark-2"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-admin-title"
      >
        {/* ヘッダー */}
        <div className="flex shrink-0 items-center justify-between border-b border-stroke p-6 dark:border-dark-3">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <UserPlus className="h-5 w-5 text-primary" />
            </div>
            <h3 id="add-admin-title" className="truncate text-xl font-bold text-dark dark:text-white">
              管理者を追加
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-1 text-body-color transition hover:bg-gray-2 dark:text-dark-6 dark:hover:bg-dark-3"
            aria-label="閉じる"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* フォーム: スクロール領域 + 固定フッター */}
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          {/* スクロール可能な本体 */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* エラー表示 */}
            {error && (
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-red-600 dark:bg-red-900/20 dark:text-red-400">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-4">
              {/* メールアドレス */}
              <div>
                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                  メールアドレス <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="admin@example.com"
                  className="w-full rounded-lg border border-stroke bg-white px-4 py-2 text-dark focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark dark:text-white"
                />
              </div>

              {/* 権限選択 */}
              <div>
                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                  権限 <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2">
                  {Object.values(ADMIN_ROLES).map((roleOption) => (
                    <label
                      key={roleOption}
                      className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition ${
                        role === roleOption
                          ? 'border-primary bg-primary/5 dark:bg-primary/10'
                          : 'border-stroke bg-white hover:border-primary/50 dark:border-dark-3 dark:bg-dark'
                      }`}
                    >
                      <input
                        type="radio"
                        name="role"
                        value={roleOption}
                        checked={role === roleOption}
                        onChange={(e) => setRole(e.target.value)}
                        className="mt-1 h-4 w-4 shrink-0 text-primary focus:ring-primary"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4 shrink-0 text-primary" />
                          <span className="font-medium text-dark dark:text-white">
                            {getAdminRoleLabel(roleOption)}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-body-color dark:text-dark-6">
                          {getAdminRoleDescription(roleOption)}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* 追加理由 */}
              <div>
                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                  追加理由
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  placeholder="管理者として追加する理由を入力してください"
                  className="w-full rounded-lg border border-stroke bg-white px-4 py-2 text-dark focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* 固定フッター */}
          <div className="shrink-0 border-t border-stroke p-6 dark:border-dark-3">
            <div className="flex flex-nowrap justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="shrink-0 rounded-lg border border-stroke bg-white px-6 py-2 font-medium text-dark transition hover:bg-gray-2 disabled:opacity-50 dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:hover:bg-dark-3"
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex shrink-0 items-center gap-2 rounded-lg bg-primary px-6 py-2 font-medium text-white transition hover:bg-primary/90 disabled:opacity-50"
              >
                {loading && <LoadingSpinner />}
                {loading ? '追加中...' : '追加'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );

  if (!mounted || typeof document === 'undefined') {
    return null;
  }

  return createPortal(modalContent, document.body);
}

