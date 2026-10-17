import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listVideos } from '../api.js'
import { formatViews, timeAgo } from '../utils.js'

export default function Home() {
  const [videos, setVideos] = useState([])
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    setStatus('loading')
    listVideos()
      .then((data) => {
        if (!active) return
        setVideos(data)
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
  }, [])

  if (status === 'loading') return <p className="state">Đang tải danh sách video…</p>
  if (status === 'error') return <p className="state error">{error}</p>

  if (videos.length === 0) {
    return (
      <div className="empty">
        <h2>Chưa có video nào</h2>
        <p>Hãy tải lên video đầu tiên của bạn.</p>
        <Link className="btn primary" to="/upload">
          Tải video lên
        </Link>
      </div>
    )
  }

  return (
    <div className="grid">
      {videos.map((video) => (
        <Link key={video.id} to={`/watch/${video.id}`} className="card">
          <div className="thumb">
            <span className="play-badge">▶</span>
          </div>
          <div className="card-body">
            <h3 title={video.title}>{video.title}</h3>
            <p className="meta">
              {formatViews(video.views)} · {timeAgo(video.createdAt)}
            </p>
          </div>
        </Link>
      ))}
    </div>
  )
}
