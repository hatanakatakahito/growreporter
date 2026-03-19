import { useState } from 'react';
import { AlertCircle, Shield } from 'lucide-react';
import { ADMIN_ROLES, getAdminRoleLabel, getAdminRoleDescription } from '../../constants/adminRoles';
import LoadingSpinner from '../common/LoadingSpinner';
import { Dialog, DialogTitle, DialogBody, DialogActions } from '../ui/dialog';
import { Button } from '../ui/button';

/**
 * 管理者権限変更モーダル
 */
export default function AdminRoleModal({ admin, onClose, onSave }) {
  const [newRole, setNewRole] = useState(admin.role);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 管理者名を取得（lastName + firstName 優先、なければdisplayName）
  const getAdminName = () => {
    if (admin.lastName && admin.firstName) {
      return `${admin.lastName} ${admin.firstName}`;
    }
    return admin.displayName || admin.email;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (newRole === admin.role) {
      setError('変更する権限を選択してください');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await onSave(admin.uid, newRole, reason);
      onClose();
    } catch (err) {
      setError(err.message || '権限の変更に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onClose={onClose} size="lg">
      <DialogTitle>管理者権限変更</DialogTitle>

      <DialogBody>
        {/* エラー表示 */}
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-red-600 dark:bg-red-900/20 dark:text-red-400">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        )}

        {/* 管理者情報 */}
        <div className="mb-6 rounded-lg bg-gray-50 p-4 dark:bg-dark-3">
          <div className="text-sm text-body-color dark:text-dark-6">対象管理者</div>
          <div className="font-medium text-dark dark:text-white">{getAdminName()}</div>
          <div className="text-sm text-body-color dark:text-dark-6">{admin.email}</div>
          <div className="mt-2 text-sm">
            <span className="text-body-color dark:text-dark-6">現在の権限: </span>
            <span className="font-semibold text-dark dark:text-white">{getAdminRoleLabel(admin.role)}</span>
          </div>
        </div>

        {/* フォーム */}
        <form id="admin-role-form" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* 権限選択 */}
            <div>
              <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                新しい権限 <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2">
                {Object.values(ADMIN_ROLES).map((role) => (
                  <label
                    key={role}
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition ${
                      newRole === role
                        ? 'border-primary bg-primary/5 dark:bg-primary/10'
                        : 'border-stroke bg-white hover:border-primary/50 dark:border-dark-3 dark:bg-dark'
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={role}
                      checked={newRole === role}
                      onChange={(e) => setNewRole(e.target.value)}
                      className="mt-1 h-4 w-4 text-primary focus:ring-primary"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-primary" />
                        <span className="font-medium text-dark dark:text-white">
                          {getAdminRoleLabel(role)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-body-color dark:text-dark-6">
                        {getAdminRoleDescription(role)}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* 変更理由 */}
            <div>
              <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                変更理由
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="権限を変更する理由を入力してください（任意）"
                className="w-full rounded-lg border border-stroke bg-white px-4 py-2 text-dark focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark dark:text-white"
              />
            </div>
          </div>
        </form>
      </DialogBody>

      <DialogActions>
        <Button plain onClick={onClose} disabled={loading}>
          キャンセル
        </Button>
        <Button color="blue" type="submit" form="admin-role-form" disabled={loading}>
          {loading && <LoadingSpinner />}
          {loading ? '変更中...' : '変更'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
