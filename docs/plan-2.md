# Plan 2: Database/query optimization and upload hardening

Status: done
Revision: v1
Accepted by author: yes (proceed with implementation)
Intended release stage: stable (MINOR bump per AGENTS.md: large change → MINOR, reset PATCH)
Implemented in: 0.4.0 (2026-10-19)

## Revision history
- v1 (initial): Balance option (A) — pagination, index-friendly ordering, views/metrics
  consolidation, reduced write-lock scope, upload hardening. Author accepted.

## Scope

Server-side only (`server/src/**` plus tests). No client changes. Two goals:

1. Database/query optimization: bound result sets, let existing indexes be used, stop
   duplicating view counts across tables, and narrow the global write lock.
2. Upload hardening: validate real file content (magic bytes), scope the body limit,
   survive multipart field ordering, and clean up orphaned partial files.

All written artifacts remain in English per AGENTS.md.

Out of scope: FTS5 search, metrics triggers for comment/like counts, client changes,
auth changes.

## Plan table

| # | Area or File | Change | Reason | Type |
|---|--------------|--------|--------|------|
| 1 | `server/src/store.js` | Add pagination to `listVideos` and `getVideosByUser`: `limit` (default 20, max 100) + `offset` (>= 0) arguments; append `LIMIT ? OFFSET ?`. Return total via a companion `countVideos`/`countVideosByUser`. Drop the `datetime()` wrapper from every ORDER BY (`listVideos`, `getVideosByUser`, `listComments`, `listPlaylists`, `listPlaylistItems`). | Unbounded scans and function-wrapped sort keys prevent index use and can exhaust memory. ISO-8601 TEXT columns already sort lexicographically. | code |
| 2 | `server/src/routes/videos.js` | Parse and validate `limit`/`offset` on `GET /api/videos`; invalid values return 400. Response shape `{ data, page: { limit, offset, count } }`. | Expose pagination without breaking the existing `data` array. | code |
| 3 | `server/src/db/connection.js` | Add migration v3 (`LATEST_SCHEMA_VERSION = 3`): composite index `idx_videos_createdAt_id ON videos(createdAt DESC, id DESC)` matching the stable sort `createdAt DESC, id DESC`; add trigger `trg_videos_views_au` (`AFTER UPDATE OF views ON videos`) that mirrors `views` into `video_metrics` when the metrics row exists. Keep existing indexes; migration must be idempotent (`IF NOT EXISTS`), and must not break an existing DB. | Support the new sort with an index and keep `video_metrics.views` consistent. | config-advanced |
| 4 | `server/src/store.js` | Rewrite `incrementViews` as a single `UPDATE videos SET views = COALESCE(views,0)+1 WHERE id = ? RETURNING id, title, description, filename, originalName, mimeType, size, views, userId, createdAt`; remove the follow-up `getVideo` SELECT and the `withLock` wrapper. | Removes an extra query and takes the hot path off the global lock. `node:sqlite` runs synchronously and a single statement is already atomic. | code |
| 5 | `server/src/store.js` | Narrow `withLock` to multi-step writes only: `createVideo`, `removeVideo` (DB + filesystem), `updateVideo`, `addPlaylistItem`, `removePlaylistItem`, `addVideoTag`, `removeVideoTag`, `updateVideoMetrics`. Remove the lock from single-statement writes: `incrementViews`, `setLike`, `removeLike`, `createTag`, `createCategory`, `createUser`, `updateUserPassword`, `createComment`, `removeComment`, `createPlaylist`, `updatePlaylist`, `ensureVideoMetrics`. | The global chain serializes unrelated writes; single statements do not need it. | code |
| 6 | `server/src/routes/videos.js` | Add magic-byte validation: buffer the first 12 bytes of the incoming stream, then accept only `ftyp` (bytes 4-8, mp4/mov), EBML `1A 45 DF A3` (webm/mkv), or `OggS` (ogv); otherwise resume/discard, remove the temp file, and return 415. | The current check trusts the client-supplied MIME header, which is spoofable. | code |
| 7 | `server/src/index.js`, `server/src/routes/videos.js` | Lower the global Fastify `bodyLimit` to 1 MiB for JSON, and set `bodyLimit: config.maxUploadBytes` on the upload route/plugin so only `POST /api/videos` accepts large bodies. Keep the multipart `fileSize` limit. | A 1 GiB global body limit is a memory/abuse risk for every non-upload endpoint. | config-basic |
| 8 | `server/src/routes/videos.js` | Replace `await req.file(...)` with an iterator over `await req.parts()`: collect `title`/`description` whenever they appear, require exactly one file part, and reject extra files. | With `req.file()`, fields sent after the file part are lost, so a title can silently disappear. | code |
| 9 | `server/src/store.js` | In `ensureStorage()`, scan `uploadsDir` and delete leftover `*.part` files at startup. | A crash mid-upload leaves partial files that are never reclaimed. | code |
| 10 | `server/test/api.test.mjs` | Add tests: pagination defaults/caps and 400 on invalid params; newest-first ordering; upload rejected (415) on wrong magic bytes; upload keeps `title` when the field is sent after the file part; view increment reflected in `videos` and mirrored into `video_metrics` when a metrics row exists; leftover `*.part` removed on startup. | Lock the new behavior in with regression coverage. | test |

## Verification

- `npm test` (server workspace) passes, run twice to confirm migrations are idempotent.
- Manual: `npm run dev:server`; `curl` paginated list; upload a sample mp4 and a renamed
  non-video file.

## Notes

- Migration v3 must preserve existing data and remain safe for an already-populated DB.
- `video_metrics` rows are still created lazily via `ensureVideoMetrics`; the new trigger
  only mirrors `views` when the row already exists.
