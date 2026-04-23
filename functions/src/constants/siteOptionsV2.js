/**
 * タクソノミー V2 の value → 日本語ラベル（AI プロンプト用）
 * フロントの src/constants/ 配下と対応するバックエンドミラー。
 * フロントと完全に同じ value を使うことで Firestore 往復での整合性を保つ。
 *
 * 業種 V2 は 17 大分類（リクナビ・マイナビ準拠）で、全ての小分類は末尾に「その他」を含む。
 */

// --- ビジネスモデル ---
export const BUSINESS_MODEL_LABELS = {
  b2b: 'B2B（法人向け）',
  b2c: 'B2C（個人向け）',
  b2b2c: 'B2B2C（企業経由で個人）',
  other: 'その他',
};

// --- サイト役割（7分類: 旧 SITE_TYPE + SITE_PURPOSE を統合） ---
export const SITE_ROLE_LABELS = {
  corporate: 'コーポレート',
  service_product: 'サービス・製品紹介／LP',
  ec: 'EC・オンライン販売',
  owned_media: 'オウンドメディア／情報発信',
  recruit: '採用サイト',
  closed: '会員／IR／社内向け',
  other: 'その他',
};

// --- 業種大分類（17軸・リクナビ/マイナビ準拠） ---
export const INDUSTRY_MAJOR_LABELS = {
  it_communication: 'IT・通信・インターネット',
  manufacturer: 'メーカー(モノづくり)',
  trading: '商社・卸売',
  retail_ec: '流通・小売・EC',
  food_beverage: 'フード・飲食',
  finance: '金融・保険',
  realestate_construction: '不動産・建設',
  logistics_infra: '運輸・物流・インフラ',
  healthcare: '医療・介護・福祉',
  education: '教育・学習支援',
  hr_bpo: '人材・アウトソーシング',
  media_advertising: 'メディア・広告・出版',
  consulting_professional: 'コンサル・専門サービス(士業含む)',
  entertainment: 'エンタメ・レジャー・観光',
  beauty_lifestyle: '美容・ライフスタイルサービス',
  public_nonprofit: '公共・団体',
  other_services: 'その他サービス業',
};

/**
 * value を渡してラベルを返すユーティリティ。
 * 未知の value は「未設定」を返す（プロンプト・出力で空欄化しないためのフォールバック）。
 */
export function labelFor(map, value, fallback = '未設定') {
  if (!value) return fallback;
  return map[value] || fallback;
}

/**
 * 業種(大・小)を組み合わせた表示文字列。
 * 例: "IT・通信・インターネット／SaaS・クラウドサービス"
 */
export function formatIndustry(major, minor, fallback = '未設定') {
  const majorLabel = INDUSTRY_MAJOR_LABELS[major];
  if (!majorLabel) return fallback;
  if (!minor) return majorLabel;
  return `${majorLabel}／${minor}`;
}

// --- マスター配列（AI推定プロンプトや検証に使う） ---
// フロント側の src/constants/* と同一の value/description を維持すること。

export const BUSINESS_MODELS = [
  { value: 'b2b', label: 'B2B（法人向け）', description: '企業・法人が主な顧客' },
  { value: 'b2c', label: 'B2C（個人向け）', description: '一般消費者が主な顧客' },
  { value: 'b2b2c', label: 'B2B2C（企業経由で個人）', description: '法人経由で最終的に個人へ届ける' },
  { value: 'other', label: 'その他', description: 'C2C・G2C 等の特殊モデル' },
];

export const SITE_ROLES = [
  { value: 'corporate', label: 'コーポレート', description: '企業認知・リード獲得・ブランディングを兼ねる企業紹介サイト' },
  { value: 'service_product', label: 'サービス・製品紹介／LP', description: 'サービスや製品の訴求・リード獲得・販売促進（LP含む）' },
  { value: 'ec', label: 'EC・オンライン販売', description: 'オンラインで決済が完結する物販サイト' },
  { value: 'owned_media', label: 'オウンドメディア／情報発信', description: 'コンテンツで集客・SEO主体のメディアサイト' },
  { value: 'recruit', label: '採用サイト', description: '求職者向け・応募獲得' },
  { value: 'closed', label: '会員／IR／社内向け', description: '会員サイト・IR・業務系・社内ポータル（ベンチマーク対象外相当）' },
  { value: 'other', label: 'その他', description: '上記いずれにも該当しない' },
];

export const INDUSTRY_MAJOR = [
  { value: 'it_communication', label: 'IT・通信・インターネット', description: 'SaaS / Web制作 / SI / アプリ / 通信キャリア など' },
  { value: 'manufacturer', label: 'メーカー(モノづくり)', description: '機械 / 自動車 / 化学 / 食品飲料 / 医薬品 / アパレル など' },
  { value: 'trading', label: '商社・卸売', description: '総合商社 / 専門商社' },
  { value: 'retail_ec', label: '流通・小売・EC', description: '百貨店 / スーパー / コンビニ / 専門店 / 通販EC' },
  { value: 'food_beverage', label: 'フード・飲食', description: 'レストラン / カフェ / 居酒屋 / デリバリー' },
  { value: 'finance', label: '金融・保険', description: '銀行 / 証券 / 保険 / 信販・リース / FinTech' },
  { value: 'realestate_construction', label: '不動産・建設', description: '仲介 / 賃貸管理 / デベロッパー / ゼネコン / 住宅 / リフォーム' },
  { value: 'logistics_infra', label: '運輸・物流・インフラ', description: '陸運 / 倉庫 / 航空 / 鉄道 / 電力・ガス' },
  { value: 'healthcare', label: '医療・介護・福祉', description: '病院 / クリニック / 歯科 / 介護 / 調剤薬局' },
  { value: 'education', label: '教育・学習支援', description: '学校 / 塾 / 予備校 / eラーニング / 保育' },
  { value: 'hr_bpo', label: '人材・アウトソーシング', description: '人材紹介 / 派遣 / 求人広告 / BPO' },
  { value: 'media_advertising', label: 'メディア・広告・出版', description: '広告代理店 / PR / 出版 / TV / Webメディア / 制作' },
  { value: 'consulting_professional', label: 'コンサル・専門サービス(士業含む)', description: '経営コンサル / 弁護士 / 税理士 / 社労士 / シンクタンク' },
  { value: 'entertainment', label: 'エンタメ・レジャー・観光', description: '旅行 / ホテル / アミューズメント / スポーツ / 映画・音楽' },
  { value: 'beauty_lifestyle', label: '美容・ライフスタイルサービス', description: '美容室 / エステ / ブライダル / 冠婚葬祭 / ペット' },
  { value: 'public_nonprofit', label: '公共・団体', description: '官公庁 / NPO / 協会 / 独立行政法人' },
  { value: 'other_services', label: 'その他サービス業', description: '清掃 / 警備 / レンタル / 自動車販売・整備 など' },
];

export const INDUSTRY_MINOR_BY_MAJOR = {
  it_communication: [
    'SaaS・クラウドサービス', 'Webサービス・ポータル', 'インターネット広告・DX支援',
    'ソフトウェア・パッケージ', '受託開発・SI', 'Web制作・ホームページ制作',
    'アプリ開発', '通信キャリア・ISP', 'データセンター・クラウドインフラ', 'ゲーム', 'その他',
  ],
  manufacturer: [
    '機械・電機・精密機器', '自動車・輸送機器', '化学・素材・繊維',
    '食品・飲料(メーカー)', '医薬品・化粧品', '家電・家具・雑貨メーカー',
    'アパレル・ファッションメーカー', '建材・住宅設備', 'その他',
  ],
  trading: ['総合商社', '専門商社', 'その他'],
  retail_ec: [
    '百貨店・GMS', 'スーパー・コンビニ', 'ドラッグストア・ホームセンター',
    '専門店(家電・家具等)', 'EC・通販', 'アパレル・ファッション小売',
    '自動車販売・整備', 'その他',
  ],
  food_beverage: [
    'レストラン・カフェ', 'ファストフード・ファミレス', '居酒屋・バー',
    'デリバリー・テイクアウト', '食品・飲料(卸・小売)', 'その他',
  ],
  finance: [
    '銀行', '証券・投資信託', '生命保険・損害保険',
    'クレジットカード・信販・リース', 'FinTech・金融サービス', '不動産投資・投資運用', 'その他',
  ],
  realestate_construction: [
    '不動産売買・仲介', '不動産賃貸・管理', '不動産デベロッパー',
    '建設・ゼネコン', '住宅メーカー・工務店', 'リフォーム・リノベーション',
    '設備・プラント', 'その他',
  ],
  logistics_infra: [
    '陸運・トラック運送', '航空・海運・鉄道', '倉庫・物流サービス',
    '電力・ガス・エネルギー', '上下水道・環境インフラ', 'その他',
  ],
  healthcare: [
    '病院・クリニック(医科)', '歯科・歯科医院', '介護・福祉・障害者支援',
    '調剤薬局・ドラッグ', 'メディカル関連サービス', 'その他',
  ],
  education: [
    '学校・大学・専門学校', '学習塾・予備校', '資格・スキル講座',
    'オンライン教育・e-learning', '保育園・幼児教育', 'その他',
  ],
  hr_bpo: [
    '人材紹介・人材派遣', '求人広告・採用支援', 'BPO・業務代行',
    '教育研修サービス', 'その他',
  ],
  media_advertising: [
    '広告代理店・マーケティング', 'PR・広報支援', '出版・新聞',
    'テレビ・ラジオ・映像制作', 'Webメディア・キュレーション',
    'デザイン・クリエイティブ', 'その他',
  ],
  consulting_professional: [
    '経営・戦略コンサル', 'IT・システムコンサル', '弁護士・法律事務所',
    '税理士・会計事務所', '社労士・行政書士', '特許・知財サービス',
    'シンクタンク・リサーチ', 'その他士業', 'その他',
  ],
  entertainment: [
    '旅行・観光業', 'ホテル・旅館', 'アミューズメント・レジャー施設',
    'スポーツ・フィットネス', '映画・音楽・芸能', 'イベント・興行', 'その他',
  ],
  beauty_lifestyle: [
    '美容室・理容', 'エステ・ネイル・サロン', 'ブライダル・冠婚葬祭',
    'クリーニング・家事代行', 'ペット関連', 'その他',
  ],
  public_nonprofit: [
    '官公庁・自治体', '公的機関・独立行政法人', 'NPO・NGO・財団',
    '業界団体・協会', 'その他',
  ],
  other_services: [
    '清掃・ビルメンテナンス', '警備・セキュリティ', 'レンタル・リース', 'その他',
  ],
};

/** 大分類に属する小分類かを判定 */
export function isMinorValidForMajor(major, minor) {
  const list = INDUSTRY_MINOR_BY_MAJOR[major];
  return Array.isArray(list) && list.includes(minor);
}
