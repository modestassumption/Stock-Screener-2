"""
backend/analysis/indicators.py

Computes all technical indicators on an OHLCV DataFrame.
Returns the DataFrame enriched with indicator columns.
"""
import numpy as np
import pandas as pd
import warnings

warnings.filterwarnings("ignore", category=FutureWarning)


def _ema(series: pd.Series, span: int) -> pd.Series:
    return series.ewm(span=span, adjust=False).mean()


def _rsi(close: pd.Series, period: int = 14) -> pd.Series:
    delta = close.diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)
    avg_gain = gain.ewm(alpha=1 / period, adjust=False).mean()
    avg_loss = loss.ewm(alpha=1 / period, adjust=False).mean()
    rs = avg_gain / avg_loss.replace(0, np.nan)
    return 100 - (100 / (1 + rs))


def _macd(close: pd.Series, fast=12, slow=26, signal=9):
    macd_line = _ema(close, fast) - _ema(close, slow)
    signal_line = _ema(macd_line, signal)
    hist = macd_line - signal_line
    return macd_line, signal_line, hist


def _bollinger(close: pd.Series, period=20, std_dev=2):
    mid = close.rolling(period).mean()
    std = close.rolling(period).std()
    return mid + std_dev * std, mid, mid - std_dev * std


def _atr(df: pd.DataFrame, period=14) -> pd.Series:
    high, low, close = df["High"], df["Low"], df["Close"]
    tr = pd.concat([
        high - low,
        (high - close.shift()).abs(),
        (low - close.shift()).abs(),
    ], axis=1).max(axis=1)
    return tr.ewm(alpha=1 / period, adjust=False).mean()


def _obv(close: pd.Series, volume: pd.Series) -> pd.Series:
    direction = close.diff().apply(lambda x: 1 if x > 0 else (-1 if x < 0 else 0))
    return (direction * volume).cumsum()


def add_all_indicators(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    close = df["Close"]
    high  = df["High"]
    low   = df["Low"]
    vol   = df["Volume"]

    # Moving averages
    df["SMA_50"]  = close.rolling(50).mean()
    df["SMA_200"] = close.rolling(200).mean()
    df["EMA_20"]  = _ema(close, 20)
    df["EMA_50"]  = _ema(close, 50)

    # RSI
    df["RSI"] = _rsi(close, 14)

    # MACD
    df["MACD"], df["MACD_Signal"], df["MACD_Hist"] = _macd(close)

    # Bollinger Bands
    df["BB_Upper"], df["BB_Middle"], df["BB_Lower"] = _bollinger(close)

    # ATR
    df["ATR"] = _atr(df, 14)
    df["ATR_Pct"] = (df["ATR"] / close * 100).round(2)

    # OBV
    df["OBV"] = _obv(close, vol)

    # Rate of Change (returns)
    df["ROC_20d"]  = close.pct_change(20) * 100
    df["ROC_63d"]  = close.pct_change(63) * 100
    df["ROC_252d"] = close.pct_change(252) * 100

    # For screener compat labeling
    df["ROC_1m%"] = df["ROC_20d"]
    df["ROC_3m%"] = df["ROC_63d"]
    df["ROC_1y%"] = df["ROC_252d"]

    # 52-week high
    df["52W_High"] = high.rolling(252).max()
    df["Pct_From_52W_High"] = ((close - df["52W_High"]) / df["52W_High"] * 100).round(2)

    # Relative Volume (20-day avg)
    avg_vol = vol.rolling(20).mean()
    df["Rel_Volume"] = (vol / avg_vol).round(2)

    # Golden Cross flag
    df["GoldenCross"] = (df["SMA_50"] > df["SMA_200"]).astype(int)

    # Histogram direction
    df["MACD_Bullish"] = (df["MACD_Hist"] > 0).astype(int)

    return df
