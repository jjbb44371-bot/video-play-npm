# Plan 1: Add authentication and access control (auth-required uploads)

Status: accepted
Revision: v2
Accepted by author: yes (proceed with implementation)

Intended release stage: stable (MINOR bump per AGENTS.md: large change → MINOR, reset PATCH)

## Revision history
- v1 (initial): Extend SQLite schema with social features (users, comments, likes/reactions, tags/video_tags, playlists/playlist_items, categories, video_metrics). Status draft.
- v2 (this revision): Add auth/access control. Upload requires authenticated account. Read-only (list/get/stream/view) remains public. Track video ownership; only owner/admin can edit/delete. Auth flow + minimal client updates. Author accepted.

## Scope

This plan adds user authentication and access control. Key rule:
- Uploading videos (POST /api/videos) requires an authenticated account.
- Viewing remains public: list videos, get video details, stream video, and increment views work without authentication.
- Video ownership is tracked (userId). Only the owner (or admin) can edit/delete their videos.
- Existing videos in DB remain valid (userId nullable for backward compatibility).

All written artifacts remain in English per AGENTS.md.

Entities to add (from user selection, prioritized for auth):
- users
- comments
- likes/reactions
- tags + video_tags
- playlists + playlist_items
- categories
- video_metrics

## Plan table

| # | Area or File | Change | Reason | Type |
|---|--------------|--------|--------|------|
| 1 | `server/src/db/connection.js` | Add versioned migration (schema_version). Create `users` table (id TEXT PK, username UNIQUE NOT NULL, email UNIQUE, password_hash TEXT NOT NULL, role TEXT DEFAULT 'user', createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL). Add `userId` (FK -> users, nullable) to `videos`. Create other tables: `categories`, `video_metrics`, `tags`, `video_tags`, `comments`, `likes`/`reactions`, `playlists`, `playlist_items` with FKs, indexes, constraints. Keep existing videos readable; preserve data. | Support auth, ownership, and requested features with incremental migrations and FK integrity. | config-advanced |
| 2 | `server/src/config.js` | Add auth config: `authEnabled` (bool, default true), `sessionSecret` (env), `cookieName`, `cookieSecure` (based on NODE_ENV), token/session settings. Keep backward compatible (sensible defaults). | Configure auth without breaking existing behavior in non-upload flows. | config-basic |
| 3 | `server/src/auth/` (new) | Add auth utilities: password hashing/verification (bcrypt or built-in), session management. Use Fastify sessions/cookies or JWT as appropriate. | Encapsulate auth logic. | code |
| 4 | `server/src/store.js` | Add user CRUD (createUser, findUserByUsername, findUserById, verifyPassword). Extend videos: include userId on create; add `getVideosByUser`, enforce ownership in update/delete. Add helpers for comments/likes/tags/playlists/categories/video_metrics. Keep existing read/list behavior unchanged for public access. | Data layer with proper ownership checks and transactions. | code |
| 5 | `server/src/routes/auth.js` (new) | Add auth endpoints: `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`. Validate inputs, return safe user info (no password). | Expose auth API. | code |
| 6 | `server/src/routes/videos.js` | Protect `POST /api/videos` with requireAuth (upload requires login). Protect `PATCH /api/videos/:id` and `DELETE /api/videos/:id` with requireAuth + ownership check (owner or admin). Public endpoints unchanged: GET list, GET by id, GET stream, POST view. When creating video, set `userId` from authenticated user. | Enforce rule: upload requires account; read-only public. | code |
| 7 | `server/src/routes/` (new modules) | Add routes for comments/likes/tags/playlists/categories as needed (read public where sensible; mutations require auth). | Expose new entities per plan. | code |
| 8 | `server/src/index.js` | Register auth plugin/session, register auth routes, register new route modules. No change to public read behavior. | Wire up auth and features. | code |
| 9 | `server/test/api.test.mjs` | Update tests to reflect auth. Keep existing read/stream/view/404 tests as public (no auth). For upload test: register/login a test user, attach auth cookie/session, then upload. Add auth-specific tests (register/login/logout, upload without auth returns 401/403). All existing lifecycle semantics preserved for authenticated flow. | Required tests remain valid with auth enforced. | code |
| 10 | `docs/plan-1.md` | Update this plan document. Status accepted. | Required by workflow. | docs |
| 11 | `project.config.json` | Version bump 0.2.0 → 0.3.0 (MINOR). | Versioning policy. | config-basic |
| 12 | `package.json` (root/server/client) | Sync versions to 0.3.0. | Keep in sync. | config-basic |
| 13 | `README.md`, `README.vi.md` | Document auth: register/login, upload requires account, public read access, env vars for auth/session. Update DB schema and API table. | Keep docs current in all configured languages. | docs |
| 14 | `CHANGELOG.md` | Prepend English-only exhaustive notes for 0.3.0 covering auth, ownership, access control, schema changes, and test updates. | Required. | docs |
| 15 | `client/` (minimal) | Add lightweight auth API helpers and auth guard on Upload page (redirect to login if not authenticated). Show login/register UI. Keep read-only pages public. | Client matches server-authoritative access rules. | code |

## Design notes

- Auth: use secure HTTP-only cookies + server sessions (Fastify). Store session secret in env (`SESSION_SECRET`). For dev/test, allow fallback but prefer env.
- Passwords: hash with bcrypt/argon2; never store plaintext.
- Access control: requireAuth middleware, requireOwner middleware (or inline check). Admin role for future moderation.
- Ownership: `videos.userId` nullable to avoid breaking existing DB rows; for new uploads always set. Existing rows remain readable (public) but cannot be edited/deleted unless ownership assigned (or treated as orphan; policy: if no owner, only admin can manage — define in implementation).
- Public vs protected: only mutations (create/update/delete/upload) require auth+ownership; all reads/stream/view remain public as requested.
- Tests: isolated tmp DB per test run; register test user in auth-required tests.

## Backward compatibility

- Read endpoints unchanged for anonymous users.
- Existing videos remain accessible (list/get/stream/view). 
- Upload behavior changes: anonymous uploads are rejected (401/403). This is an intentional access control change introduced with auth; documented in changelog.

## Verification
- `npm test` (required) — update tests to authenticate before upload.
- `npm run build` (client).
- Any lint/typecheck if present.

## Release
- 0.3.0 stable after successful CI + cleanup per workflow.

## Status
- accepted (awaiting implementation)

(English only)