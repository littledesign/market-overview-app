/**
 * Fetches article content and generates AI summaries using Anthropic Claude.
 * Caches summaries in memory to avoid repeated API calls.
 */

import axios from 'axios';
import Anthropic from '@anthropic-ai/sdk';

const SUMMARY_CACHE = new Map<string, { summary: string; fetchedAt: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const MAX_INPUT_CHARS = 6000;

/** Strip HTML tags and extract plain text, limit length */
function extractText(html: string): string {
  let text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.substring(0, MAX_INPUT_CHARS);
}

export async function fetchArticleText(url: string): Promise<string> {
  try {
    const res = await axios.get(url, {
      timeout: 10000,
      maxContentLength: 500000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; UXDeskBot/1.0)',
        Accept: 'text/html',
      },
      validateStatus: (s) => s >= 200 && s < 400,
    });
    const html = typeof res.data === 'string' ? res.data : '';
    return extractText(html);
  } catch {
    return '';
  }
}

export async function summarizeArticle(
  url: string,
  title: string,
  descriptionOrExcerpt: string,
  articleText: string,
  rssContent?: string,
): Promise<string> {
  const cacheKey = url;
  const cached = SUMMARY_CACHE.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.summary;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not configured');
  }

  // Prefer: fetched article text > RSS content > title + description fallback
  const input =
    (articleText && articleText.length > 100 ? articleText : '') ||
    (rssContent && rssContent.length > 100 ? rssContent : '') ||
    `${title}. ${descriptionOrExcerpt}`.trim();

  if (!input || input.length < 30) {
    throw new Error('Insufficient content to summarize');
  }

  const anthropic = new Anthropic({ apiKey });

  const response = await anthropic.messages.create({
    model: 'claude-3-5-haiku-latest',
    max_tokens: 1500,
    messages: [
      {
        role: 'user',
        content: `Summarize this article in 3–6 clear paragraphs. Capture the main points, key takeaways, and any actionable insights. Write in a professional, readable style. Do not add an introduction like "Here is a summary" — just provide the summary directly.

Article title: ${title}

Article content:
${input}`,
      },
    ],
  });

  const summary =
    response.content
      .filter((b): b is { type: 'text'; text: string } => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim() || 'Unable to generate summary.';

  SUMMARY_CACHE.set(cacheKey, { summary, fetchedAt: Date.now() });
  return summary;
}
