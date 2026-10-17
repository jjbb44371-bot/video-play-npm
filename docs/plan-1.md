# Plan 1 — Render deployment

Status: **accepted**

## Goal

Prepare and deploy `video-play-npm` as a Render web service, then document the live URL
in both README versions.

## Plan

| # | Area or File | Change | Reason | Type |
|---|--------------|--------|--------|------|
| 1 | `render.yaml` (new) | Blueprint for a Node web service: build `npm install && npm run build`, start `npm start`, health check `/api/health` | Reproducible infra-as-code | config-advanced |
| 2 | `package.json`, `server/package.json` | Add `engines.node` | Pin a Node version Render understands | config-advanced |
| 3 | `server/src/config.js` | Reuse `PORT` / `HOST` / `UPLOADS_DIR` / `DATA_DIR` env vars | Render binds a dynamic port; allow a persistent disk path | code |
| 4 | `README.md`, `README.vi.md` | Add a "Deploy on Render" section and the service URL | User-facing docs, both languages | docs |
| 5 | `AGENTS.md` | Add a "Deployment (Render)" workflow section | Process | docs |

## Accepted changes

- Proceed with a Render **web service** named `video-play-npm` from the `main` branch.
- Create the service **before** updating the docs; the docs then include the live URL.
- Push the documentation update as a **separate** change.

## Notes

- The server already binds `0.0.0.0` and `process.env.PORT`, which satisfies Render.
- On the free plan the filesystem is ephemeral: uploaded videos and the SQLite file are
  lost on every deploy or restart. Persistence requires a paid instance plus a persistent
  disk mounted at `/var/data` (then set `UPLOADS_DIR=/var/data/uploads` and
  `DATA_DIR=/var/data/data`).
