"""backend/routers/market.py"""
from fastapi import APIRouter, Depends
from core.deps import get_fetcher
from services.fetcher import DataFetcher
from config.settings import DEFAULT_WATCHLIST, BENCHMARK_TICKER
import yfinance as yf

router = APIRouter()


@router.get("/overview")
def market_overview(fetcher: DataFetcher = Depends(get_fetcher)):
    """Quick snapshot of key Indian market indices."""
    indices = {
        "Nifty 50":    "^NSEI",
        "Sensex":      "^BSESN",
        "Nifty Bank":  "^NSEBANK",
        "Nifty IT":    "^CNXIT",
        "India VIX":   "^INDIAVIX",
    }
    result = {}
    for name, sym in indices.items():
        q = fetcher.get_realtime_quote(sym)
        result[name] = q or {}
    return result


@router.get("/news")
def market_news(fetcher: DataFetcher = Depends(get_fetcher)):
    """Market news — requires Finnhub API key (returns [] if not configured)."""
    return {"news": fetcher.get_market_news("general"), "has_key": bool(fetcher.finnhub_key)}


@router.get("/top-movers")
def top_movers(fetcher: DataFetcher = Depends(get_fetcher)):
    """Top gainers & losers within DEFAULT_WATCHLIST using fast_info."""
    quotes = []
    for ticker in DEFAULT_WATCHLIST[:20]:  # limit for speed
        q = fetcher.get_realtime_quote(ticker)
        if q and q.get("price"):
            quotes.append({"ticker": ticker, **q})

    quotes.sort(key=lambda x: x.get("change_pct", 0))
    losers  = [q for q in quotes if q.get("change_pct", 0) < 0][:5]
    gainers = [q for q in reversed(quotes) if q.get("change_pct", 0) > 0][:5]
    return {"gainers": gainers, "losers": losers}
