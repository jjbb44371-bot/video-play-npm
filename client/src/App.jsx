import { Link, NavLink, Route, Routes } from 'react-router-dom'
import Home from './pages/Home.jsx'
import Watch from './pages/Watch.jsx'
import Upload from './pages/Upload.jsx'

export default function App() {
  return (
    <div className="app">
      <header className="topbar">
        <Link to="/" className="brand">
          <span className="brand-mark">▶</span>
          <span>VideoPlay</span>
        </Link>
        <nav className="nav">
          <NavLink to="/" end>
            Trang chủ
          </NavLink>
          <NavLink to="/upload">Tải lên</NavLink>
        </nav>
      </header>

      <main className="content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/watch/:id" element={<Watch />} />
          <Route path="/upload" element={<Upload />} />
        </Routes>
      </main>

      <footer className="footer">
        video-play-npm · server-authoritative · Fastify + React
      </footer>
    </div>
  )
}
