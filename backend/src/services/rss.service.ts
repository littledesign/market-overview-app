import RSSParser from 'rss-parser';
import { NEWS_FEEDS, AI_KEYWORDS, type FeedConfig } from '../config/newsFeeds.js';

export interface NormalizedArticle {
  id: string;
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  summary: string;
  tags: string[];
  /** Image URL from RSS enclosure or media:content — used when metadata fetch has no image */
  imageUrl?: string | null;
  /** Plain-text article content from RSS (stripped HTML, truncated) — used for AI summarization */
  content?: string;
}

interface CacheEntry {
  articles: NormalizedArticle[];
  fetchedAt: number;
}

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
let cache: CacheEntry | null = null;

// Custom fields for media:content and media:thumbnail (common in RSS feeds)
type CustomItem = { mediaContent?: { $?: { url?: string } } | Array<{ $?: { url?: string } }>; mediaThumbnail?: { $?: { url?: string } } | Array<{ $?: { url?: string } }> };
const parser = new RSSParser<object, CustomItem>({
  customFields: {
    item: [
      ['media:content', 'mediaContent', { keepArray: true }],
      ['media:thumbnail', 'mediaThumbnail', { keepArray: true }],
    ],
  },
});

const MAX_CONTENT_CHARS = 6000;

/** Strip HTML to plain text for AI summarization */
function stripHtmlToText(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#\d+;/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, MAX_CONTENT_CHARS);
}

function generateId(url: string): string {
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    const char = url.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function tagArticle(title: string, summary: string): string[] {
  const text = `${title} ${summary}`.toLowerCase();
  return AI_KEYWORDS.filter(keyword => text.includes(keyword));
}

/** Extract URL from media object (xml2js-style: { $: { url: '...' } } or similar) */
function urlFromMedia(obj: any): string | null {
  if (!obj) return null;
  const arr = Array.isArray(obj) ? obj : [obj];
  for (const x of arr) {
    const url = x?.$?.url ?? x?.url ?? (typeof x === 'string' ? x : null);
    if (url && url.startsWith('http')) return url;
  }
  return null;
}

/** Extract image URL from RSS item: enclosure, media:content, or media:thumbnail */
function extractImageFromItem(item: any): string | null {
  // Standard RSS enclosure (type image/*)
  const enc = item.enclosure;
  if (enc?.url && /^image\//i.test(enc.type || '')) {
    return enc.url;
  }

  // media:content
  const mcUrl = urlFromMedia((item as CustomItem).mediaContent);
  if (mcUrl) return mcUrl;

  // media:thumbnail
  const mtUrl = urlFromMedia((item as CustomItem).mediaThumbnail);
  if (mtUrl) return mtUrl;

  // Fallback: enclosure with no type or image-like type
  if (enc?.url && (!enc.type || /image|jpeg|png|gif|webp/i.test(enc.type))) {
    return enc.url;
  }

  // Fallback: first <img src> in HTML content (e.g. Medium/UX Collective embeds images in content:encoded)
  const htmlContent = item.content || item['content:encoded'] || '';
  if (htmlContent) {
    const imgMatch = htmlContent.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (imgMatch?.[1] && imgMatch[1].startsWith('http')) {
      return imgMatch[1];
    }
  }

  return null;
}

async function fetchFeed(feed: FeedConfig): Promise<NormalizedArticle[]> {
  try {
    const parsed = await parser.parseURL(feed.url);
    return (parsed.items || []).map(item => {
      // Some feeds (e.g. A List Apart) include leading/trailing whitespace inside
      // <link> and <title> tags. Trim everything so hrefs work correctly.
      const title = (item.title || 'Untitled').trim();
      const url = (item.link || item.guid || '').trim();
      const summary = item.contentSnippet || item.content || '';
      const imageUrl = extractImageFromItem(item) || null;
      const rawContent = item.content || item['content:encoded'] || '';
      const content = rawContent ? stripHtmlToText(rawContent) : undefined;
      return {
        id: generateId(url || title),
        title,
        url,
        source: feed.name,
        publishedAt: item.isoDate || item.pubDate || new Date().toISOString(),
        summary: summary.substring(0, 300),
        tags: tagArticle(title, summary),
        imageUrl: imageUrl || undefined,
        content,
      };
    });
  } catch (err: any) {
    console.error(`Failed to fetch RSS feed "${feed.name}":`, err.message);
    return [];
  }
}

export async function fetchAllArticles(): Promise<NormalizedArticle[]> {
  try {
    if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
      return cache.articles;
    }

    const feedResults = await Promise.all((NEWS_FEEDS || []).map(fetchFeed));
    const articles = feedResults
      .flat()
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

    cache = { articles, fetchedAt: Date.now() };
    return articles;
  } catch (err: any) {
    console.error('fetchAllArticles error:', err.message);
    return cache?.articles ?? [];
  }
}
