import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';

/**
 * 管理者権限チェックフック
 * @returns {Object} { isAdmin, loading }
 */
export function useAdmin() {
  const { currentUser } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!currentUser) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      try {
        // adminUsersコレクションを確認
        const adminDoc = await getDoc(doc(db, 'adminUsers', currentUser.uid));
        
        if (adminDoc.exists()) {
          const role = adminDoc.data().role;
          // editor または admin のみ許可
          setIsAdmin(['editor', 'admin'].includes(role));
        } else {
          setIsAdmin(false);
        }
      } catch (error) {
        console.error('Admin check error:', error);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkAdminStatus();
  }, [currentUser]);

  return { isAdmin, loading };
}

