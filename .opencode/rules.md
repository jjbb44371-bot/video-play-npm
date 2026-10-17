# Project rules

Project-specific conventions for the `video-play-npm` repository that the **Superpowers**
plugin does not cover. The development *workflow* itself — brainstorm → design → plan →
implement in subagents → TDD → review → finish branch — is provided by Superpowers. This
file only adds the rules unique to this project.

Written in **English**. Do not translate it.

---

## Repository

This project is **`video-play-npm`** only. Its remote is:

```
https://github.com/jjbb44371-bot/video-play-npm.git
```

Before every push or release, confirm `git remote -v` points at this remote. If it does
not match, stop: find out why (wrong directory, wrong remote, renamed repo, stale fork),
fix it, then verify again. Never push or release to another repository.

---

## Configuration files

- [`project.config.json`](./project.config.json) — `version` (canonical), `languages`,
  `defaultLanguage`, `changelog`. Read it before a version bump or a documentation change.
- [`ci.config.json`](./ci.config.json) — `maxRetries`, the CI retry-loop limit. Read it; do
  not hardcode the limit.

---

## Plans

- Write every plan to `docs/plan-<N>.md` in **English** before implementing — never state a
  plan only in chat.
- Status: `draft` → `accepted` → `in progress` → `done`.
- Record every author-requested change as a new revision (`v1` → `v2` → …) so the full plan
  history is visible.
- Commit and push plan documents so the community can see them.

---

## Versioning policy

Format `MAJOR.MINOR.PATCH`, each segment a single digit `0`–`9`.

- Small change (fix, tweak) → bump `PATCH`.
- Large change (feature, behavior, API, or dependency change) → bump `MINOR`, reset `PATCH`.
- Carry overflow to the next segment (e.g. `1.9.x` + large → `2.0.0`).
- A pre-release appends `-<stage>.<N>` (`N` a single digit); dropping the suffix marks it
  `stable`.

---

## Release stages

`alpha` → `beta` → `preview` → `rc` → `stable`.

- Default to `stable` unless the plan says otherwise.
- `alpha`, `beta`, `preview`, `rc` are published as pre-releases; only `stable` is the
  latest release.
- Promote only after the previous stage tested clean.

---

## Compile / test (CI)

- Code, or advanced configuration that can affect behavior/runtime → **required**.
- Documentation only, or basic configuration → **skip**.
- When unsure, treat it as required.
- CI does **not** run on its own. After pushing, trigger
  [`.github/workflows/ci.yml`](./.github/workflows/ci.yml) manually (`workflow_dispatch`),
  select the newest run, and poll it every 30 seconds. On success continue; on failure find
  the cause, fix, and re-trigger — capped at the retry limit read from `ci.config.json`,
  then stop and report.
- Whenever tests run, clean up everything the run created (temporary data, uploaded files,
  database rows or files, logs, generated artifacts) so leftovers cannot skew later tests.

---

## Documentation layout

- Read `languages` and `defaultLanguage` from `project.config.json` before writing or
  updating any docs.
- The `defaultLanguage` uses the un-suffixed file; other languages use a suffix
  (e.g. `README.md` / `README.vi.md`).
- User-facing docs start with a language switcher linking the versions. English-only docs
  (`CHANGELOG.md`) are not translated and have no switcher.

---

## Release notes and changelog

English only, exhaustive, and identical in the changelog and the release body. A release
must contain its release notes.

---

## Language

- Talk to the author in the author's own language; mixing languages in conversation is fine.
- Written artifacts — plans, code, commit messages, and the changelog — stay in **English**.
  User-facing docs follow the configured languages.

---

## Commit / push / release rules

1. Never implement, version-bump, or release before the plan is approved.
2. Commit messages are English-only: subject `<type>(<area>): <summary> (v<version>)`, body
   listing every change in detail.
3. Commit before pushing; push before releasing.
4. Every release declares a stage and uses the matching version suffix.
5. Never push or release to any repository other than `video-play-npm`.
