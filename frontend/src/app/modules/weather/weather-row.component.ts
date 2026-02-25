import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

// ── Data shapes that match the backend /api/weather response ──

interface WeatherLocation {
  name: string;
  country: string;
  lat: number;
  lon: number;
}

interface WeatherCurrent {
  temp: number;
  feelsLike: number;
  humidity: number;
  dewPoint: number;
  pressure: number;
  visibility: number;
  windSpeed: number;
  windDeg: number;
  windDir: string;
  condition: string;
  icon: string;
  sunrise: string;
  sunset: string;
}

interface WeatherForecastDay {
  day: string;
  tempHigh: number;
  tempLow: number;
  condition: string;
  icon: string;
}

interface WeatherData {
  location: WeatherLocation;
  current: WeatherCurrent;
  forecast: WeatherForecastDay[];
}

// ── Saved locations the user can quickly switch to ──

interface SavedLocation {
  label: string;
  city: string;
}

@Component({
  selector: 'app-weather-row',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="weather-wrap">

      <!-- Loading skeleton -->
      @if (loading) {
        <div class="weather-loading">
          <span class="spinner"></span>
          <span>Loading weather…</span>
        </div>
      }

      <!-- Error banner -->
      @if (error && !loading) {
        <div class="weather-error">{{ error }}</div>
      }

      <!-- Main content (show while loading too if we have cached data) -->
      @if (data) {
        <div class="weather-body" [class.weather-stale]="loading">

          <!-- ── Row 1: Main card + Stats cards ── -->
          <div class="weather-top">

            <!-- Main card -->
            <div class="wc-main">
              <div class="wc-location">
                <span class="wc-city">{{ locationDisplay(data.location) }}</span>
                <span class="wc-coords">{{ data.location.lat | number:'1.2-2' }}, {{ data.location.lon | number:'1.2-2' }}</span>
              </div>
              <div class="wc-temp-row">
                <img
                  class="wc-icon"
                  [src]="iconUrl(data.current.icon)"
                  [alt]="data.current.condition"
                />
                <span class="wc-temp">{{ data.current.temp }}°C</span>
              </div>
              <span class="wc-condition">{{ data.current.condition | titlecase }}</span>
              <div class="wc-sun-row">
                <span class="wc-sun-item">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
                  {{ data.current.sunrise }}
                </span>
                <span class="wc-sun-item">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 18a5 5 0 0 0-10 0"/><line x1="12" y1="9" x2="12" y2="2"/><line x1="4.22" y1="10.22" x2="5.64" y2="11.64"/><line x1="1" y1="18" x2="3" y2="18"/><line x1="21" y1="18" x2="23" y2="18"/><line x1="18.36" y1="11.64" x2="19.78" y2="10.22"/></svg>
                  {{ data.current.sunset }}
                </span>
              </div>
            </div>

            <!-- Stats cards (2×2 grid) -->
            <div class="wc-stats">
              <div class="stat-card">
                <svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z"/><path d="M8 14s0 4 4 4 4-4 4-4"/><line x1="12" y1="19" x2="12" y2="22"/></svg>
                <span class="stat-label">Humidity</span>
                <span class="stat-value">{{ data.current.humidity }}%</span>
                <span class="stat-sub">Dew {{ data.current.dewPoint }}°C</span>
              </div>
              <div class="stat-card">
                <svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"/></svg>
                <span class="stat-label">Wind</span>
                <span class="stat-value">{{ data.current.windSpeed }} m/s</span>
                <span class="stat-sub">{{ data.current.windDir }}</span>
              </div>
              <div class="stat-card">
                <svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                <span class="stat-label">Pressure</span>
                <span class="stat-value">{{ data.current.pressure }}</span>
                <span class="stat-sub">hPa</span>
              </div>
              <div class="stat-card">
                <svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="2"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>
                <span class="stat-label">Visibility</span>
                <span class="stat-value">{{ data.current.visibility }}</span>
                <span class="stat-sub">km</span>
              </div>
            </div>
          </div>

          <!-- ── Row 2: 5-day forecast ── -->
          <div class="wc-forecast-wrap">
            <p class="wc-forecast-heading">5-day forecast</p>
            <div class="wc-forecast">
            @for (day of data.forecast; track day.day) {
              <div class="forecast-card">
                <span class="fc-day">{{ day.day }}</span>
                <img class="fc-icon" [src]="iconUrl(day.icon)" [alt]="day.condition" />
                <span class="fc-temps">
                  <span class="fc-high">{{ day.tempHigh }}°</span>
                  <span class="fc-low">{{ day.tempLow }}°</span>
                </span>
                <span class="fc-desc">{{ day.condition }}</span>
              </div>
            }
            </div>
          </div>

          <!-- ── Row 3: Saved locations ── -->
          <div class="wc-saved">
            <span class="saved-label">Saved</span>
            @for (loc of savedLocations; track loc.city) {
              <button
                class="saved-btn"
                [class.saved-btn-active]="activeCity === loc.city"
                (click)="loadCity(loc.city)"
              >{{ loc.label }}</button>
            }
          </div>

        </div>
      }

      <!-- Empty state (no data, no error, not loading) -->
      @if (!data && !loading && !error) {
        <p class="weather-hint">Weather will load automatically.</p>
      }

    </div>
  `,
  styles: [`
    /* ── Wrapper ── */
    .weather-wrap {
      font-size: 0.875rem;
    }

    .weather-loading {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: var(--text-tertiary);
      padding: 1rem 0;
    }

    .spinner {
      display: inline-block;
      width: 16px;
      height: 16px;
      border: 2px solid var(--border-primary);
      border-top-color: var(--accent-blue);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    .weather-error {
      padding: 0.75rem 1rem;
      background: rgba(239, 68, 68, 0.08);
      border: 1px solid rgba(239, 68, 68, 0.25);
      border-radius: 8px;
      color: var(--negative-red);
      margin-bottom: 0.75rem;
    }

    /* Dim while refreshing (so user knows a reload is in progress) */
    .weather-stale { opacity: 0.6; }

    /* ── Main body layout ── */
    .weather-body { display: flex; flex-direction: column; gap: 0.875rem; }

    .weather-top {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
    }

    /* ── Main card ── */
    .wc-main {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      padding: 1rem;
      background: var(--bg-primary);
      border: 1px solid var(--border-primary);
      border-radius: 12px;
    }

    .wc-location { display: flex; flex-direction: column; }
    .wc-city { font-size: 1rem; font-weight: 700; color: var(--text-primary); }
    .wc-coords { font-size: 0.7rem; color: var(--text-tertiary); }

    .wc-temp-row {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      margin-top: 0.25rem;
    }

    .wc-icon { width: 48px; height: 48px; }
    .wc-temp { font-size: 2.25rem; font-weight: 700; color: var(--text-primary); line-height: 1; }
    .wc-condition { font-size: 0.8rem; color: var(--text-secondary); text-transform: capitalize; }

    .wc-sun-row {
      display: flex;
      gap: 0.75rem;
      margin-top: 0.375rem;
    }

    .wc-sun-item {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.75rem;
      color: var(--text-secondary);
    }

    /* ── Stats cards 2×2 ── */
    .wc-stats {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.5rem;
    }

    .stat-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 0.75rem 0.5rem;
      background: var(--bg-primary);
      border: 1px solid var(--border-primary);
      border-radius: 10px;
      gap: 0.1rem;
    }

    .stat-icon {
      width: 18px;
      height: 18px;
      color: var(--accent-blue);
      margin-bottom: 0.125rem;
    }

    .stat-label { font-size: 0.7rem; color: var(--text-tertiary); font-weight: 600; text-transform: uppercase; letter-spacing: 0.03em; }
    .stat-value { font-size: 1.1rem; font-weight: 700; color: var(--text-primary); }
    .stat-sub { font-size: 0.7rem; color: var(--text-secondary); }

    /* ── Forecast strip ── */
    .wc-forecast-wrap { display: flex; flex-direction: column; gap: 0.5rem; }
    .wc-forecast-heading {
      font-size: 0.72rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--text-tertiary);
      margin: 0;
    }
    .wc-forecast {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 0.5rem;
    }

    .forecast-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 0.625rem 0.25rem;
      background: var(--bg-primary);
      border: 1px solid var(--border-primary);
      border-radius: 10px;
      gap: 0.1rem;
    }

    .fc-day { font-size: 0.75rem; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; }
    .fc-icon { width: 32px; height: 32px; }
    .fc-temps { display: flex; gap: 0.25rem; align-items: baseline; }
    .fc-high { font-size: 0.85rem; font-weight: 700; color: var(--text-primary); }
    .fc-low { font-size: 0.75rem; color: var(--text-tertiary); }
    .fc-desc { font-size: 0.65rem; color: var(--text-tertiary); text-align: center; line-height: 1.3; }

    /* ── Saved locations ── */
    .wc-saved {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      flex-wrap: wrap;
    }

    .saved-label {
      font-size: 0.7rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      color: var(--text-tertiary);
      margin-right: 0.25rem;
    }

    .saved-btn {
      padding: 0.25rem 0.75rem;
      font-size: 0.775rem;
      font-weight: 500;
      border: 1px solid var(--border-primary);
      border-radius: 20px;
      background: transparent;
      color: var(--text-secondary);
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .saved-btn:hover {
      border-color: var(--accent-blue);
      color: var(--accent-blue);
    }

    .saved-btn-active {
      background: var(--accent-blue);
      border-color: var(--accent-blue);
      color: #fff;
    }

    .weather-hint { font-size: 0.85rem; color: var(--text-tertiary); }

    @media (max-width: 900px) {
      .weather-top { grid-template-columns: 1fr; }
      .wc-forecast { grid-template-columns: repeat(5, 1fr); }
    }

    @media (max-width: 640px) {
      .wc-forecast { grid-template-columns: repeat(3, 1fr); }
    }
  `],
})
export class WeatherRowComponent implements OnInit {
  data: WeatherData | null = null;
  loading = false;
  error = '';
  activeCity = 'Galway,IE';

  readonly savedLocations: SavedLocation[] = [
    { label: 'Galway', city: 'Galway,IE' },
    { label: 'Boston', city: 'Boston,US' },
    { label: 'Westlake, Texas', city: 'Westlake,US' },
    { label: 'London, England', city: 'London,GB' },
  ];

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    // Try to restore cached weather from localStorage to avoid a blank screen on load
    const cached = localStorage.getItem('weather_cache');
    if (cached) {
      try { this.data = JSON.parse(cached); } catch { /* ignore */ }
    }
    this.loadCity(this.activeCity);
  }

  loadCity(city: string): void {
    this.activeCity = city;
    this.loading = true;
    this.error = '';

    this.http
      .get<WeatherData>(`${environment.apiBaseUrl}/weather`, { params: { city } })
      .subscribe({
        next: (result) => {
          this.data = result;
          this.loading = false;
          // Save to localStorage so next load shows data instantly
          localStorage.setItem('weather_cache', JSON.stringify(result));
        },
        error: (err) => {
          this.loading = false;
          const msg = err.error?.error || 'Could not load weather. Try again later.';
          this.error = msg;
        },
      });
  }

  /** Builds the OpenWeatherMap icon image URL from a code like "10d" */
  iconUrl(code: string): string {
    return `https://openweathermap.org/img/wn/${code}@2x.png`;
  }

  /** Format location for display — e.g. "Galway, Ireland" instead of "Galway City, IE" */
  locationDisplay(loc: WeatherLocation): string {
    const countryNames: Record<string, string> = {
      IE: 'Ireland', US: 'United States', GB: 'United Kingdom',
    };
    const country = countryNames[loc.country] || loc.country;
    const city = loc.name.replace(/\s+City$/, ''); // "Galway City" → "Galway"
    return `${city}, ${country}`;
  }
}
