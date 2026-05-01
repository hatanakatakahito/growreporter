import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { createBoardClient } from '../../utils/boardApiClient.js';
import { normalizeForCompare } from '../../utils/normalizeForCompare.js';

/**
 * board の見積明細から inquiryType / extraSitesCount / extraSitesMonths を判別する。
 *
 * - 「グローレポータービジネスプラン」明細あり → new_business
 *   extras 明細もあれば extraSitesCount を逆算
 * - 「追加サイトオプション」のみ → addon_only
 *   extraSitesCount = unit_price / 15000 で逆算、extraSitesMonths = quantity
 *
 * @param {Array} details - board 見積書の details 配列
 * @returns {{
 *   inquiryType: 'new_business' | 'addon_only',
 *   extraSitesCount: number,
 *   extraSitesMonths: number,
 *   paymentTimingHint: 'bulk' | 'recurring',  // メイン明細の quantity から推定
 *   warnings: Array<string>
 * }}
 */
function parseInquiryFromBoardDetails(details) {
  const warnings = [];
  if (!Array.isArray(details) || details.length === 0) {
    return { inquiryType: 'new_business', extraSitesCount: 0, extraSitesMonths: 0, paymentTimingHint: 'recurring', warnings: ['明細がありません'] };
  }

  const businessKey = normalizeForCompare('グローレポータービジネスプラン');
  const extraKey = normalizeForCompare('グローレポーター追加サイトオプション');

  let mainDetail = null;
  let extraDetail = null;
  for (const d of details) {
    const desc = normalizeForCompare(d.description);
    if (desc === businessKey || desc.includes('ビジネスプラン')) {
      mainDetail = d;
    } else if (desc.startsWith(extraKey) || desc.includes('追加サイトオプション') || desc.includes('追加サイト')) {
      extraDetail = d;
    } else {
      warnings.push(`未知の明細: "${d.description}"（無視）`);
    }
  }

  let inquiryType = 'new_business';
  let extraSitesCount = 0;
  let extraSitesMonths = 0;
  let paymentTimingHint = 'recurring';

  if (mainDetail) {
    inquiryType = 'new_business';
    const mainQty = Number(mainDetail.quantity) || 1;
    paymentTimingHint = mainQty >= 12 ? 'bulk' : 'recurring';
  } else if (extraDetail) {
    inquiryType = 'addon_only';
  }

  if (extraDetail) {
    const unitPrice = Number(extraDetail.unit_price) || 0;
    const quantity = Number(extraDetail.quantity) || 0;
    // 単価 / 15000 で extras 数を逆算
    if (unitPrice > 0 && unitPrice % 15000 === 0) {
      extraSitesCount = unitPrice / 15000;
    } else if (unitPrice > 0) {
      // 単価が 15000 の倍数でない場合: description から数値抽出を試みる
      const m = String(extraDetail.description).match(/(\d+)\s*サイト/);
      if (m) {
        extraSitesCount = parseInt(m[1], 10);
      } else {
        warnings.push(`追加サイトの単価 ${unitPrice} が 15,000 の倍数ではありません。明細を確認してください。`);
        extraSitesCount = Math.round(unitPrice / 15000);
      }
    }
    extraSitesMonths = quantity;
  }

  return { inquiryType, extraSitesCount, extraSitesMonths, paymentTimingHint, warnings };
}

/**
 * board 案件を grow-reporter の upgradeInquiries に取り込む（§15）
 *
 * @param {Object} data - リクエスト
 * @param {number} data.boardProjectId - 取り込み対象の board 案件 ID
 * @param {string|null} [data.matchedUid] - admin が事前にマッチさせた uid
 * @param {boolean} [data.createUserIfMissing] - uid 未マッチ時にサイレントでユーザーを作成するか（デフォルト false）
 * @param {boolean} [data.dryRun] - true なら DB 書き込まずに判別結果のみ返す（preview 用）
 * @param {string} [data.mergeStrategy] - 'overwrite' | 'add' | 'max' （extras 既存値との競合解決、§21-B）
 * @param {string|null} [data.renewedFromInquiryId] - renewal の場合、元 inquiry ID（§21-C）
 * @returns {Object}
 */
export const importBoardProjectCallable = async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'ユーザー認証が必要です');
  }

  const {
    boardProjectId,
    matchedUid = null,
    createUserIfMissing = false,
    dryRun = false,
    mergeStrategy = 'add',
    renewedFromInquiryId = null,
  } = request.data || {};

  if (!boardProjectId || (typeof boardProjectId !== 'string' && typeof boardProjectId !== 'number')) {
    throw new HttpsError('invalid-argument', 'boardProjectId は必須です');
  }

  if (!['overwrite', 'add', 'max'].includes(mergeStrategy)) {
    throw new HttpsError('invalid-argument', `mergeStrategy は 'overwrite' | 'add' | 'max' のいずれかです`);
  }

  try {
    const db = getFirestore();

    // 管理者権限チェック（admin / editor）
    const adminDoc = await db.collection('adminUsers').doc(uid).get();
    if (!adminDoc.exists || !['admin', 'editor'].includes(adminDoc.data()?.role)) {
      throw new HttpsError('permission-denied', '管理者権限がありません');
    }

    // 重複チェック: 既に同じ boardProjectId を持つ inquiry が存在しないか
    const dupSnap = await db.collection('upgradeInquiries')
      .where('boardProjectId', '==', String(boardProjectId))
      .limit(1)
      .get();
    const numericDupSnap = await db.collection('upgradeInquiries')
      .where('boardProjectId', '==', Number(boardProjectId))
      .limit(1)
      .get();
    const duplicateInquiry = dupSnap.docs[0] || numericDupSnap.docs[0] || null;
    const isDuplicate = !!duplicateInquiry;

    if (isDuplicate && !dryRun) {
      throw new HttpsError(
        'already-exists',
        `この案件 (boardProjectId=${boardProjectId}) は既に inquiry ${duplicateInquiry.id} として取り込み済みです`,
      );
    }

    // board API で取得
    // response_group='large' で顧客情報・見積書ともにフルデータを取得
    // ('estimate' だと client_id がレスポンスに含まれないことがあるため)
    const client = createBoardClient();
    const project = await client.getProject(boardProjectId, 'large');
    if (!project) {
      throw new HttpsError('not-found', `board 案件が見つかりません (id=${boardProjectId})`);
    }

    // board API レスポンス構造の差異を吸収:
    //   - top-level: project.client_id (snake) / project.clientId (camel)
    //   - nested: project.client.id (object 形式)
    const boardClientId = project.client_id
      || project.clientId
      || project.client?.id
      || (Array.isArray(project.clients) && project.clients[0]?.id)
      || null;

    if (!boardClientId) {
      // デバッグログ: どんなフィールドがあるか
      logger.warn('[importBoardProject] client_id が見つからないレスポンス構造', {
        boardProjectId,
        availableKeys: Object.keys(project),
        clientFieldType: typeof project.client,
      });
      throw new HttpsError(
        'failed-precondition',
        `案件に顧客 ID が見つかりません。board API レスポンスのキー: ${Object.keys(project).join(', ')}`,
      );
    }

    // 顧客情報・担当者を並列取得
    const [boardClient, contacts] = await Promise.all([
      client.getClient(boardClientId).catch((err) => {
        logger.warn('[importBoardProject] getClient エラー', { error: err.message });
        return null;
      }),
      client.getContacts(boardClientId).catch((err) => {
        logger.warn('[importBoardProject] getContacts エラー', { error: err.message });
        return [];
      }),
    ]);

    const primaryContact = (contacts && contacts.length > 0) ? contacts[0] : null;

    // 見積明細から inquiryType を判別
    const estimateDetails = project.estimate?.details || [];
    const parsed = parseInquiryFromBoardDetails(estimateDetails);

    // 支払いタイミング: project.invoice_timing_kbn を優先（1=bulk, 2=recurring）
    let paymentTiming = parsed.paymentTimingHint;
    if (project.invoice_timing_kbn === 1) paymentTiming = 'bulk';
    if (project.invoice_timing_kbn === 2) paymentTiming = 'recurring';

    // uid 解決
    const contactEmail = primaryContact?.email || null;
    let resolvedUid = matchedUid || null;
    let existingUserMatch = null;
    if (!resolvedUid && contactEmail) {
      const userQuery = await db.collection('users')
        .where('email', '==', contactEmail)
        .limit(2)
        .get();
      if (userQuery.size === 1) {
        existingUserMatch = userQuery.docs[0];
        resolvedUid = existingUserMatch.id;
      } else if (userQuery.size > 1) {
        parsed.warnings.push(`複数の grow-reporter ユーザーが email=${contactEmail} にマッチ。手動で紐付けが必要です。`);
      }
    }

    // 既存ユーザーの extras 検出（mergeStrategy 提示用）
    let existingExtraSites = null;
    if (existingUserMatch) {
      const ud = existingUserMatch.data();
      existingExtraSites = {
        extraSitesCount: Number(ud.extraSitesCount) || 0,
        extraSitesValidUntil: ud.extraSitesValidUntil?.toDate?.().toISOString() || null,
      };
    }

    // dryRun: ここまでの判別結果を返して終了
    if (dryRun) {
      return {
        success: true,
        dryRun: true,
        isDuplicate,
        duplicateInquiryId: duplicateInquiry?.id || null,
        boardProjectId,
        boardClientId,
        boardClient: boardClient ? {
          name: boardClient.name,
          name_disp: boardClient.name_disp,
          tel: boardClient.tel,
          address1: boardClient.address1,
          address2: boardClient.address2,
          pref: boardClient.pref,
          zip: boardClient.zip,
        } : null,
        primaryContact: primaryContact ? {
          last_name: primaryContact.last_name,
          first_name: primaryContact.first_name,
          email: primaryContact.email,
          department: primaryContact.department,
        } : null,
        contractStartDate: project.contract_start_date || null,
        contractEndDate: project.contract_end_date || null,
        paymentTiming,
        inquiryType: parsed.inquiryType,
        extraSitesCount: parsed.extraSitesCount,
        extraSitesMonths: parsed.extraSitesMonths,
        estimateDetails: estimateDetails.map((d) => ({
          description: d.description,
          unit_price: Number(d.unit_price) || 0,
          quantity: Number(d.quantity) || 0,
          unit: d.unit || '月',
        })),
        boardEstimateId: project.estimate?.id || null,
        boardEstimateTotal: parseFloat(project.estimate?.total) || 0,
        existingUserMatchedUid: resolvedUid,
        existingExtraSites,
        warnings: parsed.warnings,
      };
    }

    // ─── 本番実行（dryRun=false）───

    // ユーザー作成（必要なら）
    let userCreatedDuringImport = false;
    if (!resolvedUid && createUserIfMissing) {
      if (!contactEmail) {
        throw new HttpsError('failed-precondition', 'board 担当者にメールアドレスがないため、ユーザーを自動作成できません');
      }
      // adminCreateUser は admin role 限定。editor が createUserIfMissing=true で呼べないようガード
      if (adminDoc.data()?.role !== 'admin') {
        throw new HttpsError(
          'permission-denied',
          'ユーザーアカウントの自動作成は admin ロール限定です。editor は inquiry のみ取り込んでください（その後、admin が adminCreateUser でユーザー作成）',
        );
      }
      // adminCreateUser をサイレント呼出（sendWelcomeEmail=false 強制）
      const { adminCreateUserCallable } = await import('./adminCreateUser.js');
      const userName = (primaryContact?.last_name && primaryContact?.first_name)
        ? `${primaryContact.last_name} ${primaryContact.first_name}`
        : (primaryContact?.last_name
          || `${primaryContact?.first_name || ''}`.trim()
          || boardClient?.name
          || contactEmail.split('@')[0]);
      // 電話番号は board の顧客 tel のみから取得（数字のみ抽出）
      // adminCreateUser のバリデーションで phoneNumber 必須なので、無ければプレースホルダー
      const phoneDigits = (boardClient?.tel || '').replace(/[^0-9]/g, '');
      const createReq = {
        auth: request.auth,
        data: {
          email: contactEmail,
          name: userName,
          company: boardClient?.name || boardClient?.name_disp || '（未設定）',
          phoneNumber: phoneDigits || '00000000000',
          plan: 'free', // active 化時に business に変更される
          sendWelcomeEmail: false, // §16 で別途送信
        },
      };
      const createResult = await adminCreateUserCallable(createReq);
      if (createResult?.uid) {
        resolvedUid = createResult.uid;
        userCreatedDuringImport = true;
        logger.info('[importBoardProject] ユーザーをサイレント作成', { uid: resolvedUid, email: contactEmail });
      } else {
        throw new HttpsError('internal', 'ユーザーの自動作成に失敗しました');
      }
    }

    // mergeStrategy に基づく extras の最終値を決定
    let finalExtraSitesCount = parsed.extraSitesCount;
    if (existingExtraSites && existingUserMatch) {
      const oldExtra = existingExtraSites.extraSitesCount;
      if (mergeStrategy === 'overwrite') finalExtraSitesCount = parsed.extraSitesCount;
      else if (mergeStrategy === 'add') finalExtraSitesCount = oldExtra + parsed.extraSitesCount;
      else if (mergeStrategy === 'max') finalExtraSitesCount = Math.max(oldExtra, parsed.extraSitesCount);
    }

    // upgradeInquiries 作成
    const inquiryRef = db.collection('upgradeInquiries').doc();
    const inquiryDoc = {
      uid: resolvedUid,
      selectedPlan: 'business',
      companyName: boardClient?.name || boardClient?.name_disp || '',
      department: primaryContact?.department || '',
      lastName: primaryContact?.last_name || '',
      firstName: primaryContact?.first_name || '',
      phone: (boardClient?.tel || '').replace(/-/g, ''),
      email: contactEmail || '',
      zipCode: (boardClient?.zip || '').replace(/-/g, ''),
      prefecture: boardClient?.pref || '',
      city: boardClient?.address1 || '',
      building: boardClient?.address2 || '',
      paymentTiming,
      startDatePref: 'none',
      startMonth: null,
      message: '',
      status: 'estimate_created',
      source: 'board_import',
      createdAt: FieldValue.serverTimestamp(),

      // §15: 板取り込み情報
      inquiryType: parsed.inquiryType,
      extraSitesCount: finalExtraSitesCount,
      extraSitesMonths: parsed.extraSitesMonths,
      baseProjectId: parsed.inquiryType === 'addon_only' ? String(boardProjectId) : null,
      mergeStrategy,

      // §21-C: renewal 紐付け
      renewedFrom: renewedFromInquiryId,

      // §15-D: 取り込み履歴
      boardImportedAt: FieldValue.serverTimestamp(),
      boardImportedBy: uid,

      // board 紐付け
      boardClientId: String(boardClientId),
      boardProjectId: String(boardProjectId),
      boardEstimateId: project.estimate?.id ? String(project.estimate.id) : null,

      // 契約期間
      contractStartDate: project.contract_start_date || null,
      contractEndDate: project.contract_end_date || null,
    };
    await inquiryRef.set(inquiryDoc);

    // 監査ログ
    const adminData = adminDoc.data();
    const adminName = adminData.name
      || (adminData.lastName && adminData.firstName ? `${adminData.lastName} ${adminData.firstName}` : '')
      || adminData.displayName || adminData.email || 'Admin';
    await db.collection('adminActivityLogs').add({
      adminId: uid,
      adminName,
      action: 'inquiry_board_import',
      targetType: 'upgradeInquiry',
      targetId: inquiryRef.id,
      details: {
        boardProjectId: String(boardProjectId),
        boardClientId: String(boardClientId),
        inquiryType: parsed.inquiryType,
        extraSitesCount: finalExtraSitesCount,
        userCreatedDuringImport,
        resolvedUid,
        mergeStrategy,
        renewedFromInquiryId,
      },
      createdAt: FieldValue.serverTimestamp(),
    });

    logger.info('[importBoardProject] 取り込み完了', {
      inquiryId: inquiryRef.id,
      boardProjectId,
      uid: resolvedUid,
      userCreatedDuringImport,
    });

    return {
      success: true,
      inquiryId: inquiryRef.id,
      uid: resolvedUid,
      userCreatedDuringImport,
      inquiryType: parsed.inquiryType,
      extraSitesCount: finalExtraSitesCount,
      mergeStrategy,
      warnings: parsed.warnings,
    };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    logger.error('[importBoardProject] エラー', {
      adminId: uid,
      boardProjectId,
      error: error.message,
      stack: error.stack,
    });
    throw new HttpsError('internal', `board 取り込みに失敗: ${error.message}`);
  }
};
