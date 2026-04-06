import { logger } from 'firebase-functions/v2';

const BASE_URL = 'https://api.the-board.jp/v1';
const MIN_REQUEST_INTERVAL_MS = 334; // 3req/秒制限

/**
 * board API クライアント
 * 見積・請求書SaaS「board」のREST APIを呼び出すユーティリティ
 */
export class BoardApiClient {
  /**
   * @param {string} apiKey - x-api-key ヘッダー
   * @param {string} apiToken - Bearer トークン
   */
  constructor(apiKey, apiToken) {
    this.apiKey = apiKey;
    this.apiToken = apiToken;
    this.lastRequestTime = 0;
  }

  /**
   * レート制限を考慮した共通HTTPリクエスト
   */
  async request(method, path, body = null) {
    // 3req/秒制限: 前回リクエストから334ms以上空ける
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < MIN_REQUEST_INTERVAL_MS) {
      await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL_MS - elapsed));
    }

    const url = `${BASE_URL}${path}`;
    const headers = {
      'x-api-key': this.apiKey,
      'Authorization': `Bearer ${this.apiToken}`,
      'Content-Type': 'application/json',
    };

    const options = { method, headers };
    if (body && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
      options.body = JSON.stringify(body);
    }

    this.lastRequestTime = Date.now();
    logger.info(`[board API] ${method} ${path}`, { body: body ? '(有り)' : '(なし)' });

    const response = await fetch(url, options);
    const responseText = await response.text();

    if (!response.ok) {
      const errorMsg = `board API エラー: ${response.status} ${response.statusText} - ${responseText}`;
      logger.error(`[board API] ${errorMsg}`, { method, path });
      throw new Error(errorMsg);
    }

    // 204 No Content
    if (response.status === 204 || !responseText) {
      return null;
    }

    return JSON.parse(responseText);
  }

  // ─── 顧客 ───

  /**
   * 顧客をキーワード検索
   * @param {string} keyword - 検索キーワード（組織名）
   * @returns {Array} 顧客一覧
   */
  async searchClients(keyword) {
    const encoded = encodeURIComponent(keyword);
    const data = await this.request('GET', `/clients?name_cont=${encoded}&response_group=small`);
    return data || [];
  }

  /**
   * 顧客を新規登録
   * @returns {{ id: number }} 作成された顧客
   */
  async createClient({ name, name_disp, zip, pref, address1, address2, tel, email }) {
    const body = {
      name,
      name_disp: name_disp || name,
    };
    if (zip) body.zip = zip;
    if (pref) body.pref = pref;
    if (address1) body.address1 = address1;
    if (address2) body.address2 = address2;
    if (tel) body.tel = tel;
    if (email) body.to = email;

    return this.request('POST', '/clients', body);
  }

  // ─── 顧客担当者 ───

  /**
   * 顧客の担当者一覧を取得
   * @param {number} clientId - 顧客ID
   * @returns {Array} 担当者一覧
   */
  async getContacts(clientId) {
    const data = await this.request('GET', `/contacts?client_id_eq=${clientId}&per_page=100`);
    return data || [];
  }

  /**
   * 顧客担当者を新規登録
   * @returns {{ id: number }} 作成された担当者
   */
  async createContact({ client_id, last_name, first_name, department, email }) {
    const body = { client_id, last_name };
    if (first_name) body.first_name = first_name;
    if (department) body.department = department;
    if (email) body.email = email;

    return this.request('POST', '/contacts', body);
  }

  // ─── 案件 ───

  /**
   * 案件を新規登録（見積書が自動生成される）
   * @param {Object} params
   * @param {string} params.name - 案件名
   * @param {number} params.client_id - 顧客ID
   * @param {number} params.invoice_timing_kbn - 請求タイミング（1=一括, 2=定期）
   * @param {number} params.payment_term_id - 支払条件ID
   * @param {string} [params.estimate_date] - 見積日（YYYY-MM-DD）
   * @param {number} [params.contact_id] - 担当者ID
   * @returns {{ id: number, estimates: Array, invoices: Array }}
   */
  async createProject({ name, client_id, invoice_timing_kbn, payment_term_id, estimate_date, invoice_date, contact_id, user_id, order_status, contract_start_date, contract_end_date, periodical_invoice_interval }) {
    const body = {
      name,
      client_id,
      invoice_timing_kbn,
      payment_term_id,
    };
    if (estimate_date) body.estimate_date = estimate_date;
    if (invoice_date) body.invoice_date = invoice_date;
    if (contact_id) body.contact_id = contact_id;
    if (user_id) body.user_id = user_id;
    if (order_status) body.order_status = order_status;
    if (contract_start_date) body.contract_start_date = contract_start_date;
    if (contract_end_date) body.contract_end_date = contract_end_date;
    if (periodical_invoice_interval) body.periodical_invoice_interval = periodical_invoice_interval;

    return this.request('POST', '/projects', body);
  }

  /**
   * 案件を取得（見積書IDなどを含むレスポンスグループ指定）
   * @param {number} projectId
   * @param {string} responseGroup - 'small' | 'large' | 'estimate' | 'invoice'
   */
  async getProject(projectId, responseGroup = 'estimate') {
    return this.request('GET', `/projects/${projectId}?response_group=${responseGroup}`);
  }

  // ─── 見積書 ───

  /**
   * 見積書を更新（品目・金額セット）
   * @param {number} estimateId - 見積書ID
   * @param {Object} params
   * @param {Array} params.details - 明細行の配列
   * @param {string} [params.valid_period] - 有効期限テキスト
   */
  async updateEstimate(estimateId, { details, valid_period, total, tax }) {
    const body = {};
    if (details) body.details = details;
    if (valid_period) body.valid_period = valid_period;
    if (total !== undefined) body.total = total;
    if (tax !== undefined) body.tax = tax;

    return this.request('PATCH', `/documents/estimates/${estimateId}`, body);
  }

  /**
   * 見積書を取得
   * @param {number} estimateId
   */
  async getEstimate(estimateId) {
    return this.request('GET', `/documents/estimates/${estimateId}`);
  }
}

/**
 * 環境変数からBoardApiClientを初期化するファクトリ
 */
export function createBoardClient() {
  const apiKey = process.env.BOARD_API_KEY;
  const apiToken = process.env.BOARD_API_TOKEN;

  if (!apiKey || !apiToken) {
    throw new Error('BOARD_API_KEY / BOARD_API_TOKEN が設定されていません');
  }

  return new BoardApiClient(apiKey, apiToken);
}
