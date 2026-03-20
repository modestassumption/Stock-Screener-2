import { useState } from 'react'
import { runBacktest, getStrategies, getTickers } from '../lib/api'
import { useApi, useManualApi, globalCache } from '../hooks/useApi'
import {
  Button, Input, Select, RangeSlider,
  SectionHeader, Badge, DataTable, Spinner, ErrorBox, EmptyState, TickerDropdown
} from '../components/UI'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts'
import { INITIAL_CAPITAL } from '../lib/constants'
import { Play, FlaskConical } from 'lucide-react'

const PERIODS = [
  { label: '1 Year',  value: 365 },
  { label: '3 Years', value: 1095 },
  { label: '5 Years', value: 1825 },
  { label: '10 Years',value: 3650 },
]

function MetricGrid({ summary }) {
  if (!summary) return null
  const items = [
    { label: 'Total Return', value: `${summary['Total Return %']}%`,
      pos: summary['Total Return %'] > 0 },
    { label: 'CAGR',         value: `${summary['CAGR %']}%`,
      pos: summary['CAGR %'] > 0 },
    { label: 'Max Drawdown', value: `${summary['Max Drawdown %']}%`, pos: false },
    { label: 'Sharpe',       value: summary['Sharpe Ratio'], pos: summary['Sharpe Ratio'] > 1 },
    { label: 'Sortino',      value: summary['Sortino Ratio'], pos: summary['Sortino Ratio'] > 1 },
    { label: 'Win Rate',     value: `${summary['Win Rate %']}%`,
      pos: summary['Win Rate %'] > 50 },
    { label: 'Profit Factor',value: summary['Profit Factor'], pos: true },
    { label: 'Total Trades', value: summary['Total Trades'], pos: null },
    { label: 'Alpha vs Nifty', value: typeof summary['Alpha % vs Nifty'] === 'number'
      ? `${summary['Alpha % vs Nifty']}%` : summary['Alpha % vs Nifty'],
      pos: summary['Alpha % vs Nifty'] > 0 },
  ]
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
      gap: 10, marginBottom: 24 }}>
      {items.map(it => (
        <div key={it.label} style={{ background: 'var(--bg3)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)', padding: '14px 16px' }}>
          <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase',
            letterSpacing: '0.1em', marginBottom: 6 }}>{it.label}</div>
          <div style={{
            fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-mono)',
            color: it.pos === null ? 'var(--text)'
              : it.pos ? 'var(--green)' : 'var(--red)',
          }}>{it.value}</div>
        </div>
      ))}
    </div>
  )
}

const TRADE_COLS = [
  { key: 'Entry Date',  label: 'Entry',  align: 'left', mono: true },
  { key: 'Exit Date',   label: 'Exit',   align: 'left', mono: true },
  { key: 'Entry Price', label: 'Entry ₹' },
  { key: 'Exit Price',  label: 'Exit ₹' },
  { key: 'Shares',      label: 'Qty' },
  { key: 'P&L ₹',       label: 'P&L ₹',
    render: (v) => <span style={{ color: v >= 0 ? 'var(--green)' : 'var(--red)',
      fontFamily: 'var(--font-mono)', fontSize: 12 }}>₹{Number(v).toLocaleString('en-IN')}</span> },
  { key: 'P&L %',       label: 'P&L %',
    render: (v) => <span style={{ color: v >= 0 ? 'var(--green)' : 'var(--red)',
      fontFamily: 'var(--font-mono)', fontSize: 12 }}>{v >= 0 ? '+' : ''}{v}%</span> },
  { key: 'Exit Reason', label: 'Reason', align: 'left', mono: false,
    render: (v) => <Badge variant={v === 'Signal' ? 'blue' : v?.includes('Stop') ? 'red' : 'default'}>{v}</Badge> },
]

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--bg3)', border: '1px solid var(--border2)',
      borderRadius: 6, padding: '10px 14px', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
      <div style={{ color: 'var(--muted)', marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color }}>
          {p.name}: ₹{Number(p.value).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
        </div>
      ))}
    </div>
  )
}

export default function Backtest() {
  const { data: strats } = useApi(getStrategies)
  const [ticker, setTicker]         = useState(globalCache.bt_ticker || 'RELIANCE.NS')
  const [strategy, setStrategy]     = useState(globalCache.bt_strategy || '')
  const [days, setDays]             = useState(1095)
  const [capital, setCapital]       = useState(globalCache.bt_capital || INITIAL_CAPITAL)
  const [stopLoss, setStopLoss]     = useState(globalCache.bt_stopLoss || 8)
  const [trailingStop, setTrailing] = useState(globalCache.bt_trailingStop || 0)
  const { data, loading, error, execute } = useManualApi('backtest_results')

  const { data: tickersData } = useApi(() => getTickers('ALL'))
  const allTickers = tickersData?.tickers || []

  const strategies = strats?.strategies || []
  const selectedStrat = strategy || strategies[0] || ''

  function handleRun() {
    execute(() => runBacktest({
      ticker: ticker.toUpperCase().includes('.') ? ticker.toUpperCase() : ticker.toUpperCase() + '.NS',
      strategy: selectedStrat,
      days,
      initial_capital: capital,
      stop_loss_pct: stopLoss / 100,
      trailing_stop_pct: trailingStop > 0 ? trailingStop / 100 : null,
    }))
  }

  const equity = data?.equity_curve || []
  const trades  = data?.trades || []

  // Drawdown series
  const ddSeries = equity.map((p, i) => {
    const peak = Math.max(...equity.slice(0, i + 1).map(e => e.equity))
    return { date: p.date, drawdown: ((p.equity - peak) / peak * 100) }
  })

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1300, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 4 }}>
          Strategy Backtester
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: 13 }}>
          Event-driven · Indian brokerage costs · Alpha vs Nifty 50
        </p>
      </div>

      {/* Config panel */}
      <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', padding: '20px 24px', marginBottom: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: 14, marginBottom: 16 }}>
          <div style={{ zIndex: 10 }}>
            <TickerDropdown label="Ticker" value={ticker}
              onChange={v => { setTicker(v); globalCache.bt_ticker = v; }} tickers={allTickers}
              placeholder="e.g. TCS.NS" />
          </div>
          <Select label="Strategy" value={selectedStrat}
            onChange={e => { const v = e.target.value; setStrategy(v); globalCache.bt_strategy = v; }}
            options={strategies.map(s => ({ label: s, value: s }))} />
          <Select label="History" value={days} onChange={e => setDays(+e.target.value)}
            options={PERIODS.map(p => ({ label: p.label, value: p.value }))} />
          <Input label="Capital ₹" type="number" value={capital}
            onChange={e => { const v = +e.target.value; setCapital(v); globalCache.bt_capital = v; }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: 16, marginBottom: 16 }}>
          <RangeSlider label="Stop Loss %" min={1} max={30} value={stopLoss} onChange={v => { setStopLoss(v); globalCache.bt_stopLoss = v; }} />
          <RangeSlider label="Trailing Stop % (0=off)" min={0} max={30} value={trailingStop} onChange={v => { setTrailing(v); globalCache.bt_trailingStop = v; }} />
        </div>

        <Button onClick={handleRun} loading={loading} style={{ minWidth: 160 }}>
          <Play size={14} fill="currentColor" /> Run Backtest
        </Button>
      </div>

      {error && <ErrorBox message={error} />}

      {loading && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: 40,
          justifyContent: 'center', color: 'var(--muted)' }}>
          <Spinner size={24} /><span>Backtesting {ticker}…</span>
        </div>
      )}

      {!loading && data && (
        <>
          {/* Metrics */}
          <SectionHeader>Performance Summary</SectionHeader>
          <MetricGrid summary={data.summary} />

          {/* Equity curve */}
          <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)', padding: '16px 20px', marginBottom: 16 }}>
            <SectionHeader>Equity Curve</SectionHeader>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={equity} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#58a6ff" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#58a6ff" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="benchGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#f0b429" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#f0b429" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fill: '#7d8590', fontSize: 10, fontFamily: 'monospace' }}
                  tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fill: '#7d8590', fontSize: 10, fontFamily: 'monospace' }}
                  tickLine={false} axisLine={false}
                  tickFormatter={v => `₹${(v/1e5).toFixed(1)}L`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'monospace', color: '#7d8590' }} />
                <Area type="monotone" dataKey="equity" stroke="#58a6ff" fill="url(#eqGrad)"
                  strokeWidth={2} dot={false} name="Strategy" />
                {equity[0]?.benchmark && (
                  <Area type="monotone" dataKey="benchmark" stroke="#f0b429" fill="url(#benchGrad)"
                    strokeWidth={1.5} strokeDasharray="4 2" dot={false} name="Nifty 50" />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Drawdown */}
          <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)', padding: '16px 20px', marginBottom: 16 }}>
            <SectionHeader>Drawdown</SectionHeader>
            <ResponsiveContainer width="100%" height={120}>
              <AreaChart data={ddSeries} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#f85149" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#f85149" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={false} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#7d8590', fontSize: 10 }} tickLine={false} axisLine={false}
                  tickFormatter={v => `${v.toFixed(0)}%`} />
                <Tooltip formatter={(v) => [`${v.toFixed(2)}%`, 'Drawdown']}
                  contentStyle={{ background: 'var(--bg3)', border: '1px solid var(--border2)',
                    fontFamily: 'monospace', fontSize: 11 }} />
                <ReferenceLine y={0} stroke="#21262d" />
                <Area type="monotone" dataKey="drawdown" stroke="#f85149" fill="url(#ddGrad)"
                  strokeWidth={1} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Trade log */}
          {trades.length > 0 && (
            <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
              <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)' }}>
                <SectionHeader>Trade Log — {trades.length} trades</SectionHeader>
              </div>
              <DataTable columns={TRADE_COLS} rows={trades} />
            </div>
          )}
        </>
      )}

      {!loading && !data && (
        <EmptyState icon={FlaskConical} title="Configure & run a backtest"
          sub="Select a ticker, strategy and time period, then click Run." />
      )}
    </div>
  )
}
