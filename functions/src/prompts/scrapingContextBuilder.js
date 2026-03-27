/**
 * スクレイピングデータをAI分析プロンプト用テキストに変換するユーティリティ
 *
 * 3段階の詳細度（tier）で、分析ページタイプに応じた適切な量のコンテキストを生成する。
 * - full:    上位15ページの詳細（pages, landingPages, comprehensive_analysis向け）
 * - summary: 集計統計 + 上位5ページのコンパクト情報（keywords, channels, conversions等向け）
 * - compact: 集計統計のみ（day, week, hour等向け）
 */

const PAGE_TYPE_LABELS = {
  home: 'トップページ',
  article: '記事・ブログ',
  product: '商品・サービス',
  contact: 'お問い合わせ',
  about: '会社情報',
  landing: 'ランディングページ',
  other: 'その他',
};

function getPageTypeLabel(pageType) {
  return PAGE_TYPE_LABELS[pageType] || 'その他';
}

// ==================== 問題点検出 ====================

function detectIssues(page) {
  const issues = [];
  if (page.headingStructure?.h1 === 0) issues.push('h1なし');
  if (page.headingStructure?.h1 > 1) issues.push('h1複数');
  if (page.headingStructure?.h2 === 0) issues.push('h2なし');
  if (page.textLength < 500) issues.push('テキスト少ない');
  if (page.imagesWithoutAlt > page.imagesWithAlt) issues.push('alt属性不足');
  if (!page.metaDescription) issues.push('description未設定');
  if (page.loadTime > 3000) issues.push('読込遅い');
  if (!page.isResponsive) issues.push('レスポンシブ未対応');
  return issues;
}

// ==================== フォームラベル抽出 ====================

const INPUT_TYPE_NAMES = ['text', 'email', 'tel', 'number', 'url', 'search', 'date', 'reset', 'submit', 'button', 'radio', 'checkbox', 'select', 'textarea'];

function extractFormLabels(fields) {
  const labels = (fields || [])
    .map(f => {
      const label = f.label || f.name || '';
      if (!label) return null;
      if (INPUT_TYPE_NAMES.includes(label.toLowerCase())) return null;
      if (/^[a-z0-9]{6,}$/i.test(label) && !/[\u3000-\u9FFF\u30A0-\u30FF\u3040-\u309F]/.test(label)) return null;
      const req = f.required ? '*' : '';
      return `${label}${req}`;
    })
    .filter(Boolean);
  const hasJapanese = labels.some(l => /[\u3000-\u9FFF\u30A0-\u30FF\u3040-\u309F]/.test(l));
  return { labels, hasJapanese };
}

// ==================== 集計統計 ====================

function buildAggregateStats(pages, meta) {
  const totalPages = meta?.totalPagesScraped || pages.length;
  const pagesWithForm = pages.filter(p => p.hasForm).length;
  const totalCTAs = pages.reduce((sum, p) => sum + (p.ctaButtons?.length || 0), 0);
  const noH1 = pages.filter(p => p.headingStructure?.h1 === 0).length;
  const noDesc = pages.filter(p => !p.metaDescription).length;
  const loadTimes = pages.filter(p => p.loadTime > 0).map(p => p.loadTime);
  const avgLoadTime = loadTimes.length > 0 ? Math.round(loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length) : 0;
  const responsiveCount = pages.filter(p => p.isResponsive).length;
  const responsiveRate = pages.length > 0 ? Math.round((responsiveCount / pages.length) * 100) : 0;
  const textLengths = pages.filter(p => p.textLength > 0).map(p => p.textLength);
  const avgTextLength = textLengths.length > 0 ? Math.round(textLengths.reduce((a, b) => a + b, 0) / textLengths.length) : 0;

  let text = '\n\n【参考: サイト構造データ】※以下は補足情報です。上記のアクセス解析データの考察を優先してください。\n';
  if (meta?.lastScrapedAt) {
    const lastScraped = meta.lastScrapedAt.toDate ? meta.lastScrapedAt.toDate() : new Date(meta.lastScrapedAt);
    text += `最終スクレイピング: ${lastScraped.toLocaleDateString('ja-JP')} / `;
  }
  text += `スクレイピング済みページ数: ${totalPages}\n`;
  text += `フォーム設置ページ: ${pagesWithForm}件 / CTAボタン総数: ${totalCTAs}個\n`;
  text += `h1未設定: ${noH1}件 / metaDescription未設定: ${noDesc}件\n`;
  text += `平均読込速度: ${avgLoadTime}ms / レスポンシブ対応率: ${responsiveRate}%\n`;
  text += `平均テキスト量: ${avgTextLength.toLocaleString()}文字\n`;

  return text;
}

// ==================== Tier別ページ詳細 ====================

function buildFullPageDetail(page, index) {
  let text = '';
  text += `\n【${index + 1}位】 ${page.pagePath}\n`;
  text += `タイトル: ${page.metaTitle || '未設定'}\n`;
  if (page.metaDescription) text += `説明: ${page.metaDescription.slice(0, 120)}\n`;
  text += `PV: ${page.pageViews?.toLocaleString() || 0}, ユーザー: ${page.users?.toLocaleString() || 0}\n`;
  text += `ページタイプ: ${getPageTypeLabel(page.pageType)}\n`;
  text += `テキスト量: ${page.textLength?.toLocaleString() || 0}文字\n`;
  text += `見出し構造: h1=${page.headingStructure?.h1 || 0}, h2=${page.headingStructure?.h2 || 0}, h3=${page.headingStructure?.h3 || 0}\n`;
  text += `画像: alt有=${page.imagesWithAlt || 0}, alt無=${page.imagesWithoutAlt || 0}\n`;
  text += `リンク: 内部=${page.internalLinks || 0}, 外部=${page.externalLinks || 0}\n`;
  text += `読込速度: ${page.loadTime || 0}ms\n`;
  text += `レスポンシブ: ${page.isResponsive ? '対応' : '未対応'}\n`;

  if (page.ctaButtons && page.ctaButtons.length > 0) {
    text += `CTA: ${page.ctaButtons.length}個（${page.ctaButtons.slice(0, 3).map(cta => cta.text).join(', ')}）\n`;
  }

  if (page.hasForm) {
    const { labels, hasJapanese } = extractFormLabels(page.formFields);
    if (labels.length > 0 && hasJapanese) {
      text += `フォーム: あり（主な項目: ${labels.join('、')}）\n`;
    } else {
      text += `フォーム: あり\n`;
    }
  }

  const issues = detectIssues(page);
  if (issues.length > 0) {
    text += `⚠️ 問題点: ${issues.join(', ')}\n`;
  }

  // ファーストビュー
  if (page.firstView) {
    const fv = page.firstView;
    if (fv.headline) text += `ファーストビュー見出し: ${fv.headline}\n`;
    if (fv.subheadline) text += `サブ見出し: ${fv.subheadline}\n`;
    if (fv.cta) text += `ファーストビューCTA: 「${fv.cta.text}」\n`;
  }

  // セクション構造
  if (page.sections && page.sections.length > 0) {
    text += 'セクション構成:\n';
    for (const sec of page.sections.slice(0, 6)) {
      text += `  - ${sec.tag || 'h2'}: 「${sec.heading}」`;
      if (sec.ctas && sec.ctas.length > 0) text += ` [CTA: ${sec.ctas.map(c => `「${c.text}」`).join('、')}]`;
      text += '\n';
    }
  }

  return text;
}

function buildSummaryPageDetail(page, index) {
  let text = '';
  text += `${index + 1}. ${page.pagePath} — ${page.metaTitle || '(タイトル未設定)'}`;
  text += ` [PV:${page.pageViews?.toLocaleString() || 0}]`;
  text += ` [${getPageTypeLabel(page.pageType)}]`;
  const issues = detectIssues(page);
  if (issues.length > 0) text += ` ⚠️${issues.join(',')}`;
  text += '\n';
  if (page.metaDescription) {
    text += `   説明: ${page.metaDescription.slice(0, 80)}...\n`;
  }
  return text;
}

// ==================== メインエクスポート ====================

/**
 * スクレイピングデータからプロンプト用コンテキストテキストを構築
 * @param {Array} pages - pageScrapingDataドキュメントの配列（pageViews降順）
 * @param {Object|null} meta - pageScrapingMetaドキュメント
 * @param {'full'|'summary'|'compact'} tier - 詳細度
 * @returns {string} プロンプトに挿入するテキスト（空の場合は空文字列）
 */
export function buildScrapingContextText(pages, meta, tier = 'compact') {
  if (!pages || pages.length === 0) return '';

  // 全Tier共通: 集計統計
  let text = buildAggregateStats(pages, meta);

  if (tier === 'full') {
    // Tier 1: 上位15ページの詳細
    text += '\n【上位ページの詳細分析】\n';
    pages.slice(0, 15).forEach((page, index) => {
      text += buildFullPageDetail(page, index);
    });
  } else if (tier === 'summary') {
    // Tier 2: 上位5ページのコンパクト情報
    text += '\n上位ページ:\n';
    pages.slice(0, 5).forEach((page, index) => {
      text += buildSummaryPageDetail(page, index);
    });
  }
  // Tier 3 (compact): 集計統計のみ、追加なし

  return text;
}
