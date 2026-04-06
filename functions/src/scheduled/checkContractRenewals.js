import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { sendEmailDirect } from '../utils/emailSender.js';

const CONSULTATION_TO_EMAIL = 'info@grow-reporter.com';

/**
 * 契約更新リマインダー（毎月1日 午前9時実行）
 * active状態の契約で、終了2ヶ月前/1ヶ月前にメール通知
 */
export async function checkContractRenewalsHandler() {
  const db = getFirestore();
  const appBaseUrl = process.env.APP_BASE_URL || process.env.APP_URL || 'https://grow-reporter.com';

  try {
    const snapshot = await db.collection('upgradeInquiries')
      .where('status', '==', 'active')
      .get();

    if (snapshot.empty) {
      logger.info('[contractRenewal] active契約なし');
      return;
    }

    const now = new Date();
    let reminder1Count = 0;
    let reminder2Count = 0;

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const { contractEndDate, companyName, renewalReminder1Sent, renewalReminder2Sent } = data;

      if (!contractEndDate) continue;

      const endDate = new Date(contractEndDate);
      const daysUntilEnd = Math.floor((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      // 2ヶ月前リマインド（60日以内、未送信）
      if (daysUntilEnd <= 60 && daysUntilEnd > 30 && !renewalReminder1Sent) {
        await sendRenewalReminder({
          inquiryId: doc.id,
          companyName,
          contractEndDate,
          reminderType: '1回目（2ヶ月前）',
          appBaseUrl,
        });
        await doc.ref.update({
          renewalReminder1Sent: true,
          updatedAt: FieldValue.serverTimestamp(),
        });
        reminder1Count++;
        logger.info('[contractRenewal] 2ヶ月前リマインド送信', { inquiryId: doc.id, companyName });
      }

      // 1ヶ月前リマインド（30日以内、未送信）
      if (daysUntilEnd <= 30 && daysUntilEnd > 0 && !renewalReminder2Sent) {
        await sendRenewalReminder({
          inquiryId: doc.id,
          companyName,
          contractEndDate,
          reminderType: '2回目（1ヶ月前）',
          appBaseUrl,
        });
        await doc.ref.update({
          renewalReminder2Sent: true,
          updatedAt: FieldValue.serverTimestamp(),
        });
        reminder2Count++;
        logger.info('[contractRenewal] 1ヶ月前リマインド送信', { inquiryId: doc.id, companyName });
      }
    }

    logger.info('[contractRenewal] 処理完了', {
      total: snapshot.size,
      reminder1Sent: reminder1Count,
      reminder2Sent: reminder2Count,
    });
  } catch (error) {
    logger.error('[contractRenewal] エラー', { error: error.message });
  }
}

async function sendRenewalReminder({ inquiryId, companyName, contractEndDate, reminderType, appBaseUrl }) {
  const subject = `【グローレポータ】契約更新のご確認（${companyName || '顧客名不明'}）`;
  const body = `以下の契約が更新時期を迎えます。対応をお願いします。

■ 問い合わせID：${inquiryId}
■ 組織名：${companyName || '（不明）'}
■ 契約終了日：${contractEndDate}
■ リマインド：${reminderType}

━━━━━━━━━━━━━━━━━━
問い合わせ管理画面で確認する
${appBaseUrl}/admin/inquiries

送信日時：${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}
`;

  await sendEmailDirect({
    to: CONSULTATION_TO_EMAIL,
    subject,
    text: body,
    html: body.replace(/\n/g, '<br>'),
  });
}
