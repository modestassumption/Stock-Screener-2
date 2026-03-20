"""
backend/analysis/screener.py

Screener — fetches OHLCV for each ticker, applies indicator + fundamental filters,
computes RS Rating (relative-strength percentile vs universe), returns ranked DataFrame.
"""
import logging
import numpy as np
import pandas as pd
from typing import List, Dict

from services.fetcher import DataFetcher
from analysis.indicators import add_all_indicators

logger = logging.getLogger(__name__)


class Screener:
    def __init__(self, fetcher: DataFetcher):
        self.fetcher = fetcher

    def run(self, tickers: List[str], filters: Dict) -> pd.DataFrame:
        rows = []
        perf_252 = {}  # {ticker: 252d return} for RS ranking

        for ticker in tickers:
            try:
                df = self.fetcher.get_ohlcv(ticker, days=400)
                if df is None or len(df) < 60:
                    continue
                df = add_all_indicators(df)
                last = df.iloc[-1]
                close = last["Close"]

                # Record 252-day return for RS calc
                if len(df) >= 252:
                    perf_252[ticker] = (close / df["Close"].iloc[-252] - 1) * 100
                else:
                    perf_252[ticker] = (close / df["Close"].iloc[0] - 1) * 100

                # Price filter
                if not (filters.get("min_price", 0) <= close <= filters.get("max_price", 1e9)):
                    continue
                # Volume filter
                vol_avg = df["Volume"].tail(20).mean()
                if vol_avg < filters.get("min_volume", 0):
                    continue
                # RSI filter
                rsi = last.get("RSI")
                if rsi is None or not (filters.get("rsi_min", 0) <= rsi <= filters.get("rsi_max", 100)):
                    continue
                # SMA filters
                if filters.get("above_200_sma") and last.get("SMA_200") and close < last["SMA_200"]:
                    continue
                if filters.get("above_50_sma") and last.get("SMA_50") and close < last["SMA_50"]:
                    continue

                # Fundamentals
                fund = self.fetcher.get_fundamentals(ticker)
                mcap = fund.get("market_cap")
                mcap_cr = (mcap / 1e7) if mcap else None  # convert to Crores

                if filters.get("min_market_cap_cr", 0) > 0 and mcap_cr:
                    if mcap_cr < filters["min_market_cap_cr"]:
                        continue

                rows.append({
                    "Ticker":       ticker,
                    "Name":         fund.get("name", ticker),
                    "Sector":       fund.get("sector", "Unknown"),
                    "Price":        round(close, 2),
                    "RSI":          round(rsi, 1) if rsi else None,
                    "SMA_50":       round(last["SMA_50"], 2) if last.get("SMA_50") is not None else None,
                    "SMA_200":      round(last["SMA_200"], 2) if last.get("SMA_200") is not None else None,
                    "ATR_Pct":      last.get("ATR_Pct"),
                    "ROC_1m%":      round(last.get("ROC_1m%", 0) or 0, 1),
                    "ROC_3m%":      round(last.get("ROC_3m%", 0) or 0, 1),
                    "ROC_1y%":      round(last.get("ROC_1y%", 0) or 0, 1),
                    "GoldenCross":  int(last.get("GoldenCross", 0)),
                    "Market_Cap":   mcap,
                    "PE":           fund.get("pe_ratio"),
                    "Vol_Avg_20d":  int(vol_avg),
                    "_perf252":     perf_252.get(ticker, 0),
                })
            except Exception as e:
                logger.warning(f"Screener error for {ticker}: {e}")
                continue

        if not rows:
            return pd.DataFrame()

        result_df = pd.DataFrame(rows)

        # RS Rating = percentile rank of 252d performance across THIS universe
        all_perfs = np.array([perf_252.get(t, 0) for t in tickers if t in perf_252])
        def rs_rating(perf):
            if len(all_perfs) == 0:
                return 50
            return round(float(np.sum(all_perfs <= perf) / len(all_perfs) * 100), 1)

        result_df["RS_Rating"] = result_df["_perf252"].apply(rs_rating)

        # Apply RS filter
        min_rs = filters.get("min_rs_rating", 0)
        result_df = result_df[result_df["RS_Rating"] >= min_rs]

        # Sort by RS descending
        result_df = result_df.sort_values("RS_Rating", ascending=False)
        result_df = result_df.drop(columns=["_perf252"], errors="ignore")

        return result_df.reset_index(drop=True)
