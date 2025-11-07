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
   */
  const checkCanGenerate = () => {
    if (!userProfile) return false;
    if (plan.id === 'paid') return true;
    const used = userProfile?.planLimits?.aiGenerationsUsed || 0;
    return used < plan.aiGenerationsPerMonth;
  };

  /**
   * 残りAI生成回数を取得
   * @returns {number} 残り回数（有料プランの場合は-1）
   */
  const getRemainingGenerations = () => {
    if (!userProfile) return 0;
    if (plan.id === 'paid') return -1; // 無制限
    const used = userProfile?.planLimits?.aiGenerationsUsed || 0;
    return Math.max(0, plan.aiGenerationsPerMonth - used);
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
   * 今月の使用回数を取得
   */
  const getUsedGenerations = () => {
    if (!userProfile) return 0;
    return userProfile?.planLimits?.aiGenerationsUsed || 0;
  };

  return {
    plan,
    checkCanGenerate,
    getRemainingGenerations,
    getRemainingByType,
    getUsedGenerations,
    isLoading: !userProfile,
  };
}

