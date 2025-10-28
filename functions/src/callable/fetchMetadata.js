import { HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';

/**
 * サイトのメタデータを取得
 */
export const fetchMetadataCallable = async (request) => {
  const { siteUrl } = request.data;

  // URLバリデーション
  if (!siteUrl) {
    throw new HttpsError('invalid-argument', 'Site URL is required');
  }

  try {
    // URLの正規化
    const normalizedUrl = siteUrl.startsWith('http') ? siteUrl : `https://${siteUrl}`;
    
    logger.info(`[fetchMetadata] Fetching metadata for: ${normalizedUrl}`);

    // HTMLを取得
    const response = await fetch(normalizedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
      redirect: 'follow',
      timeout: 30000, // 30秒タイムアウト
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();

    // メタデータを抽出
    const metadata = extractMetadata(html);

    logger.info(`[fetchMetadata] Successfully extracted metadata`);

    return {
      success: true,
      metadata,
    };
  } catch (error) {
    logger.error('[fetchMetadata] Error:', error);
    throw new HttpsError('internal', `Failed to fetch metadata: ${error.message}`);
  }
};

/**
 * HTMLからメタデータを抽出
 */
function extractMetadata(html) {
  const metadata = {
    title: '',
    description: '',
    ogTitle: '',
    ogDescription: '',
    ogImage: '',
  };

  try {
    // タイトル抽出
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) {
      metadata.title = decodeHtmlEntities(titleMatch[1].trim());
    }

    // Meta Description 抽出
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
                      html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i);
    if (descMatch) {
      metadata.description = decodeHtmlEntities(descMatch[1].trim());
    }

    // OG Title 抽出
    const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i) ||
                         html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i);
    if (ogTitleMatch) {
      metadata.ogTitle = decodeHtmlEntities(ogTitleMatch[1].trim());
    }

    // OG Description 抽出
    const ogDescMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i) ||
                        html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:description["']/i);
    if (ogDescMatch) {
      metadata.ogDescription = decodeHtmlEntities(ogDescMatch[1].trim());
    }

    // OG Image 抽出
    const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
                         html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
    if (ogImageMatch) {
      metadata.ogImage = ogImageMatch[1].trim();
    }

    // 優先順位に基づいてタイトルと説明文を決定
    if (!metadata.title && metadata.ogTitle) {
      metadata.title = metadata.ogTitle;
    }
    if (!metadata.description && metadata.ogDescription) {
      metadata.description = metadata.ogDescription;
    }

  } catch (error) {
    logger.error('[extractMetadata] Error:', error);
  }

  return metadata;
}

/**
 * HTMLエンティティをデコード
 */
function decodeHtmlEntities(text) {
  const entities = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&#x27;': "'",
    '&#x2F;': '/',
    '&nbsp;': ' ',
  };

  return text.replace(/&[#\w]+;/g, (entity) => entities[entity] || entity);
}

