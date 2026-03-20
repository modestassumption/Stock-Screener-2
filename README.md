# NSE Stock Screener — Full-Stack v2

An equity analysis platform built with **FastAPI** (Python), **React** (Vite), and **yfinance**. Built on my previous personal project.

This document is divided into two sections:
1. **User Guide**: How to use the application interface.
2. **Developer Guide**: How to install, run, and extend the project.

---

## User Guide (How to Use the App)

Once the application is running, you can access the frontend at `http://localhost:5173`. The app is divided into 4 main sections accessible via the left sidebar.

### 1. Overview (Dashboard)
- **What it is**: Your daily market snapshot.
- **How to use it**: Check the top cards for the real-time status of major indices like **Nifty 50** or **Sensex**. Below, you'll find the **Top Gainers** and **Top Losers** of the day from a default watchlist. If a Finnhub API key is configured, live market news will stream on the right.

### 2. Screener
- **What it is**: A powerful filtering engine to find stocks meeting both technical and fundamental criteria.
- **How to use it**:
  - Select an **Index** (e.g., *Nifty 50*, *Nifty Midcap 100*) to define the universe of stocks to search.
  - Adjust the **Price**, **Volume**, and **RSI** sliders.
  - Toggle **Above SMA 200** or **Above SMA 50** to enforce trend templates.
  - Set a minimum **RS Rating** (Relative Strength). A rating of `80` means the stock outperformed 80% of its peers over the last year.
  - Click **Run Screener**. Click any row in the resulting table to instantly view its chart.
  - *Tip*: Use the **Presets** (Minervini, Momentum, Value) at the top to auto-fill proven filtering strategies!

### 3. Chart & Analysis
- **What it is**: Interactive candlestick charts with indicators.
- **How to use it**: 
  - Type a ticker in Yahoo Finance format (e.g., `TCS.NS`, `RELIANCE.NS`) and click **Load**. You can also click the quick-pick buttons.
  - Choose your **Time Period** (3M to 5Y) and toggle **Overlays** (SMA, Bollinger Bands).
  - The main chart shows price action and volume. Below, you'll find **RSI (14)** and **MACD** histograms.
  - The top stats bar provides an instant glance at the company's P/E ratio, Sector, 52-Week High distance, and Recent Returns.

### 4. Strategy Backtester
- **What it is**: Test predefined trading algorithms against historical data.
- **How to use it**:
  - Enter a ticker, select a **Strategy** (e.g., *MACD Crossover*, *Golden Cross*), set your initial capital and stop-loss rules.
  - Click **Run Backtest**.
  - The app will execute historical trades, deduct transaction costs (0.1% per trade), and plot your **Equity Curve** compared directly against the Nifty 50 benchmark.
  - Review the **Performance Summary** (CAGR, Win Rate, Max Drawdown) and analyze individual buy/sell decisions in the **Trade Log** at the bottom.

---

## 🛠️ Developer Guide (How to Run & Extend)

### Architecture
```
┌──────────────────────────────────────────────────────┐
│  React (Vite)  :5173   →   proxy /api                │
│  FastAPI       :8000   →   yfinance + SQLite cache   │
└──────────────────────────────────────────────────────┘
```

### Installation & Execution

#### 1. Backend (FastAPI)
Open a terminal and run the following commands:
```bash
cd backend

# 1. Create and activate a virtual environment
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure environments
cp .env.example .env
# (Optional: Edit .env to add your FINNHUB_API_KEY)

# 4. Run the development server
uvicorn main:app --reload --port 8000
```
- API Docs accessible at: `http://localhost:8000/api/docs`

#### 2. Frontend (React + Vite)
Open a *second* terminal and run:
```bash
cd frontend

# 1. Install dependencies
npm install

# 2. Run the development server
npm run dev
```
- The App is accessible at: `http://localhost:5173`

### Adding a Custom Strategy to the Backtester
The backtesting engine is designed to be highly modular. You can add your own algorithms in purely pandas/numpy syntax.

1. Open `backend/backtesting/strategies.py`.
2. Write a pandas function that accepts a DataFrame and returns boolean series for `entries` and `exits`.
3. Add it to the `STRATEGIES` dictionary at the bottom.

**Example:**
```python
def simple_moving_average_cross(df):
    """Buy when close > SMA_50, sell when close drops below."""
    entries = df['Close'] > df['SMA_50']
    
    # We only want to 'enter' exactly on the cross:
    entries = entries & (df['Close'].shift(1) <= df['SMA_50'].shift(1))
    
    # Exit condition
    exits = df['Close'] < df['SMA_50']
    
    # Fill N/As to avoid pandas issues
    return entries.fillna(False), exits.fillna(False)

# Register it:
STRATEGIES["Simple SMA Cross"] = simple_moving_average_cross
```
The UI will instantly pick up the new strategy and add it to the dropdown map!

### Data Sources
| Source | Usage | Limits / Cost |
|--------|-------|---------------|
| `yfinance` | OHLCV History, PE Ratios, Market Cap | Free, No setup required |
| NSE API | Dynamically scraping index constituents | Free, Public |
| Finnhub | Live Quotes, Streaming News | Free API Key Optional |

### Database
The project utilizes `sqlite` and `SQLAlchemy` under the hood solely for caching expensive history downloads. The database is generated automatically in `backend/data/stocks.db`. If you ever experience corrupted data, simply delete the `.db` file and restart the backend.

---
*Disclaimer: Educational project only. Not financial advice. Past backtested performance does not guarantee future results.*
