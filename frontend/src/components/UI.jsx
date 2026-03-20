import { useState } from 'react'
import { XCircle, Loader2 } from 'lucide-react'

// ── Spinner ───────────────────────────────────────────────────────────────────
export function Spinner({ size = 20 }) {
  return <Loader2 size={size} className="animate-spin" style={{ color: 'var(--accent)' }} />
}

// ── Badge ─────────────────────────────────────────────────────────────────────
export function Badge({ children, variant = 'default' }) {
  const colors = {
    default: 'background:var(--bg3);color:var(--muted)',
    green:   'background:var(--green2);color:var(--green)',
    red:     'background:var(--red2);color:var(--red)',
    yellow:  'background:var(--accent2);color:var(--accent)',
    blue:    'background:var(--blue2);color:var(--blue)',
  }
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: '4px',
      fontSize: '11px', fontFamily: 'var(--font-mono)', fontWeight: 500,
      ...Object.fromEntries(colors[variant].split(';').map(s => s.split(':')))
    }}>
      {children}
    </span>
  )
}

// ── StatCard ──────────────────────────────────────────────────────────────────
export function StatCard({ label, value, sub, trend, style = {} }) {
  const trendColor = trend > 0 ? 'var(--green)' : trend < 0 ? 'var(--red)' : 'var(--muted)'
  return (
    <div style={{
      background: 'var(--bg3)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)', padding: '16px 20px', ...style
    }}>
      <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase',
        letterSpacing: '0.1em', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-mono)',
        color: trend !== undefined ? trendColor : 'var(--text)' }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

// ── SectionHeader ─────────────────────────────────────────────────────────────
export function SectionHeader({ children, action }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      borderBottom: '1px solid var(--border)', paddingBottom: 10, marginBottom: 16 }}>
      <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--accent)',
        textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 500 }}>
        {children}
      </span>
      {action}
    </div>
  )
}

// ── Button ────────────────────────────────────────────────────────────────────
export function Button({ children, onClick, variant = 'primary', disabled, loading, style = {} }) {
  const base = {
    padding: '8px 16px', borderRadius: 'var(--radius)', border: 'none',
    fontFamily: 'var(--font-ui)', fontWeight: 600, fontSize: 13,
    display: 'inline-flex', alignItems: 'center', gap: 6, justifyContent: 'center',
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    opacity: disabled || loading ? 0.6 : 1, transition: 'all 0.15s', ...style,
  }
  const variants = {
    primary:  { background: 'var(--accent)', color: '#000' },
    ghost:    { background: 'transparent', color: 'var(--text)', border: '1px solid var(--border2)' },
    danger:   { background: 'var(--red2)', color: 'var(--red)', border: '1px solid var(--red)' },
  }
  return (
    <button onClick={onClick} disabled={disabled || loading}
      style={{ ...base, ...variants[variant] }}>
      {loading && <Loader2 size={14} className="animate-spin" />}
      {children}
    </button>
  )
}

// ── Input ─────────────────────────────────────────────────────────────────────
export function Input({ label, ...props }) {
  return (
    <div>
      {label && <label style={{ display: 'block', fontSize: 11, color: 'var(--muted)',
        marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</label>}
      <input {...props} style={{
        width: '100%', background: 'var(--bg)', border: '1px solid var(--border2)',
        borderRadius: 'var(--radius)', padding: '7px 10px', color: 'var(--text)',
        fontFamily: 'var(--font-mono)', fontSize: 13, outline: 'none',
        transition: 'border-color 0.15s',
        ...(props.style || {}),
      }}
        onFocus={e => e.target.style.borderColor = 'var(--accent)'}
        onBlur={e => e.target.style.borderColor = 'var(--border2)'}
      />
    </div>
  )
}

// ── Select ────────────────────────────────────────────────────────────────────
export function Select({ label, options, ...props }) {
  return (
    <div>
      {label && <label style={{ display: 'block', fontSize: 11, color: 'var(--muted)',
        marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</label>}
      <select {...props} style={{
        width: '100%', background: 'var(--bg)', border: '1px solid var(--border2)',
        borderRadius: 'var(--radius)', padding: '7px 10px', color: 'var(--text)',
        fontFamily: 'var(--font-mono)', fontSize: 13, outline: 'none', cursor: 'pointer',
      }}>
        {options.map(o => (
          <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>
        ))}
      </select>
    </div>
  )
}

// ── Toggle ────────────────────────────────────────────────────────────────────
export function Toggle({ label, checked, onChange }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
      <div onClick={() => onChange(!checked)} style={{
        width: 36, height: 20, borderRadius: 10, position: 'relative',
        background: checked ? 'var(--accent)' : 'var(--border2)', transition: 'background 0.2s',
      }}>
        <div style={{
          position: 'absolute', top: 3, left: checked ? 19 : 3, width: 14, height: 14,
          borderRadius: '50%', background: checked ? '#000' : 'var(--muted)', transition: 'left 0.2s',
        }} />
      </div>
      <span style={{ fontSize: 13, color: 'var(--muted)' }}>{label}</span>
    </label>
  )
}

// ── DataTable ─────────────────────────────────────────────────────────────────
export function DataTable({ columns, rows, onRowClick }) {
  const [sort, setSort] = useState({ col: null, dir: 1 })

  const sorted = sort.col
    ? [...rows].sort((a, b) => {
        const av = a[sort.col], bv = b[sort.col]
        if (av == null) return 1
        if (bv == null) return -1
        return (av < bv ? -1 : av > bv ? 1 : 0) * sort.dir
      })
    : rows

  const toggleSort = col => setSort(s =>
    s.col === col ? { col, dir: s.dir * -1 } : { col, dir: -1 }
  )

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border2)' }}>
            {columns.map(c => (
              <th key={c.key} onClick={() => c.sortable !== false && toggleSort(c.key)}
                style={{
                  padding: '8px 12px', textAlign: c.align || 'right',
                  fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)',
                  textTransform: 'uppercase', letterSpacing: '0.1em', whiteSpace: 'nowrap',
                  cursor: c.sortable !== false ? 'pointer' : 'default',
                  userSelect: 'none',
                  color: sort.col === c.key ? 'var(--accent)' : 'var(--muted)',
                }}>
                {c.label}{sort.col === c.key ? (sort.dir === -1 ? ' \u2193' : ' \u2191') : ''}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => (
            <tr key={i} onClick={() => onRowClick?.(row)}
              style={{
                borderBottom: '1px solid var(--border)',
                cursor: onRowClick ? 'pointer' : 'default',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {columns.map(c => (
                <td key={c.key} style={{
                  padding: '9px 12px', textAlign: c.align || 'right',
                  fontFamily: c.mono !== false ? 'var(--font-mono)' : 'var(--font-ui)',
                  color: c.render ? 'inherit' : 'var(--text)',
                  whiteSpace: 'nowrap',
                }}>
                  {c.render ? c.render(row[c.key], row) : row[c.key] ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── ErrorBox ──────────────────────────────────────────────────────────────────
export function ErrorBox({ message }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      background: 'var(--red2)', border: '1px solid var(--red)',
      borderRadius: 'var(--radius)', padding: '12px 16px',
      color: 'var(--red)', fontFamily: 'var(--font-mono)', fontSize: 13,
    }}>
      <XCircle size={16} /> {message}
    </div>
  )
}

// ── EmptyState ────────────────────────────────────────────────────────────────
export function EmptyState({ icon: Icon, title, sub }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', textAlign: 'center' }}>
      <div style={{ marginBottom: 16, color: 'var(--muted)', opacity: 0.5 }}>
        {Icon && <Icon size={48} strokeWidth={1.5} />}
      </div>
      <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 6 }}>{title}</div>
      {sub && <div style={{ color: 'var(--muted)', fontSize: 13 }}>{sub}</div>}
    </div>
  )
}

// ── RangeSlider ───────────────────────────────────────────────────────────────
export function RangeSlider({ label, min, max, value, onChange, step = 1 }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase',
          letterSpacing: '0.08em' }}>{label}</span>
        <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>
          {value}
        </span>
      </div>
      <input type="range" min={min} max={max} value={value} step={step}
        onChange={e => onChange(+e.target.value)}
        style={{ width: '100%', accentColor: 'var(--accent)', cursor: 'pointer' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
        <span style={{ fontSize: 10, color: 'var(--border2)', fontFamily: 'var(--font-mono)' }}>{min}</span>
        <span style={{ fontSize: 10, color: 'var(--border2)', fontFamily: 'var(--font-mono)' }}>{max}</span>
      </div>
    </div>
  )
}
