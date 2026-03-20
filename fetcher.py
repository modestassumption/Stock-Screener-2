"""
backend/services/fetcher.py

Data acquisition layer.
  - Primary:  yfinance  (free, no key, Yahoo Finance backend)
  - Optional: Finnhub   (free API key, 60 req/min — used for real-time quotes & news)
  - Cache:    SQLite via SQLAlchemy

yfinance is intentionally kept as primary because:
  1. It covers all NSE/BSE symbols (suffix .NS / .BO)
  2. Provides 20+ years of OHLCV history
  3. Returns fundamentals (P/E, market cap, sector, etc.)
  4. No key, no rate-limit hassle for historical data
  5. Widely accepted in portfolio projects and interviews

Finnhub supplements with real-time quotes and market news when a key is provided.
"""

import os, time, logging, requests
import pandas as pd
import yfinance as yf
from datetime import datetime, timedelta
from sqlalchemy import create_engine, text
from typing import Optional, List
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from config.settings import DB_PATH, HISTORY_DAYS, DEFAULT_WATCHLIST

logger = logging.getLogger(__name__)

# ── Finnhub (optional) ────────────────────────────────────────────────────────

FINNHUB_BASE = "https://finnhub.io/api/v1"


def _finnhub_get(endpoint: str, params: dict, api_key: str) -> Optional[dict]:
    if not api_key:
        return None
    try:
        params["token"] = api_key
        r = requests.get(f"{FINNHUB_BASE}{endpoint}", params=params, timeout=8)
        r.raise_for_status()
        return r.json()
    except Exception as e:
        logger.warning(f"Finnhub request failed: {e}")
        return None


# ── NSE index constituents (no-auth public JSON) ─────────────────────────────

NSE_INDICES = {
    "Nifty 50":        "https://www.nseindia.com/api/equity-stockIndices?index=NIFTY%2050",
    "Nifty Next 50":   "https://www.nseindia.com/api/equity-stockIndices?index=NIFTY%20NEXT%2050",
    "Nifty Midcap 100":"https://www.nseindia.com/api/equity-stockIndices?index=NIFTY%20MIDCAP%20100",
}

_NSE_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.nseindia.com/",
}


def _nse_session() -> requests.Session:
    s = requests.Session()
    s.headers.update(_NSE_HEADERS)
    try:
        s.get("https://www.nseindia.com", timeout=8)
        time.sleep(0.5)
    except Exception:
        pass
    return s


# ── Main DataFetcher ──────────────────────────────────────────────────────────

class DataFetcher:
    CACHE_TTL_HOURS = 4

    def __init__(self, db_path: str = DB_PATH, finnhub_key: str = ""):
        os.makedirs(os.path.dirname(db_path) or ".", exist_ok=True)
        self.engine = create_engine(f"sqlite:///{db_path}", echo=False)
        self.finnhub_key = finnhub_key
        self._init_db()

    # ── DB ────────────────────────────────────────────────────────────────────

    def _init_db(self):
        with self.engine.connect() as conn:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS ohlcv (
                    ticker TEXT, date TEXT, open REAL, high REAL,
                    low REAL, close REAL, volume REAL,
                    PRIMARY KEY (ticker, date)
                )"""))
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS cache_meta (
                    ticker TEXT PRIMARY KEY, last_updated TEXT
                )"""))
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS fundamentals (
                    ticker TEXT PRIMARY KEY, name TEXT, sector TEXT,
                    industry TEXT, market_cap REAL, pe_ratio REAL,
                    pb_ratio REAL, dividend_yield REAL, eps REAL,
                    roe REAL, debt_to_equity REAL, last_updated TEXT
                )"""))
            conn.commit()

    # ── Public API ────────────────────────────────────────────────────────────

    def get_ohlcv(self, ticker: str, days: int = HISTORY_DAYS,
                  force_refresh: bool = False) -> pd.DataFrame:
        if not force_refresh and self._is_fresh(ticker):
            df = self._load_from_cache(ticker)
            if df is not None and not df.empty:
                return df
        df = self._download_yfinance(ticker, days)
        if df is not None and not df.empty:
            self._save_to_cache(ticker, df)
        return df if df is not None else pd.DataFrame()

    def get_ohlcv_batch(self, tickers: List[str], days: int = HISTORY_DAYS,
                        delay: float = 0.25) -> dict:
        result = {}
        for i, t in enumerate(tickers):
            df = self.get_ohlcv(t, days)
            if not df.empty:
                result[t] = df
            time.sleep(delay)
        return result

    def get_fundamentals(self, ticker: str, force_refresh: bool = False) -> dict:
        if not force_refresh:
            row = self._load_fundamentals(ticker)
            if row:
                return row
        try:
            info = yf.Ticker(ticker).info
            data = {
                "ticker": ticker,
                "name": info.get("longName", ticker),
                "sector": info.get("sector", "Unknown"),
                "industry": info.get("industry", "Unknown"),
                "market_cap": info.get("marketCap"),
                "pe_ratio": info.get("trailingPE"),
                "pb_ratio": info.get("priceToBook"),
                "dividend_yield": info.get("dividendYield"),
                "eps": info.get("trailingEps"),
                "roe": info.get("returnOnEquity"),
                "debt_to_equity": info.get("debtToEquity"),
                "last_updated": datetime.now().isoformat(),
            }
            self._save_fundamentals(data)
            return data
        except Exception as e:
            logger.error(f"Fundamentals failed for {ticker}: {e}")
            return {}

    def get_realtime_quote(self, ticker: str) -> dict:
        """
        Real-time quote.
        Tries Finnhub first (if key present), falls back to yfinance fast_info.
        Finnhub symbol format for NSE: 'NSE:RELIANCE' (strip .NS suffix).
        """
        if self.finnhub_key:
            fh_symbol = ticker.replace(".NS", "").replace(".BO", "")
            exchange = "NSE" if ticker.endswith(".NS") else "BSE"
            data = _finnhub_get("/quote", {"symbol": f"{exchange}:{fh_symbol}"},
                                 self.finnhub_key)
            if data and data.get("c"):
                return {
                    "source": "finnhub",
                    "price": data["c"],
                    "change": data["d"],
                    "change_pct": data["dp"],
                    "high": data["h"],
                    "low": data["l"],
                    "open": data["o"],
                    "prev_close": data["pc"],
                }

        # Fallback: yfinance fast_info (cached, slightly delayed)
        try:
            fi = yf.Ticker(ticker).fast_info
            pc = fi.previous_close or 0
            cur = fi.last_price or 0
            return {
                "source": "yfinance",
                "price": cur,
                "change": round(cur - pc, 2),
                "change_pct": round((cur - pc) / pc * 100, 2) if pc else 0,
                "high": fi.day_high,
                "low": fi.day_low,
                "open": fi.open,
                "prev_close": pc,
            }
        except Exception:
            return {}

    def get_market_news(self, category: str = "general") -> list:
        """
        Market news via Finnhub (requires API key).
        Returns empty list if no key.
        """
        if not self.finnhub_key:
            return []
        data = _finnhub_get("/news", {"category": category}, self.finnhub_key)
        if not data:
            return []
        return [
            {
                "headline": item.get("headline", ""),
                "summary": item.get("summary", ""),
                "url": item.get("url", ""),
                "source": item.get("source", ""),
                "datetime": item.get("datetime", 0),
                "image": item.get("image", ""),
            }
            for item in data[:10]
        ]

    def get_nse_tickers(self, index: str = "Nifty 50") -> List[str]:
        url = NSE_INDICES.get(index)
        if not url:
            return DEFAULT_WATCHLIST
        try:
            session = _nse_session()
            resp = session.get(url, timeout=10)
            resp.raise_for_status()
            data = resp.json()
            symbols = [
                row["symbol"] + ".NS"
                for row in data.get("data", [])
                if row.get("symbol") and row["symbol"] != index.replace(" ", "_")
            ]
            return symbols if symbols else DEFAULT_WATCHLIST
        except Exception as e:
            logger.warning(f"NSE API failed: {e}. Using DEFAULT_WATCHLIST.")
            return DEFAULT_WATCHLIST

    # ── Cache ─────────────────────────────────────────────────────────────────

    def _is_fresh(self, ticker: str) -> bool:
        with self.engine.connect() as conn:
            row = conn.execute(
                text("SELECT last_updated FROM cache_meta WHERE ticker=:t"), {"t": ticker}
            ).fetchone()
        if not row:
            return False
        return (datetime.now() - datetime.fromisoformat(row[0])).total_seconds() < self.CACHE_TTL_HOURS * 3600

    def _load_from_cache(self, ticker: str) -> Optional[pd.DataFrame]:
        try:
            df = pd.read_sql(
                f"SELECT date,open,high,low,close,volume FROM ohlcv WHERE ticker='{ticker}' ORDER BY date",
                self.engine, parse_dates=["date"], index_col="date",
            )
            df.columns = [c.capitalize() for c in df.columns]
            return df
        except Exception:
            return None

    def _save_to_cache(self, ticker: str, df: pd.DataFrame):
        rows = df.reset_index().rename(columns=str.lower)
        rows["ticker"] = ticker
        rows = rows.rename(columns={"adj close": "close"})
        keep = [c for c in ["ticker", "date", "open", "high", "low", "close", "volume"] if c in rows.columns]
        rows = rows[keep]
        rows["date"] = rows["date"].astype(str)
        with self.engine.connect() as conn:
            conn.execute(text("DELETE FROM ohlcv WHERE ticker=:t"), {"t": ticker})
            rows.to_sql("ohlcv", conn, if_exists="append", index=False)
            conn.execute(
                text("INSERT OR REPLACE INTO cache_meta(ticker,last_updated) VALUES(:t,:ts)"),
                {"t": ticker, "ts": datetime.now().isoformat()},
            )
            conn.commit()

    def _load_fundamentals(self, ticker: str) -> dict:
        with self.engine.connect() as conn:
            row = conn.execute(
                text("SELECT * FROM fundamentals WHERE ticker=:t"), {"t": ticker}
            ).fetchone()
        if not row:
            return {}
        keys = ["ticker","name","sector","industry","market_cap","pe_ratio",
                "pb_ratio","dividend_yield","eps","roe","debt_to_equity","last_updated"]
        return dict(zip(keys, row))

    def _save_fundamentals(self, data: dict):
        with self.engine.connect() as conn:
            conn.execute(text("""
                INSERT OR REPLACE INTO fundamentals
                    (ticker,name,sector,industry,market_cap,pe_ratio,pb_ratio,
                     dividend_yield,eps,roe,debt_to_equity,last_updated)
                VALUES (:ticker,:name,:sector,:industry,:market_cap,:pe_ratio,:pb_ratio,
                        :dividend_yield,:eps,:roe,:debt_to_equity,:last_updated)
            """), data)
            conn.commit()

    # ── yfinance download ─────────────────────────────────────────────────────

    def _download_yfinance(self, ticker: str, days: int) -> Optional[pd.DataFrame]:
        end = datetime.now()
        start = end - timedelta(days=days)
        try:
            df = yf.download(ticker, start=start.strftime("%Y-%m-%d"),
                             end=end.strftime("%Y-%m-%d"), progress=False, auto_adjust=True)
            if df.empty:
                return None
            if isinstance(df.columns, pd.MultiIndex):
                df.columns = df.columns.get_level_values(0)
            return df
        except Exception as e:
            logger.error(f"yfinance download failed for {ticker}: {e}")
            return None
