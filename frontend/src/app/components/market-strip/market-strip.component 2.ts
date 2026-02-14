import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { MarketService } from '../../services/market.service';
import { MarketQuote, IndexQuote } from '../../models/market.model';
import { MarketDetailModalComponent } from '../market-detail-modal/market-detail-modal.component';
import { ThemeToggleComponent } from '../theme-toggle/theme-toggle.component';

/**
 * Friendly display names for stock symbols.
 * Index names come directly from the backend now (via Yahoo Finance),
 * so we only need this map for individual stocks.
 */
const STOCK_NAMES: Record<string, string> = {
  AAPL: 'Apple',
  MSFT: 'Microsoft',
  GOOGL: 'Alphabet',
  AMZN: 'Amazon',
  NVDA: 'NVIDIA',
  META: 'Meta',
  TSLA: 'Tesla',
  JPM: 'JPMorgan',
  V: 'Visa',
  'BRK.B': 'Berkshire',
};

/**
 * MarketStripComponent — the full market overview page layout.
 *
 * Layout from top to bottom:
 *   1. Header — "Markets" title + subtitle + theme toggle
 *   2. Info Boxes — Auto-Refresh status + Stock Details summary
 *   3. Split View — left table (9 world indices) + right grid (stock cards)
 *
 * Data comes from two separate API endpoints:
 *   - /api/indices    → Yahoo Finance (indices like ^DJI, ^GSPC)
 *   - /api/market-data → Finnhub (stocks like AAPL, MSFT)
 */
@Component({
  selector: 'app-market-strip',
  standalone: true,
  imports: [CommonModule, MarketDetailModalComponent, ThemeToggleComponent],
  templateUrl: './market-strip.component.html',
  styleUrl: './market-strip.component.css',
})
export class MarketStripComponent implements OnInit, OnDestroy {
  // ── Index data (left table — from Yahoo Finance) ──
  indexQuotes: IndexQuote[] = [];
  isLoadingIndices = true;

  // ── Stock data (right grid — from Finnhub) ──
  stockQuotes: MarketQuote[] = [];
  isLoadingStocks = true;

  // ── Modal ──
  selectedSymbol: string | null = null;

  // ── Auto-refresh controls ──
  autoRefreshEnabled = true;
  lastUpdate: Date | null = null;

  get refreshIntervalSeconds(): number {
    return this.marketService.refreshInterval / 1000;
  }

  // ── Computed stats for the Stock Details info box ──
  averageChange = 0;
  marketSessionStatus = '';
  isMarketOpen = false;

  // Combined loading state for the info boxes
  get isLoading(): boolean {
    return this.isLoadingIndices && this.isLoadingStocks;
  }

  // Total number of tracked markets (indices + stocks)
  get totalMarkets(): number {
    return this.indexQuotes.length + this.stockQuotes.length;
  }

  private indexSub?: Subscription;
  private stockSub?: Subscription;

  constructor(private marketService: MarketService) {}

  // ─────────────────────────────────────────────────────
  // Lifecycle
  // ─────────────────────────────────────────────────────

  ngOnInit(): void {
    this.startAutoRefresh();
    this.updateMarketSessionStatus();
  }

  ngOnDestroy(): void {
    this.indexSub?.unsubscribe();
    this.stockSub?.unsubscribe();
  }

  // ─────────────────────────────────────────────────────
  // Auto-refresh management
  // ─────────────────────────────────────────────────────

  /**
   * Subscribes to both data streams — indices and stocks refresh independently.
   */
  private startAutoRefresh(): void {
    this.indexSub?.unsubscribe();
    this.stockSub?.unsubscribe();

    // Subscribe to index data (Yahoo Finance)
    this.indexSub = this.marketService.getIndices().subscribe({
      next: (data) => {
        this.indexQuotes = data;
        this.isLoadingIndices = false;
        this.lastUpdate = new Date();
        this.recalculateStats();
      },
      error: (err) => {
        console.error('Failed to load index data:', err);
        this.isLoadingIndices = false;
      },
    });

    // Subscribe to stock data (Finnhub)
    this.stockSub = this.marketService.getMarketData().subscribe({
      next: (data) => {
        this.stockQuotes = data;
        this.isLoadingStocks = false;
        this.lastUpdate = new Date();
        this.recalculateStats();
      },
      error: (err) => {
        console.error('Failed to load stock data:', err);
        this.isLoadingStocks = false;
      },
    });
  }

  /**
   * Toggles auto-refresh on or off for both data streams.
   */
  toggleAutoRefresh(): void {
    this.autoRefreshEnabled = !this.autoRefreshEnabled;

    if (this.autoRefreshEnabled) {
      this.startAutoRefresh();
    } else {
      this.indexSub?.unsubscribe();
      this.stockSub?.unsubscribe();
    }
  }

  /**
   * Manual refresh — fetches both indices and stocks immediately.
   */
  refreshData(): void {
    if (this.autoRefreshEnabled) {
      // Restarts both auto-refresh timers
      this.marketService.refreshData();
    } else {
      // One-shot fetches when auto-refresh is off
      this.isLoadingIndices = true;
      this.isLoadingStocks = true;

      this.marketService.fetchIndicesOnce().subscribe({
        next: (data) => {
          this.indexQuotes = data;
          this.isLoadingIndices = false;
          this.lastUpdate = new Date();
          this.recalculateStats();
        },
        error: (err) => {
          console.error('Manual index refresh failed:', err);
          this.isLoadingIndices = false;
        },
      });

      this.marketService.fetchMarketDataOnce().subscribe({
        next: (data) => {
          this.stockQuotes = data;
          this.isLoadingStocks = false;
          this.lastUpdate = new Date();
          this.recalculateStats();
        },
        error: (err) => {
          console.error('Manual stock refresh failed:', err);
          this.isLoadingStocks = false;
        },
      });
    }
  }

  // ─────────────────────────────────────────────────────
  // Computed values for the info boxes
  // ─────────────────────────────────────────────────────

  /**
   * Recalculates average change and market session whenever data updates.
   */
  private recalculateStats(): void {
    this.calculateAverageChange();
    this.updateMarketSessionStatus();
  }

  /**
   * Averages the percent change across all loaded data (indices + stocks).
   */
  private calculateAverageChange(): void {
    const allQuotes = [
      ...this.indexQuotes.map((q) => q.percentChange || 0),
      ...this.stockQuotes.map((q) => q.percentChange || 0),
    ];
    if (allQuotes.length === 0) {
      this.averageChange = 0;
      return;
    }
    const sum = allQuotes.reduce((acc, val) => acc + val, 0);
    this.averageChange = sum / allQuotes.length;
  }

  private updateMarketSessionStatus(): void {
    const now = new Date();
    const etString = now.toLocaleString('en-US', { timeZone: 'America/New_York' });
    const et = new Date(etString);
    const hour = et.getHours();
    const minute = et.getMinutes();
    const day = et.getDay();
    const timeInMinutes = hour * 60 + minute;

    if (day === 0 || day === 6) {
      this.marketSessionStatus = 'Markets Closed — Weekend';
      this.isMarketOpen = false;
      return;
    }

    if (timeInMinutes >= 240 && timeInMinutes < 570) {
      this.marketSessionStatus = 'Pre-Market';
      this.isMarketOpen = false;
    } else if (timeInMinutes >= 570 && timeInMinutes < 960) {
      this.marketSessionStatus = 'Regular Hours';
      this.isMarketOpen = true;
    } else if (timeInMinutes >= 960 && timeInMinutes < 1200) {
      this.marketSessionStatus = 'After-Hours';
      this.isMarketOpen = false;
    } else {
      this.marketSessionStatus = 'Markets Closed';
      this.isMarketOpen = false;
    }
  }

  // ─────────────────────────────────────────────────────
  // Template helpers
  // ─────────────────────────────────────────────────────

  get averageChangeClass(): string {
    if (this.averageChange > 0) return 'positive';
    if (this.averageChange < 0) return 'negative';
    return 'neutral';
  }

  /**
   * Returns a friendly name for a stock symbol (e.g. "AAPL" → "Apple").
   * Index names come from the backend, so this is only for the watchlist grid.
   */
  getStockName(symbol: string): string {
    return STOCK_NAMES[symbol] ?? symbol;
  }

  formatPercent(value: number): string {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  }

  formatChange(value: number): string {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}`;
  }

  getDirection(change: number): 'up' | 'down' | 'neutral' {
    if (change > 0) return 'up';
    if (change < 0) return 'down';
    return 'neutral';
  }

  openDetail(symbol: string): void {
    this.selectedSymbol = symbol;
  }

  closeDetail(): void {
    this.selectedSymbol = null;
  }
}
