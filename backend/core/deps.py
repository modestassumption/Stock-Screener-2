"""backend/core/deps.py — FastAPI dependency injection singletons."""
from functools import lru_cache
from .config import get_settings

_fetcher = None
_screener = None


def get_fetcher():
    global _fetcher
    if _fetcher is None:
        from services.fetcher import DataFetcher
        s = get_settings()
        _fetcher = DataFetcher(db_path=s.DB_PATH, finnhub_key=s.FINNHUB_API_KEY)
    return _fetcher


def get_screener():
    global _screener
    if _screener is None:
        from analysis.screener import Screener
        _screener = Screener(fetcher=get_fetcher())
    return _screener
