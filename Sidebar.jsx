import { NavLink } from 'react-router-dom'

const NAV = [
  { to: '/',          icon: '◈', label: 'Overview' },
  { to: '/screener',  icon: '⊞', label: 'Screener' },
  { to: '/chart',     icon: '◻', label: 'Chart' },
  { to: '/backtest',  icon: '⟲', label: 'Backtest' },
]

export default function Sidebar() {
  return (
    <aside style={{
      width: 220, minHeight: '100vh', background: 'var(--bg2)',
      borderRight: '1px solid var(--border)', display: 'flex',
      flexDirection: 'column', flexShrink: 0, position: 'sticky', top: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontFamily: 'var(--font-ui)', fontWeight: 800, fontSize: 18,
          letterSpacing: '-0.02em', color: 'var(--text)' }}>
          <span style={{ color: 'var(--accent)' }}>NSE</span> Screener
        </div>
        <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-mono)',
          marginTop: 2, letterSpacing: '0.1em' }}>
          INDIA EQUITY PLATFORM
        </div>
      </div>

      {/* Nav links */}
      <nav style={{ padding: '12px 10px', flex: 1 }}>
        {NAV.map(({ to, icon, label }) => (
          <NavLink key={to} to={to} end={to === '/'} style={({ isActive }) => ({
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '9px 10px', borderRadius: 'var(--radius)',
            marginBottom: 2, transition: 'all 0.15s',
            background: isActive ? 'var(--accent2)' : 'transparent',
            color: isActive ? 'var(--accent)' : 'var(--muted)',
            fontWeight: isActive ? 600 : 400,
            fontSize: 13,
            borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
          })}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 15 }}>{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)' }}>
        <div style={{ fontSize: 10, color: 'var(--border2)', fontFamily: 'var(--font-mono)',
          lineHeight: 1.8 }}>
          Data: Yahoo Finance<br />
          Real-time: Finnhub (opt.)<br />
          <span style={{ color: 'var(--green)', fontSize: 10 }}>● API connected</span>
        </div>
      </div>
    </aside>
  )
}
