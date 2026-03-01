import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, timer, switchMap, shareReplay, Subject, startWith, map, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { MarketQuote, IndexQuote, CompanyProfile, SearchResult } from '../models/market.model';
import { environment } from '../../environments/environment';

/**
 * MarketService talks to our Node.js backend API.
 *
 * Three main capabilities:
 *   - getIndices()       → 9 world market indices via Yahoo Finance
 *   - getMarketData()    → individual stock quotes via Finnhub
 *   - searchSymbols()    → search for stocks/indices via Finnhub symbol lookup
 *
 * The watchlist feature lets users pick their own symbols,
 * which are fetched via the custom symbols query param.
 */
@Injectable({
  providedIn: 'root',
})
export class MarketService {
  private apiUrl = environment.apiBaseUrl;

  // How often to refresh data (in milliseconds) — 60 seconds
  readonly refreshInterval = 60_000;

  // Subjects that let us trigger manual refreshes
  private stockRefresh$ = new Subject<void>();
  private indexRefresh$ = new Subject<void>();

  constructor(private http: HttpClient) {}

  // ─────────────────────────────────────────────────────
  // Indices (Yahoo Finance via backend)
  // ─────────────────────────────────────────────────────

  /**
   * Gets all 9 world market indices, auto-refreshing on a timer.
   * Returns last-known prices even when markets are closed.
   */
  getIndices(): Observable<IndexQuote[]> {
    return this.indexRefresh$.pipe(
      startWith(undefined),
      switchMap(() =>
        timer(0, this.refreshInterval).pipe(
          switchMap(() => this.http.get<IndexQuote[]>(`${this.apiUrl}/indices`))
        )
      ),
      shareReplay(1)
    );
  }

  /**
   * Fetches indices just once (for manual refresh when auto-refresh is off).
   */
  fetchIndicesOnce(): Observable<IndexQuote[]> {
    return this.http.get<IndexQuote[]>(`${this.apiUrl}/indices`);
  }

  // ─────────────────────────────────────────────────────
  // Stocks (Finnhub via backend)
  // ─────────────────────────────────────────────────────

  /**
   * Gets stock quotes for default symbols, auto-refreshing on a timer.
   */
  getMarketData(): Observable<MarketQuote[]> {
    return this.stockRefresh$.pipe(
      startWith(undefined),
      switchMap(() =>
        timer(0, this.refreshInterval).pipe(
          switchMap(() => this.http.get<MarketQuote[]>(`${this.apiUrl}/market-data`))
        )
      ),
      shareReplay(1)
    );
  }

  /**
   * Fetches stock data just once (for manual refresh when auto-refresh is off).
   */
  fetchMarketDataOnce(): Observable<MarketQuote[]> {
    return this.http.get<MarketQuote[]>(`${this.apiUrl}/market-data`);
  }

  /**
   * Fetches quotes for a custom list of symbols (used by the watchlist).
   * Sends them as a comma-separated query param so the backend fetches just those.
   */
  getWatchlistData(symbols: string[]): Observable<MarketQuote[]> {
    if (symbols.length === 0) {
      return of([]);
    }
    const symbolParam = symbols.join(',');
    return this.http.get<MarketQuote[]>(
      `${this.apiUrl}/market-data?symbols=${symbolParam}`
    );
  }

  // ─────────────────────────────────────────────────────
  // Symbol search (Finnhub via backend)
  // ─────────────────────────────────────────────────────

  /**
   * Searches Finnhub for symbols matching a query string.
   * Used by the "Add Investment" modal to find stocks/indices.
   */
  searchSymbols(query: string): Observable<SearchResult[]> {
    if (!query || query.length < 1) {
      return of([]);
    }

    return this.http
      .get<{ result: SearchResult[]; count: number }>(
        `${this.apiUrl}/search`,
        { params: { q: query } }
      )
      .pipe(
        map((response) => response.result || []),
        catchError((err) => {
          console.error('Symbol search failed:', err);
          return of([]);
        })
      );
  }

  // ─────────────────────────────────────────────────────
  // Single lookups
  // ─────────────────────────────────────────────────────

  /**
   * Fetches a single stock or index quote by symbol.
   * The backend detects ^ symbols and routes to Yahoo Finance automatically.
   */
  getQuote(symbol: string): Observable<MarketQuote> {
    return this.http.get<MarketQuote>(`${this.apiUrl}/quote/${symbol}`);
  }

  /**
   * Fetches a company's profile info (name, logo, industry, etc.).
   * Only works for stocks (not indices).
   */
  getProfile(symbol: string): Observable<CompanyProfile> {
    return this.http.get<CompanyProfile>(`${this.apiUrl}/profile/${symbol}`);
  }

  // ─────────────────────────────────────────────────────
  // Refresh controls
  // ─────────────────────────────────────────────────────

  /** Triggers an immediate refresh of both indices and stocks. */
  refreshData(): void {
    this.stockRefresh$.next();
    this.indexRefresh$.next();
  }

  /** Triggers an immediate refresh of just the stock data. */
  refreshStocks(): void {
    this.stockRefresh$.next();
  }

  /** Triggers an immediate refresh of just the index data. */
  refreshIndices(): void {
    this.indexRefresh$.next();
  }
}
