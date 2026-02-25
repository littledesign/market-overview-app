/**
 * Fetches article metadata (og:image, description) from a URL.
 * Used by the News module to display article images and descriptions.
 * Caches responses in memory to avoid repeated fetches.
 */

import axios from 'axios';

export interface ArticleMetadata {
  imageUrl: string | null;
  description: string | null;
}

interface CacheEntry {
  data: ArticleMetadata;
  fetchedAt: number;
}

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const METADATA_CACHE = new Map<string, CacheEntry>();

/** Extract og:image, twitter:image, or first img from meta tags via regex */
function extractFromHtml(html: string): ArticleMetadata {
  let imageUrl: string | null = null;
  let description: string | null = null;

  // og:image — try content before property and property before content
  const ogImage1 = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1];
  const ogImage2 = html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)?.[1];
  const twitterImage = html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i)?.[1]
    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i)?.[1];
  const firstImg = html.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1];

  imageUrl = ogImage1 || ogImage2 || twitterImage || firstImg || null;

  // og:description or meta description
  const ogDesc1 = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)?.[1];
  const ogDesc2 = html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i)?.[1];
  const metaDesc = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1]
    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i)?.[1];

  description = ogDesc1 || ogDesc2 || metaDesc || null;

  if (description) {
    description = description.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
    if (description.length > 200) description = description.substring(0, 200) + '…';
  }

  return { imageUrl, description };
}

export async function fetchArticleMetadata(url: string): Promise<ArticleMetadata> {
  const cached = METADATA_CACHE.get(url);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const res = await axios.get(url, {
      timeout: 8000,
      maxContentLength: 500000, // 500KB max
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; UXDeskBot/1.0; +https://example.com)',
        Accept: 'text/html',
      },
      validateStatus: (status) => status >= 200 && status < 400,
    });

    const html = typeof res.data === 'string' ? res.data : '';
    const data = extractFromHtml(html);
    METADATA_CACHE.set(url, { data, fetchedAt: Date.now() });
    return data;
  } catch (err) {
    console.error(`Metadata fetch failed for ${url}:`, (err as Error).message);
    return { imageUrl: null, description: null };
  }
}
