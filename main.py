"""
backend/main.py  —  FastAPI application entry point

Run with:
    uvicorn main:app --reload --port 8000
"""
import os, sys, logging
sys.path.insert(0, os.path.dirname(__file__))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from core.config import get_settings
from routers import screener, chart, backtest, market

logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(name)s  %(message)s")

settings = get_settings()

app = FastAPI(
    title="NSE Stock Screener API",
    description="FastAPI backend for NSE/BSE stock screening, charting and backtesting.",
    version="2.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(screener.router, prefix="/api/screener", tags=["Screener"])
app.include_router(chart.router,    prefix="/api/chart",   tags=["Chart"])
app.include_router(backtest.router, prefix="/api/backtest",tags=["Backtest"])
app.include_router(market.router,   prefix="/api/market",  tags=["Market"])


@app.get("/api/health", tags=["Health"])
def health():
    return {"status": "ok", "env": settings.APP_ENV,
            "finnhub": bool(settings.FINNHUB_API_KEY)}
