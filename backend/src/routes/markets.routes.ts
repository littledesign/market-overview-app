import { Router, Request, Response } from 'express';
import { finnhubGet } from '../services/finnhub.service.js';
import { fetchYahooQuote } from '../services/yahoo.service.js';

const router = Router();

// ── GET /api/quote/:symbol — single stock or index quote ──

router.get('/quote/:symbol', async (req: Request, res: Response) => {
  try {
    const symbol = req.params.symbol.toUpperCase();

    if (symbol.startsWith('^')) {
      const quote = await fetchYahooQuote(symbol);
      return res.json({
        symbol,
        name: quote.shortName || symbol,
        currentPrice: quote.regularMarketPrice,
        change: quote.regularMarketChange,
        percentChange: quote.regularMarketChangePercent,
        high: quote.regularMarketDayHigh,
        low: quote.regularMarketDayLow,
        open: quote.regularMarketOpen,
        previousClose: quote.regularMarketPreviousClose,
        timestamp: quote.regularMarketTime,
      });
    }

    const data = await finnhubGet('/quote', { symbol });
    res.json({
      symbol,
      currentPrice: data.c,
      change: data.d,
      percentChange: data.dp,
      high: data.h,
      low: data.l,
      open: data.o,
      previousClose: data.pc,
      timestamp: data.t,
    });
  } catch (error: any) {
    console.error(`Error fetching quote for ${req.params.symbol}:`, error.message);
    res.status(500).json({ error: 'Failed to fetch quote data' });
  }
});

// ── GET /api/profile/:symbol — company profile info (Finnhub) ──

router.get('/profile/:symbol', async (req: Request, res: Response) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const data = await finnhubGet('/stock/profile2', { symbol });

    res.json({
      symbol,
      name: data.name,
      logo: data.logo,
      industry: data.finnhubIndustry,
      marketCap: data.marketCapitalization,
      exchange: data.exchange,
      currency: data.currency,
      weburl: data.weburl,
    });
  } catch (error: any) {
    console.error(`Error fetching profile for ${req.params.symbol}:`, error.message);
    res.status(500).json({ error: 'Failed to fetch profile data' });
  }
});

// ── GET /api/indices — world market indices via Yahoo Finance ──

const INDEX_LIST = [
  { symbol: '^DJI',   name: 'Dow Jones' },
  { symbol: '^GSPC',  name: 'S&P 500' },
  { symbol: '^IXIC',  name: 'NASDAQ Composite' },
  { symbol: '^ISEQ',  name: 'ISEQ (Ireland)' },
  { symbol: '^FTSE',  name: 'FTSE 100 (UK)' },
  { symbol: '^GDAXI', name: 'DAX (Germany)' },
  { symbol: '^FCHI',  name: 'CAC 40 (France)' },
  { symbol: '^N225',  name: 'Nikkei 225 (Japan)' },
  { symbol: '^HSI',   name: 'Hang Seng (HK)' },
];

// Small pause between Yahoo requests to avoid rate-limiting (429 Too Many Requests)
function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

router.get('/indices', async (_req: Request, res: Response) => {
  try {
    const results = [];

    // Fetch indices one at a time with a short pause between each.
    // Using direct Yahoo Finance v8 API — no library, no cookies, no rate limit issues.
    for (const { symbol, name } of INDEX_LIST) {
      try {
        const quote = await fetchYahooQuote(symbol);
        results.push({
          symbol,
          name,
          currentPrice: quote.regularMarketPrice,
          change: quote.regularMarketChange,
          percentChange: quote.regularMarketChangePercent,
          high: quote.regularMarketDayHigh,
          low: quote.regularMarketDayLow,
          open: quote.regularMarketOpen,
          previousClose: quote.regularMarketPreviousClose,
          timestamp: quote.regularMarketTime,
        });
      } catch (err: any) {
        console.error(`Failed to fetch index ${symbol}:`, err.message);
        results.push({
          symbol,
          name,
          currentPrice: 0,
          change: 0,
          percentChange: 0,
          high: 0,
          low: 0,
          open: 0,
          previousClose: 0,
          timestamp: 0,
          error: true,
        });
      }
      // 300ms pause keeps us well under Yahoo's rate limit
      await wait(300);
    }

    res.json(results);
  } catch (error: any) {
    console.error('Error fetching indices:', error.message);
    res.json(INDEX_LIST.map(({ symbol, name }) => ({
      symbol,
      name,
      currentPrice: 0,
      change: 0,
      percentChange: 0,
      high: 0,
      low: 0,
      open: 0,
      previousClose: 0,
      timestamp: 0,
      error: true,
    })));
  }
});

// ── GET /api/search — search for stock/index symbols via Finnhub ──

router.get('/search', async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;

    if (!query || query.length < 1) {
      return res.json({ result: [], count: 0 });
    }

    const data = await finnhubGet('/search', { q: query });
    const results = (data.result || []).map((item: any) => ({
      symbol: item.symbol,
      name: item.description,
      type: item.type || 'Stock',
      exchange: item.displaySymbol,
    }));

    res.json({ result: results, count: results.length });
  } catch (error: any) {
    console.error('Symbol search error:', error.message);
    res.status(500).json({ error: 'Failed to search symbols' });
  }
});

// ── GET /api/market-data — batch stock quotes via Finnhub ──

const DEFAULT_SYMBOLS = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA',
];

router.get('/market-data', async (req: Request, res: Response) => {
  try {
    const symbolsParam = req.query.symbols as string | undefined;
    const symbolList = symbolsParam
      ? symbolsParam.split(',').map(s => s.trim().toUpperCase()).filter(Boolean)
      : DEFAULT_SYMBOLS;

    const quotePromises = symbolList.map(async (symbol) => {
      try {
        const data = await finnhubGet('/quote', { symbol });
        return {
          symbol,
          currentPrice: data?.c ?? 0,
          change: data?.d ?? 0,
          percentChange: data?.dp ?? 0,
          high: data?.h ?? 0,
          low: data?.l ?? 0,
          open: data?.o ?? 0,
          previousClose: data?.pc ?? 0,
          timestamp: data?.t ?? 0,
        };
      } catch (err: any) {
        console.error(`Failed to fetch quote for ${symbol}:`, err.message);
        return { symbol, error: true, currentPrice: 0, change: 0, percentChange: 0 };
      }
    });

    const results = await Promise.all(quotePromises);
    res.json(results);
  } catch (error: any) {
    console.error('Error fetching market data:', error.message);
    // Return empty array so UI doesn't break
    res.json([]);
  }
});

export default router;
