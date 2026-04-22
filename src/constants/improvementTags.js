// 改善施策の構造化タグ（ベンチマーク集計の分解軸）
// 雛形。AI 自動付与の実装は別フェーズ。運用しつつ Grow Group 側で肉付け前提。

export const IMPROVEMENT_TAG_CATEGORIES = [
  { value: 'cta', label: 'CTA', description: 'コンバージョンボタン・誘導' },
  { value: 'form', label: 'フォーム', description: '入力フォームの最適化' },
  { value: 'fv', label: 'ファーストビュー', description: 'ページ最上部の訴求' },
  { value: 'content', label: 'コンテンツ', description: '本文・訴求文の改善' },
  { value: 'nav', label: 'ナビゲーション', description: 'メニュー・導線設計' },
  { value: 'speed', label: '表示速度', description: 'Core Web Vitals など' },
  { value: 'seo', label: 'SEO', description: 'meta・構造化データ・内部リンク' },
  { value: 'trust', label: '信頼性', description: '実績・証跡・レビュー訴求' },
  { value: 'mobile', label: 'モバイル最適化', description: 'スマホUX専用の改善' },
  { value: 'design', label: 'デザイン', description: 'ビジュアル・ブランド調整' },
  { value: 'other', label: 'その他', description: '上記いずれにも該当しない' },
];

export const IMPROVEMENT_TAG_CATEGORY_LABELS = IMPROVEMENT_TAG_CATEGORIES.reduce(
  (acc, c) => {
    acc[c.value] = c.label;
    return acc;
  },
  {}
);

// 具体施策タグ（雛形）
// 運用しつつ Grow Group 側で増減する前提。ベンチマークは (category, tag) × industryMajor × siteRole で集計予定。
export const IMPROVEMENT_TAGS = [
  // CTA
  { value: 'cta_placement', category: 'cta', label: 'CTA配置改善' },
  { value: 'cta_wording', category: 'cta', label: 'CTA文言改善' },
  { value: 'cta_design', category: 'cta', label: 'CTAデザイン改善' },
  { value: 'cta_frequency', category: 'cta', label: 'CTA出現頻度調整' },

  // フォーム
  { value: 'form_field_reduction', category: 'form', label: 'フォーム項目削減' },
  { value: 'form_ux', category: 'form', label: 'フォーム入力UX改善' },
  { value: 'form_validation', category: 'form', label: '入力エラー表示改善' },
  { value: 'form_split', category: 'form', label: 'フォームのステップ分割' },

  // ファーストビュー
  { value: 'fv_catchcopy', category: 'fv', label: 'FVキャッチコピー変更' },
  { value: 'fv_hero_visual', category: 'fv', label: 'FVビジュアル差し替え' },
  { value: 'fv_value_prop', category: 'fv', label: 'FV価値提案明確化' },

  // コンテンツ
  { value: 'content_case_study', category: 'content', label: '事例・実績追加' },
  { value: 'content_benefit_reframe', category: 'content', label: 'ベネフィット再訴求' },
  { value: 'content_length', category: 'content', label: 'コンテンツ長さ調整' },
  { value: 'content_faq', category: 'content', label: 'FAQ追加・拡充' },

  // ナビゲーション
  { value: 'nav_structure', category: 'nav', label: 'グローバルナビ再構成' },
  { value: 'nav_internal_link', category: 'nav', label: '内部リンク拡充' },
  { value: 'nav_breadcrumb', category: 'nav', label: 'パンくず追加・改善' },

  // 表示速度
  { value: 'speed_image', category: 'speed', label: '画像最適化' },
  { value: 'speed_js', category: 'speed', label: 'JavaScript読込最適化' },
  { value: 'speed_cwv', category: 'speed', label: 'Core Web Vitals改善' },

  // SEO
  { value: 'seo_meta', category: 'seo', label: 'meta情報最適化' },
  { value: 'seo_structured_data', category: 'seo', label: '構造化データ追加' },
  { value: 'seo_heading', category: 'seo', label: '見出し構造整備' },

  // 信頼性
  { value: 'trust_reviews', category: 'trust', label: 'レビュー・口コミ掲載' },
  { value: 'trust_awards', category: 'trust', label: '受賞歴・実績掲載' },
  { value: 'trust_company_info', category: 'trust', label: '会社情報の充実' },

  // モバイル
  { value: 'mobile_tap_target', category: 'mobile', label: 'タップ領域最適化' },
  { value: 'mobile_layout', category: 'mobile', label: 'スマホレイアウト見直し' },

  // デザイン
  { value: 'design_whitespace', category: 'design', label: '余白・視認性調整' },
  { value: 'design_color', category: 'design', label: '配色調整' },
];

// value → { label, category } のルックアップ
export const IMPROVEMENT_TAG_LOOKUP = IMPROVEMENT_TAGS.reduce((acc, t) => {
  acc[t.value] = t;
  return acc;
}, {});

// category → 配列
export const IMPROVEMENT_TAGS_BY_CATEGORY = IMPROVEMENT_TAGS.reduce((acc, t) => {
  if (!acc[t.category]) acc[t.category] = [];
  acc[t.category].push(t);
  return acc;
}, {});
