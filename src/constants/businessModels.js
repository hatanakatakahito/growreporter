// ビジネスモデル（単一選択・必須）
// ベンチマーク集計の最上位軸として使用する
export const BUSINESS_MODELS = [
  {
    value: 'b2b',
    label: 'B2B（法人向け）',
    description: '企業・法人が主な顧客',
  },
  {
    value: 'b2c',
    label: 'B2C（個人向け）',
    description: '一般消費者が主な顧客',
  },
  {
    value: 'b2b2c',
    label: 'B2B2C（企業経由で個人）',
    description: '法人経由で最終的に個人へ届ける',
  },
  {
    value: 'other',
    label: 'その他',
    description: 'C2C・G2C 等の特殊モデル',
  },
];

// value → label のルックアップ
export const BUSINESS_MODEL_LABELS = BUSINESS_MODELS.reduce((acc, m) => {
  acc[m.value] = m.label;
  return acc;
}, {});
