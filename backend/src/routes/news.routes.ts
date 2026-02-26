import { Router, Request, Response } from 'express';
import { fetchAllArticles } from '../services/rss.service.js';
import { fetchArticleMetadata } from '../services/metadata.service.js';
import { fetchArticleText, summarizeArticle } from '../services/summary.service.js';

const router = Router();

/**
 * GET /api/news/items
 * Returns normalized articles from configured RSS feeds.
 * Optional query params:
 *   ?aiOnly=true   — only articles tagged with AI keywords
 *   ?source=name   — filter by source name (case-insensitive partial match)
 */
router.get('/items', async (req: Request, res: Response) => {
  try {
    let articles = await fetchAllArticles();

    const aiOnly = req.query.aiOnly === 'true';
    if (aiOnly) {
      articles = articles.filter(a => a.tags && a.tags.length > 0);
    }

    const sourceFilter = req.query.source as string | undefined;
    if (sourceFilter) {
      const lower = sourceFilter.toLowerCase();
      articles = articles.filter(a => a.source && a.source.toLowerCase().includes(lower));
    }

    res.json(articles);
  } catch (error: any) {
    console.error('Error fetching news items:', error.message);
    // Return empty array so UI doesn't break
    res.json([]);
  }
});

/**
 * GET /api/news/sources
 * Returns the list of configured feed sources.
 */
router.get('/sources', async (_req: Request, res: Response) => {
  try {
    const { NEWS_FEEDS } = await import('../config/newsFeeds.js');
    res.json((NEWS_FEEDS || []).map((f: { name: string }) => f.name));
  } catch (error: any) {
    console.error('Error fetching news sources:', error.message);
    res.json([]);
  }
});

/**
 * GET /api/news/metadata?url=...
 * Fetches og:image and description from an article URL.
 * Cached server-side for 1 hour.
 */
router.get('/metadata', async (req: Request, res: Response) => {
  const url = req.query.url as string;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Missing url query parameter' });
  }
  try {
    const metadata = await fetchArticleMetadata(url);
    res.json(metadata);
  } catch (error: any) {
    console.error('Metadata fetch error:', error.message);
    res.status(500).json({ imageUrl: null, description: null });
  }
});

/**
 * POST /api/news/summarize
 * Body: { url, title, description?, content? }
 * Uses RSS content when available; falls back to fetching the article URL.
 * Returns AI-generated summary (3–6 paragraphs). Cached server-side for 24 hours.
 */
router.post('/summarize', async (req: Request, res: Response) => {
  const { url, title, description, content } = req.body || {};
  if (!url || !title) {
    return res.status(400).json({ error: 'Missing url or title' });
  }
  try {
    const articleText = await fetchArticleText(url);
    const desc = description || '';
    const summary = await summarizeArticle(url, title, desc, articleText, content || '');
    res.json({ summary });
  } catch (error: any) {
    console.error('Summarize error:', error.message);
    const msg = error.message?.includes('ANTHROPIC_API_KEY')
      ? 'AI summarization is not configured. Add ANTHROPIC_API_KEY to .env.'
      : 'Failed to generate summary. Please try again.';
    res.status(500).json({ error: msg });
  }
});

export default router;
