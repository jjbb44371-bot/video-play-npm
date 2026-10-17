export function formatBytes(bytes) {
  if (!bytes || bytes < 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / Math.pow(1024, i)
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

export function formatViews(views) {
  const n = views || 0
  if (n < 1000) return `${n} lượt xem`
  if (n < 1_000_000) return `${(n / 1000).toFixed(1)} N lượt xem`
  return `${(n / 1_000_000).toFixed(1)} Tr lượt xem`
}

export function timeAgo(iso) {
  const then = new Date(iso).getTime()
  if (!then) return ''
  const seconds = Math.floor((Date.now() - then) / 1000)
  const units = [
    ['năm', 31536000],
    ['tháng', 2592000],
    ['tuần', 604800],
    ['ngày', 86400],
    ['giờ', 3600],
    ['phút', 60],
    ['giây', 1]
  ]
  for (const [label, secs] of units) {
    const v = Math.floor(seconds / secs)
    if (v >= 1) return `${v} ${label} trước`
  }
  return 'vừa xong'
}
