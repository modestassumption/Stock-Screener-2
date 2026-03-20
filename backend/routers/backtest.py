"""backend/routers/backtest.py"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from core.deps import get_fetcher
from services.fetcher import DataFetcher
from analysis.indicators import add_all_indicators
from backtesting.engine import Backtest
from backtesting.strategies import STRATEGIES
from config.settings import INITIAL_CAPITAL, BENCHMARK_TICKER

router = APIRouter()


class BacktestRequest(BaseModel):
    ticker: str
    strategy: str
    days: int = 1095
    initial_capital: float = INITIAL_CAPITAL
    stop_loss_pct: float = 0.08
    trailing_stop_pct: Optional[float] = None


@router.post("/run")
def run_backtest(req: BacktestRequest, fetcher: DataFetcher = Depends(get_fetcher)):
    if req.strategy not in STRATEGIES:
        raise HTTPException(400, f"Unknown strategy '{req.strategy}'. Available: {list(STRATEGIES.keys())}")

    df = fetcher.get_ohlcv(req.ticker.upper(), days=req.days)
    if df.empty:
        raise HTTPException(404, f"No data found for {req.ticker}")

    df = add_all_indicators(df)
    bench_df = fetcher.get_ohlcv(BENCHMARK_TICKER, days=req.days)

    bt = Backtest(
        df=df,
        ticker=req.ticker,
        initial_capital=req.initial_capital,
        benchmark_df=bench_df if not bench_df.empty else None,
    )

    results = bt.run(
        STRATEGIES[req.strategy],
        strategy_name=req.strategy,
        stop_loss_pct=req.stop_loss_pct,
        trailing_stop_pct=req.trailing_stop_pct,
    )

    summary = results.summary()
    trade_df = results.trade_log()

    eq = results.equity_curve.reset_index()
    eq.columns = ["date", "equity"]
    eq["date"] = eq["date"].astype(str)
    if results.benchmark_curve is not None:
        bench = results.benchmark_curve.reset_index()
        bench.columns = ["date", "benchmark"]
        bench["date"] = bench["date"].astype(str)
        eq = eq.merge(bench, on="date", how="left")

    trades = trade_df.to_dict(orient="records") if not trade_df.empty else []
    for t in trades:
        for k in ("Entry Date", "Exit Date"):
            if k in t:
                t[k] = str(t[k])

    return {
        "ticker": req.ticker,
        "strategy": req.strategy,
        "summary": summary,
        "equity_curve": eq.to_dict(orient="records"),
        "trades": trades,
    }


@router.get("/strategies")
def list_strategies():
    return {"strategies": list(STRATEGIES.keys())}
