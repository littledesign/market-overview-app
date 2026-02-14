import { Component, Output, EventEmitter, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, switchMap, distinctUntilChanged, of } from 'rxjs';
import { Subscription } from 'rxjs';
import { MarketService } from '../../services/market.service';
import { SearchResult } from '../../models/market.model';

/**
 * Pre-built suggestions shown before the user types anything.
 * Grouped by category so they're easy to browse.
 */
interface SuggestionCategory {
  category: string;
  items: SearchResult[];
}

/** The available filter tabs at the top of the modal */
type FilterTab = 'All' | 'Stock' | 'Index' | 'Mutual Fund' | 'Currency';

/**
 * InvestmentSearchModalComponent — a full-screen modal for finding investments.
 *
 * Features:
 *   - Real-time search with debouncing (waits 300ms after typing stops)
 *   - Category filter tabs (All, Stock, Index, Mutual Fund, Currency)
 *   - Pre-built suggestion lists when no search query is entered
 *   - Emits the selected symbol back to the parent component
 */
@Component({
  selector: 'app-investment-search-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './investment-search-modal.component.html',
  styleUrl: './investment-search-modal.component.css',
})
export class InvestmentSearchModalComponent implements OnDestroy {
  /** Emits when the user wants to close the modal */
  @Output() closeModal = new EventEmitter<void>();

  /** Emits the symbol the user selected to add to their watchlist */
  @Output() addSymbol = new EventEmitter<string>();

  // ── Search state ──
  searchQuery = '';
  searchResults: SearchResult[] = [];
  isSearching = false;

  // ── Filter tabs ──
  activeTab: FilterTab = 'All';
  tabs: FilterTab[] = ['All', 'Stock', 'Index', 'Mutual Fund', 'Currency'];

  // ── Suggestions (shown when search is empty) ──
  suggestions: SuggestionCategory[] = [
    {
      category: 'Popular Stocks',
      items: [
        { symbol: 'AAPL', name: 'Apple Inc', type: 'Common Stock' },
        { symbol: 'GOOGL', name: 'Alphabet Inc Class A', type: 'Common Stock' },
        { symbol: 'MSFT', name: 'Microsoft Corporation', type: 'Common Stock' },
        { symbol: 'TSLA', name: 'Tesla Inc', type: 'Common Stock' },
        { symbol: 'NVDA', name: 'NVIDIA Corp', type: 'Common Stock' },
        { symbol: 'AMZN', name: 'Amazon.com Inc', type: 'Common Stock' },
        { symbol: 'META', name: 'Meta Platforms Inc', type: 'Common Stock' },
      ],
    },
    {
      category: 'Major Indices',
      items: [
        { symbol: '^DJI', name: 'Dow Jones Industrial Average', type: 'Index' },
        { symbol: '^GSPC', name: 'S&P 500', type: 'Index' },
        { symbol: '^IXIC', name: 'NASDAQ Composite', type: 'Index' },
        { symbol: '^FTSE', name: 'FTSE 100', type: 'Index' },
        { symbol: '^GDAXI', name: 'DAX (Germany)', type: 'Index' },
      ],
    },
    {
      category: 'More Stocks',
      items: [
        { symbol: 'JPM', name: 'JPMorgan Chase & Co', type: 'Common Stock' },
        { symbol: 'V', name: 'Visa Inc', type: 'Common Stock' },
        { symbol: 'JNJ', name: 'Johnson & Johnson', type: 'Common Stock' },
        { symbol: 'WMT', name: 'Walmart Inc', type: 'Common Stock' },
        { symbol: 'DIS', name: 'Walt Disney Co', type: 'Common Stock' },
      ],
    },
  ];

  // ── Debounced search: waits 300ms after typing stops before calling API ──
  private searchSubject$ = new Subject<string>();
  private searchSub?: Subscription;

  constructor(private marketService: MarketService) {
    // Set up the debounced search pipeline
    this.searchSub = this.searchSubject$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((query) => {
          if (query.length < 2) {
            this.isSearching = false;
            return of([]);
          }
          this.isSearching = true;
          return this.marketService.searchSymbols(query);
        })
      )
      .subscribe({
        next: (results) => {
          this.searchResults = results;
          this.isSearching = false;
        },
        error: () => {
          this.isSearching = false;
        },
      });
  }

  ngOnDestroy(): void {
    this.searchSub?.unsubscribe();
  }

  // ─────────────────────────────────────────────────────
  // User actions
  // ─────────────────────────────────────────────────────

  /** Called on every keystroke in the search input */
  onSearchInput(): void {
    this.searchSubject$.next(this.searchQuery.trim());
  }

  /** User clicks a search result or suggestion → add to watchlist */
  selectItem(symbol: string): void {
    this.addSymbol.emit(symbol);
  }

  /** Close the modal */
  close(): void {
    this.closeModal.emit();
  }

  /** Switch the active filter tab */
  setTab(tab: FilterTab): void {
    this.activeTab = tab;
  }

  /** Stop click events on the modal panel from closing it */
  stopPropagation(event: Event): void {
    event.stopPropagation();
  }

  // ─────────────────────────────────────────────────────
  // Template helpers
  // ─────────────────────────────────────────────────────

  /**
   * Filter suggestions by the active tab.
   * "All" shows everything, other tabs filter by investment type.
   */
  get filteredSuggestions(): SuggestionCategory[] {
    if (this.activeTab === 'All') {
      return this.suggestions;
    }

    // Map type names from Finnhub format to our tab labels
    const typeMatch = (type: string): boolean => {
      if (this.activeTab === 'Stock') return type === 'Common Stock';
      if (this.activeTab === 'Index') return type === 'Index';
      if (this.activeTab === 'Mutual Fund') return type === 'Mutual Fund';
      if (this.activeTab === 'Currency') return type === 'Currency' || type === 'Crypto';
      return false;
    };

    return this.suggestions
      .map((cat) => ({
        ...cat,
        items: cat.items.filter((item) => typeMatch(item.type)),
      }))
      .filter((cat) => cat.items.length > 0);
  }

  /**
   * Filter search results by the active tab.
   */
  get filteredResults(): SearchResult[] {
    if (this.activeTab === 'All') {
      return this.searchResults;
    }
    return this.searchResults.filter((r) => {
      if (this.activeTab === 'Stock') return r.type === 'Common Stock';
      if (this.activeTab === 'Index') return r.type === 'Index';
      if (this.activeTab === 'Mutual Fund') return r.type === 'Mutual Fund';
      if (this.activeTab === 'Currency') return r.type === 'Currency';
      return true;
    });
  }

  /** Returns a friendlier label for Finnhub types */
  formatType(type: string): string {
    if (type === 'Common Stock') return 'Stock';
    return type;
  }
}
