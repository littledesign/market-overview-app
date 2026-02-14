/**
 * Market Data API Server
 *
 * Two data sources:
 *   - Finnhub   → individual stock quotes (AAPL, MSFT, etc.)
 *   - Yahoo Finance → market index quotes (^DJI, ^GSPC, etc.)
 *
 * Finnhub doesn't support index symbols on the free tier,
 * so we use yahoo-finance2 specifically for the 9 world indices.
 * API keys stay on the server side — the frontend never sees them.
 */

const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

// yahoo-finance2 v3 is ESM-only and needs to be instantiated.
// We cache a single instance so we only pay the import + construction cost once.
let _yahooFinance = null;

async function getYahooFinance() {
  if (!_yahooFinance) {
    const mod = await import('yahoo-finance2');
    // v3 requires: new YahooFinance() before calling .quote(), etc.
    const YahooFinance = mod.default;
    _yahooFinance = new YahooFinance();
  }
  return _yahooFinance;
}

const app = express();
const PORT = process.env.PORT || 3000;
const FINNHUB_KEY = process.env.FINNHUB_API_KEY;
const FINNHUB_BASE = 'https://finnhub.io/api/v1';

// Allow the Angular dev server (port 4200) to call our API
app.use(cors({
  origin: ['http://localhost:4200', 'http://127.0.0.1:4200'],
}));

app.use(express.json());

// ---------------------------------------------------------------------------
// Helper: make a request to Finnhub with our API key automatically attached
// ---------------------------------------------------------------------------
async function finnhubGet(endpoint, params = {}) {
  const response = await axios.get(`${FINNHUB_BASE}${endpoint}`, {
    params: { ...params, token: FINNHUB_KEY },
  });
  return response.data;
}

// ---------------------------------------------------------------------------
// GET /api/quote/:symbol — single stock quote (Finnhub)
// Returns: current price, change, percent change, high, low, open, previous close
// ---------------------------------------------------------------------------
app.get('/api/quote/:symbol', async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();

    // If this is an index symbol (starts with ^), use Yahoo Finance instead
    if (symbol.startsWith('^')) {
      const yahooFinance = await getYahooFinance();
      const quote = await yahooFinance.quote(symbol);
      return res.json({
        symbol,
        name: quote.shortName || quote.longName || symbol,
        currentPrice: quote.regularMarketPrice ?? 0,
        change: quote.regularMarketChange ?? 0,
        percentChange: quote.regularMarketChangePercent ?? 0,
        high: quote.regularMarketDayHigh ?? 0,
        low: quote.regularMarketDayLow ?? 0,
        open: quote.regularMarketOpen ?? 0,
        previousClose: quote.regularMarketPreviousClose ?? 0,
        timestamp: quote.regularMarketTime
          ? Math.floor(new Date(quote.regularMarketTime).getTime() / 1000)
          : 0,
      });
    }

    // Otherwise use Finnhub for regular stocks
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
  } catch (error) {
    console.error(`Error fetching quote for ${req.params.symbol}:`, error.message);
    res.status(500).json({ error: 'Failed to fetch quote data' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/profile/:symbol — company profile info (Finnhub)
// Returns: name, logo, industry, market cap, etc.
// ---------------------------------------------------------------------------
app.get('/api/profile/:symbol', async (req, res) => {
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
  } catch (error) {
    console.error(`Error fetching profile for ${req.params.symbol}:`, error.message);
    res.status(500).json({ error: 'Failed to fetch profile data' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/indices — world market indices via Yahoo Finance
//
// Returns all 9 indices with last-known prices (works even when markets are closed).
// Yahoo Finance supports the ^ prefix symbols that Finnhub's free tier doesn't.
// ---------------------------------------------------------------------------
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

app.get('/api/indices', async (_req, res) => {
  try {
    const yahooFinance = await getYahooFinance();

    // Fetch all 9 indices in parallel for speed
    const indexPromises = INDEX_LIST.map(async ({ symbol, name }) => {
      try {
        const quote = await yahooFinance.quote(symbol);
        return {
          symbol,
          name,
          currentPrice: quote.regularMarketPrice ?? 0,
          change: quote.regularMarketChange ?? 0,
          percentChange: quote.regularMarketChangePercent ?? 0,
          high: quote.regularMarketDayHigh ?? 0,
          low: quote.regularMarketDayLow ?? 0,
          open: quote.regularMarketOpen ?? 0,
          previousClose: quote.regularMarketPreviousClose ?? 0,
          timestamp: quote.regularMarketTime
            ? Math.floor(new Date(quote.regularMarketTime).getTime() / 1000)
            : 0,
        };
      } catch (err) {
        // If one index fails, return a placeholder so the rest still show
        console.error(`Failed to fetch index ${symbol}:`, err.message);
        return {
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
        };
      }
    });

    const results = await Promise.all(indexPromises);
    res.json(results);
  } catch (error) {
    console.error('Error fetching indices:', error.message);
    res.status(500).json({ error: 'Failed to fetch index data' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/search — search for stock/index symbols via Finnhub
// Used by the "Add Investment" modal in the frontend
// ---------------------------------------------------------------------------
app.get('/api/search', async (req, res) => {
  try {
    const query = req.query.q;

    if (!query || query.length < 1) {
      return res.json({ result: [], count: 0 });
    }

    const data = await finnhubGet('/search', { q: query });
    const results = (data.result || []).map((item) => ({
      symbol: item.symbol,
      name: item.description,
      type: item.type || 'Stock',
      exchange: item.displaySymbol,
    }));

    res.json({ result: results, count: results.length });
  } catch (error) {
    console.error('Symbol search error:', error.message);
    res.status(500).json({ error: 'Failed to search symbols' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/market-data — batch stock quotes via Finnhub
// This is the endpoint the watchlist grid uses for individual stocks
// ---------------------------------------------------------------------------
const DEFAULT_SYMBOLS = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA',
];

app.get('/api/market-data', async (req, res) => {
  try {
    // Allow custom symbols via query param, e.g. ?symbols=AAPL,MSFT,TSLA
    const symbolList = req.query.symbols
      ? req.query.symbols.split(',').map(s => s.trim().toUpperCase())
      : DEFAULT_SYMBOLS;

    // Fetch all quotes in parallel for speed
    const quotePromises = symbolList.map(async (symbol) => {
      try {
        const data = await finnhubGet('/quote', { symbol });
        return {
          symbol,
          currentPrice: data.c,
          change: data.d,
          percentChange: data.dp,
          high: data.h,
          low: data.l,
          open: data.o,
          previousClose: data.pc,
          timestamp: data.t,
        };
      } catch {
        // If one symbol fails, don't break the whole batch
        return { symbol, error: true, currentPrice: 0, change: 0, percentChange: 0 };
      }
    });

    const results = await Promise.all(quotePromises);
    res.json(results);
  } catch (error) {
    console.error('Error fetching market data:', error.message);
    res.status(500).json({ error: 'Failed to fetch market data' });
  }
});

// ---------------------------------------------------------------------------
// Health check endpoint — useful for verifying the server is running
// ---------------------------------------------------------------------------
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ---------------------------------------------------------------------------
// Start the server
// ---------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`Market API server running at http://localhost:${PORT}`);
  console.log(`Finnhub API key configured: ${FINNHUB_KEY ? 'Yes' : 'NO — set FINNHUB_API_KEY in .env'}`);
  console.log(`Yahoo Finance: Ready (indices endpoint)`);
});
