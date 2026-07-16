import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { rebuildBoardEstimateForExtras } from '../../utils/boardEstimateCreator.js';

// 'completed' は 2026-04-30 に廃止（手動アーカイブ用途で実質未使用だったため）
// 既存の 'completed' データは表示のみ残し、新規 set / 遷移は不可
const VALID_STATUSES = ['new', 'estimate_created', 'contract_sent', 'active', 'cancelled', 'inquiry_cancelled'];

/**
 * 問い合わせステータス更新
 * activeにした場合、自動でupdateUserPlanを実行
 */
export const updateInquiryStatusCallable = async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'ユーザー認証が必要です');
  }

  try {
    const db = getFirestore();

    // 管理者権限チェック（admin/editorのみ）
    const adminDoc = await db.collection('adminUsers').doc(uid).get();
    if (!adminDoc.exists || !['admin', 'editor'].includes(adminDoc.data()?.role)) {
      throw new HttpsError('permission-denied', '管理者権限がありません');
    }

    const { inquiryId, status, adminNote } = request.data || {};

    if (!inquiryId || !status) {
      throw new HttpsError('invalid-argument', 'inquiryIdとstatusは必須です');
    }
    if (!VALID_STATUSES.includes(status)) {
      throw new HttpsError('invalid-argument', `無効なステータス: ${status}`);
    }

    const inquiryRef = db.collection('upgradeInquiries').doc(inquiryId);
    const inquiryDoc = await inquiryRef.get();
    if (!inquiryDoc.exists) {
      throw new HttpsError('not-found', '問い合わせが見つかりません');
    }

    const inquiryData = inquiryDoc.data();
    const oldStatus = inquiryData.status;

    // ステータス更新
    const updateData = {
      status,
      statusUpdatedAt: FieldValue.serverTimestamp(),
      statusUpdatedBy: uid,
    };
    if (adminNote !== undefined) {
      updateData.adminNote = adminNote;
    }
    await inquiryRef.update(updateData);

    // アクティビティログ記録
    const adminData = adminDoc.data();
    await db.collection('adminActivityLogs').add({
      adminId: uid,
      adminName: adminData.displayName || adminData.email || uid,
      action: 'inquiry_status_change',
      targetType: 'upgradeInquiry',
      targetId: inquiryId,
      details: { oldStatus, newStatus: status, adminNote: adminNote || null },
      createdAt: FieldValue.serverTimestamp(),
    });

    // active にした場合、自動でプラン変更 + 追加サイトオプション転記
    // - new_business: free → business に変更し、extras を上書き
    // - addon_only:   plan は触らず、extras を加算
    if (status === 'active' && inquiryData.uid) {
      try {
        const userRef = db.collection('users').doc(inquiryData.uid);
        const userDoc = await userRef.get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          const currentPlan = userData.plan || 'free';
          const inquiryType = inquiryData.inquiryType || 'new_business';
          const extraSitesCount = Number(inquiryData.extraSitesCount) || 0;
          const contractEndDate = inquiryData.contractEndDate
            ? new Date(inquiryData.contractEndDate)
            : null;
          const validExtraEnd = contractEndDate && !Number.isNaN(contractEndDate.getTime())
            ? Timestamp.fromDate(contractEndDate)
            : null;

          if (inquiryType === 'addon_only') {
            // セキュリティ: addon_only は対象ユーザーが既存案件のオーナーであることを確認
            const baseProjectId = inquiryData.baseProjectId;
            const userProjectId = userData.boardProjectId || userData.extraSitesBoardProjectId || null;
            if (!baseProjectId || baseProjectId !== userProjectId) {
              logger.warn('addon_only inquiry の baseProjectId がユーザーの案件と一致しません', {
                inquiryId,
                inquiryBaseProjectId: baseProjectId,
                userProjectId,
              });
              // 不一致の場合でも管理者操作なので止めずログのみ。本番では reject すべきか要検討
            }

            const currentExtra = Number(userData.extraSitesCount) || 0;
            const newExtra = currentExtra + extraSitesCount;
            const userUpdate = {
              extraSitesCount: newExtra,
              extraSitesUpdatedAt: FieldValue.serverTimestamp(),
              updatedAt: FieldValue.serverTimestamp(),
            };
            if (validExtraEnd) userUpdate.extraSitesValidUntil = validExtraEnd;
            if (baseProjectId) {
              userUpdate.extraSitesBoardProjectId = baseProjectId;
              // v5.8.0: 既存 Business ユーザーで boardProjectId が users 側に
              // 未設定なら addon 経由で同期しておく（次回以降の addon 申込の用 fallback）
              if (!userData.boardProjectId) {
                userUpdate.boardProjectId = baseProjectId;
              }
            }
            await userRef.update(userUpdate);

            logger.info('addon_only active 化: extraSites 加算', {
              inquiryId,
              userId: inquiryData.uid,
              addedCount: extraSitesCount,
              newTotal: newExtra,
            });

            // §15-D-0: board 見積を「現在の総 extras」で再構築
            // メイン明細はそのまま、追加サイト明細を 1 行に統合
            if (baseProjectId && inquiryData.contractEndDate) {
              try {
                await rebuildBoardEstimateForExtras({
                  boardProjectId: baseProjectId,
                  totalExtras: newExtra,
                  contractEndDate: inquiryData.contractEndDate,
                  excludeCurrentMonth: false,
                });
                logger.info('addon_only active: board 見積再構築完了', {
                  inquiryId, baseProjectId, newExtra,
                });
              } catch (rebuildErr) {
                // 再構築失敗は致命的でない（grow-reporter 側は更新済み）。warn のみ
                logger.warn('addon_only active: board 見積再構築失敗', {
                  inquiryId, error: rebuildErr.message,
                });
              }
            }
          } else if (currentPlan !== 'business') {
            // new_business: プラン変更 + extras 上書き + boardProjectId をユーザーに転記
            const userUpdate = {
              plan: 'business',
              aiSummaryUsage: 0,
              aiImprovementUsage: 0,
              extraSitesCount,
              extraSitesUpdatedAt: FieldValue.serverTimestamp(),
              updatedAt: FieldValue.serverTimestamp(),
            };
            if (validExtraEnd) userUpdate.extraSitesValidUntil = validExtraEnd;
            if (inquiryData.boardProjectId) {
              userUpdate.boardProjectId = inquiryData.boardProjectId;
              userUpdate.extraSitesBoardProjectId = inquiryData.boardProjectId;
            }
            await userRef.update(userUpdate);

            // プラン変更履歴
            await db.collection('users').doc(inquiryData.uid)
              .collection('planChangeHistory').add({
                userId: inquiryData.uid,
                oldPlan: currentPlan,
                newPlan: 'business',
                oldExtraSitesCount: Number(userData.extraSitesCount) || 0,
                newExtraSitesCount: extraSitesCount,
                changedBy: uid,
                changedByName: adminData.displayName || adminData.email || uid,
                reason: '問い合わせ管理からのプラン変更（自動）',
                changedAt: FieldValue.serverTimestamp(),
              });

            // プラン変更メール送信
            try {
              const { sendPlanChangeEmail } = await import('../../utils/emailSender.js');
              await sendPlanChangeEmail({
                toEmail: inquiryData.email || userData.email,
                userName: `${inquiryData.lastName || ''} ${inquiryData.firstName || ''}`.trim(),
                oldPlan: currentPlan,
                newPlan: 'business',
              });
            } catch (emailErr) {
              logger.warn('プラン変更メール送信失敗', { error: emailErr.message });
            }

            logger.info('問い合わせからプラン自動変更', {
              inquiryId,
              userId: inquiryData.uid,
              oldPlan: currentPlan,
              extraSitesCount,
            });
          } else if (extraSitesCount > 0) {
            // 既に business だが extras だけ更新する分岐（new_business 申込で重複時など）
            const userUpdate = {
              extraSitesCount,
              extraSitesUpdatedAt: FieldValue.serverTimestamp(),
              updatedAt: FieldValue.serverTimestamp(),
            };
            if (validExtraEnd) userUpdate.extraSitesValidUntil = validExtraEnd;
            if (inquiryData.boardProjectId) userUpdate.extraSitesBoardProjectId = inquiryData.boardProjectId;
            await userRef.update(userUpdate);
            logger.info('既 business ユーザーの extraSites を上書き', { inquiryId, userId: inquiryData.uid, extraSitesCount });
          }
        }
      } catch (planErr) {
        logger.error('プラン自動変更エラー', { error: planErr.message, inquiryId });
        // プラン変更失敗してもステータス変更は成功として返す
      }
    }

    // 解約にした場合の処理
    // - new_business: business → free にダウングレード + extras クリア
    // - addon_only:   plan は触らず、対象 inquiry の extraSitesCount だけ減算
    if (status === 'cancelled' && inquiryData.uid) {
      try {
        const userRef = db.collection('users').doc(inquiryData.uid);
        const userDoc = await userRef.get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          const currentPlan = userData.plan || 'free';
          const inquiryType = inquiryData.inquiryType || 'new_business';
          const cancelExtra = Number(inquiryData.extraSitesCount) || 0;

          if (inquiryType === 'addon_only' && cancelExtra > 0) {
            // 該当 inquiry 分のオプションだけ減算
            const currentExtra = Number(userData.extraSitesCount) || 0;
            const newExtra = Math.max(0, currentExtra - cancelExtra);
            await userRef.update({
              extraSitesCount: newExtra,
              extraSitesUpdatedAt: FieldValue.serverTimestamp(),
              updatedAt: FieldValue.serverTimestamp(),
            });
            logger.info('addon_only 解約: extraSites 減算', {
              inquiryId, userId: inquiryData.uid, cancelled: cancelExtra, newTotal: newExtra,
            });

            // §15-D-0: board 見積を「現在の総 extras」で再構築（月単位精算 = 当月除外）
            const baseProjectId = inquiryData.baseProjectId
              || userData.extraSitesBoardProjectId
              || userData.boardProjectId
              || null;
            const refContractEndDate = inquiryData.contractEndDate
              || (userData.extraSitesValidUntil?.toDate?.()?.toISOString?.()?.substring(0, 10))
              || null;
            if (baseProjectId && refContractEndDate) {
              try {
                await rebuildBoardEstimateForExtras({
                  boardProjectId: baseProjectId,
                  totalExtras: newExtra,
                  contractEndDate: refContractEndDate,
                  excludeCurrentMonth: true, // 月単位精算: 当月分は消化扱い、翌月以降を計上しない
                });
                logger.info('addon_only 解約: board 見積再構築完了', {
                  inquiryId, baseProjectId, newExtra,
                });
              } catch (rebuildErr) {
                logger.warn('addon_only 解約: board 見積再構築失敗', {
                  inquiryId, error: rebuildErr.message,
                });
              }
            }
          } else if (currentPlan === 'business') {
            // new_business 解約: プラン free + extras クリア
            await userRef.update({
              plan: 'free',
              extraSitesCount: 0,
              extraSitesValidUntil: null,
              extraSitesBoardProjectId: null,
              extraSitesUpdatedAt: FieldValue.serverTimestamp(),
              updatedAt: FieldValue.serverTimestamp(),
            });

            await db.collection('users').doc(inquiryData.uid)
              .collection('planChangeHistory').add({
                userId: inquiryData.uid,
                oldPlan: 'business',
                newPlan: 'free',
                oldExtraSitesCount: Number(userData.extraSitesCount) || 0,
                newExtraSitesCount: 0,
                changedBy: uid,
                changedByName: adminData.displayName || adminData.email || uid,
                reason: '解約による自動ダウングレード',
                changedAt: FieldValue.serverTimestamp(),
              });

            try {
              const { sendPlanChangeEmail } = await import('../../utils/emailSender.js');
              await sendPlanChangeEmail({
                toEmail: inquiryData.email || userData.email,
                userName: `${inquiryData.lastName || ''} ${inquiryData.firstName || ''}`.trim(),
                oldPlan: 'business',
                newPlan: 'free',
              });
            } catch (emailErr) {
              logger.warn('解約プラン変更メール送信失敗', { error: emailErr.message });
            }

            logger.info('解約によるプランダウングレード', {
              inquiryId, userId: inquiryData.uid,
            });
          }
        }
      } catch (planErr) {
        logger.error('解約プランダウングレードエラー', { error: planErr.message, inquiryId });
      }
    }

    logger.info('問い合わせステータス更新', { inquiryId, oldStatus, newStatus: status });
    return { success: true };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    logger.error('updateInquiryStatus error:', { error: error.message });
    throw new HttpsError('internal', 'ステータス更新に失敗しました');
  }
};
