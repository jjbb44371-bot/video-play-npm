import { Link, NavLink, Route, Routes } from 'react-router-dom'
import Home from './pages/Home.jsx'
import Watch from './pages/Watch.jsx'
import Upload from './pages/Upload.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import { useAuth } from './AuthContext.jsx'

function AccountNav() {
  const { user, status, logout } = useAuth()

  if (status === 'loading') return null

  if (!user) {
    return (
      <>
        <NavLink to="/login">Đăng nhập</NavLink>
        <NavLink to="/register">Đăng ký</NavLink>
      </>
    )
  }

  return (
    <span className="account">
      <span className="account-name">@{user.username}</span>
      <button type="button" className="btn small" onClick={() => logout()}>
        Đăng xuất
      </button>
    </span>
  )
}

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
          <AccountNav />
        </nav>
      </header>

      <main className="content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/watch/:id" element={<Watch />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Routes>
      </main>

      <footer className="footer">
        video-play-npm · server-authoritative · Fastify + React
      </footer>
    </div>
  )
}
