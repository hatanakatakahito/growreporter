// 業種分類 V2（リクナビ・マイナビ準拠の 17 軸大分類 + 小分類）
// ベンチマーク集計の主軸となる。ユーザーが一発で自社業種を見つけられることを最優先に設計。
// 運用で微修正前提。各大分類には必ず末尾に「その他」を含める。

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

// value → label
export const INDUSTRY_MAJOR_LABELS = INDUSTRY_MAJOR.reduce((acc, m) => {
  acc[m.value] = m.label;
  return acc;
}, {});

// 大分類 → 小分類(具体業種) のマップ。各配列の末尾は必ず「その他」。
export const INDUSTRY_MINOR_BY_MAJOR = {
  it_communication: [
    'SaaS・クラウドサービス',
    'Webサービス・ポータル',
    'インターネット広告・DX支援',
    'ソフトウェア・パッケージ',
    '受託開発・SI',
    'Web制作・ホームページ制作',
    'アプリ開発',
    '通信キャリア・ISP',
    'データセンター・クラウドインフラ',
    'ゲーム',
    'その他',
  ],
  manufacturer: [
    '機械・電機・精密機器',
    '自動車・輸送機器',
    '化学・素材・繊維',
    '食品・飲料(メーカー)',
    '医薬品・化粧品',
    '家電・家具・雑貨メーカー',
    'アパレル・ファッションメーカー',
    '建材・住宅設備',
    'その他',
  ],
  trading: [
    '総合商社',
    '専門商社',
    'その他',
  ],
  retail_ec: [
    '百貨店・GMS',
    'スーパー・コンビニ',
    'ドラッグストア・ホームセンター',
    '専門店(家電・家具等)',
    'EC・通販',
    'アパレル・ファッション小売',
    '自動車販売・整備',
    'その他',
  ],
  food_beverage: [
    'レストラン・カフェ',
    'ファストフード・ファミレス',
    '居酒屋・バー',
    'デリバリー・テイクアウト',
    '食品・飲料(卸・小売)',
    'その他',
  ],
  finance: [
    '銀行',
    '証券・投資信託',
    '生命保険・損害保険',
    'クレジットカード・信販・リース',
    'FinTech・金融サービス',
    '不動産投資・投資運用',
    'その他',
  ],
  realestate_construction: [
    '不動産売買・仲介',
    '不動産賃貸・管理',
    '不動産デベロッパー',
    '建設・ゼネコン',
    '住宅メーカー・工務店',
    'リフォーム・リノベーション',
    '設備・プラント',
    'その他',
  ],
  logistics_infra: [
    '陸運・トラック運送',
    '航空・海運・鉄道',
    '倉庫・物流サービス',
    '電力・ガス・エネルギー',
    '上下水道・環境インフラ',
    'その他',
  ],
  healthcare: [
    '病院・クリニック(医科)',
    '歯科・歯科医院',
    '介護・福祉・障害者支援',
    '調剤薬局・ドラッグ',
    'メディカル関連サービス',
    'その他',
  ],
  education: [
    '学校・大学・専門学校',
    '学習塾・予備校',
    '資格・スキル講座',
    'オンライン教育・e-learning',
    '保育園・幼児教育',
    'その他',
  ],
  hr_bpo: [
    '人材紹介・人材派遣',
    '求人広告・採用支援',
    'BPO・業務代行',
    '教育研修サービス',
    'その他',
  ],
  media_advertising: [
    '広告代理店・マーケティング',
    'PR・広報支援',
    '出版・新聞',
    'テレビ・ラジオ・映像制作',
    'Webメディア・キュレーション',
    'デザイン・クリエイティブ',
    'その他',
  ],
  consulting_professional: [
    '経営・戦略コンサル',
    'IT・システムコンサル',
    '弁護士・法律事務所',
    '税理士・会計事務所',
    '社労士・行政書士',
    '特許・知財サービス',
    'シンクタンク・リサーチ',
    'その他士業',
    'その他',
  ],
  entertainment: [
    '旅行・観光業',
    'ホテル・旅館',
    'アミューズメント・レジャー施設',
    'スポーツ・フィットネス',
    '映画・音楽・芸能',
    'イベント・興行',
    'その他',
  ],
  beauty_lifestyle: [
    '美容室・理容',
    'エステ・ネイル・サロン',
    'ブライダル・冠婚葬祭',
    'クリーニング・家事代行',
    'ペット関連',
    'その他',
  ],
  public_nonprofit: [
    '官公庁・自治体',
    '公的機関・独立行政法人',
    'NPO・NGO・財団',
    '業界団体・協会',
    'その他',
  ],
  other_services: [
    '清掃・ビルメンテナンス',
    '警備・セキュリティ',
    'レンタル・リース',
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
