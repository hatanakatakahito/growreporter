import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { PLANS, isUnlimited, normalizePlanId } from '../constants/plans';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * プラン機能を管理するカスタムフック
 * メンバーの場合は、所属アカウントオーナーのプランと使用回数（合算）を取得
 */
export function usePlan() {
  const { currentUser, userProfile } = useAuth();
  const [planId, setPlanId] = useState('free');
  const [accountUsage, setAccountUsage] = useState({ aiSummaryUsage: 0, aiImprovementUsage: 0, aiChatUsage: 0, diagnosisUsage: 0, excelExportUsage: 0, pptxExportUsage: 0 });
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
            setPlanId(normalizePlanId(ownerData.plan));
            setAccountUsage({
              aiSummaryUsage: ownerData.aiSummaryUsage || 0,
              aiImprovementUsage: ownerData.aiImprovementUsage || 0,
              aiChatUsage: ownerData.aiChatUsage || 0,
              diagnosisUsage: ownerData.diagnosisUsage || 0,
              excelExportUsage: ownerData.excelExportUsage || 0,
              pptxExportUsage: ownerData.pptxExportUsage || 0,
            });
          } else {
            // オーナーのドキュメントが見つからない場合は自分のプランを使用
            setPlanId(normalizePlanId(userProfile.plan));
            setAccountUsage({
              aiSummaryUsage: userProfile.aiSummaryUsage || 0,
              aiImprovementUsage: userProfile.aiImprovementUsage || 0,
              aiChatUsage: userProfile.aiChatUsage || 0,
              diagnosisUsage: userProfile.diagnosisUsage || 0,
              excelExportUsage: userProfile.excelExportUsage || 0,
              pptxExportUsage: userProfile.pptxExportUsage || 0,
            });
          }
          setIsLoadingPlan(false);
        },
        (error) => {
          console.error('Error listening to account owner:', error);
          setPlanId(normalizePlanId(userProfile.plan));
          setAccountUsage({
            aiSummaryUsage: userProfile.aiSummaryUsage || 0,
            aiImprovementUsage: userProfile.aiImprovementUsage || 0,
            aiChatUsage: userProfile.aiChatUsage || 0,
            diagnosisUsage: userProfile.diagnosisUsage || 0,
            excelExportUsage: userProfile.excelExportUsage || 0,
            pptxExportUsage: userProfile.pptxExportUsage || 0,
          });
          setIsLoadingPlan(false);
        }
      );

      return () => unsubscribe();
    } else {
      // オーナー: 自分のプランと使用回数を使用
      setPlanId(normalizePlanId(userProfile.plan));
      setAccountUsage({
        aiSummaryUsage: userProfile.aiSummaryUsage || 0,
        aiImprovementUsage: userProfile.aiImprovementUsage || 0,
        aiChatUsage: userProfile.aiChatUsage || 0,
        diagnosisUsage: userProfile.diagnosisUsage || 0,
        excelExportUsage: userProfile.excelExportUsage || 0,
        pptxExportUsage: userProfile.pptxExportUsage || 0,
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
    const limitMap = {
      summary: plan.features?.aiSummaryMonthly || 0,
      improvement: plan.features?.aiImprovementMonthly || 0,
      chat: plan.features?.aiChatMonthly || 0,
      diagnosis: plan.features?.diagnosisMonthly || 0,
      excelExport: plan.features?.excelExportMonthly || 0,
      pptxExport: plan.features?.pptxExportMonthly || 0,
    };
    const limit = limitMap[type] ?? 0;

    // 無制限チェック
    if (isUnlimited(limit)) return true;

    const usageMap = {
      summary: accountUsage.aiSummaryUsage,
      improvement: accountUsage.aiImprovementUsage,
      chat: accountUsage.aiChatUsage,
      diagnosis: accountUsage.diagnosisUsage,
      excelExport: accountUsage.excelExportUsage,
      pptxExport: accountUsage.pptxExportUsage,
    };
    const used = usageMap[type] ?? 0;

    return used < limit;
  };

  const getRemainingByType = (type) => {
    const limitMap = {
      summary: plan.features?.aiSummaryMonthly || 0,
      improvement: plan.features?.aiImprovementMonthly || 0,
      chat: plan.features?.aiChatMonthly || 0,
      diagnosis: plan.features?.diagnosisMonthly || 0,
      excelExport: plan.features?.excelExportMonthly || 0,
      pptxExport: plan.features?.pptxExportMonthly || 0,
    };
    const usageMap = {
      summary: accountUsage.aiSummaryUsage,
      improvement: accountUsage.aiImprovementUsage,
      chat: accountUsage.aiChatUsage,
      diagnosis: accountUsage.diagnosisUsage,
      excelExport: accountUsage.excelExportUsage,
      pptxExport: accountUsage.pptxExportUsage,
    };

    const limit = limitMap[type];
    if (limit === undefined) return 0;
    if (isUnlimited(limit)) return -1;
    return Math.max(0, limit - (usageMap[type] ?? 0));
  };

  const getUsedByType = (type = 'summary') => {
    const usageMap = {
      summary: accountUsage.aiSummaryUsage,
      improvement: accountUsage.aiImprovementUsage,
      chat: accountUsage.aiChatUsage,
      diagnosis: accountUsage.diagnosisUsage,
      excelExport: accountUsage.excelExportUsage,
      pptxExport: accountUsage.pptxExportUsage,
    };
    return usageMap[type] ?? 0;
  };

  /**
   * メンバーを招待可能かチェック
   * @param {number} currentMemberCount - 現在のメンバー数
   * @returns {boolean} 招待可能ならtrue
   */
  const checkCanInviteMember = (currentMemberCount = 0) => {
    if (!userProfile) return false;

    const maxMembers = plan.features?.maxMembers || 1;
    if (isUnlimited(maxMembers)) return true;
    return currentMemberCount < maxMembers;
  };

  /**
   * 残り招待可能人数を取得
   * @param {number} currentMemberCount - 現在のメンバー数
   * @returns {number} 残り招待可能人数（-1は無制限）
   */
  const getRemainingMembers = (currentMemberCount = 0) => {
    if (!userProfile) return 0;

    const maxMembers = plan.features?.maxMembers || 1;
    if (isUnlimited(maxMembers)) return -1;
    return Math.max(0, maxMembers - currentMemberCount);
  };

  /**
   * 最大メンバー数を取得
   * @returns {number} 最大メンバー数
   */
  const getMaxMembers = () => {
    return plan.features?.maxMembers || 1;
  };

  const isFree = planId === 'free';

  return {
    plan,
    planId,
    isFree,
    checkCanGenerate,
    getRemainingByType,
    getUsedByType,
    checkCanInviteMember,
    getRemainingMembers,
    getMaxMembers,
    isLoading: !userProfile || isLoadingPlan,
  };
}
