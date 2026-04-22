/**
 * タクソノミー V2 の value → 日本語ラベル（プロンプト・スプレッドシート出力用）
 * フロントの src/constants/ 配下と対応するバックエンドミラー。
 *
 * このファイルを新設した意図:
 *   - functions/src/utils/sheetsManager.js 等に散在していたラベル定義を一元化
 *   - フロントと完全に同じ value を使うことで Firestore 往復での整合性を保つ
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

// --- 業種大分類（9軸） ---
export const INDUSTRY_MAJOR_LABELS = {
  local_service: '地域密着型サービス',
  professional: '専門職・士業',
  b2b_saas: 'BtoB SaaS・IT製品',
  b2b_manufacturing: 'BtoB 製造・素材・インフラ',
  finance: '金融・保険',
  b2c_retail: 'BtoC 物販・EC',
  b2c_experience: 'BtoC 体験・予約・接客',
  b2c_media: 'BtoC メディア・Webサービス',
  public_education: '官公庁・団体・教育',
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
 * 例: "BtoB SaaS・IT製品／SaaS・クラウド"
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
  { value: 'local_service', label: '地域密着型サービス', description: '商圏が物理的に限定。MEO・地域キーワードが効く' },
  { value: 'professional', label: '専門職・士業', description: '高信頼性訴求と専門性の証跡が鍵' },
  { value: 'b2b_saas', label: 'BtoB SaaS・IT製品', description: 'デジタル系BtoB' },
  { value: 'b2b_manufacturing', label: 'BtoB 製造・素材・インフラ', description: '機械・素材・建設・通信' },
  { value: 'finance', label: '金融・保険', description: '銀行・証券・保険・FinTech' },
  { value: 'b2c_retail', label: 'BtoC 物販・EC', description: 'アパレル・日用品・家電・食品' },
  { value: 'b2c_experience', label: 'BtoC 体験・予約・接客', description: '宿泊・旅行・習い事・イベント' },
  { value: 'b2c_media', label: 'BtoC メディア・Webサービス', description: 'メディア・アプリ・コンテンツ配信' },
  { value: 'public_education', label: '官公庁・団体・教育', description: '自治体・NPO・学校・業界団体' },
];

export const INDUSTRY_MINOR_BY_MAJOR = {
  local_service: [
    '病院・クリニック', '歯科', '介護・福祉', '美容・エステ', '美容室・サロン', '薬局・ドラッグ',
    'レストラン・カフェ', 'デリバリー・テイクアウト', '不動産売買仲介', '不動産賃貸管理',
    '建設・工事', 'リフォーム・リノベ', '清掃・メンテナンス', '冠婚葬祭', 'ペット関連',
    'フィットネス・スポーツ', '学習塾・予備校', '自動車販売店', 'その他',
  ],
  professional: [
    '弁護士・法律事務所', '税理士・会計事務所', '社労士・行政書士', '経営コンサルティング',
    'ITコンサルティング', '広告代理店', 'PR・マーケティング', '人材紹介・派遣',
    '映像・デザイン', 'その他士業', 'その他',
  ],
  b2b_saas: [
    'SaaS・クラウド', 'Webサービス（BtoB）', 'Web制作・開発', 'SI・システム開発',
    'アプリ開発', '業務系システム', 'その他',
  ],
  b2b_manufacturing: [
    '機械・電機', '化学・素材', '自動車・部品（BtoB）', '建材・住設', '通信・インフラ',
    'その他製造', 'その他',
  ],
  finance: ['銀行・証券', '保険', 'フィンテック', '不動産投資', 'その他金融', 'その他'],
  b2c_retail: [
    'アパレル・ファッション', '食品・日用品', '家電・家具', '雑貨・ギフト',
    '食品・飲料（メーカー）', 'EC・通販', 'その他小売', 'その他',
  ],
  b2c_experience: [
    'ホテル・旅館', '旅行・観光', 'オンライン講座', '資格・研修', 'レンタル・リース', 'その他',
  ],
  b2c_media: ['メディア・ポータル', '出版・メディア', 'Webサービス（BtoC）', 'その他'],
  public_education: [
    '学校・大学', '自治体・行政', '公的機関', 'NPO・NGO', '業界団体',
    'その他教育', 'その他団体', 'その他',
  ],
};

/** 大分類に属する小分類かを判定 */
export function isMinorValidForMajor(major, minor) {
  const list = INDUSTRY_MINOR_BY_MAJOR[major];
  return Array.isArray(list) && list.includes(minor);
}
