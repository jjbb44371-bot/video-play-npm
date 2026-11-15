import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { uploadVideo } from '../api.js'
import { formatBytes } from '../utils.js'
import { useAuth } from '../AuthContext.jsx'
import { useToast } from '../ToastContext.jsx'

export default function Upload() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, status } = useAuth()
  const { toast } = useToast()
  const [file, setFile] = useState(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [progress, setProgress] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (status === 'ready' && !user) {
      navigate('/login', { replace: true, state: { from: location.pathname } })
    }
  }, [status, user, navigate, location.pathname])

  if (status === 'loading') {
    return (
      <ToastProvider>
        <div className="min-h-screen flex flex-col items-center justify-center p-8">
          <span className="animate-pulse bg-surface/50 rounded-xl w-32 h-32 mb-4 text-center text-muted">
            ▶
          </span>
          <p className="text-muted">Đang kiểm tra đăng nhập…</p>
        </div>
      </ToastProvider>
    )
  }
  if (!user) return null

  function onFileChange(e) {
    const selected = e.target.files?.[0] || null
    setFile(selected)
    if (selected && !title) {
      setTitle(selected.name.replace(/\.[^.]+$/, ''))
    }
  }

  async function onSubmit(e) {
    e.preventDefault()
    if (!file) {
      toast({ title: 'Lỗi', description: 'Vui lòng chọn một file video', variant: 'error' })
      return
    }
    setBusy(true)
    setError('')
    setProgress(0)
    try {
      const created = await uploadVideo({ file, title, description }, setProgress)
      if (created?.id) {
        toast({ title: 'Thành công', description: 'Video đã được tải lên', variant: 'success' })
        navigate(`/watch/${created.id}`)
      } else {
        navigate('/')
      }
    } catch (err) {
      toast({ title: 'Lỗi', description: err.message, variant: 'error' })
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <ToastProvider>
      <div className="max-w-2xl mx-auto p-4">
        <h1 className="text-2xl font-bold text-white mb-6">Tải video lên</h1>

        <form onSubmit={onSubmit} className="bg-surface border rounded-lg p-6 border-border shadow-sm">
          <div className="mb-4">
            <label className="block text-white/60 text-sm mb-2">File video</label>
            <input
              ref={inputRef}
              type="file"
              accept="video/*"
              onChange={onFileChange}
              className="w-full bg-surface/50 border border-rounded px-3 py-2 text-white file-input"
              disabled={busy}
            />
          </div>

          {file && (
            <p className="text-white/60 text-sm mb-3">
              {file.name} · {formatBytes(file.size)}
            </p>
          )}

          <div className="mb-4">
            <label className="block text-white/60 text-sm mb-2">Tiêu đề</label>
            <input
              type="text"
              value={title}
              maxLength={200}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Tiêu đề video"
              disabled={busy}
              className="w-full bg-surface/50 border border-rounded px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-accent/30 disabled:bg-surface/30 disabled:text-white/30"
            />
          </div>

          <div className="mb-4">
            <label className="block text-white/60 text-sm mb-2">Mô tả</label>
            <textarea
              value={description}
              maxLength={5000}
              rows={3}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả (không bắt buộc)"
              disabled={busy}
              className="w-full bg-surface/50 border border-rounded px-3 py-2 text-white resize-none placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-accent/30 disabled:bg-surface/30 disabled:text-white/30"
            />
          </div>

          {busy && (
            <div className="mb-4">
              <div className="progress progress-sm">
                <div
                  className="progress-bar"
                  style={{ width: `${progress}%` }}
                />
                <span className="text-white/60 text-xs">{progress}%</span>
              </div>
            </div>
          )}

          {error && <p className="text-error text-sm mb-4">{error}</p>}

          <button
            className="btn primary w-full"
            type="submit"
            disabled={busy || !file}
          >
            {busy ? 'Đang tải lên…' : 'Tải lên'}
          </button>
        </form>
      </div>
    </ToastProvider>
  )
}
