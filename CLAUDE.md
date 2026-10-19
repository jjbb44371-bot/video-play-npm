# video-play-npm

Full-stack, server-authoritative video streaming app. npm workspaces: `server` (Fastify 5, ESM) + `client` (React 18, Vite 6).

## Commands

- Dev (both workspaces): `npm run dev`
- Dev server only: `npm run dev:server`
- Dev client only: `npm run dev:client`
- Build (client): `npm run build`
- Test (server, node:test): `npm test`
- Start (server): `npm start`

## Notes

- No linter or typechecker is configured yet.
- Project conventions (versioning, plans, CI, commits) live in `.opencode/rules.md` — read it before planning or releasing.
- Canonical version and languages: `project.config.json`. CI retry limit: `ci.config.json`.
- Written artifacts (plans, code, commits, changelog) stay in English.
