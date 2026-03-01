import axios from 'axios';

const YAHOO_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart';

// Yahoo's API returns the symbol URL-encoded, e.g. ^DJI → %5EDJI
function encodeSymbol(symbol: string): string {
  return encodeURIComponent(symbol);
}

export interface YahooQuote {
  symbol: string;
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  regularMarketDayHigh: number;
  regularMarketDayLow: number;
  regularMarketOpen: number;
  regularMarketPreviousClose: number;
  regularMarketTime: number;
  shortName: string;
}

/**
 * Fetches a single quote from Yahoo Finance's public v8 chart API.
 * No API key, no cookies, no crumb needed — just a plain GET request.
 * Works for stock indices (^DJI, ^GSPC, etc.) and regular symbols.
 */
export async function fetchYahooQuote(symbol: string): Promise<YahooQuote> {
  const url = `${YAHOO_BASE}/${encodeSymbol(symbol)}?interval=1d&range=1d`;
  const response = await axios.get(url, {
    headers: {
      // Identify as a browser to avoid bot-detection blocks
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Accept': 'application/json',
    },
    timeout: 8000,
  });

  const result = response.data?.chart?.result?.[0];
  if (!result) {
    throw new Error(`No data returned for ${symbol}`);
  }

  const meta = result.meta;
  const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? 0;
  const price = meta.regularMarketPrice ?? 0;
  const change = price - prevClose;
  const changePct = prevClose !== 0 ? (change / prevClose) * 100 : 0;

  return {
    symbol,
    regularMarketPrice: price,
    regularMarketChange: change,
    regularMarketChangePercent: changePct,
    regularMarketDayHigh: meta.regularMarketDayHigh ?? 0,
    regularMarketDayLow: meta.regularMarketDayLow ?? 0,
    regularMarketOpen: meta.regularMarketOpen ?? prevClose,
    regularMarketPreviousClose: prevClose,
    regularMarketTime: meta.regularMarketTime ?? 0,
    shortName: meta.instrumentType ?? symbol,
  };
}
