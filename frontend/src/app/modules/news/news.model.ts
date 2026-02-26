export interface NewsItem {
  id: string;
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  summary: string;
  tags: string[];
  /** Fetched from metadata API — og:image or similar */
  imageUrl?: string | null;
  /** Fetched from metadata API — meta description; fallback to summary */
  description?: string | null;
  /** Plain-text article content from RSS — used for AI summarization */
  content?: string;
}
