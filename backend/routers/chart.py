"""backend/routers/chart.py"""
from fastapi import APIRouter, Depends, Query, HTTPException
import math
import numpy as np
import pandas as pd
from core.deps import get_fetcher
from services.fetcher import DataFetcher
from analysis.indicators import add_all_indicators

router = APIRouter()


@router.get("/ohlcv/{ticker}")
def get_ohlcv(
    ticker: str,
    days: int = Query(365, ge=30, le=9490),
    fetcher: DataFetcher = Depends(get_fetcher),
):
    df = fetcher.get_ohlcv(ticker.upper(), days=days)
    if df.empty:
        raise HTTPException(404, f"No data found for {ticker}")
    df = add_all_indicators(df)
    df = df.reset_index()
    if "date" not in df.columns and "Date" in df.columns:
        df = df.rename(columns={"Date": "date"})
    if "date" in df.columns:
        df["date"] = df["date"].astype(str)
    bool_cols = df.select_dtypes(include="bool").columns.tolist()
    df[bool_cols] = df[bool_cols].astype(int)
    
    df = df.replace([np.inf, -np.inf], np.nan)
    records = df.to_dict(orient="records")
    for r in records:
        for k, v in r.items():
            if isinstance(v, float) and math.isnan(v):
                r[k] = None
                
    return {"ticker": ticker, "records": records}


@router.get("/fundamentals/{ticker}")
def get_fundamentals(
    ticker: str,
    fetcher: DataFetcher = Depends(get_fetcher),
):
    data = fetcher.get_fundamentals(ticker.upper())
    if not data:
        raise HTTPException(404, f"No fundamentals found for {ticker}")
    return data


@router.get("/quote/{ticker}")
def get_quote(
    ticker: str,
    fetcher: DataFetcher = Depends(get_fetcher),
):
    data = fetcher.get_realtime_quote(ticker.upper())
    if not data:
        raise HTTPException(404, f"Could not fetch quote for {ticker}")
    return data
