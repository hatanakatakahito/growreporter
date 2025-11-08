// サイト種別の選択肢
export const SITE_TYPES = [
  { value: 'corporate', label: 'コーポレートサイト' },
  { value: 'product', label: '製品サイト' },
  { value: 'service', label: 'サービスサイト' },
  { value: 'lp', label: 'LP' },
  { value: 'owned_media', label: 'オウンドメディア' },
  { value: 'ec', label: 'ECサイト' },
  { value: 'other', label: 'その他' },
];

// ビジネス形態の選択肢
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

