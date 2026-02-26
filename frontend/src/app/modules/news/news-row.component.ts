import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NewsService, ArticleMetadata } from './news.service';
import { NewsItem } from './news.model';
import { SupabaseService } from '../../services/supabase.service';
import { PreferencesService } from '../../services/preferences.service';

interface SourceGroup {
  source: string;
  items: NewsItem[];
}

const SUMMARY_CACHE_KEY = 'news_summary_cache';

@Component({
  selector: 'app-news-row',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './news-row.component.html',
  styleUrl: './news-row.component.css',
})
export class NewsRowComponent implements OnInit {
  articles: NewsItem[] = [];
  sourceGroups: SourceGroup[] = [];
  sources: string[] = [];
  savedUrls = new Set<string>();

  /** Metadata (imageUrl, description) per article URL */
  metadataMap = new Map<string, ArticleMetadata>();

  /** URLs whose images failed to load — show placeholder instead */
  failedImageUrls = new Set<string>();

  /** Summary modal state */
  showSummaryModal = false;
  summaryArticle: NewsItem | null = null;
  summaryText = '';
  summaryLoading = false;
  summaryError = '';

  loading = true;
  error = false;

  aiOnly = false;
  selectedSource = '';

  private readonly MAX_ITEMS_PER_SOURCE = 5;

  constructor(
    private newsService: NewsService,
    private supabase: SupabaseService,
    private prefs: PreferencesService,
  ) {}

  ngOnInit() {
    this.loadSources();
    this.loadArticles();
    this.loadSavedNews();
  }

  loadArticles() {
    this.loading = true;
    this.error = false;

    this.newsService.getItems(this.aiOnly, this.selectedSource || undefined).subscribe({
      next: (items) => {
        this.articles = items;
        this.buildSourceGroups();
        this.loadMetadataForTopArticles();
        this.loading = false;
      },
      error: () => {
        this.error = true;
        this.loading = false;
      },
    });
  }

  private buildSourceGroups(): void {
    const grouped = new Map<string, NewsItem[]>();
    for (const article of this.articles) {
      const key = article.source || 'Unknown';
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(article);
    }
    this.sourceGroups = Array.from(grouped.entries()).map(([source, items]) => ({
      source,
      items: items.slice(0, this.MAX_ITEMS_PER_SOURCE),
    }));
  }

  /** Load metadata for the top (first) article in each group */
  private loadMetadataForTopArticles(): void {
    for (const group of this.sourceGroups) {
      const top = group.items[0];
      if (top && !this.metadataMap.has(top.url)) {
        this.newsService.getMetadata(top.url).subscribe((meta) => {
          // Prefer metadata image; fall back to RSS imageUrl when metadata has none
          const imageUrl = meta.imageUrl || top.imageUrl || null;
          this.metadataMap.set(top.url, { ...meta, imageUrl });
          this.metadataMap = new Map(this.metadataMap); // trigger change detection
        });
      }
    }
  }

  /** Image URL: from metadata API, or from RSS (article.imageUrl) */
  getImageUrl(article: NewsItem): string | null {
    const meta = this.metadataMap.get(article.url);
    return meta?.imageUrl || article.imageUrl || null;
  }

  getMetadata(url: string): ArticleMetadata | undefined {
    return this.metadataMap.get(url);
  }

  getDescription(article: NewsItem): string {
    const meta = this.metadataMap.get(article.url);
    const desc = meta?.description || article.summary;
    return desc ? desc.trim() : '';
  }

  isTopArticle(group: SourceGroup, article: NewsItem): boolean {
    return group.items[0]?.id === article.id;
  }

  /** Call when image fails to load — fall back to placeholder */
  onImageError(url: string): void {
    this.failedImageUrls.add(url);
    this.failedImageUrls = new Set(this.failedImageUrls);
  }

  shouldShowImage(article: NewsItem): boolean {
    const url = this.getImageUrl(article);
    return !!(url && !this.failedImageUrls.has(article.url));
  }

  loadSources() {
    this.newsService.getSources().subscribe(s => this.sources = s);
  }

  async loadSavedNews() {
    if (!this.supabase.isLoggedIn) return;
    const saved = await this.prefs.getSavedNews();
    this.savedUrls = new Set(saved.map(s => s.url));
  }

  onFilterChange() {
    this.loadArticles();
  }

  isSaved(article: NewsItem): boolean {
    return this.savedUrls.has(article.url);
  }

  async toggleSave(article: NewsItem) {
    if (!this.supabase.isLoggedIn) return;

    if (this.isSaved(article)) {
      await this.prefs.unsaveNewsItem(article.url);
      this.savedUrls.delete(article.url);
    } else {
      await this.prefs.saveNewsItem({
        url: article.url,
        title: article.title,
        source: article.source,
        published_at: article.publishedAt,
        tags: article.tags,
      });
      this.savedUrls.add(article.url);
    }
  }

  formatDate(dateStr: string): string {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  }

  openSummary(article: NewsItem): void {
    if (this.summaryLoading) return;

    const cached = this.getCachedSummary(article.url);
    if (cached) {
      this.summaryArticle = article;
      this.summaryText = cached;
      this.summaryError = '';
      this.summaryLoading = false;
      this.showSummaryModal = true;
      return;
    }

    this.summaryArticle = article;
    this.summaryText = '';
    this.summaryError = '';
    this.summaryLoading = true;
    this.showSummaryModal = true;

    const desc = this.getDescription(article);

    const requestedUrl = article.url;
    this.newsService.summarize(article.url, article.title, desc, article.content).subscribe({
      next: (res) => {
        if (this.summaryArticle?.url === requestedUrl) {
          this.summaryText = res.summary;
          this.cacheSummary(requestedUrl, res.summary);
        }
        this.summaryLoading = false;
      },
      error: (err) => {
        if (this.summaryArticle?.url === requestedUrl) {
          this.summaryError = err.error?.error || 'Failed to generate summary.';
        }
        this.summaryLoading = false;
      },
    });
  }

  closeSummaryModal(): void {
    this.showSummaryModal = false;
    this.summaryArticle = null;
    this.summaryText = '';
    this.summaryError = '';
  }

  private getCachedSummary(url: string): string | null {
    try {
      const raw = localStorage.getItem(SUMMARY_CACHE_KEY);
      if (!raw) return null;
      const cache: Record<string, string> = JSON.parse(raw);
      return cache[url] || null;
    } catch {
      return null;
    }
  }

  private cacheSummary(url: string, summary: string): void {
    try {
      const raw = localStorage.getItem(SUMMARY_CACHE_KEY);
      const cache: Record<string, string> = raw ? JSON.parse(raw) : {};
      cache[url] = summary;
      if (Object.keys(cache).length > 50) {
        const keys = Object.keys(cache).slice(0, 25);
        keys.forEach(k => delete cache[k]);
      }
      localStorage.setItem(SUMMARY_CACHE_KEY, JSON.stringify(cache));
    } catch {
      /* ignore */
    }
  }
}
