import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { uploadVideo } from '../api.js'
import { formatBytes } from '../utils.js'

export default function Upload() {
  const navigate = useNavigate()
  const [file, setFile] = useState(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [progress, setProgress] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef(null)

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
      setError('Vui lòng chọn một file video')
      return
    }
    setBusy(true)
    setError('')
    setProgress(0)
    try {
      const created = await uploadVideo({ file, title, description }, setProgress)
      if (created?.id) navigate(`/watch/${created.id}`)
      else navigate('/')
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <div className="upload">
      <h1>Tải video lên</h1>
      <p className="hint">
        Video được xử lý và lưu trên máy chủ. Máy khách chỉ hiển thị nội dung do máy chủ trả về.
      </p>

      <form onSubmit={onSubmit} className="upload-form">
        <label className="field">
          <span>File video</span>
          <input
            ref={inputRef}
            type="file"
            accept="video/*"
            onChange={onFileChange}
            disabled={busy}
          />
        </label>

        {file && (
          <p className="file-info">
            {file.name} · {formatBytes(file.size)}
          </p>
        )}

        <label className="field">
          <span>Tiêu đề</span>
          <input
            type="text"
            value={title}
            maxLength={200}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Tiêu đề video"
            disabled={busy}
          />
        </label>

        <label className="field">
          <span>Mô tả</span>
          <textarea
            value={description}
            maxLength={5000}
            rows={4}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Mô tả (không bắt buộc)"
            disabled={busy}
          />
        </label>

        {busy && (
          <div className="progress">
            <div className="progress-bar" style={{ width: `${progress}%` }} />
            <span>{progress}%</span>
          </div>
        )}

        {error && <p className="state error">{error}</p>}

        <button className="btn primary" type="submit" disabled={busy || !file}>
          {busy ? 'Đang tải lên…' : 'Tải lên'}
        </button>
      </form>
    </div>
  )
}
