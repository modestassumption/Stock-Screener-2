import { useApi } from '../hooks/useApi'
import { getMarketOverview, getTopMovers, getMarketNews, getTickers } from '../lib/api'
import { StatCard, SectionHeader, Spinner } from '../components/UI'
import { TrendingUp, TrendingDown } from 'lucide-react'

function fmt(v, decimals = 2) {
  if (v == null) return '—'
  return Number(v).toFixed(decimals)
}

function PctBadge({ v }) {
  if (v == null) return <span style={{ color: 'var(--muted)' }}>—</span>
  const pos = v >= 0
  const Icon = pos ? TrendingUp : TrendingDown
  return (
    <span style={{
      display: 'flex', alignItems: 'center', gap: 4,
      color: pos ? 'var(--green)' : 'var(--red)',
      fontFamily: 'var(--font-mono)', fontSize: 12,
    }}>
      <Icon size={12} strokeWidth={3} /> {fmt(Math.abs(v))}%
    </span>
  )
}

function IndexCard({ name, data }) {
  const pos = (data?.change_pct ?? 0) >= 0
  return (
    <div style={{
      background: 'var(--bg3)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)', padding: '16px 20px',
      borderTop: `2px solid ${pos ? 'var(--green)' : 'var(--red)'}`,
    }}>
      <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6,
        textTransform: 'uppercase', letterSpacing: '0.08em' }}>{name}</div>
      <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-mono)',
        color: 'var(--text)', marginBottom: 4 }}>
        {data?.price ? Number(data.price).toLocaleString('en-IN', { maximumFractionDigits: 0 }) : '—'}
      </div>
      <PctBadge v={data?.change_pct} />
    </div>
  )
}

function MoverRow({ m, isGainer }) {
  const Icon = isGainer ? TrendingUp : TrendingDown
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
      <div>
        <div style={{ fontWeight: 600, fontSize: 13 }}>
          {m.ticker.replace('.NS', '')}
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)' }}>
          ₹{fmt(m.price)}
        </div>
      </div>
      <span style={{
        display: 'flex', alignItems: 'center', gap: 4,
        fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600,
        color: isGainer ? 'var(--green)' : 'var(--red)',
      }}>
        <Icon size={14} strokeWidth={3} /> {fmt(Math.abs(m.change_pct))}%
      </span>
    </div>
  )
}

export default function Overview() {
  const { data: overview, loading: ol } = useApi(getMarketOverview)
  const { data: movers,   loading: ml } = useApi(getTopMovers)
  const { data: news,     loading: nl } = useApi(getMarketNews)
  const { data: univ } = useApi(() => getTickers("Nifty 50"))

  const indices = overview ? Object.entries(overview) : []

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 4 }}>
          Market Overview
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: 13 }}>
          NSE India · {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Index Cards */}
      <SectionHeader>Key Indices</SectionHeader>
      {ol ? (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 28 }}>
          <Spinner /><span style={{ color: 'var(--muted)' }}>Loading indices…</span>
        </div>
      ) : (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: 12, marginBottom: 32,
        }}>
          {indices.map(([name, data]) => (
            <IndexCard key={name} name={name} data={data} />
          ))}
        </div>
      )}

      {/* Movers + News row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.6fr', gap: 20 }}>
        {/* Gainers */}
        <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)', padding: '16px 18px' }}>
          <SectionHeader>Top Gainers</SectionHeader>
          {ml ? <Spinner /> : (movers?.gainers?.length
            ? movers.gainers.map((m, i) => <MoverRow key={i} m={m} isGainer />)
            : <p style={{ color: 'var(--muted)', fontSize: 13 }}>No data</p>
          )}
        </div>

        {/* Losers */}
        <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)', padding: '16px 18px' }}>
          <SectionHeader>Top Losers</SectionHeader>
          {ml ? <Spinner /> : (movers?.losers?.length
            ? movers.losers.map((m, i) => <MoverRow key={i} m={m} isGainer={false} />)
            : <p style={{ color: 'var(--muted)', fontSize: 13 }}>No data</p>
          )}
        </div>

        {/* News */}
        <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)', padding: '16px 18px', overflowY: 'auto', maxHeight: 380 }}>
          <SectionHeader>Market News</SectionHeader>
          {nl ? <Spinner /> : (
            !news?.has_key ? (
              <div style={{ color: 'var(--muted)', fontSize: 12, lineHeight: 1.7 }}>
                Add a <code style={{ color: 'var(--accent)' }}>FINNHUB_API_KEY</code> to{' '}
                <code style={{ color: 'var(--accent)' }}>.env</code> to enable live news.<br />
                Free key at <a href="https://finnhub.io" target="_blank" rel="noreferrer"
                  style={{ color: 'var(--blue)' }}>finnhub.io</a>
              </div>
            ) : news?.news?.length ? news.news.map((n, i) => (
              <a key={i} href={n.url} target="_blank" rel="noreferrer" style={{
                display: 'block', padding: '8px 0', borderBottom: '1px solid var(--border)',
                textDecoration: 'none',
              }}>
                <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.4,
                  marginBottom: 3 }}>{n.headline}</div>
                <div style={{ fontSize: 10, color: 'var(--muted)' }}>{n.source}</div>
              </a>
            )) : <p style={{ color: 'var(--muted)', fontSize: 13 }}>No news available.</p>
          )}
        </div>
      </div>

      {/* Universe List */}
      <div style={{ marginTop: 20, background: 'var(--bg3)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', padding: '16px 18px' }}>
        <SectionHeader>Universe: Nifty 50 ({univ?.tickers?.length || 0} stocks)</SectionHeader>
        {!univ ? <Spinner /> : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px 16px', maxHeight: 300, overflowY: 'auto' }}>
            {univ.tickers?.map(t => (
              <div key={t.ticker} style={{ fontSize: 13, display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 4 }}>
                <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{t.ticker.replace('.NS', '')}</span>
                <span style={{ color: 'var(--muted)', fontSize: 11, textAlign: 'right', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '60%' }}>{t.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
