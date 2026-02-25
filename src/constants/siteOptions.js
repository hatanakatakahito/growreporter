// サイト種別の選択肢（複数選択可能）
export const SITE_TYPES = [
  { value: 'corporate', label: 'コーポレートサイト' },
  { value: 'service', label: 'サービスサイト' },
  { value: 'product', label: '製品サイト' },
  { value: 'recruit', label: '採用サイト' },
  { value: 'ir', label: 'IRサイト' },
  { value: 'lp', label: 'LPサイト' },
  { value: 'ec', label: 'ECサイト' },
  { value: 'owned_media', label: 'オウンドメディアサイト' },
  { value: 'intranet', label: '社内ポータルサイト' },
  { value: 'global', label: 'グローバルサイト' },
  { value: 'business_system', label: '業務系システムサイト' },
  { value: 'member', label: '会員サイト' },
  { value: 'other', label: 'その他' },
];

// サイトの目的（複数選択可能・サイト種別を包含）
export const SITE_PURPOSES = [
  { value: 'branding', label: '認知・ブランディング' },
  { value: 'lead', label: 'リード・問い合わせ獲得' },
  { value: 'sales', label: '販売' },
  { value: 'recruit', label: '採用' },
  { value: 'media', label: '情報発信' },
  { value: 'ir', label: '投資家向け（IR）' },
  { value: 'internal', label: '社内・業務利用' },
  { value: 'member', label: '会員獲得' },
  { value: 'other', label: 'その他' },
];

// ビジネス形態の選択肢（廃止・既存データ表示用に残す）
export const BUSINESS_TYPES = [
  { 
    value: 'btob', 
    label: 'BtoB（企業向け）',
    description: '企業や法人を顧客対象としたビジネスモデルです。'
  },
  { 
    value: 'btoc', 
    label: 'BtoC（個人向け）',
    description: '一般消費者を顧客対象としたビジネスモデルです。'
  },
  { 
    value: 'btobtoc', 
    label: 'BtoBtoC（企業経由で個人）',
    description: '企業を通じて最終消費者にサービスや商品を提供するビジネスモデルです。'
  },
  { 
    value: 'other', 
    label: 'その他',
    description: 'どれにも当てはまらない、または複合的なビジネスモデルです。'
  },
];

