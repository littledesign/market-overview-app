# Hub — Intranet Dashboard

A single-page intranet dashboard built with **Angular 19** (frontend) and **Node.js/Express + TypeScript** (backend). Features real-time market data, curated news feeds, quizzes, and several productivity tools — all in one scrollable hub page.

## Sections

| Section          | Status        | Description                                                    |
| ---------------- | ------------- | -------------------------------------------------------------- |
| Markets          | Full          | Live stock quotes and world market indices (Finnhub + Yahoo)   |
| News & Trends    | Full          | Aggregated RSS articles with AI tagging, filtering, and saving |
| Quiz & Learning  | Full          | Multiple-choice quizzes with scoring and attempt history       |
| Knowledge Hub    | Stub (V1)    | Quick-link cards to templates, playbooks, prompts, and demos   |
| Crit Calendar    | Stub (V1)    | Mock upcoming critique sessions with "Book a Crit" modal       |
| Skills Directory | Stub (V1)    | Searchable team member list with skill tags                    |
| World Clocks     | Stub (V1)    | Live clocks for Dublin, Boston, NYC, San Francisco, Bangalore  |
| Weather          | Stub (V1)    | City search input with placeholder results                     |
| Pomodoro Timer   | Stub (V1)    | 25/5 focus timer with start, pause, reset (localStorage state) |

## Tech Stack

| Layer    | Technology               | Purpose                            |
| -------- | ------------------------ | ---------------------------------- |
| Frontend | Angular 19               | UI framework (standalone components) |
| Frontend | Tailwind CSS 4           | Utility-first styling              |
| Frontend | RxJS                     | Reactive data streams              |
| Frontend | Supabase JS Client       | Auth + database from the browser   |
| Backend  | Node.js + Express        | API server                         |
| Backend  | TypeScript + tsx          | Type-safe backend (no build step)  |
| Backend  | Axios                    | HTTP client for external APIs      |
| Backend  | rss-parser               | RSS feed ingestion                 |
| Data     | Finnhub API              | Stock quotes and company profiles  |
| Data     | Yahoo Finance            | World market indices               |
| Auth/DB  | Supabase                 | Auth, user prefs, saved news, quiz attempts |

## Project Structure

```
markets/
├── backend/
│   ├── src/
│   │   ├── server.ts              # Express server entry point
│   │   ├── routes/
│   │   │   ├── markets.routes.ts  # Stock & index endpoints
│   │   │   ├── news.routes.ts     # RSS news endpoints
│   │   │   └── quiz.routes.ts     # Quiz endpoints
│   │   ├── services/
│   │   │   ├── finnhub.service.ts # Finnhub API helper
│   │   │   ├── yahoo.service.ts   # Yahoo Finance singleton
│   │   │   └── rss.service.ts     # RSS fetching + caching
│   │   ├── config/
│   │   │   └── newsFeeds.ts       # RSS feed URLs + AI keywords
│   │   └── data/
│   │       └── quizzes.json       # Seed quiz content
│   ├── supabase/
│   │   └── migrations/
│   │       └── 001_initial_schema.sql
│   ├── .env                       # API keys (not committed)
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── components/
│       │   │   ├── hub-page/          # Main hub page layout
│       │   │   ├── navbar/            # Sticky navigation + auth
│       │   │   ├── section-header/    # Reusable section title
│       │   │   ├── market-strip/      # Existing markets UI
│       │   │   ├── market-detail-modal/
│       │   │   ├── investment-search-modal/
│       │   │   └── theme-toggle/
│       │   ├── modules/
│       │   │   ├── news/              # News & Trends
│       │   │   ├── quiz/              # Quiz & Learning
│       │   │   ├── knowledge/         # Knowledge Hub
│       │   │   ├── crits/             # Crit Calendar
│       │   │   ├── skills/            # Skills Directory
│       │   │   ├── clocks/            # World Clocks
│       │   │   ├── weather/           # Weather
│       │   │   └── pomodoro/          # Pomodoro Timer
│       │   ├── services/
│       │   │   ├── market.service.ts
│       │   │   ├── theme.service.ts
│       │   │   ├── supabase.service.ts
│       │   │   └── preferences.service.ts
│       │   └── models/
│       │       └── market.model.ts
│       └── environments/
│           ├── environment.ts
│           └── environment.prod.ts
└── README.md
```

## Prerequisites

- **Node.js** v18+ (v20 LTS recommended)
- **npm** v9+
- A free **Finnhub API key** — [finnhub.io/register](https://finnhub.io/register)
- A free **Supabase project** — [supabase.com](https://supabase.com) (for auth and user data)

## Setup

### 1. Finnhub API Key

1. Go to [finnhub.io/register](https://finnhub.io/register) and create a free account
2. Copy your API key from the dashboard

### 2. Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Copy **Project URL** and **anon (public) key** from: Settings → API
3. Run the SQL migration to create tables:
   - Open the SQL Editor in your Supabase dashboard
   - Paste the contents of `backend/supabase/migrations/001_initial_schema.sql`
   - Click **Run**

### 3. Configure Environment Variables

**Backend** — copy the example and add your Finnhub key:

```bash
cp backend/.env.example backend/.env
```

Then edit `backend/.env`:

```env
FINNHUB_API_KEY=your_finnhub_key
PORT=3000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Frontend** — edit `frontend/src/environments/environment.ts`:

```typescript
export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:3000/api',
  supabaseUrl: 'https://your-project.supabase.co',
  supabaseAnonKey: 'your-anon-key',
};
```

### 4. Install & Run

**Option A — Run both servers at once** (recommended):

```bash
npm run install:all  # installs root, backend, and frontend deps (first time only)
npm run dev          # starts backend on :3000 and frontend on :4200
```

**Option B — Run in separate terminals:**

**Terminal 1 (backend):**

```bash
cd backend
npm install
npm run dev
```

The backend runs on **http://localhost:3000**.

**Terminal 2 (frontend):**

```bash
cd frontend
npm install
ng serve
```

The frontend runs on **http://localhost:4200**.

> **Important:** Both backend and frontend must be running. The 500 errors you see in DevTools happen when the backend is not running — the Angular proxy can't forward `/api` requests to it.

### 5. Open in Browser

Visit **http://localhost:4200** — the Hub page loads with all sections stacked vertically. Use the navbar to jump between them.

## API Endpoints

| Endpoint                | Source  | Description                        |
| ----------------------- | ------- | ---------------------------------- |
| `GET /api/health`       | —       | Server health check                |
| `GET /api/market-data`  | Finnhub | Batch stock quotes                 |
| `GET /api/quote/:symbol`| Finnhub/Yahoo | Single stock or index quote  |
| `GET /api/profile/:symbol`| Finnhub | Company profile                 |
| `GET /api/indices`      | Yahoo   | 9 world market indices             |
| `GET /api/search?q=`    | Finnhub | Symbol search                      |
| `GET /api/news/items`   | RSS     | Aggregated articles (filters: `?aiOnly=true`, `?source=name`) |
| `GET /api/news/sources` | Config  | List of configured RSS sources     |
| `GET /api/quiz`         | JSON    | All quiz summaries                 |
| `GET /api/quiz/:id`     | JSON    | Full quiz with answers             |

## Authentication

Sign up / sign in via the **Sign In** button in the navbar. Auth is powered by Supabase email + password. When logged in:

- **News**: Save/bookmark articles (stored in Supabase `saved_news` table)
- **Quiz**: Attempts and scores are saved (stored in `quiz_attempts` table)
- **Preferences**: User settings stored in `user_preferences` jsonb column

All data is isolated per user via Row Level Security (RLS).

## Customization

- **RSS feeds**: Edit `backend/src/config/newsFeeds.ts`
- **Quiz content**: Edit `backend/src/data/quizzes.json`
- **Tracked stock symbols**: Edit `DEFAULT_SYMBOLS` in `backend/src/routes/markets.routes.ts`
- **Clock timezones**: Edit the `zones` array in `frontend/src/app/modules/clocks/clocks-row.component.ts`
- **Refresh interval**: Change `refreshInterval` in `frontend/src/app/services/market.service.ts`
