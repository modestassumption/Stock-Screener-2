const BASE = '/api'

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

// ── Screener ──────────────────────────────────────────────────────────────────
export function runScreener(params) {
  const q = new URLSearchParams(params).toString()
  return request(`/screener/run?${q}`)
}
export function getPresets()  { return request('/screener/presets') }
export function getTickers(index) { return request(`/screener/tickers?index=${encodeURIComponent(index)}`) }

// ── Chart ─────────────────────────────────────────────────────────────────────
export function getOHLCV(ticker, days = 365) {
  return request(`/chart/ohlcv/${ticker}?days=${days}`)
}
export function getFundamentals(ticker) { return request(`/chart/fundamentals/${ticker}`) }
export function getQuote(ticker)        { return request(`/chart/quote/${ticker}`) }

// ── Backtest ──────────────────────────────────────────────────────────────────
export function runBacktest(body) {
  return request('/backtest/run', { method: 'POST', body: JSON.stringify(body) })
}
export function getStrategies() { return request('/backtest/strategies') }

// ── Market ────────────────────────────────────────────────────────────────────
export function getMarketOverview() { return request('/market/overview') }
export function getTopMovers()      { return request('/market/top-movers') }
export function getMarketNews()     { return request('/market/news') }
export function getHealth()         { return request('/health') }
