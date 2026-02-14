import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { MarketService } from '../../services/market.service';
import { MarketQuote, IndexQuote } from '../../models/market.model';
import { MarketDetailModalComponent } from '../market-detail-modal/market-detail-modal.component';
import { ThemeToggleComponent } from '../theme-toggle/theme-toggle.component';
import { InvestmentSearchModalComponent } from '../investment-search-modal/investment-search-modal.component';

/**
 * Friendly display names for stock symbols.
 * Index names come directly from the backend (via Yahoo Finance).
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
  JNJ: 'Johnson & Johnson',
  WMT: 'Walmart',
  DIS: 'Disney',
  NFLX: 'Netflix',
  PYPL: 'PayPal',
  INTC: 'Intel',
  AMD: 'AMD',
  CRM: 'Salesforce',
  BA: 'Boeing',
  KO: 'Coca-Cola',
};

/** localStorage key for saving the user's custom watchlist symbols */
const WATCHLIST_STORAGE_KEY = 'market-app-watchlist';

/** Default symbols shown when the user hasn't customized their watchlist */
const DEFAULT_WATCHLIST = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA'];

/**
 * MarketStripComponent — the full market overview page layout.
 *
 * Layout from top to bottom:
 *   1. Header — "Markets" title + subtitle + theme toggle
 *   2. Info Boxes — Auto-Refresh status + Stock Details + Finance Watchlist
 *   3. Split View — left table (9 world indices) + right grid (watchlist cards)
 *
 * Data comes from two separate API endpoints:
 *   - /api/indices     → Yahoo Finance (indices like ^DJI, ^GSPC)
 *   - /api/market-data → Finnhub (stocks like AAPL, MSFT)
 */
@Component({
  selector: 'app-market-strip',
  standalone: true,
  imports: [
    CommonModule,
    MarketDetailModalComponent,
    ThemeToggleComponent,
    InvestmentSearchModalComponent,
  ],
  templateUrl: './market-strip.component.html',
  styleUrl: './market-strip.component.css',
})
export class MarketStripComponent implements OnInit, OnDestroy {
  // ── Index data (left table — from Yahoo Finance) ──
  indexQuotes: IndexQuote[] = [];
  isLoadingIndices = true;

  // ── Watchlist data (right grid — from Finnhub) ──
  stockQuotes: MarketQuote[] = [];
  isLoadingStocks = true;

  // ── Watchlist management ──
  // The user's chosen symbols, persisted in localStorage
  watchlistSymbols: string[] = [];

  // ── Modals ──
  selectedSymbol: string | null = null;
  showSearchModal = false;

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

  // Total number of tracked markets (indices + watchlist stocks)
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
    this.loadWatchlistFromStorage();
    this.startAutoRefresh();
    this.updateMarketSessionStatus();
  }

  ngOnDestroy(): void {
    this.indexSub?.unsubscribe();
    this.stockSub?.unsubscribe();
  }

  // ─────────────────────────────────────────────────────
  // Watchlist persistence (localStorage)
  // ─────────────────────────────────────────────────────

  /**
   * Loads saved watchlist symbols from localStorage.
   * Falls back to the default list if nothing is saved.
   */
  private loadWatchlistFromStorage(): void {
    try {
      const saved = localStorage.getItem(WATCHLIST_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.watchlistSymbols = parsed;
          return;
        }
      }
    } catch {
      // If parsing fails, use defaults
    }
    this.watchlistSymbols = [...DEFAULT_WATCHLIST];
  }

  /** Saves the current watchlist symbols to localStorage */
  private saveWatchlistToStorage(): void {
    localStorage.setItem(
      WATCHLIST_STORAGE_KEY,
      JSON.stringify(this.watchlistSymbols)
    );
  }

  // ─────────────────────────────────────────────────────
  // Watchlist add / remove
  // ─────────────────────────────────────────────────────

  /**
   * Adds a symbol to the watchlist (from the search modal).
   * Skips if already in the list. Immediately fetches fresh data.
   */
  addToWatchlist(symbol: string): void {
    // Don't add duplicates
    if (this.watchlistSymbols.includes(symbol)) {
      this.showSearchModal = false;
      return;
    }

    this.watchlistSymbols.push(symbol);
    this.saveWatchlistToStorage();
    this.refreshWatchlistData();
    this.showSearchModal = false;
  }

  /**
   * Removes a symbol from the watchlist.
   * Called when the user clicks the X on a card.
   */
  removeFromWatchlist(symbol: string): void {
    this.watchlistSymbols = this.watchlistSymbols.filter((s) => s !== symbol);
    this.stockQuotes = this.stockQuotes.filter((q) => q.symbol !== symbol);
    this.saveWatchlistToStorage();
    this.recalculateStats();
  }

  // ─────────────────────────────────────────────────────
  // Search modal
  // ─────────────────────────────────────────────────────

  openSearchModal(): void {
    this.showSearchModal = true;
  }

  closeSearchModal(): void {
    this.showSearchModal = false;
  }

  // ─────────────────────────────────────────────────────
  // Auto-refresh management
  // ─────────────────────────────────────────────────────

  /**
   * Subscribes to both data streams — indices and watchlist stocks.
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

    // Fetch watchlist stock data (custom symbols)
    this.refreshWatchlistData();
  }

  /**
   * Fetches fresh data for just the watchlist symbols.
   */
  private refreshWatchlistData(): void {
    if (this.watchlistSymbols.length === 0) {
      this.stockQuotes = [];
      this.isLoadingStocks = false;
      return;
    }

    this.isLoadingStocks = true;
    this.stockSub?.unsubscribe();
    this.stockSub = this.marketService
      .getWatchlistData(this.watchlistSymbols)
      .subscribe({
        next: (data) => {
          this.stockQuotes = data;
          this.isLoadingStocks = false;
          this.lastUpdate = new Date();
          this.recalculateStats();
        },
        error: (err) => {
          console.error('Failed to load watchlist data:', err);
          this.isLoadingStocks = false;
        },
      });
  }

  /**
   * Toggles auto-refresh on or off.
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
   * Manual refresh — fetches both indices and watchlist stocks immediately.
   */
  refreshData(): void {
    if (this.autoRefreshEnabled) {
      this.marketService.refreshIndices();
    } else {
      this.isLoadingIndices = true;
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
    }

    // Always do a fresh watchlist fetch
    this.refreshWatchlistData();
  }

  // ─────────────────────────────────────────────────────
  // Computed values for the info boxes
  // ─────────────────────────────────────────────────────

  private recalculateStats(): void {
    this.calculateAverageChange();
    this.updateMarketSessionStatus();
  }

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
    const etString = now.toLocaleString('en-US', {
      timeZone: 'America/New_York',
    });
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

  /** Returns a friendly name for a stock symbol */
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
