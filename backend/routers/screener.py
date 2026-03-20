"""backend/routers/screener.py"""
from fastapi import APIRouter, Depends, Query
import math
import numpy as np
import pandas as pd
from core.deps import get_screener, get_fetcher
from analysis.screener import Screener
from services.fetcher import DataFetcher

router = APIRouter()


@router.get("/run")
def run_screener(
    index: str = Query("Nifty 50", description="NSE index to screen"),
    min_price: float = 50,
    max_price: float = 100000,
    rsi_min: float = 40,
    rsi_max: float = 75,
    above_sma200: bool = True,
    above_sma50: bool = True,
    min_rs: float = 60,
    min_volume: int = 100000,
    min_mcap_cr: float = 500,
    screener: Screener = Depends(get_screener),
    fetcher: DataFetcher = Depends(get_fetcher),
):
    tickers = fetcher.get_nse_tickers(index)
    filters = {
        "min_price": min_price,
        "max_price": max_price,
        "rsi_min": rsi_min,
        "rsi_max": rsi_max,
        "above_200_sma": above_sma200,
        "above_50_sma": above_sma50,
        "min_rs_rating": min_rs,
        "min_volume": min_volume,
        "min_market_cap_cr": min_mcap_cr,
    }
    df = screener.run(tickers=tickers, filters=filters)
    if df.empty:
        return {"results": [], "count": 0}
        
    df = df.replace([np.inf, -np.inf], np.nan)
    records = df.to_dict(orient="records")
    for r in records:
        for k, v in r.items():
            if isinstance(v, float) and math.isnan(v):
                r[k] = None
                
    return {"results": records, "count": len(records)}


@router.get("/presets")
def list_presets():
    return {
        "presets": [
            {"id": "minervini", "label": "Minervini Trend Template",
             "description": "Stage 2 uptrend — above all MAs, high RS, RSI > 50"},
            {"id": "momentum",  "label": "Pure Momentum",
             "description": "High RS >= 80, strong volume, tight MA structure"},
            {"id": "value",     "label": "Value + Momentum",
             "description": "Oversold quality stocks above 200 SMA"},
        ]
    }


@router.get("/tickers")
def get_tickers(
    index: str = Query("Nifty 50"),
    fetcher: DataFetcher = Depends(get_fetcher),
):
    tickers = fetcher.get_nse_tickers(index)
    results = []
    for t in tickers:
        # Check cache only, do not block to fetch live fundamentals for 50-100 items
        fund = fetcher._load_fundamentals(t)
        name = fund.get("name", "") if fund else ""
        if name == t or name == t.replace('.NS', ''):
            name = ""
        results.append({"ticker": t, "name": name})
    return {"index": index, "tickers": results, "count": len(tickers)}
