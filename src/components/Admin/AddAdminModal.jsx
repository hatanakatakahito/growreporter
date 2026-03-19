import { useState } from 'react';
import { AlertCircle, Shield, UserPlus } from 'lucide-react';
import { ADMIN_ROLES, getAdminRoleLabel, getAdminRoleDescription } from '../../constants/adminRoles';
import { useAdminManagement } from '../../hooks/useAdminManagement';
import LoadingSpinner from '../common/LoadingSpinner';
import { Dialog, DialogTitle, DialogDescription, DialogBody, DialogActions } from '../ui/dialog';
import { Button } from '../ui/button';

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
    <Dialog open={true} onClose={onClose} size="lg">
      <div className="-mx-(--gutter) -mt-(--gutter) mb-6 flex items-center justify-between border-b border-stroke rounded-t-2xl p-6 dark:border-dark-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <UserPlus className="h-5 w-5 text-primary" />
          </div>
          <DialogTitle className="truncate">管理者を追加</DialogTitle>
        </div>
      </div>

      <form id="add-admin-form" onSubmit={handleSubmit}>
        <DialogBody>
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
        </DialogBody>
      </form>

      <DialogActions>
        <Button plain onClick={onClose} disabled={loading}>
          キャンセル
        </Button>
        <Button color="blue" type="submit" form="add-admin-form" disabled={loading}>
          {loading && <LoadingSpinner />}
          {loading ? '追加中...' : '追加'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
