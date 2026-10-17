# Changelog

All notable changes to this project are documented in this file.

Release notes are written in **English only** (see `AGENTS.md`). The format follows the
versioning policy in `AGENTS.md`. Versions use the release stages `alpha`, `beta`,
`preview`, `rc`, and `stable`.

## [Unreleased]

## [0.2.0] - 2026-10-17

### Added

- Render deployment configuration (`render.yaml`): a Node web service named
  `video-play-npm`, built from the `main` branch with build command
  `npm install && npm run build`, start command `npm start`, and health check
  `/api/health`.
- `engines.node` (`24.x`) pinned in the root, `server`, and `client` package manifests so
  Render selects a compatible Node version.
- `docs/plan-1.md` recording the Render deployment plan.
- `AGENTS.md` "Deployment (Render)" workflow section.
- Live deployment at **https://video-play-npm.onrender.com** (`srv-db9fb3ijnfac73c37n3g`),
  documented in `README.md` and `README.vi.md`.

### Changed

- Version bumped to `0.2.0` across `project.config.json` and all package manifests.

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
