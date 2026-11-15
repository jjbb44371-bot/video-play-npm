import { useState } from 'react'
import { Link, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { ToastProvider } from './ToastContext.jsx'
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

// Theme toggle hook
function useTheme() {
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem('theme') === 'dark' || 
           (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)
  })

  const toggleTheme = () => {
    setIsDark((prev) => {
      const newTheme = !prev
      localStorage.setItem('theme', newTheme ? 'dark' : 'light')
      return newTheme
    })
  }

  return { isDark, toggleTheme }
}

export default function App() {
  const { isDark, toggleTheme } = useTheme()
  useLocation() // trigger re-render on nav

  return (
    <ToastProvider>
      <html className={isDark ? 'dark' : ''}>
        <div className="app">
          {/* Toast container */}
          <div className="fixed top-4 left-1/2 -translate-x-1/2 space-y-2 z-50">
            {/* toasts will be rendered by ToastProvider consumer */}
          </div>

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
<button
              type="button"
              className="btn small ml-auto theme-toggle"
              onClick={toggleTheme}
              aria-label={isDark ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
            >
              <span className="sr-only">{isDark ? 'Sáng' : 'Tối'}</span>
              <i className={isDark ? 'sun' : 'moon'} />
            </button>
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
      </html>
    </ToastProvider>
  )
}
