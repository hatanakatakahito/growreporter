import { useEffect } from 'react';
import { setPageTitle } from '../../../utils/pageTitle';

/**
 * ユーザー一覧
 */
export default function UserList() {
  useEffect(() => {
    setPageTitle('ユーザー管理');
  }, []);

  return (
    <div>
      <h2 className="mb-6 text-2xl font-bold text-dark dark:text-white">
        ユーザー管理
      </h2>
      <div className="rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
        <p className="text-body-color dark:text-dark-6">
          ユーザー一覧機能は次のステップで実装します
        </p>
      </div>
    </div>
  );
}

