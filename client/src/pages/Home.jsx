import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listVideos } from '../api.js'
import { formatViews, timeAgo } from '../utils.js'

export default function Home() {
  const [videos, setVideos] = useState([])
  const [status, setStatus] = useState('loading')

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

  if (status === 'loading') return (
    <div className="min-h-[200px] flex items-center justify-center">
      <span className="animate-pulse bg-surface/50 rounded-lg w-16 h-16 mx-auto text-muted">
        ▶
      </span>
    </div>
  )

  if (status === 'error') return (
    <div className="min-h-[200px] flex items-center justify-center text-error">
      <p>Lỗi khi tải danh sách: {error}</p>
    </div>
  )

  if (videos.length === 0) {
    return (
      <div className="min-h-[200px] flex flex-col items-center justify-center text-muted">
        <h2 className="mb-2">Chưa có video nào</h2>
        <p className="mb-4">Hãy tải lên video đầu tiên của bạn.</p>
        <Link className="btn primary" to="/upload">
          Tải video lên
        </Link>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {videos.map((video) => (
        <Link
          key={video.id}
          to={`/watch/${video.id}`}
          className="group hover:shadow-lg hover:border-accent transition-shadow border rounded-lg overflow-hidden bg-surface border-border"
        >
          <div className="relative w-full aspect-[16/9]">
            <span className="absolute top-2 left-2 play-badge bg-accent text-white text-xs px-2 py-1 rounded">
              ▶
            </span>
            <img
              src={`/static/thumbs/${video.id}.jpg` || '/static/thumbs/placeholder.jpg'}
              alt={video.title}
              className="w-full h-full object-cover"
              onError={e => e.target.src = '/static/thumbs/placeholder.jpg'}
            />
          </div>
          <div className="p-3">
            <h3 className="line-clamp-2 title-font">{video.title}</h3>
            <p className="meta text-small line-clamp-1 mt-2">
              {formatViews(video.views)} · {timeAgo(video.createdAt)}
            </p>
          </div>
        </Link>
      ))}
    </div>
  )
}
