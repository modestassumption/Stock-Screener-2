import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { createChart, CrosshairMode } from 'lightweight-charts'
import { getOHLCV, getFundamentals, getQuote } from '../lib/api'
import { Button, Input, Select, StatCard, Spinner, ErrorBox } from '../components/UI'

const PERIODS = [
  { label: '3M', value: 90 },
  { label: '6M', value: 180 },
  { label: '1Y', value: 365 },
  { label: '3Y', value: 1095 },
  { label: '5Y', value: 1825 },
]

const POPULAR = ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK',
  'SBIN', 'TITAN', 'BAJFINANCE', 'MARUTI', 'WIPRO']

function fmt(v, d = 2) { return v != null ? Number(v).toFixed(d) : '—' }

export default function Chart() {
  const [params] = useSearchParams()
  const [ticker, setTicker] = useState((params.get('ticker') || 'RELIANCE.NS').toUpperCase())
  const [input, setInput] = useState(ticker)
  const [days, setDays] = useState(365)
  const [ohlcv, setOhlcv] = useState(null)
  const [fund, setFund] = useState(null)
  const [quote, setQuote] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [overlay, setOverlay] = useState('sma')  // sma | bb | none

  const chartRef = useRef(null)
  const containerRef = useRef(null)
  const rsiRef = useRef(null)
  const rsiContainer = useRef(null)
  const macdRef = useRef(null)
  const macdContainer = useRef(null)
  const seriesRef = useRef({})

  // Load data
  async function load(t, d) {
    setLoading(true); setError(null)
    try {
      const [o, f, q] = await Promise.all([
        getOHLCV(t, d),
        getFundamentals(t).catch(() => ({})),
        getQuote(t).catch(() => ({})),
      ])
      setOhlcv(o); setFund(f); setQuote(q)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { load(ticker, days) }, [ticker, days])

  // Build charts
  useEffect(() => {
    if (!ohlcv?.records?.length || !containerRef.current) return

    // Destroy old charts
    chartRef.current?.remove()
    rsiRef.current?.remove()
    macdRef.current?.remove()

    const records = ohlcv.records

    const chartOpts = {
      layout: { background: { color: '#0d1117' }, textColor: '#7d8590' },
      grid: { vertLines: { color: '#21262d' }, horzLines: { color: '#21262d' } },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: '#21262d' },
      timeScale: { borderColor: '#21262d', timeVisible: true },
      handleScroll: true, handleScale: true,
    }

    // ── Main chart ──────────────────────────────────────────────────────
    const chart = createChart(containerRef.current, { ...chartOpts, height: 380 })
    chartRef.current = chart

    // Candles
    const candles = chart.addCandlestickSeries({
      upColor: '#3fb950', downColor: '#f85149',
      borderUpColor: '#3fb950', borderDownColor: '#f85149',
      wickUpColor: '#3fb950', wickDownColor: '#f85149',
    })
    candles.setData(records.map(r => ({
      time: r.date, open: r.Open, high: r.High, low: r.Low, close: r.Close
    })))
    seriesRef.current.candles = candles

    // Volume
    const vol = chart.addHistogramSeries({
      color: '#58a6ff', priceFormat: { type: 'volume' },
      priceScaleId: 'vol', scaleMargins: { top: 0.85, bottom: 0 },
    })
    vol.setData(records.map(r => ({
      time: r.date, value: r.Volume,
      color: r.Close >= r.Open ? '#3fb95040' : '#f8514940',
    })))

    // Overlay indicators
    if (overlay === 'sma' || overlay === 'both') {
      const sma50 = chart.addLineSeries({ color: '#58a6ff', lineWidth: 1.5, title: 'SMA50' })
      sma50.setData(records.filter(r => r.SMA_50 != null).map(r => ({ time: r.date, value: r.SMA_50 })))
      const sma200 = chart.addLineSeries({ color: '#f0b429', lineWidth: 1.5, title: 'SMA200' })
      sma200.setData(records.filter(r => r.SMA_200 != null).map(r => ({ time: r.date, value: r.SMA_200 })))
    }
    if (overlay === 'bb' || overlay === 'both') {
      const upper = chart.addLineSeries({ color: '#7d859055', lineWidth: 1, lineStyle: 2, title: 'BB+' })
      upper.setData(records.filter(r => r.BB_Upper != null).map(r => ({ time: r.date, value: r.BB_Upper })))
      const lower = chart.addLineSeries({ color: '#7d859055', lineWidth: 1, lineStyle: 2, title: 'BB-' })
      lower.setData(records.filter(r => r.BB_Lower != null).map(r => ({ time: r.date, value: r.BB_Lower })))
      const mid = chart.addLineSeries({ color: '#7d859077', lineWidth: 1, title: 'BB mid' })
      mid.setData(records.filter(r => r.BB_Middle != null).map(r => ({ time: r.date, value: r.BB_Middle })))
    }

    // ── RSI chart ───────────────────────────────────────────────────────
    const rsiChart = createChart(rsiContainer.current, { ...chartOpts, height: 120 })
    rsiRef.current = rsiChart
    rsiChart.timeScale().applyOptions({ visible: false })
    const rsiSeries = rsiChart.addLineSeries({ color: '#bc8cff', lineWidth: 1.5 })
    rsiSeries.setData(records.filter(r => r.RSI != null).map(r => ({ time: r.date, value: r.RSI })))
    rsiChart.addLineSeries({ color: '#f8514940', lineWidth: 1, lineStyle: 2 })
      .setData(records.map(r => ({ time: r.date, value: 70 })))
    rsiChart.addLineSeries({ color: '#3fb95040', lineWidth: 1, lineStyle: 2 })
      .setData(records.map(r => ({ time: r.date, value: 30 })))

    // ── MACD chart ──────────────────────────────────────────────────────
    const macdChart = createChart(macdContainer.current, { ...chartOpts, height: 100 })
    macdRef.current = macdChart
    const hist = macdChart.addHistogramSeries({ lineWidth: 0 })
    hist.setData(records.filter(r => r.MACD_Hist != null).map(r => ({
      time: r.date, value: r.MACD_Hist,
      color: r.MACD_Hist >= 0 ? '#3fb95088' : '#f8514988',
    })))
    const macdLine = macdChart.addLineSeries({ color: '#58a6ff', lineWidth: 1 })
    macdLine.setData(records.filter(r => r.MACD != null).map(r => ({ time: r.date, value: r.MACD })))
    const sig = macdChart.addLineSeries({ color: '#f0b429', lineWidth: 1 })
    sig.setData(records.filter(r => r.MACD_Signal != null).map(r => ({ time: r.date, value: r.MACD_Signal })))

    // Sync timescales
    function syncHandler(range) {
      if (range !== null) {
        rsiChart.timeScale().setVisibleLogicalRange(range)
        macdChart.timeScale().setVisibleLogicalRange(range)
      }
    }
    chart.timeScale().subscribeVisibleLogicalRangeChange(syncHandler)

    chart.timeScale().fitContent()
    rsiChart.timeScale().fitContent()
    macdChart.timeScale().fitContent()

    return () => {
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(syncHandler)
      chart.remove(); rsiChart.remove(); macdChart.remove()
    }
  }, [ohlcv, overlay])

  const last = ohlcv?.records?.at(-1)

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1300, margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 4 }}>
          Chart & Analysis
        </h1>
      </div>

      {/* Search bar */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <Input label="Ticker (Yahoo Finance format)"
            value={input} onChange={e => setInput(e.target.value.toUpperCase())}
            onKeyDown={e => { if (e.key === 'Enter') { setTicker(input.includes('.') ? input : input + '.NS') } }}
            placeholder="e.g. RELIANCE.NS \u00B7 TCS.NS \u00B7 INFY.NS" />
        </div>
        <Button onClick={() => { const t = input.includes('.') ? input : input + '.NS'; setTicker(t) }}>
          Load
        </Button>
        <Select label="Period" value={days} onChange={e => setDays(+e.target.value)}
          options={PERIODS.map(p => ({ label: p.label, value: p.value }))} />
        <Select label="Overlay" value={overlay} onChange={e => setOverlay(e.target.value)}
          options={[{ label: 'SMA 50/200', value: 'sma' }, { label: 'Bollinger Bands', value: 'bb' },
          { label: 'Both', value: 'both' }, { label: 'None', value: 'none' }]} />
      </div>

      {/* Quick-pick tickers */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
        {POPULAR.map(t => (
          <button key={t} onClick={() => { setInput(t + '.NS'); setTicker(t + '.NS') }} style={{
            padding: '3px 10px', borderRadius: 4, border: '1px solid var(--border2)',
            background: ticker === t + '.NS' ? 'var(--accent2)' : 'transparent',
            color: ticker === t + '.NS' ? 'var(--accent)' : 'var(--muted)',
            fontFamily: 'var(--font-mono)', fontSize: 11, cursor: 'pointer',
          }}>{t}</button>
        ))}
      </div>

      {error && <ErrorBox message={error} />}

      {loading && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: 40, justifyContent: 'center' }}>
          <Spinner size={24} /><span style={{ color: 'var(--muted)' }}>Loading {ticker}…</span>
        </div>
      )}

      {!loading && ohlcv && (
        <>
          {/* Stat strip */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            {[
              { label: 'Price', value: quote?.price ? `₹${Number(quote.price).toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : `₹${fmt(last?.Close)}`, trend: quote?.change_pct },
              { label: 'RSI 14', value: fmt(last?.RSI, 1), trend: 0 },
              { label: 'ATR %', value: fmt(last?.ATR_Pct) + '%' },
              { label: '52W High', value: fmt(last?.Pct_From_52W_High, 1) + '%', trend: last?.Pct_From_52W_High },
              { label: '1M Ret', value: fmt(last?.ROC_20d, 1) + '%', trend: last?.ROC_20d },
              { label: '3M Ret', value: fmt(last?.ROC_63d, 1) + '%', trend: last?.ROC_63d },
              { label: 'Rel Vol', value: fmt(last?.Rel_Volume) + 'x' },
              { label: 'P/E', value: fmt(fund?.pe_ratio, 1) },
              { label: 'Sector', value: fund?.sector || '—' },
            ].map((s, i) => (
              <StatCard key={i} label={s.label} value={s.value} trend={s.trend}
                style={{ flex: '1 1 100px', minWidth: 90, padding: '12px 14px' }} />
            ))}
          </div>

          {/* Chart panels */}
          <div style={{
            background: 'var(--bg2)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)', overflow: 'hidden'
          }}>
            <div style={{
              padding: '10px 16px', borderBottom: '1px solid var(--border)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <span style={{ fontWeight: 700, fontSize: 15 }}>
                {ticker.replace('.NS', '')} <span style={{ color: 'var(--muted)', fontWeight: 400, fontSize: 13 }}>{fund?.name}</span>
              </span>
              <div style={{ display: 'flex', gap: 16, fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}>
                <span><span style={{ color: '#3fb950' }}>●</span> Candle</span>
                <span><span style={{ color: '#58a6ff' }}>─</span> SMA50</span>
                <span><span style={{ color: '#f0b429' }}>─</span> SMA200</span>
              </div>
            </div>
            <div ref={containerRef} />
            <div style={{
              padding: '4px 16px', borderTop: '1px solid var(--border)',
              fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-mono)'
            }}>
              RSI (14)
            </div>
            <div ref={rsiContainer} />
            <div style={{
              padding: '4px 16px', borderTop: '1px solid var(--border)',
              fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-mono)'
            }}>
              MACD (12,26,9)
            </div>
            <div ref={macdContainer} />
          </div>
        </>
      )}
    </div>
  )
}
