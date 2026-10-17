const JSON_HEADERS = { 'Content-Type': 'application/json' }

async function handle(res) {
  const text = await res.text()
  let body = null
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = null
  }
  if (!res.ok) {
    const message = body?.error || body?.message || `Lỗi ${res.status}`
    throw new Error(message)
  }
  return body
}

export async function listVideos() {
  const res = await fetch('/api/videos')
  const body = await handle(res)
  return body?.data ?? []
}

export async function getVideo(id) {
  const res = await fetch(`/api/videos/${encodeURIComponent(id)}`)
  const body = await handle(res)
  return body?.data ?? null
}

export async function registerView(id) {
  const res = await fetch(`/api/videos/${encodeURIComponent(id)}/view`, {
    method: 'POST',
    headers: JSON_HEADERS
  })
  const body = await handle(res)
  return body?.data ?? null
}

export async function deleteVideo(id) {
  const res = await fetch(`/api/videos/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  })
  await handle(res)
}

export function uploadVideo({ file, title, description }, onProgress) {
  return new Promise((resolve, reject) => {
    const form = new FormData()
    form.append('title', title || '')
    form.append('description', description || '')
    form.append('file', file)

    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/api/videos')
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100))
      }
    }
    xhr.onload = () => {
      let body = null
      try {
        body = xhr.responseText ? JSON.parse(xhr.responseText) : null
      } catch {
        body = null
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(body?.data ?? null)
      } else {
        reject(new Error(body?.error || `Upload thất bại (${xhr.status})`))
      }
    }
    xhr.onerror = () => reject(new Error('Lỗi kết nối khi upload'))
    xhr.send(form)
  })
}
