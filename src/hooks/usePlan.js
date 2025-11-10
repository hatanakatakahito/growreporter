import { useAuth } from '../contexts/AuthContext';
import { PLANS, isUnlimited } from '../constants/plans';

/**
 * プラン機能を管理するカスタムフック
 */
export function usePlan() {
  const { userProfile } = useAuth();
  const planId = userProfile?.plan || 'free';
  const plan = PLANS[planId] || PLANS.free; // フォールバック

  /**
   * AI生成が可能かチェック
   * @param {string} type - 'summary' または 'improvement'
   * @returns {boolean} 生成可能ならtrue
   */
  const checkCanGenerate = (type = 'summary') => {
    if (!userProfile) return false;
    
    const limit = type === 'summary' 
      ? plan.features?.aiSummaryMonthly || 0
      : plan.features?.aiImprovementMonthly || 0;
    
    // 無制限チェック
    if (isUnlimited(limit)) return true;
    
    const used = type === 'summary'
      ? userProfile.aiSummaryUsage || 0
      : userProfile.aiImprovementUsage || 0;
    
    return used < limit;
  };

  /**
   * タイプ別の残りAI生成回数を取得
   * @param {string} type - 'summary' または 'improvement'
   * @returns {number} 残り回数（無制限の場合は-1）
   */
  const getRemainingByType = (type) => {
    if (!userProfile) return 0;
    
    if (type === 'summary') {
      const limit = plan.features?.aiSummaryMonthly || 0;
      // 無制限チェック
      if (isUnlimited(limit)) return -1;
      
      const used = userProfile.aiSummaryUsage || 0;
      return Math.max(0, limit - used);
    } else if (type === 'improvement') {
      const limit = plan.features?.aiImprovementMonthly || 0;
      // 無制限チェック
      if (isUnlimited(limit)) return -1;
      
      const used = userProfile.aiImprovementUsage || 0;
      return Math.max(0, limit - used);
    }
    
    return 0;
  };

  /**
   * タイプ別の今月の使用回数を取得
   * @param {string} type - 'summary' または 'improvement'
   * @returns {number} 使用回数
   */
  const getUsedByType = (type = 'summary') => {
    if (!userProfile) return 0;
    return type === 'summary'
      ? userProfile.aiSummaryUsage || 0
      : userProfile.aiImprovementUsage || 0;
  };

  return {
    plan,
    checkCanGenerate,
    getRemainingByType,
    getUsedByType,
    isLoading: !userProfile,
  };
}

