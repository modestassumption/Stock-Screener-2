"""
backend/backtesting/strategies.py

Six pre-built trading strategies.
Each strategy_fn(df) -> (entries: pd.Series[bool], exits: pd.Series[bool])
All indexed to df.index.
"""
import pandas as pd

def _bool(s: pd.Series) -> pd.Series:
    return s.fillna(False).astype(bool)


def rsi_reversal(df: pd.DataFrame):
    """Buy oversold (RSI<35), sell overbought (RSI>65)."""
    entries = _bool(df["RSI"] < 35)
    exits   = _bool(df["RSI"] > 65)
    return entries, exits


def macd_crossover(df: pd.DataFrame):
    """Buy when MACD crosses above signal; sell when it crosses below."""
    macd, sig = df["MACD"], df["MACD_Signal"]
    entries = _bool((macd > sig) & (macd.shift(1) <= sig.shift(1)))
    exits   = _bool((macd < sig) & (macd.shift(1) >= sig.shift(1)))
    return entries, exits


def golden_cross(df: pd.DataFrame):
    """Buy on SMA50 crossing above SMA200; sell on death cross."""
    s50, s200 = df["SMA_50"], df["SMA_200"]
    entries = _bool((s50 > s200) & (s50.shift(1) <= s200.shift(1)))
    exits   = _bool((s50 < s200) & (s50.shift(1) >= s200.shift(1)))
    return entries, exits


def bollinger_breakout(df: pd.DataFrame):
    """Buy breakout above upper band; sell touch of lower band."""
    close = df["Close"]
    entries = _bool(close > df["BB_Upper"])
    exits   = _bool(close < df["BB_Lower"])
    return entries, exits


def minervini_trend(df: pd.DataFrame):
    """
    Minervini Stage 2 template:
      - Above SMA50 and SMA200
      - SMA50 > SMA200
      - RSI > 50
    Exit: close below SMA50.
    """
    close = df["Close"]
    entries = _bool(
        (close > df["SMA_50"]) &
        (close > df["SMA_200"]) &
        (df["SMA_50"] > df["SMA_200"]) &
        (df["RSI"] > 50)
    )
    exits = _bool(close < df["SMA_50"])
    return entries, exits


def momentum_follow(df: pd.DataFrame):
    """
    Strong momentum entry: RSI 55-75, positive MACD histogram, above SMA200.
    Exit: RSI drops below 45 or MACD turns negative.
    """
    entries = _bool(
        (df["RSI"] > 55) & (df["RSI"] < 75) &
        (df["MACD_Hist"] > 0) &
        (df["Close"] > df["SMA_200"])
    )
    exits = _bool((df["RSI"] < 45) | (df["MACD_Hist"] < 0))
    return entries, exits


STRATEGIES = {
    "RSI Reversal":       rsi_reversal,
    "MACD Crossover":     macd_crossover,
    "Golden Cross":       golden_cross,
    "Bollinger Breakout": bollinger_breakout,
    "Minervini Trend":    minervini_trend,
    "Momentum Follow":    momentum_follow,
}
