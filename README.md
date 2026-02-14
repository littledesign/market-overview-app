# Markets — Real-Time Market Data Strip

A responsive market data strip component built with **Angular 19** (frontend) and **Node.js/Express** (backend API), displaying real-time financial data from [Finnhub](https://finnhub.io).

## What It Does

- Displays a horizontal scrolling strip of live stock quotes (price, change, % change)
- Color-coded: green for up, red for down
- Click any ticker to see a detail modal with company info, day range, market cap, etc.
- Auto-refreshes every 30 seconds
- Fully responsive — works on desktop and mobile

## Project Structure

```
markets/
├── backend/              # Node.js API server
│   ├── server.js         # Express server — proxies Finnhub API
│   ├── .env              # Your Finnhub API key (not committed)
│   └── package.json
├── frontend/             # Angular 19 app
│   └── src/app/
│       ├── components/
│       │   ├── market-strip/          # The scrolling ticker bar
│       │   └── market-detail-modal/   # Detail popup on click
│       ├── models/
│       │   └── market.model.ts        # TypeScript interfaces
│       ├── services/
│       │   └── market.service.ts      # API calls + auto-refresh
│       ├── app.component.*            # Root component
│       └── app.config.ts              # Angular providers
└── README.md
```

## Prerequisites

- **Node.js** v18+ (v20 LTS recommended)
- **npm** v9+
- A free **Finnhub API key** — get one at [finnhub.io/register](https://finnhub.io/register)

## Setup

### 1. Get a Finnhub API Key

1. Go to [finnhub.io/register](https://finnhub.io/register) and create a free account
2. Copy your API key from the dashboard

### 2. Configure the Backend

```bash
cd backend

# Add your API key to the .env file
# Replace "your_finnhub_api_key_here" with your actual key
nano .env

# Install dependencies
npm install

# Start the API server
npm start
```

The backend runs on **http://localhost:3000**.

### 3. Start the Frontend

Open a **new terminal** (keep the backend running):

```bash
cd frontend

# Install dependencies (already done if you cloned fresh)
npm install

# Start the Angular dev server
npx ng serve
```

The frontend runs on **http://localhost:4200**.

### 4. Open in Browser

Visit **http://localhost:4200** — you should see the market strip with live data.

## Tech Stack

| Layer    | Technology              | Purpose                        |
|----------|-------------------------|--------------------------------|
| Frontend | Angular 19              | UI framework                   |
| Frontend | Tailwind CSS 4          | Utility-first styling          |
| Frontend | RxJS                    | Reactive data streams          |
| Backend  | Node.js + Express       | API server                     |
| Backend  | Axios                   | HTTP client for Finnhub        |
| Data     | Finnhub API             | Real-time market quotes        |

## Default Tracked Symbols

AAPL, MSFT, GOOGL, AMZN, NVDA, META, TSLA, BRK.B, JPM, V

You can change these in `backend/server.js` (the `DEFAULT_SYMBOLS` array).

## API Endpoints (Backend)

| Endpoint                  | Description                              |
|---------------------------|------------------------------------------|
| `GET /api/market-data`    | Batch quotes for all tracked symbols     |
| `GET /api/quote/:symbol`  | Single stock quote                       |
| `GET /api/profile/:symbol`| Company profile (name, logo, industry)   |
| `GET /api/health`         | Server health check                      |

## Customization

- **Refresh interval**: Change `refreshInterval` in `frontend/src/app/services/market.service.ts`
- **Tracked symbols**: Edit `DEFAULT_SYMBOLS` in `backend/server.js`
- **Custom symbols via URL**: `http://localhost:3000/api/market-data?symbols=AAPL,TSLA,NVDA`
