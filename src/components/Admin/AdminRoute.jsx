import { Navigate } from 'react-router-dom';
import { useAdmin } from '../../hooks/useAdmin';
import LoadingSpinner from '../common/LoadingSpinner';

/**
 * 管理者権限のルート保護
 * 管理者のみアクセス可能
 */
export default function AdminRoute({ children }) {
  const { isAdmin, loading } = useAdmin();

  // ロード中
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  // 管理者権限がない場合はダッシュボードへリダイレクト
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

