import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from './common/LoadingSpinner';

/**
 * GrowGroup 社内スタッフ専用ルート保護
 * @grow-group.jp のメールアドレスを持つユーザーのみアクセス可能
 */
export default function GrowStaffRoute({ children }) {
  const { isGrowStaff, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!isGrowStaff) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
