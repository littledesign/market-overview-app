/**
 * Describes the shape of a single stock quote from our API (Finnhub).
 * Think of this as a "blueprint" — it tells TypeScript what fields to expect.
 */
export interface MarketQuote {
  symbol: string;
  currentPrice: number;
  change: number;
  percentChange: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  timestamp: number;
  error?: boolean; // true if this symbol failed to load
}

/**
 * Describes a market index quote from Yahoo Finance.
 * Similar to MarketQuote but also includes a display name (e.g. "Dow Jones").
 * The backend sends the name because index symbols like "^DJI" aren't user-friendly.
 */
export interface IndexQuote {
  symbol: string;
  name: string;
  currentPrice: number;
  change: number;
  percentChange: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  timestamp: number;
  error?: boolean;
}

/**
 * Describes a search result from the Finnhub symbol search API.
 * Used in the "Add Investment" search modal.
 */
export interface SearchResult {
  symbol: string;
  name: string;
  type: string;
  exchange?: string;
}

/**
 * Describes the company profile data returned by our API (Finnhub).
 */
export interface CompanyProfile {
  symbol: string;
  name: string;
  logo: string;
  industry: string;
  marketCap: number;
  exchange: string;
  currency: string;
  weburl: string;
}
