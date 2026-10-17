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

  if (status === 'loading') return <p className="state">Đang tải video…</p>
  if (status === 'error') return <p className="state error">{error}</p>
  if (!video) return null

  return (
    <div className="watch">
      <div className="player-wrap">
        <video
          className="player"
          src={video.streamUrl}
          controls
          playsInline
          preload="metadata"
          onPlay={handlePlay}
        />
      </div>

      <div className="watch-info">
        <h1>{video.title}</h1>
        <div className="watch-meta">
          <span>{formatViews(video.views)}</span>
          <span>·</span>
          <span>{timeAgo(video.createdAt)}</span>
          <span>·</span>
          <span>{formatBytes(video.size)}</span>
        </div>
        {video.description && <p className="description">{video.description}</p>}

        <div className="watch-actions">
          <Link className="btn" to="/">
            ← Về trang chủ
          </Link>
          <button className="btn danger" onClick={handleDelete}>
            Xoá video
          </button>
        </div>
      </div>
    </div>
  )
}
