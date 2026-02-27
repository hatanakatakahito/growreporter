/**
 * サイト種別・サイトの目的の value → 日本語ラベル（プロンプト用）
 * フロントの src/constants/siteOptions.js と対応
 */
export const SITE_TYPE_LABELS = {
  corporate: 'コーポレートサイト',
  service: 'サービスサイト',
  product: '製品サイト',
  recruit: '採用サイト',
  ir: 'IRサイト',
  lp: 'LPサイト',
  ec: 'ECサイト',
  owned_media: 'オウンドメディアサイト',
  intranet: '社内ポータルサイト',
  global: 'グローバルサイト',
  business_system: '業務系システムサイト',
  member: '会員サイト',
  other: 'その他',
};

export const SITE_PURPOSE_LABELS = {
  branding: '認知・ブランディング',
  lead: 'リード・問い合わせ獲得',
  sales: '販売',
  recruit: '採用',
  media: '情報発信',
  ir: '投資家向け（IR）',
  internal: '社内・業務利用',
  member: '会員獲得',
  other: 'その他',
};

/** 改善の軸（improvementFocus）value → プロンプト用文言 */
export const IMPROVEMENT_FOCUS_LABELS = {
  balance: 'バランス（まんべんなく）',
  acquisition: '集客力の向上',
  conversion: 'コンバージョン（成果）の向上',
  branding: 'ブランディングの向上',
  usability: 'ユーザービリティの向上',
  performance: 'パフォーマンスの向上',
};
