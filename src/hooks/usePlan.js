import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { PLANS, isUnlimited } from '../constants/plans';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * プラン機能を管理するカスタムフック
 * メンバーの場合は、所属アカウントオーナーのプランと使用回数（合算）を取得
 */
export function usePlan() {
  const { currentUser, userProfile } = useAuth();
  const [planId, setPlanId] = useState('free');
  const [accountUsage, setAccountUsage] = useState({ aiSummaryUsage: 0, aiImprovementUsage: 0 });
  const [isLoadingPlan, setIsLoadingPlan] = useState(true);
  const plan = PLANS[planId] || PLANS.free;

  useEffect(() => {
    if (!userProfile || !currentUser?.uid) {
      setIsLoadingPlan(false);
      return;
    }

    const myUid = currentUser.uid;

    // アカウントオーナーのUIDを特定
    let accountOwnerId = userProfile.accountOwnerId;

    // fallback: memberships からオーナーIDを検出
    if (!accountOwnerId || accountOwnerId === myUid) {
      const memberships = userProfile.memberships || {};
      const ownerIds = Object.keys(memberships).filter(id => id !== myUid);
      if (ownerIds.length > 0) {
        accountOwnerId = ownerIds[0];
      }
    }

    const isMember = accountOwnerId && accountOwnerId !== myUid;

    if (isMember) {
      // メンバー: オーナーのドキュメントをリアルタイム監視（プラン + 使用回数）
      const unsubscribe = onSnapshot(
        doc(db, 'users', accountOwnerId),
        (ownerDoc) => {
          if (ownerDoc.exists()) {
            const ownerData = ownerDoc.data();
            setPlanId(ownerData.plan || 'free');
            setAccountUsage({
              aiSummaryUsage: ownerData.aiSummaryUsage || 0,
              aiImprovementUsage: ownerData.aiImprovementUsage || 0,
            });
          } else {
            // オーナーのドキュメントが見つからない場合は自分のプランを使用
            setPlanId(userProfile.plan || 'free');
            setAccountUsage({
              aiSummaryUsage: userProfile.aiSummaryUsage || 0,
              aiImprovementUsage: userProfile.aiImprovementUsage || 0,
            });
          }
          setIsLoadingPlan(false);
        },
        (error) => {
          console.error('Error listening to account owner:', error);
          setPlanId(userProfile.plan || 'free');
          setAccountUsage({
            aiSummaryUsage: userProfile.aiSummaryUsage || 0,
            aiImprovementUsage: userProfile.aiImprovementUsage || 0,
          });
          setIsLoadingPlan(false);
        }
      );

      return () => unsubscribe();
    } else {
      // オーナー: 自分のプランと使用回数を使用
      setPlanId(userProfile.plan || 'free');
      setAccountUsage({
        aiSummaryUsage: userProfile.aiSummaryUsage || 0,
        aiImprovementUsage: userProfile.aiImprovementUsage || 0,
      });
      setIsLoadingPlan(false);
    }
  }, [currentUser?.uid, userProfile]);

  /**
   * AI生成が可能かチェック（アカウント全体の合算使用回数で判定）
   * @param {string} type - 'summary' または 'improvement'
   * @returns {boolean} 生成可能ならtrue
   */
  const checkCanGenerate = (type = 'summary') => {
    const limit = type === 'summary'
      ? plan.features?.aiSummaryMonthly || 0
      : plan.features?.aiImprovementMonthly || 0;

    // 無制限チェック
    if (isUnlimited(limit)) return true;

    const used = type === 'summary'
      ? accountUsage.aiSummaryUsage
      : accountUsage.aiImprovementUsage;

    return used < limit;
  };

  /**
   * タイプ別の残りAI生成回数を取得（アカウント全体の合算）
   * @param {string} type - 'summary' または 'improvement'
   * @returns {number} 残り回数（無制限の場合は-1）
   */
  const getRemainingByType = (type) => {
    if (type === 'summary') {
      const limit = plan.features?.aiSummaryMonthly || 0;
      if (isUnlimited(limit)) return -1;
      return Math.max(0, limit - accountUsage.aiSummaryUsage);
    } else if (type === 'improvement') {
      const limit = plan.features?.aiImprovementMonthly || 0;
      if (isUnlimited(limit)) return -1;
      return Math.max(0, limit - accountUsage.aiImprovementUsage);
    }

    return 0;
  };

  /**
   * タイプ別の今月の使用回数を取得（アカウント全体の合算）
   * @param {string} type - 'summary' または 'improvement'
   * @returns {number} 使用回数
   */
  const getUsedByType = (type = 'summary') => {
    return type === 'summary'
      ? accountUsage.aiSummaryUsage
      : accountUsage.aiImprovementUsage;
  };

  /**
   * メンバーを招待可能かチェック
   * @param {number} currentMemberCount - 現在のメンバー数
   * @returns {boolean} 招待可能ならtrue
   */
  const checkCanInviteMember = (currentMemberCount = 0) => {
    if (!userProfile) return false;

    const maxMembers = plan.features?.maxMembers || 1;
    return currentMemberCount < maxMembers;
  };

  /**
   * 残り招待可能人数を取得
   * @param {number} currentMemberCount - 現在のメンバー数
   * @returns {number} 残り招待可能人数
   */
  const getRemainingMembers = (currentMemberCount = 0) => {
    if (!userProfile) return 0;

    const maxMembers = plan.features?.maxMembers || 1;
    return Math.max(0, maxMembers - currentMemberCount);
  };

  /**
   * 最大メンバー数を取得
   * @returns {number} 最大メンバー数
   */
  const getMaxMembers = () => {
    return plan.features?.maxMembers || 1;
  };

  return {
    plan,
    checkCanGenerate,
    getRemainingByType,
    getUsedByType,
    checkCanInviteMember,
    getRemainingMembers,
    getMaxMembers,
    isLoading: !userProfile || isLoadingPlan,
  };
}
