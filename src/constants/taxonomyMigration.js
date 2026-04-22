// 旧タクソノミー(V1) → 新タクソノミー(V2) の推定マップ
// 移行スクリプトと、編集モードで legacy サイトを開いた際のプレフィルで使う。

// --- SiteRole: (旧 siteType, 旧 sitePurpose) の組み合わせから推定 ---
// キー形式: `${旧siteType}|${旧sitePurpose}`
export const SITE_ROLE_INFERENCE = {
  'corporate|branding': 'corporate',
  'corporate|lead': 'corporate',
  'corporate|media': 'corporate',
  'corporate|recruit': 'corporate',
  'corporate|internal': 'closed',

  'service|lead': 'service_product',
  'service|sales': 'service_product',
  'service|branding': 'service_product',

  'product|sales': 'service_product',
  'product|lead': 'service_product',
  'product|branding': 'service_product',

  'lp|lead': 'service_product',
  'lp|sales': 'service_product',
  'lp|branding': 'service_product',

  'ec|sales': 'ec',
  'ec|branding': 'ec',
  'ec|media': 'ec',

  'recruit|recruit': 'recruit',
  'recruit|branding': 'recruit',
  'recruit|lead': 'recruit',

  'owned_media|media': 'owned_media',
  'owned_media|branding': 'owned_media',
  'owned_media|lead': 'owned_media',

  'ir|ir': 'closed',
  'ir|branding': 'closed',
  'member|member': 'closed',
  'member|internal': 'closed',
  'intranet|internal': 'closed',
  'business_system|internal': 'closed',

  'global|branding': 'corporate',
  'global|lead': 'corporate',
};

// --- SiteRole: 旧 siteType 単体のフォールバック ---
export const SITE_ROLE_FALLBACK_BY_TYPE = {
  corporate: 'corporate',
  service: 'service_product',
  product: 'service_product',
  lp: 'service_product',
  ec: 'ec',
  recruit: 'recruit',
  ir: 'closed',
  owned_media: 'owned_media',
  member: 'closed',
  intranet: 'closed',
  business_system: 'closed',
  global: 'corporate',
  other: 'other',
};

// --- SiteRole: 旧 sitePurpose 単体のフォールバック(siteType が無い場合) ---
export const SITE_ROLE_FALLBACK_BY_PURPOSE = {
  branding: 'corporate',
  lead: 'service_product',
  sales: 'service_product',
  recruit: 'recruit',
  media: 'owned_media',
  ir: 'closed',
  internal: 'closed',
  member: 'closed',
  other: 'other',
};

// --- 新 siteRole → 旧 siteType の逆引き(fetchImprovementKnowledge スプレッドシート互換) ---
// 既存のスプレッドシート(改善施策ナレッジ)は旧 siteType キーで行が分類されているため、
// V2 側から検索するときに旧キーへ戻すためのマップ。
export const SITE_ROLE_TO_LEGACY_TYPE = {
  corporate: 'corporate',
  service_product: 'service',
  ec: 'ec',
  owned_media: 'owned_media',
  recruit: 'recruit',
  closed: 'member',
  other: 'other',
};

// --- BusinessModel: 旧 businessType → 新 businessModel ---
export const BUSINESS_TYPE_TO_MODEL = {
  btob: 'b2b',
  btoc: 'b2c',
  btobtoc: 'b2b2c',
  other: 'other',
};

// --- Industry: 旧 industry(70サブ) → 新 {industryMajor, industryMinor} ---
// 小分類ラベルは新マスター(industriesV2.js)の表記に寄せている。
// 対応する新ラベルが存在しない旧値は `industryMinor: 'その他'` + 適切な major で吸収。
export const INDUSTRY_V1_TO_V2 = {
  // IT・Web・通信
  'SaaS・クラウド': { major: 'b2b_saas', minor: 'SaaS・クラウド' },
  'Webサービス': { major: 'b2b_saas', minor: 'Webサービス（BtoB）' },
  'EC・通販': { major: 'b2c_retail', minor: 'EC・通販' },
  'メディア・ポータル': { major: 'b2c_media', minor: 'メディア・ポータル' },
  'アプリ開発': { major: 'b2b_saas', minor: 'アプリ開発' },
  'Web制作・開発': { major: 'b2b_saas', minor: 'Web制作・開発' },
  'SI・システム開発': { major: 'b2b_saas', minor: 'SI・システム開発' },
  '通信・インフラ': { major: 'b2b_manufacturing', minor: '通信・インフラ' },

  // 製造業
  '機械・電機': { major: 'b2b_manufacturing', minor: '機械・電機' },
  '食品・飲料': { major: 'b2c_retail', minor: '食品・飲料（メーカー）' },
  '化学・素材': { major: 'b2b_manufacturing', minor: '化学・素材' },
  '自動車・部品': { major: 'b2b_manufacturing', minor: '自動車・部品（BtoB）' },
  '建材・住設': { major: 'b2b_manufacturing', minor: '建材・住設' },
  'その他製造': { major: 'b2b_manufacturing', minor: 'その他製造' },

  // 小売・EC
  'アパレル・ファッション': { major: 'b2c_retail', minor: 'アパレル・ファッション' },
  '食品・日用品': { major: 'b2c_retail', minor: '食品・日用品' },
  '家電・家具': { major: 'b2c_retail', minor: '家電・家具' },
  '雑貨・ギフト': { major: 'b2c_retail', minor: '雑貨・ギフト' },
  'その他小売': { major: 'b2c_retail', minor: 'その他小売' },

  // 金融・保険
  '銀行・証券': { major: 'finance', minor: '銀行・証券' },
  '保険': { major: 'finance', minor: '保険' },
  'フィンテック': { major: 'finance', minor: 'フィンテック' },
  '不動産投資': { major: 'finance', minor: '不動産投資' },
  'その他金融': { major: 'finance', minor: 'その他金融' },

  // 不動産・建設
  '売買仲介': { major: 'local_service', minor: '不動産売買仲介' },
  '賃貸管理': { major: 'local_service', minor: '不動産賃貸管理' },
  '建設・工事': { major: 'local_service', minor: '建設・工事' },
  'リフォーム・リノベ': { major: 'local_service', minor: 'リフォーム・リノベ' },
  'その他不動産': { major: 'local_service', minor: 'その他' },

  // 飲食・宿泊
  'レストラン・カフェ': { major: 'local_service', minor: 'レストラン・カフェ' },
  'デリバリー・テイクアウト': { major: 'local_service', minor: 'デリバリー・テイクアウト' },
  'ホテル・旅館': { major: 'b2c_experience', minor: 'ホテル・旅館' },
  '旅行・観光': { major: 'b2c_experience', minor: '旅行・観光' },
  'その他飲食宿泊': { major: 'local_service', minor: 'その他' },

  // 医療・福祉・美容
  '病院・クリニック': { major: 'local_service', minor: '病院・クリニック' },
  '歯科': { major: 'local_service', minor: '歯科' },
  '介護・福祉': { major: 'local_service', minor: '介護・福祉' },
  '美容・エステ': { major: 'local_service', minor: '美容・エステ' },
  '美容室・サロン': { major: 'local_service', minor: '美容室・サロン' },
  '薬局・ドラッグ': { major: 'local_service', minor: '薬局・ドラッグ' },
  'その他医療': { major: 'local_service', minor: 'その他' },

  // 教育・スクール
  '学校・大学': { major: 'public_education', minor: '学校・大学' },
  '学習塾・予備校': { major: 'local_service', minor: '学習塾・予備校' },
  'オンライン講座': { major: 'b2c_experience', minor: 'オンライン講座' },
  '資格・研修': { major: 'b2c_experience', minor: '資格・研修' },
  'その他教育': { major: 'public_education', minor: 'その他教育' },

  // 士業・コンサルティング
  '弁護士・法律事務所': { major: 'professional', minor: '弁護士・法律事務所' },
  '税理士・会計事務所': { major: 'professional', minor: '税理士・会計事務所' },
  '社労士・行政書士': { major: 'professional', minor: '社労士・行政書士' },
  '経営コンサルティング': { major: 'professional', minor: '経営コンサルティング' },
  'ITコンサルティング': { major: 'professional', minor: 'ITコンサルティング' },
  'その他士業': { major: 'professional', minor: 'その他士業' },

  // 人材・広告・メディア
  '人材紹介・派遣': { major: 'professional', minor: '人材紹介・派遣' },
  '広告代理店': { major: 'professional', minor: '広告代理店' },
  'PR・マーケティング': { major: 'professional', minor: 'PR・マーケティング' },
  '出版・メディア': { major: 'b2c_media', minor: '出版・メディア' },
  '映像・デザイン': { major: 'professional', minor: '映像・デザイン' },
  'その他広告': { major: 'professional', minor: 'その他' },

  // サービス業
  '清掃・メンテナンス': { major: 'local_service', minor: '清掃・メンテナンス' },
  '冠婚葬祭': { major: 'local_service', minor: '冠婚葬祭' },
  'レンタル・リース': { major: 'b2c_experience', minor: 'レンタル・リース' },
  'フィットネス・スポーツ': { major: 'local_service', minor: 'フィットネス・スポーツ' },
  'ペット関連': { major: 'local_service', minor: 'ペット関連' },
  'その他サービス': { major: 'local_service', minor: 'その他' },

  // 官公庁・団体
  '自治体・行政': { major: 'public_education', minor: '自治体・行政' },
  '公的機関': { major: 'public_education', minor: '公的機関' },
  'NPO・NGO': { major: 'public_education', minor: 'NPO・NGO' },
  '業界団体': { major: 'public_education', minor: '業界団体' },
  'その他団体': { major: 'public_education', minor: 'その他団体' },

  // その他(大分類自体がラベルだった場合)
  'その他': { major: 'public_education', minor: 'その他' },
};

// --- 推定信頼度判定 ---
// 呼び出し側で使うヘルパー: 複数値の衝突・未知値などで推定が揺れる場合 false を返す
export function inferSiteRole(legacySiteTypeArray, legacySitePurposeArray) {
  const t = Array.isArray(legacySiteTypeArray) ? legacySiteTypeArray : [];
  const p = Array.isArray(legacySitePurposeArray) ? legacySitePurposeArray : [];

  const conflict = t.length > 1 || p.length > 1;
  const firstT = t[0];
  const firstP = p[0];

  if (firstT && firstP) {
    const hit = SITE_ROLE_INFERENCE[`${firstT}|${firstP}`];
    if (hit) return { role: hit, confident: !conflict };
  }
  if (firstT && SITE_ROLE_FALLBACK_BY_TYPE[firstT]) {
    return { role: SITE_ROLE_FALLBACK_BY_TYPE[firstT], confident: !conflict };
  }
  if (firstP && SITE_ROLE_FALLBACK_BY_PURPOSE[firstP]) {
    return { role: SITE_ROLE_FALLBACK_BY_PURPOSE[firstP], confident: !conflict };
  }
  return { role: 'other', confident: false };
}

export function inferIndustry(legacyIndustryArray) {
  const arr = Array.isArray(legacyIndustryArray) ? legacyIndustryArray : [];
  const first = arr[0];
  if (!first) return { major: '', minor: '', confident: false };

  const mapped = INDUSTRY_V1_TO_V2[first];
  if (mapped) return { ...mapped, confident: arr.length === 1 };

  // マスターに無い旧値は public_education の「その他」で吸収
  return { major: 'public_education', minor: 'その他', confident: false };
}

export function inferBusinessModel(legacyBusinessType, inferredSiteRole) {
  if (legacyBusinessType && BUSINESS_TYPE_TO_MODEL[legacyBusinessType]) {
    return { model: BUSINESS_TYPE_TO_MODEL[legacyBusinessType], confident: true };
  }
  // siteRole からの弱い推定
  switch (inferredSiteRole) {
    case 'ec':
      return { model: 'b2c', confident: false };
    case 'recruit':
      return { model: 'b2b', confident: false };
    case 'closed':
      return { model: 'b2b', confident: false };
    default:
      return { model: '', confident: false };
  }
}
