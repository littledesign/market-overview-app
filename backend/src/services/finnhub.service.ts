import axios from 'axios';

const FINNHUB_BASE = 'https://finnhub.io/api/v1';
const FINNHUB_KEY = process.env.FINNHUB_API_KEY;

/**
 * Sends a GET request to the Finnhub API with the API key
 * automatically attached as a query parameter.
 * Throws on failure (caller should catch and return fallback).
 */
export async function finnhubGet(endpoint: string, params: Record<string, string> = {}): Promise<any> {
  if (!FINNHUB_KEY) {
    throw new Error('FINNHUB_API_KEY is not set in .env');
  }
  const response = await axios.get(`${FINNHUB_BASE}${endpoint}`, {
    params: { ...params, token: FINNHUB_KEY },
    timeout: 10000,
    validateStatus: (status) => status < 500,
  });
  if (response.status >= 400) {
    throw new Error(`Finnhub API error: ${response.status} ${JSON.stringify(response.data)}`);
  }
  return response.data;
}
