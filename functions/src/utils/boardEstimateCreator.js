import { logger } from 'firebase-functions/v2';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { createBoardClient } from './boardApiClient.js';
import { normalizeForCompare } from './normalizeForCompare.js';
import { monthsUntilContractEnd } from './effectiveMaxSites.js';

const db = getFirestore();

// board支払条件ID: 翌月末払（月末締め翌月末払い）
const BOARD_PAYMENT_TERM_ID = 53931859;

// board自社担当者ID（畑中 孝仁）
const BOARD_USER_ID = 38518822;

// board受注ステータス: 3=見積中(低)
const BOARD_ORDER_STATUS = 3;

// 品目名（board品目マスタ登録済み）
const ITEM_NAME_BUSINESS = 'グローレポータービジネスプラン';
const ITEM_NAME_EXTRA_SITE = 'グローレポーター追加サイトオプション';

// 単価（税別）
const UNIT_PRICE_BUSINESS = 49800;
const UNIT_PRICE_EXTRA_SITE = 15000;

// 後方互換のための alias
const ITEM_NAME = ITEM_NAME_BUSINESS;
const UNIT_PRICE = UNIT_PRICE_BUSINESS;

/**
 * 申込内容から見積書の明細配列を生成する
 *
 * - new_business: メイン明細 + (extraSitesCount > 0 なら追加サイト明細)
 * - addon_only:   追加サイト明細のみ（メイン明細は除外）
 *
 * @param {Object} inquiryData - upgradeInquiries ドキュメント
 * @param {number} inquiryData.extraSitesCount - 追加サイト数（既定 0）
 * @param {number} inquiryData.extraSitesMonths - 追加サイトの課金月数
 *                  new_business: paymentTiming=bulk → 12, recurring → 1
 *                  addon_only:   メイン契約終了日までの残月数（フロント側で計算済み）
 * @param {string} inquiryData.inquiryType - 'new_business' | 'addon_only'
 * @param {string} inquiryData.paymentTiming - 'bulk' | 'recurring'
 * @returns {Array<Object>} board details 配列
 */
export function buildEstimateDetails(inquiryData) {
  const {
    paymentTiming,
    extraSitesCount = 0,
    extraSitesMonths,
    inquiryType = 'new_business',
  } = inquiryData;
  const details = [];

  // メイン明細（addon_only 以外）
  if (inquiryType !== 'addon_only') {
    const businessQuantity = paymentTiming === 'bulk' ? 12 : 1;
    details.push({
      description: ITEM_NAME_BUSINESS,
      unit_price: UNIT_PRICE_BUSINESS,
      quantity: businessQuantity,
      unit: '月',
      tax_rate: 10,
    });
  }

  // 追加サイト明細
  const extras = Number(extraSitesCount) || 0;
  if (extras > 0) {
    let extraQuantity;
    if (inquiryType === 'addon_only') {
      // 残月数で課金（最低 1）
      extraQuantity = Math.max(1, Number(extraSitesMonths) || 1);
    } else {
      // new_business: メインプランと同じ月数（bulk=12, recurring=1）
      extraQuantity = paymentTiming === 'bulk' ? 12 : 1;
    }
    details.push({
      description: `${ITEM_NAME_EXTRA_SITE}（${extras}サイト）`,
      unit_price: UNIT_PRICE_EXTRA_SITE * extras,
      quantity: extraQuantity,
      unit: '月',
      tax_rate: 10,
    });
  }

  return details;
}

/**
 * details 配列から税抜合計と税額を計算する
 *
 * @param {Array<Object>} details
 * @returns {{ total: number, tax: number }}
 */
export function calcEstimateTotals(details) {
  let total = 0;
  let tax = 0;
  for (const d of details) {
    const lineSubtotal = (Number(d.unit_price) || 0) * (Number(d.quantity) || 0);
    total += lineSubtotal;
    tax += Math.floor(lineSubtotal * (Number(d.tax_rate) || 0) / 100);
  }
  return { total, tax };
}

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

  // 電話番号をハイフン付きに整形（boardのバリデーション対応）
  const formatPhone = (p) => {
    if (!p) return undefined;
    const digits = p.replace(/[^0-9]/g, '');
    // 既にハイフン付きならそのまま返す
    if (p.includes('-') && digits.length >= 10) return p.replace(/[^0-9-]/g, '');
    // 11桁（携帯/IP電話）: 090-1234-5678
    if (digits.length === 11) return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
    // 10桁（固定電話）: 先頭2桁が02-09の場合は2-4-4、それ以外は3-3-4
    if (digits.length === 10) {
      const prefix2 = digits.slice(0, 2);
      if (['03', '04', '06'].includes(prefix2)) return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
      return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    return digits || undefined;
  };

  logger.info('[boardEstimate] 見積作成開始', { inquiryId, companyName, paymentTiming });

  // ── 1. 顧客の確認・作成 ──
  let boardClientId = null;

  // board APIで組織名を検索（name_cont=部分一致 → 完全一致 or 略称一致のみ採用）
  // 大文字小文字・スペース有無は同一視（'株式会社グロー' / '株式会社 グロー' / '株式会社 GROW' を同一マッチ）
  if (companyName) {
    const searchResult = await client.searchClients(companyName);
    if (searchResult && searchResult.length > 0) {
      const target = normalizeForCompare(companyName);
      const exactMatch = searchResult.find(
        c => normalizeForCompare(c.name) === target || normalizeForCompare(c.name_disp) === target
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
      tel: formatPhone(phone),
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

  // 明細をビルド（メインプラン + 追加サイトオプション）
  const details = buildEstimateDetails(inquiryData);
  const { total, tax } = calcEstimateTotals(details);

  await client.updateEstimate(boardEstimateId, {
    details,
    total,
    tax,
    valid_period: '御見積後2週間',
  });
  logger.info('[boardEstimate] 見積書更新完了', {
    boardEstimateId,
    detailsCount: details.length,
    extraSitesCount: inquiryData.extraSitesCount || 0,
    total,
    tax,
  });

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
  const { boardEstimateId } = existingBoardData;

  if (!boardEstimateId) {
    return createBoardEstimateFromInquiry(inquiryId, inquiryData, options);
  }

  // 既存見積書の更新を試みる。board側で削除済みなら新規作成にフォールバック
  const details = buildEstimateDetails(inquiryData);
  const { total, tax } = calcEstimateTotals(details);

  try {
    await client.updateEstimate(boardEstimateId, {
      details,
      total,
      tax,
      valid_period: '御見積後2週間',
    });
    logger.info('[boardEstimate] 既存見積書を更新', {
      inquiryId,
      boardEstimateId,
      detailsCount: details.length,
      extraSitesCount: inquiryData.extraSitesCount || 0,
      total,
      tax,
    });
    return existingBoardData;
  } catch (error) {
    logger.warn('[boardEstimate] 既存見積書の更新失敗、新規作成にフォールバック', { boardEstimateId, error: error.message });
    return createBoardEstimateFromInquiry(inquiryId, inquiryData, options);
  }
}

/**
 * 既存の board 案件の見積書に「追加サイトオプション」明細を上書き追記する
 *
 * 用途: 既存 Business ユーザーが addon_only で追加申込した場合、
 *        既存案件 (baseProjectId) の見積書に追加サイト明細を append し、
 *        新規案件は作成しない。
 *
 * @param {string} inquiryId - 新しい upgradeInquiries の ID（addon_only）
 * @param {Object} inquiryData - 申込データ（inquiryType='addon_only', extraSitesCount, extraSitesMonths, baseProjectId）
 * @param {Object} [options]
 * @returns {Promise<Object>}
 */
export async function addExtraSiteToExistingProject(inquiryId, inquiryData, options = {}) {
  const client = options.boardClient || createBoardClient();
  const { baseProjectId, extraSitesCount = 0, extraSitesMonths = 1 } = inquiryData;

  if (!baseProjectId) {
    throw new Error('addon_only inquiry には baseProjectId が必須です');
  }
  if (!(Number(extraSitesCount) > 0)) {
    throw new Error('addon_only inquiry には 1 件以上の extraSitesCount が必要です');
  }

  // 1. 既存案件・見積書を取得
  const project = await client.getProject(baseProjectId, 'estimate');
  if (!project) {
    throw new Error(`baseProject が見つかりません (project: ${baseProjectId})`);
  }
  const boardEstimateId = project?.estimate?.id;
  if (!boardEstimateId) {
    throw new Error(`既存見積書が見つかりません (project: ${baseProjectId})`);
  }

  const existingDetails = (project.estimate?.details || []).map((d) => ({
    description: d.description,
    unit_price: parseFloat(d.unit_price) || 0,
    quantity: parseFloat(d.quantity) || 0,
    unit: d.unit || '月',
    tax_rate: parseFloat(d.tax_rate) || 10,
  }));

  // 2. 追加明細をビルド（addon_only モードで extra のみ）
  const newDetails = buildEstimateDetails({
    ...inquiryData,
    inquiryType: 'addon_only',
    extraSitesCount,
    extraSitesMonths,
  });

  if (newDetails.length === 0) {
    throw new Error('追加明細が生成されませんでした');
  }

  // 3. 既存明細と結合（同じ description が既にある場合も追記とする = 別行で履歴が見える）
  const merged = [...existingDetails, ...newDetails];
  const { total, tax } = calcEstimateTotals(merged);

  await client.updateEstimate(boardEstimateId, {
    details: merged,
    total,
    tax,
    valid_period: '御見積後2週間',
  });
  logger.info('[boardEstimate] 既存見積書に追加サイト明細を append', {
    inquiryId,
    baseProjectId,
    boardEstimateId,
    addedDetails: newDetails.length,
    extraSitesCount,
    extraSitesMonths,
    total,
    tax,
  });

  // 4. 新しい inquiry ドキュメントには既存案件の ID を引き継ぐ
  await db.collection('upgradeInquiries').doc(inquiryId).update({
    boardClientId: project.client_id || null,
    boardProjectId: baseProjectId,
    boardEstimateId,
    boardError: null,
    status: 'estimate_created',
    statusUpdatedAt: FieldValue.serverTimestamp(),
    contractStartDate: project.contract_start_date || null,
    contractEndDate: project.contract_end_date || null,
  });

  return {
    boardClientId: project.client_id || null,
    boardProjectId: baseProjectId,
    boardEstimateId,
  };
}

/**
 * board の既存見積書を「現在の総 extras 数」で再構築する（§15-D-0 確定方針）。
 *
 * 既存メイン明細（ビジネスプラン）はそのまま保持し、追加サイト明細は一旦すべて削除して
 * 「追加サイトオプション × totalExtras × 残月」の 1 行で再追加する。
 *
 * これにより、addon 追加 / 解約のたびに append 型で積み重ならず、
 * 常に「現在の状態」を見積書に反映できる。
 *
 * @param {Object} params
 * @param {string} params.boardProjectId       既存案件 ID
 * @param {number} params.totalExtras          再構築後の総 extras 数（0 なら追加サイト明細削除）
 * @param {string} params.contractEndDate      メイン契約終了日（残月数計算に使用）
 * @param {Date} [params.now]                  計算基準日時（デフォルト: 現在）
 * @param {boolean} [params.excludeCurrentMonth]  cancelled 時に true → 残月から当月を除外（月単位精算）
 * @param {Object} [params.options]
 * @param {Object} [params.options.boardClient]   テスト用のクライアント注入
 * @returns {Promise<{ boardEstimateId, totalExtras, months, total, tax }>}
 */
export async function rebuildBoardEstimateForExtras({
  boardProjectId,
  totalExtras,
  contractEndDate,
  now = new Date(),
  excludeCurrentMonth = false,
  options = {},
}) {
  if (!boardProjectId) {
    throw new Error('rebuildBoardEstimateForExtras: boardProjectId は必須です');
  }

  const client = options.boardClient || createBoardClient();

  // 1. 最新の board 見積書を取得（admin の手動修正を尊重するため必ず最新を取る）
  const project = await client.getProject(boardProjectId, 'estimate');
  const boardEstimateId = project?.estimate?.id;
  if (!boardEstimateId) {
    throw new Error(`既存見積書が見つかりません (project: ${boardProjectId})`);
  }

  // 2. 既存明細から「メイン明細（ビジネスプラン）」だけを保持
  // normalizeForCompare で大文字小文字・スペース有無を吸収
  const existing = (project.estimate?.details || []).map((d) => ({
    description: d.description,
    unit_price: parseFloat(d.unit_price) || 0,
    quantity: parseFloat(d.quantity) || 0,
    unit: d.unit || '月',
    tax_rate: parseFloat(d.tax_rate) || 10,
  }));
  const mainItemKey = normalizeForCompare(ITEM_NAME_BUSINESS);
  const mainDetails = existing.filter((d) => {
    const desc = normalizeForCompare(d.description);
    return desc === mainItemKey || desc.includes('ビジネスプラン');
  });

  // 3. 残月数を計算（cancelled 時は当月除外 = -1、月単位精算ルール）
  let months = monthsUntilContractEnd(contractEndDate, now);
  if (excludeCurrentMonth) {
    months = Math.max(0, months - 1);
  }

  // 4. 新しい extras 明細を 1 行で構築（totalExtras=0 or months=0 ならスキップ）
  const safeExtras = Math.max(0, Number(totalExtras) || 0);
  const newExtraDetails = (safeExtras > 0 && months > 0) ? [{
    description: `${ITEM_NAME_EXTRA_SITE}（${safeExtras}サイト）`,
    unit_price: UNIT_PRICE_EXTRA_SITE * safeExtras,
    quantity: months,
    unit: '月',
    tax_rate: 10,
  }] : [];

  // 5. 結合して全置換 update
  const merged = [...mainDetails, ...newExtraDetails];
  const { total, tax } = calcEstimateTotals(merged);

  await client.updateEstimate(boardEstimateId, {
    details: merged,
    total,
    tax,
    valid_period: '御見積後2週間',
  });

  logger.info('[rebuildBoardEstimateForExtras] 再構築完了', {
    boardProjectId,
    boardEstimateId,
    totalExtras: safeExtras,
    months,
    excludeCurrentMonth,
    total,
    tax,
    detailsCount: merged.length,
  });

  return {
    boardEstimateId,
    totalExtras: safeExtras,
    months,
    total,
    tax,
  };
}
