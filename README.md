**English** · [Tiếng Việt](./README.vi.md)

# video-play-npm

A full-stack video streaming app (YouTube-style) with a **server-authoritative**
architecture: all processing and data live on the server, and the client (browser) only
displays what the server returns.

## Architecture

- **server/** — [Fastify](https://fastify.dev/) backend
  - Accepts video uploads (multipart), validates the MIME type, and stores files on the server.
  - Manages users, videos, and social data in SQLite (`server/data/videos.db`, schema v2).
  - Provides session-cookie authentication and per-video ownership.
  - Streaming supports HTTP Range (seeking, smooth playback).
  - Generates IDs, increments views, and controls the video list itself → the server holds all authority.
- **client/** — React + Vite frontend
  - Home page (video grid), watch page, upload page, and login/register pages.
  - Has no authority over data; it only calls the server API.

## Authentication and access control

- **Reading is public:** listing videos, viewing details, streaming, and incrementing views
  work without an account.
- **Uploading requires an account:** `POST /api/videos` returns `401` for anonymous requests.
- **Ownership:** each new video is linked to its creator. Only the owner (or an `admin`) can
  update or delete it. Videos created before auth existed remain publicly readable.
- Sessions are stored in an HTTP-only cookie (`SESSION_COOKIE_NAME`), and passwords are hashed
  with bcrypt. Set `SESSION_SECRET` in production (required when `NODE_ENV=production`).

## Requirements

- Node.js 20+ (tested with Node 24)

## Install

```sh
npm install
```

## Run in development

```sh
npm run dev
```

- Server: http://localhost:4000
- Client (Vite dev + `/api` proxy): http://localhost:5173

Run each part separately:

```sh
npm run dev:server
npm run dev:client
```

## Run in production

```sh
npm run build      # build the client into client/dist
npm start          # Fastify serves the API + client/dist
```

Then open http://localhost:4000

## Test

```sh
npm test
```

## API

| Method | Endpoint                          | Auth        | Description                          |
| ------ | --------------------------------- | ----------- | ------------------------------------ |
| GET    | `/api/health`                     | public      | Server health check                  |
| POST   | `/api/auth/register`              | public      | Register and start a session         |
| POST   | `/api/auth/login`                 | public      | Log in                               |
| POST   | `/api/auth/logout`                | session     | Log out                              |
| GET    | `/api/auth/me`                    | session     | Current user                         |
| GET    | `/api/videos`                     | public      | List videos                          |
| GET    | `/api/videos/:id`                 | public      | Video details                        |
| GET    | `/api/videos/:id/stream`          | public      | Stream video (Range supported)       |
| POST   | `/api/videos/:id/view`            | public      | Increment views                      |
| POST   | `/api/videos`                     | required    | Upload video (multipart)             |
| PATCH  | `/api/videos/:id`                 | owner/admin | Update title/description             |
| DELETE | `/api/videos/:id`                 | owner/admin | Delete video                         |
| GET    | `/api/categories`                 | public      | List categories                      |
| GET    | `/api/categories/:id`             | public      | Category details                     |
| POST   | `/api/categories`                 | required    | Create a category                    |
| GET    | `/api/tags`                       | public      | List tags                            |
| GET    | `/api/tags/:id`                   | public      | Tag details                          |
| POST   | `/api/tags`                       | required    | Create (or reuse) a tag              |
| GET    | `/api/videos/:id/tags`            | public      | Tags on a video                      |
| POST   | `/api/videos/:id/tags`            | owner/admin | Add a tag to a video                 |
| DELETE | `/api/videos/:id/tags/:tagId`     | owner/admin | Remove a tag from a video            |
| GET    | `/api/videos/:id/comments`        | public      | List comments                        |
| POST   | `/api/videos/:id/comments`        | required    | Add a comment                        |
| DELETE | `/api/comments/:id`               | owner/admin | Delete a comment                     |
| GET    | `/api/videos/:id/likes`           | public      | Like/dislike summary                 |
| POST   | `/api/videos/:id/likes`           | required    | Set like/dislike reaction            |
| DELETE | `/api/videos/:id/likes`           | required    | Remove your reaction                 |
| GET    | `/api/playlists`                  | required    | List your playlists                  |
| POST   | `/api/playlists`                  | required    | Create a playlist                    |
| GET    | `/api/playlists/:id`              | public/owner| Playlist details with items          |
| PATCH  | `/api/playlists/:id`              | owner/admin | Update a playlist                    |
| GET    | `/api/playlists/:id/items`        | public/owner| List playlist items                  |
| POST   | `/api/playlists/:id/items`        | owner/admin | Add a video to a playlist            |
| DELETE | `/api/playlists/:id/items/:videoId`| owner/admin| Remove a video from a playlist       |

## Environment variables

| Variable              | Default         | Meaning                                  |
| --------------------- | --------------- | ---------------------------------------- |
| `PORT`                | `4000`          | Server port                              |
| `HOST`                | `0.0.0.0`       | Bind address                             |
| `MAX_UPLOAD_BYTES`    | `1073741824`    | Upload size limit                        |
| `DATA_DIR`            | `server/data`   | SQLite database directory                |
| `CLIENT_DIST`         | `client/dist`   | Client build directory                   |
| `UPLOADS_DIR`         | `server/uploads`| Video files directory                    |
| `AUTH_ENABLED`        | `true`          | Set to `false`/`0` to disable auth checks|
| `SESSION_SECRET`      | dev fallback    | Session signing secret (required in prod)|
| `SESSION_COOKIE_NAME` | `video_play_sid`| Session cookie name                      |
| `SESSION_MAX_AGE`     | `604800000`     | Session lifetime in milliseconds         |

## Database schema

SQLite (`server/data/videos.db`) uses versioned migrations (`schema_version`). Schema **v2** adds:

- `users` (id, username, email, password_hash, role, timestamps)
- `videos.userId` (nullable owner reference)
- `categories`, `tags`, `video_tags`
- `comments`, `likes`
- `playlists`, `playlist_items`
- `video_metrics` (views, likes, dislikes, comments, shares)

Migrations are incremental and preserve existing videos; old rows keep working with a null owner.

## Workflow

The project workflow is documented in English in [`AGENTS.md`](./AGENTS.md)
(English only, not translated). Process configuration lives in
[`project.config.json`](./project.config.json). Change history lives in
[`CHANGELOG.md`](./CHANGELOG.md).
