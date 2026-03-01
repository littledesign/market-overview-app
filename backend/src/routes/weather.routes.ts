import { Router, Request, Response } from 'express';
import axios from 'axios';

const router = Router();

const OWM_BASE = 'https://api.openweathermap.org';
const API_KEY = process.env.OPENWEATHER_API_KEY;

// Wind degrees → compass direction
function windDirection(deg: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(deg / 45) % 8];
}

// Approximate dew point from temperature and humidity (Magnus formula)
function calcDewPoint(tempC: number, humidity: number): number {
  const a = 17.27;
  const b = 237.7;
  const alpha = ((a * tempC) / (b + tempC)) + Math.log(humidity / 100);
  return Math.round((b * alpha) / (a - alpha));
}

// Format Unix timestamp as HH:MM local time string (user's locale, UTC offset provided)
function formatTime(unix: number, tzOffsetSeconds: number): string {
  const d = new Date((unix + tzOffsetSeconds) * 1000);
  const h = d.getUTCHours().toString().padStart(2, '0');
  const m = d.getUTCMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

// Reduce 3-hourly forecast to one entry per day (use midday slot or closest)
function buildDailyForecast(list: any[]): any[] {
  const days = new Map<string, any>();
  for (const entry of list) {
    const date = new Date(entry.dt * 1000);
    const key = date.toISOString().substring(0, 10); // YYYY-MM-DD
    if (!days.has(key)) {
      days.set(key, { date: key, items: [] });
    }
    days.get(key).items.push(entry);
  }

  return Array.from(days.values())
    .slice(0, 5)
    .map(day => {
      // Prefer midday slot (12:00); otherwise use first available
      const noon = day.items.find((e: any) => {
        const h = new Date(e.dt * 1000).getUTCHours();
        return h >= 11 && h <= 13;
      }) || day.items[0];

      const temps = day.items.map((e: any) => e.main.temp);
      const tempHigh = Math.round(Math.max(...temps));
      const tempLow = Math.round(Math.min(...temps));

      const d = new Date(noon.dt * 1000);
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });

      return {
        day: dayName,
        tempHigh,
        tempLow,
        condition: noon.weather[0].description,
        icon: noon.weather[0].icon,
      };
    });
}

/**
 * GET /api/weather?city=Galway
 * Resolves city → lat/lon via geocoding, then fetches current + 5-day forecast.
 * Returns a normalized shape so the frontend is decoupled from OWM specifics.
 */
router.get('/', async (req: Request, res: Response) => {
  if (!API_KEY) {
    return res.status(503).json({ error: 'OPENWEATHER_API_KEY is not configured on the server.' });
  }

  const city = (req.query.city as string || 'Galway').trim();

  try {
    // Step 1: Geocode city name → lat/lon
    const geoRes = await axios.get(`${OWM_BASE}/geo/1.0/direct`, {
      params: { q: city, limit: 1, appid: API_KEY },
      timeout: 8000,
    });

    if (!geoRes.data || geoRes.data.length === 0) {
      return res.status(404).json({ error: `City "${city}" not found.` });
    }

    const { lat, lon, name, country } = geoRes.data[0];

    // Step 2: Fetch current weather and forecast in parallel
    const [currentRes, forecastRes] = await Promise.all([
      axios.get(`${OWM_BASE}/data/2.5/weather`, {
        params: { lat, lon, units: 'metric', appid: API_KEY },
        timeout: 8000,
      }),
      axios.get(`${OWM_BASE}/data/2.5/forecast`, {
        params: { lat, lon, units: 'metric', cnt: 40, appid: API_KEY },
        timeout: 8000,
      }),
    ]);

    const c = currentRes.data;
    const tzOffset: number = c.timezone; // seconds east of UTC

    // Step 3: Normalize into a clean shape
    const result = {
      location: {
        name,
        country,
        lat: Math.round(lat * 10000) / 10000,
        lon: Math.round(lon * 10000) / 10000,
      },
      current: {
        temp: Math.round(c.main.temp),
        feelsLike: Math.round(c.main.feels_like),
        humidity: c.main.humidity,
        dewPoint: calcDewPoint(c.main.temp, c.main.humidity),
        pressure: c.main.pressure,
        visibility: Math.round((c.visibility || 0) / 1000), // metres → km
        windSpeed: Math.round(c.wind?.speed ?? 0),
        windDeg: c.wind?.deg ?? 0,
        windDir: windDirection(c.wind?.deg ?? 0),
        condition: c.weather[0].description,
        icon: c.weather[0].icon,
        sunrise: formatTime(c.sys.sunrise, tzOffset),
        sunset: formatTime(c.sys.sunset, tzOffset),
      },
      forecast: buildDailyForecast(forecastRes.data.list),
    };

    res.json(result);
  } catch (err: any) {
    console.error('Weather API error:', err.message);
    res.status(500).json({ error: 'Failed to fetch weather data.' });
  }
});

export default router;
