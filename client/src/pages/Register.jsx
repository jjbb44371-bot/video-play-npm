import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext.jsx'
import { useToast } from '../ToastContext.jsx'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const { toast } = useToast()
  const [error, setError] = useState('')

  async function onSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await register({ username, email, password })
      toast({ title: 'Thành công', description: 'Đăng ký thành công', variant: 'success' })
      navigate('/', { replace: true })
    } catch (err) {
      toast({ title: 'Lỗi', description: err.message, variant: 'error' })
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <ToastProvider>
      <div className="min-h-screen bg-gray-950 dark:bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-surface rounded-2xl p-8 shadow-2xl border border-border max-md:p-6">
          <h1 className="text-2xl font-bold text-white mb-6 text-center">Đăng ký</h1>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-white/60 text-sm mb-2">Tên đăng nhập</label>
              <input
                type="text"
                value={username}
                autoComplete="username"
                onChange={(e) => setUsername(e.target.value)}
                disabled={busy}
                required
                className="w-full bg-surface/50 border border-rounded px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-accent/30 disabled:bg-surface/30 disabled:text-white/30"
              />
            </div>
            <div>
              <label className="block text-white/60 text-sm mb-2">Email</label>
              <input
                type="email"
                value={email}
                autoComplete="email"
                onChange={(e) => setEmail(e.target.value)}
                disabled={busy}
                className="w-full bg-surface/50 border border-rounded px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-accent/30 disabled:bg-surface/30 disabled:text-white/30"
              />
            </div>
            <div>
              <label className="block text-white/60 text-sm mb-2">Mật khẩu</label>
              <input
                type="password"
                value={password}
                autoComplete="new-password"
                onChange={(e) => setPassword(e.target.value)}
                disabled={busy}
                required
                className="w-full bg-surface/50 border border-rounded px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-accent/30 disabled:bg-surface/30 disabled:text-white/30"
              />
            </div>
            {error && <p className="text-error text-sm">{error}</p>}

            <button
              type="submit"
              className="btn primary w-full"
              disabled={busy}
            >
              {busy ? 'Đang đăng ký…' : 'Đăng ký'}
            </button>
          </form>

          <p className="mt-4 text-white/60 text-center">
            Đã có tài khoản? <Link to="/login" className="font-medium underline underline-offset-2">Đăng nhập</Link>
          </p>
        </div>
      </div>
    </ToastProvider>
  )
}
