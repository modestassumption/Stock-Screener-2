import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { runScreener, getTickers } from '../lib/api'
import { useManualApi, useApi } from '../hooks/useApi'
import {
  Button, Input, Select, Toggle, RangeSlider,
  DataTable, SectionHeader, Badge, Spinner, ErrorBox, EmptyState,
} from '../components/UI'
import { Search, Play, XOctagon } from 'lucide-react'

const INDICES = ['Nifty 50', 'Nifty Next 50', 'Nifty Midcap 100']

const PRESETS = {
  custom:     null,
  minervini:  { rsi_min: 50, rsi_max: 100, above_sma200: true, above_sma50: true, min_rs: 70 },
  momentum:   { rsi_min: 55, rsi_max: 80,  above_sma200: true, above_sma50: true, min_rs: 80, min_volume: 500000 },
  value:      { rsi_min: 30, rsi_max: 60,  above_sma200: true, above_sma50: false, min_rs: 40 },
}

function rsBadge(v) {
  if (v == null) return '—'
  const n = Number(v).toFixed(1)
  const color = v >= 80 ? 'green' : v >= 60 ? 'yellow' : 'red'
  return <Badge variant={color}>{n}</Badge>
}

function pctCell(v) {
  if (v == null) return <span style={{ color: 'var(--muted)' }}>—</span>
  const num = Number(v)
  return (
    <span style={{ color: num >= 0 ? 'var(--green)' : 'var(--red)',
      fontFamily: 'var(--font-mono)', fontSize: 12 }}>
      {num >= 0 ? '+' : ''}{num.toFixed(1)}%
    </span>
  )
}

const COLUMNS = [
  { key: 'Ticker',    label: 'Ticker',   align: 'left',  mono: false,
    render: (v) => <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{v?.replace('.NS','')}</span> },
  { key: 'Name',      label: 'Name',     align: 'left',  mono: false,
    render: (v) => <span style={{ color: 'var(--muted)', fontSize: 12 }}>{v || '—'}</span> },
  { key: 'Sector',    label: 'Sector',   align: 'left',  mono: false,
    render: (v) => <Badge>{v || '—'}</Badge> },
  { key: 'Price',     label: 'Price ₹',
    render: (v) => v != null ? `₹${Number(v).toLocaleString('en-IN')}` : '—' },
  { key: 'RS_Rating', label: 'RS',       render: rsBadge },
  { key: 'RSI',       label: 'RSI',
    render: (v) => {
      if (v == null) return '—'
      const n = Number(v).toFixed(1)
      const color = v > 70 ? 'var(--red)' : v < 30 ? 'var(--green)' : 'var(--text)'
      return <span style={{ color, fontFamily: 'var(--font-mono)', fontSize: 12 }}>{n}</span>
    }},
  { key: 'ROC_1m%',  label: '1M',   render: pctCell },
  { key: 'ROC_3m%',  label: '3M',   render: pctCell },
  { key: 'ROC_1y%',  label: '1Y',   render: pctCell },
  { key: 'PE',        label: 'P/E',
    render: (v) => v != null ? Number(v).toFixed(1) : '—' },
  { key: 'Market_Cap', label: 'Mkt Cap',
    render: (v) => v != null ? `₹${(v / 1e11).toFixed(1)}L Cr` : '—' },
  { key: 'GoldenCross', label: 'Golden Cross',
    render: (v) => v ? <Badge variant="green">YES</Badge> : <Badge>—</Badge> },
]

export default function Screener() {
  const navigate = useNavigate()
  const [preset, setPreset]         = useState('custom')
  const [index, setIndex]           = useState('Nifty 50')
  const [minPrice, setMinPrice]     = useState(50)
  const [maxPrice, setMaxPrice]     = useState(100000)
  const [rsiMin, setRsiMin]         = useState(40)
  const [rsiMax, setRsiMax]         = useState(75)
  const [above200, setAbove200]     = useState(true)
  const [above50, setAbove50]       = useState(true)
  const [minRs, setMinRs]           = useState(60)
  const [minVol, setMinVol]         = useState(100000)
  const [showTickers, setShowTickers] = useState(false)
  const { data, loading, error, execute } = useManualApi()
  const { data: tickersData, loading: tickersLoading, execute: execTickers } = useManualApi()

  function handleViewTickers() {
    if (!showTickers) {
      execTickers(() => getTickers(index))
    }
    setShowTickers(!showTickers)
  }

  function applyPreset(p) {
    setPreset(p)
    const vals = PRESETS[p]
    if (!vals) return
    if (vals.rsi_min   != null) setRsiMin(vals.rsi_min)
    if (vals.rsi_max   != null) setRsiMax(vals.rsi_max)
    if (vals.above_sma200 != null) setAbove200(vals.above_sma200)
    if (vals.above_sma50  != null) setAbove50(vals.above_sma50)
    if (vals.min_rs    != null) setMinRs(vals.min_rs)
    if (vals.min_volume != null) setMinVol(vals.min_volume)
  }

  function handleRun() {
    execute(() => runScreener({
      index, min_price: minPrice, max_price: maxPrice,
      rsi_min: rsiMin, rsi_max: rsiMax,
      above_sma200: above200, above_sma50: above50,
      min_rs: minRs, min_volume: minVol,
    }))
  }

  const results = data?.results || []

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 4 }}>
          Stock Screener
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: 13 }}>
          NSE & BSE · Technical + Fundamental · Relative Strength Ranked
        </p>
      </div>

      {/* Controls panel */}
      <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', padding: '20px 24px', marginBottom: 24 }}>

        {/* Preset strip */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {Object.keys(PRESETS).map(p => (
            <button key={p} onClick={() => applyPreset(p)} style={{
              padding: '5px 14px', borderRadius: 'var(--radius)', border: '1px solid',
              borderColor: preset === p ? 'var(--accent)' : 'var(--border2)',
              background: preset === p ? 'var(--accent2)' : 'transparent',
              color: preset === p ? 'var(--accent)' : 'var(--muted)',
              fontFamily: 'var(--font-ui)', fontWeight: preset === p ? 600 : 400,
              fontSize: 12, cursor: 'pointer', textTransform: 'capitalize',
            }}>
              {p === 'custom' ? 'Custom' : p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <Select label="Index" value={index} onChange={e => {setIndex(e.target.value); setShowTickers(false)}}
                options={INDICES} />
            </div>
            <Button onClick={handleViewTickers} variant="ghost" style={{ padding: '7px 10px', height: 35 }}>
              {showTickers ? 'Hide' : 'List'}
            </Button>
          </div>
          <Input label="Min Price ₹" type="number" value={minPrice}
            onChange={e => { setMinPrice(+e.target.value); setPreset('custom'); }} />
          <Input label="Max Price ₹" type="number" value={maxPrice}
            onChange={e => { setMaxPrice(+e.target.value); setPreset('custom'); }} />
          <Input label="Min Volume" type="number" value={minVol}
            onChange={e => { setMinVol(+e.target.value); setPreset('custom'); }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: 16, marginTop: 16 }}>
          <RangeSlider label="RSI Min" min={0} max={100} value={rsiMin} onChange={v => { setRsiMin(v); setPreset('custom'); }} />
          <RangeSlider label="RSI Max" min={0} max={100} value={rsiMax} onChange={v => { setRsiMax(v); setPreset('custom'); }} />
          <RangeSlider label="Min RS Rating" min={0} max={100} value={minRs} onChange={v => { setMinRs(v); setPreset('custom'); }} />
        </div>

        <div style={{ display: 'flex', gap: 24, marginTop: 16, alignItems: 'center',
          flexWrap: 'wrap', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 24 }}>
            <Toggle label="Above SMA 200" checked={above200} onChange={v => { setAbove200(v); setPreset('custom'); }} />
            <Toggle label="Above SMA 50"  checked={above50}  onChange={v => { setAbove50(v); setPreset('custom'); }} />
          </div>
          <Button onClick={handleRun} loading={loading} style={{ minWidth: 150 }}>
            <Play size={14} fill="currentColor" /> Run Screener
          </Button>
        </div>
      </div>

      {showTickers && (
        <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px 24px', marginBottom: 24 }}>
          <SectionHeader>Universe: {index} ({tickersData?.tickers?.length || 0} stocks)</SectionHeader>
          {tickersLoading ? <Spinner /> : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px 16px', maxHeight: 400, overflowY: 'auto' }}>
              {tickersData?.tickers?.map(t => (
                <div key={t.ticker} style={{ fontSize: 13, display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 4 }}>
                  <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{t.ticker.replace('.NS', '')}</span>
                  <span style={{ color: 'var(--muted)', fontSize: 11, textAlign: 'right', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '60%' }}>{t.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {error && <ErrorBox message={error} />}

      {loading && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: 24,
          color: 'var(--muted)' }}>
          <Spinner /><span>Screening {index}…</span>
        </div>
      )}

      {!loading && data && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: 12 }}>
            <SectionHeader>
              Results — {results.length} stocks passed
            </SectionHeader>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)' }}>
              Ranked by RS Rating \u2193
            </span>
          </div>

          {results.length === 0
            ? <EmptyState icon={XOctagon} title="No stocks matched" sub="Try relaxing your filters." />
            : (
              <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                <DataTable
                  columns={COLUMNS}
                  rows={results}
                  onRowClick={row => navigate(`/chart?ticker=${row.Ticker}`)}
                />
              </div>
            )
          }
        </>
      )}

      {!loading && !data && (
        <EmptyState icon={Search} title="Run the screener"
          sub="Configure filters above and click Run Screener." />
      )}
    </div>
  )
}
