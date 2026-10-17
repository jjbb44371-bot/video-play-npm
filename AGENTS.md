# AGENTS.md

Operational workflow for any agent working in the `video-play-npm` repository.

This file is the **single source of truth** for how a change is planned, reviewed,
implemented, versioned, documented, committed, pushed, and released.

> Written in **English**. Do not translate it.

---

## Repository

This workflow applies to the project **`video-play-npm`** only. Its remote is:

```
https://github.com/jjbb44371-bot/video-play-npm.git
```

Before pushing or releasing, confirm you are in this project and that `git remote -v`
points at this remote. If it does not match, do not push yet: find out why it differs and
fix it (wrong directory, wrong remote, renamed repo, stale fork, etc.), then verify again
before proceeding. Never push or release to another repository.

---

## Configuration file

Process metadata lives in [`project.config.json`](./project.config.json):

- `version` — the canonical version number.
- `languages` — the documentation languages that must exist and stay linked.
- `defaultLanguage` — the language used by the un-suffixed doc files.
- `changelog` — the file that accumulates release notes.

Read it before a version bump or a documentation change.

---

## The workflow (in order)

1. **Plan** — produce a plan table with columns `# / Area or File / Change / Reason /
   Type`, and declare the intended release stage. `Type` is `code`, `docs`,
   `config-basic`, or `config-advanced`.
2. **Author review** — present the plan and stop. The author may intervene; do not touch
   code until the author agrees. The author is the human operator / repository owner.
3. **Implement** — make the approved changes.
4. **Compile and test** — build and run the tests until clean. Skip per the applicability
   policy below.
5. **Version bump** — update `version` in `project.config.json` using the versioning
   policy and the approved stage; keep every `package.json` version in sync.
6. **Documentation** — update docs in every configured language and keep them
   cross-linked; create docs for any newly configured language.
7. **Release notes** — write English-only notes listing every change and every fix
   exhaustively; content is required; prepend them to the changelog.
8. **Commit** — commit code, version, docs, and changelog together. Subject:
   `<type>(<area>): <summary> (v<version>)`. The body must list every change in detail,
   in English.
9. **Push** — verify the remote matches the repository above, then push the commits
   before releasing.
10. **Publish the release** — verify the remote again, then tag the version and push the
    tag, and publish the release with the same English notes as the changelog. Mark it a
    pre-release unless the stage is `stable`.

---

## Versioning policy

Format `MAJOR.MINOR.PATCH`, each segment a single digit `0`–`9`.

- Small change (fix, tweak) → bump `PATCH`.
- Large change (feature, behavior, API, or dependency change) → bump `MINOR`, reset
  `PATCH`.
- Carry overflow to the next segment (e.g. `1.9.x` + large → `2.0.0`).
- A pre-release appends `-<stage>.<N>` (`N` a single digit). The base version stays fixed
  across a pre-release line; dropping the suffix marks it `stable`.

---

## Release stages

`alpha` → `beta` → `preview` → `rc` → `stable`.

- Default to `stable` unless the plan says otherwise.
- `alpha`, `beta`, `preview`, and `rc` are published as pre-releases; only `stable` is
  the latest release.
- Promote only after the previous stage tested clean.

---

## Compile / Test applicability

- Code, or advanced configuration that can affect behavior/runtime → **required**.
- Documentation only, or basic configuration → **skip**.
- When unsure, treat it as required.

---

## Documentation layout

- The `defaultLanguage` uses the un-suffixed file; other languages use a suffix
  (e.g. `README.md` / `README.vi.md`).
- User-facing docs start with a language switcher linking the versions. English-only docs
  (`AGENTS.md`, `CHANGELOG.md`) are not translated and have no switcher.

---

## Release notes and changelog

English only, exhaustive, and identical in the changelog and the release body.

---

## Rules for the agent

1. No implementation, version bump, or release without the plan being approved.
2. Always start with the plan.
3. Never skip required compile/test.
4. Confirm the target repository before every push and release. If it does not match,
   find out why and fix it before proceeding; never act on a repo that is not
   `video-play-npm`.
5. Commit before pushing; push before releasing.
6. Every release declares a stage and uses the matching version suffix.
7. Commit messages are English-only and list every change in detail.
8. Release notes are English-only and exhaustive; a release must contain its content.
9. This file stays in English.
