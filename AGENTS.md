# AGENTS.md

Operational workflow for any agent working in the `video-play-npm` repository.

This file is the **single source of truth** for how a change is planned, reviewed,
implemented, versioned, documented, committed, pushed, and released.

> Policy: this workflow document is written in **English**. Do not translate it.

---

## Configuration file

All process metadata lives in [`project.config.json`](./project.config.json):

```json
{
  "name": "video-play-npm",
  "version": "0.1.0",
  "languages": ["vi", "en"],
  "defaultLanguage": "en",
  "changelog": "CHANGELOG.md"
}
```

- `version` — the canonical version number (see **Versioning policy**).
- `languages` — the documentation languages that must exist and stay linked.
- `defaultLanguage` — the language used by the un-suffixed doc files.
- `changelog` — the file that accumulates release notes.

Always read this file before a version bump or a documentation update.

---

## The workflow (run the steps in order)

### 1. Plan
Before touching anything, produce a **plan table**. Every row must describe one unit of
work. The plan must also declare the **intended release stage** (see **Release stages**).

| # | Area / File | Change | Reason | Type |
|---|-------------|--------|--------|------|
| 1 | `server/src/routes/videos.js` | Add endpoint `GET /api/videos/:id/related` | Feature request | code |
| 2 | `README.md` + `README.vi.md` | Document new endpoint | Keep docs in sync | docs |

`Type` is one of `code`, `docs`, `config-basic`, `config-advanced`.

### 2. Author review (approval gate)
Present the plan table to the author and stop.

- The author may **intervene** and change, add, or remove rows.
- Do **not** modify code until the author **agrees** with the plan.
- If the author disagrees, revise the plan and present it again.
- **The author** is the human operator / repository owner. Approval is given in chat.

### 3. Implement
Once the author agrees, make the code changes and any other required work described in
the approved plan.

### 4. Compile and test
Build the project and run the test suite. Fix all errors and re-run until it is clean.
Apply the **Compile / Test applicability** rule below — for some change types this step is
skipped.

Project commands:

```sh
npm run build   # build the client (server has no build step)
npm test        # run the test suite (create tests first if none exist)
```

If a project has no test suite and the change is code-related, a minimal test must be
added before the release.

### 5. Version bump
Update `version` in [`project.config.json`](./project.config.json) using the
**Versioning policy** and the approved **Release stage**. Keep every `package.json`
`version` in sync (the root and every workspace package).

### 6. Documentation
Read `languages` and `defaultLanguage` from `project.config.json`.

- Maintain documentation in **every** configured language.
- Keep the language versions **cross-linked**: each user-facing doc starts with a language
  switcher linking to the other versions.
- If the config lists a language that has no docs yet, **create** that new language's
  docs.
- File naming (see **Documentation layout** below).

### 7. Release notes
Write the release notes in **English only**. No Vietnamese and no other language.

- List **everything** that changed and **every** bug that was fixed.
- Be exhaustive. Do not hide or omit any change.
- Content is **required**: never leave the release notes empty or as a placeholder.
- Prepend the entry to `CHANGELOG.md` (the file named in `project.config.json`).

### 8. Commit
Commit the code, version bump, documentation, and changelog together.

- Commit message format: `<type>(<area>): <summary> (v<version>)`.
- `type` is one of `feat`, `fix`, `docs`, `refactor`, `chore`.
- Never commit secrets or uploaded/generated media.

### 9. Push
**Before creating any release**, push the commits to the remote repository.

- Do not create a release from local-only commits; the remote must be up to date first.

### 10. Publish the release
After a successful push, publish the release:

1. Write the release notes (step 7) to a temporary file, e.g. `RELEASE_NOTES.md`.
   The content is identical to the top entry of `CHANGELOG.md`.
2. Create an annotated tag and push it:
   ```sh
   git tag -a v<version> -m "v<version> (<stage>)"
   git push origin v<version>
   ```
3. Publish the release **against the pushed tag**. Mark it as a **pre-release** unless the
   stage is `stable`:
   ```sh
   # pre-release (alpha / beta / preview / rc)
   gh release create v<version> --title "v<version> (<stage>)" --notes-file RELEASE_NOTES.md --prerelease

   # stable
   gh release create v<version> --title "v<version>" --notes-file RELEASE_NOTES.md
   ```

Because the tag already exists and is pushed, `gh release create` attaches the release to
that tag instead of creating a new one. Do not create the tag twice.

**The release must contain content.** The release body is the full English notes from
step 7 — every change and every fixed bug, listed exhaustively. Never publish an empty
release, a placeholder, a link instead of content, or notes in any language other than
English.

---

## Versioning policy

Format: `MAJOR.MINOR.PATCH`, each segment a single digit `0`–`9`.

| Change size | Action | Example |
|-------------|--------|---------|
| Small change (fix / tweak) | bump `PATCH` | `1.1.1` → `1.1.2` |
| Large change (feature / significant) | bump `MINOR`, reset `PATCH` to `0` | `1.1.4` → `1.2.0` |
| Segment overflow | carry to the next higher segment | see below |

Carry / rollover rules:

- `PATCH` would exceed `9` → `MINOR + 1`, `PATCH = 0`.
- `MINOR` would exceed `9` → `MAJOR + 1`, `MINOR = 0`, `PATCH = 0`.
- Example: `1.9.x` + a large change → `2.0.0`.

**Small vs large** (used to pick `PATCH` vs `MINOR`):

- **Small** — bug fix, typo, tweak, docs that change no behavior.
- **Large** — new feature, breaking change, behavior change, new dependency, API change.

### Pre-release suffix

A release that is not `stable` appends `-<stage>.<N>`, where `N` is a single digit
`1`–`9`:

```
MAJOR.MINOR.PATCH-<stage>.<N>     e.g.  1.2.0-beta.1
```

- Increment `N` for each new build of the same stage.
- While a release line is in a pre-release stage, the base `MAJOR.MINOR.PATCH` stays
  fixed; only `N` (or the stage) changes.
- If `N` would exceed `9`, promote to the next stage instead.
- Dropping the suffix (e.g. `1.2.0-beta.3` → `1.2.0`) marks the version **stable**.
- The small/large rule sets the base version **when a new release line starts from the
  last stable release**; once the line is in a pre-release stage the base stays fixed
  until it is promoted to `stable`.

---

## Release stages

Distinguish every release by its stage. The stage is declared in the plan (step 1) and
encoded in the version suffix.

| Stage | Purpose | Version suffix | GitHub flag |
|-------|---------|----------------|-------------|
| `alpha` | internal, unstable, early work | `-alpha.N` | pre-release |
| `beta` | feature-complete, under testing | `-beta.N` | pre-release |
| `preview` | public preview before stable | `-preview.N` | pre-release |
| `rc` | release candidate, final checks | `-rc.N` | pre-release |
| `stable` | production-ready | *(none)* | latest |

Rules:

- **Default** to `stable` unless the plan states otherwise.
- Pre-releases (`alpha`, `beta`, `preview`, `rc`) are always published as **pre-release**.
- Only `stable` is published as the latest release.
- Promotion order: `alpha` → `beta` → `preview` → `rc` → `stable`.
- A stage promotes only after the previous stage has been tested with no errors.
- Reset `N` to `1` whenever the stage changes.

---

## Compile / Test applicability

| Kind of change | Compile & test? |
|----------------|-----------------|
| Code changes (behavior, logic, runtime) | **Required** |
| Documentation only | Skip |
| Basic configuration | Skip |
| Advanced configuration, or hard changes that can affect behavior/runtime | **Required** |

- If a change is documentation-only (or otherwise unrelated to code), **skip** both
  compile and test.
- Basic configuration changes may be skipped.
- Advanced configuration changes — or any hard change that could affect how the project
  runs — **must** be compiled and tested.
- When in doubt about whether a configuration change is "advanced", treat it as
  **Required**.

---

## Documentation layout

For each language listed in `languages`:

- The `defaultLanguage` uses the un-suffixed file (e.g. `README.md`).
- Every other language uses a suffix (e.g. `README.vi.md`).

Every user-facing document (e.g. `README`) starts with a language switcher that links to
the other languages, so the versions stay cross-linked:

```markdown
[English](./README.md) · [Tiếng Việt](./README.vi.md)
```

Documents that are English-only by policy (`AGENTS.md`, `CHANGELOG.md`) are **not**
translated and get **no** language switcher.

When a new language is added to `languages`, create its file and add it to every
language switcher.

---

## Release notes and changelog

- Notes are **English only** — never Vietnamese or any other language.
- They must list every change and every fixed bug, exhaustively, without omissions.
- They live in two places, using the same text:
  1. `CHANGELOG.md` (committed).
  2. The GitHub release body (published after push).

---

## Rules for the agent

1. Never implement, version-bump, or release without the author's approval of the plan.
2. Always start with the plan table (step 1); never jump straight to code.
3. Never skip compile/test when the change is code or advanced-config related.
4. Always commit (step 8) before pushing (step 9), and push before publishing (step 10).
5. Every release must declare its stage and use the matching version suffix.
6. Release notes are always English-only and always exhaustive.
7. Every release must contain its full content — never an empty or placeholder release.
8. This workflow document (`AGENTS.md`) stays in English.
