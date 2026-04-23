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

// --- BusinessModel: 旧 businessType → 新 businessModel ---
export const BUSINESS_TYPE_TO_MODEL = {
  btob: 'b2b',
  btoc: 'b2c',
  btobtoc: 'b2b2c',
  other: 'other',
};

// --- Industry: 旧 industry(V1 70サブ) → 新 V2 {industryMajor, industryMinor} ---
// 新マスター(industriesV2.js)の 17 大分類に合わせてリマップ。
// 対応する新小分類が存在しない旧値は各 major の `その他` で吸収する。
export const INDUSTRY_V1_TO_V2 = {
  // 旧: IT・Web・通信 → 新: it_communication
  'SaaS・クラウド': { major: 'it_communication', minor: 'SaaS・クラウドサービス' },
  'Webサービス': { major: 'it_communication', minor: 'Webサービス・ポータル' },
  'EC・通販': { major: 'retail_ec', minor: 'EC・通販' },
  'メディア・ポータル': { major: 'media_advertising', minor: 'Webメディア・キュレーション' },
  'アプリ開発': { major: 'it_communication', minor: 'アプリ開発' },
  'Web制作・開発': { major: 'it_communication', minor: 'Web制作・ホームページ制作' },
  'SI・システム開発': { major: 'it_communication', minor: '受託開発・SI' },
  '通信・インフラ': { major: 'it_communication', minor: '通信キャリア・ISP' },

  // 旧: 製造業 → 新: manufacturer
  '機械・電機': { major: 'manufacturer', minor: '機械・電機・精密機器' },
  '食品・飲料': { major: 'manufacturer', minor: '食品・飲料(メーカー)' },
  '化学・素材': { major: 'manufacturer', minor: '化学・素材・繊維' },
  '自動車・部品': { major: 'manufacturer', minor: '自動車・輸送機器' },
  '建材・住設': { major: 'manufacturer', minor: '建材・住宅設備' },
  'その他製造': { major: 'manufacturer', minor: 'その他' },

  // 旧: 小売・EC → 新: retail_ec
  'アパレル・ファッション': { major: 'retail_ec', minor: 'アパレル・ファッション小売' },
  '食品・日用品': { major: 'retail_ec', minor: 'スーパー・コンビニ' },
  '家電・家具': { major: 'retail_ec', minor: '専門店(家電・家具等)' },
  '雑貨・ギフト': { major: 'retail_ec', minor: '専門店(家電・家具等)' },
  'その他小売': { major: 'retail_ec', minor: 'その他' },

  // 旧: 金融・保険 → 新: finance
  '銀行・証券': { major: 'finance', minor: '銀行' },
  '保険': { major: 'finance', minor: '生命保険・損害保険' },
  'フィンテック': { major: 'finance', minor: 'FinTech・金融サービス' },
  '不動産投資': { major: 'finance', minor: '不動産投資・投資運用' },
  'その他金融': { major: 'finance', minor: 'その他' },

  // 旧: 不動産・建設 → 新: realestate_construction
  '売買仲介': { major: 'realestate_construction', minor: '不動産売買・仲介' },
  '賃貸管理': { major: 'realestate_construction', minor: '不動産賃貸・管理' },
  '建設・工事': { major: 'realestate_construction', minor: '建設・ゼネコン' },
  'リフォーム・リノベ': { major: 'realestate_construction', minor: 'リフォーム・リノベーション' },
  'その他不動産': { major: 'realestate_construction', minor: 'その他' },

  // 旧: 飲食・宿泊 → 新: food_beverage / entertainment に分岐
  'レストラン・カフェ': { major: 'food_beverage', minor: 'レストラン・カフェ' },
  'デリバリー・テイクアウト': { major: 'food_beverage', minor: 'デリバリー・テイクアウト' },
  'ホテル・旅館': { major: 'entertainment', minor: 'ホテル・旅館' },
  '旅行・観光': { major: 'entertainment', minor: '旅行・観光業' },
  'その他飲食宿泊': { major: 'food_beverage', minor: 'その他' },

  // 旧: 医療・福祉・美容 → 新: healthcare / beauty_lifestyle に分岐
  '病院・クリニック': { major: 'healthcare', minor: '病院・クリニック(医科)' },
  '歯科': { major: 'healthcare', minor: '歯科・歯科医院' },
  '介護・福祉': { major: 'healthcare', minor: '介護・福祉・障害者支援' },
  '美容・エステ': { major: 'beauty_lifestyle', minor: 'エステ・ネイル・サロン' },
  '美容室・サロン': { major: 'beauty_lifestyle', minor: '美容室・理容' },
  '薬局・ドラッグ': { major: 'healthcare', minor: '調剤薬局・ドラッグ' },
  'その他医療': { major: 'healthcare', minor: 'その他' },

  // 旧: 教育・スクール → 新: education
  '学校・大学': { major: 'education', minor: '学校・大学・専門学校' },
  '学習塾・予備校': { major: 'education', minor: '学習塾・予備校' },
  'オンライン講座': { major: 'education', minor: 'オンライン教育・e-learning' },
  '資格・研修': { major: 'education', minor: '資格・スキル講座' },
  'その他教育': { major: 'education', minor: 'その他' },

  // 旧: 士業・コンサルティング → 新: consulting_professional
  '弁護士・法律事務所': { major: 'consulting_professional', minor: '弁護士・法律事務所' },
  '税理士・会計事務所': { major: 'consulting_professional', minor: '税理士・会計事務所' },
  '社労士・行政書士': { major: 'consulting_professional', minor: '社労士・行政書士' },
  '経営コンサルティング': { major: 'consulting_professional', minor: '経営・戦略コンサル' },
  'ITコンサルティング': { major: 'consulting_professional', minor: 'IT・システムコンサル' },
  'その他士業': { major: 'consulting_professional', minor: 'その他士業' },

  // 旧: 人材・広告・メディア → 新: hr_bpo / media_advertising に分岐
  '人材紹介・派遣': { major: 'hr_bpo', minor: '人材紹介・人材派遣' },
  '広告代理店': { major: 'media_advertising', minor: '広告代理店・マーケティング' },
  'PR・マーケティング': { major: 'media_advertising', minor: 'PR・広報支援' },
  '出版・メディア': { major: 'media_advertising', minor: '出版・新聞' },
  '映像・デザイン': { major: 'media_advertising', minor: 'デザイン・クリエイティブ' },
  'その他広告': { major: 'media_advertising', minor: 'その他' },

  // 旧: サービス業 → 新: other_services / beauty_lifestyle / entertainment に分岐
  '清掃・メンテナンス': { major: 'other_services', minor: '清掃・ビルメンテナンス' },
  '冠婚葬祭': { major: 'beauty_lifestyle', minor: 'ブライダル・冠婚葬祭' },
  'レンタル・リース': { major: 'other_services', minor: 'レンタル・リース' },
  'フィットネス・スポーツ': { major: 'entertainment', minor: 'スポーツ・フィットネス' },
  'ペット関連': { major: 'beauty_lifestyle', minor: 'ペット関連' },
  'その他サービス': { major: 'other_services', minor: 'その他' },

  // 旧: 官公庁・団体 → 新: public_nonprofit
  '自治体・行政': { major: 'public_nonprofit', minor: '官公庁・自治体' },
  '公的機関': { major: 'public_nonprofit', minor: '公的機関・独立行政法人' },
  'NPO・NGO': { major: 'public_nonprofit', minor: 'NPO・NGO・財団' },
  '業界団体': { major: 'public_nonprofit', minor: '業界団体・協会' },
  'その他団体': { major: 'public_nonprofit', minor: 'その他' },

  // 旧: その他(大分類自体がラベルだった場合)
  'その他': { major: 'other_services', minor: 'その他' },
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

  // マスターに無い旧値は other_services の「その他」で吸収
  return { major: 'other_services', minor: 'その他', confident: false };
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
