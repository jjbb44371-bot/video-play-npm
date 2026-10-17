# Changelog

All notable changes to this project are documented in this file.

Release notes are written in **English only** (see `AGENTS.md`). The format follows the
versioning policy in `AGENTS.md`. Versions use the release stages `alpha`, `beta`,
`preview`, `rc`, and `stable`.

## [Unreleased]

## [0.3.0] - 2026-10-17

### Added

- **Authentication**
  - Session-based auth using `@fastify/session` + `@fastify/cookie`, with HTTP-only, `SameSite=Lax`
    session cookie (`SESSION_COOKIE_NAME`, default `video_play_sid`).
  - Password hashing with `bcryptjs` (10 salt rounds); plaintext passwords are never stored or returned.
  - Auth endpoints: `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`,
    `GET /api/auth/me`. Register/login/logout start/refresh/destroy the session; `GET /api/auth/me`
    returns `401` when unauthenticated.
  - Auth helpers under `server/src/auth/` (`hashPassword`, `verifyPassword`, `getSessionUser`,
    `requireAuth`, `requireAdmin`, `requireOwnerOrAdmin`).
- **Access control**
  - `POST /api/videos` (upload) now requires an authenticated account; anonymous uploads get `401`.
  - `PATCH /api/videos/:id` and `DELETE /api/videos/:id` require authentication **and** ownership
    (owner or `admin`). Missing resources return `404`, unauthorized users `401`, non-owners `403`.
  - Public (unchanged) reads: `GET /api/videos`, `GET /api/videos/:id`, `GET /api/videos/:id/stream`,
    `POST /api/videos/:id/view`, `GET /api/health`.
- **Ownership**
  - New videos record their owner in `videos.userId`. Videos created before auth keep a `null`
    owner, remain publicly readable, and are manageable only by admins.
- **Database schema v2** (`server/src/db/connection.js`)
  - Versioned migrations tracked in a `schema_version` table; baseline (v1) detected automatically
    and preserved.
  - New tables: `users`, `categories`, `tags`, `video_tags`, `comments`, `likes`, `playlists`,
    `playlist_items`, `video_metrics`, plus indexes and FK/CHECK constraints.
  - Added nullable `videos.userId` column (FK to `users`, `ON DELETE SET NULL`) with an index.
  - `migrateV2` runs inside a transaction and rolls back on failure.
- **Configuration**
  - New auth settings in `server/src/config.js`: `auth.authEnabled`, `auth.sessionSecret`
    (`SESSION_SECRET`, required when `NODE_ENV=production`), `auth.cookieName` (`SESSION_COOKIE_NAME`),
    `auth.cookieSecure`, `auth.sessionMaxAge` (`SESSION_MAX_AGE`).
- **New API endpoints (route modules registered in `server/src/index.js`)**
  - `server/src/routes/categories.js`: `GET /api/categories`, `GET /api/categories/:id` (public),
    `POST /api/categories` (auth). Slug is derived from name and duplicate slugs/names return `409`.
  - `server/src/routes/tags.js`: `GET /api/tags`, `GET /api/tags/:id`, `GET /api/videos/:id/tags`
    (public); `POST /api/tags` (auth, reuses existing tag by name); `POST /api/videos/:id/tags` and
    `DELETE /api/videos/:id/tags/:tagId` (auth + owner/admin).
  - `server/src/routes/comments.js`: `GET /api/videos/:id/comments` (public), `POST /api/videos/:id/comments`
    (auth, optional validated `parentId`), `DELETE /api/comments/:id` (owner/admin).
  - `server/src/routes/likes.js`: `GET /api/videos/:id/likes` (public, like/dislike summary),
    `POST /api/videos/:id/likes` (auth, upserts `like`/`dislike`), `DELETE /api/videos/:id/likes` (auth).
  - `server/src/routes/playlists.js`: `GET /api/playlists` (auth, own playlists), `POST /api/playlists`
    (auth), `GET /api/playlists/:id` and `GET /api/playlists/:id/items` (public when `visibility`
    is `public`, otherwise owner-only), `PATCH /api/playlists/:id`, `POST /api/playlists/:id/items`,
    `DELETE /api/playlists/:id/items/:videoId` (owner/admin).
- **Data layer (`server/src/store.js`)**
  - Added user CRUD and password verification helpers.
  - Added helpers for videos by owner, comments, likes, tags, playlists, categories, and video metrics.
  - Kept existing public read/list behavior unchanged.
- **Client**
  - New auth API helpers in `client/src/api.js`: `register`, `login`, `logout`, `getMe`.
  - New `client/src/AuthContext.jsx` (provider + `useAuth` hook) that resolves the current session
    on mount and exposes `login`/`register`/`logout`.
  - New pages: `client/src/pages/Login.jsx` and `client/src/pages/Register.jsx` with routes
    `/login` and `/register`.
  - Top bar now shows the signed-in username with a logout button, or login/register links when
    signed out.
  - `client/src/pages/Upload.jsx` is guarded: unauthenticated users are redirected to `/login`
    (returning to `/upload` afterwards), and the page shows the current account state.
  - Read-only pages (Home, Watch) remain fully public.
  - Added supporting auth styles in `client/src/styles.css`.
- **Tests (`server/test/api.test.mjs`)**
  - Added register/login/`me`/logout lifecycle assertions (including duplicate-register `409` and
    wrong-password `401`).
  - Added a test that anonymous upload returns `401`.
  - Upload and delete flows now register a user and send the session cookie.
  - Kept read/stream/view/404 tests public (no auth).
  - `rejects non-video uploads` now authenticates first so it still reaches the `415` MIME check.

### Changed

- `POST /api/videos`, `PATCH /api/videos/:id`, and `DELETE /api/videos/:id` behavior changed from
  always-allowed to auth- and ownership-gated. This is the intentional access-control change of this
  release; all public read/stream/view endpoints are unchanged.
- `server/src/index.js` now registers the session/cookie plugins and the new route modules.

### Documentation

- Updated `README.md` and `README.vi.md`: documented authentication/access control, expanded the API
  table with auth and the new endpoints, added the new auth/session environment variables, and
  described the schema v2 database layout.

### Versioning

- Bumped `project.config.json` and all workspace `package.json` files from `0.2.0` to `0.3.0` (MINOR).

## [0.2.0] - 2026-10-17

### Changed
- Replaced JSON metadata store with SQLite database (`server/data/videos.db`).
- Refactored server storage to use `node:sqlite` (built-in) with WAL journaling and prepared statements.
- Ensured storage initialization runs on server startup and during build tests.

### Fixed
- Improved database file creation to avoid "unable to open database file" errors under test isolation.

### Documentation
- Updated README.md and README.vi.md to document SQLite storage.

## [0.1.0] - 2026-10-17

### Added

- Full-stack monorepo (`server` + `client` npm workspaces).
- Fastify backend (`server/`) acting as the single source of truth:
  - `GET /api/health` health check.
  - `GET /api/videos` list videos.
  - `GET /api/videos/:id` video details.
  - `GET /api/videos/:id/stream` video streaming with HTTP Range support.
  - `POST /api/videos/:id/view` server-side view counter.
  - `POST /api/videos` multipart video upload with MIME validation.
  - `PATCH /api/videos/:id` update title/description.
  - `DELETE /api/videos/:id` delete video and its stored file.
  - JSON-file metadata store (`server/data/videos.json`) with atomic writes.
  - Uploaded media stored under `server/uploads/`.
- React + Vite frontend (`client/`):
  - Home page with a video grid.
  - Watch page with an HTML5 player and server-reported view count.
  - Upload page with progress reporting.
- Root tooling: `npm run dev`, `npm run build`, `npm start`, and workspace scripts.
- Documentation in English (`README.md`) and Vietnamese (`README.vi.md`), cross-linked.
- `AGENTS.md` workflow document and `project.config.json` process configuration.

### Fixed

- No fixes in this release (initial release).
