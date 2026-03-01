/**
 * UX Desk — API Server
 *
 * Data sources:
 *   - Finnhub   → individual stock quotes (AAPL, MSFT, etc.)
 *   - Yahoo Finance → market index quotes (^DJI, ^GSPC, etc.)
 *   - RSS feeds → news/trends aggregation
 *   - Local JSON → quiz content
 *
 * API keys stay server-side — the frontend never sees them.
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import marketsRouter from './routes/markets.routes.js';
import newsRouter from './routes/news.routes.js';
import quizRouter from './routes/quiz.routes.js';
import weatherRouter from './routes/weather.routes.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: ['http://localhost:4200', 'http://127.0.0.1:4200'],
}));

app.use(express.json());

// ── Route modules (more specific paths first) ──
app.use('/api/news', newsRouter);
app.use('/api/quiz', quizRouter);
app.use('/api/weather', weatherRouter);
app.use('/api', marketsRouter);

// ── Health check ──
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Global error handler (catch unhandled route errors) ──
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err?.message ?? err);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Start ──
app.listen(PORT, () => {
  console.log(`UX Desk API server running at http://localhost:${PORT}`);
  console.log(`Finnhub API key configured: ${process.env.FINNHUB_API_KEY ? 'Yes' : 'NO — set FINNHUB_API_KEY in .env'}`);
  console.log(`OpenWeather API key configured: ${process.env.OPENWEATHER_API_KEY ? 'Yes' : 'NO — set OPENWEATHER_API_KEY in .env'}`);
  console.log(`Yahoo Finance: Ready (indices endpoint)`);
  console.log(`News RSS: Ready`);
  console.log(`Quiz API: Ready`);
});
