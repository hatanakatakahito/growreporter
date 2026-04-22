// サイト役割（単一選択・必須）
// 旧 SITE_TYPES(13) + SITE_PURPOSES(9) を重複排除・統合し、
// ベンチマーク集計の N が貯まる粒度に集約した 7 分類。
export const SITE_ROLES = [
  {
    value: 'corporate',
    label: 'コーポレート',
    description: '企業認知・リード獲得・ブランディングを兼ねる企業紹介サイト',
  },
  {
    value: 'service_product',
    label: 'サービス・製品紹介／LP',
    description: 'サービスや製品の訴求・リード獲得・販売促進（LP含む）',
  },
  {
    value: 'ec',
    label: 'EC・オンライン販売',
    description: 'オンラインで決済が完結する物販サイト',
  },
  {
    value: 'owned_media',
    label: 'オウンドメディア／情報発信',
    description: 'コンテンツで集客・SEO主体のメディアサイト',
  },
  {
    value: 'recruit',
    label: '採用サイト',
    description: '求職者向け・応募獲得',
  },
  {
    value: 'closed',
    label: '会員／IR／社内向け',
    description: '会員サイト・IR・業務系・社内ポータル（ベンチマーク対象外相当）',
  },
  {
    value: 'other',
    label: 'その他',
    description: '上記いずれにも該当しない',
  },
];

// value → label のルックアップ
export const SITE_ROLE_LABELS = SITE_ROLES.reduce((acc, r) => {
  acc[r.value] = r.label;
  return acc;
}, {});

// ベンチマーク集計対象外（closed 系）の判定
export const BENCHMARK_EXCLUDED_ROLES = new Set(['closed', 'other']);
export function isBenchmarkRole(role) {
  return !!role && !BENCHMARK_EXCLUDED_ROLES.has(role);
}
