import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { deleteVideo, getVideo, registerView } from '../api.js'
import { formatBytes, formatViews, timeAgo } from '../utils.js'

export default function Watch() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [video, setVideo] = useState(null)
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const viewSent = useRef(false)

  useEffect(() => {
    let active = true
    setStatus('loading')
    viewSent.current = false
    getVideo(id)
      .then((data) => {
        if (!active) return
        setVideo(data)
        setStatus('ready')
      })
      .catch((err) => {
        if (!active) return
        setError(err.message)
        setStatus('error')
      })
    return () => {
      active = false
    }
  }, [id])

  const handlePlay = useCallback(() => {
    if (viewSent.current) return
    viewSent.current = true
    registerView(id)
      .then((updated) => {
        if (updated) setVideo(updated)
      })
      .catch(() => {})
  }, [id])

  const handleDelete = useCallback(async () => {
    if (!window.confirm('Xoá video này? Hành động không thể hoàn tác.')) return
    try {
      await deleteVideo(id)
      navigate('/')
    } catch (err) {
      alert(err.message)
    }
  }, [id, navigate])

  if (status === 'loading') return (
    <div className="min-h-screen flex items-center justify-center">
      <span className="animate-pulse bg-surface/50 rounded-xl w-64 h-32 mx-auto text-center text-muted">
        ▶
      </span>
    </div>
  )

  if (status === 'error') return (
    <div className="min-h-screen flex flex-col items-center justify-center text-error">
      <p>Lỗi: {error}</p>
      <Link to="/" className="btn secondary mt-4">Trở về chủ</Link>
    </div>
  )

  if (!video) return null

  return (
    <div className="min-h-screen bg-gray-950 dark:bg-gray-50">
      <div className="max-w-7xl mx-auto">
        {/* Video Player Section */}
        <div className="relative aspect-[16/9] w-full bg-black rounded-lg overflow-hidden mb-6 shadow-lg">
          <video
            className="object-cover w-full h-full"
            src={video.streamUrl}
            playsInline
            muted
            preload="metadata"
            onPlay={handlePlay}
          />
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="text-4xl text-white font-bold">▶</span>
          </div>
        </div>

        {/* Video Info & Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h1 className="text-3xl font-bold text-white line-clamp-2 mb-3">{video.title}</h1>
            <div className="watch-meta mb-4 text-sm text-muted">
              <span>{formatViews(video.views)} xem</span>
              <span>·</span>
              <span>{timeAgo(video.createdAt)}</span>
              <span>·</span>
              <span>{formatBytes(video.size)}</span>
            </div>
            {video.description && (
              <p className="text-white/80 mb-4 line-clamp-3">{video.description}</p>
            )}
            <div className="watch-actions">
              <Link to="/" className="btn secondary w-full mb-2">
                ← Về trang chủ
              </Link>
              <button
                className="btn danger w-full"
                onClick={handleDelete}
              >
                Xoá video
              </button>
            </div>
          </div>

          {/* Sidebar: Related/Details */}
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-white border-b border-border pb-2">Thông tin video</h2>
              <p className="text-white/80 text-sm">{video.description || 'Không có mô tả'}</p>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white border-b border-border pb-2">Chi tiết</h2>
              <dl className="grid grid-cols-2 gap-2 text-white/80 text-sm">
                <dt>Định dạng</dt>
                <dd>{video.format || 'Unknown'}</dd>
                <dt>Kích thước</dt>
                <dd>{formatBytes(video.size)}</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
