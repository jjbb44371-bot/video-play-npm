**English** · [Tiếng Việt](./README.vi.md)

# video-play-npm

A full-stack video streaming app (YouTube-style) with a **server-authoritative**
architecture: all processing and data live on the server, and the client (browser) only
displays what the server returns.

## Architecture

- **server/** — [Fastify](https://fastify.dev/) backend
  - Accepts video uploads (multipart), validates the MIME type, and stores files on the server.
  - Manages metadata (title, description, views, timestamps) in `server/data/videos.json`.
  - Streaming supports HTTP Range (seeking, smooth playback).
  - Generates IDs, increments views, and controls the video list itself → the server holds all authority.
- **client/** — React + Vite frontend
  - Home page (video grid), watch page, and upload page.
  - Has no authority over data; it only calls the server API.

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

| Method | Endpoint                  | Description                       |
| ------ | ------------------------- | --------------------------------- |
| GET    | `/api/health`             | Server health check               |
| GET    | `/api/videos`             | List videos                       |
| GET    | `/api/videos/:id`         | Video details                     |
| GET    | `/api/videos/:id/stream`  | Stream video (Range supported)    |
| POST   | `/api/videos/:id/view`    | Increment views (handled by server) |
| POST   | `/api/videos`             | Upload video (multipart)          |
| PATCH  | `/api/videos/:id`         | Update title/description          |
| DELETE | `/api/videos/:id`         | Delete video                      |

## Environment variables

| Variable          | Default         | Meaning                    |
| ----------------- | --------------- | -------------------------- |
| `PORT`            | `4000`          | Server port                |
| `HOST`            | `0.0.0.0`       | Bind address               |
| `MAX_UPLOAD_BYTES`| `1073741824`    | Upload size limit          |
| `DATA_DIR`        | `server/data`   | Metadata directory         |
| `CLIENT_DIST`     | `client/dist`   | Client build directory     |
| `UPLOADS_DIR`     | `server/uploads`| Video files directory      |

## Workflow

The project workflow is documented in English in [`AGENTS.md`](./AGENTS.md)
(English only, not translated). Process configuration lives in
[`project.config.json`](./project.config.json). Change history lives in
[`CHANGELOG.md`](./CHANGELOG.md).
