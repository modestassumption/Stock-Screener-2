import { Routes, Route } from 'react-router-dom'
import Sidebar  from './components/Sidebar'
import Overview from './pages/Overview'
import Screener from './pages/Screener'
import Chart    from './pages/Chart'
import Backtest from './pages/Backtest'

export default function App() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{ flex: 1, overflowY: 'auto', background: 'var(--bg)' }}>
        <Routes>
          <Route path="/"          element={<Overview />} />
          <Route path="/screener"  element={<Screener />} />
          <Route path="/chart"     element={<Chart />} />
          <Route path="/backtest"  element={<Backtest />} />
        </Routes>
      </main>
    </div>
  )
}
