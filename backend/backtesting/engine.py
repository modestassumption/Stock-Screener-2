"""
backend/backtesting/engine.py

Event-driven backtester with:
  - Position sizing (full capital, one position at a time)
  - Fixed stop-loss and optional trailing stop
  - Transaction costs (0.1% per side)
  - Benchmark comparison (Nifty 50)
  - Performance metrics: CAGR, Sharpe, Sortino, Max Drawdown, Alpha
"""
import numpy as np
import pandas as pd
from dataclasses import dataclass, field
from typing import Optional, Callable, Tuple

TRANSACTION_COST = 0.001  # 0.1% per side


@dataclass
class BacktestResult:
    equity_curve: pd.Series
    trades_list: list
    benchmark_curve: Optional[pd.Series]
    initial_capital: float

    def summary(self) -> dict:
        eq = self.equity_curve
        total_ret = (eq.iloc[-1] / eq.iloc[0] - 1) * 100
        n_years = len(eq) / 252
        cagr = ((eq.iloc[-1] / eq.iloc[0]) ** (1 / max(n_years, 0.01)) - 1) * 100

        daily_ret = eq.pct_change().dropna()
        neg_ret = daily_ret[daily_ret < 0]
        sharpe  = (daily_ret.mean() / daily_ret.std() * np.sqrt(252)) if daily_ret.std() else 0
        sortino = (daily_ret.mean() / neg_ret.std() * np.sqrt(252)) if len(neg_ret) and neg_ret.std() else 0

        # Drawdown
        roll_max = eq.cummax()
        dd = (eq - roll_max) / roll_max * 100
        max_dd = dd.min()

        trades = self.trades_list
        wins = [t for t in trades if t.get("P&L ₹", 0) > 0]
        win_rate = len(wins) / len(trades) * 100 if trades else 0
        gross_profit = sum(t.get("P&L ₹", 0) for t in wins)
        gross_loss   = abs(sum(t.get("P&L ₹", 0) for t in trades if t.get("P&L ₹", 0) < 0))
        profit_factor = gross_profit / gross_loss if gross_loss else float("inf")

        alpha = None
        if self.benchmark_curve is not None:
            bench_ret = (self.benchmark_curve.iloc[-1] / self.benchmark_curve.iloc[0] - 1) * 100
            alpha = round(total_ret - bench_ret, 2)

        return {
            "Total Return %":    round(total_ret, 2),
            "CAGR %":            round(cagr, 2),
            "Max Drawdown %":    round(max_dd, 2),
            "Sharpe Ratio":      round(sharpe, 2),
            "Sortino Ratio":     round(sortino, 2),
            "Win Rate %":        round(win_rate, 1),
            "Profit Factor":     round(profit_factor, 2) if profit_factor != float("inf") else "inf",
            "Total Trades":      len(trades),
            "Alpha % vs Nifty":  alpha if alpha is not None else "N/A",
        }

    def trade_log(self) -> pd.DataFrame:
        if not self.trades_list:
            return pd.DataFrame()
        return pd.DataFrame(self.trades_list)


class Backtest:
    def __init__(
        self,
        df: pd.DataFrame,
        ticker: str,
        initial_capital: float = 1_000_000,
        benchmark_df: Optional[pd.DataFrame] = None,
    ):
        self.df = df.copy()
        self.ticker = ticker
        self.initial_capital = initial_capital
        self.benchmark_df = benchmark_df

    def run(
        self,
        strategy_fn: Callable,
        strategy_name: str = "",
        stop_loss_pct: float = 0.08,
        trailing_stop_pct: Optional[float] = None,
    ) -> BacktestResult:
        df = self.df
        entries, exits = strategy_fn(df)
        entries = entries.reindex(df.index, fill_value=False)
        exits   = exits.reindex(df.index, fill_value=False)

        cash    = self.initial_capital
        shares  = 0
        entry_price = 0.0
        peak_price  = 0.0
        trades  = []
        equity  = []

        for i, (date, row) in enumerate(df.iterrows()):
            price = float(row["Close"])

            if shares > 0:
                # Trailing stop
                if trailing_stop_pct and price > peak_price:
                    peak_price = price
                trail_stop = peak_price * (1 - trailing_stop_pct) if trailing_stop_pct else 0
                # Fixed stop
                fixed_stop = entry_price * (1 - stop_loss_pct)

                exit_reason = None
                if price <= fixed_stop:
                    exit_reason = "Stop Loss"
                elif trailing_stop_pct and price <= trail_stop:
                    exit_reason = "Trailing Stop"
                elif exits.iloc[i]:
                    exit_reason = "Signal"

                if exit_reason:
                    proceeds = shares * price * (1 - TRANSACTION_COST)
                    pnl = proceeds - shares * entry_price * (1 + TRANSACTION_COST)
                    trades.append({
                        "Entry Date":  entry_date,
                        "Exit Date":   date,
                        "Entry Price": round(entry_price, 2),
                        "Exit Price":  round(price, 2),
                        "Shares":      shares,
                        "P&L ₹":       round(pnl, 2),
                        "P&L %":       round(pnl / (shares * entry_price) * 100, 2),
                        "Exit Reason": exit_reason,
                    })
                    cash += proceeds
                    shares = 0

            if shares == 0 and entries.iloc[i] and i < len(df) - 1:
                next_price = float(df["Close"].iloc[i + 1])
                cost = next_price * (1 + TRANSACTION_COST)
                shares = int(cash // cost)
                if shares > 0:
                    entry_price = next_price
                    peak_price  = next_price
                    entry_date  = df.index[i + 1]
                    cash -= shares * cost

            equity.append(cash + shares * price)

        equity_series = pd.Series(equity, index=df.index, name="equity")

        # Benchmark normalised to same start
        bench_curve = None
        if self.benchmark_df is not None and not self.benchmark_df.empty:
            b = self.benchmark_df["Close"].reindex(df.index, method="ffill").dropna()
            if not b.empty:
                bench_curve = b / b.iloc[0] * self.initial_capital

        return BacktestResult(
            equity_curve=equity_series,
            trades_list=trades,
            benchmark_curve=bench_curve,
            initial_capital=self.initial_capital,
        )
