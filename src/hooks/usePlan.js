import { useAuth } from '../contexts/AuthContext';
import { PLANS } from '../constants/plans';

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
    getUsedGenerations,
    isLoading: !userProfile,
  };
}

