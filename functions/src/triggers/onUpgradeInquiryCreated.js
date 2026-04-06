import { logger } from 'firebase-functions/v2';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { sendUpgradeInquiryEmail, sendBoardErrorNotificationEmail } from '../utils/emailSender.js';
import { createBoardEstimateFromInquiry, updateBoardEstimateFromInquiry } from '../utils/boardEstimateCreator.js';

const db = getFirestore();

/**
 * upgradeInquiries ドキュメント作成時の処理
 * 1. 管理者メール送信（全フォーム項目 + 管理画面リンク）
 * 2. 重複チェック（同一uidの未対応問い合わせがあれば上書き更新）
 * 3. board API で見積書を自動作成
 */
export async function onUpgradeInquiryCreatedHandler(event) {
  const data = event.data?.data();
  const inquiryId = event.params?.inquiryId;
  if (!data) {
    logger.warn('upgradeInquiry データなし', { id: inquiryId });
    return;
  }

  const {
    selectedPlan, companyName, department,
    lastName, firstName, phone, email, message,
    zipCode, prefecture, city, building,
    paymentTiming, startDatePref, startDate, startMonth,
    uid,
  } = data;

  // ── 1. 管理者メール送信 ──
  try {
    await sendUpgradeInquiryEmail({
      selectedPlan: selectedPlan || '',
      companyName: companyName || '',
      department: department || '',
      lastName: lastName || '',
      firstName: firstName || '',
      phone: phone || '',
      userEmail: email || '',
      zipCode: zipCode || '',
      prefecture: prefecture || '',
      city: city || '',
      building: building || '',
      paymentTiming: paymentTiming || '',
      startDatePref: startDatePref || '',
      startDate: startDate || '',
      startMonth: startMonth || '',
      message: message || '',
    });
    logger.info('アップグレードお問い合わせメール送信完了', { inquiryId, selectedPlan });
  } catch (error) {
    logger.error('アップグレードお問い合わせメール送信エラー', { error: error.message, inquiryId });
  }

  // ── 2. 重複チェック: 同一uidの未対応問い合わせがあれば古い方を統合済みにする ──
  if (uid) {
    const existingQuery = await db.collection('upgradeInquiries')
      .where('uid', '==', uid)
      .where('status', 'in', ['new', 'estimate_created'])
      .get();

    for (const doc of existingQuery.docs) {
      if (doc.id !== inquiryId) {
        await doc.ref.update({
          status: 'merged',
          mergedInto: inquiryId,
          statusUpdatedAt: FieldValue.serverTimestamp(),
        });
        logger.info('既存問い合わせを統合済みに変更', { existingId: doc.id, newId: inquiryId });
      }
    }
  }

  // ── 3. board API で見積書を毎回新規作成 ──
  try {
    await createBoardEstimateFromInquiry(inquiryId, data);
  } catch (error) {
    logger.error('board見積作成エラー', { error: error.message, inquiryId });
    // エラーをドキュメントに記録
    await db.collection('upgradeInquiries').doc(inquiryId).update({
      boardError: error.message,
      statusUpdatedAt: FieldValue.serverTimestamp(),
    });
    // 管理者にエラー通知メール
    await sendBoardErrorNotificationEmail({
      inquiryId,
      companyName: companyName || '',
      errorMessage: error.message,
    });
  }
}
