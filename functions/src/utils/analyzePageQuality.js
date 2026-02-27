import { logger } from 'firebase-functions/v2';

/**
 * GA4アクセスデータとサイトマップ構造データを統合し、
 * ページ品質を分析して問題のあるページを特定
 * 
 * @param {object} params - パラメータ
 * @param {Array} params.ga4PageData - GA4ページ別データ
 * @param {Array} params.sitemapPages - サイトマップページデータ（サブコレクションから取得）
 * @param {Array} params.landingPageData - GA4ランディングページデータ
 * @returns {object} - 統合分析結果
 */
export function analyzePageQuality({ ga4PageData = [], sitemapPages = [], landingPageData = [] }) {
  logger.info('[analyzePageQuality] 分析開始', {
    ga4PageCount: ga4PageData.length,
    sitemapPageCount: sitemapPages.length,
    landingPageCount: landingPageData.length,
  });

  // 1. ページパスをキーにしたマップを作成
  const ga4PageMap = new Map();
  ga4PageData.forEach((page) => {
    if (page.pagePath) {
      ga4PageMap.set(page.pagePath, page);
    }
  });

  const landingPageMap = new Map();
  landingPageData.forEach((page) => {
    if (page.pagePath) {
      landingPageMap.set(page.pagePath, page);
    }
  });

  // 2. サイトマップページデータとGA4データをマッチング
  const matchedPages = [];
  const unmatchedPages = [];

  sitemapPages.forEach((sitemapPage) => {
    const path = sitemapPage.path || '';
    const ga4Data = ga4PageMap.get(path);
    const landingData = landingPageMap.get(path);

    if (ga4Data || landingData) {
      matchedPages.push({
        ...sitemapPage,
        ga4: ga4Data || null,
        landing: landingData || null,
      });
    } else {
      unmatchedPages.push(sitemapPage);
    }
  });

  logger.info('[analyzePageQuality] マッチング完了', {
    matched: matchedPages.length,
    unmatched: unmatchedPages.length,
  });

  // 3. 各ページのコンテンツ品質スコアを計算
  const scoredPages = matchedPages.map((page) => {
    const contentScore = calculateContentQualityScore(page);
    const issues = identifyPageIssues(page, contentScore);

    return {
      ...page,
      contentScore,
      issues,
    };
  });

  // 4. 問題のあるページを抽出（issuesが1つ以上あるページ）
  const problematicPages = scoredPages.filter(page => page.issues.length > 0);

  // 5. 問題の重要度でソート（GA4アクセスデータがある場合はPV順、ない場合はスコア順）
  problematicPages.sort((a, b) => {
    const aViews = a.ga4?.pageViews || 0;
    const bViews = b.ga4?.pageViews || 0;

    if (aViews !== bViews) {
      return bViews - aViews; // PV降順
    }

    return a.contentScore - b.contentScore; // スコア昇順（低い方が問題）
  });

  // 6. 統計データを計算
  const stats = calculateStats(scoredPages, ga4PageData);

  logger.info('[analyzePageQuality] 分析完了', {
    totalPages: scoredPages.length,
    problematicPages: problematicPages.length,
    avgContentScore: stats.avgContentScore,
  });

  return {
    problematicPages: problematicPages.slice(0, 30), // 上位30件のみ返す
    stats,
    totalAnalyzedPages: scoredPages.length,
    unmatchedPageCount: unmatchedPages.length,
  };
}

/**
 * コンテンツ品質スコアを計算（0-100）
 * 高いほど品質が良い
 */
export function calculateContentQualityScore(page) {
  let score = 0;

  // テキスト長（最大30点）
  const textLength = page.textLength || 0;
  if (textLength >= 2000) {
    score += 30;
  } else if (textLength >= 1000) {
    score += 20;
  } else if (textLength >= 500) {
    score += 10;
  } else if (textLength > 0) {
    score += 5;
  }

  // 見出し構造（最大30点）
  const headingStructure = page.headingStructure || {};
  const h1Count = headingStructure.h1 || 0;
  const h2Count = headingStructure.h2 || 0;
  const h3Count = headingStructure.h3 || 0;
  const h4Count = headingStructure.h4 || 0;
  const totalHeadingsForScore = h1Count + h2Count + h3Count + h4Count;

  if (totalHeadingsForScore > 0) {
    // 見出しが検出されている場合のみ個別評価
    // h1が1つ（理想）: +10点
    if (h1Count === 1) {
      score += 10;
    } else if (h1Count > 1) {
      score += 5; // 複数あっても多少加点
    }

    // h2が2個以上: +10点
    if (h2Count >= 2) {
      score += 10;
    } else if (h2Count === 1) {
      score += 5;
    }

    // h3があれば: +10点
    if (h3Count > 0) {
      score += 10;
    }
  } else {
    // 見出しが全く検出されなかった場合は中立スコア（スクレイピング精度の問題の可能性）
    score += 15;
  }

  // 画像alt属性（最大20点）
  const imagesWithAlt = page.imagesWithAlt || 0;
  const imagesWithoutAlt = page.imagesWithoutAlt || 0;
  const totalImages = imagesWithAlt + imagesWithoutAlt;

  if (totalImages > 0) {
    const altRatio = imagesWithAlt / totalImages;
    score += Math.round(altRatio * 20);
  } else {
    // 画像がない場合は加点しない（減点もしない）
    score += 10; // 中立的な点数
  }

  // タイトル・description（最大20点）
  if (page.title && page.title.length >= 10) {
    score += 10;
  } else if (page.title) {
    score += 5;
  }

  if (page.description && page.description.length >= 50) {
    score += 10;
  } else if (page.description) {
    score += 5;
  }

  return Math.min(score, 100);
}

/**
 * ページの問題点を特定
 * @returns {Array<string>} - 問題の配列
 */
export function identifyPageIssues(page, contentScore) {
  const issues = [];
  const ga4Data = page.ga4;
  const landingData = page.landing;

  // アクセスあり＆低エンゲージメント
  if (ga4Data) {
    const pageViews = ga4Data.pageViews || 0;
    const engagementRate = ga4Data.engagementRate || 0;

    if (pageViews >= 100 && engagementRate < 0.3) {
      issues.push('高アクセスだがエンゲージメント率が低い（30%未満）');
    }
  }

  // 流入あり＆直帰率高い
  if (landingData) {
    const sessions = landingData.sessions || 0;
    const bounceRate = landingData.bounceRate || 0;

    if (sessions >= 50 && bounceRate > 0.7) {
      issues.push('流入が多いが直帰率が高い（70%以上）');
    }
  }

  // コンテンツ品質が低い（50点未満）
  if (contentScore < 50) {
    issues.push('コンテンツ品質スコアが低い（50点未満）');
  }

  // テキストが少ない（500文字未満）
  const textLength = page.textLength || 0;
  if (textLength < 500) {
    issues.push('本文テキストが少ない（500文字未満）');
  }

  // 見出し構造チェック
  // ※ 全見出しが0の場合はスクレイピングで見出しを検出できなかった可能性があるためスキップ
  const headingStructure = page.headingStructure || {};
  const h1Count = headingStructure.h1 || 0;
  const h2Count = headingStructure.h2 || 0;
  const h3Count = headingStructure.h3 || 0;
  const h4Count = headingStructure.h4 || 0;
  const totalHeadings = h1Count + h2Count + h3Count + h4Count;

  if (totalHeadings > 0) {
    // 見出しが1つ以上検出されている場合のみチェック
    if (h1Count === 0) {
      issues.push('h1タグが検出されない');
    } else if (h1Count > 1) {
      issues.push('h1タグが複数検出された');
    }

    if (h2Count === 0) {
      issues.push('h2タグが検出されない');
    }
  }

  // alt属性のない画像が多い（50%以上）
  const imagesWithAlt = page.imagesWithAlt || 0;
  const imagesWithoutAlt = page.imagesWithoutAlt || 0;
  const totalImages = imagesWithAlt + imagesWithoutAlt;

  if (totalImages > 0) {
    const altRatio = imagesWithAlt / totalImages;
    if (altRatio < 0.5) {
      issues.push('画像の50%以上にalt属性がない');
    }
  }

  // タイトルやdescriptionがない・短い
  if (!page.title || page.title.length < 10) {
    issues.push('タイトルがない、または短すぎる');
  }

  if (!page.description || page.description.length < 50) {
    issues.push('meta descriptionがない、または短すぎる');
  }

  return issues;
}

/**
 * 統計データを計算
 */
function calculateStats(scoredPages, ga4PageData) {
  // 平均コンテンツスコア
  const avgContentScore = scoredPages.length > 0
    ? scoredPages.reduce((sum, p) => sum + p.contentScore, 0) / scoredPages.length
    : 0;

  // 平均PV（GA4データから）
  const avgPageViews = ga4PageData.length > 0
    ? ga4PageData.reduce((sum, p) => sum + (p.pageViews || 0), 0) / ga4PageData.length
    : 0;

  // 平均エンゲージメント率
  const avgEngagementRate = ga4PageData.length > 0
    ? ga4PageData.reduce((sum, p) => sum + (p.engagementRate || 0), 0) / ga4PageData.length
    : 0;

  return {
    avgContentScore: Math.round(avgContentScore * 10) / 10,
    avgPageViews: Math.round(avgPageViews),
    avgEngagementRate: Math.round(avgEngagementRate * 100) / 100,
  };
}
