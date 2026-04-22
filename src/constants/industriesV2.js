// 業種分類 V2（Webマーケ性質ベースの 9 軸大分類 + 小分類）
// ベンチマーク集計の主軸となる。大分類は改善施策のパターンが近いグループで統合。
// 小分類は運用後に微修正前提。各大分類には必ず「その他」を含める。

export const INDUSTRY_MAJOR = [
  {
    value: 'local_service',
    label: '地域密着型サービス',
    description: '商圏が物理的に限定される業種。MEO・地域キーワードが効く',
  },
  {
    value: 'professional',
    label: '専門職・士業',
    description: '高信頼性訴求と専門性の証跡が鍵',
  },
  {
    value: 'b2b_saas',
    label: 'BtoB SaaS・IT製品',
    description: 'デジタル系BtoB。事例・導入プロセス訴求',
  },
  {
    value: 'b2b_manufacturing',
    label: 'BtoB 製造・素材・インフラ',
    description: '機械・素材・建設・通信など物理系BtoB',
  },
  {
    value: 'finance',
    label: '金融・保険',
    description: '銀行・証券・保険・FinTech。信頼性と規制対応が鍵',
  },
  {
    value: 'b2c_retail',
    label: 'BtoC 物販・EC',
    description: 'アパレル・日用品・家電・食品など物販',
  },
  {
    value: 'b2c_experience',
    label: 'BtoC 体験・予約・接客',
    description: '宿泊・旅行・習い事・イベントなど体験消費',
  },
  {
    value: 'b2c_media',
    label: 'BtoC メディア・Webサービス',
    description: 'メディア・アプリ・コンテンツ配信',
  },
  {
    value: 'public_education',
    label: '官公庁・団体・教育',
    description: '自治体・NPO・学校・業界団体',
  },
];

// value → label
export const INDUSTRY_MAJOR_LABELS = INDUSTRY_MAJOR.reduce((acc, m) => {
  acc[m.value] = m.label;
  return acc;
}, {});

// 大分類 → 小分類(具体業種) のマップ。各配列の末尾は必ず「その他」。
export const INDUSTRY_MINOR_BY_MAJOR = {
  local_service: [
    '病院・クリニック',
    '歯科',
    '介護・福祉',
    '美容・エステ',
    '美容室・サロン',
    '薬局・ドラッグ',
    'レストラン・カフェ',
    'デリバリー・テイクアウト',
    '不動産売買仲介',
    '不動産賃貸管理',
    '建設・工事',
    'リフォーム・リノベ',
    '清掃・メンテナンス',
    '冠婚葬祭',
    'ペット関連',
    'フィットネス・スポーツ',
    '学習塾・予備校',
    '自動車販売店',
    'その他',
  ],
  professional: [
    '弁護士・法律事務所',
    '税理士・会計事務所',
    '社労士・行政書士',
    '経営コンサルティング',
    'ITコンサルティング',
    '広告代理店',
    'PR・マーケティング',
    '人材紹介・派遣',
    '映像・デザイン',
    'その他士業',
    'その他',
  ],
  b2b_saas: [
    'SaaS・クラウド',
    'Webサービス（BtoB）',
    'Web制作・開発',
    'SI・システム開発',
    'アプリ開発',
    '業務系システム',
    'その他',
  ],
  b2b_manufacturing: [
    '機械・電機',
    '化学・素材',
    '自動車・部品（BtoB）',
    '建材・住設',
    '通信・インフラ',
    'その他製造',
    'その他',
  ],
  finance: [
    '銀行・証券',
    '保険',
    'フィンテック',
    '不動産投資',
    'その他金融',
    'その他',
  ],
  b2c_retail: [
    'アパレル・ファッション',
    '食品・日用品',
    '家電・家具',
    '雑貨・ギフト',
    '食品・飲料（メーカー）',
    'EC・通販',
    'その他小売',
    'その他',
  ],
  b2c_experience: [
    'ホテル・旅館',
    '旅行・観光',
    'オンライン講座',
    '資格・研修',
    'レンタル・リース',
    'その他',
  ],
  b2c_media: [
    'メディア・ポータル',
    '出版・メディア',
    'Webサービス（BtoC）',
    'その他',
  ],
  public_education: [
    '学校・大学',
    '自治体・行政',
    '公的機関',
    'NPO・NGO',
    '業界団体',
    'その他教育',
    'その他団体',
    'その他',
  ],
};

// 小分類 → 大分類 の逆引き（重複する "その他" は最初にヒットした major を返す）
export const INDUSTRY_MINOR_TO_MAJOR = Object.entries(INDUSTRY_MINOR_BY_MAJOR).reduce(
  (acc, [major, minors]) => {
    for (const minor of minors) {
      if (!(minor in acc)) acc[minor] = major;
    }
    return acc;
  },
  {}
);

// 指定された大分類に属する小分類かを判定
export function isMinorValidForMajor(major, minor) {
  const list = INDUSTRY_MINOR_BY_MAJOR[major];
  return Array.isArray(list) && list.includes(minor);
}
