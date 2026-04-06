import { logger } from 'firebase-functions/v2';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { createBoardClient } from './boardApiClient.js';

const db = getFirestore();

// board支払条件ID: 翌月末払（月末締め翌月末払い）
const BOARD_PAYMENT_TERM_ID = 53931859;

// board自社担当者ID（畑中 孝仁）
const BOARD_USER_ID = 38518822;

// board受注ステータス: 3=見積中(低)
const BOARD_ORDER_STATUS = 3;

// 品目名（board品目マスタ登録済み）
const ITEM_NAME = 'グローレポータービジネスプラン';

// 単価（税別）
const UNIT_PRICE = 49800;

/**
 * 問い合わせデータからboard見積書を自動作成する
 *
 * フロー:
 * 1. board顧客の確認（既存 or 新規作成）
 * 2. board担当者作成
 * 3. board案件作成（見積書が自動生成される）
 * 4. 見積書に品目・金額をセット
 * 5. upgradeInquiriesドキュメントを更新
 *
 * @param {string} inquiryId - upgradeInquiries のドキュメントID
 * @param {Object} inquiryData - フォーム送信データ
 * @param {Object} [options]
 * @param {BoardApiClient} [options.boardClient] - テスト用にクライアントを注入可能
 */
export async function createBoardEstimateFromInquiry(inquiryId, inquiryData, options = {}) {
  const client = options.boardClient || createBoardClient();
  const {
    uid,
    companyName,
    department,
    lastName,
    firstName,
    phone,
    email,
    zipCode,
    prefecture,
    city,
    building,
    paymentTiming, // 'bulk' | 'recurring'
    startDatePref,
    startDate,
    startMonth,
  } = inquiryData;

  logger.info('[boardEstimate] 見積作成開始', { inquiryId, companyName, paymentTiming });

  // ── 1. 顧客の確認・作成 ──
  let boardClientId = null;

  // board APIで組織名を検索（name_cont=部分一致 → 完全一致 or 略称一致のみ採用）
  if (companyName) {
    const searchResult = await client.searchClients(companyName);
    if (searchResult && searchResult.length > 0) {
      // 顧客名（name）または略称（name_disp）で完全一致するものだけ採用
      const exactMatch = searchResult.find(
        c => c.name === companyName || c.name_disp === companyName
      );
      if (exactMatch) {
        boardClientId = exactMatch.id;
        logger.info('[boardEstimate] 既存顧客を自動紐づけ', { boardClientId, companyName, matchedName: exactMatch.name });
      }
    }
  }

  // それでもなければ新規作成
  if (!boardClientId) {
    const zip = zipCode ? zipCode.replace(/[^0-9]/g, '').replace(/(\d{3})(\d{4})/, '$1-$2') : undefined;
    const address1 = city || undefined;
    const address2 = building || undefined;

    const newClient = await client.createClient({
      name: companyName,
      name_disp: companyName,
      zip,
      pref: prefecture || undefined,
      address1,
      address2,
      tel: phone || undefined,
      email: email || undefined,
    });
    boardClientId = newClient.id;
    logger.info('[boardEstimate] 新規顧客作成', { boardClientId, companyName });
  }

  // usersドキュメントにboardClientIdを保存
  if (uid) {
    await db.collection('users').doc(uid).update({
      boardClientId,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  // ── 2. 担当者の確認・作成 ──
  let boardContactId = null;
  if (lastName) {
    // 既存担当者を検索（メールアドレス優先 → 姓でフォールバック）
    const existingContacts = await client.getContacts(boardClientId);
    let matchedContact = null;
    if (email) {
      matchedContact = existingContacts.find(c => c.email === email);
    }
    if (!matchedContact) {
      matchedContact = existingContacts.find(c => c.last_name === lastName);
    }
    if (matchedContact) {
      boardContactId = matchedContact.id;
      logger.info('[boardEstimate] 既存担当者を自動紐づけ', {
        boardContactId, matchedBy: matchedContact.email === email ? 'email' : 'last_name',
      });
    } else {
      const contact = await client.createContact({
        client_id: boardClientId,
        last_name: lastName,
        first_name: firstName || undefined,
        department: department || undefined,
        email: email || undefined,
      });
      boardContactId = contact.id;
      logger.info('[boardEstimate] 新規担当者作成', { boardContactId, lastName });
    }
  }

  // ── 3. 案件作成 ──
  // 見積日: 今日
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  // 契約開始月の決定:
  //   startMonth あり(例: "2026-07") → その月の1日
  //   startMonth なし → 翌月1日（申込月は無料）
  let contractStartDate;
  if (startDatePref === 'preferred' && (startMonth || startDate)) {
    // startMonth: "2026-07" 形式、旧startDate: "2026-07-01" 形式にも対応
    const monthStr = startMonth || (startDate ? startDate.substring(0, 7) : null);
    if (monthStr) {
      contractStartDate = `${monthStr}-01`;
    }
  }
  if (!contractStartDate) {
    // 翌月1日
    const now = new Date();
    now.setMonth(now.getMonth() + 1);
    now.setDate(1);
    contractStartDate = now.toISOString().split('T')[0];
  }
  // 契約終了日: 開始日から12ヶ月後の月末
  const startD = new Date(contractStartDate);
  const endD = new Date(startD);
  endD.setFullYear(endD.getFullYear() + 1);
  endD.setDate(endD.getDate() - 1);
  const contractEndDate = endD.toISOString().split('T')[0];

  // 請求タイミング: bulk=一括(1), recurring=定期(2)
  const invoiceTimingKbn = paymentTiming === 'bulk' ? 1 : 2;

  const projectData = {
    name: `グローレポータービジネスプラン - ${companyName}`,
    client_id: boardClientId,
    invoice_timing_kbn: invoiceTimingKbn,
    payment_term_id: BOARD_PAYMENT_TERM_ID,
    estimate_date: today,
    invoice_date: contractStartDate,
    user_id: BOARD_USER_ID,
    order_status: BOARD_ORDER_STATUS,
    contract_start_date: contractStartDate,
    contract_end_date: contractEndDate,
  };
  if (boardContactId) {
    projectData.contact_id = boardContactId;
  }
  // 定期請求の場合は請求間隔を毎年に
  if (invoiceTimingKbn === 2) {
    projectData.periodical_invoice_interval = 12;
  }

  const project = await client.createProject(projectData);
  const boardProjectId = project.id;
  logger.info('[boardEstimate] 案件作成', { boardProjectId });

  // ── 4. 見積書IDを取得して品目をセット ──
  const projectDetail = await client.getProject(boardProjectId, 'estimate');
  const boardEstimateId = projectDetail?.estimate?.id;

  if (!boardEstimateId) {
    throw new Error(`見積書IDが取得できませんでした (project: ${boardProjectId})`);
  }

  // 数量: 一括=12ヶ月、定期=1ヶ月
  const quantity = paymentTiming === 'bulk' ? 12 : 1;
  const total = UNIT_PRICE * quantity;
  const tax = Math.floor(total * 0.1);

  await client.updateEstimate(boardEstimateId, {
    details: [
      {
        description: ITEM_NAME,
        unit_price: UNIT_PRICE,
        quantity,
        unit: '月',
        tax_rate: 10,
      },
    ],
    total,
    tax,
    valid_period: '御見積後2週間',
  });
  logger.info('[boardEstimate] 見積書更新完了', { boardEstimateId, quantity, total, tax });

  // ── 5. upgradeInquiriesドキュメントを更新 ──
  await db.collection('upgradeInquiries').doc(inquiryId).update({
    boardClientId,
    boardContactId: boardContactId || null,
    boardProjectId,
    boardEstimateId,
    boardError: null,
    status: 'estimate_created',
    statusUpdatedAt: FieldValue.serverTimestamp(),
    contractStartDate: contractStartDate,
    contractEndDate: contractEndDate,
  });

  logger.info('[boardEstimate] 見積作成完了', {
    inquiryId,
    boardClientId,
    boardProjectId,
    boardEstimateId,
  });

  return { boardClientId, boardContactId, boardProjectId, boardEstimateId };
}

/**
 * 既存の問い合わせのboard見積を更新する（重複送信時）
 */
export async function updateBoardEstimateFromInquiry(inquiryId, inquiryData, existingBoardData, options = {}) {
  const client = options.boardClient || createBoardClient();
  const { paymentTiming } = inquiryData;
  const { boardEstimateId } = existingBoardData;

  if (!boardEstimateId) {
    return createBoardEstimateFromInquiry(inquiryId, inquiryData, options);
  }

  // 既存見積書の更新を試みる。board側で削除済みなら新規作成にフォールバック
  const quantity = paymentTiming === 'bulk' ? 12 : 1;
  const total = UNIT_PRICE * quantity;
  const tax = Math.floor(total * 0.1);

  try {
    await client.updateEstimate(boardEstimateId, {
      details: [
        {
          description: ITEM_NAME,
          unit_price: UNIT_PRICE,
          quantity,
          unit: '月',
          tax_rate: 10,
        },
      ],
      total,
      tax,
      valid_period: '御見積後2週間',
    });
    logger.info('[boardEstimate] 既存見積書を更新', { inquiryId, boardEstimateId, quantity, total, tax });
    return existingBoardData;
  } catch (error) {
    logger.warn('[boardEstimate] 既存見積書の更新失敗、新規作成にフォールバック', { boardEstimateId, error: error.message });
    return createBoardEstimateFromInquiry(inquiryId, inquiryData, options);
  }
}
