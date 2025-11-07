import { useState } from 'react';
import { X, AlertCircle, Shield, UserPlus } from 'lucide-react';
import { ADMIN_ROLES, getAdminRoleLabel, getAdminRoleDescription } from '../../constants/adminRoles';
import { useAdminManagement } from '../../hooks/useAdminManagement';
import LoadingSpinner from '../common/LoadingSpinner';

/**
 * 管理者追加モーダル
 */
export default function AddAdminModal({ onClose, onSuccess }) {
  const { addAdmin } = useAdminManagement();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState(ADMIN_ROLES.VIEWER);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setError('メールアドレスを入力してください');
      return;
    }

    if (!reason.trim()) {
      setError('追加理由を入力してください');
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-lg rounded-lg border border-stroke bg-white p-6 shadow-xl dark:border-dark-3 dark:bg-dark-2">
        {/* ヘッダー */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <UserPlus className="h-5 w-5 text-primary" />
            </div>
            <h3 className="text-xl font-bold text-dark dark:text-white">
              管理者を追加
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-body-color transition hover:bg-gray-2 dark:text-dark-6 dark:hover:bg-dark-3"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* エラー表示 */}
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-red-600 dark:bg-red-900/20 dark:text-red-400">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        )}

        {/* 注意事項 */}
        <div className="mb-6 rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
          <p className="text-sm text-blue-600 dark:text-blue-400">
            追加するユーザーがFirebase Authenticationに登録されている必要があります。
          </p>
        </div>

        {/* フォーム */}
        <form onSubmit={handleSubmit}>
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

            {/* ロール選択 */}
            <div>
              <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                ロール <span className="text-red-500">*</span>
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
                      className="mt-1 h-4 w-4 text-primary focus:ring-primary"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-primary" />
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
                追加理由 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                rows={3}
                placeholder="管理者として追加する理由を入力してください"
                className="w-full rounded-lg border border-stroke bg-white px-4 py-2 text-dark focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark dark:text-white"
              />
            </div>
          </div>

          {/* ボタン */}
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-lg border border-stroke bg-white px-6 py-2 font-medium text-dark transition hover:bg-gray-2 disabled:opacity-50 dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:hover:bg-dark-3"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2 font-medium text-white transition hover:bg-primary/90 disabled:opacity-50"
            >
              {loading && <LoadingSpinner />}
              {loading ? '追加中...' : '追加'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

